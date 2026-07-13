"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, Menu } from "lucide-react";
import Sidebar, { SidebarInner } from "@/components/sidebar/Sidebar";
import { Drawer } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "lb-sidebar-collapsed";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore collapse preference after mount. Reading localStorage during render
  // would desync SSR/client, so this must run in an effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleCollapse = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });

  return (
    <div className="app-bg min-h-dvh">
      {/* Desktop rail */}
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />

      {/* Mobile top bar */}
      <header className="safe-t sticky top-0 z-[var(--z-sticky)] flex h-14 items-center gap-3 border-b border-slate-100 bg-white/85 px-4 backdrop-blur-md lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="tap flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg brand-gradient">
            <Brain className="h-4 w-4 text-white" />
          </span>
          <span className="text-sm font-bold tracking-tight text-slate-900">
            LearnBridge <span className="text-blue-600">AI</span>
          </span>
        </Link>
      </header>

      {/* Mobile drawer */}
      <Drawer open={mobileOpen} onOpenChange={setMobileOpen} side="left" ariaLabel="Navigation">
        <SidebarInner onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      {/* Content — margin tracks the rail width on desktop */}
      <main
        className={cn(
          "transition-[margin] duration-300 ease-in-out",
          collapsed ? "lg:ml-[76px]" : "lg:ml-64"
        )}
      >
        {children}
      </main>
    </div>
  );
}
