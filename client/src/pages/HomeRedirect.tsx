import { useEffect } from "react";
import { useLocation } from "wouter";

import { useUser } from "@/hooks/use-auth";
import { getDefaultLandingPath } from "@/lib/permissions";

export default function HomeRedirect() {
  const { data: user } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) setLocation(getDefaultLandingPath(user));
  }, [setLocation, user]);

  return <div className="min-h-screen bg-slate-50" />;
}
