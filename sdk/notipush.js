/**
 * NotiPush SDK - Web Push Notification Client
 * Include this script in your website to enable push notifications.
 *
 * Usage:
 *   NotiPush.init({
 *     apiKey: "YOUR_API_KEY",
 *     appId: "YOUR_APP_ID",
 *     vapidPublicKey: "YOUR_VAPID_PUBLIC_KEY",
 *     serverUrl: "https://your-notipush-server.com",
 *     userId: "user-123"
 *   }).then(() => console.log("Subscribed!"));
 */
(function (global) {
  "use strict";

  const NotiPush = {
    _config: null,

    /**
     * Initialize NotiPush and subscribe the user.
     * @param {Object} config
     * @param {string} config.apiKey - Your project API key
     * @param {string} config.appId - Your application ID
     * @param {string} config.vapidPublicKey - VAPID public key (base64url)
     * @param {string} config.serverUrl - NotiPush server URL
     * @param {string} config.userId - External user identifier
     * @param {string[]} [config.topics] - Optional topic names to subscribe to
     * @param {string} [config.swPath] - Service Worker path (default: "/sw.js")
     * @returns {Promise<PushSubscription>}
     */
    async init(config) {
      if (!config.apiKey || !config.appId || !config.vapidPublicKey || !config.serverUrl || !config.userId) {
        throw new Error("NotiPush: apiKey, appId, vapidPublicKey, serverUrl, and userId are required");
      }

      this._config = config;
      const swPath = config.swPath || "/sw.js";

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("NotiPush: Push notifications are not supported in this browser");
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register(swPath);
      await navigator.serviceWorker.ready;

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("NotiPush: Notification permission denied");
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._urlBase64ToUint8Array(config.vapidPublicKey),
      });

      // Send subscription to server
      const keys = subscription.toJSON().keys;
      const body = {
        user_external_id: config.userId,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      };

      if (config.topics && config.topics.length > 0) {
        body.topics = config.topics;
      }

      const response = await fetch(
        `${config.serverUrl}/api/v1/applications/${config.appId}/subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": config.apiKey,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`NotiPush: Subscription failed - ${error.error || response.statusText}`);
      }

      return subscription;
    },

    _urlBase64ToUint8Array(base64String) {
      const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    },

    /**
     * Send a push notification via the NotiPush API.
     * @param {string} title - Notification title
     * @param {string} body - Notification body
     * @param {Object} [options]
     * @param {string} [options.url] - URL to open on click
     * @param {string} [options.icon] - Icon URL
     * @param {Object} [options.data_json] - Custom data payload
     * @param {string} [options.topic_id] - Target a specific topic
     * @param {number} [options.ttl] - Time to live in seconds
     * @returns {Promise<Object>} API response
     */
    async sendPushNotification(title, body, options = {}) {
      if (!this._config) {
        throw new Error("NotiPush: SDK not initialized. Call init() first.");
      }

      const payload = {
        app_id: this._config.appId,
        title,
        body,
      };

      if (options.url) payload.url = options.url;
      if (options.icon) payload.icon = options.icon;
      if (options.data_json) payload.data_json = options.data_json;
      if (options.topic_id) payload.topic_id = options.topic_id;
      if (options.ttl) payload.ttl = options.ttl;

      const response = await fetch(
        `${this._config.serverUrl}/api/v1/notifications/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this._config.apiKey,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(`NotiPush: Send failed - ${result.error || response.statusText}`);
      }

      return result;
    },
  };

  // Export
  if (typeof module !== "undefined" && module.exports) {
    module.exports = NotiPush;
  } else {
    global.NotiPush = NotiPush;
  }
})(typeof window !== "undefined" ? window : this);
