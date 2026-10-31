"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { A1ExperimentModal } from "@/components/context-inspector/A1ExperimentModal";
import { X } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [a1ModalOpen, setA1ModalOpen] = useState(false);

  // Determine if this is a public citizen/landing page or an operational mission control view
  const isPublicPage = pathname === "/" || pathname === "/report";

  if (isPublicPage) {
    return (
      <div className="min-h-screen flex flex-col bg-paper text-forest-800">
        <AppNavbar onOpenA1Modal={() => setA1ModalOpen(true)} />
        <main className="flex-1 w-full">{children}</main>
        <AppFooter />
        <A1ExperimentModal
          isOpen={a1ModalOpen}
          onClose={() => setA1ModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-paper text-forest-800">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-forest-950/60 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-forest-950">
            <div className="absolute top-3 right-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-forest-300 hover:text-white"
                aria-label="Close Sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Workspace Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onToggleMobileSidebar={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
