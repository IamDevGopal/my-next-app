import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ApiActivityIndicator } from "@/lib/http/api-activity-indicator";
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
  title: "TaskFlow",
  description: "TaskFlow collaboration frontend",
};

/**
 * TaskFlow is an authenticated, fully personal application — every route
 * (auth flows, dashboard, error boundaries) is per-user and dynamic. There
 * is no public, static, or cacheable page in the entire app.
 *
 * Forcing dynamic at the root layout cascades to every nested route AND
 * Next.js's special error pages (`global-error.tsx`, `not-found.tsx`),
 * which are client components and otherwise can't carry the directive
 * themselves.
 *
 * Without this, Next.js's static prerender pipeline trips
 * "Cannot read properties of null (reading 'useState')" on any page that
 * mounts client components with React hooks (`useState`, `useEffect`,
 * `useForm`) — the hook runtime isn't fully wired during static export.
 * This applies to BOTH Next.js 15 and 16; the symptom is identical.
 */
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ApiActivityIndicator />
        {children}
      </body>
    </html>
  );
}
