"use client";

import { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Tags, Unplug } from "lucide-react";
import { projectApi, type Topic } from "@/lib/api";
import { useProject } from "@/contexts/project-context";

export default function TopicsPage() {
  const { apiKey, apps, selectedAppId, selectApp } = useProject();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!apiKey || !selectedAppId) {
      setTopics([]);
      return;
    }
    setLoading(true);
    const api = projectApi(apiKey);
    api.listTopics(selectedAppId)
      .then(setTopics)
      .catch(() => setTopics([]))
      .finally(() => setLoading(false));
  }, [apiKey, selectedAppId]);

  const handleCreate = async () => {
    if (!name.trim() || !apiKey || !selectedAppId) return;
    setError("");
    try {
      const api = projectApi(apiKey);
      const topic = await api.createTopic(selectedAppId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setTopics((prev) => [...prev, topic]);
      setDialogOpen(false);
      setName("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    }
  };

  if (!apiKey) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Topics</h1>
        <Card className="max-w-md mx-auto text-center py-12">
          <CardContent>
            <Unplug className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">Proyecto no conectado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Conecta un proyecto desde el Dashboard para gestionar topics.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Topics</h1>
          {apps.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">App:</Label>
              <Select value={selectedAppId ?? ""} onValueChange={(v) => { if (v !== null) selectApp(v); }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Seleccionar app" />
                </SelectTrigger>
                <SelectContent>
                  {apps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {selectedAppId && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button className="gap-2" />}>
              <Plus className="h-4 w-4" />
              Nuevo Topic
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Topic</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="topic-name">Nombre</Label>
                  <Input id="topic-name" placeholder="premium-users" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="topic-desc">Descripción (opcional)</Label>
                  <Input id="topic-desc" placeholder="Usuarios premium" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button onClick={handleCreate} className="w-full" disabled={!name.trim()}>
                  Crear
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando topics...</p>
      ) : apps.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Tags className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">Sin aplicaciones</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea una aplicación primero para gestionar topics.
            </p>
          </CardContent>
        </Card>
      ) : topics.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Tags className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">Sin topics</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea topics para segmentar a tus suscriptores.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => (
                <TableRow key={topic.id}>
                  <TableCell className="font-medium">{topic.name}</TableCell>
                  <TableCell className="text-muted-foreground">{topic.description || "—"}</TableCell>
                  <TableCell>{new Date(topic.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
