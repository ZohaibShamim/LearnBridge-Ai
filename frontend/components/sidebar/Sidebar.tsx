"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  Map,
  Brain,
  BookA,
  LogOut,
  Lock,
  User,
  Settings,
  ChevronUp,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { clearAuthData } from "@/config/token/token";

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard className="h-6 w-6 flex-shrink-0" />,
      href: "/dashboard",
    },
    {
      label: "Upload Resume",
      icon: <FileText className="h-6 w-6 flex-shrink-0" />,
      href: "/upload",
    },
    {
      label: "My Roadmaps",
      icon: <Map className="h-6 w-6 flex-shrink-0" />,
      href: "/my-roadmaps",
    },
    {
      label: "Quizzes",
      icon: <BookA className="h-6 w-6 flex-shrink-0" />,
      href: "/quizzes",
    },
  ];

  const accountMenuItems = [
    {
      label: "Account Settings",
      icon: <User className="h-5 w-5" />,
      action: () => {
        router.push("/account-settings");
        setShowAccountMenu(false);
      },
    },
    {
      label: "Change Password",
      icon: <Lock className="h-5 w-5" />,
      action: () => {
        router.push("/change-password");
        setShowAccountMenu(false);
      },
    },
    {
      label: "Settings",
      icon: <Settings className="h-5 w-5" />,
      action: () => {
        router.push("/settings");
        setShowAccountMenu(false);
      },
    },
    {
      label: "Logout",
      icon: <LogOut className="h-5 w-5" />,
      action: () => {
        clearAuthData();
        logout();
        router.push("/login");
        setShowAccountMenu(false);
      },
    },
  ];

  const isActive = (href: string) => pathname === href;

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setShowAccountMenu(false);
      }
    }

    if (showAccountMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showAccountMenu]);

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={`fixed left-0 top-0 h-screen bg-slate-100 shadow-lg transition-all duration-300 ease-in-out z-30 flex flex-col ${
        isExpanded ? "w-64" : "w-20"
      }`}
    >
      {/* Logo/Brand */}
      <div className="flex items-center justify-center h-20 border-b border-slate-300">
        <div className="text-2xl font-bold">
          {isExpanded ? (
            <h3 className="text-black whitespace-nowrap">Learn Bridge AI</h3>
          ) : (
            <Brain className="h-8 w-8 text-black" />
          )}
        </div>
      </div>

      {/* Menu Items */}
      <nav className="mt-8 space-y-2 px-3 flex-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300 whitespace-nowrap overflow-hidden ${
              isActive(item.href)
                ? "bg-sky-600 text-white shadow-md"
                : "text-slate-700 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
              {item.icon}
            </div>
            {isExpanded && (
              <span className="text-sm font-medium flex-1">{item.label}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Account Section */}
      <div className="border-t border-slate-300 p-3">
        <div className="relative" ref={accountMenuRef}>
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-200 transition-all duration-300 group"
          >
            {/* Avatar Circle */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
              {user?.firstName?.charAt(0).toUpperCase() ||
                user?.email?.charAt(0).toUpperCase() ||
                "U"}
            </div>

            {/* User Info */}
            {isExpanded && (
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {user?.firstName || "User"}
                </p>
                <p className="text-xs text-slate-600 truncate">
                  {user?.email}
                </p>
              </div>
            )}

            {/* Chevron Icon */}
            {isExpanded && (
              <ChevronUp
                className={`h-4 w-4 text-slate-600 transition-transform duration-300 ${
                  showAccountMenu ? "rotate-180" : ""
                }`}
              />
            )}
          </button>

          {/* Account Menu Popup */}
          {showAccountMenu && isExpanded && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {accountMenuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all duration-200 ${
                    index === accountMenuItems.length - 1
                      ? "border-t border-slate-200 text-red-600 hover:bg-red-50"
                      : ""
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Account Menu Popup (Collapsed) */}
          {showAccountMenu && !isExpanded && (
            <div className="absolute left-full ml-2 bottom-0 bg-white  border-slate-200 rounded-lg shadow-xl overflow-hidden z-50 w-48 animate-in fade-in slide-in-from-left-2 duration-200">
              <div className="px-4 py-3 border-slate-200 bg-slate-50">
                <p className="text-sm font-semibold text-slate-900">
                  {user?.firstName || "User"}
                </p>
              </div>
              {accountMenuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all duration-200 ${
                    index === accountMenuItems.length - 1
                      ? " border-slate-200 text-red-600 hover:bg-red-50"
                      : ""
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
