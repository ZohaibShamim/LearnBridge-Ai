"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import axios from "axios";
import { setAccessToken, getAccessToken, clearAuthData } from "@/config/token/token";
import { useAuthStore } from "@/store/auth";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<boolean>;
  logout: () => Promise<void>;
  redirectAfterLogin: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_ROUTES = ["/login", "/sign-up", "/forgot-password", "/reset-password"];
const AUTH_ROUTES = ["/login", "/sign-up"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { setUser, clearAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const checkAuth = useCallback(async (): Promise<boolean> => {
    console.log("[Auth] Checking authentication...");

    if (getAccessToken()) {
      console.log("[Auth] Access token exists in memory");
      setIsAuthenticated(true);
      setIsLoading(false);
      return true;
    }

    console.log("[Auth] No access token, attempting refresh with cookie...");

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1"}/users/refresh-token`,
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
  }, [setUser, clearAuth]);

  // Redirect to the intended URL after login
  const redirectAfterLogin = useCallback(() => {
    const redirectTo = searchParams?.get("redirect") || "/dashboard";
    console.log("[Auth] Redirecting after login to:", redirectTo);
    router.push(redirectTo);
  }, [router, searchParams]);

  const logout = useCallback(async () => {
    console.log("[Auth] Logging out...");

    try {
      const token = getAccessToken();

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1"}/users/logout`,
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
      const authenticated = await checkAuth();

      const isAuthRoute = AUTH_ROUTES.some((route) => pathname?.startsWith(route));
      const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname?.startsWith(route));

      if (authenticated && isAuthRoute) {
        // Authenticated user on login/signup - redirect back
        const redirectTo = searchParams?.get("redirect") || "/dashboard";
        console.log("[Auth] Authenticated user on auth route, redirecting to:", redirectTo);
        router.push(redirectTo);
      } else if (!authenticated && !isPublicRoute) {
        // Unauthenticated user on protected route - save intended URL
        console.log("[Auth] Unauthenticated, redirecting to login with redirect param");
        router.push(`/login?redirect=${encodeURIComponent(pathname || "/dashboard")}`);
      }
    };

    initAuth();
  }, [checkAuth, pathname, router, searchParams]);

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