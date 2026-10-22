import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../src");
const dependency = createRequire(import.meta.url);

function load(relative, imports) {
  const filename = resolve(root, relative);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  const require = (name) => {
    if (Object.hasOwn(imports, name)) return imports[name];
    throw new Error(`Unexpected recovery test import: ${name}`);
  };
  vm.runInNewContext(`(function(require, module, exports) {${code}\n})`, { URL }, { filename })(require, loaded, loaded.exports);
  return loaded.exports;
}

const next = dependency("next/server");
const routes = load("middleware.ts", { "next/server": next });

for (const path of ["/login", "/register", "/forgot-password", "/reset-password?token=test", "/verify-email?token=test", "/resend-verification"]) {
  test(`a stale session hint never redirects public recovery route ${path}`, () => {
    const response = routes.middleware(new next.NextRequest(`https://taskflow.test${path}`, { headers: { cookie: "tf.session=1" } }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
  });
}

test("dashboard without the route hint redirects to sign-in and preserves its destination", () => {
  const response = routes.middleware(new next.NextRequest("https://taskflow.test/dashboard/settings"));
  const target = new URL(response.headers.get("location"));
  assert.equal(target.pathname, "/login");
  assert.equal(target.searchParams.get("next"), "/dashboard/settings");
});

test("a dashboard hint permits navigation without pretending to validate credentials", () => {
  const response = routes.middleware(new next.NextRequest("https://taskflow.test/dashboard", { headers: { cookie: "tf.session=1" } }));
  assert.equal(response.status, 200);
  assert.deepEqual(Array.from(routes.config.matcher), ["/dashboard/:path*"]);
});

/**
 * Execute the actual verification component with a deterministic hook/effect
 * harness. This covers async ownership and effect cleanup, not browser DOM,
 * React's renderer, hydration or accessibility behavior.
 */
function verification({ signedIn = false, token = "first-link" } = {}) {
  const slots = [];
  const effects = [];
  let cursor = 0;
  let dirty = true;
  let tree;
  let mounted = true;
  let version = "initial";
  let access = signedIn ? "existing-account" : null;
  const requests = [];
  const stored = [];
  const redirects = [];
  const router = { replace: (url) => redirects.push(url) };
  const pendingEffects = [];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => {
        const nextValue = typeof value === "function" ? value(slots[index]) : value;
        if (slots[index] !== nextValue) { slots[index] = nextValue; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(callback, dependencies) {
      const index = cursor++;
      const prior = effects[index];
      if (!prior || dependencies.some((value, item) => value !== prior.dependencies[item])) {
        pendingEffects.push(() => {
          prior?.cleanup?.();
          effects[index] = { callback, dependencies, cleanup: callback() };
        });
      }
    },
  };
  const { VerifyEmailFlow } = load("features/auth/components/verify-email-flow.tsx", {
    react,
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "next/navigation": { useRouter: () => router, useSearchParams: () => ({ get: () => token }) },
    "../api/auth.api": { verifyEmail: (payload) => new Promise((resolve, reject) => requests.push({ payload, resolve, reject })) },
    "../utils/auth-storage": {
      getAccessToken: () => access,
      getAuthSessionVersion: () => version,
      storeAuthTokens: (pair) => { stored.push(pair); access = pair.accessToken; version = "verified-login"; },
    },
    "./auth-form-link": { AuthFormLink: "link" },
    "./form-message": { FormMessage: "message" },
    "@/lib/http/get-error-message": { getErrorMessage: (error) => error.message },
  });
  function render() {
    for (let attempt = 0; mounted && dirty && attempt < 10; attempt++) {
      dirty = false;
      cursor = 0;
      tree = VerifyEmailFlow();
      for (const effect of pendingEffects.splice(0)) effect();
    }
    assert.equal(dirty, false, "recovery component did not settle");
    return tree;
  }
  render();
  return {
    requests, stored, redirects,
    get tree() { return tree; },
    confirm() { tree.props.children.find((child) => child.type === "button").props.onClick(); render(); },
    changeLogin() { access = "newer-account"; version = "newer-login"; },
    changeToken(value) { token = value; dirty = true; render(); },
    replayEffects() { for (const effect of effects.filter(Boolean)) { effect.cleanup?.(); effect.cleanup = effect.callback(); } render(); },
    unmount() { mounted = false; for (const effect of effects.filter(Boolean)) effect.cleanup?.(); },
    async settle() { for (let index = 0; index < 6; index++) await Promise.resolve(); if (mounted) render(); },
  };
}

const success = { data: { accessToken: "verified-access", refreshToken: "verified-refresh", user: { name: "Verified user" } } };

test("signed-in verification requires confirmation before sending a single-use request", async () => {
  const flow = verification({ signedIn: true });
  assert.equal(flow.requests.length, 0);
  flow.confirm();
  assert.equal(flow.requests.length, 1);
  flow.requests[0].resolve(success);
  await flow.settle();
  assert.equal(flow.stored[0].accessToken, "verified-access");
  assert.deepEqual(flow.redirects, ["/dashboard"]);
});

test("verification effect replay shares the request instead of consuming the token twice", async () => {
  const flow = verification();
  flow.replayEffects();
  assert.equal(flow.requests.length, 1);
  flow.requests[0].resolve(success);
  await flow.settle();
  assert.equal(flow.stored.length, 1);
});

test("late verification success preserves a newer browser login", async () => {
  const flow = verification();
  flow.changeLogin();
  flow.requests[0].resolve(success);
  await flow.settle();
  assert.equal(flow.stored.length, 0);
  assert.equal(flow.redirects.length, 0);
});

test("unmounted verification cannot store credentials or redirect", async () => {
  const flow = verification();
  flow.unmount();
  flow.requests[0].resolve(success);
  await flow.settle();
  assert.equal(flow.stored.length, 0);
  assert.equal(flow.redirects.length, 0);
});

test("changed verification token detaches the earlier request result", async () => {
  const flow = verification();
  flow.changeToken("second-link");
  assert.equal(flow.requests.length, 2);
  flow.requests[0].resolve(success);
  await flow.settle();
  assert.equal(flow.stored.length, 0);
  flow.requests[1].resolve(success);
  await flow.settle();
  assert.equal(flow.stored.length, 1);
});

test("missing verification token shows recovery without contacting the API", () => {
  const flow = verification({ token: null });
  assert.equal(flow.requests.length, 0);
});
