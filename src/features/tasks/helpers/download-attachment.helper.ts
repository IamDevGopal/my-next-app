import { downloadApiBlob } from "@/lib/http/api-blob-client";

export async function downloadAttachment(
  path: string,
  token: string,
  fileName: string,
): Promise<void> {
  await downloadApiBlob(path, token, fileName);
}
