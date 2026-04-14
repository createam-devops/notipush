"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Bell,
  FolderOpen,
  LayoutDashboard,
  Send,
  Users,
  LogOut,
  Menu,
  Tags,
  Unplug,
  Plug,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ProjectProvider, useProject } from "@/contexts/project-context";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Proyectos", href: "/dashboard/projects", icon: FolderOpen },
  { name: "Aplicaciones", href: "/dashboard/applications", icon: Bell },
  { name: "Suscriptores", href: "/dashboard/subscribers", icon: Users },
  { name: "Topics", href: "/dashboard/topics", icon: Tags },
  { name: "Notificaciones", href: "/dashboard/notifications", icon: Send },
  { name: "Configuración", href: "/dashboard/settings", icon: Settings },
];

function ProjectStatus() {
  const { project, disconnect } = useProject();

  if (!project) {
    return (
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          <Unplug className="h-3.5 w-3.5 shrink-0" />
          <span>Sin proyecto conectado</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <div className="rounded-lg border bg-primary/5 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Plug className="h-3.5 w-3.5 text-green-600" />
            Conectado
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={disconnect}
            title="Desconectar"
          >
            <Unplug className="h-3 w-3" />
          </Button>
        </div>
        <p className="mt-1 text-sm font-medium truncate">{project.name}</p>
        <p className="text-xs text-muted-foreground font-mono">
          {project.api_key_prefix}...
        </p>
      </div>
    </div>
  );
}

function UserInfo() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-3">
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt=""
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
            {session.user.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{session.user.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {session.user.email}
          </p>
        </div>
      </div>
    </div>
  );
}

function SidebarContent() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-6 py-5 font-bold text-lg">
        <Bell className="h-6 w-6 text-primary" />
        NotiPush
      </div>
      <Separator />
      <ProjectStatus />
      <Separator />
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <UserInfo />
      <Separator />
      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProjectProvider>
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
          <SidebarContent />
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile header */}
          <header className="flex h-14 items-center gap-4 border-b px-4 lg:hidden">
            <Sheet>
              <SheetTrigger render={<Button variant="ghost" size="icon" />}>
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2 font-bold">
              <Bell className="h-5 w-5 text-primary" />
              NotiPush
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </ProjectProvider>
  );
}
