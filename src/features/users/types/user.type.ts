import type { UpdateCurrentUserFormValues } from "../schemas/user.schema";

export type UserRole = "USER";
export type UserStatus = "PENDING" | "ACTIVE" | "DISABLED" | "SUSPENDED";

export interface UserProfileData {
  headline: string | null;
  location: string | null;
  websiteUrl: string | null;
  company: string | null;
  phoneNumber: string | null;
  locale: string | null;
}

export interface CurrentUserData {
  id: string;
  email: string;
  username: string | null;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  bio: string | null;
  timezone: string | null;
  isEmailVerified: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile: UserProfileData | null;
}

export interface PublicUserData {
  id: string;
  username: string | null;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  lastSeenAt: string | null;
  profile: Pick<UserProfileData, "headline" | "location" | "company"> | null;
}

export interface CurrentUserResponseData {
  user: CurrentUserData;
}

export interface PublicUserResponseData {
  user: PublicUserData;
}

export interface SearchUsersResponseData {
  users: PublicUserData[];
}

export type UpdateCurrentUserPayload = UpdateCurrentUserFormValues;
