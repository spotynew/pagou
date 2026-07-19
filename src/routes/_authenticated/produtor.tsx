import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import {
  LayoutDashboard,
  Ticket,
  GraduationCap,
  Users,
  Tag,
  Settings,
  BarChart3,
} from "lucide-react";
import { RoleGate } from "@/components/auth/RoleGate";

export const Route = createFileRoute("/_authenticated/produtor")({
  head: () => ({
    meta: [
      { title: "Painel do produtor — PAGOU" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProducerRoute,
});

function ProducerRoute() {
  return (
    <RoleGate allowed={["producer", "admin"]}>
      <ProducerLayout />
    </RoleGate>
  );
}

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/produtor", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/produtor/eventos", label: "Eventos", icon: Ticket },
  { to: "/produtor/cursos", label: "Cursos", icon: GraduationCap },
  { to: "/produtor/cupons", label: "Cupons & cortesias", icon: Tag },
  { to: "/produtor/participantes", label: "Participantes", icon: Users },
  { to: "/produtor/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/produtor/configuracoes", label: "Configurações", icon: Settings },
];

function ProducerLayout() {
  const loc = useLocation();
  return (
    <SiteShell>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[240px_1fr]">
        <aside className="md:sticky md:top-24 md:h-fit">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Produtor
            </p>
            <nav className="flex flex-col">
              {NAV.map((n) => {
                const active = n.exact ? loc.pathname === n.to : loc.pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to as never}
                    className={
                      "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium " +
                      (active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80 hover:bg-secondary")
                    }
                  >
                    <n.icon className="h-4 w-4" /> {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </SiteShell>
  );
}
