import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const path = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../src/features/teams/api/teams.api.ts",
);
function adapter() {
  const calls = [];
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loaded = { exports: {} };
  const require = (name) => {
    assert.equal(name, "@/lib/http/api-client");
    return {
      apiRequest: (url, options) => {
        calls.push({ url, options });
        return Promise.resolve({ data: {} });
      },
    };
  };
  vm.runInNewContext(
    `(function(require,module,exports){${compiled}\n})`,
    { URLSearchParams, FormData },
    { filename: path },
  )(require, loaded, loaded.exports);
  return { api: loaded.exports, calls };
}
for (const [method, expected] of [
  ["listTeams", "/teams"],
  ["discoverTeams", "/teams/discover"],
  ["listMyJoinRequests", "/team-join-requests"],
  ["listReceivedTeamInvites", "/team-invites"],
]) {
  test(`${method} preserves encoded query and cursor values in authenticated GET requests`, async () => {
    const { api, calls } = adapter();
    await api[method]("access", {
      limit: 2,
      cursor: "cursor-id",
      q: "name & spaces",
      status: "EXPIRED",
    });
    const url = new URL(calls[0].url, "https://taskflow.test");
    assert.equal(url.pathname, expected);
    assert.equal(url.searchParams.get("limit"), "2");
    assert.equal(url.searchParams.get("cursor"), "cursor-id");
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[0].options.accessToken, "access");
  });
}
for (const [method, args, expected] of [
  ["cancelJoinRequest", ["request"], "/team-join-requests/request/cancel"],
  ["acceptTeamInvite", ["invite"], "/team-invites/invite/accept"],
  ["revokeTeamInvite", ["team", "invite"], "/teams/team/invites/invite/revoke"],
  [
    "approveJoinRequest",
    ["team", "request"],
    "/teams/team/join-requests/request/approve",
  ],
  [
    "rejectJoinRequest",
    ["team", "request"],
    "/teams/team/join-requests/request/reject",
  ],
]) {
  test(`${method} uses its explicit POST transition route`, async () => {
    const { api, calls } = adapter();
    await api[method]("access", ...args);
    assert.equal(calls[0].url, expected);
    assert.equal(calls[0].options.method, "POST");
  });
}
test("member pagination uses a bounded GET and ownership transfer carries the target member", async () => {
  const { api, calls } = adapter();
  await api.listTeamMembers("access", "team", { limit: 3, cursor: "member" });
  const url = new URL(calls[0].url, "https://taskflow.test");
  assert.equal(url.pathname, "/teams/team/members");
  assert.equal(url.searchParams.get("limit"), "3");
  await api.transferTeamOwnership("access", "team", "target");
  assert.equal(calls[1].url, "/teams/team/ownership-transfer");
  assert.equal(calls[1].options.body.targetMemberId, "target");
});
