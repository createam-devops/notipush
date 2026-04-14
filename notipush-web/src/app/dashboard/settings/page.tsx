"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, EyeOff, Check, X } from "lucide-react";

const ADMIN_KEY = "notipush_admin_secret";

export default function SettingsPage() {
  const [secret, setSecret] = useState(() => (typeof window !== "undefined" ? localStorage.getItem(ADMIN_KEY) : null) ?? "");
  const [saved, setSaved] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [hasStored, setHasStored] = useState(() => typeof window !== "undefined" && !!localStorage.getItem(ADMIN_KEY));

  const handleSave = () => {
    if (secret.trim()) {
      localStorage.setItem(ADMIN_KEY, secret.trim());
      setHasStored(true);
    } else {
      localStorage.removeItem(ADMIN_KEY);
      setHasStored(false);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    localStorage.removeItem(ADMIN_KEY);
    setSecret("");
    setHasStored(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>

      <div className="max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Admin Secret</CardTitle>
              </div>
              <Badge variant={hasStored ? "default" : "secondary"}>
                {hasStored ? "Configurado" : "No configurado"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              El Admin Secret protege los endpoints de administración (crear y listar
              proyectos). Debe coincidir con la variable <code className="text-xs bg-muted rounded px-1 py-0.5">ADMIN_SECRET</code> del
              servidor.
            </p>
            <div>
              <Label htmlFor="admin-secret">Secret</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Input
                    id="admin-secret"
                    type={showSecret ? "text" : "password"}
                    placeholder="Pega aquí el ADMIN_SECRET del servidor"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="gap-2" disabled={saved}>
                {saved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Guardado
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
              {hasStored && (
                <Button variant="outline" onClick={handleClear} className="gap-2">
                  <X className="h-4 w-4" />
                  Limpiar
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Este valor se guarda localmente en tu navegador. No se envía al servidor
              excepto como cabecera de autorización al gestionar proyectos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
