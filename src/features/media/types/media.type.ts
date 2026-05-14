export const AVATAR_UPLOAD_RULES = {
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  maxFileSizeBytes: 2 * 1024 * 1024,
} as const;
