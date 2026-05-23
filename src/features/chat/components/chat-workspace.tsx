"use client";

import { MessageCircle, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/lib/http/get-error-message";
import { listDirectChats } from "../api/chat.api";
import type { DirectChatSummaryData, PageInfoData } from "../types/chat.type";
import { ChatRequestPanel } from "./chat-request-panel";
import { DirectChatList } from "./direct-chat-list";
import { MessageWindow } from "./message-window";
import { UserBlocksPanel } from "./user-blocks-panel";

// ── Types ──

interface ChatWorkspaceProps {
  accessToken: string;
  currentUserId: string;
  isUserOnline: (userId: string) => boolean;
}

type ActiveView = "list" | "chat";

// ── Component ──

export function ChatWorkspace({ accessToken, currentUserId, isUserOnline }: ChatWorkspaceProps) {
  const [chats, setChats] = useState<DirectChatSummaryData[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("list");
  const [message, setMessage] = useState<string | null>(null);
  const loadRef = useRef(false);

  useEffect(() => {
    if (loadRef.current) return;
    loadRef.current = true;
    loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function loadChats(
    params: { append?: boolean; cursor?: string | null } = {},
  ) {
    if (!params.append) {
      setIsLoading(true);
    }

    try {
      const response = await listDirectChats(accessToken, {
        cursor: params.cursor,
        limit: 20,
      });
      setChats((current) =>
        params.append ? [...current, ...response.data.chats] : response.data.chats,
      );
      setPageInfo(response.data.pageInfo ?? null);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  function handleChatCreated() {
    // Reload chats to find the new one
    loadChats();
  }

  function handleSelectChat(chatId: string) {
    setSelectedChatId(chatId);
    setActiveView("chat");
  }

  function handleBack() {
    setActiveView("list");
    setSelectedChatId(null);
  }

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <MessageSquare className="size-4" />
              {selectedChatId && activeView === "chat" ? "Direct Chat" : "Messages"}
            </div>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {selectedChatId && activeView === "chat"
                ? selectedChat?.participant.name ?? "Chat"
                : "Connect & Collaborate"}
            </h2>
          </div>
          {message ? (
            <span className="text-xs font-medium text-rose-600">{message}</span>
          ) : null}
        </div>
      </div>

      {/* Content */}
      {activeView === "chat" && selectedChat ? (
        // Message Window View (mobile: full width, desktop: inside grid)
        <div className="lg:hidden">
          <MessageWindow
            accessToken={accessToken}
            chatId={selectedChat.id}
            currentUserId={currentUserId}
            participantName={selectedChat.participant.name}
            participantAvatar={selectedChat.participant.avatarUrl}
            participantId={selectedChat.participant.id}
            isUserOnline={isUserOnline}
            onBack={handleBack}
            onError={setMessage}
          />
        </div>
      ) : null}

      {/* Desktop: Grid layout */}
      <div className={`${activeView === "chat" ? "hidden lg:grid" : "grid"} min-w-0 gap-0 lg:grid-cols-[minmax(0,1fr)_2fr]`}>
        {/* Left Sidebar */}
        <aside className="min-w-0 space-y-4 border-r border-slate-200 p-3 sm:p-4">
          <DirectChatList
            chats={chats}
            hasMore={pageInfo?.hasNextPage ?? false}
            isLoading={isLoading}
            isRequestsLoading={false}
            selectedChatId={selectedChatId}
            isUserOnline={isUserOnline}
            onLoadMore={() =>
              loadChats({ append: true, cursor: pageInfo?.nextCursor })
            }
            onRefresh={() => loadChats()}
            onSelect={handleSelectChat}
          />
          <UserBlocksPanel accessToken={accessToken} onError={setMessage} />
        </aside>

        {/* Right Content */}
        <div className="min-w-0">
          {activeView === "chat" && selectedChat ? (
            <MessageWindow
              accessToken={accessToken}
              chatId={selectedChat.id}
              currentUserId={currentUserId}            participantName={selectedChat.participant.name}
            participantAvatar={selectedChat.participant.avatarUrl}
            participantId={selectedChat.participant.id}
            isUserOnline={isUserOnline}
            onBack={handleBack}
            onError={setMessage}
          />
          ) : (
            <div className="flex min-h-136 items-center justify-center p-6">
              <div className="text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50">
                  <MessageCircle className="size-7 text-emerald-500" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">
                  Select a conversation
                </h3>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  Choose a chat from the left to view messages, or send a new chat request to start a conversation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Request Panel */}
      <div className="border-t border-slate-200 p-3 sm:p-4">
        <ChatRequestPanel
          accessToken={accessToken}
          onChatCreated={handleChatCreated}
          onError={setMessage}
        />
      </div>
    </section>
  );
}
