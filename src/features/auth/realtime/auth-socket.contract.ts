import { z } from "zod";

/**
 * Wire values match the API Auth module's socket contract. These repositories
 * deploy independently, so protocol changes must remain compatible on both.
 */
export const AUTH_SOCKET = {
  ENDED_EVENT: "auth:ended",
  END_REASON: {
    EXPIRED: "expired",
    REVOKED: "revoked",
    UNAVAILABLE: "unavailable",
  },
  RETRY_DELAY_MS: 5_000,
} as const;

export const authSocketEndedSchema = z.object({
  reason: z.enum([
    AUTH_SOCKET.END_REASON.EXPIRED,
    AUTH_SOCKET.END_REASON.REVOKED,
    AUTH_SOCKET.END_REASON.UNAVAILABLE,
  ]),
});
