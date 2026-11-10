import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../src");

export function spy(implementation = () => undefined) {
  const calls = [];
  const fn = (...args) => {
    calls.push(args);
    return implementation(...args);
  };
  fn.calls = calls;
  return fn;
}
export function deferred() {
  let resolvePromise, reject;
  const promise = new Promise((resolve, rejectPromise) => {
    resolvePromise = resolve;
    reject = rejectPromise;
  });
  return { promise, resolve: resolvePromise, reject };
}
export function text(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node !== "object") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  return text(node.props?.children);
}
export function nodes(node, predicate) {
  if (node == null || typeof node !== "object") return [];
  if (Array.isArray(node))
    return node.flatMap((child) => nodes(child, predicate));
  return [
    ...(predicate(node) ? [node] : []),
    ...nodes(node.props?.children, predicate),
  ];
}
export function button(tree, label) {
  return nodes(
    tree,
    (node) =>
      node.type === "button" &&
      (node.props.title === label || text(node).trim() === label),
  )[0];
}

/** Actual component callbacks/effects run under deterministic hooks; this is not a browser/DOM renderer. */
export function mount(name, initialProps, overrides = {}) {
  const slots = [],
    effects = [],
    timers = new Map();
  let cursor = 0,
    dirty = true,
    tree,
    props = initialProps,
    now = Date.now(),
    nextTimer = 0;
  const different = (left, right) =>
    !left ||
    !right ||
    left.length !== right.length ||
    left.some((value, index) => !Object.is(value, right[index]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index])
        slots[index] = {
          value: typeof initial === "function" ? initial() : initial,
        };
      return [
        slots[index].value,
        (next) => {
          const value =
            typeof next === "function" ? next(slots[index].value) : next;
          if (!Object.is(value, slots[index].value)) {
            slots[index].value = value;
            dirty = true;
          }
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      return (slots[index] ??= { current: initial });
    },
    useMemo(compute, deps) {
      const index = cursor++;
      if (different(slots[index]?.deps, deps))
        slots[index] = { deps, value: compute() };
      return slots[index].value;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (different(slots[index]?.deps, deps)) {
        const cleanup = slots[index]?.cleanup;
        slots[index] = { deps };
        effects.push(() => {
          cleanup?.();
          slots[index].cleanup = effect();
        });
      }
    },
  };
  const pageInfo = { hasNextPage: false, nextCursor: null };
  const api = Object.fromEntries(
    Object.entries({
      listTeams: { teams: [], pageInfo },
      discoverTeams: { teams: [], pageInfo },
      listReceivedTeamInvites: { invites: [], pageInfo },
      listMyJoinRequests: { joinRequests: [], pageInfo },
      listTeamMembers: { members: [], pageInfo },
      listTeamInvites: { invites: [], pageInfo },
      listTeamJoinRequests: { joinRequests: [], pageInfo },
    }).map(([key, data]) => [key, spy(async () => ({ data }))]),
  );
  Object.assign(api, overrides);
  const jsx = (type, properties, key) => ({
    type,
    props: properties ?? {},
    key,
  });
  const external = new Proxy({}, { get: (_, key) => String(key) });
  const window = {
    confirm: () => true,
    setTimeout: (fn, delay) => {
      const id = ++nextTimer;
      timers.set(id, { fn, at: now + delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    setInterval: () => ++nextTimer,
    clearInterval: () => undefined,
  };
  class Clock extends Date {
    static now() {
      return now;
    }
  }
  const imports = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "lucide-react": external,
    "../api/teams.api": api,
    "@/lib/http/get-error-message": {
      getErrorMessage: (error) => error?.message ?? "Request failed",
    },
  };
  const source =
    readFileSync(
      resolve(root, "features/teams/components/teams-workspace.tsx"),
      "utf8",
    ) +
    "\nexport { ReceivedInvitesPanel, MyJoinRequestsPanel, TeamInvitePanel, TeamMembersPanel, JoinRequestsPanel, DiscoverTeamsPanel };";
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const loaded = { exports: {} };
  const require = (key) => imports[key] ?? external;
  vm.runInNewContext(
    `(function(require,module,exports){${compiled}\n})`,
    { window, Date: Clock, AbortController, URL, console },
    { filename: "teams-workspace.tsx" },
  )(require, loaded, loaded.exports);
  const component = loaded.exports[name];
  if (!component) throw new Error(`Unknown Teams component: ${name}`);
  function render() {
    let count = 0;
    while (dirty) {
      if (++count > 50) throw new Error("Teams render loop");
      dirty = false;
      cursor = 0;
      tree = component(props);
      for (const effect of effects.splice(0)) effect();
    }
  }
  async function flush() {
    for (let index = 0; index < 12; index++) {
      render();
      for (const [id, timer] of [...timers])
        if (timer.at <= now) {
          timers.delete(id);
          timer.fn();
        }
      await new Promise(setImmediate);
    }
    render();
    return tree;
  }
  render();
  return {
    api,
    get tree() {
      render();
      return tree;
    },
    flush,
    update(next) {
      props = { ...props, ...next };
      dirty = true;
      render();
    },
    async advance(ms) {
      now += ms;
      return flush();
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.();
    },
  };
}
