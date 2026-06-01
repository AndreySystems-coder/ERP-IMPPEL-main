import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Route, Switch } from "wouter";

import { appRoutes, renderRouteComponent, type RouteAccess } from "@/app/app-routes";
import { Layout } from "@/components/Layout";
import { AdminRoute, ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";

const routeWrappers: Record<RouteAccess, (children: ReactNode) => ReactNode> = {
  public: (children) => children,
  protected: (children) => (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  ),
  admin: (children) => (
    <AdminRoute>
      <Layout>{children}</Layout>
    </AdminRoute>
  ),
};

function Router() {
  return (
    <Switch>
      {appRoutes.map((route) => (
        <Route key={route.path} path={route.path}>
          {renderRouteComponent(route, routeWrappers)}
        </Route>
      ))}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
