import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function sanitizeRedirect(pathname: string, search: string): string {
  const candidate = `${pathname}${search ?? ""}`;
  if (!candidate.startsWith("/")) return "/";
  if (candidate.startsWith("//")) return "/";
  if (candidate.startsWith("/auth")) return "/";
  // Bloqueia redirects aninhados
  if (/[?&]redirect=/i.test(candidate)) return "/";
  return candidate;
}

function AuthenticatedLayout() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  if (!user) {
    if (pathname === "/auth") return <Outlet />;
    const redirect = sanitizeRedirect(pathname, searchStr ?? "");
    return (
      <Navigate
        to="/auth"
        search={{ redirect }}
        replace
      />
    );
  }

  return <Outlet />;
}