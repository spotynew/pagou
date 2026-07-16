import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { eventBySlugQuery } from "@/lib/queries";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDateTimeBR } from "@/lib/format";
import { CalendarDays, MapPin, ShieldCheck, Minus, Plus, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/eventos/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(eventBySlugQuery(params.slug));
    if (!data) throw notFound();
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — PAGOU` },
      { name: "description", content: "Garanta seu ingresso com pagamento seguro pela PAGOU." },
    ],
  }),
  component: EventDetail,
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Evento não encontrado</h1>
        <p className="mt-2 text-muted-foreground">Talvez esse evento tenha saído do ar.</p>
      </div>
    </SiteShell>
  ),
});

function EventDetail() {
  const { slug } = Route.useParams();
  const data = useSuspenseQuery(eventBySlugQuery(slug)).data!;
  const { event, ticketTypes } = data;
  const navigate = useNavigate();

  const firstBatch = ticketTypes.flatMap((t) => t.ticket_batches ?? []).find((b) => b.active);
  const [selectedBatchId, setSelectedBatchId] = useState<string | undefined>(firstBatch?.id);
  const [qty, setQty] = useState(1);

  const selectedBatch = ticketTypes.flatMap((t) => t.ticket_batches ?? []).find((b) => b.id === selectedBatchId);

  return (
    <SiteShell>
      <div className="relative h-[42vh] w-full overflow-hidden bg-ink">
        {event.cover_url && <img src={event.cover_url} alt="" className="h-full w-full object-cover opacity-70" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
      </div>
      <div className="mx-auto -mt-24 max-w-7xl px-4">
        <div className="grid gap-8 md:grid-cols-[1.6fr_1fr]">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated">
            {event.category && (
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                {event.category}
              </span>
            )}
            <h1 className="mt-4 font-display text-3xl font-bold md:text-5xl">{event.title}</h1>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />{formatDateTimeBR(event.starts_at)}</span>
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{event.venue}, {event.city}</span>
              {event.age_rating && <span className="inline-flex items-center gap-2"><Tag className="h-4 w-4 text-primary" />{event.age_rating}</span>}
            </div>
            {event.address && <p className="mt-4 text-sm text-muted-foreground">{event.address}</p>}

            <h2 className="mt-10 font-display text-xl font-semibold">Sobre o evento</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-foreground/90">{event.description}</p>

            <h2 className="mt-10 font-display text-xl font-semibold">Setores e lotes</h2>
            <div className="mt-4 flex flex-col gap-3">
              {ticketTypes.map((t) => (
                <div key={t.id} className="rounded-2xl border border-border p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{t.name} <span className="text-muted-foreground font-normal">· {t.sector}</span></h3>
                      {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(t.ticket_batches ?? []).map((b: any) => {
                      const remaining = b.quantity_total - b.quantity_sold;
                      const disabled = !b.active || remaining <= 0;
                      const active = selectedBatchId === b.id;
                      return (
                        <button
                          key={b.id}
                          disabled={disabled}
                          onClick={() => setSelectedBatchId(b.id)}
                          className={
                            "rounded-xl border px-4 py-3 text-left transition-all disabled:opacity-40 " +
                            (active
                              ? "border-primary bg-primary/10 text-foreground shadow-card"
                              : "border-border hover:border-primary/60")
                          }
                        >
                          <div className="text-xs font-medium text-muted-foreground">{b.name}</div>
                          <div className="font-display text-lg font-bold">{formatBRL(b.price_cents)}</div>
                          <div className="text-xs text-muted-foreground">{remaining} disponíveis</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {event.producer_name && (
              <div className="mt-10 rounded-2xl bg-secondary/60 p-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Produção</p>
                <p className="mt-1 font-semibold">{event.producer_name}</p>
              </div>
            )}
          </div>

          {/* Sidebar compra */}
          <aside className="md:sticky md:top-24 md:h-fit">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Selecionado</p>
              <p className="mt-1 font-display text-2xl font-bold">
                {selectedBatch ? formatBRL(selectedBatch.price_cents) : "—"}
              </p>
              <p className="text-sm text-muted-foreground">{selectedBatch?.name ?? "Escolha um lote"}</p>

              <div className="mt-6 flex items-center justify-between rounded-xl border border-border p-3">
                <span className="text-sm font-medium">Quantidade</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-secondary"><Minus className="h-4 w-4" /></button>
                  <span className="w-6 text-center font-semibold">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(10, q + 1))} className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-secondary"><Plus className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total estimado</span>
                <span className="font-display text-xl font-bold">{formatBRL((selectedBatch?.price_cents ?? 0) * qty)}</span>
              </div>

              <Button
                size="lg"
                className="mt-4 w-full rounded-xl"
                disabled={!selectedBatch}
                onClick={() => {
                  if (!selectedBatch) return;
                  const params = new URLSearchParams({
                    type: "event",
                    id: event.id,
                    batch: selectedBatch.id,
                    qty: String(qty),
                    title: event.title,
                    price: String(selectedBatch.price_cents),
                  });
                  navigate({ to: "/checkout", search: Object.fromEntries(params) as any });
                  toast.success("Vamos para o checkout");
                }}
              >
                Comprar ingresso
              </Button>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Pagamento processado com segurança pela PAGOU.
              </div>
            </div>
          </aside>
        </div>
        <div className="h-24" />
      </div>
    </SiteShell>
  );
}