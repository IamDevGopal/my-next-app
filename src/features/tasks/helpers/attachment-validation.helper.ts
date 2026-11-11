export const TASK_ATTACHMENT_ACCEPT =
  "application/pdf,text/plain,text/csv,image/png,image/jpeg,image/webp";
const allowedTypes = TASK_ATTACHMENT_ACCEPT.split(",");
const blockedExtensions = [
  "exe",
  "sh",
  "bat",
  "cmd",
  "js",
  "mjs",
  "html",
  "svg",
];

export function validateTaskAttachment(file: File): string | null {
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  if (blockedExtensions.includes(extension))
    return `Files with ".${extension}" extension are not allowed.`;
  if (!allowedTypes.includes(file.type))
    return "Supported files: PDF, TXT, CSV, PNG, JPEG and WebP.";
  if (file.size > 10 * 1024 * 1024) return "File size exceeds the 10 MB limit.";
  if (!file.size) return "File is empty.";
  return null;
}
