"use client";

import { Loader2, MessageCircle, RefreshCcw } from "lucide-react";
import { UserAvatar } from "@/features/users/components/user-avatar";
import { OnlineIndicator } from "@/features/presence/components/online-indicator";
import type { DirectChatSummaryData } from "../types/chat.type";

// ── Types ──

interface DirectChatListProps {
  chats: DirectChatSummaryData[];
  selectedChatId: string | null;
  isLoading: boolean;
  isRequestsLoading: boolean;
  hasMore: boolean;
  isUserOnline: (userId: string) => boolean;
  onSelect: (chatId: string) => void;
  onLoadMore: () => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
}

// ── Helpers ──

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getPreview(msg: { body: string | null; messageType: string; attachments?: unknown[] } | null): string {
  if (!msg) return "No messages yet";
  if (msg.body) return msg.body;
  if (msg.messageType === "FILE") return "📎 File";
  return "";
}

// ── Component ──

export function DirectChatList({
  chats,
  selectedChatId,
  isLoading,
  isRequestsLoading,
  hasMore,
  isUserOnline,
  onSelect,
  onLoadMore,
  onRefresh,
}: DirectChatListProps) {
  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-950">Direct Messages</h3>
        <button
          className="inline-flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          disabled={isLoading || isRequestsLoading}
          onClick={() => void onRefresh()}
          title="Refresh"
          type="button"
        >
          <RefreshCcw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-3 space-y-1 max-h-96 overflow-y-auto pr-1">
        {chats.length === 0 && !isLoading ? (
          <div className="rounded-md border border-dashed border-slate-200 p-4 text-center">
            <MessageCircle className="mx-auto size-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-500">No conversations yet</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Use chat requests above to start a conversation.
            </p>
          </div>
        ) : (
          chats.map((chat) => (
            <button
              className={`flex w-full min-w-0 items-center gap-3 rounded-md border p-2.5 text-left transition ${
                selectedChatId === chat.id
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
              key={chat.id}
              onClick={() => onSelect(chat.id)}
              type="button"
            >
              <div className="relative shrink-0">
                <UserAvatar
                  avatarUrl={chat.participant.avatarUrl}
                  name={chat.participant.name}
                  size="sm"
                />
                <div className="absolute -bottom-0.5 -right-0.5">
                  <OnlineIndicator
                    isOnline={isUserOnline(chat.participant.id)}
                    size="sm"
                  />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-slate-950">
                    {chat.participant.name}
                  </p>
                  {chat.lastMessage ? (
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {formatTime(chat.lastMessage.createdAt)}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[11px] text-slate-500">
                    {getPreview(chat.lastMessage)}
                  </p>
                  {chat.unreadCount > 0 ? (
                    <span className="shrink-0 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))
        )}

        {hasMore ? (
          <button
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
            disabled={isLoading}
            onClick={() => void onLoadMore()}
            type="button"
          >
            {isLoading ? <Loader2 className="size-3 animate-spin" /> : null}
            Load more
          </button>
        ) : null}
      </div>
    </section>
  );
}
