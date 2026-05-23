export interface FileRecord {
  id: string;
  originalName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: string;
  source: FileSourceInfo | null;
}

export interface FileSourceInfo {
  type: "task" | "comment" | "direct_message" | "team_message";
  parentId: string;
  parentTitle: string | null;
}

export interface FileListResponse {
  files: FileRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface FileUploadResponse {
  success: boolean;
  data: FileRecord;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.startsWith("text/")) return "📝";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("document") || mimeType.includes("word")) return "📃";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📽️";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar") || mimeType.includes("gzip")) return "📦";
  return "📎";
}

export function getFileColor(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "bg-blue-100 text-blue-700";
  if (mimeType === "application/pdf") return "bg-red-100 text-red-700";
  if (mimeType.startsWith("text/")) return "bg-gray-100 text-gray-700";
  if (mimeType.includes("spreadsheet")) return "bg-emerald-100 text-emerald-700";
  if (mimeType.includes("document")) return "bg-indigo-100 text-indigo-700";
  if (mimeType.includes("presentation")) return "bg-orange-100 text-orange-700";
  return "bg-neutral-100 text-neutral-700";
}
