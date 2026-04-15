"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Check, FolderOpen, Plug } from "lucide-react";
import { admin, type Project, type CreateProjectResponse } from "@/lib/api";
import { useProject } from "@/contexts/project-context";

export default function ProjectsPage() {
  const { connect } = useProject();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdResult, setCreatedResult] = useState<CreateProjectResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    admin.listProjects().then(setProjects).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError("");

    try {
      const result = await admin.createProject({ name: name.trim() });
      setCreatedResult(result);
      setProjects((prev) => [result.project, ...prev]);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear proyecto");
    }
  };

  const copyApiKey = () => {
    if (createdResult?.api_key) {
      navigator.clipboard.writeText(createdResult.api_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const connectProject = async () => {
    if (createdResult?.api_key) {
      await connect(createdResult.api_key);
      setDialogOpen(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Proyectos</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setCreatedResult(null);
            setName("");
            setError("");
          }
        }}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="h-4 w-4" />
            Nuevo Proyecto
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {createdResult ? "Proyecto Creado" : "Crear Proyecto"}
              </DialogTitle>
            </DialogHeader>

            {createdResult ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-green-50 p-4 dark:bg-green-950">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                    ¡Proyecto creado exitosamente!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Guarda tu API Key ahora. No se mostrará de nuevo.
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      readOnly
                      value={createdResult.api_key}
                      className="font-mono text-xs"
                    />
                    <Button variant="outline" size="icon" onClick={copyApiKey}>
                      {copiedKey ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">VAPID Public Key</Label>
                  <Input
                    readOnly
                    value={createdResult.project.vapid_public_key}
                    className="font-mono text-xs mt-1"
                  />
                </div>

                <Button onClick={connectProject} className="w-full gap-2">
                  <Plug className="h-4 w-4" />
                  Conectar este Proyecto
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project-name">Nombre del Proyecto</Label>
                  <Input
                    id="project-name"
                    placeholder="Mi Proyecto"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button onClick={handleCreate} className="w-full" disabled={!name.trim()}>
                  Crear Proyecto
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando proyectos...</p>
      ) : projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">No hay proyectos</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea tu primer proyecto para comenzar a enviar notificaciones.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {project.api_key_prefix}...
                  </p>
                </div>
                <Badge variant={project.is_active ? "default" : "secondary"}>
                  {project.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Enviadas</span>
                    <span className="font-medium">
                      {project.notifications_sent.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cuota mensual</span>
                    <span className="font-medium">
                      {project.monthly_quota.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Creado</span>
                    <span className="font-medium">
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
