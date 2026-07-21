"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import axios from "axios";
import { setAccessToken, getAccessToken, clearAuthData } from "@/config/token/token";
import { useAuthStore } from "@/store/auth";
import { useRouter, usePathname } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<boolean>;
  logout: () => Promise<void>;
  redirectAfterLogin: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];
const AUTH_ROUTES = ["/login", "/signup"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { setUser, clearAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Check if current route is public. "/" (landing) is matched exactly — it must never
  // redirect to /login, and a startsWith("/") check would wrongly match every route.
  const isPublicRoute = pathname === "/" || PUBLIC_ROUTES.some((route) => pathname?.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname?.startsWith(route));

  const checkAuth = useCallback(async (): Promise<boolean> => {
    console.log("[Auth] Checking authentication...");

    // If we already have an access token in memory, we're authenticated
    if (getAccessToken()) {
      console.log("[Auth] Access token exists in memory");
      setIsAuthenticated(true);
      setIsLoading(false);
      return true;
    }

    // On auth routes (login/signup), don't try to refresh - just mark as not authenticated
    if (isAuthRoute) {
      console.log("[Auth] On auth route, skipping refresh attempt");
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    }

    console.log("[Auth] No access token, attempting refresh with cookie...");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/users/refresh-token`,
        {},
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );

      const newAccessToken = response.data?.data?.accessToken;
      const userData = response.data?.data?.user;

      if (newAccessToken) {
        console.log("[Auth] Refresh successful!");
        setAccessToken(newAccessToken);
        setIsAuthenticated(true);

        if (userData) {
          setUser(userData);
        }

        setIsLoading(false);
        return true;
      } else {
        throw new Error("No access token in refresh response");
      }
    } catch (error: any) {
      console.log("[Auth] Refresh failed:", error?.response?.data?.message || error.message);
      clearAuthData();
      clearAuth();
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    }
  }, [setUser, clearAuth, isAuthRoute]);

  // Redirect to the intended URL after login
  const redirectAfterLogin = useCallback(() => {
    console.log("[Auth] Redirecting after login to: /upload");
    router.push("/upload");
  }, [router]);

  const logout = useCallback(async () => {
    console.log("[Auth] Logging out...");

    try {
      const token = getAccessToken();

      await axios.post(
        `${API_BASE_URL}/users/logout`,
        {},
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );
    } catch (error: any) {
      console.log("[Auth] Logout API failed:", error?.response?.data?.message || error.message);
    } finally {
      clearAuthData();
      clearAuth();
      setIsAuthenticated(false);
      setIsLoading(false);
      router.push("/login");
    }
  }, [clearAuth, router]);

  useEffect(() => {
    const initAuth = async () => {
      // Skip auth check entirely on auth routes to prevent interference
      if (isAuthRoute) {
        console.log("[Auth] On auth route, allowing access without auth check");
        setIsLoading(false);
        return;
      }

      const authenticated = await checkAuth();

      if (authenticated && isAuthRoute) {
        // Authenticated user on login/signup - redirect to upload
        console.log("[Auth] Authenticated user on auth route, redirecting to upload");
        router.push("/upload");
      } else if (!authenticated && !isPublicRoute) {
        // Unauthenticated user on protected route
        console.log("[Auth] Unauthenticated on protected route, redirecting to login");
        router.push("/login");
      }
    };

    initAuth();
  }, [checkAuth, pathname, router, isAuthRoute, isPublicRoute]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, checkAuth, logout, redirectAfterLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}