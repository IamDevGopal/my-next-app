import { apiRequest } from "@/lib/http/api-client";
import type {
  CreateTeamInvitePayload,
  CreateTeamPayload,
  TeamInviteResponseData,
  TeamInvitesResponseData,
  TeamJoinRequestResponseData,
  TeamJoinRequestsResponseData,
  TeamMembersResponseData,
  TeamResponseData,
  TeamsResponseData,
  UpdateTeamMemberPayload,
  UpdateTeamPayload,
} from "../types/team.type";

export function createTeam(accessToken: string, payload: CreateTeamPayload) {
  return apiRequest<TeamResponseData>("/teams", {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export function listTeams(accessToken: string, limit = 20) {
  return apiRequest<TeamsResponseData>(`/teams?limit=${limit}`, {
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

export function listTeamInvites(accessToken: string, teamId: string) {
  return apiRequest<TeamInvitesResponseData>(`/teams/${teamId}/invites`, {
    method: "GET",
    accessToken,
  });
}

export function listReceivedTeamInvites(accessToken: string) {
  return apiRequest<TeamInvitesResponseData>("/team-invites", {
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

export function listTeamJoinRequests(accessToken: string, teamId: string) {
  return apiRequest<TeamJoinRequestsResponseData>(
    `/teams/${teamId}/join-requests`,
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
