import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DollarSign, Package, ShoppingBag, Ticket } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { getProducerDashboard } from "@/lib/producer.functions";

export const Route = createFileRoute("/_authenticated/produtor/")({
  component: ProducerOverview,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  expired: "Expirado",
};

function ProducerOverview() {
  const loadDashboard = useServerFn(getProducerDashboard);
  const dashboard = useQuery({
    queryKey: ["producer-dashboard"],
    queryFn: () => loadDashboard(),
  });

  if (dashboard.isPending) {
    return <p className="text-sm text-muted-foreground">Carregando dados reais…</p>;
  }
  if (dashboard.isError) {
    return <p className="text-sm text-destructive">{dashboard.error.message}</p>;
  }

  const data = dashboard.data;
  const metrics = [
    {
      label: "Faturamento aprovado",
      value: formatBRL(data.metrics.revenueCents),
      icon: DollarSign,
    },
    { label: "Pedidos pagos", value: String(data.metrics.paidOrders), icon: ShoppingBag },
    { label: "Ingressos vendidos", value: String(data.metrics.ticketsSold), icon: Ticket },
    { label: "Itens no catálogo", value: String(data.metrics.catalogItems), icon: Package },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Dados reais</p>
        <h1 className="font-display text-3xl font-bold">Olá, {data.seller.display_name}</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe seu catálogo e as vendas vinculadas à sua conta.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-border bg-card p-5 shadow-card"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {metric.label}
              </span>
              <metric.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-6">
          <h2 className="font-display text-lg font-semibold">Pedidos recentes</h2>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Ainda não há pedidos para seus itens.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="p-4">Pedido</th>
                  <th className="p-4">Comprador</th>
                  <th className="p-4">Item</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-border">
                    <td className="p-4 font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</td>
                    <td className="p-4">{order.buyerName}</td>
                    <td className="p-4">{order.item}</td>
                    <td className="p-4 font-semibold">{formatBRL(order.totalCents)}</td>
                    <td className="p-4">{STATUS_LABEL[order.status] ?? order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
