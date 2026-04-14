"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { projectApi, type Project, type Application } from "@/lib/api";

interface ProjectContextValue {
  apiKey: string | null;
  project: Project | null;
  apps: Application[];
  selectedAppId: string | null;
  loading: boolean;
  connect: (apiKey: string) => Promise<void>;
  disconnect: () => void;
  selectApp: (appId: string | null) => void;
  refreshApps: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const STORAGE_KEY = "notipush_api_key";

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      connectInternal(stored).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const connectInternal = async (key: string) => {
    const api = projectApi(key);
    const [proj, appList] = await Promise.all([
      api.getProject(),
      api.listApplications(),
    ]);
    setApiKey(key);
    setProject(proj);
    setApps(appList);
    setSelectedAppId(appList.length > 0 ? appList[0].id : null);
    localStorage.setItem(STORAGE_KEY, key);
  };

  const connect = useCallback(async (key: string) => {
    setLoading(true);
    try {
      await connectInternal(key);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setApiKey(null);
    setProject(null);
    setApps([]);
    setSelectedAppId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const selectApp = useCallback((appId: string | null) => {
    setSelectedAppId(appId);
  }, []);

  const refreshApps = useCallback(async () => {
    if (!apiKey) return;
    const api = projectApi(apiKey);
    const appList = await api.listApplications();
    setApps(appList);
    if (selectedAppId && !appList.find((a) => a.id === selectedAppId)) {
      setSelectedAppId(appList.length > 0 ? appList[0].id : null);
    }
  }, [apiKey, selectedAppId]);

  return (
    <ProjectContext.Provider
      value={{
        apiKey,
        project,
        apps,
        selectedAppId,
        loading,
        connect,
        disconnect,
        selectApp,
        refreshApps,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return ctx;
}
