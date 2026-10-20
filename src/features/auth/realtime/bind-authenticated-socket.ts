import type { Socket } from "socket.io-client";
import { refreshAccessToken } from "../api/refresh-session";
import { clearAuthTokens, getAccessToken, getAuthSessionVersion, subscribeToAuthTokenChanges } from "../utils/auth-storage";
import { AUTH_SOCKET, authSocketEndedSchema } from "./auth-socket.contract";

/**
 * Every authenticated socket follows logout/rotation, including sockets on
 * pages without dashboard state. Events from an earlier login must never
 * clear or reconnect a different account's session.
 */
export function bindAuthenticatedSocket(socket: Socket, initialToken: string): () => void {
  if (getAccessToken() !== initialToken) {
    socket.disconnect();
    return () => {};
  }
  const version = getAuthSessionVersion();
  let token = initialToken;
  let disposed = false;
  let refreshing = false;
  let retryTimer: number | undefined;
  const retryConnection = () => {
    if (disposed || getAuthSessionVersion() !== version || getAccessToken() !== token) return;
    window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => {
      if (!disposed && getAuthSessionVersion() === version && getAccessToken() === token) {
        socket.auth = { token: `Bearer ${token}` };
        socket.connect();
      }
    }, AUTH_SOCKET.RETRY_DELAY_MS);
  };
  const unsubscribe = subscribeToAuthTokenChanges((nextToken) => {
    if (!nextToken || getAuthSessionVersion() !== version) {
      window.clearTimeout(retryTimer);
      socket.disconnect();
      return;
    }
    if (nextToken !== token) {
      token = nextToken;
      socket.auth = { token: `Bearer ${nextToken}` };
      socket.disconnect();
      socket.connect();
    }
  });
  const ended = (event: unknown) => {
    if (disposed || getAuthSessionVersion() !== version) return;
    const parsed = authSocketEndedSchema.safeParse(event);
    if (!parsed.success) return;
    const { reason } = parsed.data;
    if (reason === AUTH_SOCKET.END_REASON.REVOKED) {
      clearAuthTokens();
      return;
    }
    if (reason === AUTH_SOCKET.END_REASON.UNAVAILABLE) {
      retryConnection();
      return;
    }
    if (reason !== AUTH_SOCKET.END_REASON.EXPIRED || refreshing) return;
    refreshing = true;
    void refreshAccessToken(token, version).then((fresh) => {
      if (!disposed && fresh && getAuthSessionVersion() === version && getAccessToken() === fresh) {
        token = fresh;
        socket.auth = { token: `Bearer ${fresh}` };
        socket.connect();
      }
    }).catch(() => {
      /**
       * Network/server failures retain recoverable credentials. A later
       * page/API request can retry through the normal authentication path.
       */
      retryConnection();
    }).finally(() => { refreshing = false; });
  };
  socket.on(AUTH_SOCKET.ENDED_EVENT, ended);
  return () => {
    disposed = true;
    window.clearTimeout(retryTimer);
    unsubscribe();
    socket.off(AUTH_SOCKET.ENDED_EVENT, ended);
  };
}
