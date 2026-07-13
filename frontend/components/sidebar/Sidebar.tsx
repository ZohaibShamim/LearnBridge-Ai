"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  LayoutDashboard,
  FileText,
  Map,
  BookA,
  LogOut,
  Lock,
  User,
  Settings,
  ChevronsLeft,
  Brain,
  ChevronUp,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { clearAuthData } from "@/config/token/token";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Upload Resume", icon: FileText, href: "/upload" },
  { label: "My Roadmaps", icon: Map, href: "/roadmaps" },
  { label: "Quizzes", icon: BookA, href: "/quizzes" },
];

function initials(user: { firstName?: string; email?: string } | null) {
  return (
    user?.firstName?.charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    "U"
  );
}

/** Shared inner content — reused by the desktop rail and the mobile drawer. */
export function SidebarInner({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const accountItems = [
    { label: "Account Settings", icon: User, href: "/account-settings" },
    { label: "Change Password", icon: Lock, href: "/change-password" },
    { label: "Settings", icon: Settings, href: "/settings" },
  ];

  const go = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  const doLogout = () => {
    clearAuthData();
    logout();
    router.push("/login");
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={cn(
          "flex h-16 items-center gap-2.5 border-b border-slate-100 px-4",
          collapsed && "justify-center px-0"
        )}
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl brand-gradient shadow-md shadow-blue-500/25">
          <Brain className="h-5 w-5 text-white" />
        </span>
        {!collapsed && (
          <span className="whitespace-nowrap text-[15px] font-bold tracking-tight text-slate-900">
            LearnBridge <span className="text-blue-600">AI</span>
          </span>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {!collapsed && (
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Menu
          </p>
        )}
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const link = (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "tap group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                collapsed && "justify-center px-0",
                active
                  ? "brand-gradient text-white shadow-md shadow-blue-500/25"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
          return collapsed ? (
            <Tooltip key={item.href} content={item.label} side="right">
              {link}
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>

      {/* Account */}
      <div className="border-t border-slate-100 p-3">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              aria-label="Account menu"
              className={cn(
                "tap flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                collapsed && "justify-center px-0"
              )}
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                {initials(user)}
              </span>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {user?.firstName || "User"}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{user?.email}</span>
                  </span>
                  <ChevronUp className="h-4 w-4 flex-shrink-0 text-slate-400" />
                </>
              )}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="top"
              align="start"
              sideOffset={8}
              className="z-[var(--z-dropdown)] w-56 overflow-hidden rounded-xl border border-slate-100 bg-white p-1 shadow-[var(--shadow-lg)] data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-bottom-2"
            >
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="truncate text-sm font-semibold text-slate-900">{user?.firstName || "User"}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              {accountItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenu.Item
                    key={item.href}
                    onSelect={() => go(item.href)}
                    className="tap flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none data-[highlighted]:bg-slate-100"
                  >
                    <Icon className="h-4 w-4 text-slate-400" />
                    {item.label}
                  </DropdownMenu.Item>
                );
              })}
              <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
              <DropdownMenu.Item
                onSelect={doLogout}
                className="tap flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 outline-none data-[highlighted]:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}

/** Desktop rail. Collapse toggle lives in the header row. */
export default function Sidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-[var(--z-sticky)] hidden border-r border-slate-100 bg-white transition-[width] duration-300 ease-in-out lg:block",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      <SidebarInner collapsed={collapsed} />
      <button
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="tap absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:text-blue-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <ChevronsLeft className={cn("h-3.5 w-3.5 transition-transform duration-300", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}
