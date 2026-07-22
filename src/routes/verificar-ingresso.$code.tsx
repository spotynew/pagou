import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle, Loader2, Ticket } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHeader } from "@/components/site/PageHeader";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTimeBR } from "@/lib/format";

export const Route = createFileRoute("/verificar-ingresso/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Verificar ingresso ${params.code} — PAGOU` },
      { name: "description", content: "Verificação pública de autenticidade de ingresso PAGOU." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VerifyTicketPage,
});

type VerifyRow = {
  ticket_id: string;
  code_suffix: string;
  status: string;
  sector: string | null;
  batch_name: string | null;
  event_title: string | null;
  event_starts_at: string | null;
  event_venue: string | null;
  checked_at: string | null;
};

function VerifyTicketPage() {
  const { code } = Route.useParams();
  const query = useQuery({
    queryKey: ["verify-ticket", code],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: VerifyRow[] | null; error: { message: string } | null }>)(
        "verify_ticket_public",
        { _code: code },
      );
      if (error) throw new Error(error.message);
      return (data && data[0]) || null;
    },
  });

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Verificação de ingresso"
        title="Autenticidade PAGOU"
        subtitle="Consulta pública. Esta página apenas verifica — não registra entrada."
      />
      <div className="mx-auto max-w-2xl px-4 py-10">
        {query.isPending ? (
          <div className="flex min-h-48 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Consultando…
          </div>
        ) : query.isError || !query.data ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <h2 className="font-display text-xl font-bold text-destructive">Ingresso inexistente</h2>
            <p className="text-sm text-muted-foreground">
              Este código não corresponde a nenhum ingresso PAGOU.
            </p>
          </div>
        ) : (
          <TicketCard ticket={query.data} />
        )}
      </div>
    </SiteShell>
  );
}

function TicketCard({ ticket }: { ticket: VerifyRow }) {
  const status = ticket.status;
  const tone =
    status === "valid"
      ? "border-primary/30 bg-primary/5 text-primary"
      : status === "used"
        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700"
        : "border-destructive/30 bg-destructive/10 text-destructive";
  const Icon = status === "valid" ? CheckCircle2 : status === "used" ? Clock : XCircle;
  const label =
    status === "valid"
      ? "Ingresso válido"
      : status === "used"
        ? "Ingresso já utilizado"
        : "Ingresso cancelado";

  return (
    <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated">
      <div className={`flex items-center gap-3 rounded-2xl border p-4 ${tone}`}>
        <Icon className="h-7 w-7" />
        <div>
          <p className="font-display text-lg font-bold">{label}</p>
          {ticket.checked_at && status === "used" && (
            <p className="text-xs opacity-80">
              Registrado em {formatDateTimeBR(ticket.checked_at)}
            </p>
          )}
        </div>
      </div>

      <dl className="mt-6 grid gap-4 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-widest text-muted-foreground">Evento</dt>
          <dd className="mt-1 font-display text-xl font-bold">
            {ticket.event_title ?? "Evento"}
          </dd>
        </div>
        {ticket.event_starts_at && (
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Data</dt>
            <dd className="mt-1">{formatDateTimeBR(ticket.event_starts_at)}</dd>
          </div>
        )}
        {ticket.event_venue && (
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Local</dt>
            <dd className="mt-1">{ticket.event_venue}</dd>
          </div>
        )}
        {(ticket.sector || ticket.batch_name) && (
          <div>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">Setor / lote</dt>
            <dd className="mt-1">
              {[ticket.sector, ticket.batch_name].filter(Boolean).join(" · ")}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-xs uppercase tracking-widest text-muted-foreground">
            Final do código
          </dt>
          <dd className="mt-1 flex items-center gap-2 font-mono">
            <Ticket className="h-4 w-4" /> ••••{ticket.code_suffix}
          </dd>
        </div>
      </dl>

      <p className="mt-6 rounded-2xl bg-secondary/60 p-4 text-xs text-muted-foreground">
        Esta página apenas verifica a autenticidade. O registro de entrada só é feito por equipe
        autorizada no aplicativo de check-in da PAGOU.
      </p>
    </div>
  );
}

function _unused() {
  return <Badge />;
}