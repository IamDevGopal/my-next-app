import assert from "node:assert/strict";
import { test } from "node:test";
import { button, deferred, mount, nodes, spy, text } from "./teams-harness.mjs";

const pageInfo = { hasNextPage: false, nextCursor: null };
const user = {
  id: "user",
  name: "Test user",
  username: "tester",
  avatarUrl: null,
  profile: null,
};
const invite = (overrides = {}) => ({
  id: "invite",
  team: { id: "team", name: "Engineering", slug: "engineering" },
  role: "VIEWER",
  status: "PENDING",
  message: "Join our team",
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  inviter: user,
  inviteeUser: user,
  ...overrides,
});
const request = (overrides = {}) => ({
  id: "request",
  status: "PENDING",
  team: { id: "team", name: "Engineering" },
  user,
  message: null,
  ...overrides,
});
const member = {
  id: "member",
  role: "VIEWER",
  joinedAt: new Date().toISOString(),
  user,
};
const team = (id) => ({
  id,
  name: `Team ${id}`,
  slug: id,
  ownerId: "owner",
  currentUserRole: "VIEWER",
  membersCount: 2,
  visibility: "INTERNAL",
  joinPolicy: "INVITE_OR_REQUEST",
  owner: user,
});

test("expired received invites clearly show expiry and expose no acceptance/rejection actions", async () => {
  const accept = spy(),
    reject = spy();
  const app = mount(
    "ReceivedInvitesPanel",
    {
      accessToken: "token",
      currentTime: Date.now(),
      invites: [invite({ expiresAt: new Date(0).toISOString() })],
      onChanged: spy(),
    },
    { acceptTeamInvite: accept, rejectTeamInvite: reject },
  );
  await app.flush();
  assert.match(text(app.tree), /Expired/);
  assert.equal(button(app.tree, "Accept"), undefined);
  assert.equal(accept.calls.length + reject.calls.length, 0);
});
test("an invite expiring after render is rejected by the handler without an API request", async () => {
  const accept = spy();
  const app = mount(
    "ReceivedInvitesPanel",
    {
      accessToken: "token",
      currentTime: Date.now(),
      invites: [
        invite({ expiresAt: new Date(Date.now() + 100).toISOString() }),
      ],
      onChanged: spy(),
    },
    { acceptTeamInvite: accept },
  );
  const action = button(app.tree, "Accept");
  assert.ok(action);
  await app.advance(200);
  action.props.onClick();
  await app.flush();
  assert.equal(accept.calls.length, 0);
});
test("EDITOR can invite but has no revoke control; OWNER has it only for pending invites", async () => {
  const props = {
    accessToken: "token",
    canInvite: true,
    canRevoke: false,
    currentTime: Date.now(),
    invites: [invite()],
    onInviteCreated: spy(),
    onInviteRevoked: spy(),
    teamId: "team",
  };
  const editor = mount("TeamInvitePanel", props);
  assert.equal(button(editor.tree, "Revoke invite"), undefined);
  assert.match(text(editor.tree), /Only the team owner/);
  const owner = mount("TeamInvitePanel", { ...props, canRevoke: true });
  assert.ok(button(owner.tree, "Revoke invite"));
});
test("cancel applies the returned request row and never invokes pagination; double clicks submit once", async () => {
  const pending = deferred(),
    cancel = spy(() => pending.promise),
    changed = spy(),
    more = spy();
  const app = mount(
    "MyJoinRequestsPanel",
    {
      accessToken: "token",
      isLoading: false,
      joinRequests: [request()],
      onCancelled: changed,
      onLoadMore: more,
      pageInfo: { hasNextPage: true, nextCursor: "next" },
    },
    { cancelJoinRequest: cancel },
  );
  const action = button(app.tree, "Cancel request");
  action.props.onClick();
  action.props.onClick();
  assert.equal(cancel.calls.length, 1);
  assert.equal(button(app.tree, "Cancel request").props.disabled, true);
  const cancelled = request({ status: "CANCELLED" });
  pending.resolve({ data: { joinRequest: cancelled } });
  await app.flush();
  assert.equal(changed.calls[0][0].status, "CANCELLED");
  assert.equal(more.calls.length, 0);
});
test("cancel errors are shown only for the affected request and permit retry", async () => {
  const cancel = spy(async () => {
    throw new Error("Cancellation unavailable");
  });
  const app = mount(
    "MyJoinRequestsPanel",
    {
      accessToken: "token",
      isLoading: false,
      joinRequests: [request(), request({ id: "other" })],
      onCancelled: spy(),
      onLoadMore: spy(),
      pageInfo,
    },
    { cancelJoinRequest: cancel },
  );
  button(app.tree, "Cancel request").props.onClick();
  await app.flush();
  assert.equal(
    nodes(app.tree, (node) => node.props.role === "alert").length,
    1,
  );
  assert.match(text(app.tree), /Cancellation unavailable/);
  assert.equal(button(app.tree, "Cancel request").props.disabled, false);
});
test("member removal locks repeat submissions and reconciles after failure with accessible feedback", async () => {
  const pending = deferred(),
    remove = spy(() => pending.promise),
    reload = spy(async () => ({ data: { members: [member], pageInfo } })),
    changed = spy(async () => undefined);
  const app = mount(
    "TeamMembersPanel",
    {
      accessToken: "token",
      teamId: "team",
      canManage: true,
      currentUserRole: "OWNER",
      onLeft: spy(),
      onMembershipChanged: changed,
      onTeamUpdated: spy(),
    },
    { listTeamMembers: reload, removeTeamMember: remove },
  );
  await app.flush();
  const action = button(app.tree, "Remove member");
  action.props.onClick();
  action.props.onClick();
  assert.equal(remove.calls.length, 1);
  assert.equal(button(app.tree, "Remove member").props.disabled, true);
  pending.reject(new Error("Removal response lost"));
  await app.flush();
  assert.ok(reload.calls.length >= 2);
  assert.equal(changed.calls.length, 1);
  assert.match(text(app.tree), /Test user: Removal response lost/);
  assert.ok(nodes(app.tree, (node) => node.props.role === "alert").length);
  assert.equal(button(app.tree, "Remove member").props.disabled, false);
});
test("failed member reconciliation blocks mutations until Refresh members succeeds", async () => {
  let fail = false;
  const reload = spy(async () => {
    if (fail) throw new Error("Reload unavailable");
    return { data: { members: [member], pageInfo } };
  });
  const remove = spy(async () => {
    fail = true;
    throw new Error("Timeout");
  });
  const app = mount(
    "TeamMembersPanel",
    {
      accessToken: "token",
      teamId: "team",
      canManage: true,
      currentUserRole: "OWNER",
      onLeft: spy(),
      onMembershipChanged: spy(async () => undefined),
      onTeamUpdated: spy(),
    },
    { listTeamMembers: reload, removeTeamMember: remove },
  );
  await app.flush();
  button(app.tree, "Remove member").props.onClick();
  await app.flush();
  assert.equal(button(app.tree, "Remove member").props.disabled, true);
  fail = false;
  button(app.tree, "Refresh members").props.onClick();
  await app.flush();
  assert.equal(button(app.tree, "Remove member").props.disabled, false);
});
test("join review locks both competing actions and shows a handled error before retry", async () => {
  const pending = deferred(),
    approve = spy(() => pending.promise),
    rejected = spy();
  const app = mount(
    "JoinRequestsPanel",
    {
      accessToken: "token",
      teamId: "team",
      canManage: true,
      joinRequests: [request()],
      onReviewed: spy(),
      onChanged: spy(async () => undefined),
    },
    { approveJoinRequest: approve, rejectJoinRequest: rejected },
  );
  const action = button(app.tree, "Approve");
  action.props.onClick();
  action.props.onClick();
  button(app.tree, "Reject").props.onClick();
  assert.equal(approve.calls.length, 1);
  assert.equal(rejected.calls.length, 0);
  assert.equal(button(app.tree, "Reject").props.disabled, true);
  pending.reject(new Error("Review conflict"));
  await app.flush();
  assert.match(text(app.tree), /Test user: Review conflict/);
  assert.equal(button(app.tree, "Approve").props.disabled, false);
});
test("successful review applies server response and a failed reload has an explicit recovery control", async () => {
  let fail = true;
  const reviewed = spy(),
    reload = spy(async () => {
      if (fail) throw new Error("Refresh unavailable");
    });
  const app = mount(
    "JoinRequestsPanel",
    {
      accessToken: "token",
      teamId: "team",
      canManage: true,
      joinRequests: [request()],
      onReviewed: reviewed,
      onChanged: reload,
    },
    {
      approveJoinRequest: spy(async () => ({
        data: { joinRequest: request({ status: "APPROVED" }) },
      })),
    },
  );
  button(app.tree, "Approve").props.onClick();
  await app.flush();
  assert.equal(reviewed.calls[0][0].status, "APPROVED");
  assert.match(text(app.tree), /Request updated, but/);
  assert.equal(button(app.tree, "Approve").props.disabled, true);
  fail = false;
  button(app.tree, "Refresh requests").props.onClick();
  await app.flush();
  assert.equal(button(app.tree, "Approve").props.disabled, false);
});
test("a late team detail response cannot overwrite the newly selected team", async () => {
  const old = deferred(),
    current = deferred();
  const app = mount(
    "TeamsWorkspace",
    { accessToken: "token", currentUserId: "user" },
    {
      listTeams: spy(async () => ({
        data: { teams: [team("a"), team("b")], pageInfo },
      })),
      getTeam: spy((_, id) => (id === "a" ? old.promise : current.promise)),
    },
  );
  await app.flush();
  const list = nodes(app.tree, (node) => node.type?.name === "TeamList")[0];
  list.props.onSelect("b");
  await app.flush();
  current.resolve({ data: { team: team("b") } });
  await app.flush();
  old.resolve({ data: { team: team("a") } });
  await app.flush();
  const overview = nodes(
    app.tree,
    (node) => node.type?.name === "TeamOverview",
  )[0];
  assert.equal(overview.props.team.id, "b");
});
test("account change discards older account lists and clears the previous team context", async () => {
  const pending = deferred();
  const app = mount(
    "TeamsWorkspace",
    { accessToken: "old-token", currentUserId: "old-user" },
    {
      listTeams: spy((token) =>
        token === "old-token"
          ? pending.promise
          : Promise.resolve({ data: { teams: [], pageInfo } }),
      ),
    },
  );
  app.update({ accessToken: "new-token", currentUserId: "new-user" });
  await app.flush();
  pending.resolve({ data: { teams: [team("old-team")], pageInfo } });
  await app.flush();
  const list = nodes(app.tree, (node) => node.type?.name === "TeamList")[0];
  assert.equal(list.props.teams.length, 0);
  assert.equal(
    nodes(app.tree, (node) => node.type?.name === "TeamOverview").length,
    0,
  );
});
test("short discovery search is blocked before requests while valid terms are trimmed and debounced", async () => {
  const search = spy();
  const app = mount("DiscoverTeamsPanel", {
    accessToken: "token",
    isLoading: false,
    pageInfo,
    teams: [],
    onChanged: spy(),
    onLoadMore: spy(),
    onSearch: search,
  });
  const input = nodes(app.tree, (node) => node.type === "input")[0];
  input.props.onChange({ target: { value: "ab" } });
  await app.advance(400);
  assert.equal(search.calls.length, 0);
  assert.match(text(app.tree), /at least 3/);
  input.props.onChange({ target: { value: "  engineer  " } });
  await app.flush();
  await app.advance(400);
  assert.equal(search.calls[0][0], "engineer");
});
