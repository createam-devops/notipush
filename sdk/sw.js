/**
 * NotiPush Service Worker
 * Handles incoming push notifications and click events.
 * Place this file at the root of your website (e.g., /sw.js).
 */

self.addEventListener("push", function (event) {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      title: "New Notification",
      body: event.data.text(),
    };
  }

  const options = {
    body: payload.body || "",
    icon: payload.icon || undefined,
    badge: payload.badge || undefined,
    data: {
      url: payload.url || "/",
      ...payload.data,
    },
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "Notification", options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener("pushsubscriptionchange", function (event) {
  // Handle subscription expiration/renewal
  console.log("[NotiPush SW] Subscription changed", event);
});
