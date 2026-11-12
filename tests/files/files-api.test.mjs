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

function loadFilesApi(apiRequest) {
  const filename = resolve(root, "src/features/files/api/files.api.ts");
  const loaded = { exports: {} };
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
      `Unexpected runtime import in Files API adapter: ${specifier}`,
    );
  };
  vm.runInNewContext(`(function(require, module, exports) {${code}\n})`, {
    URLSearchParams,
  })(require, loaded, loaded.exports);
  return loaded.exports;
}

test("Files reads use the auth-aware API client and bounded list parameters", async () => {
  const calls = [];
  const api = loadFilesApi((path, options) => {
    calls.push({ path, options });
    return Promise.resolve({ data: {} });
  });

  await api.listFiles("access-token", { page: 2, limit: 20 });
  await api.getFile("access-token", "file-id");

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    {
      path: "/api/v1/files?page=2&limit=20",
      options: { accessToken: "access-token" },
    },
    {
      path: "/api/v1/files/file-id",
      options: { accessToken: "access-token" },
    },
  ]);
});

test("Files deletion uses the authenticated DELETE contract", async () => {
  let call;
  const api = loadFilesApi((path, options) => {
    call = { path, options };
    return Promise.resolve({ data: null });
  });

  await api.deleteFile("access-token", "file-id");

  assert.deepEqual(JSON.parse(JSON.stringify(call)), {
    path: "/api/v1/files/file-id",
    options: { method: "DELETE", accessToken: "access-token" },
  });
});
