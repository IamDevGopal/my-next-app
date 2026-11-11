self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() ?? "" };
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) payload = {};

  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.slice(0, 100)
      : "TaskFlow notification";
  const options = {
    body: typeof payload.body === "string" ? payload.body.slice(0, 180) : "",
    tag: typeof payload.tag === "string" ? payload.tag.slice(0, 32) : undefined,
    data: { url: typeof payload.url === "string" ? payload.url : "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const requestedUrl = event.notification.data?.url;
      let destination = new URL("/dashboard", self.location.origin);
      if (typeof requestedUrl === "string") {
        try {
          const candidate = new URL(requestedUrl, self.location.origin);
          if (
            candidate.origin === self.location.origin &&
            ["https:", "http:"].includes(candidate.protocol) &&
            !candidate.username &&
            !candidate.password
          ) {
            destination = candidate;
          }
        } catch {
          /* Invalid notification links stay on the dashboard fallback. */
        }
      }

      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(destination.href);
            } catch {
              await self.clients.openWindow(destination.href);
            }
          }
          return;
        }
      }
      await self.clients.openWindow(destination.href);
    })(),
  );
});
