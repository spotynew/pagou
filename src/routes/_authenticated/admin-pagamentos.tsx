import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/auth/RoleGate";
import { PageHeader } from "@/components/site/PageHeader";
import { SiteShell } from "@/components/site/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL } from "@/lib/format";
import { listAdminPaymentLogs } from "@/lib/admin-payment-logs.functions";
import {
  listAdminPayments,
  reconcileAdminPayment,
  reconcilePendingMercadoPagoPayments,
} from "@/lib/admin-payments.functions";

export const Route = createFileRoute("/_authenticated/admin-pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos — Administração PAGOU" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPaymentsRoute,
});

function AdminPaymentsRoute() {
  return (
    <RoleGate allowed={["admin"]}>
      <AdminPaymentsPage />
    </RoleGate>
  );
}

function paymentBadge(status: string) {
  if (status === "approved") return <Badge>Pago</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejeitado</Badge>;
  if (status === "refunded") return <Badge variant="outline">Estornado</Badge>;
  return <Badge variant="secondary">Pendente</Badge>;
}

function orderBadge(status: string) {
  if (status === "paid") return <Badge>Pago</Badge>;
  if (status === "refunded") return <Badge variant="outline">Estornado</Badge>;
  if (["cancelled", "expired"].includes(status)) {
    return <Badge variant="destructive">{status === "expired" ? "Expirado" : "Cancelado"}</Badge>;
  }
  return <Badge variant="secondary">Pendente</Badge>;
}

function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const listPayments = useServerFn(listAdminPayments);
  const listLogs = useServerFn(listAdminPaymentLogs);
  const reconcilePayment = useServerFn(reconcileAdminPayment);
  const reconcilePending = useServerFn(reconcilePendingMercadoPagoPayments);
  const [search, setSearch] = useState("");

  const payments = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => listPayments(),
    refetchInterval: 30_000,
  });
  const logs = useQuery({
    queryKey: ["admin-payment-logs"],
    queryFn: () => listLogs(),
    refetchInterval: 30_000,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-payment-logs"] }),
    ]);
  };

  const reconcileOne = useMutation({
    mutationFn: (paymentId: string) => reconcilePayment({ data: { paymentId } }),
    onSuccess: async (result) => {
      await refresh();
      toast.success(
        result.paymentStatus === "approved"
          ? "Pagamento confirmado e pedido atualizado para pago."
          : `Status sincronizado: ${result.providerStatus ?? "atualizado"}.`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reconcileAll = useMutation({
    mutationFn: () => reconcilePending(),
    onSuccess: async (result) => {
      await refresh();
      if (result.failures.length) {
        toast.warning(
          `${result.synchronized} sincronizados e ${result.failures.length} com erro. Consulte os logs.`,
        );
      } else {
        toast.success(`${result.synchronized} pagamentos sincronizados.`);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return payments.data ?? [];
    return (payments.data ?? []).filter((payment) =>
      [
        payment.orderId,
        payment.providerOrderId,
        payment.providerPaymentId,
        payment.buyerName,
        payment.buyerEmail,
        payment.paymentStatus,
        payment.orderStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [payments.data, search]);

  return (
    <SiteShell>
      <PageHeader
        eyebrow="PAGOU · Operações financeiras"
        title="Pagamentos e reconciliação"
        subtitle="Consulte transações reais, sincronize PIX pendentes e acompanhe os webhooks do Mercado Pago."
      />

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline">
            <Link to="/admin">Voltar ao painel administrativo</Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={payments.isFetching || logs.isFetching}
              onClick={() => void refresh()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button
              disabled={reconcileAll.isPending}
              onClick={() => reconcileAll.mutate()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {reconcileAll.isPending ? "Sincronizando…" : "Sincronizar pendentes"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="pagamentos">
          <TabsList>
            <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks e auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="pagamentos" className="mt-6 space-y-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por cliente, pedido ou ID do Mercado Pago"
              className="max-w-xl"
            />

            {payments.isPending ? (
              <p className="text-sm text-muted-foreground">Carregando pagamentos…</p>
            ) : payments.isError ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Não foi possível carregar os pagamentos.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
                <table className="w-full min-w-[1180px] text-sm">
                  <thead className="bg-secondary/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Valor</th>
                      <th className="p-4">Pagamento</th>
                      <th className="p-4">Pedido</th>
                      <th className="p-4">Mercado Pago</th>
                      <th className="p-4">Atualização</th>
                      <th className="p-4">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((payment) => (
                      <tr key={payment.id} className="border-t border-border align-top">
                        <td className="p-4">
                          <p className="font-medium">{payment.buyerName}</p>
                          <p className="text-xs text-muted-foreground">{payment.buyerEmail}</p>
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                            Pedido {payment.orderId}
                          </p>
                        </td>
                        <td className="p-4 font-medium">{formatBRL(payment.amountCents)}</td>
                        <td className="p-4">
                          {paymentBadge(payment.paymentStatus)}
                          <p className="mt-2 max-w-48 break-words text-xs text-muted-foreground">
                            {payment.rawStatus || "Sem status bruto"}
                          </p>
                        </td>
                        <td className="p-4">{orderBadge(payment.orderStatus)}</td>
                        <td className="p-4 font-mono text-xs">
                          <p>{payment.providerOrderId || "Order não registrada"}</p>
                          <p className="mt-1 text-muted-foreground">
                            {payment.providerPaymentId || "Payment ID ausente"}
                          </p>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {new Date(payment.updatedAt).toLocaleString("pt-BR")}
                          {payment.paidAt && (
                            <p className="mt-1 text-foreground">
                              Pago em {new Date(payment.paidAt).toLocaleString("pt-BR")}
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!payment.canReconcile || reconcileOne.isPending}
                            onClick={() => reconcileOne.mutate(payment.id)}
                          >
                            Reconsultar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filtered.length && (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    Nenhum pagamento encontrado.
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="webhooks" className="mt-6">
            {logs.isPending ? (
              <p className="text-sm text-muted-foreground">Carregando logs…</p>
            ) : (
              <div className="space-y-3">
                {(logs.data ?? []).map((log) => (
                  <details
                    key={log.id}
                    className="rounded-2xl border border-border bg-card p-4 shadow-card"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{log.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.target_id ? `Pedido ${log.target_id}` : "Evento sem pedido vinculado"}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </Badge>
                      </div>
                    </summary>
                    <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-secondary/60 p-4 text-xs">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </details>
                ))}
                {!logs.data?.length && (
                  <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Nenhum webhook registrado ainda.
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SiteShell>
  );
}
