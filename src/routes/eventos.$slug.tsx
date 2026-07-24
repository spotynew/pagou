import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createDraftOrder } from "@/lib/checkout.functions";
import { supabase } from "@/integrations/supabase/client";
import { eventBySlugQuery } from "@/lib/queries";
import { computeOrderFees } from "@/lib/pricing";
import { SiteShell } from "@/components/site/SiteShell";
import { DemoNotice } from "@/components/site/DemoNotice";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatBRL, formatDateTimeBR } from "@/lib/format";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Headphones,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Share2,
  ShieldCheck,
  Tag,
  TicketCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/eventos/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(eventBySlugQuery(params.slug));
    if (!data) throw notFound();
    return {
      title: data.event.title,
      description: data.event.description ?? "",
      coverUrl: data.event.cover_url,
    };
  },
  validateSearch: (s: Record<string, unknown>) =>
    z
      .object({
        batch: z.string().uuid().optional(),
        qty: z.coerce.number().int().min(1).max(10).optional(),
        buyNow: z.coerce.boolean().optional(),
      })
      .parse(s),
  head: ({ loaderData, params }) => {
    const title = loaderData?.title ?? "Evento";
    const desc = (
      loaderData?.description || "Garanta seu ingresso com pagamento seguro pela PAGOU."
    ).slice(0, 155);
    const url = `https://pagou.lovable.app/eventos/${params.slug}`;
    return {
      meta: [
        { title: `${title} — PAGOU` },
        { name: "description", content: desc },
        { property: "og:title", content: `${title} — PAGOU` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(loaderData?.coverUrl
          ? [
              { property: "og:image", content: loaderData.coverUrl },
              { name: "twitter:card", content: "summary_large_image" },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
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

function isBatchAvailable(batch: {
  active: boolean;
  quantity_total: number;
  quantity_sold: number;
  starts_at: string | null;
  ends_at: string | null;
}) {
  const now = Date.now();
  if (!batch.active || batch.quantity_total <= batch.quantity_sold) return false;
  if (batch.starts_at && new Date(batch.starts_at).getTime() > now) return false;
  if (batch.ends_at && new Date(batch.ends_at).getTime() < now) return false;
  return true;
}

function EventDetail() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const data = useSuspenseQuery(eventBySlugQuery(slug)).data!;
  const { event, ticketTypes } = data;
  const navigate = useNavigate();

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const allBatches = ticketTypes.flatMap((ticketType) =>
    (ticketType.ticket_batches ?? []).map((batch) => ({
      ...batch,
      ticketName: ticketType.name,
      sector: ticketType.sector,
      ticketDescription: ticketType.description,
    })),
  );
  const firstBatch = allBatches.find(isBatchAvailable);
  const requestedBatch = search.batch
    ? allBatches.find((batch) => batch.id === search.batch && isBatchAvailable(batch))
    : undefined;
  const [selectedBatchId, setSelectedBatchId] = useState<string | undefined>(
    requestedBatch?.id ?? firstBatch?.id,
  );
  const [qty, setQty] = useState<number>(search.qty ?? 1);

  const selectedBatch = allBatches.find((batch) => batch.id === selectedBatchId);
  const remaining = selectedBatch
    ? Math.max(0, selectedBatch.quantity_total - selectedBatch.quantity_sold)
    : 0;
  const maxAllowed = selectedBatch
    ? Math.max(1, Math.min(10, selectedBatch.max_per_order ?? 10, remaining))
    : 1;

  useEffect(() => {
    setQty((current) => Math.min(Math.max(1, current), maxAllowed));
  }, [maxAllowed, selectedBatchId]);

  const subtotalCents = (selectedBatch?.price_cents ?? 0) * qty;
  const { platformFeeCents: serviceFeeCents, totalCents } = computeOrderFees(
    subtotalCents,
    0,
    "pix",
  );

  const createDraft = useServerFn(createDraftOrder);
  const startCheckout = useMutation({
    mutationFn: async () => {
      if (!selectedBatch) throw new Error("Escolha um lote");
      return createDraft({
        data: {
          kind: "event",
          eventId: event.id,
          ticketBatchId: selectedBatch.id,
          quantity: qty,
        },
      });
    },
    onSuccess: ({ orderId }) => navigate({ to: "/checkout/$orderId", params: { orderId } }),
    onError: (error: unknown) =>
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar o checkout. Tente novamente.",
      ),
  });

  function handleBuyClick() {
    if (!selectedBatch || !isBatchAvailable(selectedBatch)) {
      toast.error("Escolha um lote disponível para continuar.");
      return;
    }
    if (authLoading) return;
    if (!userId) {
      const params = new URLSearchParams({
        batch: selectedBatch.id,
        qty: String(qty),
        buyNow: "1",
      });
      const destination = `/eventos/${slug}?${params.toString()}`;
      navigate({ to: "/auth", search: { redirect: destination } });
      return;
    }
    startCheckout.mutate();
  }

  const autoFired = useRef(false);
  useEffect(() => {
    if (!search.buyNow || autoFired.current) return;
    if (authLoading || !userId || !selectedBatch || !isBatchAvailable(selectedBatch)) return;
    autoFired.current = true;
    startCheckout.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.buyNow, selectedBatch?.id, authLoading, userId]);

  async function shareEvent() {
    const shareData = {
      title: event.title,
      text: `Confira ${event.title} na PAGOU`,
      url: window.location.href,
    };
    if (navigator.share) {
      await navigator.share(shareData).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Link do evento copiado.");
  }

  const eventDate = event.ends_at
    ? `${formatDateTimeBR(event.starts_at)} até ${formatDateTimeBR(event.ends_at)}`
    : formatDateTimeBR(event.starts_at);
  const fullAddress = [event.address, event.city].filter(Boolean).join(", ");
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  return (
    <SiteShell>
      <div className="border-b border-border bg-secondary/35">
        <div className="mx-auto max-w-7xl px-4 py-7 md:py-10">
          <div className="aspect-[16/7] overflow-hidden rounded-2xl border border-border bg-ink shadow-elevated">
            {event.cover_url ? (
              <img
                src={event.cover_url}
                alt={`Capa do evento ${event.title}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center px-6 text-center text-white">
                <p className="font-display text-3xl font-bold md:text-5xl">{event.title}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_390px]">
        <main className="min-w-0">
          <DemoNotice />
          <div className="flex flex-wrap items-center justify-between gap-3">
            {event.category ? (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                {event.category}
              </span>
            ) : (
              <span />
            )}
            <Button variant="outline" size="sm" className="rounded-full" onClick={shareEvent}>
              <Share2 className="mr-2 h-4 w-4" /> Compartilhar
            </Button>
          </div>

          <h1 className="mt-5 max-w-4xl font-display text-3xl font-bold leading-tight md:text-5xl">
            {event.title}
          </h1>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <InfoCard icon={CalendarDays} title="Data e horário" text={eventDate} />
            <InfoCard
              icon={MapPin}
              title="Local"
              text={`${event.venue}${event.city ? ` · ${event.city}` : ""}`}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {event.age_rating && (
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2">
                <Tag className="h-4 w-4 text-primary" /> Classificação: {event.age_rating}
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Compra protegida pela PAGOU
            </span>
          </div>

          <Section title="Sobre o evento">
            {event.description ? (
              <p className="whitespace-pre-line text-base leading-8 text-foreground/85">
                {event.description}
              </p>
            ) : (
              <p className="text-muted-foreground">O organizador ainda não adicionou a descrição.</p>
            )}
          </Section>

          <Section title="Local do evento">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 flex-none text-primary" />
                <div>
                  <p className="font-semibold">{event.venue}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{fullAddress}</p>
                  {fullAddress && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                    >
                      Abrir no Google Maps <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Informações importantes">
            <div className="grid gap-4 sm:grid-cols-2">
              <TrustCard
                icon={TicketCheck}
                title="Entrada com QR Code"
                text="O ingresso fica disponível em Minhas compras após a confirmação do pagamento."
              />
              <TrustCard
                icon={RotateCcw}
                title="Cancelamento e reembolso"
                text="Solicitações seguem os Termos de Uso e as condições informadas pelo organizador."
              />
              <TrustCard
                icon={Clock3}
                title="Confirmação do Pix"
                text="O pagamento é consultado automaticamente até a confirmação da compra."
              />
              <TrustCard
                icon={Headphones}
                title="Suporte identificado"
                text="Em caso de problema, use os canais oficiais exibidos pela PAGOU."
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Ao continuar, você concorda com os{" "}
              <Link to="/termos" className="font-medium text-primary hover:underline">
                Termos de Uso
              </Link>{" "}
              da plataforma.
            </p>
          </Section>

          <Section title="Organizado por">
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">{event.producer_name || "Organizador do evento"}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Produtor aprovado para publicar na
                  PAGOU
                </p>
              </div>
            </div>
          </Section>
        </main>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
            <h2 className="font-display text-2xl font-bold">Ingressos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecione o lote e confira o valor final antes de continuar.
            </p>

            <div className="mt-5 space-y-3">
              {allBatches.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  Nenhum ingresso disponível no momento.
                </div>
              )}
              {allBatches.map((batch) => {
                const batchRemaining = Math.max(0, batch.quantity_total - batch.quantity_sold);
                const available = isBatchAvailable(batch);
                const active = selectedBatchId === batch.id;
                return (
                  <button
                    key={batch.id}
                    type="button"
                    disabled={!available}
                    onClick={() => {
                      setSelectedBatchId(batch.id);
                      setQty(1);
                    }}
                    className={
                      "w-full rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 " +
                      (active
                        ? "border-primary bg-primary/5 shadow-card"
                        : "border-border hover:border-primary/50")
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{batch.ticketName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[batch.sector, batch.name].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <p className="font-display text-lg font-bold">{formatBRL(batch.price_cents)}</p>
                    </div>
                    {batch.ticketDescription && (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {batch.ticketDescription}
                      </p>
                    )}
                    <p className="mt-2 text-xs font-medium text-muted-foreground">
                      {available ? `${batchRemaining} disponíveis` : "Indisponível"}
                    </p>
                  </button>
                );
              })}
            </div>

            {selectedBatch && (
              <>
                <div className="mt-5 flex items-center justify-between rounded-xl border border-border p-3">
                  <span className="text-sm font-medium">Quantidade</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Diminuir quantidade"
                      onClick={() => setQty((current) => Math.max(1, current - 1))}
                      className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-secondary"
                    >
                      <Minus className="h-4 w-4" aria-hidden />
                    </button>
                    <span className="w-6 text-center font-semibold">{qty}</span>
                    <button
                      type="button"
                      aria-label="Aumentar quantidade"
                      onClick={() => setQty((current) => Math.min(maxAllowed, current + 1))}
                      disabled={qty >= maxAllowed}
                      className="grid h-8 w-8 place-items-center rounded-full border border-border hover:bg-secondary disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <PriceRow label="Ingressos" value={formatBRL(subtotalCents)} />
                  <PriceRow label="Taxa de serviço" value={formatBRL(serviceFeeCents)} />
                  <Separator />
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-display text-2xl font-bold">{formatBRL(totalCents)}</span>
                  </div>
                </div>
              </>
            )}

            <Button
              size="lg"
              className="mt-5 w-full rounded-xl"
              disabled={
                !selectedBatch ||
                !isBatchAvailable(selectedBatch) ||
                authLoading ||
                startCheckout.isPending
              }
              onClick={handleBuyClick}
            >
              {authLoading
                ? "Carregando…"
                : startCheckout.isPending
                  ? "Reservando…"
                  : "Comprar ingresso"}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Este é o mesmo total que aparecerá no checkout.
            </p>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary/50 p-3 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-primary" />
              Pagamento processado com segurança. A PAGOU nunca solicita senha bancária ou código de
              acesso.
            </div>
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}

function InfoCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof CalendarDays;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="mt-1 font-medium leading-6">{text}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-border pt-9">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TrustCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border p-5">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
