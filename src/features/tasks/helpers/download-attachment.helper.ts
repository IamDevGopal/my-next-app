import { requestTaskBlob } from "../api/task-request";

export async function downloadAttachment(
  path: string,
  token: string,
  fileName: string,
): Promise<void> {
  const blob = await requestTaskBlob(path, token);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
