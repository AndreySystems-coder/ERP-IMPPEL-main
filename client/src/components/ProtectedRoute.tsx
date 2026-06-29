import { useUser } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { canAccessAny, getDefaultLandingPath, permissionsForPath } from "@/lib/permissions";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();
  const [location, setLocation] = useLocation();
  const routePermissions = permissionsForPath(location);
  const allowed = !!user && (routePermissions.length === 0 || user.role === "admin" || canAccessAny(user as any, routePermissions));

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/login");
      } else if (!allowed) {
        setLocation(getDefaultLandingPath(user as any));
      }
    }
  }, [user, isLoading, allowed, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !allowed) return null;

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();
  const [location, setLocation] = useLocation();
  const allowed = !!user && (user.role === "admin" || canAccessAny(user as any, permissionsForPath(location)));

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/login");
      } else if (!allowed) {
        setLocation(getDefaultLandingPath(user as any));
      }
    }
  }, [user, isLoading, allowed, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !allowed) return null;

  return <>{children}</>;
}
