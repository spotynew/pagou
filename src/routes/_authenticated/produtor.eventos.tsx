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
import { ImageIcon } from "lucide-react";

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
    mutationFn: (data: {
      eventId: string;
      coverUrl: string | null;
      previousPath: string | null;
    }) => updateCover({ data }),
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
      // If DB update failed and we just uploaded a new file, clean it up.
      if (next?.path) {
        await supabase.storage.from("event-covers").remove([next.path]).catch(() => {});
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
            Crie o evento, o ingresso e o primeiro lote.
          </p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>
          {showForm ? "Fechar formulário" : "Novo evento"}
        </Button>
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
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-semibold">{event.title}</h2>
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                      {event.published ? "Publicado" : "Rascunho"}
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
  description?: string;
  coverUrl?: string;
  category?: string;
  city: string;
  venue: string;
  address: string;
  startsAt: string;
  ageRating?: string;
  ticketName: string;
  sector?: string;
  batchName: string;
  priceCents: number;
  quantityTotal: number;
  maxPerOrder: number;
};

function EventForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (data: EventFormData) => void;
}) {
  return (
    <form
      className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-card md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSubmit({
          title: String(form.get("title")),
          description: String(form.get("description") || ""),
          coverUrl: String(form.get("coverUrl") || ""),
          category: String(form.get("category") || ""),
          city: String(form.get("city")),
          venue: String(form.get("venue")),
          address: String(form.get("address")),
          startsAt: new Date(String(form.get("startsAt"))).toISOString(),
          ageRating: String(form.get("ageRating") || ""),
          ticketName: String(form.get("ticketName")),
          sector: String(form.get("sector") || ""),
          batchName: String(form.get("batchName")),
          priceCents: Math.round(Number(form.get("price")) * 100),
          quantityTotal: Number(form.get("quantityTotal")),
          maxPerOrder: Number(form.get("maxPerOrder")),
        });
      }}
    >
      <Field label="Nome do evento" name="title" required />
      <Field label="Categoria" name="category" placeholder="Show, teatro, congresso…" />
      <div className="md:col-span-2">
        <Label htmlFor="event-description">Descrição</Label>
        <Textarea id="event-description" name="description" />
      </div>
      <Field label="URL da capa" name="coverUrl" type="url" />
      <Field label="Data e hora" name="startsAt" type="datetime-local" required />
      <Field label="Cidade" name="city" required />
      <Field label="Local" name="venue" required />
      <div className="md:col-span-2">
        <Field label="Endereço" name="address" required />
      </div>
      <Field label="Classificação etária" name="ageRating" placeholder="Livre, 18 anos…" />
      <Field label="Tipo do ingresso" name="ticketName" defaultValue="Ingresso" required />
      <Field label="Setor" name="sector" placeholder="Pista, plateia, VIP…" />
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
