"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Monitor, Smartphone, Trash2, Bell, Unplug } from "lucide-react";
import { projectApi } from "@/lib/api";
import { useProject } from "@/contexts/project-context";

export default function ApplicationsPage() {
  const { projectId, apps, refreshApps } = useProject();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("web");
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim() || !projectId) return;
    setError("");
    try {
      const api = projectApi(projectId);
      await api.createApplication({ name: name.trim(), platform });
      await refreshApps();
      setDialogOpen(false);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    }
  };

  const handleDelete = async (id: string) => {
    if (!projectId) return;
    try {
      const api = projectApi(projectId);
      await api.deleteApplication(id);
      await refreshApps();
    } catch (err) {
      console.error(err);
    }
  };

  const platformIcon = (p: string) => {
    switch (p) {
      case "web": return <Monitor className="h-4 w-4" />;
      case "ios":
      case "android": return <Smartphone className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (!projectId) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Aplicaciones</h1>
        <Card className="max-w-md mx-auto text-center py-12">
          <CardContent>
            <Unplug className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">Proyecto no conectado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Conecta un proyecto desde el Dashboard para gestionar aplicaciones.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Aplicaciones</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="h-4 w-4" />
            Nueva Aplicación
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Aplicación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="app-name">Nombre</Label>
                <Input
                  id="app-name"
                  placeholder="Mi App Web"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label>Plataforma</Label>
                <Select value={platform} onValueChange={(v) => { if (v !== null) setPlatform(v); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="ios">iOS</SelectItem>
                    <SelectItem value="android">Android</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={handleCreate} className="w-full" disabled={!name.trim()}>
                Crear
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {apps.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Bell className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">Sin aplicaciones</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea una aplicación para registrar suscriptores.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{app.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {platformIcon(app.platform)}
                      <span className="capitalize">{app.platform}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={app.is_active ? "default" : "secondary"}>
                      {app.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(app.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
