"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Unplug } from "lucide-react";
import { projectApi, type Subscription } from "@/lib/api";
import { useProject } from "@/contexts/project-context";

export default function SubscribersPage() {
  const { apiKey, apps, selectedAppId, selectApp } = useProject();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!apiKey || !selectedAppId) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const api = projectApi(apiKey);
        const data = await api.listSubscriptions(selectedAppId);
        if (active) setSubs(data);
      } catch {
        if (active) setSubs([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [apiKey, selectedAppId]);

  if (!apiKey) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Suscriptores</h1>
        <Card className="max-w-md mx-auto text-center py-12">
          <CardContent>
            <Unplug className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">Proyecto no conectado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Conecta un proyecto desde el Dashboard para ver suscriptores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Suscriptores</h1>
        <div className="flex items-center gap-2">
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
          <Badge variant="outline">{subs.length} suscriptores</Badge>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando suscriptores...</p>
      ) : apps.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">Sin aplicaciones</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea una aplicación primero para ver suscriptores.
            </p>
          </CardContent>
        </Card>
      ) : subs.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">Sin suscriptores</p>
            <p className="text-sm text-muted-foreground mt-1">
              Integra el SDK en tu sitio web para comenzar a registrar suscriptores.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Registrado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.user_external_id}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs font-mono text-muted-foreground">
                    {sub.endpoint}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sub.is_active ? "default" : "secondary"}>
                      {sub.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
