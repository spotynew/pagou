import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHeader } from "@/components/site/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração — PAGOU" }] }),
  component: AdminPanel,
});

function AdminPanel() {
  return (
    <SiteShell>
      <PageHeader eyebrow="PAGOU · staff · Modo demonstração" title="Painel administrativo" subtitle="Dados fictícios para navegação. Nenhuma ação afeta pagamentos reais." />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="GMV do mês" value={formatBRL(89211700)} />
          <Kpi label="Taxa média" value="10,0%" />
          <Kpi label="Contas ativas" value="1.284" />
          <Kpi label="Reembolsos abertos" value="3" />
        </div>
        <Tabs defaultValue="vendedores">
          <TabsList>
            <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
            <TabsTrigger value="reembolsos">Reembolsos</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="vendedores" className="mt-6">
            <AdminTable
              rows={[
                ["ACC-102", "Cavalo de Pau Produções", "Aguardando", "12/05"],
                ["ACC-101", "Estúdio Fluxo", "Aprovado", "10/05"],
                ["ACC-100", "Sala 42 Cursos", "Aprovado", "01/05"],
              ]}
              cols={["ID", "Empresa", "Status", "Enviado em"]}
              renderAction={(r) => r[2] === "Aguardando" ? <Button size="sm">Aprovar</Button> : <Button size="sm" variant="outline">Ver</Button>}
            />
          </TabsContent>

          <TabsContent value="produtos" className="mt-6">
            <AdminTable
              rows={[
                ["PRD-556", "Baile do Terraço", "Publicado", formatBRL(120000)],
                ["PRD-555", "Curso: Growth do Zero", "Em análise", formatBRL(29900)],
              ]}
              cols={["ID", "Produto", "Status", "GMV"]}
            />
          </TabsContent>

          <TabsContent value="pagamentos" className="mt-6">
            <p className="text-sm text-muted-foreground">Integração com Mercado Pago será exibida aqui. Nesta etapa, dados demonstrativos.</p>
          </TabsContent>

          <TabsContent value="reembolsos" className="mt-6">
            <p className="text-sm text-muted-foreground">Nenhum reembolso pendente de aprovação.</p>
          </TabsContent>

          <TabsContent value="auditoria" className="mt-6">
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {[
                "Admin ana@pagou.com aprovou vendedor ACC-101",
                "Sistema registrou webhook aprovado para PGU-9012",
                "Admin luis@pagou.com suspendeu produto PRD-441",
              ].map((l, i) => (
                <li key={i} className="flex items-center justify-between p-4 text-sm">
                  <span>{l}</span>
                  <Badge variant="outline">agora</Badge>
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>
      </div>
    </SiteShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function AdminTable({ cols, rows, renderAction }: { cols: string[]; rows: string[][]; renderAction?: (r: string[]) => React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
          <tr>{cols.map((c) => <th key={c} className="p-4">{c}</th>)}<th /></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((v, j) => <td key={j} className="p-4">{v}</td>)}
              <td className="p-4 text-right">{renderAction?.(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}