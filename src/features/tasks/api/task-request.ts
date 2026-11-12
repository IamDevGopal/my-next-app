import { apiRequest } from "@/lib/http/api-client";

interface TaskRequestOptions extends Omit<RequestInit, "body"> {
  accessToken: string;
  body?: unknown;
}

async function bounded<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  writing: boolean,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new Error(
          writing
            ? "Task request timed out. Refresh to confirm whether the change was saved before retrying."
            : "Task request timed out. Please refresh and try again.",
        ),
      );
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export function requestTaskApi<T>(path: string, options: TaskRequestOptions) {
  const writing = options.method !== undefined && options.method !== "GET";
  const timeout =
    options.body instanceof FormData ? 60_000 : writing ? 30_000 : 15_000;
  return bounded(
    (signal) => apiRequest<T>(path, { ...options, signal }),
    timeout,
    writing,
  );
}
