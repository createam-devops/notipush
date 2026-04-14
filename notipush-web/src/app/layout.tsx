import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NotiPush - Push Notifications Made Simple",
    template: "%s | NotiPush",
  },
  description:
    "Multi-project push notification platform. Send web push notifications to your users with a simple API and SDK.",
  keywords: ["push notifications", "web push", "VAPID", "notification service", "multi-tenant"],
  openGraph: {
    title: "NotiPush - Push Notifications Made Simple",
    description: "Multi-project push notification platform with simple API integration.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
