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

function loadBlobClient({
  accessToken = "stored-token",
  refresh,
  fetchImpl = fetch,
} = {}) {
  const filename = resolve(root, "src/lib/http/api-blob-client.ts");
  const loaded = { exports: {} };
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const require = (specifier) => {
    if (specifier === "@/config/env") {
      return { env: { NEXT_PUBLIC_API_BASE_URL: "https://api.taskflow.test" } };
    }
    if (specifier === "@/features/auth/api/refresh-session") {
      return { refreshAccessToken: refresh ?? (() => Promise.resolve(null)) };
    }
    if (specifier === "@/features/auth/utils/auth-storage") {
      return {
        getAccessToken: () => accessToken,
        getAuthSessionVersion: () => "session-1",
      };
    }
    if (specifier === "./api-error") {
      return {
        ApiError: class ApiError extends Error {
          constructor(payload) {
            super(payload.error.message);
            this.payload = payload;
          }
        },
      };
    }
    if (!specifier.startsWith(".")) return dependency(specifier);
    throw new Error(`Unexpected runtime import in blob client: ${specifier}`);
  };
  vm.runInNewContext(`(function(require, module, exports) {${code}\n})`, {
    AbortController,
    clearTimeout,
    fetch: fetchImpl,
    setTimeout,
  })(require, loaded, loaded.exports);
  return loaded.exports;
}

test("binary API requests use the configured API origin and current bearer token", async () => {
  let request;
  const client = loadBlobClient({
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        blob: async () => ({ bytes: "attachment" }),
      };
    },
  });
  await client.requestApiBlob("/api/v1/files/file-1/download", "fallback");

  assert.equal(
    request.url,
    "https://api.taskflow.test/api/v1/files/file-1/download",
  );
  assert.equal(request.options.headers.authorization, "Bearer stored-token");
  assert.equal(request.options.cache, "no-store");
});

test("binary API requests refresh one expired access token and retry", async () => {
  const requests = [];
  const client = loadBlobClient({
    refresh: async (expiredToken, sessionVersion) => {
      assert.equal(expiredToken, "stored-token");
      assert.equal(sessionVersion, "session-1");
      return "fresh-token";
    },
    fetchImpl: async (_url, options) => {
      requests.push(options.headers.authorization);
      if (requests.length === 1) {
        return {
          ok: false,
          status: 401,
          headers: { get: () => "application/json" },
          json: async () => ({
            error: { code: "AUTH_TOKEN_EXPIRED", message: "Expired" },
          }),
        };
      }
      return { ok: true, blob: async () => ({ bytes: "attachment" }) };
    },
  });
  await client.requestApiBlob("/api/v1/files/file-1/download", "fallback");

  assert.deepEqual(requests, ["Bearer stored-token", "Bearer fresh-token"]);
});
