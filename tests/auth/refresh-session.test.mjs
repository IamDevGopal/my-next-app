import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const sourceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../src",
);
const original = {
  accessToken: "original-access",
  refreshToken: "original-refresh",
};
const successor = { accessToken: "next-access", refreshToken: "next-refresh" };

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function response(status = 200, data = successor, errorCode = "AUTH_TOKEN_EXPIRED") {
  return new Response(
    JSON.stringify({
      success: status === 200,
      data,
      ...(status === 200 ? {} : {
        error: {
          code: status === 401 ? errorCode : "AUTH_TOKEN_INVALID",
          message: "Auth request rejected",
          details: null,
        },
      }),
      meta: { statusCode: status },
    }),
    {
      status,
      headers: { "content-type": "application/json" },
    },
  );
}

/**
 * Actual TS modules execute in independent tab contexts. Browser APIs and
 * transport are doubles; no Next server or real network is used. These
 * tests verify coordination logic, not browser Web Locks implementation.
 */
function browser({ locks = true } = {}) {
  const values = new Map();
  const tabs = [];
  let lockQueue = Promise.resolve();
  const lockManager = {
    request(_name, options, callback) {
      const result = lockQueue.then(() => {
        if (options.signal.aborted)
          throw new DOMException("Aborted", "AbortError");
        return callback();
      });
      lockQueue = result.catch(() => undefined);
      return result;
    },
  };

  return {
    tab(fetch) {
      const window = new EventTarget();
      window.location = { protocol: "https:" };
      window.crypto = webcrypto;
      const timers = new Map();
      let timerId = 0;
      window.setTimeout = (callback) => {
        timers.set(++timerId, callback);
        return timerId;
      };
      window.clearTimeout = (id) => timers.delete(id);
      const localStorage = {
        getItem: (key) => values.get(key) ?? null,
        setItem(key, value) {
          const old = values.get(key);
          values.set(key, value);
          if (old !== value) notifyOtherTabs(key);
        },
        removeItem(key) {
          if (values.delete(key)) notifyOtherTabs(key);
        },
      };
      function notifyOtherTabs(key) {
        for (const other of tabs) {
          if (other.window === window) continue;
          queueMicrotask(() => {
            const event = new Event("storage");
            Object.defineProperties(event, {
              key: { value: key },
              storageArea: { value: other.localStorage },
            });
            other.window.dispatchEvent(event);
          });
        }
      }
      const document = { cookie: "" };
      const context = vm.createContext({
        window,
        localStorage,
        document,
        navigator: locks ? { locks: lockManager } : {},
        AbortController,
        CustomEvent,
        Uint8Array,
        FormData,
        fetch,
      });
      const modules = new Map();
      function load(filename) {
        if (modules.has(filename)) return modules.get(filename).exports;
        const loadedModule = { exports: {} };
        modules.set(filename, loadedModule);
        const code = ts.transpileModule(readFileSync(filename, "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText;
        const require = (specifier) => {
          if (specifier === "@/config/env")
            return {
              env: { NEXT_PUBLIC_API_BASE_URL: "https://auth.invalid/api/v1" },
            };
          const target = specifier.startsWith("@/")
            ? resolve(sourceRoot, specifier.slice(2))
            : resolve(dirname(filename), specifier);
          assert.ok(target.startsWith(sourceRoot));
          return load(`${target}.ts`);
        };
        vm.runInContext(
          `(function(require, module, exports) {${code}\n})`,
          context,
          { filename },
        )(require, loadedModule, loadedModule.exports);
        return loadedModule.exports;
      }
      const storage = load(
        resolve(sourceRoot, "features/auth/utils/auth-storage.ts"),
      );
      const auth = load(
        resolve(sourceRoot, "features/auth/api/refresh-session.ts"),
      );
      const client = load(resolve(sourceRoot, "lib/http/api-client.ts"));
      const tab = {
        window,
        localStorage,
        document,
        storage,
        auth,
        client,
        timers,
        expireTimers: () => {
          for (const callback of timers.values()) callback();
        },
        refresh: () =>
          auth.refreshAccessToken(
            storage.getAccessToken(),
            storage.getAuthSessionVersion(),
          ),
      };
      tabs.push(tab);
      return tab;
    },
  };
}

test("same-tab simultaneous callers share one refresh and preserve the login version", async () => {
  let calls = 0;
  const tab = browser().tab(async () => {
    calls++;
    return response();
  });
  tab.storage.storeAuthTokens(original);
  const version = tab.storage.getAuthSessionVersion();
  const results = await Promise.all(
    Array.from({ length: 8 }, () => tab.refresh()),
  );
  assert.deepEqual(results, Array(8).fill(successor.accessToken));
  assert.equal(calls, 1);
  assert.equal(tab.storage.getAuthSessionVersion(), version);
  assert.equal(tab.storage.getRefreshToken(), successor.refreshToken);
  assert.equal(tab.timers.size, 0);
});

test("two tabs serialize refresh and the second reuses the updated token", async () => {
  let calls = 0;
  const shared = browser();
  const fetch = async () => {
    calls++;
    return response();
  };
  const first = shared.tab(fetch);
  const second = shared.tab(fetch);
  first.storage.storeAuthTokens(original);
  assert.deepEqual(
    await Promise.all([first.refresh(), second.refresh()]),
    Array(2).fill(successor.accessToken),
  );
  assert.equal(calls, 1);
});

test("without Web Locks, duplicate responses cannot overwrite a stored successor", async () => {
  const shared = browser({ locks: false });
  const request = deferred();
  let calls = 0;
  const fetch = async () => {
    calls++;
    await request.promise;
    return response();
  };
  const first = shared.tab(fetch);
  const second = shared.tab(fetch);
  first.storage.storeAuthTokens(original);
  const pending = Promise.all([first.refresh(), second.refresh()]);
  request.resolve();
  assert.deepEqual(await pending, Array(2).fill(successor.accessToken));
  assert.equal(calls, 2);
});

test("a refresh response after logout cannot restore credentials", async () => {
  const request = deferred();
  const started = deferred();
  const tab = browser().tab(async () => {
    started.resolve();
    return request.promise;
  });
  tab.storage.storeAuthTokens(original);
  const pending = tab.refresh();
  await started.promise;
  tab.storage.clearAuthTokens();
  request.resolve(response());
  assert.equal(await pending, null);
  assert.equal(tab.storage.getAccessToken(), null);
  assert.equal(tab.storage.getRefreshToken(), null);
});

test("a late 401 from an old login cannot clear a newer login", async () => {
  const request = deferred();
  const started = deferred();
  const tab = browser().tab(async () => {
    started.resolve();
    return request.promise;
  });
  tab.storage.storeAuthTokens(original);
  const pending = tab.refresh();
  await started.promise;
  tab.storage.storeAuthTokens({
    accessToken: "other-account",
    refreshToken: "other-refresh",
  });
  request.resolve(response(401));
  assert.equal(await pending, null);
  assert.equal(tab.storage.getAccessToken(), "other-account");
});

test("logout during JSON parsing prevents a late credential write", async () => {
  const body = deferred();
  const parsing = deferred();
  const tab = browser().tab(async () => ({
    ok: true,
    status: 200,
    json: () => {
      parsing.resolve();
      return body.promise;
    },
  }));
  tab.storage.storeAuthTokens(original);
  const pending = tab.refresh();
  await parsing.promise;
  tab.storage.clearAuthTokens();
  body.resolve({ success: true, data: successor });
  assert.equal(await pending, null);
  assert.equal(tab.storage.getAccessToken(), null);
});

for (const status of [401, 403, 409, 500]) {
  test(`refresh ${status} has the correct cleanup policy`, async () => {
    let calls = 0;
    const tab = browser().tab(async () => {
      calls++;
      return response(status);
    });
    tab.storage.storeAuthTokens(original);
    if (status === 401 || status === 403) {
      assert.equal(await tab.refresh(), null);
      assert.equal(tab.storage.getRefreshToken(), null);
    } else {
      await assert.rejects(tab.refresh());
      assert.equal(tab.storage.getRefreshToken(), original.refreshToken);
    }
    assert.equal(calls, status === 409 ? 2 : 1);
    assert.equal(tab.timers.size, 0);
  });
}

test("a conflict can recover on the bounded second attempt", async () => {
  let calls = 0;
  const tab = browser().tab(async () => response(++calls === 1 ? 409 : 200));
  tab.storage.storeAuthTokens(original);
  assert.equal(await tab.refresh(), successor.accessToken);
  assert.equal(calls, 2);
});

test("network failure releases the in-flight promise and allows retry", async () => {
  let calls = 0;
  const tab = browser().tab(async () => {
    if (++calls === 1) throw new Error("offline");
    return response();
  });
  tab.storage.storeAuthTokens(original);
  await assert.rejects(tab.refresh(), /offline/);
  assert.equal(tab.storage.getRefreshToken(), original.refreshToken);
  assert.equal(await tab.refresh(), successor.accessToken);
  assert.equal(calls, 2);
});

test("refresh timeout aborts transport but retains credentials", async () => {
  const started = deferred();
  const tab = browser().tab(
    (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
        started.resolve();
      }),
  );
  tab.storage.storeAuthTokens(original);
  const rejected = assert.rejects(tab.refresh(), /Aborted/);
  await started.promise;
  tab.expireTimers();
  await rejected;
  assert.equal(tab.storage.getRefreshToken(), original.refreshToken);
  assert.equal(tab.timers.size, 0);
});

test("stale writes are rejected and cross-tab listeners observe rotation/logout", async () => {
  const shared = browser();
  const first = shared.tab(async () => response());
  const second = shared.tab(async () => response());
  const observed = [];
  const unsubscribe = second.storage.subscribeToAuthTokenChanges((value) =>
    observed.push(value),
  );
  first.storage.storeAuthTokens(original);
  const version = first.storage.getAuthSessionVersion();
  await first.refresh();
  await Promise.resolve();
  assert.ok(observed.includes(successor.accessToken));
  first.storage.clearAuthTokens();
  await Promise.resolve();
  assert.equal(observed.at(-1), null);
  assert.equal(
    first.storage.storeAuthTokens(successor, {
      expectedSessionVersion: version,
    }),
    false,
  );
  assert.equal(first.storage.getAccessToken(), null);
  unsubscribe();
});

test("API client refreshes once and retries with the new bearer token", async () => {
  const requests = [];
  const tab = browser().tab(async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith("/auth/refresh")) return response();
    return options.headers.authorization === `Bearer ${successor.accessToken}`
      ? response(200, { ok: true })
      : response(401);
  });
  tab.storage.storeAuthTokens(original);
  const result = await tab.client.apiRequest("/auth/me", {
    accessToken: original.accessToken,
  });
  assert.equal(result.data.ok, true);
  assert.equal(requests.length, 3);
  assert.equal(
    requests[2].options.headers.authorization,
    `Bearer ${successor.accessToken}`,
  );
});

test("API client cannot replay an old action under a newly signed-in account", async () => {
  const request = deferred();
  let calls = 0;
  const tab = browser().tab(async () => {
    calls++;
    return request.promise;
  });
  tab.storage.storeAuthTokens(original);
  const rejected = assert.rejects(
    tab.client.apiRequest("/auth/me", { accessToken: original.accessToken }),
    /account changed/,
  );
  tab.storage.storeAuthTokens({
    accessToken: "other-account",
    refreshToken: "other-refresh",
  });
  request.resolve(response(401));
  await rejected;
  assert.equal(calls, 1);
  assert.equal(tab.storage.getAccessToken(), "other-account");
});

test("business 401 never refreshes or deletes the browser login", async () => {
  let calls = 0;
  const tab = browser().tab(async () => { calls++; return response(401, null, "AUTH_INVALID_CREDENTIALS"); });
  tab.storage.storeAuthTokens(original);
  await assert.rejects(tab.client.apiRequest("/auth/security", { accessToken: original.accessToken }));
  assert.equal(calls, 1);
  assert.equal(tab.storage.getAccessToken(), original.accessToken);
});

test("temporary API failure preserves login and allows the next action", async () => {
  let calls = 0;
  const tab = browser().tab(async () => ++calls === 1 ? response(503) : response(200, { ok: true }));
  tab.storage.storeAuthTokens(original);
  await assert.rejects(tab.client.apiRequest("/users/me", { accessToken: original.accessToken }));
  assert.equal(tab.storage.getAccessToken(), original.accessToken);
  assert.equal((await tab.client.apiRequest("/users/me", { accessToken: original.accessToken })).data.ok, true);
});

for (const code of ["AUTH_TOKEN_INVALID", "AUTH_REFRESH_TOKEN_REVOKED"]) {
  test(`${code} clears only the matching login and its cookie`, async () => {
    const tab = browser().tab(async () => response(401, null, code));
    tab.storage.storeAuthTokens(original);
    await assert.rejects(tab.client.apiRequest("/auth/me", { accessToken: original.accessToken }));
    assert.equal(tab.storage.getAccessToken(), null);
    assert.equal(tab.storage.getRefreshToken(), null);
    assert.match(tab.document.cookie, /tf\.session=;.*Max-Age=0/);
  });
}

test("a late terminal failure cannot erase an already rotated access token", async () => {
  const pending = deferred();
  const tab = browser().tab(async () => pending.promise);
  tab.storage.storeAuthTokens(original);
  const version = tab.storage.getAuthSessionVersion();
  const rejected = assert.rejects(tab.client.apiRequest("/auth/me", { accessToken: original.accessToken }));
  tab.storage.storeAuthTokens(successor, { expectedSessionVersion: version });
  pending.resolve(response(401, null, "AUTH_TOKEN_INVALID"));
  await rejected;
  assert.equal(tab.storage.getAccessToken(), successor.accessToken);
});

test("logout gives anonymous state a fresh version and rejects old guarded cleanup", () => {
  const tab = browser().tab(async () => response());
  const anonymous = tab.storage.getAuthSessionVersion();
  tab.storage.storeAuthTokens(original);
  tab.storage.clearAuthTokens();
  assert.notEqual(tab.storage.getAuthSessionVersion(), anonymous);
  tab.storage.storeAuthTokens(successor);
  assert.equal(tab.storage.clearAuthTokensIfCurrent(anonymous), false);
  assert.equal(tab.storage.getAccessToken(), successor.accessToken);
});
