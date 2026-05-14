import { AVATAR_UPLOAD_RULES } from "../types/media.type";

export function validateAvatarImage(file: File): string | null {
  if (
    !(AVATAR_UPLOAD_RULES.allowedMimeTypes as readonly string[]).includes(
      file.type,
    )
  ) {
    return "Only JPEG, PNG, and WebP images are allowed.";
  }

  if (file.size > AVATAR_UPLOAD_RULES.maxFileSizeBytes) {
    return "Image file must be 2MB or smaller.";
  }

  return null;
}

export function createImagePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}
