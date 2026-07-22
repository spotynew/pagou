import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Camera, Search, CameraOff, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { redeemTicket, type CheckinResult } from "@/lib/checkin.functions";
import { RoleGate } from "@/components/auth/RoleGate";
import { supabase } from "@/integrations/supabase/client";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { formatDateTimeBR } from "@/lib/format";

type Status = CheckinResult["result"] | null;

export const Route = createFileRoute("/_authenticated/checkin")({
  head: () => ({
    meta: [{ title: "Check-in — PAGOU" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: CheckinRoute,
});

function CheckinRoute() {
  return (
    <RoleGate allowed={["checkin_staff", "admin"]}>
      <CheckinPage />
    </RoleGate>
  );
}

function QrScanner({
  onDetected,
  pauseWhen,
}: {
  onDetected: (value: string) => void;
  pauseWhen: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastValueRef = useRef<{ value: string; at: number } | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const reader = new BrowserQRCodeReader();
    (async () => {
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (!result || pauseWhen) return;
            const text = result.getText();
            const now = Date.now();
            if (
              lastValueRef.current &&
              lastValueRef.current.value === text &&
              now - lastValueRef.current.at < 2500
            ) {
              return;
            }
            lastValueRef.current = { value: text, at: now };
            onDetected(text);
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível acessar a câmera");
        setActive(false);
      }
    })();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [active, onDetected, pauseWhen]);

  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl bg-ink text-ink-foreground">
      <video
        ref={videoRef}
        className={"h-full w-full object-cover " + (active ? "" : "hidden")}
        muted
        playsInline
      />
      {!active && (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-foreground/70">
          <Camera className="h-10 w-10" />
          <p className="text-sm">
            {error ? error : "Ative a câmera para ler o QR do ingresso"}
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full"
            onClick={() => {
              setError(null);
              setActive(true);
            }}
          >
            Ativar câmera
          </Button>
        </div>
      )}
      {active && (
        <button
          type="button"
          onClick={() => setActive(false)}
          className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs text-white"
          aria-label="Desativar câmera"
        >
          <CameraOff className="h-3.5 w-3.5" /> Parar
        </button>
      )}
    </div>
  );
}

function CheckinPage() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [current, setCurrent] = useState<CheckinResult | null>(null);
  const [log, setLog] = useState<{ code: string; at: string; result: Status }[]>([]);
  const redeem = useServerFn(redeemTicket);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  type Preview = {
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

  const preview = useQuery({
    queryKey: ["verify-ticket-preview", pendingCode],
    enabled: !!pendingCode,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: Preview[] | null; error: { message: string } | null }>)(
        "verify_ticket_public",
        { _code: pendingCode! },
      );
      if (error) throw new Error(error.message);
      return (data && data[0]) || null;
    },
  });

  const validation = useMutation({
    mutationFn: (ticketCode: string) => redeem({ data: { code: ticketCode } }),
    onSuccess: (result) => {
      setCurrent(result);
      setStatus(result.result);
      setLog((prev) =>
        [
          {
            code: (pendingCode ?? code).trim().toUpperCase(),
            at: new Date(result.checked_at ?? Date.now()).toLocaleTimeString("pt-BR"),
            result: result.result,
          },
          ...prev,
        ].slice(0, 8),
      );
      if (result.result === "accepted") {
        toast.success("Entrada liberada");
        setCode("");
        setPendingCode(null);
      }
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Falha ao validar ingresso"),
  });

  function extractCode(raw: string): string {
    const trimmed = raw.trim();
    // Support full URL /verificar-ingresso/CODE
    const match = trimmed.match(/verificar-ingresso\/([^/?#]+)/i);
    const value = match ? decodeURIComponent(match[1]) : trimmed;
    return value.toUpperCase();
  }

  function loadPreview() {
    const c = extractCode(code);
    if (c.length < 6) return;
    setStatus(null);
    setCurrent(null);
    setPendingCode(c);
  }

  function confirmEntry() {
    if (!pendingCode || validation.isPending) return;
    validation.mutate(pendingCode);
  }

  function handleScanned(raw: string) {
    const c = extractCode(raw);
    if (c.length < 6) return;
    setCode(c);
    setStatus(null);
    setCurrent(null);
    setPendingCode(c);
  }

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Equipe de portaria"
        title="Check-in"
        subtitle="Leia o QR Code ou digite o código do ingresso."
      />
      <div className="mx-auto grid max-w-4xl gap-6 px-4 py-10 md:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
          <QrScanner onDetected={handleScanned} pauseWhen={!!pendingCode} />
          <div className="mt-6">
            <label className="text-sm font-medium">Ou digite o código</label>
            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="PGU-XXXX"
                  className="pl-9 font-mono uppercase"
                />
              </div>
              <Button onClick={loadPreview} disabled={code.trim().length < 6}>
                Consultar
              </Button>
            </div>
          </div>

          {pendingCode && (
            <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-4">
              {preview.isPending ? (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Consultando ingresso…
                </div>
              ) : preview.isError || !preview.data ? (
                <div className="text-sm text-destructive">Ingresso inexistente.</div>
              ) : (
                <div className="space-y-2 text-sm">
                  <p className="font-display text-base font-bold">
                    {preview.data.event_title ?? "Evento"}
                  </p>
                  {preview.data.event_starts_at && (
                    <p className="text-muted-foreground">
                      {formatDateTimeBR(preview.data.event_starts_at)}
                    </p>
                  )}
                  {preview.data.event_venue && (
                    <p className="text-muted-foreground">{preview.data.event_venue}</p>
                  )}
                  {(preview.data.sector || preview.data.batch_name) && (
                    <p>
                      {[preview.data.sector, preview.data.batch_name].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <p className="font-mono text-xs">••••{preview.data.code_suffix}</p>
                  <Badge
                    variant="outline"
                    className={
                      preview.data.status === "valid"
                        ? "border-primary/40 text-primary"
                        : preview.data.status === "used"
                          ? "border-yellow-500/40 text-yellow-700"
                          : "border-destructive/40 text-destructive"
                    }
                  >
                    {preview.data.status}
                  </Badge>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button
                  onClick={confirmEntry}
                  disabled={
                    validation.isPending ||
                    !preview.data ||
                    preview.data.status !== "valid"
                  }
                  className="flex-1"
                >
                  {validation.isPending ? "Confirmando…" : "CONFIRMAR ENTRADA"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPendingCode(null);
                    setCurrent(null);
                    setStatus(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {status && (
            <div
              className={
                "mt-6 flex items-center gap-3 rounded-2xl p-4 " +
                (status === "accepted"
                  ? "bg-primary/10 text-primary"
                  : status === "used"
                    ? "bg-yellow-500/10 text-yellow-700"
                    : "bg-destructive/10 text-destructive")
              }
            >
              {status === "accepted" ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : status === "used" ? (
                <Clock className="h-6 w-6" />
              ) : (
                <XCircle className="h-6 w-6" />
              )}
              <div>
                <p className="font-display font-bold">
                  {status === "accepted" && "Entrada liberada"}
                  {status === "used" && "Ingresso já utilizado"}
                  {status === "cancelled" && "Ingresso cancelado"}
                  {status === "invalid" && "Código inexistente"}
                  {status === "unauthorized" && "Sem autorização para este evento"}
                </p>
                {current?.event_title && (
                  <p className="text-xs opacity-80">
                    {current.event_title}
                    {current.sector ? ` · ${current.sector}` : ""}
                  </p>
                )}
                <p className="text-xs opacity-80">
                  Registrado às{" "}
                  {new Date(current?.checked_at ?? Date.now()).toLocaleTimeString("pt-BR")}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold">Últimas validações</h3>
          <ul className="mt-4 divide-y divide-border">
            {log.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma leitura ainda.
              </li>
            )}
            {log.map((l, i) => (
              <li key={i} className="flex items-center justify-between py-3 text-sm">
                <span className="font-mono">{l.code}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{l.at}</span>
                  <Badge
                    variant="outline"
                    className={
                      l.result === "accepted"
                        ? "border-primary/40 text-primary"
                        : l.result === "used"
                          ? "border-yellow-500/40 text-yellow-700"
                          : "border-destructive/40 text-destructive"
                    }
                  >
                    {l.result}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SiteShell>
  );
}
