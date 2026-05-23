"use client";

import {
  ChevronLeft,
  FileText,
  Loader2,
  Paperclip,
  SendHorizonal,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/features/users/components/user-avatar";
import { OnlineIndicator } from "@/features/presence/components/online-indicator";
import { getErrorMessage } from "@/lib/http/get-error-message";
import {
  deleteDirectMessage,
  listDirectMessages,
  markChatRead,
  sendDirectMessage,
  uploadChatAttachment,
} from "../api/chat.api";
import type { MessageData, TeamChatMessageData } from "../types/chat.type";
import { useChatSocket } from "../hooks/use-chat-socket";

// ── Types ──

interface MessageWindowProps {
  accessToken: string;
  chatId: string;
  currentUserId: string;
  participantName: string;
  participantAvatar: string | null;
  participantId: string;
  isUserOnline: (userId: string) => boolean;
  onBack: () => void;
  onError: (error: string | null) => void;
}

type LoadStatus = "loading" | "ready" | "error";

// ── Helpers ──

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Component ──

export function MessageWindow({
  accessToken,
  chatId,
  currentUserId,
  participantName,
  participantAvatar,
  participantId,
  isUserOnline,
  onBack,
  onError,
}: MessageWindowProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── WebSocket ──

  const handleNewMessage = useCallback(
    (event: { chatId: string; message: MessageData | TeamChatMessageData }) => {
      if (event.chatId === chatId) {
        const incoming = event.message as MessageData;
        // Dedup: sender's own message arrives twice — once via HTTP 201 (local
        // append in handleSubmit) and again via the server's socket echo (sender
        // is in the chat room). Drop the duplicate by id.
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          // Keep messages sorted by createdAt to defend against out-of-order delivery.
          const next = [...prev, incoming];
          next.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
          return next;
        });

        // Auto-mark as read if we're the recipient
        if (incoming.sender.id !== currentUserId) {
          markChatRead(accessToken, chatId, [incoming.id]).catch(() => {});
        }
      }
    },
    [chatId, accessToken, currentUserId],
  );

  const handleMessageDeleted = useCallback(
    (event: { chatId: string; messageId: string }) => {
      if (event.chatId === chatId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === event.messageId
              ? { ...msg, deletedAt: new Date().toISOString(), body: null }
              : msg,
          ),
        );
      }
    },
    [chatId],
  );

  const handleReadReceipt = useCallback(
    (event: { chatId: string; userId: string; messageIds: string[] }) => {
      if (event.chatId === chatId && event.userId !== currentUserId) {
        setMessages((prev) =>
          prev.map((msg) =>
            event.messageIds.includes(msg.id)
              ? { ...msg, isRead: true, readAt: new Date().toISOString() }
              : msg,
          ),
        );
      }
    },
    [chatId, currentUserId],
  );

  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTyping = useCallback(
    (event: { chatId: string; userId: string; isTyping: boolean }) => {
      if (event.chatId === chatId && event.userId !== currentUserId) {
        if (event.isTyping) {
          setTypingUserId(event.userId);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUserId(null);
          }, 3000);
        } else {
          setTypingUserId(null);
        }
      }
    },
    [chatId, currentUserId],
  );

  const { joinDirectChat, leaveDirectChat, emitTyping, emitRead } =
    useChatSocket({
      accessToken,
      handlers: {
        onNewMessage: handleNewMessage,
        onMessageDeleted: handleMessageDeleted,
        onReadReceipt: handleReadReceipt,
        onTyping: handleTyping,
      },
    });

  // Join/leave room when chatId changes
  useEffect(() => {
    if (!chatId) return;

    joinDirectChat(chatId);

    return () => {
      leaveDirectChat(chatId);
    };
  }, [chatId, joinDirectChat, leaveDirectChat]);

  // Reset state and load when chatId changes
  useEffect(() => {
    let cancelled = false;

    listDirectMessages(accessToken, chatId)
      .then((response) => {
        if (cancelled) return;
        setMessages(response.data.messages.reverse());
        setStatus("ready");

        // Mark unread messages as read
        const unreadIds = response.data.messages
          .filter((msg) => !msg.isRead && msg.sender.id !== currentUserId)
          .map((msg) => msg.id);

        if (unreadIds.length > 0) {
          markChatRead(accessToken, chatId, unreadIds).catch(() => {});
          emitRead(chatId, "direct", unreadIds);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        onError(getErrorMessage(error));
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, accessToken]);

  // Notify typing
  const [isTyping, setIsTyping] = useState(false);
  const typingEmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  function handleInputChange(value: string) {
    setInputValue(value);

    if (!isTyping && value.trim()) {
      setIsTyping(true);
      emitTyping(chatId, "direct", true);
    }

    if (typingEmitTimeoutRef.current) {
      clearTimeout(typingEmitTimeoutRef.current);
    }

    typingEmitTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        emitTyping(chatId, "direct", false);
      }
    }, 2000);
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = inputValue.trim();
    if (!text) return;

    setIsSending(true);

    try {
      const response = await sendDirectMessage(accessToken, chatId, text);
      // Dedup-safe insert: socket echo may race the HTTP response.
      setMessages((current) =>
        current.some((m) => m.id === response.data.message.id)
          ? current
          : [...current, response.data.message],
      );
      setInputValue("");
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  }

  async function handleDelete(messageId: string) {
    setDeletingId(messageId);

    try {
      await deleteDirectMessage(accessToken, chatId, messageId);
      setMessages((current) =>
        current.map((msg) =>
          msg.id === messageId ? { ...msg, deletedAt: new Date().toISOString(), body: null } : msg,
        ),
      );
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSending(true);

    try {
      const response = await uploadChatAttachment(accessToken, chatId, file);
      setMessages((current) => [...current, response.data.message]);
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setIsSending(false);
      event.target.value = "";
    }
  }

  return (
    <section className="flex min-h-136 flex-col">
      {/* Header */}
      <div className="flex min-w-0 items-center gap-3 border-b border-slate-200 px-3 py-3 sm:px-4">
        <button
          className="inline-flex size-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={onBack}
          title="Back"
          type="button"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="relative">
          <UserAvatar avatarUrl={participantAvatar} name={participantName} size="sm" />
          <div className="absolute -bottom-0.5 -right-0.5">
            <OnlineIndicator
              isOnline={isUserOnline(participantId)}
              size="sm"
            />
          </div>
        </div>
        <h3 className="truncate text-sm font-semibold text-slate-950">{participantName}</h3>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
        {status === "loading" ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-500">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMine = msg.sender.id === currentUserId;
              const isDeleted = msg.deletedAt !== null;

              return (
                <div
                  key={msg.id}
                  className={`group flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 sm:max-w-[70%] ${
                      isDeleted
                        ? "bg-slate-100 text-slate-400 italic"
                        : isMine
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-100 text-slate-950"
                    }`}
                  >
                    {isDeleted ? (
                      <p className="text-xs">This message was deleted</p>
                    ) : (
                      <>
                        {msg.messageType === "FILE" && msg.attachments.length > 0 ? (
                          <div className="space-y-2">
                            {msg.attachments.map((att) => (
                              <a
                                className={`flex items-center gap-2 rounded-md p-2 text-sm transition ${
                                  isMine ? "bg-emerald-600 hover:bg-emerald-500" : "bg-white hover:bg-slate-50"
                                }`}
                                href={att.downloadUrl}
                                key={att.id}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <FileText className="size-4 shrink-0" />
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium">{att.originalName}</p>
                                  <p className="text-xs opacity-70">{formatFileSize(att.sizeBytes)}</p>
                                </div>
                              </a>
                            ))}
                          </div>
                        ) : null}
                        {msg.body ? <p className="whitespace-pre-wrap text-sm">{msg.body}</p> : null}
                        <div className={`mt-1 flex items-center gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                          <span className={`text-[10px] ${isMine ? "text-emerald-200" : "text-slate-400"}`}>
                            {formatMessageTime(msg.createdAt)}
                          </span>
                          {isMine && !isDeleted ? (
                            <button
                              className="hidden text-[10px] text-slate-400 underline hover:text-rose-500 group-hover:inline"
                              disabled={deletingId === msg.id}
                              onClick={() => void handleDelete(msg.id)}
                              title="Delete message"
                              type="button"
                            >
                              {deletingId === msg.id ? "..." : "delete"}
                            </button>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Typing indicator */}
        {typingUserId ? (
          <div className="flex items-center gap-2 px-1 py-1">
            <div className="flex gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
            </div>
            <span className="text-xs text-slate-400 italic">
              {participantName} is typing...
            </span>
          </div>
        ) : null}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 px-3 py-3 sm:px-4">
        <form className="flex items-end gap-2" onSubmit={handleSend}>
          <div className="relative flex-1">
            <input
              className="min-h-10 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
              disabled={isSending}
              onChange={(event) => handleInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  const form = event.currentTarget.form;
                  if (form) form.requestSubmit();
                }
              }}
              placeholder="Type a message..."
              value={inputValue}
            />
            <label className="absolute bottom-1.5 right-1.5 flex size-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <Paperclip className="size-4" />
              <input
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                className="sr-only"
                disabled={isSending}
                onChange={handleFileUpload}
                type="file"
              />
            </label>
          </div>
          <button
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white transition hover:bg-emerald-800 disabled:opacity-60"
            disabled={isSending || !inputValue.trim()}
            title="Send"
            type="submit"
          >
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
          </button>
        </form>
      </div>
    </section>
  );
}
