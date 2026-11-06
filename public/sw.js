self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "DOOMBOT", {
      body: data.body || "",
      tag: "doombot-alert",
      icon: "/icon.svg",
      requireInteraction: Boolean(data.urgent),
      data: { url: data.url || "/alerts" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/alerts";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((candidate) => "focus" in candidate);
      if (client) {
        return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
