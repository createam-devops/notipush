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
  projectId: string | null;
  project: Project | null;
  apps: Application[];
  selectedAppId: string | null;
  loading: boolean;
  connect: (projectId: string) => Promise<void>;
  disconnect: () => void;
  selectApp: (appId: string | null) => void;
  refreshApps: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const STORAGE_KEY = "notipush_project_id";

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null);
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

  const connectInternal = async (id: string) => {
    const api = projectApi(id);
    const [proj, appList] = await Promise.all([
      api.getProject(),
      api.listApplications(),
    ]);
    setProjectId(id);
    setProject(proj);
    setApps(appList);
    setSelectedAppId(appList.length > 0 ? appList[0].id : null);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const connect = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await connectInternal(id);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setProjectId(null);
    setProject(null);
    setApps([]);
    setSelectedAppId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const selectApp = useCallback((appId: string | null) => {
    setSelectedAppId(appId);
  }, []);

  const refreshApps = useCallback(async () => {
    if (!projectId) return;
    const api = projectApi(projectId);
    const appList = await api.listApplications();
    setApps(appList);
    if (selectedAppId && !appList.find((a) => a.id === selectedAppId)) {
      setSelectedAppId(appList.length > 0 ? appList[0].id : null);
    }
  }, [projectId, selectedAppId]);

  return (
    <ProjectContext.Provider
      value={{
        projectId,
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
