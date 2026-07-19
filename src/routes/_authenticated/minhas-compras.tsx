import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatBRL, formatDateTimeBR } from "@/lib/format";
import { QRCodeSVG } from "qrcode.react";
import { Download, PlayCircle, Ticket, ShieldCheck } from "lucide-react";\nimport { ProfileForm } from "@/components/account/ProfileForm";

export const Route = createFileRoute("/_authenticated/minhas-compras")({
  head: () => ({ meta: [{ title: "Minhas compras — PAGOU" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: MyPurchases,
});

const demoOrders = [
  { id: "PGU-8291", title: "Baile do Terraço · Lote 2", type: "Ingresso", when: "2026-08-14T22:00:00Z", amount: 12000, status: "Aprovado" as const },
  { id: "PGU-8034", title: "Design de Produto do Zero", type: "Curso", when: "2026-07-02T10:00:00Z", amount: 39900, status: "Aprovado" as const },
  { id: "PGU-7811", title: "Festival Verão SP", type: "Ingresso", when: "2026-01-18T20:00:00Z", amount: 22000, status: "Pendente" as const },
];

function MyPurchases() {
  return (
    <SiteShell>
      <PageHeader eyebrow="Sua conta" title="Minhas compras" subtitle="Ingressos, cursos e produtos digitais em um só lugar." />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Tabs defaultValue="pedidos">
          <TabsList>
            <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
            <TabsTrigger value="ingressos">Ingressos</TabsTrigger>
            <TabsTrigger value="cursos">Cursos</TabsTrigger>
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
          </TabsList>

          <TabsContent value="pedidos" className="mt-6">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr><th className="p-4">Pedido</th><th className="p-4">Item</th><th className="p-4">Data</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4" /></tr>
                </thead>
                <tbody>
                  {demoOrders.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="p-4 font-mono text-xs">{o.id}</td>
                      <td className="p-4 font-medium">{o.title}<div className="text-xs text-muted-foreground">{o.type}</div></td>
                      <td className="p-4 text-muted-foreground">{formatDateTimeBR(o.when)}</td>
                      <td className="p-4 font-semibold">{formatBRL(o.amount)}</td>
                      <td className="p-4"><Badge variant={o.status === "Aprovado" ? "default" : "secondary"} className={o.status === "Aprovado" ? "bg-primary/15 text-primary hover:bg-primary/15" : ""}>{o.status}</Badge></td>
                      <td className="p-4 text-right"><Button variant="ghost" size="sm">Detalhes</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="ingressos" className="mt-6 grid gap-4 md:grid-cols-2">
            {demoOrders.filter((o) => o.type === "Ingresso" && o.status === "Aprovado").map((o) => (
              <div key={o.id} className="flex gap-6 rounded-3xl border border-border bg-card p-6 shadow-card">
                <div className="rounded-2xl bg-white p-3">
                  <QRCodeSVG value={`pagou://${o.id}`} size={128} />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Ingresso digital</p>
                  <h3 className="font-display text-lg font-bold">{o.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{formatDateTimeBR(o.when)}</p>
                  <p className="mt-4 font-mono text-xs text-muted-foreground">Código: {o.id}</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <ShieldCheck className="h-3 w-3" /> Válido
                  </div>
                </div>
              </div>
            ))}
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border p-8 text-center">
              <Ticket className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Ingressos pendentes aparecem aqui após a aprovação do pagamento.</p>
            </div>
          </TabsContent>

          <TabsContent value="cursos" className="mt-6 grid gap-4 md:grid-cols-2">
            {demoOrders.filter((o) => o.type === "Curso").map((o) => (
              <div key={o.id} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h3 className="font-display text-lg font-bold">{o.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Progresso: 34%</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full w-1/3 bg-primary" /></div>
                <div className="mt-5 flex gap-2">
                  <Button size="sm"><PlayCircle className="mr-1 h-4 w-4" /> Continuar</Button>
                  <Button size="sm" variant="outline"><Download className="mr-1 h-4 w-4" /> Materiais</Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="perfil" className="mt-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="font-display text-lg font-semibold">Dados pessoais</h3>
              <p className="mb-6 text-sm text-muted-foreground">Mantenha seus dados atualizados para pagamentos e emissão de ingressos.</p>\n              <ProfileForm />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SiteShell>
  );
}