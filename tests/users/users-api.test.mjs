import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const dependency = createRequire(resolve(root, "package.json"));

function loadUsersApi(apiRequest) {
  const filename = resolve(root, "src/features/users/api/users.api.ts");
  const timers = new Map();
  let timerId = 0;
  const loaded = { exports: {} };
  const context = vm.createContext({
    AbortController,
    FormData,
    URLSearchParams,
    setTimeout(callback) {
      const id = ++timerId;
      timers.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  });
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const require = (specifier) => {
    if (specifier === "@/lib/http/api-client") return { apiRequest };
    if (!specifier.startsWith(".")) return dependency(specifier);
    throw new Error(
      `Unexpected runtime import in Users API adapter: ${specifier}`,
    );
  };
  vm.runInContext(`(function(require, module, exports) {${code}\n})`, context, {
    filename,
  })(require, loaded, loaded.exports);
  return {
    api: loaded.exports,
    timers,
    fireTimers() {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach((callback) => callback());
    },
  };
}

test("search encodes the query, defaults the bound, and forwards cancellation", async () => {
  let call;
  const tab = loadUsersApi((path, options) => {
    call = { path, options };
    return Promise.resolve({ data: { users: [] } });
  });
  const controller = new AbortController();

  await tab.api.searchUsers({
    accessToken: "token",
    query: "Jane Doe",
    signal: controller.signal,
  });

  assert.equal(call.path, "/users/search?q=Jane+Doe&limit=8");
  assert.equal(call.options.method, "GET");
  assert.equal(call.options.accessToken, "token");
  assert.ok(call.options.signal);
});

test("a timed-out profile write reports that server completion may be unknown", async () => {
  const tab = loadUsersApi(() => new Promise(() => undefined));
  const pending = tab.api.updateCurrentUser("token", { name: "Jane" });
  tab.fireTimers();

  await assert.rejects(pending, (error) => {
    assert.ok(error instanceof tab.api.UsersRequestTimeoutError);
    assert.equal(error.outcomeMayBeUnknown, true);
    return true;
  });
});

test("caller cancellation aborts the underlying request and returns a typed cancellation", async () => {
  let requestSignal;
  const tab = loadUsersApi((_path, options) => {
    requestSignal = options.signal;
    return new Promise(() => undefined);
  });
  const controller = new AbortController();
  const pending = tab.api.getCurrentUser("token", controller.signal);
  controller.abort();

  await assert.rejects(pending, tab.api.UsersRequestCancelledError);
  assert.equal(requestSignal.aborted, true);
});
