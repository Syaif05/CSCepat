import React, { Suspense } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { MobileHeader } from "@/components/navigation/MobileHeader";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-background">
      {/* Desktop Sidebar */}
      <Suspense fallback={<div className="hidden lg:block w-56 bg-surface border-r border-border-subtle" />}>
        <Sidebar />
      </Suspense>

      {/* Mobile Top Header */}
      <Suspense fallback={<div className="lg:hidden h-16 bg-surface border-b border-border-subtle" />}>
        <MobileHeader />
      </Suspense>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <Suspense fallback={<div className="p-4 text-xs text-text-muted">Memuat...</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
