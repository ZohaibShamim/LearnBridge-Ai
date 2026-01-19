"use client";

import { useAuth } from "./useAuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Not authenticated - AuthProvider will handle redirect
//   if (!isAuthenticated) {
//     return (
//       <div className="flex min-h-screen items-center justify-center">
//         <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
//       </div>
//     );
//   }

  // Authenticated - render children
  return <>{children}</>;
}