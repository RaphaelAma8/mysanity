import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { HavenProvider } from "@/components/HavenProvider";
import { CrisisSheet, HelpButton, QuickExit } from "@/components/HelpButton";
import "./globals.css";

const sans = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: { default: "mysanity", template: "%s · mysanity" },
  description: "A calm place to take small, gentle steps. Private on your device. Not therapy.",
  // Hidden from search engines until you deliberately launch (set NEXT_PUBLIC_ALLOW_INDEXING=1 and redeploy).
  robots: process.env.NEXT_PUBLIC_ALLOW_INDEXING === "1" ? { index: true, follow: true } : { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#0e1a2b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-dvh">
        <HavenProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-16 focus:top-3 focus:z-50 focus:rounded-full focus:bg-lantern focus:px-4 focus:py-2 focus:text-lantern-ink">Skip to content</a>
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
