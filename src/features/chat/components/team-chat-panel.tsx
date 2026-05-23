"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/lib/http/get-error-message";
import {
  listTeamChatMessages,
  sendTeamChatMessage,
  deleteTeamChatMessage,
  markTeamChatRead,
  uploadTeamChatAttachment,
} from "../api/team-chat.api";
import type {
  TeamChatMessageResponseData,
  TeamChatMessagesResponseData,
  TeamChatMessageData,
} from "../types/chat.type";
import { useChatSocket } from "../hooks/use-chat-socket";

// ── Helpers ──

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Props ──

interface TeamChatPanelProps {
  accessToken: string;
  teamId: string;
  teamName: string;
  currentUserId: string;
  onClose?: () => void;
}

// ── Component ──

type LoadStatus = "loading" | "ready" | "error";

interface DeletedMessage extends TeamChatMessageData {
  deletedAt: string;
}

function isDeleted(msg: TeamChatMessageData): msg is DeletedMessage {
  return msg.deletedAt !== null;
}

export function TeamChatPanel({
  accessToken,
  teamId,
  teamName,
  currentUserId,
  onClose,
}: TeamChatPanelProps) {
  const [messages, setMessages] = useState<TeamChatMessageData[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── WebSocket ──

  const handleNewTeamMessage = useCallback(
    (event: { chatId: string; message: TeamChatMessageData }) => {
      if (event.chatId === teamId) {
        // Dedup: sender's own message arrives via HTTP + socket echo.
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.message.id)) return prev;
          const next = [...prev, event.message];
          next.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
          return next;
        });
      }
    },
    [teamId],
  );

  const handleTeamMessageDeleted = useCallback(
    (event: { chatId: string; messageId: string }) => {
      if (event.chatId === teamId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === event.messageId
              ? { ...m, body: null, deletedAt: new Date().toISOString() }
              : m,
          ),
        );
      }
    },
    [teamId],
  );

  const { joinTeamChat, leaveTeamChat } = useChatSocket({
    accessToken,
    handlers: {
      onNewMessage: handleNewTeamMessage,
      onMessageDeleted: handleTeamMessageDeleted,
    },
  });

  // Join/leave team chat room when teamId changes
  useEffect(() => {
    if (!teamId) return;

    joinTeamChat(teamId);

    return () => {
      leaveTeamChat(teamId);
    };
  }, [teamId, joinTeamChat, leaveTeamChat]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const res = await listTeamChatMessages(accessToken, teamId);
      const data: TeamChatMessagesResponseData = res.data;
      setMessages(data.messages ?? []);
      setStatus("ready");

      // Mark unread messages as read
      const unreadIds = (data.messages ?? [])
        .filter((m) => m.sender.id !== currentUserId && !isDeleted(m))
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        markTeamChatRead(accessToken, teamId, unreadIds).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to load team messages:", getErrorMessage(err));
      setStatus("error");
    }
  }, [accessToken, teamId, currentUserId]);

  useEffect(() => {
    setStatus("loading"); // eslint-disable-line react-hooks/set-state-in-effect

    let cancelled = false;

    loadMessages().catch(() => {
      if (!cancelled) setStatus("error");
    });

    return () => {
      cancelled = true;
    };
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    const text = input.trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      const res = await sendTeamChatMessage(accessToken, teamId, text);
      const data: TeamChatMessageResponseData = res.data;
      setMessages((prev) =>
        prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message],
      );
      setInput("");
    } catch (err) {
      console.error("Failed to send message:", getErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    setDeletingId(messageId);
    try {
      await deleteTeamChatMessage(accessToken, teamId, messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, body: null, deletedAt: new Date().toISOString() }
            : m,
        ),
      );
    } catch (err) {
      console.error("Failed to delete message:", getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isSending) return;

    setIsSending(true);
    try {
      const res = await uploadTeamChatAttachment(accessToken, teamId, file);
      const data: TeamChatMessageResponseData = res.data;
      setMessages((prev) =>
        prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message],
      );
    } catch (err) {
      console.error("Failed to upload attachment:", getErrorMessage(err));
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-neutral-700/50 bg-neutral-850 shadow-lg">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 border-b border-neutral-700/50 px-4 py-3">
        {onClose && (
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white md:hidden"
            aria-label="Back"
          >
            <svg
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}
        <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <svg
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">
            {teamName} Chat
          </h3>
          <p className="text-xs text-neutral-500">Team conversation</p>
        </div>
      </div>

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {status === "loading" && (
          <div className="flex items-center justify-center py-12">
            <div className="size-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="mb-3 size-10 text-red-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-sm text-neutral-400">Failed to load messages</p>
            <button
              onClick={loadMessages}
              className="mt-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {status === "ready" && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="mb-3 size-12 text-neutral-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
              />
            </svg>
            <p className="text-sm font-medium text-neutral-300">
              No messages yet
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Start the conversation!
            </p>
          </div>
        )}

        {status === "ready" &&
          messages.map((msg) => {
            const isMine = msg.sender.id === currentUserId;
            const deleted = isDeleted(msg);

            return (
              <div
                key={msg.id}
                className={`group flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] space-y-1 ${
                    isMine ? "items-end" : "items-start"
                  }`}
                >
                  {/* Sender name (others only) */}
                  {!isMine && !deleted && (
                    <p className="px-1 text-[11px] font-medium text-neutral-500">
                      {msg.sender.name}
                    </p>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed transition-all ${
                      deleted
                        ? "border border-dashed border-neutral-700 bg-neutral-800/50 text-neutral-500 italic"
                        : isMine
                          ? "bg-emerald-600 text-white"
                          : "bg-neutral-700/60 text-neutral-100"
                    }`}
                  >
                    {deleted ? (
                      "This message was deleted"
                    ) : (
                      <>
                        {msg.body && <p>{msg.body}</p>}
                        {msg.attachments.length > 0 && (
                          <div className="mt-1.5 space-y-1">
                            {msg.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 rounded-lg p-2 text-xs transition-colors ${
                                  isMine
                                    ? "bg-emerald-700/50 hover:bg-emerald-700 text-emerald-100"
                                    : "bg-neutral-600/50 hover:bg-neutral-600 text-neutral-200"
                                }`}
                              >
                                <svg
                                  className="size-4 shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                                  />
                                </svg>
                                <span className="truncate">
                                  {att.originalName}
                                </span>
                                <span className="shrink-0 text-[10px] opacity-70">
                                  {formatFileSize(att.sizeBytes)}
                                </span>
                              </a>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Footer: time + delete */}
                  <div
                    className={`flex items-center gap-2 px-1 ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span className="text-[10px] text-neutral-600">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                    {isMine && !deleted && (
                      <button
                        onClick={() => handleDelete(msg.id)}
                        disabled={deletingId === msg.id}
                        className="text-[10px] text-neutral-600 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
                      >
                        {deletingId === msg.id ? "..." : "Delete"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 border-t border-neutral-700/50 p-3"
      >
        {/* File upload trigger */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-700 hover:text-neutral-200 disabled:opacity-50"
          aria-label="Attach file"
        >
          <svg
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
            />
          </svg>
        </button>

        {/* Text input */}
        <div className="relative flex-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
            className="w-full rounded-xl border border-neutral-700/50 bg-neutral-800/50 px-4 py-2.5 pr-12 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-emerald-500/50 focus:bg-neutral-800 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-emerald-600 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Send"
          >
            {isSending ? (
              <div className="size-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            ) : (
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
