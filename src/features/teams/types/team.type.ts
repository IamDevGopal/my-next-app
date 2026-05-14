import type { PublicUserData } from "@/features/users/types/user.type";
import type {
  CreateTeamFormValues,
  CreateTeamInviteFormValues,
  UpdateTeamFormValues,
  UpdateTeamMemberFormValues,
} from "../schemas/team.schema";

export type TeamMemberRole = "OWNER" | "EDITOR" | "VIEWER";
export type TeamStatus = "ACTIVE" | "ARCHIVED" | "DISABLED";
export type TeamVisibility = "PRIVATE" | "INTERNAL" | "PUBLIC";
export type TeamJoinPolicy =
  | "INVITE_ONLY"
  | "REQUEST_ONLY"
  | "INVITE_OR_REQUEST";
export type InviteStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "REVOKED"
  | "EXPIRED";
export type JoinRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface TeamMemberData {
  id: string;
  role: TeamMemberRole;
  joinedAt: string;
  user: PublicUserData;
}

export interface TeamSummaryData {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  visibility: TeamVisibility;
  status: TeamStatus;
  joinPolicy: TeamJoinPolicy;
  currentUserRole: TeamMemberRole;
  membersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamDetailData extends TeamSummaryData {
  owner: PublicUserData;
  members: TeamMemberData[];
}

export interface TeamInviteTeamData {
  id: string;
  name: string;
  slug: string;
}

export interface TeamInviteData {
  id: string;
  role: TeamMemberRole;
  message: string | null;
  status: InviteStatus;
  createdAt: string;
  team: TeamInviteTeamData;
  inviteeUser: PublicUserData | null;
  inviter: PublicUserData;
}

export interface TeamJoinRequestData {
  id: string;
  assignedRole: TeamMemberRole;
  message: string | null;
  status: JoinRequestStatus;
  reviewedAt: string | null;
  createdAt: string;
  user: PublicUserData;
  reviewedBy: PublicUserData | null;
}

export interface TeamResponseData {
  team: TeamDetailData;
}

export interface TeamsResponseData {
  teams: TeamSummaryData[];
}

export interface TeamMembersResponseData {
  members: TeamMemberData[];
}

export interface TeamInviteResponseData {
  invite: TeamInviteData;
}

export interface TeamInvitesResponseData {
  invites: TeamInviteData[];
}

export interface TeamJoinRequestResponseData {
  joinRequest: TeamJoinRequestData;
}

export interface TeamJoinRequestsResponseData {
  joinRequests: TeamJoinRequestData[];
}

export type CreateTeamPayload = CreateTeamFormValues;
export type UpdateTeamPayload = UpdateTeamFormValues;
export type CreateTeamInvitePayload = CreateTeamInviteFormValues;
export type UpdateTeamMemberPayload = UpdateTeamMemberFormValues;
