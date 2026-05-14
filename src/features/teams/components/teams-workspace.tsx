"use client";

import {
  Check,
  Crown,
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
import { useEffect, useMemo, useState } from "react";
import { searchUsers } from "@/features/users/api/users.api";
import { UserAvatar } from "@/features/users/components/user-avatar";
import type { PublicUserData } from "@/features/users/types/user.type";
import { getErrorMessage } from "@/lib/http/get-error-message";
import {
  acceptTeamInvite,
  approveJoinRequest,
  createTeam,
  createTeamInvite,
  deleteTeam,
  getTeam,
  listReceivedTeamInvites,
  listTeamInvites,
  listTeamJoinRequests,
  listTeams,
  removeTeamMember,
  rejectTeamInvite,
  rejectJoinRequest,
  updateTeam,
  updateTeamMember,
} from "../api/teams.api";
import type {
  TeamDetailData,
  TeamInviteData,
  TeamJoinPolicy,
  TeamJoinRequestData,
  TeamMemberData,
  TeamMemberRole,
  TeamSummaryData,
  TeamVisibility,
} from "../types/team.type";

interface TeamsWorkspaceProps {
  accessToken: string;
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
const editableMemberRoles: Exclude<TeamMemberRole, "OWNER">[] = [
  "EDITOR",
  "VIEWER",
];

export function TeamsWorkspace({ accessToken }: TeamsWorkspaceProps) {
  const [status, setStatus] = useState<TeamLoadStatus>("idle");
  const [teams, setTeams] = useState<TeamSummaryData[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamDetailData | null>(null);
  const [receivedInvites, setReceivedInvites] = useState<TeamInviteData[]>([]);
  const [invites, setInvites] = useState<TeamInviteData[]>([]);
  const [joinRequests, setJoinRequests] = useState<TeamJoinRequestData[]>([]);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canEditTeamSettings = selectedTeam?.currentUserRole === "OWNER";
  const canInviteMembers =
    selectedTeam?.currentUserRole === "OWNER" ||
    selectedTeam?.currentUserRole === "EDITOR";
  const canManageMembers = selectedTeam?.currentUserRole === "OWNER";

  useEffect(() => {
    void loadTeams();
    void loadReceivedInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (!selectedTeamId) {
      return;
    }

    void loadTeamDetail(selectedTeamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId]);

  async function loadTeams() {
    setStatus("loading");
    setMessage(null);

    try {
      const response = await listTeams(accessToken);
      setTeams(response.data.teams);
      setSelectedTeamId(
        (current) => current ?? response.data.teams[0]?.id ?? null,
      );
      setStatus("ready");
    } catch (error) {
      setMessage(getErrorMessage(error));
      setStatus("error");
    }
  }

  async function loadReceivedInvites() {
    try {
      const response = await listReceivedTeamInvites(accessToken);
      setReceivedInvites(response.data.invites);
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  async function loadTeamDetail(teamId: string) {
    setMessage(null);

    try {
      const teamResponse = await getTeam(accessToken, teamId);
      const role = teamResponse.data.team.currentUserRole;
      const canLoadManagementData = role === "OWNER" || role === "EDITOR";
      const [invitesResponse, requestsResponse] = canLoadManagementData
        ? await Promise.all([
            listTeamInvites(accessToken, teamId),
            listTeamJoinRequests(accessToken, teamId),
          ])
        : [null, null];

      setSelectedTeam(teamResponse.data.team);
      setInvites(invitesResponse?.data.invites ?? []);
      setJoinRequests(requestsResponse?.data.joinRequests ?? []);
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  async function handleTeamCreated(team: TeamDetailData) {
    await loadTeams();
    setSelectedTeamId(team.id);
    setIsCreateTeamOpen(false);
  }

  async function handleTeamUpdated(team: TeamDetailData) {
    setSelectedTeam(team);
    setTeams((currentTeams) =>
      currentTeams.map((item) => (item.id === team.id ? team : item)),
    );
  }

  async function handleTeamDeleted() {
    setSelectedTeam(null);
    setSelectedTeamId(null);
    await loadTeams();
  }

  async function refreshSelectedTeam() {
    await loadReceivedInvites();

    if (!selectedTeamId) {
      await loadTeams();
      return;
    }

    await loadTeamDetail(selectedTeamId);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
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
        invites={receivedInvites}
        onChanged={async () => {
          await loadReceivedInvites();
          await loadTeams();
        }}
      />

      <div className="grid min-h-[34rem] gap-0 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 p-4 lg:border-b-0 lg:border-r">
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            onClick={refreshSelectedTeam}
            type="button"
          >
            <RefreshCcw className="size-4" />
            Refresh teams
          </button>
          <TeamList
            isLoading={status === "loading"}
            onSelect={setSelectedTeamId}
            onCreate={() => setIsCreateTeamOpen(true)}
            selectedTeamId={selectedTeamId}
            teams={teams}
          />
        </aside>

        <div className="min-w-0 p-5">
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
            <div className="space-y-5">
              <TeamOverview
                accessToken={accessToken}
                canEdit={canEditTeamSettings}
                canDelete={canManageMembers}
                key={selectedTeam.id}
                onDeleted={handleTeamDeleted}
                onUpdated={handleTeamUpdated}
                team={selectedTeam}
              />
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <TeamMembersPanel
                  accessToken={accessToken}
                  canManage={canManageMembers}
                  members={selectedTeam.members}
                  onMembersChanged={(members) =>
                    setSelectedTeam((team) =>
                      team ? { ...team, members } : team,
                    )
                  }
                  teamId={selectedTeam.id}
                />
                <TeamInvitePanel
                  accessToken={accessToken}
                  canInvite={canInviteMembers}
                  invites={invites}
                  onInviteCreated={(invite) =>
                    setInvites((current) => [invite, ...current])
                  }
                  teamId={selectedTeam.id}
                />
              </div>
              <JoinRequestsPanel
                accessToken={accessToken}
                canManage={canManageMembers}
                joinRequests={joinRequests}
                onChanged={refreshSelectedTeam}
                teamId={selectedTeam.id}
              />
            </div>
          ) : (
            <EmptyState
              actionLabel="Create team"
              icon={<Plus className="size-5" />}
              onAction={() => setIsCreateTeamOpen(true)}
              title="Create your first team"
              text="Teams bring tasks, members, chat, and future calls into one workspace."
            />
          )}
        </div>
      </div>

      <CreateTeamDialog
        accessToken={accessToken}
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onCreated={handleTeamCreated}
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
  invites: TeamInviteData[];
  onChanged: () => void | Promise<void>;
}

function ReceivedInvitesPanel({
  accessToken,
  invites,
  onChanged,
}: ReceivedInvitesPanelProps) {
  const pendingInvites = invites.filter(
    (invite) => invite.status === "PENDING",
  );
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function respond(inviteId: string, action: "accept" | "reject") {
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

  if (pendingInvites.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-slate-200 bg-emerald-50/60 px-5 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            Pending team invites
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Review invites before they become active memberships.
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
            <div className="mt-3 flex gap-2">
              <button
                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-70"
                disabled={busyInviteId === invite.id}
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
                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-70"
                disabled={busyInviteId === invite.id}
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
  const [avatarUrl, setAvatarUrl] = useState("");
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
        avatarUrl: avatarUrl.trim() || null,
        visibility,
        joinPolicy,
      });
      setName("");
      setDescription("");
      setAvatarUrl("");
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
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
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

        <div className="space-y-4 px-5 py-5">
          <TextField
            label="Team name"
            onChange={setName}
            value={name}
          />
          <label className="block text-sm font-semibold text-slate-800">
            Description
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this team will coordinate"
              value={description}
            />
          </label>
          <TextField
            label="Avatar URL"
            onChange={setAvatarUrl}
            value={avatarUrl}
          />
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

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
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
          className={`w-full rounded-md border px-3 py-3 text-left transition ${
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
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <form
      className="rounded-lg border border-slate-200 p-4"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-700">/{team.slug}</p>
          <h3 className="mt-1 truncate text-2xl font-semibold text-slate-950">
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

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <TextField
          disabled={!canEdit}
          label="Team name"
          onChange={setName}
          value={name}
        />
        <div className="grid grid-cols-2 gap-2">
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
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{message}</p>
        <div className="flex flex-wrap justify-end gap-2">
          {canDelete ? (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
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
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
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
  members: TeamMemberData[];
  onMembersChanged: (members: TeamMemberData[]) => void;
  teamId: string;
}

function TeamMembersPanel({
  accessToken,
  canManage,
  members,
  onMembersChanged,
  teamId,
}: TeamMembersPanelProps) {
  async function handleRoleChange(memberId: string, role: "EDITOR" | "VIEWER") {
    const response = await updateTeamMember(accessToken, teamId, memberId, {
      role,
    });
    onMembersChanged(response.data.members);
  }

  async function handleRemove(memberId: string) {
    const response = await removeTeamMember(accessToken, teamId, memberId);
    onMembersChanged(response.data.members);
  }

  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-950">Members</h3>
        <UsersRound className="size-5 text-slate-400" />
      </div>
      <div className="mt-4 space-y-3">
        {members.map((member) => (
          <article
            className="flex flex-col gap-3 rounded-md bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
            key={member.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar
                avatarUrl={member.user.avatarUrl}
                name={member.user.name}
                size="sm"
              />
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
            <div className="flex items-center gap-2">
              {canManage && member.role !== "OWNER" ? (
                <select
                  className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
                  onChange={(event) =>
                    void handleRoleChange(
                      member.id,
                      event.target.value as "EDITOR" | "VIEWER",
                    )
                  }
                  value={member.role}
                >
                  {editableMemberRoles.map((role) => (
                    <option key={role} value={role}>
                      {formatEnum(role)}
                    </option>
                  ))}
                </select>
              ) : (
                <RoleBadge role={member.role} />
              )}
              {canManage && member.role !== "OWNER" ? (
                <button
                  className="inline-flex size-9 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                  onClick={() => void handleRemove(member.id)}
                  title="Remove member"
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

interface TeamInvitePanelProps {
  accessToken: string;
  canInvite: boolean;
  invites: TeamInviteData[];
  onInviteCreated: (invite: TeamInviteData) => void;
  teamId: string;
}

function TeamInvitePanel({
  accessToken,
  canInvite,
  invites,
  onInviteCreated,
  teamId,
}: TeamInvitePanelProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<PublicUserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<PublicUserData | null>(null);
  const [role, setRole] = useState<Exclude<TeamMemberRole, "OWNER">>("VIEWER");
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (query.trim().length < 2) {
      setMessage("Type at least 2 characters.");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const response = await searchUsers({
        accessToken,
        query,
        limit: 5,
      });
      setUsers(response.data.users);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsBusy(false);
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
        role,
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

  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === "PENDING"),
    [invites],
  );

  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-950">Invites</h3>
        <UserPlus className="size-5 text-slate-400" />
      </div>

      {canInvite ? (
        <div className="mt-4 rounded-md bg-slate-50 p-3">
          <form className="flex gap-2" onSubmit={handleSearch}>
            <input
              className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search user"
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
                className={`flex w-full items-center gap-2 rounded-md border p-2 text-left ${
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
          <div className="mt-3 flex gap-2">
            <select
              className="h-10 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
              onChange={(event) =>
                setRole(event.target.value as Exclude<TeamMemberRole, "OWNER">)
              }
              value={role}
            >
              {editableMemberRoles.map((option) => (
                <option key={option} value={option}>
                  {formatEnum(option)}
                </option>
              ))}
            </select>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-70"
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

      <div className="mt-4 space-y-2">
        {pendingInvites.map((invite) => (
          <div
            className="rounded-md border border-slate-200 bg-white p-3"
            key={invite.id}
          >
            <p className="truncate text-sm font-semibold text-slate-950">
              {invite.inviteeUser?.name ?? "Invited user"}
            </p>
            <p className="text-xs text-slate-500">
              {formatEnum(invite.role)} · {formatEnum(invite.status)}
            </p>
          </div>
        ))}
        {pendingInvites.length === 0 ? (
          <p className="text-sm text-slate-500">No pending invites.</p>
        ) : null}
      </div>
    </section>
  );
}

interface JoinRequestsPanelProps {
  accessToken: string;
  canManage: boolean;
  joinRequests: TeamJoinRequestData[];
  onChanged: () => void | Promise<void>;
  teamId: string;
}

function JoinRequestsPanel({
  accessToken,
  canManage,
  joinRequests,
  onChanged,
  teamId,
}: JoinRequestsPanelProps) {
  const pendingRequests = joinRequests.filter(
    (request) => request.status === "PENDING",
  );

  async function review(requestId: string, action: "approve" | "reject") {
    if (action === "approve") {
      await approveJoinRequest(accessToken, teamId, requestId);
    } else {
      await rejectJoinRequest(accessToken, teamId, requestId);
    }

    await onChanged();
  }

  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-950">
          Join requests
        </h3>
        <Shield className="size-5 text-slate-400" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {pendingRequests.map((request) => (
          <article
            className="rounded-md border border-slate-200 bg-slate-50 p-3"
            key={request.id}
          >
            <div className="flex items-center gap-3">
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
              <div className="mt-3 flex gap-2">
                <button
                  className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800"
                  onClick={() => void review(request.id, "approve")}
                  type="button"
                >
                  <Check className="size-4" />
                  Approve
                </button>
                <button
                  className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  onClick={() => void review(request.id, "reject")}
                  type="button"
                >
                  <X className="size-4" />
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
    <label className="block text-sm font-semibold text-slate-800">
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
    <label className="block text-xs font-semibold text-slate-500">
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

function RoleBadge({ role }: { role: TeamMemberRole }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
      {role === "OWNER" ? <Crown className="size-3" /> : null}
      {formatEnum(role)}
    </span>
  );
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
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

function EmptyState({ actionLabel, icon, onAction, text, title }: EmptyStateProps) {
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
