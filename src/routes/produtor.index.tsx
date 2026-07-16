import { createFileRoute } from "@tanstack/react-router";
import { formatBRL } from "@/lib/format";
import { ArrowUpRight, DollarSign, Ticket, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/produtor/")({
  component: ProducerOverview,
});

const kpis = [
  { label: "Faturamento (mês)", value: formatBRL(4832100), delta: "+18,2%", icon: DollarSign },
  { label: "Ingressos vendidos", value: "1.842", delta: "+9,4%", icon: Ticket },
  { label: "Novos alunos", value: "312", delta: "+22,7%", icon: Users },
  { label: "Taxa de conversão", value: "6,3%", delta: "+0,8p.p.", icon: TrendingUp },
];

const recent = [
  { id: "PGU-9012", buyer: "Marina Souza", item: "Baile do Terraço · VIP", total: 24000, status: "Aprovado" },
  { id: "PGU-9011", buyer: "Rafael Lima", item: "Design de Produto do Zero", total: 39900, status: "Aprovado" },
  { id: "PGU-9010", buyer: "Camila Prado", item: "Baile do Terraço · Pista", total: 12000, status: "Pendente" },
  { id: "PGU-9009", buyer: "Diego Ramos", item: "Festival Verão SP · 2º Lote", total: 22000, status: "Aprovado" },
];

function ProducerOverview() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Como está a bilheteria e seus cursos hoje.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">{k.label}</span>
              <k.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold">{k.value}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary"><ArrowUpRight className="h-3 w-3" />{k.delta}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Vendas nos últimos 14 dias</h2>
            <span className="text-xs text-muted-foreground">demo</span>
          </div>
          <div className="flex h-52 items-end gap-2">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="flex-1 rounded-t-lg bg-gradient-primary" style={{ height: `${20 + Math.abs(Math.sin(i * 1.3)) * 80}%` }} />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">Top produtos</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <TopRow name="Baile do Terraço" pct={68} />
            <TopRow name="Festival Verão SP" pct={44} />
            <TopRow name="Design de Produto do Zero" pct={32} />
            <TopRow name="Comédia Stand-up Rio" pct={19} />
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">Pedidos recentes</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">Pedido</th><th className="py-2">Comprador</th><th className="py-2">Item</th><th className="py-2">Total</th><th className="py-2">Status</th></tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-3 font-mono text-xs">{r.id}</td>
                  <td className="py-3">{r.buyer}</td>
                  <td className="py-3">{r.item}</td>
                  <td className="py-3 font-semibold">{formatBRL(r.total)}</td>
                  <td className="py-3"><span className={"rounded-full px-2 py-1 text-xs font-medium " + (r.status === "Aprovado" ? "bg-primary/15 text-primary" : "bg-yellow-500/15 text-yellow-700")}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TopRow({ name, pct }: { name: string; pct: number }) {
  return (
    <li>
      <div className="flex justify-between"><span>{name}</span><span className="text-muted-foreground">{pct}%</span></div>
      <div className="mt-1 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
    </li>
  );
}