"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, FolderOpen, Send, Users, Plug } from "lucide-react";
import { useProject } from "@/contexts/project-context";
import Link from "next/link";

export default function DashboardPage() {
  const { project, apps, loading, projectId } = useProject();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!projectId || !project) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 space-y-4">
            <div className="text-center mb-4">
              <Plug className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium">Selecciona un proyecto</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ve a la sección Proyectos para seleccionar o crear un proyecto.
              </p>
            </div>
            <Button className="w-full gap-2" render={<Link href="/dashboard/projects" />}>
                <FolderOpen className="h-4 w-4" />
                Ir a Proyectos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Proyecto"
          value={project.name}
          icon={<FolderOpen className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title="Aplicaciones"
          value={apps.length.toString()}
          icon={<Bell className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title="Enviadas"
          value={project.notifications_sent.toLocaleString()}
          icon={<Send className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title="Cuota Mensual"
          value={`${project.notifications_sent.toLocaleString()} / ${project.monthly_quota.toLocaleString()}`}
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Información del Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono text-xs">{project.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Key</span>
              <span className="font-mono text-xs">{project.api_key_prefix}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado</span>
              <span>{project.is_active ? "Activo" : "Inactivo"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creado</span>
              <span>{new Date(project.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              VAPID Public Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs font-mono break-all text-muted-foreground bg-muted rounded p-3">
              {project.vapid_public_key}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Usa esta clave en el SDK para suscribir usuarios.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
