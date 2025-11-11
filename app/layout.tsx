import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./components/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Apify → Supabase → OpenAI",
  description: "Data ingestion and AI analysis platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-slate-100 via-slate-50 to-violet-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-violet-950`}
      >
        <div className="relative min-h-dvh">
          {/* Global decorative background blobs - stronger */}
          <div className="pointer-events-none fixed -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-violet-500/45 blur-3xl -z-10 dark:bg-violet-500/40" aria-hidden="true" />
          <div className="pointer-events-none fixed -bottom-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/45 blur-3xl -z-10 dark:bg-fuchsia-500/40" aria-hidden="true" />
          <div className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[640px] w-[640px] rounded-full bg-purple-400/30 blur-3xl -z-10 dark:bg-purple-500/30" aria-hidden="true" />
          <ToastProvider>
            {children}
          </ToastProvider>
        </div>
      </body>
    </html>
  );
}
