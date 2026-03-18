"use client";

import { AppSidebar } from "./app-sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
