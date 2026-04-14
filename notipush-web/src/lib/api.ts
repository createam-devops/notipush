const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// --- Types ---

export interface Project {
  id: string;
  name: string;
  api_key_prefix: string;
  vapid_public_key: string;
  monthly_quota: number;
  notifications_sent: number;
  webhook_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectResponse {
  project: Project;
  api_key: string;
}

export interface Application {
  id: string;
  project_id: string;
  name: string;
  platform: string;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  project_id: string;
  app_id: string;
  topic_id?: string;
  title: string;
  body: string;
  priority: string;
  ttl: number;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  status: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  app_id: string;
  user_external_id: string;
  endpoint: string;
  is_active: boolean;
  created_at: string;
}

export interface Topic {
  id: string;
  app_id: string;
  name: string;
  description?: string;
  created_at: string;
}

// --- Admin endpoints (protected by ADMIN_SECRET) ---

function adminHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const secret = localStorage.getItem("notipush_admin_secret");
  if (!secret) return {};
  return { Authorization: `Bearer ${secret}` };
}

export const admin = {
  createProject(data: { name: string; webhook_url?: string }) {
    return request<CreateProjectResponse>("/admin/projects", {
      method: "POST",
      body: JSON.stringify(data),
      headers: adminHeaders(),
    });
  },

  listProjects() {
    return request<Project[]>("/admin/projects", {
      headers: adminHeaders(),
    });
  },
};

// --- Project endpoints (require API key) ---

export function projectApi(apiKey: string) {
  const headers = { "X-API-Key": apiKey };

  return {
    // Current project info
    getProject() {
      return request<Project>("/api/v1/project", { headers });
    },

    // Applications
    createApplication(data: { name: string; platform: string }) {
      return request<Application>("/api/v1/applications", {
        method: "POST",
        body: JSON.stringify(data),
        headers,
      });
    },

    listApplications() {
      return request<Application[]>("/api/v1/applications", { headers });
    },

    deleteApplication(id: string) {
      return request<void>(`/api/v1/applications/${id}`, {
        method: "DELETE",
        headers,
      });
    },

    // Topics
    createTopic(appId: string, data: { name: string; description?: string }) {
      return request<Topic>(`/api/v1/applications/${appId}/topics`, {
        method: "POST",
        body: JSON.stringify(data),
        headers,
      });
    },

    listTopics(appId: string) {
      return request<Topic[]>(`/api/v1/applications/${appId}/topics`, {
        headers,
      });
    },

    // Subscriptions
    listSubscriptions(appId: string) {
      return request<Subscription[]>(
        `/api/v1/applications/${appId}/subscriptions`,
        { headers }
      );
    },

    // Notifications
    sendNotification(data: {
      app_id: string;
      topic_id?: string;
      title: string;
      body: string;
      icon?: string;
      url?: string;
      priority?: string;
      ttl?: number;
    }) {
      return request<Notification>("/api/v1/notifications/send", {
        method: "POST",
        body: JSON.stringify(data),
        headers,
      });
    },

    listNotifications() {
      return request<Notification[]>("/api/v1/notifications", { headers });
    },

    getNotification(id: string) {
      return request<Notification>(`/api/v1/notifications/${id}`, { headers });
    },
  };
}
