import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ComponentProps } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/lib/format";
import {
  createProducerEvent,
  listProducerEvents,
  setProducerEventPublished,
  updateProducerEventCover,
} from "@/lib/producer.functions";
import {
  EventCoverUploader,
  extractEventCoverPath,
  type UploadedCover,
} from "@/components/producer/EventCoverUploader";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, CircleAlert, ImageIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/produtor/eventos")({
  component: ProducerEvents,
});

function ProducerEvents() {
  const queryClient = useQueryClient();
  const loadEvents = useServerFn(listProducerEvents);
  const createEvent = useServerFn(createProducerEvent);
  const setPublished = useServerFn(setProducerEventPublished);
  const updateCover = useServerFn(updateProducerEventCover);
  const [showForm, setShowForm] = useState(false);
  const eventsQuery = useQuery({ queryKey: ["producer-events"], queryFn: () => loadEvents() });
  const sellerId = eventsQuery.data?.sellerId;
  const events = eventsQuery.data?.events ?? [];
  const create = useMutation({
    mutationFn: (data: EventFormData) => createEvent({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["producer-events"] });
      await queryClient.invalidateQueries({ queryKey: ["producer-dashboard"] });
      setShowForm(false);
      toast.success("Evento criado como rascunho.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const publish = useMutation({
    mutationFn: (data: { eventId: string; published: boolean }) => setPublished({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["producer-events"] }),
    onError: (error: Error) => toast.error(error.message),
  });
  const coverMutation = useMutation({
    mutationFn: (data: { eventId: string; coverUrl: string | null; previousPath: string | null }) =>
      updateCover({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["producer-events"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function handleEventCoverChange(
    eventId: string,
    previousUrl: string | null,
    next: UploadedCover | null,
  ) {
    const previousPath = extractEventCoverPath(previousUrl);
    try {
      await coverMutation.mutateAsync({
        eventId,
        coverUrl: next?.url ?? null,
        previousPath,
      });
      toast.success(next ? "Capa atualizada." : "Capa removida.");
    } catch {
      if (next?.path) {
        await supabase.storage
          .from("event-covers")
          .remove([next.path])
          .catch(() => {});
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Catálogo</p>
          <h1 className="font-display text-3xl font-bold">Eventos</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre uma página completa, transparente e pronta para vender.
          </p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>
          {showForm ? "Fechar formulário" : "Novo evento"}
        </Button>
      </div>

      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5">
        <div className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-primary" />
          <div>
            <p className="font-semibold">Padrão mínimo para publicação</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Capa profissional, descrição com pelo menos 80 caracteres, endereço completo, dados
              verificados do produtor e um lote ativo. Isso reduz dúvidas e aumenta a confiança do
              comprador.
            </p>
          </div>
        </div>
      </div>

      {showForm && (
        <EventForm
          sellerId={sellerId}
          pending={create.isPending}
          onSubmit={(data) => create.mutate(data)}
        />
      )}

      <div className="space-y-4">
        {eventsQuery.isPending && (
          <p className="text-sm text-muted-foreground">Carregando eventos…</p>
        )}
        {!eventsQuery.isPending && events.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum evento cadastrado nesta conta.
          </p>
        )}
        {events.map((event) => {
          const batches = event.ticket_types.flatMap((type) => type.ticket_batches);
          const coverValue: UploadedCover | null = event.cover_url
            ? { url: event.cover_url, path: extractEventCoverPath(event.cover_url) ?? "" }
            : null;
          const pageReady = Boolean(
            event.cover_url &&
            event.address &&
            event.venue &&
            event.city &&
            (event.description?.trim().length ?? 0) >= 80 &&
            batches.some((batch) => batch.active && batch.quantity_total > batch.quantity_sold),
          );
          return (
            <div
              key={event.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex flex-wrap items-start gap-4">
                <div className="h-20 w-32 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                  {event.cover_url ? (
                    <img
                      src={event.cover_url}
                      alt={`Capa de ${event.title}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold">{event.title}</h2>
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                      {event.published ? "Publicado" : "Rascunho"}
                    </span>
                    <span
                      className={
                        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs " +
                        (pageReady
                          ? "bg-primary/10 text-primary"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300")
                      }
                    >
                      {pageReady ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <CircleAlert className="h-3.5 w-3.5" />
                      )}
                      {pageReady ? "Página completa" : "Revisão necessária"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(event.starts_at).toLocaleString("pt-BR")} · {event.venue},{" "}
                    {event.city}
                  </p>
                  <p className="mt-2 text-sm">
                    {batches
                      .map((batch) => `${batch.name}: ${formatBRL(batch.price_cents)}`)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {event.published && (
                    <Button asChild size="sm" variant="outline">
                      <a href={`/eventos/${event.slug}`} target="_blank" rel="noreferrer">
                        Ver página
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={event.published ? "outline" : "default"}
                    disabled={publish.isPending}
                    onClick={() =>
                      publish.mutate({ eventId: event.id, published: !event.published })
                    }
                  >
                    {event.published ? "Despublicar" : "Publicar"}
                  </Button>
                </div>
              </div>
              <div className="mt-4 max-w-md">
                <EventCoverUploader
                  sellerId={sellerId}
                  value={coverValue}
                  onChange={(next) => handleEventCoverChange(event.id, event.cover_url, next)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type EventFormData = {
  title: string;
  description: string;
  coverUrl?: string;
  category?: string;
  city: string;
  venue: string;
  address: string;
  startsAt: string;
  endsAt?: string;
  ageRating?: string;
  ticketName: string;
  sector?: string;
  ticketDescription: string;
  batchName: string;
  priceCents: number;
  quantityTotal: number;
  maxPerOrder: number;
  salesStartsAt?: string;
  salesEndsAt?: string;
};

function EventForm({
  sellerId,
  pending,
  onSubmit,
}: {
  sellerId: string | undefined;
  pending: boolean;
  onSubmit: (data: EventFormData) => void;
}) {
  const [cover, setCover] = useState<UploadedCover | null>(null);

  const toOptionalIso = (form: FormData, name: string) => {
    const value = String(form.get(name) || "").trim();
    return value ? new Date(value).toISOString() : undefined;
  };

  return (
    <form
      className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-card md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSubmit({
          title: String(form.get("title")),
          description: String(form.get("description")),
          coverUrl: cover?.url || "",
          category: String(form.get("category") || ""),
          city: String(form.get("city")),
          venue: String(form.get("venue")),
          address: String(form.get("address")),
          startsAt: new Date(String(form.get("startsAt"))).toISOString(),
          endsAt: toOptionalIso(form, "endsAt"),
          ageRating: String(form.get("ageRating") || ""),
          ticketName: String(form.get("ticketName")),
          sector: String(form.get("sector") || ""),
          ticketDescription: String(form.get("ticketDescription")),
          batchName: String(form.get("batchName")),
          priceCents: Math.round(Number(form.get("price")) * 100),
          quantityTotal: Number(form.get("quantityTotal")),
          maxPerOrder: Number(form.get("maxPerOrder")),
          salesStartsAt: toOptionalIso(form, "salesStartsAt"),
          salesEndsAt: toOptionalIso(form, "salesEndsAt"),
        });
      }}
    >
      <div className="md:col-span-2">
        <p className="font-display text-xl font-semibold">Informações do evento</p>
        <p className="text-sm text-muted-foreground">
          Estes dados aparecem na página pública e precisam transmitir segurança.
        </p>
      </div>
      <Field label="Nome do evento" name="title" minLength={5} required />
      <Field label="Categoria" name="category" placeholder="Show, teatro, congresso…" />
      <div className="md:col-span-2">
        <Label htmlFor="event-description">Descrição completa</Label>
        <Textarea
          id="event-description"
          name="description"
          minLength={80}
          required
          rows={8}
          placeholder="Explique o que vai acontecer, atrações, horários, experiência, regras importantes e o que o ingresso inclui."
        />
        <p className="mt-1 text-xs text-muted-foreground">Mínimo de 80 caracteres.</p>
      </div>
      <div className="md:col-span-2">
        <Label>Capa do evento</Label>
        <EventCoverUploader
          sellerId={sellerId}
          value={cover}
          onChange={setCover}
          onDeletePrevious={(path) => {
            void supabase.storage.from("event-covers").remove([path]);
          }}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Pode salvar o rascunho sem imagem, mas a capa será obrigatória para publicar.
        </p>
      </div>
      <Field label="Início" name="startsAt" type="datetime-local" required />
      <Field label="Encerramento" name="endsAt" type="datetime-local" />
      <Field label="Cidade" name="city" required />
      <Field label="Local" name="venue" required />
      <div className="md:col-span-2">
        <Field
          label="Endereço completo"
          name="address"
          placeholder="Rua, número, bairro e referência"
          minLength={5}
          required
        />
      </div>
      <Field label="Classificação etária" name="ageRating" placeholder="Livre, 18 anos…" />

      <div className="mt-4 border-t border-border pt-5 md:col-span-2">
        <p className="font-display text-xl font-semibold">Ingresso e primeiro lote</p>
        <p className="text-sm text-muted-foreground">
          Explique exatamente o que o comprador recebe.
        </p>
      </div>
      <Field label="Tipo do ingresso" name="ticketName" defaultValue="Ingresso" required />
      <Field label="Setor" name="sector" placeholder="Pista, plateia, VIP…" />
      <div className="md:col-span-2">
        <Label htmlFor="event-ticket-description">Descrição do ingresso</Label>
        <Textarea
          id="event-ticket-description"
          name="ticketDescription"
          minLength={10}
          required
          rows={3}
          placeholder="Ex.: acesso à pista comum, entrada única e apresentação do QR Code na portaria."
        />
      </div>
      <Field label="Nome do lote" name="batchName" defaultValue="1º lote" required />
      <Field label="Preço (R$)" name="price" type="number" min="1" step="0.01" required />
      <Field
        label="Quantidade disponível"
        name="quantityTotal"
        type="number"
        min="1"
        defaultValue="100"
        required
      />
      <Field
        label="Máximo por pedido"
        name="maxPerOrder"
        type="number"
        min="1"
        max="10"
        defaultValue="8"
        required
      />
      <Field label="Início das vendas" name="salesStartsAt" type="datetime-local" />
      <Field label="Fim das vendas" name="salesEndsAt" type="datetime-local" />
      <div className="md:col-span-2">
        <Button disabled={pending}>{pending ? "Criando…" : "Criar evento como rascunho"}</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & ComponentProps<typeof Input>) {
  const id = `event-${name}`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} {...props} />
    </div>
  );
}
