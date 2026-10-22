import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../src");
const dependency = createRequire(import.meta.url);
const original = { accessToken: "original-access", refreshToken: "original-refresh" };
const successor = { accessToken: "new-access", refreshToken: "new-refresh" };
const newerLogin = { accessToken: "other-account", refreshToken: "other-refresh" };
const flush = () => new Promise(setImmediate);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function response(status = 200, code = "AUTH_INVALID_CREDENTIALS", details = null) {
  return new Response(JSON.stringify({
    success: status === 200,
    message: "Security action complete",
    data: successor,
    ...(status === 200 ? {} : { error: { code, message: "Security action rejected", details } }),
    meta: { timestamp: "2026-10-20T18:00:00.000Z", path: "/auth/security", method: "POST", statusCode: status },
  }), { status, headers: { "content-type": "application/json" } });
}

/**
 * Run actual Auth modules with simulated browser storage/timers and stubbed
 * HTTP/socket transport. No real browser, application server or email runs.
 */
function browser(fetch) {
  const values = new Map();
  const notices = new Map();
  const storage = (map) => ({ getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: (key) => map.delete(key) });
  const window = new EventTarget();
  window.location = { protocol: "https:" };
  window.crypto = webcrypto;
  const timers = new Map();
  let id = 0;
  window.setTimeout = (callback) => { timers.set(++id, callback); return id; };
  window.clearTimeout = (timer) => timers.delete(timer);
  const document = { cookie: "" };
  const context = vm.createContext({ window, localStorage: storage(values), sessionStorage: storage(notices), document, navigator: {}, Event, CustomEvent, Uint8Array, FormData, AbortController, fetch });
  const modules = new Map();
  function load(relative) {
    const filename = resolve(root, relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loadedModule = { exports: {} };
    modules.set(filename, loadedModule);
    const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const require = (specifier) => {
      if (specifier === "@/config/env") return { env: { NEXT_PUBLIC_API_BASE_URL: "https://auth.invalid/api/v1" } };
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return dependency(specifier);
      const target = specifier.startsWith("@/") ? resolve(root, specifier.slice(2)) : resolve(dirname(filename), specifier);
      assert.ok(target.startsWith(`${root}/`) || target.startsWith(`${root}\\`));
      return load(`${target}.ts`);
    };
    vm.runInContext(`(function(require, module, exports) {${code}\n})`, context, { filename })(require, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  const authStorage = load("features/auth/utils/auth-storage.ts");
  authStorage.storeAuthTokens(original);
  return {
    load, window, timers, document, storage: authStorage,
    api: load("features/auth/api/auth.api.ts"),
    actions: load("features/auth/services/session-actions.ts"),
    bind: load("features/auth/realtime/bind-authenticated-socket.ts").bindAuthenticatedSocket,
    fireTimers() { const callbacks = [...timers.values()]; timers.clear(); for (const callback of callbacks) callback(); },
  };
}

function socket() {
  const peer = new EventEmitter();
  peer.auth = {};
  peer.connects = 0;
  peer.disconnects = 0;
  peer.connect = () => { peer.connects++; return peer; };
  peer.disconnect = () => { peer.disconnects++; return peer; };
  return peer;
}

test("sign out revokes the captured server device and clears local credentials/socket", async () => {
  const calls = [];
  const tab = browser(async (url, options) => { calls.push({ url, options }); return response(); });
  const peer = socket();
  const unbind = tab.bind(peer, original.accessToken);
  const result = await tab.actions.signOutCurrentSession();
  assert.equal(result.serverConfirmed, true);
  assert.equal(result.sessionCleared, true);
  assert.ok(calls[0].url.endsWith("/auth/logout"));
  assert.equal(calls[0].options.headers.authorization, `Bearer ${original.accessToken}`);
  assert.equal(JSON.parse(calls[0].options.body).refreshToken, original.refreshToken);
  assert.equal(tab.storage.getAccessToken(), null);
  assert.ok(peer.disconnects > 0);
  assert.match(tab.actions.takeSignOutNotice(), /signed out/);
  assert.equal(tab.actions.takeSignOutNotice(), null);
  unbind();
});

test("offline sign out exits locally with explicit unconfirmed-server notice", async () => {
  const tab = browser(async () => { throw new Error("Offline"); });
  const result = await tab.actions.signOutCurrentSession();
  assert.equal(result.serverConfirmed, false);
  assert.equal(result.sessionCleared, true);
  assert.match(tab.actions.takeSignOutNotice(), /could not be confirmed/);
});

test("current-device revoke uses DELETE then clears credentials and session hint", async () => {
  let request;
  const tab = browser(async (url, options) => { request = { url, options }; return response(); });
  const result = await tab.actions.revokeDeviceSession("current-device", true);
  assert.equal(request.options.method, "DELETE");
  assert.ok(request.url.endsWith("/auth/sessions/current-device"));
  assert.equal(request.options.body, undefined);
  assert.equal(result.sessionCleared, true);
  assert.equal(tab.storage.getAccessToken(), null);
  assert.equal(tab.storage.getRefreshToken(), null);
  assert.match(tab.document.cookie, /tf\.session=;.*Max-Age=0/);
  assert.match(tab.actions.takeSignOutNotice(), /This device/);
});

test("other-device revoke preserves the current browser login", async () => {
  const tab = browser(async () => response());
  assert.equal((await tab.actions.revokeDeviceSession("other-device", false)).sessionCleared, false);
  assert.equal(tab.storage.getAccessToken(), original.accessToken);
});

test("current-device revoke reads success after an early socket logout", async () => {
  let tab;
  tab = browser(async () => { tab.storage.clearAuthTokens(); return response(); });
  assert.equal((await tab.actions.revokeDeviceSession("current-device", true)).sessionCleared, true);
});

test("late device-revoke response preserves a newer account login", async () => {
  const pending = deferred();
  const tab = browser(async () => pending.promise);
  const action = tab.actions.revokeDeviceSession("current-device", true);
  tab.storage.storeAuthTokens(newerLogin);
  pending.resolve(response());
  assert.equal((await action).sessionCleared, false);
  assert.equal(tab.storage.getAccessToken(), newerLogin.accessToken);
});

test("failed device revoke preserves credentials and its structured error", async () => {
  const tab = browser(async () => response(503, "AUTH_SESSION_CHECK_UNAVAILABLE"));
  await assert.rejects(tab.actions.revokeDeviceSession("current-device", true), (error) => error.code === "AUTH_SESSION_CHECK_UNAVAILABLE");
  assert.equal(tab.storage.getAccessToken(), original.accessToken);
});

test("socket revocation before HTTP success does not misreport logout-all as failure", async () => {
  let tab;
  tab = browser(async () => { tab.storage.clearAuthTokens(); return response(); });
  const result = await tab.actions.signOutAllSessions("Current password");
  assert.equal(result.sessionCleared, true);
  assert.match(tab.actions.takeSignOutNotice(), /All devices/);
});

test("late logout success cannot clear another account's newer login", async () => {
  const pending = deferred();
  const tab = browser(() => pending.promise);
  const result = tab.actions.signOutCurrentSession();
  tab.storage.storeAuthTokens(newerLogin);
  pending.resolve(response());
  assert.equal((await result).sessionCleared, false);
  assert.equal(tab.storage.getAccessToken(), newerLogin.accessToken);
  assert.equal(tab.actions.takeSignOutNotice(), null);
});

test("password rejection preserves credentials and structured API code/status/details", async () => {
  const tab = browser(async () => response(401, "AUTH_INVALID_CREDENTIALS", { field: "currentPassword" }));
  await assert.rejects(tab.actions.changeAccountPassword("Wrong password", "New password"), (error) => {
    assert.equal(error.name, "ApiError");
    assert.equal(error.code, "AUTH_INVALID_CREDENTIALS");
    assert.equal(error.statusCode, 401);
    assert.equal(error.details.field, "currentPassword");
    return true;
  });
  assert.equal(tab.storage.getAccessToken(), original.accessToken);
  assert.equal(tab.timers.size, 0);
});

test("password change sends proof and the new password then clears the matching login", async () => {
  let body;
  const tab = browser(async (_url, options) => { body = JSON.parse(options.body); return response(); });
  assert.equal((await tab.actions.changeAccountPassword("Current password", "New password")).sessionCleared, true);
  assert.deepEqual(body, { currentPassword: "Current password", newPassword: "New password" });
  assert.equal(tab.storage.getAccessToken(), null);
});

test("expired access refreshes once and retries security action with the same login", async () => {
  const calls = [];
  const tab = browser(async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/auth/refresh")) return response();
    return options.headers.authorization === `Bearer ${successor.accessToken}` ? response() : response(401, "AUTH_TOKEN_EXPIRED");
  });
  await tab.actions.signOutAllSessions("Current password");
  assert.equal(calls.length, 3);
  assert.equal(calls[2].options.headers.authorization, `Bearer ${successor.accessToken}`);
  assert.equal(tab.storage.getAccessToken(), null);
});

test("late expired-token response cannot retry an old action under a new login", async () => {
  const pending = deferred();
  let calls = 0;
  const tab = browser(() => { calls++; return pending.promise; });
  const action = tab.actions.signOutAllSessions("Current password");
  const rejected = assert.rejects(action, (error) => error.code === "AUTH_TOKEN_EXPIRED");
  tab.storage.storeAuthTokens(newerLogin);
  pending.resolve(response(401, "AUTH_TOKEN_EXPIRED"));
  await rejected;
  assert.equal(calls, 1);
  assert.equal(tab.storage.getAccessToken(), newerLogin.accessToken);
});

test("security action timeout retains recoverable credentials and clears its timer", async () => {
  const tab = browser((_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true })));
  const rejected = assert.rejects(tab.actions.signOutAllSessions("Current password"), /timed out/);
  tab.fireTimers();
  await rejected;
  assert.equal(tab.storage.getAccessToken(), original.accessToken);
  assert.equal(tab.timers.size, 0);
});

test("socket ignores malformed end events, revocation clears auth and cleanup removes listeners", () => {
  const tab = browser(async () => response());
  const peer = socket();
  const unbind = tab.bind(peer, original.accessToken);
  for (const event of [null, {}, { reason: "invented" }, { reason: 42 }]) peer.emit("auth:ended", event);
  assert.equal(tab.storage.getAccessToken(), original.accessToken);
  peer.emit("auth:ended", { reason: "revoked" });
  assert.equal(tab.storage.getAccessToken(), null);
  unbind();
  assert.equal(peer.listenerCount("auth:ended"), 0);
  assert.equal(tab.timers.size, 0);
});

test("socket follows token rotation and old binding cannot erase a newer account", () => {
  const tab = browser(async () => response());
  const peer = socket();
  const unbind = tab.bind(peer, original.accessToken);
  tab.storage.storeAuthTokens(successor, { expectedSessionVersion: tab.storage.getAuthSessionVersion() });
  assert.equal(peer.auth.token, `Bearer ${successor.accessToken}`);
  assert.equal(peer.connects, 1);
  tab.storage.storeAuthTokens(newerLogin);
  peer.emit("auth:ended", { reason: "revoked" });
  assert.equal(tab.storage.getAccessToken(), newerLogin.accessToken);
  unbind();
});

test("expired socket uses the shared refresh flow and reconnects with its successor", async () => {
  let calls = 0;
  const tab = browser(async () => { calls++; return response(); });
  const peer = socket();
  const unbind = tab.bind(peer, original.accessToken);
  peer.emit("auth:ended", { reason: "expired" });
  peer.emit("auth:ended", { reason: "expired" });
  await flush();
  assert.equal(calls, 1);
  assert.equal(peer.auth.token, `Bearer ${successor.accessToken}`);
  assert.equal(tab.storage.getAccessToken(), successor.accessToken);
  unbind();
});

test("unavailable socket retries transient failure and cancels retry on cleanup", () => {
  const tab = browser(async () => response());
  const peer = socket();
  const unbind = tab.bind(peer, original.accessToken);
  peer.emit("auth:ended", { reason: "unavailable" });
  peer.emit("auth:ended", { reason: "unavailable" });
  assert.equal(tab.timers.size, 1);
  tab.fireTimers();
  assert.equal(peer.connects, 1);
  peer.emit("auth:ended", { reason: "unavailable" });
  unbind();
  assert.equal(tab.timers.size, 0);
});

test("a refresh failure after unmount cannot leave a socket retry timer", async () => {
  const pending = deferred();
  const tab = browser(() => pending.promise);
  const peer = socket();
  const unbind = tab.bind(peer, original.accessToken);
  peer.emit("auth:ended", { reason: "expired" });
  unbind();
  pending.reject(new Error("Offline"));
  await flush();
  assert.equal(tab.timers.size, 0);
  assert.equal(peer.connects, 0);
});

test("security form schemas reject mismatched, short and oversized passwords", () => {
  const tab = browser(async () => response());
  const schema = tab.load("features/auth/schemas/auth.schema.ts");
  const valid = { currentPassword: "Current password", newPassword: "New password", confirmPassword: "New password" };
  assert.equal(schema.changePasswordSchema.safeParse(valid).success, true);
  for (const fields of [{ confirmPassword: "Different password" }, { newPassword: "short" }, { currentPassword: "a".repeat(129) }]) assert.equal(schema.changePasswordSchema.safeParse({ ...valid, ...fields }).success, false);
  assert.equal(schema.logoutAllSchema.safeParse({ currentPassword: "short" }).success, false);
});
