import { apiRequest } from "@/lib/http/api-client";
import type {
  CurrentUserResponseData,
  PublicUserResponseData,
  SearchUsersResponseData,
  UpdateCurrentUserPayload,
} from "../types/user.type";

export function getCurrentUser(accessToken: string) {
  return apiRequest<CurrentUserResponseData>("/users/me", {
    method: "GET",
    accessToken,
  });
}

export function updateCurrentUser(
  accessToken: string,
  payload: UpdateCurrentUserPayload,
) {
  return apiRequest<CurrentUserResponseData>("/users/me", {
    method: "PATCH",
    accessToken,
    body: payload,
  });
}

export function updateCurrentUserAvatar(accessToken: string, file: File) {
  const body = new FormData();
  body.append("file", file);

  return apiRequest<CurrentUserResponseData>("/users/me/avatar", {
    method: "POST",
    accessToken,
    body,
  });
}

export function removeCurrentUserAvatar(accessToken: string) {
  return apiRequest<CurrentUserResponseData>("/users/me/avatar", {
    method: "DELETE",
    accessToken,
  });
}

export function searchUsers(params: {
  accessToken: string;
  query: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams({
    q: params.query,
    limit: String(params.limit ?? 8),
  });

  return apiRequest<SearchUsersResponseData>(`/users/search?${searchParams}`, {
    method: "GET",
    accessToken: params.accessToken,
  });
}

export function getPublicUser(accessToken: string, userId: string) {
  return apiRequest<PublicUserResponseData>(`/users/${userId}`, {
    method: "GET",
    accessToken,
  });
}
