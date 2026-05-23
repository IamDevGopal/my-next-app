"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { env } from "@/config/env";

export type PresenceStatus = "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";

interface UsePresenceSocketOptions {
  accessToken: string;
  enabled?: boolean;
}

interface PresenceChangedEvent {
  userId: string;
  status: PresenceStatus;
}

interface OnlineUsersEvent {
  userIds: string[];
}

export function usePresenceSocket({
  accessToken,
  enabled = true,
}: UsePresenceSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const presenceListenersRef = useRef<Set<(event: PresenceChangedEvent) => void>>(
    new Set(),
  );

  useEffect(() => {
    if (!accessToken || !enabled) return;

    const socket: Socket = io(`${env.NEXT_PUBLIC_WS_URL}/realtime`, {
      auth: { token: `Bearer ${accessToken}` },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("presence:online_users", (event: OnlineUsersEvent) => {
      setOnlineUsers(new Set(event.userIds));
    });

    socket.on("presence:changed", (event: PresenceChangedEvent) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (event.status === "OFFLINE") {
          next.delete(event.userId);
        } else {
          next.add(event.userId);
        }
        return next;
      });

      presenceListenersRef.current.forEach((listener) => {
        listener(event);
      });
    });

    socketRef.current = socket;

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [accessToken, enabled]);

  const updateStatus = useCallback((status: PresenceStatus) => {
    socketRef.current?.emit("presence:update", { status });
  }, []);

  const setAway = useCallback(() => updateStatus("AWAY"), [updateStatus]);
  const setBusy = useCallback(() => updateStatus("BUSY"), [updateStatus]);
  const setOnline = useCallback(() => updateStatus("ONLINE"), [updateStatus]);

  const onPresenceChanged = useCallback(
    (listener: (event: PresenceChangedEvent) => void) => {
      presenceListenersRef.current.add(listener);
      return () => {
        presenceListenersRef.current.delete(listener);
      };
    },
    [],
  );

  const isUserOnline = useCallback(
    (userId: string): boolean => {
      return onlineUsers.has(userId);
    },
    [onlineUsers],
  );

  return {
    connected,
    onlineUsers,
    isUserOnline,
    updateStatus,
    setAway,
    setBusy,
    setOnline,
    onPresenceChanged,
  };
}
