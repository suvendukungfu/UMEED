import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/features/auth/context/auth-context";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "UMEED — Every Report Deserves a Verified Handoff",
  description:
    "AI-powered humanitarian assistance platform coordinating from citizen discovery to verified clinical and shelter intake, backed by Meko persistent memory.",
  keywords: [
    "humanitarian assistance",
    "social distress",
    "NGO coordination",
    "closed-loop response",
    "Meko MCP",
    "HackCBS 9.0",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-paper text-forest-800">
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
