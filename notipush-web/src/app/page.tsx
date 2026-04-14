import Link from "next/link";
import { Bell, Code, Zap, Shield, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <>
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Bell className="h-6 w-6 text-primary" />
            NotiPush
          </Link>
          <div className="flex items-center gap-4">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Características
            </Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">
              Cómo Funciona
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Precios
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">Iniciar Sesión</Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Empezar Gratis</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
            <Zap className="h-4 w-4" />
            Notificaciones push sin complicaciones
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Push Notifications
            <br />
            <span className="text-primary">para todos tus proyectos</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Integra notificaciones push en minutos. Una API, un SDK de JavaScript
            y un panel de control. Sin importar qué stack uses en tu backend.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="gap-2">
                Crear Proyecto Gratis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg">
                Ver Cómo Funciona
              </Button>
            </Link>
          </div>

          {/* Code snippet preview */}
          <div className="mt-16 rounded-xl border bg-card p-6 text-left shadow-sm">
            <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Integración en 3 líneas
            </p>
            <pre className="overflow-x-auto text-sm font-mono">
              <code className="text-foreground">{`<script src="https://cdn.notipush.io/sdk/notipush.js"></script>
<script>
  NotiPush.init({
    apiKey: "TU_API_KEY",
    appId: "TU_APP_ID",
    vapidPublicKey: "TU_VAPID_KEY",
    serverUrl: "https://api.notipush.io",
    userId: "usuario-123"
  });
</script>`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/30 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Todo lo que necesitas</h2>
            <p className="mt-4 text-muted-foreground">
              Una plataforma completa para enviar notificaciones push a tus usuarios.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Globe className="h-6 w-6" />}
              title="Multi-Proyecto"
              description="Gestiona múltiples proyectos desde un solo panel. Cada proyecto tiene sus propias claves y configuración."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Entrega Instantánea"
              description="Arquitectura basada en colas de mensajes. Tu API responde al instante y los workers procesan los envíos."
            />
            <FeatureCard
              icon={<Code className="h-6 w-6" />}
              title="SDK Universal"
              description="Un snippet de JavaScript. Compatible con cualquier web, PWA o SPA. Sin importar tu stack."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Seguro por Diseño"
              description="Claves VAPID únicas por proyecto. API keys hasheadas. Rate limiting y cuotas integradas."
            />
            <FeatureCard
              icon={<Bell className="h-6 w-6" />}
              title="Segmentación"
              description="Crea topics para enviar notificaciones a grupos específicos de usuarios."
            />
            <FeatureCard
              icon={<ArrowRight className="h-6 w-6" />}
              title="Reintentos Automáticos"
              description="Si un envío falla, el sistema reintenta automáticamente. Las suscripciones inválidas se limpian solas."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Cómo Funciona</h2>
            <p className="mt-4 text-muted-foreground">
              3 pasos para enviar tu primera notificación.
            </p>
          </div>
          <div className="space-y-12">
            <Step
              number={1}
              title="Crea tu proyecto"
              description="Regístrate, crea un proyecto y obtén tu API Key y clave VAPID. Se generan automáticamente."
            />
            <Step
              number={2}
              title="Integra el SDK"
              description="Agrega el script de NotiPush y el Service Worker en tu sitio web. Son solo 2 archivos."
            />
            <Step
              number={3}
              title="Envía notificaciones"
              description="Usa la API REST desde cualquier backend (PHP, Python, Node, etc.) o envía desde el panel."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-muted/30 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Simple y Transparente</h2>
            <p className="mt-4 text-muted-foreground">
              Empieza gratis. Escala cuando lo necesites.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <PricingCard
              title="Gratis"
              price="$0"
              description="Para proyectos personales"
              features={["1 proyecto", "10,000 notificaciones/mes", "SDK completo", "Soporte comunitario"]}
            />
            <PricingCard
              title="Pro"
              price="$29"
              description="Para equipos y startups"
              features={["5 proyectos", "100,000 notificaciones/mes", "Topics ilimitados", "Webhooks", "Soporte prioritario"]}
              highlighted
            />
            <PricingCard
              title="Enterprise"
              price="Contacto"
              description="Para grandes volúmenes"
              features={["Proyectos ilimitados", "Notificaciones ilimitadas", "SLA garantizado", "Soporte dedicado", "API personalizada"]}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-12">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold">
            <Bell className="h-5 w-5 text-primary" />
            NotiPush
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} NotiPush. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-2 text-primary">{icon}</div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function PricingCard({
  title,
  price,
  description,
  features,
  highlighted,
}: {
  title: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <Card className={highlighted ? "border-primary shadow-lg" : ""}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="mt-2">
          <span className="text-3xl font-bold">{price}</span>
          {price !== "Contacto" && <span className="text-muted-foreground">/mes</span>}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <span className="text-primary">✓</span> {f}
            </li>
          ))}
        </ul>
        <Link href="/login" className="mt-6 block">
          <Button className="w-full" variant={highlighted ? "default" : "outline"}>
            Comenzar
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
