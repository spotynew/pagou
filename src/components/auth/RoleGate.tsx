import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldX, Loader2 } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "buyer" | "producer" | "admin" | "checkin_staff";

export function RoleGate({ allowed, children }: { allowed: AppRole[]; children: ReactNode }) {
  const roles = useQuery({
    queryKey: ["current-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role");
      if (error) throw error;
      return (data ?? []).map((item) => item.role as AppRole);
    },
    staleTime: 60_000,
  });

  if (roles.isPending) {
    return (
      <SiteShell>
        <div className="flex min-h-[55vh] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verificando acesso…
        </div>
      </SiteShell>
    );
  }

  const authorized = roles.data?.some((role) => allowed.includes(role));
  if (!authorized) {
    return (
      <SiteShell>
        <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-4 text-center">
          <ShieldX className="h-12 w-12 text-destructive" />
          <h1 className="mt-4 font-display text-3xl font-bold">Acesso não autorizado</h1>
          <p className="mt-2 text-muted-foreground">
            Sua conta não possui permissão para acessar esta área.
          </p>
        </div>
      </SiteShell>
    );
  }

  return children;
}
