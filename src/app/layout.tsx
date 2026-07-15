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

import { AuthProvider } from "@/context/AuthContext";
import { getAllDocs } from "@/lib/mdx";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const docs = getAllDocs();
  const sidebarLinks = docs.map(d => ({
    slug: d.slug,
    title: d.meta.title || d.slug,
    isInternal: d.meta.isInternal === true || d.meta.isInternal === 'true',
    category: d.meta.category
  }));

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <AuthProvider>
          <Sidebar links={sidebarLinks} />
          <main className="flex-1 overflow-auto bg-white dark:bg-black p-8">
            <div className="max-w-4xl mx-auto">
              {children}
            </div>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
