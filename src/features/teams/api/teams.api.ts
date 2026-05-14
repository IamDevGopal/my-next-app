import { apiRequest } from "@/lib/http/api-client";
import type {
  CreateTeamInvitePayload,
  CreateTeamPayload,
  InviteStatus,
  TeamInviteResponseData,
  TeamInvitesResponseData,
  JoinRequestStatus,
  TeamDiscoveryResponseData,
  TeamJoinPolicy,
  TeamJoinRequestResponseData,
  TeamJoinRequestsResponseData,
  TeamMembersResponseData,
  TeamResponseData,
  TeamsResponseData,
  TeamVisibility,
  UpdateTeamMemberPayload,
  UpdateTeamPayload,
} from "../types/team.type";

interface CursorQuery {
  limit?: number;
  cursor?: string | null;
}

interface TeamListQuery extends CursorQuery {
  q?: string;
}

interface TeamDiscoveryQuery extends TeamListQuery {
  visibility?: Exclude<TeamVisibility, "PRIVATE">;
  joinPolicy?: TeamJoinPolicy;
}

interface TeamInviteListQuery extends CursorQuery {
  status?: InviteStatus;
}

interface TeamJoinRequestListQuery extends CursorQuery {
  status?: JoinRequestStatus;
}

function toSearchParams(query: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  return params.toString();
}

export function createTeam(accessToken: string, payload: CreateTeamPayload) {
  return apiRequest<TeamResponseData>("/teams", {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export function listTeams(accessToken: string, query: TeamListQuery = {}) {
  const params = toSearchParams({ limit: 20, ...query });

  return apiRequest<TeamsResponseData>(`/teams?${params}`, {
    method: "GET",
    accessToken,
  });
}

export function discoverTeams(
  accessToken: string,
  query: TeamDiscoveryQuery = {},
) {
  const params = toSearchParams({ limit: 10, ...query });

  return apiRequest<TeamDiscoveryResponseData>(`/teams/discover?${params}`, {
    method: "GET",
    accessToken,
  });
}

export function getTeam(accessToken: string, teamId: string) {
  return apiRequest<TeamResponseData>(`/teams/${teamId}`, {
    method: "GET",
    accessToken,
  });
}

export function updateTeam(
  accessToken: string,
  teamId: string,
  payload: UpdateTeamPayload,
) {
  return apiRequest<TeamResponseData>(`/teams/${teamId}`, {
    method: "PATCH",
    accessToken,
    body: payload,
  });
}

export function deleteTeam(accessToken: string, teamId: string) {
  return apiRequest<TeamResponseData>(`/teams/${teamId}`, {
    method: "DELETE",
    accessToken,
  });
}

export function updateTeamAvatar(
  accessToken: string,
  teamId: string,
  file: File,
) {
  const body = new FormData();
  body.append("file", file);

  return apiRequest<TeamResponseData>(`/teams/${teamId}/avatar`, {
    method: "POST",
    accessToken,
    body,
  });
}

export function removeTeamAvatar(accessToken: string, teamId: string) {
  return apiRequest<TeamResponseData>(`/teams/${teamId}/avatar`, {
    method: "DELETE",
    accessToken,
  });
}

export function listTeamMembers(accessToken: string, teamId: string) {
  return apiRequest<TeamMembersResponseData>(`/teams/${teamId}/members`, {
    method: "GET",
    accessToken,
  });
}

export function updateTeamMember(
  accessToken: string,
  teamId: string,
  memberId: string,
  payload: UpdateTeamMemberPayload,
) {
  return apiRequest<TeamMembersResponseData>(
    `/teams/${teamId}/members/${memberId}`,
    {
      method: "PATCH",
      accessToken,
      body: payload,
    },
  );
}

export function removeTeamMember(
  accessToken: string,
  teamId: string,
  memberId: string,
) {
  return apiRequest<TeamMembersResponseData>(
    `/teams/${teamId}/members/${memberId}`,
    {
      method: "DELETE",
      accessToken,
    },
  );
}

export function createTeamInvite(
  accessToken: string,
  teamId: string,
  payload: CreateTeamInvitePayload,
) {
  return apiRequest<TeamInviteResponseData>(`/teams/${teamId}/invites`, {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export function listTeamInvites(
  accessToken: string,
  teamId: string,
  query: TeamInviteListQuery = {},
) {
  const params = toSearchParams({ limit: 20, ...query });

  return apiRequest<TeamInvitesResponseData>(`/teams/${teamId}/invites?${params}`, {
    method: "GET",
    accessToken,
  });
}

export function listReceivedTeamInvites(
  accessToken: string,
  query: TeamInviteListQuery = {},
) {
  const params = toSearchParams({ limit: 20, ...query });

  return apiRequest<TeamInvitesResponseData>(`/team-invites?${params}`, {
    method: "GET",
    accessToken,
  });
}

export function acceptTeamInvite(accessToken: string, inviteId: string) {
  return apiRequest<TeamInviteResponseData>(
    `/team-invites/${inviteId}/accept`,
    {
      method: "POST",
      accessToken,
    },
  );
}

export function rejectTeamInvite(accessToken: string, inviteId: string) {
  return apiRequest<TeamInviteResponseData>(
    `/team-invites/${inviteId}/reject`,
    {
      method: "POST",
      accessToken,
    },
  );
}

export function createJoinRequest(
  accessToken: string,
  teamId: string,
  message?: string | null,
) {
  return apiRequest<TeamJoinRequestResponseData>(
    `/teams/${teamId}/join-requests`,
    {
      method: "POST",
      accessToken,
      body: { message: message ?? null },
    },
  );
}

export function listTeamJoinRequests(
  accessToken: string,
  teamId: string,
  query: TeamJoinRequestListQuery = {},
) {
  const params = toSearchParams({ limit: 20, ...query });

  return apiRequest<TeamJoinRequestsResponseData>(
    `/teams/${teamId}/join-requests?${params}`,
    {
      method: "GET",
      accessToken,
    },
  );
}

export function listMyJoinRequests(
  accessToken: string,
  query: TeamJoinRequestListQuery = {},
) {
  const params = toSearchParams({ limit: 20, ...query });

  return apiRequest<TeamJoinRequestsResponseData>(
    `/team-join-requests?${params}`,
    {
      method: "GET",
      accessToken,
    },
  );
}

export function approveJoinRequest(
  accessToken: string,
  teamId: string,
  requestId: string,
) {
  return apiRequest<TeamJoinRequestResponseData>(
    `/teams/${teamId}/join-requests/${requestId}/approve`,
    {
      method: "POST",
      accessToken,
    },
  );
}

export function rejectJoinRequest(
  accessToken: string,
  teamId: string,
  requestId: string,
) {
  return apiRequest<TeamJoinRequestResponseData>(
    `/teams/${teamId}/join-requests/${requestId}/reject`,
    {
      method: "POST",
      accessToken,
    },
  );
}
