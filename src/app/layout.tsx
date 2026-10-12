import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { HavenProvider } from "@/components/HavenProvider";
import { CrisisSheet, HelpButton, QuickExit } from "@/components/HelpButton";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const sans = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: { default: "mysanity", template: "%s · mysanity" },
  description: "A cozy Canadian life game. Walk your town, look after a character, and keep the hard days gentle. Not therapy.",
  applicationName: "mysanity",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "mysanity", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Hidden from search engines until you deliberately launch (set NEXT_PUBLIC_ALLOW_INDEXING=1 and redeploy).
  robots: process.env.NEXT_PUBLIC_ALLOW_INDEXING === "1" ? { index: true, follow: true } : { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#f4efe4", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-dvh">
        <HavenProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-16 focus:top-3 focus:z-50 focus:rounded-full focus:bg-lantern focus:px-4 focus:py-2 focus:text-lantern-ink">Skip to content</a>
          <PwaRegister />
          <aside aria-label="Safety tools">
            <QuickExit />
            <HelpButton />
            <CrisisSheet />
          </aside>
          <main id="main" className="mx-auto w-full max-w-2xl px-4 pb-28 pt-16">{children}</main>
        </HavenProvider>
      </body>
    </html>
  );
}
