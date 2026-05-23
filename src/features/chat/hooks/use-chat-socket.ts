"use client";

import { useCallback, useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { env } from "@/config/env";
import type { MessageData, TeamChatMessageData } from "../types/chat.type";

// ── Types ──

type RoomKind = "direct" | "team";

interface ActiveRoom {
  chatId: string;
  type: RoomKind;
}

export interface NewMessageEvent {
  chatId: string;
  message: MessageData | TeamChatMessageData;
}

export interface MessageDeletedEvent {
  chatId: string;
  messageId: string;
}

export interface TypingEvent {
  chatId: string;
  userId: string;
  isTyping: boolean;
}

export interface ReadReceiptEvent {
  chatId: string;
  userId: string;
  messageIds: string[];
}

export interface NewRequestEvent {
  request: unknown;
}

export interface RequestStatusEvent {
  requestId: string;
  status: string;
}

export interface ChatSocketHandlers {
  onNewMessage?: (event: NewMessageEvent) => void;
  onMessageDeleted?: (event: MessageDeletedEvent) => void;
  onTyping?: (event: TypingEvent) => void;
  onReadReceipt?: (event: ReadReceiptEvent) => void;
  onNewRequest?: (event: NewRequestEvent) => void;
  onRequestStatus?: (event: RequestStatusEvent) => void;
  onError?: (error: { message: string }) => void;
}

interface UseChatSocketOptions {
  accessToken: string;
  handlers?: ChatSocketHandlers;
}

// ── Hook ──

export function useChatSocket({
  accessToken,
  handlers,
}: UseChatSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  const activeRoomsRef = useRef<Map<string, ActiveRoom>>(new Map());

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!accessToken) return;

    const socket: Socket = io(`${env.NEXT_PUBLIC_WS_URL}/realtime`, {
      auth: { token: `Bearer ${accessToken}` },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    const rejoinActiveRooms = () => {
      activeRoomsRef.current.forEach((room) => {
        socket.emit("chat:join", { chatId: room.chatId, type: room.type });
      });
    };

    socket.on("connect", () => {
      console.log("[ChatSocket] Connected");
      // Re-join every room we were in before the (re)connect. Critical for
      // network blips / laptop wake / idle timeouts — without this the user
      // is silently dropped from every chat room for the rest of the session.
      rejoinActiveRooms();
    });

    socket.on("disconnect", (reason) => {
      console.log("[ChatSocket] Disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("[ChatSocket] Connection error:", error.message);
    });

    // ── Event Listeners ──

    socket.on("message:new", (event: NewMessageEvent) => {
      handlersRef.current?.onNewMessage?.(event);
    });

    socket.on("message:deleted", (event: MessageDeletedEvent) => {
      handlersRef.current?.onMessageDeleted?.(event);
    });

    socket.on("chat:typing", (event: TypingEvent) => {
      handlersRef.current?.onTyping?.(event);
    });

    socket.on("chat:read", (event: ReadReceiptEvent) => {
      handlersRef.current?.onReadReceipt?.(event);
    });

    socket.on("request:new", (event: NewRequestEvent) => {
      handlersRef.current?.onNewRequest?.(event);
    });

    socket.on("request:status", (event: RequestStatusEvent) => {
      handlersRef.current?.onRequestStatus?.(event);
    });

    socket.on("error", (error: { message: string }) => {
      handlersRef.current?.onError?.(error);
    });

    socketRef.current = socket;

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  // ── Room Management ──

  const roomKey = (chatId: string, type: RoomKind) => `${type}:${chatId}`;

  const joinDirectChat = useCallback((chatId: string) => {
    activeRoomsRef.current.set(roomKey(chatId, "direct"), {
      chatId,
      type: "direct",
    });
    socketRef.current?.emit("chat:join", { chatId, type: "direct" });
  }, []);

  const leaveDirectChat = useCallback((chatId: string) => {
    activeRoomsRef.current.delete(roomKey(chatId, "direct"));
    socketRef.current?.emit("chat:leave", { chatId, type: "direct" });
  }, []);

  const joinTeamChat = useCallback((teamId: string) => {
    activeRoomsRef.current.set(roomKey(teamId, "team"), {
      chatId: teamId,
      type: "team",
    });
    socketRef.current?.emit("chat:join", { chatId: teamId, type: "team" });
  }, []);

  const leaveTeamChat = useCallback((teamId: string) => {
    activeRoomsRef.current.delete(roomKey(teamId, "team"));
    socketRef.current?.emit("chat:leave", { chatId: teamId, type: "team" });
  }, []);

  // ── Emit Actions ──

  const emitTyping = useCallback(
    (chatId: string, type: "direct" | "team", isTyping: boolean) => {
      socketRef.current?.emit("chat:typing", { chatId, type, isTyping });
    },
    [],
  );

  const emitRead = useCallback(
    (chatId: string, type: "direct" | "team", messageIds: string[]) => {
      socketRef.current?.emit("chat:read", {
        chatId,
        type,
        messageIds,
      });
    },
    [],
  );

  return {
    joinDirectChat,
    leaveDirectChat,
    joinTeamChat,
    leaveTeamChat,
    emitTyping,
    emitRead,
    socket: socketRef,
  };
}
