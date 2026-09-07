import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sanjeev AI Documentation Portal",
  description: "Unified Documentation Portal",
};

import { Suspense } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { getAllDocs, getDevPreviewProjects } from "@/lib/mdx";

import { AppLayoutClient } from "@/components/AppLayoutClient";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [docs, devPreviewProjects] = await Promise.all([getAllDocs(), getDevPreviewProjects()]);
  const sidebarLinks = docs.map(d => ({
    slug: d.slug,
    project: d.project,
    title: d.meta.title || d.slug,
    isInternal: d.meta.isInternal === true || String(d.meta.isInternal) === 'true',
    section: d.meta.section,
    category: d.meta.category,
    requiresLogin: d.meta.requiresLogin === true,
  }));

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-dvh flex bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden">
        <AuthProvider>
          <AppLayoutClient 
            sidebar={
              <Suspense fallback={<aside className="w-72 h-screen bg-zinc-950" />}>
                <Sidebar links={sidebarLinks} devPreviewProjects={devPreviewProjects} />
              </Suspense>
            }
          >
            {children}
          </AppLayoutClient>
        </AuthProvider>
      </body>
    </html>
  );
}
