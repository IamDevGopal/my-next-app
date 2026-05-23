"use client";

import {
  CheckCheck,
  Loader2,
  Search,
  Send,
  UserPlus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/features/users/components/user-avatar";
import { searchUsers } from "@/features/users/api/users.api";
import type { PublicUserData } from "@/features/users/types/user.type";
import { getErrorMessage } from "@/lib/http/get-error-message";
import {
  acceptChatRequest,
  cancelChatRequest,
  listChatRequests,
  rejectChatRequest,
  sendChatRequest,
} from "../api/chat.api";
import type { ChatRequestData } from "../types/chat.type";

// ── Types ──

interface ChatRequestPanelProps {
  accessToken: string;
  onError: (error: string | null) => void;
  onChatCreated: (userId: string) => void;
}

// ── Component ──

export function ChatRequestPanel({
  accessToken,
  onError,
  onChatCreated,
}: ChatRequestPanelProps) {
  const [sentRequests, setSentRequests] = useState<ChatRequestData[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<ChatRequestData[]>([]);
  const [isLoadingSent, setIsLoadingSent] = useState(true);
  const [isLoadingReceived, setIsLoadingReceived] = useState(true);

  // New request form
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<PublicUserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<PublicUserData | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Request actions
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const loadSentRequests = useCallback(async () => {
    try {
      const response = await listChatRequests(accessToken, {
        direction: "sent",
        limit: 20,
      });
      setSentRequests(response.data.requests);
      setIsLoadingSent(false);
    } catch (error) {
      onError(getErrorMessage(error));
      setIsLoadingSent(false);
    }
  }, [accessToken, onError]);

  const loadReceivedRequests = useCallback(async () => {
    try {
      const response = await listChatRequests(accessToken, {
        direction: "received",
        limit: 20,
      });
      setReceivedRequests(response.data.requests);
      setIsLoadingReceived(false);
    } catch (error) {
      onError(getErrorMessage(error));
      setIsLoadingReceived(false);
    }
  }, [accessToken, onError]);

  // Load requests on mount. Ref guard prevents StrictMode double-invocation
  // in dev from firing duplicate API calls.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void loadSentRequests();
    void loadReceivedRequests();
  }, [loadSentRequests, loadReceivedRequests]);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (query.trim().length < 2) {
      onError("Type at least 2 characters.");
      return;
    }

    setIsSearchingUsers(true);

    try {
      const response = await searchUsers({ accessToken, query, limit: 5 });
      setUsers(response.data.users);
      setSelectedUser(null);
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setIsSearchingUsers(false);
    }
  }

  async function handleSendRequest() {
    if (!selectedUser) {
      onError("Select a user first.");
      return;
    }

    setIsSendingRequest(true);

    try {
      const response = await sendChatRequest(
        accessToken,
        selectedUser.id,
        requestMessage || null,
      );
      setSentRequests((current) => [response.data.request, ...current]);
      setSelectedUser(null);
      setUsers([]);
      setQuery("");
      setRequestMessage("");
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setIsSendingRequest(false);
    }
  }

  async function handleAccept(requestId: string) {
    setBusyRequestId(requestId);

    try {
      const response = await acceptChatRequest(accessToken, requestId);
      setReceivedRequests((current) =>
        current.map((r) => (r.id === requestId ? response.data.request : r)),
      );
      // Notify parent to open chat with this user
      onChatCreated(response.data.request.requester.id);
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setBusyRequestId(null);
    }
  }

  async function handleReject(requestId: string) {
    setBusyRequestId(requestId);

    try {
      await rejectChatRequest(accessToken, requestId);
      setReceivedRequests((current) => current.filter((r) => r.id !== requestId));
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setBusyRequestId(null);
    }
  }

  async function handleCancel(requestId: string) {
    const confirmed = window.confirm("Cancel this chat request?");
    if (!confirmed) return;

    setBusyRequestId(requestId);

    try {
      await cancelChatRequest(accessToken, requestId);
      setSentRequests((current) => current.filter((r) => r.id !== requestId));
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setBusyRequestId(null);
    }
  }

  const pendingReceived = receivedRequests.filter((r) => r.status === "PENDING");
  const pendingSent = sentRequests.filter((r) => r.status === "PENDING");

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-950">Chat Requests</h3>
        <Send className="size-5 text-slate-400" />
      </div>

      {/* Send New Request */}
      <div className="mt-4 rounded-md bg-slate-50 p-3">
        <form className="flex gap-2" onSubmit={handleSearch}>
          <input
            className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search user by name"
            value={query}
          />
          <button
            className="inline-flex size-10 items-center justify-center rounded-md bg-slate-950 text-white disabled:opacity-70"
            disabled={isSearchingUsers}
            title="Search"
            type="submit"
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
              <UserAvatar avatarUrl={user.avatarUrl} name={user.name} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                {user.username ? (
                  <p className="truncate text-xs text-slate-500">@{user.username}</p>
                ) : null}
              </div>
            </button>
          ))}
        </div>

        {selectedUser ? (
          <div className="mt-3 space-y-2">
            <textarea
              className="min-h-20 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
              onChange={(event) => setRequestMessage(event.target.value)}
              placeholder="Add a personal message (optional)"
              value={requestMessage}
            />
            <button
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-70"
              disabled={isSendingRequest}
              onClick={() => void handleSendRequest()}
              type="button"
            >
              {isSendingRequest ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              Send Request
            </button>
          </div>
        ) : null}
      </div>

      {/* Received Requests */}
      <div className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Received ({pendingReceived.length})
        </h4>
        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
          {isLoadingReceived ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-4 animate-spin text-slate-400" />
            </div>
          ) : pendingReceived.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">No pending requests</p>
          ) : (
            pendingReceived.map((req) => (
              <div
                className="flex min-w-0 items-start justify-between gap-2 rounded-md border border-slate-200 bg-white p-2"
                key={req.id}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <UserAvatar
                    avatarUrl={req.requester.avatarUrl}
                    name={req.requester.name}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-950">
                      {req.requester.name}
                    </p>
                    {req.message ? (
                      <p className="truncate text-[10px] text-slate-500">{req.message}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    className="inline-flex size-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-60"
                    disabled={busyRequestId === req.id}
                    onClick={() => void handleAccept(req.id)}
                    title="Accept"
                    type="button"
                  >
                    {busyRequestId === req.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <CheckCheck className="size-3.5" />
                    )}
                  </button>
                  <button
                    className="inline-flex size-7 items-center justify-center rounded-md bg-rose-50 text-rose-500 hover:bg-rose-100 disabled:opacity-60"
                    disabled={busyRequestId === req.id}
                    onClick={() => void handleReject(req.id)}
                    title="Reject"
                    type="button"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sent Requests */}
      <div className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Sent ({pendingSent.length})
        </h4>
        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
          {isLoadingSent ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-4 animate-spin text-slate-400" />
            </div>
          ) : pendingSent.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">No pending requests</p>
          ) : (
            pendingSent.map((req) => (
              <div
                className="flex min-w-0 items-start justify-between gap-2 rounded-md border border-slate-200 bg-white p-2"
                key={req.id}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <UserAvatar
                    avatarUrl={req.recipient.avatarUrl}
                    name={req.recipient.name}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-950">
                      {req.recipient.name}
                    </p>
                    {req.message ? (
                      <p className="truncate text-[10px] text-slate-500">{req.message}</p>
                    ) : null}
                  </div>
                </div>
                <button
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-rose-200 text-rose-500 hover:bg-rose-50 disabled:opacity-60"
                  disabled={busyRequestId === req.id}
                  onClick={() => void handleCancel(req.id)}
                  title="Cancel"
                  type="button"
                >
                  {busyRequestId === req.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
