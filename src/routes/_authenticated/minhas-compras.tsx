import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, PlayCircle, ShoppingBag, Ticket } from "lucide-react";
import { ProfileForm } from "@/components/account/ProfileForm";
import { PageHeader } from "@/components/site/PageHeader";
import { SiteShell } from "@/components/site/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateTimeBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/minhas-compras")({
  head: () => ({
    meta: [{ title: "Minhas compras — PAGOU" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: MyPurchases,
});

const statusLabel = {
  pending: "Pendente",
  paid: "Aprovado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  expired: "Expirado",
} as const;

function EmptyState({ icon: Icon, text }: { icon: typeof ShoppingBag; text: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-border p-8 text-center">
      <Icon className="h-9 w-9 text-muted-foreground" />
      <p className="mt-3 max-w-md text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function MyPurchases() {
  const account = useQuery({
    queryKey: ["my-real-purchases"],
    queryFn: async () => {
      const [ordersResult, ticketsResult, enrollmentsResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id, status, total_cents, created_at, order_items(title, quantity)")
          .order("created_at", { ascending: false }),
        supabase
          .from("tickets")
          .select(
            "id, code, status, holder_name, sector, batch_name, events(title, starts_at, venue)",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("enrollments")
          .select("id, progress, created_at, courses(title, slug, cover_url)")
          .order("created_at", { ascending: false }),
      ]);
      if (ordersResult.error) throw ordersResult.error;
      if (ticketsResult.error) throw ticketsResult.error;
      if (enrollmentsResult.error) throw enrollmentsResult.error;
      return {
        orders: ordersResult.data ?? [],
        tickets: ticketsResult.data ?? [],
        enrollments: enrollmentsResult.data ?? [],
      };
    },
  });

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Sua conta"
        title="Minhas compras"
        subtitle="Aqui aparecem somente pedidos, ingressos e cursos realmente vinculados à sua conta."
      />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Tabs defaultValue="pedidos">
          <TabsList>
            <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
            <TabsTrigger value="ingressos">Ingressos</TabsTrigger>
            <TabsTrigger value="cursos">Cursos</TabsTrigger>
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
          </TabsList>
          {account.isPending ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando sua conta…
            </div>
          ) : account.isError ? (
            <p className="mt-6 text-sm text-destructive">Não foi possível carregar suas compras.</p>
          ) : (
            <>
              <TabsContent value="pedidos" className="mt-6">
                {!account.data.orders.length ? (
                  <EmptyState
                    icon={ShoppingBag}
                    text="Sua conta começa vazia. Seus pedidos aparecerão aqui assim que você iniciar uma compra."
                  />
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
                    <table className="w-full min-w-[680px] text-sm">
                      <thead className="bg-secondary/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                        <tr>
                          <th className="p-4">Pedido</th>
                          <th className="p-4">Itens</th>
                          <th className="p-4">Data</th>
                          <th className="p-4">Total</th>
                          <th className="p-4">Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {account.data.orders.map((order) => (
                          <tr key={order.id} className="border-t border-border">
                            <td className="p-4 font-mono text-xs">
                              {order.id.slice(0, 8).toUpperCase()}
                            </td>
                            <td className="p-4 font-medium">
                              {order.order_items
                                .map((item) => `${item.quantity}× ${item.title}`)
                                .join(", ") || "Pedido"}
                            </td>
                            <td className="p-4 text-muted-foreground">
                              {formatDateTimeBR(order.created_at)}
                            </td>
                            <td className="p-4 font-semibold">{formatBRL(order.total_cents)}</td>
                            <td className="p-4">
                              <Badge variant={order.status === "paid" ? "default" : "secondary"}>
                                {statusLabel[order.status]}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              {order.status === "pending" && (
                                <Button asChild size="sm" variant="outline">
                                  <Link to="/checkout/$orderId" params={{ orderId: order.id }}>
                                    Continuar
                                  </Link>
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="ingressos" className="mt-6 grid gap-4 md:grid-cols-2">
                {!account.data.tickets.length ? (
                  <div className="md:col-span-2">
                    <EmptyState
                      icon={Ticket}
                      text="Nenhum ingresso emitido. Ele aparecerá aqui automaticamente após a aprovação do pagamento."
                    />
                  </div>
                ) : (
                  account.data.tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-card sm:flex-row"
                    >
                      <div className="self-start rounded-2xl bg-white p-3">
                        <QRCodeSVG value={ticket.code} size={120} />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                          Ingresso digital
                        </p>
                        <h3 className="font-display text-lg font-bold">
                          {ticket.events?.title ?? "Evento"}
                        </h3>
                        {ticket.events?.starts_at && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatDateTimeBR(ticket.events.starts_at)}
                          </p>
                        )}
                        <p className="mt-3 font-mono text-xs">{ticket.code}</p>
                        <Badge
                          className="mt-3"
                          variant={ticket.status === "valid" ? "default" : "secondary"}
                        >
                          {ticket.status === "valid"
                            ? "Válido"
                            : ticket.status === "used"
                              ? "Utilizado"
                              : "Cancelado"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
              <TabsContent value="cursos" className="mt-6 grid gap-4 md:grid-cols-2">
                {!account.data.enrollments.length ? (
                  <div className="md:col-span-2">
                    <EmptyState
                      icon={PlayCircle}
                      text="Você ainda não possui cursos. Cursos pagos aparecem aqui após a confirmação do pagamento."
                    />
                  </div>
                ) : (
                  account.data.enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="rounded-2xl border border-border bg-card p-6 shadow-card"
                    >
                      <h3 className="font-display text-lg font-bold">
                        {enrollment.courses?.title ?? "Curso"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Progresso: {Math.round(Number(enrollment.progress))}%
                      </p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.min(100, Number(enrollment.progress))}%` }}
                        />
                      </div>
                      {enrollment.courses?.slug && (
                        <Button asChild size="sm" className="mt-5">
                          <Link to="/curso/$slug" params={{ slug: enrollment.courses.slug }}>
                            <PlayCircle className="mr-1 h-4 w-4" />
                            Continuar
                          </Link>
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>
            </>
          )}
          <TabsContent value="perfil" className="mt-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="font-display text-lg font-semibold">Dados pessoais e endereço</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Mantenha seus dados atualizados para pagamentos e emissão de ingressos.
              </p>
              <ProfileForm />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SiteShell>
  );
}
