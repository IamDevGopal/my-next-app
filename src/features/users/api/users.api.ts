import { apiRequest } from "@/lib/http/api-client";
import type {
  CurrentUserResponseData,
  PublicUserResponseData,
  SearchUsersResponseData,
  UpdateCurrentUserPayload,
} from "../types/user.type";

const USERS_READ_TIMEOUT_MS = 10_000;
const USERS_PROFILE_WRITE_TIMEOUT_MS = 20_000;
const USERS_AVATAR_WRITE_TIMEOUT_MS = 45_000;

type UsersRequestOptions = {
  accessToken: string;
  method: "GET" | "PATCH" | "POST" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

export class UsersRequestTimeoutError extends Error {
  constructor(readonly outcomeMayBeUnknown: boolean) {
    super(
      outcomeMayBeUnknown
        ? "Request timed out. The server may still complete this change; reload the profile before retrying."
        : "Request timed out. Please try again.",
    );
    this.name = "UsersRequestTimeoutError";
  }
}

export class UsersRequestCancelledError extends Error {
  constructor() {
    super("Request was cancelled.");
    this.name = "UsersRequestCancelledError";
  }
}

function requestUsersApi<TData>(
  path: string,
  options: UsersRequestOptions,
  timeoutMs = USERS_READ_TIMEOUT_MS,
) {
  const { signal: callerSignal, ...requestOptions } = options;
  const controller = new AbortController();
  const outcomeMayBeUnknown = options.method !== "GET";
  let rejectTimeout: (error: UsersRequestTimeoutError) => void = () =>
    undefined;
  let rejectCancellation: (error: UsersRequestCancelledError) => void = () =>
    undefined;

  const timeout = new Promise<never>((_, reject) => {
    rejectTimeout = reject;
  });
  const cancellation = new Promise<never>((_, reject) => {
    rejectCancellation = reject;
  });
  const handleCallerAbort = () => {
    controller.abort();
    rejectCancellation(new UsersRequestCancelledError());
  };

  if (callerSignal?.aborted) {
    throw new UsersRequestCancelledError();
  }

  callerSignal?.addEventListener("abort", handleCallerAbort, { once: true });
  const timeoutId = setTimeout(() => {
    controller.abort();
    rejectTimeout(new UsersRequestTimeoutError(outcomeMayBeUnknown));
  }, timeoutMs);
  const request = apiRequest<TData>(path, {
    ...requestOptions,
    signal: controller.signal,
  });

  return Promise.race([request, timeout, cancellation]).finally(() => {
    clearTimeout(timeoutId);
    callerSignal?.removeEventListener("abort", handleCallerAbort);
  });
}

export function getCurrentUser(accessToken: string, signal?: AbortSignal) {
  return requestUsersApi<CurrentUserResponseData>("/users/me", {
    method: "GET",
    accessToken,
    signal,
  });
}

export function updateCurrentUser(
  accessToken: string,
  payload: UpdateCurrentUserPayload,
  signal?: AbortSignal,
) {
  return requestUsersApi<CurrentUserResponseData>(
    "/users/me",
    { method: "PATCH", accessToken, body: payload, signal },
    USERS_PROFILE_WRITE_TIMEOUT_MS,
  );
}

export function updateCurrentUserAvatar(
  accessToken: string,
  file: File,
  signal?: AbortSignal,
) {
  const body = new FormData();
  body.append("file", file);

  return requestUsersApi<CurrentUserResponseData>(
    "/users/me/avatar",
    { method: "POST", accessToken, body, signal },
    USERS_AVATAR_WRITE_TIMEOUT_MS,
  );
}

export function removeCurrentUserAvatar(
  accessToken: string,
  signal?: AbortSignal,
) {
  return requestUsersApi<CurrentUserResponseData>(
    "/users/me/avatar",
    { method: "DELETE", accessToken, signal },
    USERS_PROFILE_WRITE_TIMEOUT_MS,
  );
}

export function searchUsers(params: {
  accessToken: string;
  query: string;
  limit?: number;
  signal?: AbortSignal;
}) {
  const searchParams = new URLSearchParams({
    q: params.query,
    limit: String(params.limit ?? 8),
  });

  return requestUsersApi<SearchUsersResponseData>(
    `/users/search?${searchParams}`,
    {
      method: "GET",
      accessToken: params.accessToken,
      signal: params.signal,
    },
  );
}

export function getPublicUser(
  accessToken: string,
  userId: string,
  signal?: AbortSignal,
) {
  return requestUsersApi<PublicUserResponseData>(`/users/${userId}`, {
    method: "GET",
    accessToken,
    signal,
  });
}
