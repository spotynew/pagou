import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { formatBRL, formatTimeBR } from "@/lib/format";
import { ShieldCheck, QrCode, CreditCard, Loader2, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  confirmDraftOrder,
  getDraftOrder,
} from "@/lib/checkout.functions";
import { createMercadoPagoPayment, simulateApproveDemo } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/checkout/$orderId")({
  head: () => ({ meta: [{ title: "Checkout — PAGOU" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [accepted, setAccepted] = useState(false);

  const fetchOrder = useServerFn(getDraftOrder);
  const confirmFn = useServerFn(confirmDraftOrder);
  const createPay = useServerFn(createMercadoPagoPayment);
  const approveDemo = useServerFn(simulateApproveDemo);

  const orderQuery = useQuery({
    queryKey: ["draft-order", orderId],
    queryFn: () => fetchOrder({ data: { orderId } }),
    refetchInterval: (q) => (q.state.data?.payment?.status === "pending" ? 4000 : false),
  });

  const confirm = useMutation({
    mutationFn: async () => {
      await confirmFn({ data: { orderId, paymentMethod: method } });
      return createPay({ data: { orderId, paymentMethod: method } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["draft-order", orderId] });
      toast.success("Cobrança gerada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao processar"),
  });

  const approve = useMutation({
    mutationFn: async () => approveDemo({ data: { orderId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["draft-order", orderId] });
      toast.success("Pagamento aprovado (demo)");
      setTimeout(() => navigate({ to: "/minhas-compras" }), 800);
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao aprovar"),
  });

  if (orderQuery.isPending) {
    return (
      <SiteShell>
        <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando pedido…
        </div>
      </SiteShell>
    );
  }
  if (orderQuery.isError || !orderQuery.data) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-bold">Pedido indisponível</h1>
          <p className="mt-2 text-muted-foreground">{(orderQuery.error as any)?.message ?? "Tente iniciar uma nova compra."}</p>
          <Button asChild className="mt-6"><Link to="/eventos">Voltar aos eventos</Link></Button>
        </div>
      </SiteShell>
    );
  }

  const { order, payment } = orderQuery.data;
  const isPaid = order.status === "paid" || payment?.status === "approved";
  const isExpired =
    !isPaid && order.expires_at && new Date(order.expires_at) < new Date();

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Início</Link> <span>/</span>
          <span className="text-foreground">Checkout</span>
        </div>

        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold">Itens do pedido</h2>
              <ul className="mt-4 divide-y divide-border">
                {order.order_items.map((it: any) => (
                  <li key={it.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{it.title}</p>
                      <p className="text-xs text-muted-foreground">Quantidade: {it.quantity}</p>
                    </div>
                    <p className="font-semibold">{formatBRL(it.total_cents)}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Todos os valores são calculados no backend a partir do produto e do lote. Nada do que
                aparece aqui é editável pelo navegador.
              </p>
            </section>

            {!isPaid && !isExpired && !payment && (
              <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h2 className="font-display text-lg font-semibold">Forma de pagamento</h2>
                <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <PaymentOption id="pix" value="pix" icon={<QrCode className="h-5 w-5 text-primary" />} title="PIX" desc="Aprovação em segundos" />
                  <PaymentOption id="card" value="card" icon={<CreditCard className="h-5 w-5 text-primary" />} title="Cartão de crédito" desc="Taxa de 3,99% inclusa" />
                </RadioGroup>
                <label className="mt-6 flex items-start gap-3 text-sm text-muted-foreground">
                  <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(!!v)} className="mt-0.5" />
                  <span>
                    Li e concordo com os <Link to="/termos" className="text-primary underline">termos de uso</Link> e a{" "}
                    <Link to="/privacidade" className="text-primary underline">política de privacidade</Link>.
                  </span>
                </label>
                <Button
                  className="mt-5 w-full rounded-xl"
                  size="lg"
                  disabled={!accepted || confirm.isPending}
                  onClick={() => confirm.mutate()}
                >
                  {confirm.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Gerar cobrança
                </Button>
              </section>
            )}

            {payment && !isPaid && (
              <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h2 className="font-display text-lg font-semibold">Aguardando pagamento</h2>
                {payment.pix_qr_code ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Copie o código PIX abaixo e pague no app do seu banco. Válido até{" "}
                      {payment.expires_at ? formatTimeBR(payment.expires_at) : "30 minutos"}.
                    </p>
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                      <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs">
                        {payment.pix_qr_code}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(payment.pix_qr_code!);
                          toast.success("Código copiado");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Cobrança criada. A confirmação chegará automaticamente via webhook.
                  </p>
                )}
                <div className="mt-6 rounded-xl border border-border bg-secondary/50 p-4 text-xs text-muted-foreground">
                  Modo demonstração: ainda não há credenciais reais do Mercado Pago. Use o botão abaixo
                  para simular a aprovação e ver o fluxo completo.
                </div>
                <Button
                  className="mt-3 w-full rounded-xl"
                  variant="secondary"
                  disabled={approve.isPending}
                  onClick={() => approve.mutate()}
                >
                  {approve.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simular aprovação (demo)
                </Button>
              </section>
            )}

            {isPaid && (
              <section className="rounded-2xl border border-primary/40 bg-primary/5 p-6 shadow-card">
                <h2 className="font-display text-lg font-semibold text-primary">Pagamento aprovado</h2>
                <p className="mt-2 text-sm text-foreground/80">
                  Seus ingressos ou matrículas já estão disponíveis em Minhas compras.
                </p>
                <Button asChild className="mt-4"><Link to="/minhas-compras">Ir para minhas compras</Link></Button>
              </section>
            )}

            {isExpired && (
              <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
                <h2 className="font-display text-lg font-semibold text-destructive">Pedido expirado</h2>
                <p className="mt-2 text-sm text-muted-foreground">Inicie uma nova compra para reservar novamente.</p>
              </section>
            )}
          </div>

          <aside className="md:sticky md:top-24 md:h-fit">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
              <h2 className="font-display text-lg font-semibold">Resumo (calculado no backend)</h2>
              <Separator className="my-5" />
              <SummaryRow label="Subtotal" value={formatBRL(order.subtotal_cents)} />
              {order.discount_cents > 0 && (
                <SummaryRow label="Desconto" value={`- ${formatBRL(order.discount_cents)}`} className="text-primary" />
              )}
              <SummaryRow label="Taxa da plataforma" value={formatBRL(order.platform_fee_cents ?? 0)} />
              {(order.payment_fee_cents ?? 0) > 0 && (
                <SummaryRow label="Taxa do meio de pagamento" value={formatBRL(order.payment_fee_cents ?? 0)} />
              )}
              <Separator className="my-5" />
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-display text-2xl font-bold">{formatBRL(order.total_cents)}</span>
              </div>
              <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Preços recalculados pelo servidor a cada etapa.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}

function PaymentOption({ id, value, icon, title, desc }: { id: string; value: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-all hover:border-primary/60 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
      <RadioGroupItem value={value} id={id} className="mt-1" />
      <div>
        <div className="flex items-center gap-2 font-semibold">{icon}{title}</div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </label>
  );
}

function SummaryRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={"flex items-center justify-between text-sm " + (className ?? "")}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}