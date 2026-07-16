import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Camera, Search } from "lucide-react";
import { useState } from "react";

type Status = "valid" | "used" | "invalid" | "cancelled" | null;

export const Route = createFileRoute("/checkin")({
  head: () => ({ meta: [{ title: "Check-in — PAGOU" }] }),
  component: CheckinPage,
});

function CheckinPage() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [log, setLog] = useState<{ code: string; at: string; result: Status }[]>([]);

  function validate() {
    const c = code.trim().toUpperCase();
    let s: Status = "invalid";
    if (c.startsWith("PGU-8")) s = "valid";
    else if (c.startsWith("PGU-U")) s = "used";
    else if (c.startsWith("PGU-C")) s = "cancelled";
    setStatus(s);
    setLog((prev) => [{ code: c, at: new Date().toLocaleTimeString("pt-BR"), result: s }, ...prev].slice(0, 8));
  }

  return (
    <SiteShell>
      <PageHeader eyebrow="Equipe de portaria" title="Check-in" subtitle="Leia o QR Code ou digite o código do ingresso." />
      <div className="mx-auto grid max-w-4xl gap-6 px-4 py-10 md:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
          <div className="aspect-square rounded-2xl bg-ink text-ink-foreground">
            <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-foreground/60">
              <Camera className="h-10 w-10" />
              <p className="text-sm">Câmera pronta para leitura</p>
              <Button size="sm" variant="secondary" className="rounded-full">Ativar câmera</Button>
            </div>
          </div>
          <div className="mt-6">
            <label className="text-sm font-medium">Ou digite o código</label>
            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PGU-XXXX" className="pl-9 font-mono uppercase" />
              </div>
              <Button onClick={validate}>Validar</Button>
            </div>
          </div>

          {status && (
            <div className={
              "mt-6 flex items-center gap-3 rounded-2xl p-4 " +
              (status === "valid" ? "bg-primary/10 text-primary" :
               status === "used" ? "bg-yellow-500/10 text-yellow-700" :
               "bg-destructive/10 text-destructive")
            }>
              {status === "valid" ? <CheckCircle2 className="h-6 w-6" /> :
               status === "used" ? <Clock className="h-6 w-6" /> :
               <XCircle className="h-6 w-6" />}
              <div>
                <p className="font-display font-bold">
                  {status === "valid" && "Ingresso válido"}
                  {status === "used" && "Ingresso já utilizado"}
                  {status === "cancelled" && "Ingresso cancelado"}
                  {status === "invalid" && "Código inexistente"}
                </p>
                <p className="text-xs opacity-80">Registrado às {new Date().toLocaleTimeString("pt-BR")}</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold">Últimas validações</h3>
          <ul className="mt-4 divide-y divide-border">
            {log.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Nenhuma leitura ainda.</li>}
            {log.map((l, i) => (
              <li key={i} className="flex items-center justify-between py-3 text-sm">
                <span className="font-mono">{l.code}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{l.at}</span>
                  <Badge variant="outline" className={
                    l.result === "valid" ? "border-primary/40 text-primary" :
                    l.result === "used" ? "border-yellow-500/40 text-yellow-700" :
                    "border-destructive/40 text-destructive"
                  }>{l.result}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SiteShell>
  );
}