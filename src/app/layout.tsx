import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

import { AuthProvider } from "@/context/AuthContext";
import { getAllDocs, getDevPreviewProjects } from "@/lib/mdx";
import { isPublicDoc } from "@/lib/visibility";

import { AppLayoutClient } from "@/components/AppLayoutClient";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [docs, devPreviewProjects] = await Promise.all([getAllDocs(), getDevPreviewProjects()]);
  // DP-11: the static bundle — shipped to every visitor, signed in or not —
  // carries ONLY public docs. A signed-in, authorized user's protected docs
  // are fetched by Sidebar itself after sign-in, under Firestore's existing
  // rules, so titles/slugs of private work never enter the build at all.
  const publicDocs = docs.filter(d => isPublicDoc(d.meta));
  const sidebarLinks = publicDocs.map(d => ({
    slug: d.slug,
    project: d.project,
    title: d.meta.title || d.slug,
    section: d.meta.section,
    category: d.meta.category,
  }));
  // DP-16: projects with ANY doc — protected or not — are project names DP-11
  // already decided to stop shipping (a project a user can't read shouldn't
  // even be nameable from the static build). Only PUBLIC-doc projects are
  // baked in; Sidebar.tsx extends this client-side, after sign-in, from the
  // same protected-doc fetch DP-11 already does — the project list gets the
  // same treatment as the doc links themselves, not a build-time shortcut.
  const publicProjects = [...new Set(publicDocs.map(d => d.project))].sort();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-dvh flex bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden">
        <AuthProvider>
          <AppLayoutClient
            links={sidebarLinks}
            devPreviewProjects={devPreviewProjects}
            publicProjects={publicProjects}
          >
            {children}
          </AppLayoutClient>
        </AuthProvider>
      </body>
    </html>
  );
}
