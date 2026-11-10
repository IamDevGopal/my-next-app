"use client";

import {
  Check,
  ChevronDown,
  Edit3,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Shield,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AvatarUploadControl } from "@/features/media/components/avatar-upload-control";
import { TeamChatPanel } from "@/features/chat/components/team-chat-panel";
import { OnlineIndicator } from "@/features/presence/components/online-indicator";
import { TeamTasksPanel } from "@/features/tasks/components/tasks-workspace";
import { searchUsers } from "@/features/users/api/users.api";
import { UserAvatar } from "@/features/users/components/user-avatar";
import type { PublicUserData } from "@/features/users/types/user.type";
import { getErrorMessage } from "@/lib/http/get-error-message";
import {
  acceptTeamInvite,
  approveJoinRequest,
  cancelJoinRequest,
  createJoinRequest,
  createTeam,
  createTeamInvite,
  deleteTeam,
  discoverTeams,
  getTeam,
  listMyJoinRequests,
  listReceivedTeamInvites,
  listTeamInvites,
  listTeamJoinRequests,
  listTeamMembers,
  listTeams,
  leaveTeam,
  removeTeamAvatar,
  removeTeamMember,
  rejectTeamInvite,
  rejectJoinRequest,
  revokeTeamInvite,
  updateTeam,
  updateTeamAvatar,
  updateTeamMember,
  transferTeamOwnership,
} from "../api/teams.api";
import type {
  PageInfoData,
  TeamDetailData,
  TeamDiscoveryData,
  TeamInviteData,
  TeamJoinPolicy,
  TeamJoinRequestData,
  TeamMemberData,
  TeamSummaryData,
  TeamVisibility,
} from "../types/team.type";
import { RoleBadge } from "./role-badge";
import { RoleChangeDialog } from "./role-change-dialog";

interface TeamsWorkspaceProps {
  accessToken: string;
  currentUserId: string;
  isUserOnline?: (userId: string) => boolean;
}

type TeamLoadStatus = "idle" | "loading" | "ready" | "error";

const teamVisibilityOptions: TeamVisibility[] = [
  "PRIVATE",
  "INTERNAL",
  "PUBLIC",
];
const teamJoinPolicyOptions: TeamJoinPolicy[] = [
  "INVITE_ONLY",
  "REQUEST_ONLY",
  "INVITE_OR_REQUEST",
];

export function TeamsWorkspace({
  accessToken,
  currentUserId,
  isUserOnline,
}: TeamsWorkspaceProps) {
  const [status, setStatus] = useState<TeamLoadStatus>("idle");
  const [teams, setTeams] = useState<TeamSummaryData[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamDetailData | null>(null);
  const [loadingTeamId, setLoadingTeamId] = useState<string | null>(null);
  const [receivedInvites, setReceivedInvites] = useState<TeamInviteData[]>([]);
  const [invites, setInvites] = useState<TeamInviteData[]>([]);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [joinRequests, setJoinRequests] = useState<TeamJoinRequestData[]>([]);
  const [discoverableTeams, setDiscoverableTeams] = useState<
    TeamDiscoveryData[]
  >([]);
  const [discoverPageInfo, setDiscoverPageInfo] = useState<PageInfoData | null>(
    null,
  );
  const [discoverQuery, setDiscoverQuery] = useState<string | undefined>();
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(false);
  const [myJoinRequests, setMyJoinRequests] = useState<TeamJoinRequestData[]>(
    [],
  );
  const [myJoinRequestsPageInfo, setMyJoinRequestsPageInfo] =
    useState<PageInfoData | null>(null);
  const [isMyJoinRequestsLoading, setIsMyJoinRequestsLoading] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedTeamIdRef = useRef<string | null>(null);
  const accountScopeRef = useRef(0);
  const teamListRequestRef = useRef(0);
  const teamDetailRequestRef = useRef(0);
  const receivedInvitesRequestRef = useRef(0);
  const discoveryRequestRef = useRef(0);
  const myJoinRequestsRequestRef = useRef(0);

  const canEditTeamSettings = selectedTeam?.currentUserRole === "OWNER";
  const canInviteMembers =
    selectedTeam?.currentUserRole === "OWNER" ||
    selectedTeam?.currentUserRole === "EDITOR";
  const canRevokeInvites = selectedTeam?.currentUserRole === "OWNER";
  const canManageMembers = selectedTeam?.currentUserRole === "OWNER";
  const inviteDisplayTime = currentTime ?? 0;
  const renderScope = accountScopeRef.current;

  useEffect(() => {
    const initialRefreshId = window.setTimeout(() => {
      setCurrentTime(Date.now());
    }, 0);
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30_000);

    return () => {
      window.clearTimeout(initialRefreshId);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const scope = ++accountScopeRef.current;
    teamListRequestRef.current += 1;
    teamDetailRequestRef.current += 1;
    receivedInvitesRequestRef.current += 1;
    discoveryRequestRef.current += 1;
    myJoinRequestsRequestRef.current += 1;
    selectedTeamIdRef.current = null;
    setStatus("loading");
    setTeams([]);
    setSelectedTeamId(null);
    setSelectedTeam(null);
    setLoadingTeamId(null);
    setReceivedInvites([]);
    setInvites([]);
    setJoinRequests([]);
    setDiscoverableTeams([]);
    setDiscoverPageInfo(null);
    setDiscoverQuery(undefined);
    setMyJoinRequests([]);
    setMyJoinRequestsPageInfo(null);
    setIsDiscoverLoading(false);
    setIsMyJoinRequestsLoading(false);
    setIsCreateTeamOpen(false);
    setMessage(null);
    void loadTeams(scope);
    void loadReceivedInvites(scope);
    void loadDiscoverableTeams({}, scope);
    void loadMyJoinRequests({}, scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, currentUserId]);

  useEffect(() => {
    if (!selectedTeamId) {
      return;
    }

    void loadTeamDetail(selectedTeamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId]);

  function selectTeam(teamId: string | null) {
    if (selectedTeamIdRef.current === teamId) return;

    selectedTeamIdRef.current = teamId;
    setSelectedTeamId(teamId);
    setSelectedTeam(null);
    setInvites([]);
    setJoinRequests([]);
    setLoadingTeamId(teamId);
    setMessage(null);
    teamDetailRequestRef.current += 1;
  }

  async function loadTeams(scope = accountScopeRef.current) {
    const requestId = ++teamListRequestRef.current;
    const isCurrentRequest = () =>
      scope === accountScopeRef.current &&
      requestId === teamListRequestRef.current;

    if (isCurrentRequest()) {
      setStatus("loading");
      setMessage(null);
    }

    try {
      const response = await listTeams(accessToken);
      if (!isCurrentRequest()) return;

      setTeams(response.data.teams);
      if (
        !response.data.teams.some(
          (team) => team.id === selectedTeamIdRef.current,
        )
      ) {
        selectTeam(response.data.teams[0]?.id ?? null);
      }
      setStatus("ready");
    } catch (error) {
      if (!isCurrentRequest()) return;
      setMessage(getErrorMessage(error));
      setStatus("error");
    }
  }

  async function loadReceivedInvites(scope = accountScopeRef.current) {
    const requestId = ++receivedInvitesRequestRef.current;
    const isCurrentRequest = () =>
      scope === accountScopeRef.current &&
      requestId === receivedInvitesRequestRef.current;

    try {
      const [pendingResponse, expiredResponse] = await Promise.all([
        listReceivedTeamInvites(accessToken, { status: "PENDING" }),
        listReceivedTeamInvites(accessToken, { status: "EXPIRED" }),
      ]);
      if (!isCurrentRequest()) return;

      setReceivedInvites([
        ...pendingResponse.data.invites,
        ...expiredResponse.data.invites,
      ]);
    } catch (error) {
      if (!isCurrentRequest()) return;
      setMessage(getErrorMessage(error));
    }
  }

  async function loadDiscoverableTeams(
    params: {
      append?: boolean;
      cursor?: string | null;
      query?: string;
    } = {},
    scope = accountScopeRef.current,
  ) {
    const requestId = ++discoveryRequestRef.current;
    const isCurrentRequest = () =>
      scope === accountScopeRef.current &&
      requestId === discoveryRequestRef.current;

    if (isCurrentRequest()) setIsDiscoverLoading(true);

    try {
      const response = await discoverTeams(accessToken, {
        cursor: params.cursor,
        q: params.query,
        limit: 8,
      });
      if (!isCurrentRequest()) return;

      setDiscoverableTeams((current) =>
        params.append
          ? [...current, ...response.data.teams]
          : response.data.teams,
      );
      setDiscoverPageInfo(response.data.pageInfo);
    } catch (error) {
      if (!isCurrentRequest()) return;
      setMessage(getErrorMessage(error));
    } finally {
      if (isCurrentRequest()) setIsDiscoverLoading(false);
    }
  }

  async function loadMyJoinRequests(
    params: {
      append?: boolean;
      cursor?: string | null;
    } = {},
    scope = accountScopeRef.current,
  ) {
    const requestId = ++myJoinRequestsRequestRef.current;
    const isCurrentRequest = () =>
      scope === accountScopeRef.current &&
      requestId === myJoinRequestsRequestRef.current;

    if (isCurrentRequest()) setIsMyJoinRequestsLoading(true);

    try {
      const response = await listMyJoinRequests(accessToken, {
        cursor: params.cursor,
        limit: 10,
      });
      if (!isCurrentRequest()) return;

      setMyJoinRequests((current) =>
        params.append
          ? [
              ...current,
              ...response.data.joinRequests.filter(
                (request) => !current.some((item) => item.id === request.id),
              ),
            ]
          : response.data.joinRequests,
      );
      setMyJoinRequestsPageInfo(response.data.pageInfo ?? null);
    } catch (error) {
      if (!isCurrentRequest()) return;
      setMessage(getErrorMessage(error));
    } finally {
      if (isCurrentRequest()) setIsMyJoinRequestsLoading(false);
    }
  }

  async function loadTeamDetail(
    teamId: string,
    scope = accountScopeRef.current,
    options: { preserveOnError?: boolean } = {},
  ) {
    if (
      scope !== accountScopeRef.current ||
      !teamId ||
      selectedTeamIdRef.current !== teamId
    ) {
      return;
    }

    const requestId = ++teamDetailRequestRef.current;
    const isCurrentRequest = () =>
      scope === accountScopeRef.current &&
      requestId === teamDetailRequestRef.current &&
      selectedTeamIdRef.current === teamId;

    setMessage(null);
    setLoadingTeamId(teamId);

    try {
      const teamResponse = await getTeam(accessToken, teamId);
      if (!isCurrentRequest()) return;

      const role = teamResponse.data.team.currentUserRole;
      const canLoadManagementData = role === "OWNER" || role === "EDITOR";
      const [pendingInvitesResponse, expiredInvitesResponse, requestsResponse] =
        canLoadManagementData
          ? await Promise.all([
              listTeamInvites(accessToken, teamId, { status: "PENDING" }),
              listTeamInvites(accessToken, teamId, { status: "EXPIRED" }),
              listTeamJoinRequests(accessToken, teamId),
            ])
          : [null, null, null];
      if (!isCurrentRequest()) return;

      setSelectedTeam(teamResponse.data.team);
      setInvites([
        ...(pendingInvitesResponse?.data.invites ?? []),
        ...(expiredInvitesResponse?.data.invites ?? []),
      ]);
      setJoinRequests(requestsResponse?.data.joinRequests ?? []);
    } catch (error) {
      if (!isCurrentRequest()) return;
      if (options.preserveOnError) throw error;
      setSelectedTeam(null);
      setInvites([]);
      setJoinRequests([]);
      setMessage(getErrorMessage(error));
    } finally {
      if (isCurrentRequest()) setLoadingTeamId(null);
    }
  }

  async function handleTeamCreated(
    team: TeamDetailData,
    scope = accountScopeRef.current,
  ) {
    if (scope !== accountScopeRef.current) return;

    await loadTeams(scope);
    if (scope !== accountScopeRef.current) return;

    selectTeam(team.id);
    setIsCreateTeamOpen(false);
  }

  function handleTeamUpdated(
    team: TeamDetailData,
    scope = accountScopeRef.current,
  ) {
    if (
      scope !== accountScopeRef.current ||
      selectedTeamIdRef.current !== team.id
    ) {
      return;
    }

    teamDetailRequestRef.current += 1;
    teamListRequestRef.current += 1;
    setSelectedTeam(team);
    setTeams((currentTeams) =>
      currentTeams.map((item) => (item.id === team.id ? team : item)),
    );
  }

  async function handleTeamDeleted(
    scope = accountScopeRef.current,
    deletedTeamId?: string,
  ) {
    if (
      scope !== accountScopeRef.current ||
      (deletedTeamId !== undefined &&
        selectedTeamIdRef.current !== deletedTeamId)
    ) {
      return;
    }

    selectTeam(null);
    await loadTeams(scope);
  }

  async function refreshSelectedTeam(
    scope = accountScopeRef.current,
    expectedTeamId = selectedTeamId,
  ) {
    if (
      scope !== accountScopeRef.current ||
      selectedTeamIdRef.current !== expectedTeamId
    ) {
      return;
    }

    await loadReceivedInvites(scope);
    await loadDiscoverableTeams({ query: discoverQuery }, scope);
    await loadMyJoinRequests({}, scope);
    if (scope !== accountScopeRef.current) return;

    if (!selectedTeamId) {
      await loadTeams(scope);
      return;
    }

    await loadTeamDetail(selectedTeamId, scope);
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <UsersRound className="size-4" />
              Teams
            </div>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Shared workspaces
            </h2>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
            onClick={() => setIsCreateTeamOpen(true)}
            type="button"
          >
            <Plus className="size-4" />
            New team
          </button>
        </div>
      </div>

      <ReceivedInvitesPanel
        accessToken={accessToken}
        currentTime={inviteDisplayTime}
        invites={receivedInvites}
        onChanged={async () => {
          if (renderScope !== accountScopeRef.current) return;
          await loadReceivedInvites(renderScope);
          await loadTeams(renderScope);
        }}
      />

      <div className="grid min-w-0 gap-4 border-b border-slate-200 px-3 py-3 sm:px-5 sm:py-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <DiscoverTeamsPanel
          accessToken={accessToken}
          isLoading={isDiscoverLoading}
          pageInfo={discoverPageInfo}
          teams={discoverableTeams}
          onChanged={async () => {
            if (renderScope !== accountScopeRef.current) return;
            await loadDiscoverableTeams({ query: discoverQuery }, renderScope);
            await loadMyJoinRequests({}, renderScope);
          }}
          onLoadMore={async () => {
            if (renderScope !== accountScopeRef.current) return;
            await loadDiscoverableTeams(
              {
                append: true,
                cursor: discoverPageInfo?.nextCursor,
                query: discoverQuery,
              },
              renderScope,
            );
          }}
          onSearch={async (query) => {
            if (renderScope !== accountScopeRef.current) return;
            setDiscoverQuery(query);
            await loadDiscoverableTeams({ query }, renderScope);
          }}
        />
        <MyJoinRequestsPanel
          accessToken={accessToken}
          isLoading={isMyJoinRequestsLoading}
          joinRequests={myJoinRequests}
          key={renderScope}
          onCancelled={(request) => {
            if (renderScope !== accountScopeRef.current) return;
            myJoinRequestsRequestRef.current += 1;
            setIsMyJoinRequestsLoading(false);
            setMyJoinRequests((current) =>
              current.map((item) => (item.id === request.id ? request : item)),
            );
            discoveryRequestRef.current += 1;
            setIsDiscoverLoading(false);
            setDiscoverableTeams((current) =>
              current.map((team) =>
                team.pendingJoinRequestId === request.id
                  ? { ...team, pendingJoinRequestId: null }
                  : team,
              ),
            );
          }}
          onLoadMore={async () => {
            if (
              renderScope !== accountScopeRef.current ||
              isMyJoinRequestsLoading ||
              !myJoinRequestsPageInfo?.hasNextPage
            ) {
              return;
            }
            await loadMyJoinRequests(
              {
                append: true,
                cursor: myJoinRequestsPageInfo.nextCursor,
              },
              renderScope,
            );
          }}
          pageInfo={myJoinRequestsPageInfo}
        />
      </div>

      <div className="grid min-h-136 min-w-0 gap-0 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-slate-200 p-3 sm:p-4 lg:border-b-0 lg:border-r">
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            onClick={() => void refreshSelectedTeam(renderScope)}
            type="button"
          >
            <RefreshCcw className="size-4" />
            Refresh teams
          </button>
          <TeamList
            isLoading={status === "loading"}
            onSelect={selectTeam}
            onCreate={() => setIsCreateTeamOpen(true)}
            selectedTeamId={selectedTeamId}
            teams={teams}
          />
        </aside>

        <div className="min-w-0 p-3 sm:p-5">
          {message ? (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {message}
            </div>
          ) : null}

          {status === "error" ? (
            <EmptyState
              icon={<X className="size-5" />}
              title="Teams could not load"
              text="Refresh the workspace after checking your session."
            />
          ) : selectedTeam ? (
            <div className="min-w-0 space-y-5">
              <TeamOverview
                accessToken={accessToken}
                canEdit={canEditTeamSettings}
                canDelete={canManageMembers}
                key={selectedTeam.id}
                onDeleted={() =>
                  void handleTeamDeleted(renderScope, selectedTeam.id)
                }
                onUpdated={(team) => handleTeamUpdated(team, renderScope)}
                team={selectedTeam}
              />
              <TeamTasksPanel
                accessToken={accessToken}
                currentUserId={currentUserId}
                currentUserRole={selectedTeam.currentUserRole}
                teamId={selectedTeam.id}
                teamName={selectedTeam.name}
              />
              <section className="rounded-lg border border-slate-200 p-3 sm:p-4">
                <TeamChatPanel
                  accessToken={accessToken}
                  teamId={selectedTeam.id}
                  teamName={selectedTeam.name}
                  currentUserId={currentUserId}
                />
              </section>
              <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <TeamMembersPanel
                  key={`${renderScope}:${selectedTeam.id}`}
                  accessToken={accessToken}
                  canManage={canManageMembers}
                  currentUserRole={selectedTeam.currentUserRole}
                  isUserOnline={isUserOnline}
                  onLeft={() =>
                    void handleTeamDeleted(renderScope, selectedTeam.id)
                  }
                  onMembershipChanged={() =>
                    loadTeamDetail(selectedTeam.id, renderScope, {
                      preserveOnError: true,
                    })
                  }
                  onTeamUpdated={(team) => handleTeamUpdated(team, renderScope)}
                  teamId={selectedTeam.id}
                />
                <TeamInvitePanel
                  accessToken={accessToken}
                  canInvite={canInviteMembers}
                  canRevoke={canRevokeInvites}
                  currentTime={inviteDisplayTime}
                  invites={invites}
                  onInviteCreated={(invite) => {
                    if (renderScope !== accountScopeRef.current) return;
                    setInvites((current) => [invite, ...current]);
                  }}
                  onInviteRevoked={(inviteId) => {
                    if (renderScope !== accountScopeRef.current) return;
                    setInvites((current) =>
                      current.filter((i) => i.id !== inviteId),
                    );
                  }}
                  teamId={selectedTeam.id}
                />
              </div>
              <JoinRequestsPanel
                accessToken={accessToken}
                canManage={canManageMembers}
                joinRequests={joinRequests}
                key={`${renderScope}:${selectedTeam.id}`}
                onReviewed={(request) => {
                  if (
                    renderScope !== accountScopeRef.current ||
                    selectedTeamIdRef.current !== selectedTeam.id
                  ) {
                    return;
                  }
                  teamDetailRequestRef.current += 1;
                  setJoinRequests((current) =>
                    current.map((item) =>
                      item.id === request.id ? request : item,
                    ),
                  );
                }}
                onChanged={() =>
                  loadTeamDetail(selectedTeam.id, renderScope, {
                    preserveOnError: true,
                  })
                }
                teamId={selectedTeam.id}
              />
            </div>
          ) : selectedTeamId && loadingTeamId === selectedTeamId ? (
            <div className="flex min-h-64 items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm font-medium text-slate-600">
              <Loader2 className="size-5 animate-spin" />
              Loading{" "}
              {teams.find((team) => team.id === selectedTeamId)?.name ??
                "selected team"}
              ...
            </div>
          ) : selectedTeamId ? (
            <EmptyState
              icon={<X className="size-5" />}
              title="Team details could not load"
              text="Refresh the selected team to try again."
            />
          ) : status === "loading" ? (
            <div className="flex min-h-64 items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm font-medium text-slate-600">
              <Loader2 className="size-5 animate-spin" />
              Loading your teams...
            </div>
          ) : teams.length === 0 ? (
            <EmptyState
              actionLabel="Create team"
              icon={<Plus className="size-5" />}
              onAction={() => setIsCreateTeamOpen(true)}
              title="Create your first team"
              text="Teams bring tasks, members, chat, and future calls into one workspace."
            />
          ) : (
            <EmptyState
              icon={<UsersRound className="size-5" />}
              title="Select a team"
              text="Choose a team from your list to view its shared workspace."
            />
          )}
        </div>
      </div>

      <CreateTeamDialog
        accessToken={accessToken}
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onCreated={(team) => handleTeamCreated(team, renderScope)}
      />
    </section>
  );
}

interface CreateTeamDialogProps {
  accessToken: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (team: TeamDetailData) => void | Promise<void>;
}

interface ReceivedInvitesPanelProps {
  accessToken: string;
  currentTime: number;
  invites: TeamInviteData[];
  onChanged: () => void | Promise<void>;
}

function ReceivedInvitesPanel({
  accessToken,
  currentTime,
  invites,
  onChanged,
}: ReceivedInvitesPanelProps) {
  const expiredInvites = invites.filter((invite) =>
    isInviteExpired(invite, currentTime),
  );
  const pendingInvites = invites.filter(
    (invite) =>
      invite.status === "PENDING" && !isInviteExpired(invite, currentTime),
  );
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function respond(inviteId: string, action: "accept" | "reject") {
    const invite = invites.find((item) => item.id === inviteId);
    if (!invite || invite.status !== "PENDING" || isInviteExpired(invite)) {
      return;
    }

    setBusyInviteId(inviteId);
    setMessage(null);

    try {
      if (action === "accept") {
        await acceptTeamInvite(accessToken, inviteId);
      } else {
        await rejectTeamInvite(accessToken, inviteId);
      }

      await onChanged();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusyInviteId(null);
    }
  }

  if (pendingInvites.length === 0 && expiredInvites.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-slate-200 bg-emerald-50/60 px-3 py-3 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Team invites</h3>
          <p className="mt-1 text-sm text-slate-600">
            Pending invites can be accepted or rejected. Expired invites are
            shown for reference only.
          </p>
        </div>
        {message ? (
          <p className="text-sm font-medium text-rose-600">{message}</p>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {pendingInvites.map((invite) => (
          <article
            className="rounded-md border border-emerald-100 bg-white p-3"
            key={invite.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {invite.team.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Invited by {invite.inviter.name} as {formatEnum(invite.role)}
                </p>
              </div>
              <RoleBadge role={invite.role} />
            </div>
            {invite.message ? (
              <p className="mt-2 text-sm text-slate-600">{invite.message}</p>
            ) : null}
            {invite.expiresAt ? (
              <p className="mt-2 text-xs text-slate-500">
                Sent {formatInviteDate(invite.createdAt)} · Expires{" "}
                {formatInviteDate(invite.expiresAt)}
              </p>
            ) : null}
            <div className="mt-3 flex flex-col gap-2 min-[360px]:flex-row">
              <button
                className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-70"
                disabled={
                  busyInviteId === invite.id ||
                  isInviteExpired(invite, currentTime)
                }
                onClick={() => void respond(invite.id, "accept")}
                type="button"
              >
                {busyInviteId === invite.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Accept
              </button>
              <button
                className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-70"
                disabled={
                  busyInviteId === invite.id ||
                  isInviteExpired(invite, currentTime)
                }
                onClick={() => void respond(invite.id, "reject")}
                type="button"
              >
                <X className="size-4" />
                Reject
              </button>
            </div>
          </article>
        ))}
      </div>
      {expiredInvites.length > 0 ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-100/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-slate-700">
              Expired invites
            </h4>
            <span className="rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">
              No actions available
            </span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {expiredInvites.map((invite) => (
              <article
                className="rounded-md border border-slate-200 bg-white p-3"
                key={invite.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {invite.team.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Invited by {invite.inviter.name} as{" "}
                      {formatEnum(invite.role)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    Expired
                  </span>
                </div>
                {invite.message ? (
                  <p className="mt-2 text-sm text-slate-600">
                    {invite.message}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  Sent {formatInviteDate(invite.createdAt)}
                </p>
                {invite.expiresAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Expired {formatInviteDate(invite.expiresAt)}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    Expiry date unavailable
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

interface DiscoverTeamsPanelProps {
  accessToken: string;
  isLoading: boolean;
  onLoadMore: () => void | Promise<void>;
  teams: TeamDiscoveryData[];
  onChanged: () => void | Promise<void>;
  onSearch: (query?: string) => void | Promise<void>;
  pageInfo: PageInfoData | null;
}

function DiscoverTeamsPanel({
  accessToken,
  isLoading,
  onLoadMore,
  teams,
  onChanged,
  onSearch,
  pageInfo,
}: DiscoverTeamsPanelProps) {
  const [query, setQuery] = useState("");
  const isInitialSearch = useRef(true);
  const onSearchRef = useRef(onSearch);
  const [messageByTeamId, setMessageByTeamId] = useState<
    Record<string, string>
  >({});
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [busyTeamId, setBusyTeamId] = useState<string | null>(null);
  const isSearchTooShort = query.trim().length > 0 && query.trim().length < 3;

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (isInitialSearch.current) {
      isInitialSearch.current = false;
      return;
    }

    const normalizedQuery = query.trim();
    if (normalizedQuery.length > 0 && normalizedQuery.length < 3) {
      setSearchMessage("Enter at least 3 characters to search teams.");
      return;
    }

    setSearchMessage(null);

    const timeoutId = window.setTimeout(() => {
      void onSearchRef.current(normalizedQuery || undefined);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (normalizedQuery.length > 0 && normalizedQuery.length < 3) {
      setSearchMessage("Enter at least 3 characters to search teams.");
      return;
    }

    setSearchMessage(null);
    await onSearch(normalizedQuery || undefined);
  }

  async function requestToJoin(team: TeamDiscoveryData) {
    setBusyTeamId(team.id);
    setMessageByTeamId((current) => ({ ...current, [team.id]: "" }));

    try {
      await createJoinRequest(accessToken, team.id);
      setMessageByTeamId((current) => ({
        ...current,
        [team.id]: "Request sent.",
      }));
      await onChanged();
    } catch (error) {
      setMessageByTeamId((current) => ({
        ...current,
        [team.id]: getErrorMessage(error),
      }));
    } finally {
      setBusyTeamId(null);
    }
  }

  return (
    <section className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            Discover teams
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Find public/internal teams and request access. Search requires at
            least 3 characters.
          </p>
        </div>
        <form className="flex min-w-0 gap-2 sm:w-80" onSubmit={handleSearch}>
          <input
            className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
            minLength={3}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search teams"
            value={query}
          />
          <button
            className="inline-flex size-10 items-center justify-center rounded-md bg-slate-950 text-white"
            disabled={isLoading || isSearchTooShort}
            title="Search teams"
            type="submit"
          >
            <Search className="size-4" />
          </button>
        </form>
      </div>
      {searchMessage ? (
        <p className="mt-2 text-sm font-medium text-amber-700">
          {searchMessage}
        </p>
      ) : null}
      <div className="mt-4 max-h-112 overflow-y-auto pr-1">
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          {isSearchTooShort
            ? null
            : teams.map((team) => {
                const cannotRequest =
                  team.joinPolicy === "INVITE_ONLY" ||
                  team.pendingJoinRequestId !== null;

                return (
                  <article
                    className="min-w-0 rounded-md border border-slate-200 bg-white p-3"
                    key={team.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {team.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatEnum(team.visibility)} · {team.membersCount}{" "}
                          members
                        </p>
                      </div>
                      <StatusPill value={team.joinPolicy} />
                    </div>
                    {team.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                        {team.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-col gap-2 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between">
                      <p className="min-w-0 truncate text-xs text-slate-500">
                        Owner: {team.owner.name}
                      </p>
                      <button
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={cannotRequest || busyTeamId === team.id}
                        onClick={() => void requestToJoin(team)}
                        type="button"
                      >
                        {busyTeamId === team.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <UserPlus className="size-4" />
                        )}
                        {team.pendingJoinRequestId ? "Requested" : "Request"}
                      </button>
                    </div>
                    {messageByTeamId[team.id] ? (
                      <p className="mt-2 text-xs font-medium text-slate-500">
                        {messageByTeamId[team.id]}
                      </p>
                    ) : null}
                  </article>
                );
              })}
          {!isSearchTooShort && teams.length === 0 ? (
            <p className="text-sm text-slate-500">
              {isLoading
                ? "Searching teams..."
                : "No discoverable teams found."}
            </p>
          ) : null}
        </div>
        {!isSearchTooShort && pageInfo?.hasNextPage ? (
          <button
            className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoading}
            onClick={() => void onLoadMore()}
            type="button"
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            Load more teams
          </button>
        ) : null}
      </div>
    </section>
  );
}

function MyJoinRequestsPanel({
  accessToken,
  isLoading,
  joinRequests,
  onCancelled,
  onLoadMore,
  pageInfo,
}: {
  accessToken: string;
  isLoading: boolean;
  joinRequests: TeamJoinRequestData[];
  onCancelled: (request: TeamJoinRequestData) => void;
  onLoadMore: () => void | Promise<void>;
  pageInfo: PageInfoData | null;
}) {
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());
  const [cancelErrors, setCancelErrors] = useState<Record<string, string>>({});
  const cancelLocksRef = useRef(new Set<string>());

  async function handleCancel(requestId: string) {
    const request = joinRequests.find((item) => item.id === requestId);
    if (
      request?.status !== "PENDING" ||
      cancelLocksRef.current.has(requestId)
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Cancel this join request? You can request again later.",
    );

    if (!confirmed) {
      return;
    }

    cancelLocksRef.current.add(requestId);
    setCancellingIds(new Set(cancelLocksRef.current));
    setCancelErrors((current) => ({ ...current, [requestId]: "" }));

    try {
      const response = await cancelJoinRequest(accessToken, requestId);
      onCancelled(response.data.joinRequest);
    } catch (error) {
      setCancelErrors((current) => ({
        ...current,
        [requestId]: getErrorMessage(error),
      }));
    } finally {
      cancelLocksRef.current.delete(requestId);
      setCancellingIds(new Set(cancelLocksRef.current));
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-950">
          My join requests
        </h3>
        <Shield className="size-5 text-slate-400" />
      </div>
      <div className="mt-4 max-h-112 space-y-3 overflow-y-auto pr-1">
        {joinRequests.map((request) => {
          const isPending = request.status === "PENDING";

          return (
            <article
              className="flex min-w-0 items-start justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
              key={request.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {request.team.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {request.message ?? "No message added"}
                </p>
                <div className="mt-1.5">
                  <StatusPill value={request.status} />
                </div>
                {cancelErrors[request.id] ? (
                  <p
                    className="mt-2 text-xs font-medium text-rose-600"
                    role="alert"
                  >
                    {cancelErrors[request.id]}
                  </p>
                ) : null}
              </div>
              {isPending ? (
                <button
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50 disabled:opacity-60"
                  disabled={cancellingIds.has(request.id)}
                  onClick={() => void handleCancel(request.id)}
                  title="Cancel request"
                  type="button"
                >
                  {cancellingIds.has(request.id) ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                </button>
              ) : null}
            </article>
          );
        })}
        {joinRequests.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 p-4 text-center">
            <Shield className="mx-auto size-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-500">
              {isLoading ? "Loading requests..." : "No join requests sent yet."}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Discover teams above and request to join them.
            </p>
          </div>
        ) : null}
        {pageInfo?.hasNextPage ? (
          <button
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoading}
            onClick={() => void onLoadMore()}
            type="button"
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            Load more requests
          </button>
        ) : null}
      </div>
    </section>
  );
}

function CreateTeamDialog({
  accessToken,
  isOpen,
  onClose,
  onCreated,
}: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<TeamVisibility>("PRIVATE");
  const [joinPolicy, setJoinPolicy] =
    useState<TeamJoinPolicy>("INVITE_OR_REQUEST");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setMessage("Team name is required.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await createTeam(accessToken, {
        name,
        description: description.trim() || null,
        visibility,
        joinPolicy,
      });
      setName("");
      setDescription("");
      await onCreated(response.data.team);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <form
        className="w-full max-w-2xl rounded-lg bg-white shadow-xl"
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              Create team
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Set the team identity and joining rules before inviting members.
            </p>
          </div>
          <button
            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-5 sm:px-5">
          <TextField label="Team name" onChange={setName} value={name} />
          <label className="block text-sm font-semibold text-slate-800">
            Description
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this team will coordinate"
              value={description}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Visibility"
              onChange={(value) => setVisibility(value as TeamVisibility)}
              options={teamVisibilityOptions}
              value={visibility}
            />
            <SelectField
              label="Join policy"
              onChange={(value) => setJoinPolicy(value as TeamJoinPolicy)}
              options={teamJoinPolicyOptions}
              value={joinPolicy}
            />
          </div>
          {message ? (
            <p className="text-sm font-medium text-rose-600">{message}</p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
          <button
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create team
          </button>
        </div>
      </form>
    </div>
  );
}

interface TeamListProps {
  isLoading: boolean;
  onCreate: () => void;
  onSelect: (teamId: string) => void;
  selectedTeamId: string | null;
  teams: TeamSummaryData[];
}

function TeamList({
  isLoading,
  onCreate,
  onSelect,
  selectedTeamId,
  teams,
}: TeamListProps) {
  return (
    <div className="mt-4 space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        My teams
      </h3>
      {isLoading ? (
        <div className="h-20 animate-pulse rounded-md bg-slate-100" />
      ) : null}
      {teams.map((team) => (
        <button
          className={`w-full min-w-0 rounded-md border px-3 py-3 text-left transition ${
            selectedTeamId === team.id
              ? "border-emerald-300 bg-emerald-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
          key={team.id}
          onClick={() => onSelect(team.id)}
          type="button"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold text-slate-950">
              {team.name}
            </p>
            <RoleBadge role={team.currentUserRole} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {team.membersCount} member{team.membersCount === 1 ? "" : "s"}
          </p>
        </button>
      ))}
      {!isLoading && teams.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 p-3">
          <p className="text-sm text-slate-500">No teams yet.</p>
          <button
            className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
            onClick={onCreate}
            type="button"
          >
            <Plus className="size-4" />
            Create team
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface TeamOverviewProps {
  accessToken: string;
  canDelete: boolean;
  canEdit: boolean;
  onDeleted: () => void | Promise<void>;
  onUpdated: (team: TeamDetailData) => void;
  team: TeamDetailData;
}

function TeamOverview({
  accessToken,
  canDelete,
  canEdit,
  onDeleted,
  onUpdated,
  team,
}: TeamOverviewProps) {
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? "");
  const [visibility, setVisibility] = useState<TeamVisibility>(team.visibility);
  const [joinPolicy, setJoinPolicy] = useState<TeamJoinPolicy>(team.joinPolicy);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarSaving, setIsAvatarSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEdit) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await updateTeam(accessToken, team.id, {
        name,
        description,
        visibility,
        joinPolicy,
      });
      onUpdated(response.data.team);
      setMessage("Team updated.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      "Archive this team? It will disappear from normal team lists.",
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      await deleteTeam(accessToken, team.id);
      await onDeleted();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleAvatarUpload(file: File) {
    if (!canEdit) {
      return;
    }

    setIsAvatarSaving(true);
    setAvatarMessage(null);

    try {
      const response = await updateTeamAvatar(accessToken, team.id, file);
      onUpdated(response.data.team);
      setAvatarMessage(response.message || "Team avatar updated.");
    } catch (error) {
      setAvatarMessage(getErrorMessage(error));
      throw error;
    } finally {
      setIsAvatarSaving(false);
    }
  }

  async function handleAvatarRemove() {
    if (!canEdit) {
      return;
    }

    setIsAvatarSaving(true);
    setAvatarMessage(null);

    try {
      const response = await removeTeamAvatar(accessToken, team.id);
      onUpdated(response.data.team);
      setAvatarMessage(response.message || "Team avatar removed.");
    } catch (error) {
      setAvatarMessage(getErrorMessage(error));
    } finally {
      setIsAvatarSaving(false);
    }
  }

  return (
    <form
      className="min-w-0 rounded-lg border border-slate-200 p-3 sm:p-4"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-700">/{team.slug}</p>
          <h3 className="mt-1 truncate text-xl font-semibold text-slate-950 sm:text-2xl">
            {team.name}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Owned by {team.owner.name} · {team.membersCount} active members
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill value={team.status} />
          <RoleBadge role={team.currentUserRole} />
        </div>
      </div>

      <div className="mt-5">
        <AvatarUploadControl
          avatarUrl={team.avatarUrl}
          disabled={!canEdit || isAvatarSaving}
          message={avatarMessage}
          name={team.name}
          onRemove={handleAvatarRemove}
          onUpload={handleAvatarUpload}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <TextField
          disabled={!canEdit}
          label="Team name"
          onChange={setName}
          value={name}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <SelectField
            disabled={!canEdit}
            label="Visibility"
            onChange={(value) => setVisibility(value as TeamVisibility)}
            options={teamVisibilityOptions}
            value={visibility}
          />
          <SelectField
            disabled={!canEdit}
            label="Join policy"
            onChange={(value) => setJoinPolicy(value as TeamJoinPolicy)}
            options={teamJoinPolicyOptions}
            value={joinPolicy}
          />
        </div>
      </div>
      <label className="mt-3 block text-sm font-semibold text-slate-800">
        Description
        <textarea
          className="mt-2 min-h-24 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-500"
          disabled={!canEdit}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What this team is responsible for"
          value={description}
        />
      </label>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-500">{message}</p>
        <div className="flex w-full flex-col gap-2 min-[360px]:flex-row min-[360px]:justify-end sm:w-auto">
          {canDelete ? (
            <button
              className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isDeleting || isSaving}
              onClick={() => void handleDelete()}
              type="button"
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Archive
            </button>
          ) : null}
          {canEdit ? (
            <button
              className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSaving || isDeleting}
              type="submit"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Edit3 className="size-4" />
              )}
              Save
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

interface TeamMembersPanelProps {
  accessToken: string;
  canManage: boolean;
  currentUserRole: TeamMemberData["role"];
  isUserOnline?: (userId: string) => boolean;
  onLeft: () => void;
  onMembershipChanged: () => Promise<void>;
  onTeamUpdated: (team: TeamDetailData) => void;
  teamId: string;
}

function TeamMembersPanel({
  accessToken,
  canManage,
  currentUserRole,
  isUserOnline,
  onLeft,
  onMembershipChanged,
  onTeamUpdated,
  teamId,
}: TeamMembersPanelProps) {
  const [members, setMembers] = useState<TeamMemberData[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfoData | null>(null);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [roleChangeMember, setRoleChangeMember] =
    useState<TeamMemberData | null>(null);
  const [isRoleChangeBusy, setIsRoleChangeBusy] = useState(false);
  const [roleChangeError, setRoleChangeError] = useState<string | null>(null);
  const [isGovernanceBusy, setIsGovernanceBusy] = useState(false);
  const [removingMemberIds, setRemovingMemberIds] = useState<Set<string>>(
    new Set(),
  );
  const [removalErrors, setRemovalErrors] = useState<Record<string, string>>(
    {},
  );
  const removalLocksRef = useRef(new Set<string>());
  const membersRequestRef = useRef(0);
  const membersScopeRef = useRef(0);

  useEffect(() => {
    const scope = ++membersScopeRef.current;
    void loadMembers({}, scope);
    return () => {
      membersScopeRef.current += 1;
      membersRequestRef.current += 1;
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [accessToken, teamId]);

  async function loadMembers(
    params: { append?: boolean; cursor?: string | null } = {},
    scope = membersScopeRef.current,
  ) {
    if (scope !== membersScopeRef.current) return;
    const requestId = ++membersRequestRef.current;
    const isCurrentRequest = () =>
      scope === membersScopeRef.current &&
      requestId === membersRequestRef.current;

    setIsMembersLoading(true);
    setMembersError(null);

    try {
      const response = await listTeamMembers(accessToken, teamId, {
        cursor: params.cursor,
        limit: 20,
      });
      if (!isCurrentRequest()) return;
      setMembers((current) =>
        params.append
          ? [
              ...current,
              ...response.data.members.filter(
                (member) => !current.some((item) => item.id === member.id),
              ),
            ]
          : response.data.members,
      );
      setPageInfo(response.data.pageInfo);
    } catch (error) {
      if (!isCurrentRequest()) return;
      setMembersError(getErrorMessage(error));
    } finally {
      if (isCurrentRequest()) setIsMembersLoading(false);
    }
  }

  async function handleRoleChange(memberId: string, role: "EDITOR" | "VIEWER") {
    if (removalLocksRef.current.size > 0) return;
    setIsRoleChangeBusy(true);

    try {
      await updateTeamMember(accessToken, teamId, memberId, {
        role,
      });
      await loadMembers();
      await onMembershipChanged();
      setRoleChangeMember(null);
    } catch (error) {
      setRoleChangeError(getErrorMessage(error));
    } finally {
      setIsRoleChangeBusy(false);
    }
  }

  async function handleRemove(memberId: string) {
    const member = members.find((item) => item.id === memberId);
    if (
      !canManage ||
      !member ||
      member.role === "OWNER" ||
      isGovernanceBusy ||
      isRoleChangeBusy ||
      isMembersLoading ||
      membersError !== null ||
      removalLocksRef.current.has(memberId)
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Remove this member from the team? This action can be undone by re-inviting them.",
    );

    if (!confirmed) {
      return;
    }

    const scope = membersScopeRef.current;
    removalLocksRef.current.add(memberId);
    setRemovingMemberIds(new Set(removalLocksRef.current));
    setRemovalErrors((current) => ({ ...current, [memberId]: "" }));

    try {
      await removeTeamMember(accessToken, teamId, memberId);
      if (scope !== membersScopeRef.current) return;
      membersRequestRef.current += 1;
      setMembers((current) => current.filter((item) => item.id !== memberId));
    } catch (error) {
      if (scope !== membersScopeRef.current) return;
      setRemovalErrors((current) => ({
        ...current,
        [memberId]: `${member.user.name}: ${getErrorMessage(error)}`,
      }));
    }

    /* Re-read after either outcome: a failed response may follow a committed removal. */
    try {
      if (scope !== membersScopeRef.current) return;
      await loadMembers({}, scope);
      if (scope !== membersScopeRef.current) return;
      await onMembershipChanged();
    } catch (error) {
      if (scope !== membersScopeRef.current) return;
      setMembersError(
        `Team details could not refresh: ${getErrorMessage(error)}`,
      );
    } finally {
      if (scope === membersScopeRef.current) {
        removalLocksRef.current.delete(memberId);
        setRemovingMemberIds(new Set(removalLocksRef.current));
      }
    }
  }

  async function refreshMembers() {
    const scope = membersScopeRef.current;
    await loadMembers({}, scope);
    if (scope !== membersScopeRef.current) return;
    try {
      await onMembershipChanged();
    } catch (error) {
      if (scope !== membersScopeRef.current) return;
      setMembersError(getErrorMessage(error));
    }
  }

  async function handleTransferOwnership(member: TeamMemberData) {
    if (removalLocksRef.current.size > 0) return;
    const confirmed = window.confirm(
      `Transfer team ownership to ${member.user.name}? You will become an editor.`,
    );

    if (!confirmed) return;

    setIsGovernanceBusy(true);
    setMembersError(null);

    try {
      const response = await transferTeamOwnership(
        accessToken,
        teamId,
        member.id,
      );
      onTeamUpdated(response.data.team);
      await loadMembers();
    } catch (error) {
      setMembersError(getErrorMessage(error));
    } finally {
      setIsGovernanceBusy(false);
    }
  }

  async function handleLeaveTeam() {
    const confirmed = window.confirm(
      "Leave this team? You will lose access to its tasks and chat.",
    );

    if (!confirmed) return;

    setIsGovernanceBusy(true);
    setMembersError(null);

    try {
      await leaveTeam(accessToken, teamId);
      onLeft();
    } catch (error) {
      setMembersError(getErrorMessage(error));
    } finally {
      setIsGovernanceBusy(false);
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-950">Members</h3>
        <div className="flex items-center gap-2">
          {currentUserRole !== "OWNER" ? (
            <button
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
              disabled={isGovernanceBusy}
              onClick={() => void handleLeaveTeam()}
              type="button"
            >
              Leave team
            </button>
          ) : null}
          <UsersRound className="size-5 text-slate-400" />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {members.map((member) => (
          <article
            className="flex min-w-0 flex-col gap-3 rounded-md bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between transition-all hover:bg-slate-100"
            key={member.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative shrink-0">
                <UserAvatar
                  avatarUrl={member.user.avatarUrl}
                  name={member.user.name}
                  size="sm"
                />
                {isUserOnline ? (
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <OnlineIndicator
                      isOnline={isUserOnline(member.user.id)}
                      size="sm"
                    />
                  </div>
                ) : null}
              </div>
              <div className="min-w-0">
                <h4 className="truncate text-sm font-semibold text-slate-950">
                  {member.user.name}
                </h4>
                <p className="truncate text-xs text-slate-500">
                  {member.user.username
                    ? `@${member.user.username}`
                    : (member.user.profile?.headline ?? "Team member")}
                </p>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              {canManage && member.role !== "OWNER" ? (
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  disabled={removingMemberIds.size > 0 || isGovernanceBusy}
                  onClick={() => setRoleChangeMember(member)}
                  title="Change role"
                  type="button"
                >
                  <RoleBadge role={member.role} showTooltip={false} />
                  <ChevronDown className="size-3 text-slate-400" />
                </button>
              ) : (
                <RoleBadge role={member.role} />
              )}
              {canManage && member.role !== "OWNER" ? (
                <>
                  <button
                    className="rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
                    disabled={
                      isGovernanceBusy ||
                      isRoleChangeBusy ||
                      removingMemberIds.size > 0
                    }
                    onClick={() => void handleTransferOwnership(member)}
                    type="button"
                  >
                    Make owner
                  </button>
                  <button
                    className="inline-flex size-9 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                    disabled={
                      removingMemberIds.has(member.id) ||
                      isGovernanceBusy ||
                      isRoleChangeBusy ||
                      isMembersLoading ||
                      membersError !== null
                    }
                    onClick={() => void handleRemove(member.id)}
                    title="Remove member"
                    type="button"
                  >
                    {removingMemberIds.has(member.id) ? (
                      <Loader2
                        aria-label="Removing member"
                        className="size-4 animate-spin"
                      />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                </>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {membersError ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-rose-600" role="alert">
            {membersError}
          </p>
          <button
            className="text-sm font-semibold text-emerald-700 disabled:opacity-60"
            disabled={isMembersLoading || removingMemberIds.size > 0}
            onClick={() => void refreshMembers()}
            type="button"
          >
            Refresh members
          </button>
        </div>
      ) : null}
      {Object.entries(removalErrors).map(([memberId, error]) =>
        error ? (
          <p
            className="mt-3 text-sm font-medium text-rose-600"
            key={memberId}
            role="alert"
          >
            {error}
          </p>
        ) : null,
      )}

      {pageInfo?.hasNextPage ? (
        <button
          className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          disabled={
            isMembersLoading ||
            removingMemberIds.size > 0 ||
            membersError !== null
          }
          onClick={() =>
            void loadMembers({ append: true, cursor: pageInfo.nextCursor })
          }
          type="button"
        >
          {isMembersLoading ? "Loading…" : "Load more members"}
        </button>
      ) : null}

      {isMembersLoading && members.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Loading members…</p>
      ) : null}

      {roleChangeError ? (
        <p className="mt-3 text-sm font-medium text-rose-600">
          {roleChangeError}
        </p>
      ) : null}

      {roleChangeMember ? (
        <RoleChangeDialog
          isBusy={isRoleChangeBusy}
          isOpen={true}
          member={roleChangeMember}
          onClose={() => {
            setRoleChangeMember(null);
            setRoleChangeError(null);
          }}
          onConfirm={handleRoleChange}
        />
      ) : null}
    </section>
  );
}

interface TeamInvitePanelProps {
  accessToken: string;
  canInvite: boolean;
  canRevoke: boolean;
  currentTime: number;
  invites: TeamInviteData[];
  onInviteCreated: (invite: TeamInviteData) => void;
  onInviteRevoked: (inviteId: string) => void;
  teamId: string;
}

function TeamInvitePanel({
  accessToken,
  canInvite,
  canRevoke,
  currentTime,
  invites,
  onInviteCreated,
  onInviteRevoked,
  teamId,
}: TeamInvitePanelProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<PublicUserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<PublicUserData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const searchControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      searchControllerRef.current?.abort();
    };
  }, []);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    searchControllerRef.current?.abort();
    searchControllerRef.current = null;
    setIsBusy(false);

    if (query.trim().length < 3) {
      setMessage("Type at least 3 characters.");
      return;
    }

    if (query.trim().length > 80) {
      setMessage("Search by name or username using 80 characters or fewer.");
      return;
    }

    setIsBusy(true);
    setMessage(null);
    const controller = new AbortController();
    searchControllerRef.current = controller;

    try {
      const response = await searchUsers({
        accessToken,
        query,
        limit: 5,
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        return;
      }
      setUsers(response.data.users);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      setMessage(getErrorMessage(error));
    } finally {
      if (searchControllerRef.current === controller) {
        searchControllerRef.current = null;
        setIsBusy(false);
      }
    }
  }

  async function handleInvite() {
    if (!selectedUser) {
      setMessage("Select a user first.");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const response = await createTeamInvite(accessToken, teamId, {
        inviteeUserId: selectedUser.id,
        role: "VIEWER",
      });
      onInviteCreated(response.data.invite);
      setSelectedUser(null);
      setUsers([]);
      setQuery("");
      setMessage("Invite sent.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    if (!canRevoke || revokingInviteId !== null) return;

    const invite = invites.find((item) => item.id === inviteId);
    if (!invite || invite.status !== "PENDING" || isInviteExpired(invite)) {
      return;
    }

    const confirmed = window.confirm(
      "Revoke this invite? The invited user will no longer be able to accept it.",
    );

    if (!confirmed) {
      return;
    }

    setRevokingInviteId(inviteId);

    try {
      await revokeTeamInvite(accessToken, teamId, inviteId);
      onInviteRevoked(inviteId);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setRevokingInviteId(null);
    }
  }

  const expiredInvites = useMemo(
    () => invites.filter((invite) => isInviteExpired(invite, currentTime)),
    [currentTime, invites],
  );
  const pendingInvites = useMemo(
    () =>
      invites.filter(
        (invite) =>
          invite.status === "PENDING" && !isInviteExpired(invite, currentTime),
      ),
    [currentTime, invites],
  );

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-950">Invites</h3>
        <UserPlus className="size-5 text-slate-400" />
      </div>

      {canInvite ? (
        <div className="mt-4 rounded-md bg-slate-50 p-3">
          <form className="flex gap-2" onSubmit={handleSearch}>
            <input
              className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
              maxLength={80}
              onChange={(event) => {
                searchControllerRef.current?.abort();
                setQuery(event.target.value);
              }}
              placeholder="Search by name or username"
              value={query}
            />
            <button
              className="inline-flex size-10 items-center justify-center rounded-md bg-slate-950 text-white disabled:opacity-70"
              disabled={isBusy}
              type="submit"
              title="Search"
            >
              <Search className="size-4" />
            </button>
          </form>
          <div className="mt-3 space-y-2">
            {users.map((user) => (
              <button
                className={`flex w-full min-w-0 items-center gap-2 rounded-md border p-2 text-left ${
                  selectedUser?.id === user.id
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
                key={user.id}
                onClick={() => setSelectedUser(user)}
                type="button"
              >
                <UserAvatar
                  avatarUrl={user.avatarUrl}
                  name={user.name}
                  size="sm"
                />
                <span className="min-w-0 truncate text-sm font-semibold text-slate-900">
                  {user.name}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 min-[360px]:flex-row">
            <div className="relative min-w-0 flex-1">
              <RoleBadge role="VIEWER" size="md" />
            </div>
            <button
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-70"
              disabled={isBusy}
              onClick={() => void handleInvite()}
              type="button"
            >
              <UserPlus className="size-4" />
              Invite
            </button>
          </div>
          {message ? (
            <p className="mt-2 text-xs font-medium text-slate-500">{message}</p>
          ) : null}
        </div>
      ) : null}

      {canInvite && !canRevoke ? (
        <p className="mt-3 text-xs text-slate-500">
          Only the team owner can revoke pending invites.
        </p>
      ) : null}
      <div className="mt-4 space-y-2">
        {pendingInvites.map((invite) => (
          <div
            className="flex min-w-0 items-center justify-between rounded-md border border-slate-200 bg-white p-3"
            key={invite.id}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                {invite.inviteeUser?.name ?? "Invited user"}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <RoleBadge role={invite.role} size="sm" />
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">
                  {formatEnum(invite.status)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Sent {formatInviteDate(invite.createdAt)}
                {invite.expiresAt
                  ? ` · Expires ${formatInviteDate(invite.expiresAt)}`
                  : ""}
              </p>
              {invite.message ? (
                <p className="mt-1 break-words text-xs text-slate-600">
                  {invite.message}
                </p>
              ) : null}
            </div>
            {canRevoke ? (
              <button
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50 disabled:opacity-60"
                disabled={
                  revokingInviteId !== null ||
                  isInviteExpired(invite, currentTime)
                }
                onClick={() => void handleRevoke(invite.id)}
                title="Revoke invite"
                type="button"
              >
                {revokingInviteId === invite.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <X className="size-3.5" />
                )}
              </button>
            ) : null}
          </div>
        ))}
        {pendingInvites.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 p-4 text-center">
            <UserPlus className="mx-auto size-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-500">
              No pending invites
            </p>
            {canInvite ? (
              <p className="mt-0.5 text-xs text-slate-400">
                Search for a user above to send an invite.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {expiredInvites.length > 0 ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-100/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-slate-700">
              Expired invites
            </h4>
            <span className="rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">
              No actions available
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {expiredInvites.map((invite) => (
              <article
                className="rounded-md border border-slate-200 bg-white p-3"
                key={invite.id}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {invite.inviteeUser?.name ?? "Invited user"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <RoleBadge role={invite.role} size="sm" />
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        Expired
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    Sent {formatInviteDate(invite.createdAt)}
                  </span>
                </div>
                {invite.message ? (
                  <p className="mt-2 break-words text-sm text-slate-600">
                    {invite.message}
                  </p>
                ) : null}
                {invite.expiresAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Expired {formatInviteDate(invite.expiresAt)}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    Expiry date unavailable
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

interface JoinRequestsPanelProps {
  accessToken: string;
  canManage: boolean;
  joinRequests: TeamJoinRequestData[];
  onChanged: () => void | Promise<void>;
  onReviewed: (request: TeamJoinRequestData) => void;
  teamId: string;
}

function JoinRequestsPanel({
  accessToken,
  canManage,
  joinRequests,
  onChanged,
  onReviewed,
  teamId,
}: JoinRequestsPanelProps) {
  const [pendingReviews, setPendingReviews] = useState<
    Record<string, "approve" | "reject">
  >({});
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const reviewLocksRef = useRef(new Set<string>());
  const refreshLockRef = useRef(false);
  const isActiveRef = useRef(true);

  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
    };
  }, []);

  const pendingRequests = joinRequests.filter(
    (request) => request.status === "PENDING",
  );

  async function review(requestId: string, action: "approve" | "reject") {
    const request = pendingRequests.find((item) => item.id === requestId);
    if (
      !canManage ||
      !request ||
      reviewLocksRef.current.has(requestId) ||
      refreshLockRef.current ||
      refreshError !== null
    ) {
      return;
    }

    reviewLocksRef.current.add(requestId);
    setPendingReviews((current) => ({ ...current, [requestId]: action }));
    setReviewErrors((current) => ({ ...current, [requestId]: "" }));
    let confirmed = false;

    try {
      const response =
        action === "approve"
          ? await approveJoinRequest(accessToken, teamId, requestId)
          : await rejectJoinRequest(accessToken, teamId, requestId);
      if (!isActiveRef.current) return;
      confirmed = true;
      onReviewed(response.data.joinRequest);
    } catch (error) {
      if (!isActiveRef.current) return;
      setReviewErrors((current) => ({
        ...current,
        [requestId]: `${request.user.name}: ${getErrorMessage(error)}`,
      }));
    }

    /* Refresh even after failure so a committed change with a lost response is reconciled. */
    try {
      if (!isActiveRef.current) return;
      await onChanged();
    } catch (error) {
      if (!isActiveRef.current) return;
      setRefreshError(
        `${confirmed ? "Request updated, but" : "After this attempt,"} team details could not refresh. ${getErrorMessage(error)} Refresh before trying another action.`,
      );
    } finally {
      if (isActiveRef.current) {
        reviewLocksRef.current.delete(requestId);
        setPendingReviews((current) => {
          const next = { ...current };
          delete next[requestId];
          return next;
        });
      }
    }
  }

  async function refreshRequests() {
    if (refreshLockRef.current || reviewLocksRef.current.size > 0) return;
    refreshLockRef.current = true;
    setIsRefreshing(true);
    try {
      await onChanged();
      if (isActiveRef.current) setRefreshError(null);
    } catch (error) {
      if (isActiveRef.current) setRefreshError(getErrorMessage(error));
    } finally {
      refreshLockRef.current = false;
      if (isActiveRef.current) setIsRefreshing(false);
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-950">
          Join requests
        </h3>
        <Shield className="size-5 text-slate-400" />
      </div>
      {Object.entries(reviewErrors).map(([requestId, error]) =>
        error ? (
          <p
            className="mt-3 text-sm font-medium text-rose-600"
            key={requestId}
            role="alert"
          >
            {error}
          </p>
        ) : null,
      )}
      {refreshError ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-rose-600" role="alert">
            {refreshError}
          </p>
          <button
            className="text-sm font-semibold text-emerald-700 disabled:opacity-60"
            disabled={isRefreshing || Object.keys(pendingReviews).length > 0}
            onClick={() => void refreshRequests()}
            type="button"
          >
            {isRefreshing ? "Refreshing requests..." : "Refresh requests"}
          </button>
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {pendingRequests.map((request) => (
          <article
            className="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-3"
            key={request.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar
                avatarUrl={request.user.avatarUrl}
                name={request.user.name}
                size="sm"
              />
              <div className="min-w-0">
                <h4 className="truncate text-sm font-semibold text-slate-950">
                  {request.user.name}
                </h4>
                <p className="truncate text-xs text-slate-500">
                  {request.message ?? "Wants to join this team"}
                </p>
              </div>
            </div>
            {canManage ? (
              <div className="mt-3 flex flex-col gap-2 min-[360px]:flex-row">
                <button
                  className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                  disabled={
                    !!pendingReviews[request.id] ||
                    isRefreshing ||
                    refreshError !== null
                  }
                  onClick={() => void review(request.id, "approve")}
                  type="button"
                >
                  {pendingReviews[request.id] === "approve" ? (
                    <Loader2
                      aria-label="Approving request"
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Approve
                </button>
                <button
                  className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                  disabled={
                    !!pendingReviews[request.id] ||
                    isRefreshing ||
                    refreshError !== null
                  }
                  onClick={() => void review(request.id, "reject")}
                  type="button"
                >
                  {pendingReviews[request.id] === "reject" ? (
                    <Loader2
                      aria-label="Rejecting request"
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <X className="size-4" />
                  )}
                  Reject
                </button>
              </div>
            ) : null}
          </article>
        ))}
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-slate-500">No pending join requests.</p>
        ) : null}
      </div>
    </section>
  );
}

interface TextFieldProps {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}

function TextField({ disabled, label, onChange, value }: TextFieldProps) {
  return (
    <label className="block min-w-0 text-sm font-semibold text-slate-800">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-500"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

interface SelectFieldProps {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}

function SelectField({
  disabled,
  label,
  onChange,
  options,
  value,
}: SelectFieldProps) {
  return (
    <label className="block min-w-0 text-xs font-semibold text-slate-500">
      {label}
      <select
        className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100 disabled:bg-slate-50"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatEnum(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
      {formatEnum(value)}
    </span>
  );
}

interface EmptyStateProps {
  actionLabel?: string;
  icon: React.ReactNode;
  onAction?: () => void;
  text: string;
  title: string;
}

function EmptyState({
  actionLabel,
  icon,
  onAction,
  text,
  title,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-96 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div>
        <div className="mx-auto flex size-11 items-center justify-center rounded-md bg-white text-slate-500">
          {icon}
        </div>
        <h3 className="mt-3 text-base font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>
        {actionLabel && onAction ? (
          <button
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
            onClick={onAction}
            type="button"
          >
            <Plus className="size-4" />
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isInviteExpired(invite: TeamInviteData, now = Date.now()) {
  return (
    invite.status === "EXPIRED" ||
    (invite.status === "PENDING" &&
      (invite.expiresAt === null ||
        new Date(invite.expiresAt).getTime() <= now))
  );
}

function formatInviteDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
