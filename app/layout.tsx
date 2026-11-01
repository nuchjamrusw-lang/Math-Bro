import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/client/auth";
import { ToastProvider } from "@/components/ui/toast";
import { getSessionUser } from "@/lib/auth/server";
import { I18nProvider } from "@/lib/i18n/client";
import { getLang } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: { default: "Math&Bro — Real-time A-Math", template: "%s · Math&Bro" },
  description: "Think Fast. Play Smart. Challenge Everything. Play A-Math equations online with friends in real time.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F8F9FB" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, lang] = await Promise.all([getSessionUser(), getLang()]);
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
        />
      </head>
      <body className="min-h-screen">
        <I18nProvider initialLang={lang}>
          <AuthProvider initialUser={user}>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
