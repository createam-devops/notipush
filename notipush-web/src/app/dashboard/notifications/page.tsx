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
import { Textarea } from "@/components/ui/textarea";
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
import { Send, Plus, Unplug } from "lucide-react";
import { projectApi, type Notification as Notif } from "@/lib/api";
import { useProject } from "@/contexts/project-context";

export default function NotificationsPage() {
  const { projectId, apps, selectedAppId, selectApp } = useProject();
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");

  // Send form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [priority, setPriority] = useState("normal");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const api = projectApi(projectId);
        const data = await api.listNotifications();
        if (active) setNotifications(data);
      } catch {
        if (active) setNotifications([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [projectId]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim() || !selectedAppId || !projectId) return;
    setSending(true);
    setError("");
    setSendSuccess(false);
    try {
      const api = projectApi(projectId);
      const notif = await api.sendNotification({
        app_id: selectedAppId,
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || undefined,
        priority,
      });
      setNotifications((prev) => [notif, ...prev]);
      setSendSuccess(true);
      setTitle("");
      setBody("");
      setUrl("");
      setTimeout(() => {
        setDialogOpen(false);
        setSendSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "processing": return "secondary";
      case "failed": return "destructive";
      default: return "outline";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Completada";
      case "processing": return "Procesando";
      case "pending": return "Pendiente";
      case "failed": return "Fallida";
      default: return status;
    }
  };

  if (!projectId) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Notificaciones</h1>
        <Card className="max-w-md mx-auto text-center py-12">
          <CardContent>
            <Unplug className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">Proyecto no conectado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Conecta un proyecto desde el Dashboard para enviar notificaciones.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notificaciones</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          setError("");
          setSendSuccess(false);
        }}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="h-4 w-4" />
            Enviar Notificación
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Notificación Push</DialogTitle>
            </DialogHeader>
            {sendSuccess ? (
              <div className="rounded-lg border bg-green-50 dark:bg-green-950 p-6 text-center">
                <Send className="mx-auto h-8 w-8 text-green-600 mb-2" />
                <p className="font-medium text-green-800 dark:text-green-200">
                  ¡Notificación enviada!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Aplicación destino</Label>
                  <Select value={selectedAppId ?? ""} onValueChange={(v) => { if (v !== null) selectApp(v); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar app" />
                    </SelectTrigger>
                    <SelectContent>
                      {apps.map((app) => (
                        <SelectItem key={app.id} value={app.id}>
                          {app.name} ({app.platform})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="send-title">Título</Label>
                  <Input
                    id="send-title"
                    placeholder="¡Nueva oferta!"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="send-body">Mensaje</Label>
                  <Textarea
                    id="send-body"
                    placeholder="Tenemos una oferta especial para ti..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="send-url">URL (opcional)</Label>
                  <Input
                    id="send-url"
                    placeholder="https://misitio.com/oferta"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Prioridad</Label>
                  <Select value={priority} onValueChange={(v) => { if (v !== null) setPriority(v); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  onClick={handleSend}
                  className="w-full gap-2"
                  disabled={sending || !title.trim() || !body.trim() || !selectedAppId}
                >
                  <Send className="h-4 w-4" />
                  {sending ? "Enviando..." : "Enviar"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando notificaciones...</p>
      ) : notifications.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Send className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">Sin notificaciones</p>
            <p className="text-sm text-muted-foreground mt-1">
              Envía tu primera notificación push.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Enviadas</TableHead>
                <TableHead>Fallidas</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {n.body}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColor(n.status) as "default" | "secondary" | "destructive" | "outline"}>
                      {statusLabel(n.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-green-600 font-medium">{n.sent_count}</TableCell>
                  <TableCell className="text-destructive font-medium">{n.failed_count}</TableCell>
                  <TableCell>
                    <span className="capitalize">{n.priority}</span>
                  </TableCell>
                  <TableCell>{new Date(n.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
