import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Zap, BarChart3, Ticket, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/vender")({
  head: () => ({
    meta: [
      { title: "Venda com a PAGOU — Bilheteria online" },
      { name: "description", content: "Cadastre seu evento, curso ou produto digital e receba via PIX em minutos. Bilheteria completa com QR Code, cupons e relatórios." },
      { property: "og:title", content: "Venda com a PAGOU" },
      { property: "og:description", content: "A bilheteria online com cara de fintech." },
    ],
  }),
  component: SellerLanding,
});

function SellerLanding() {
  return (
    <SiteShell>
      <section className="bg-gradient-primary">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div className="text-black">
            <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">Para produtores</span>
            <h1 className="mt-4 font-display text-4xl font-bold md:text-6xl">Venda como uma fintech vende.</h1>
            <p className="mt-4 max-w-xl text-black/80 md:text-lg">
              Cadastre em minutos, receba via PIX na hora e acompanhe tudo em um painel feito para quem produz.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="rounded-full">
                <Link to="/auth">Criar conta grátis</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-black/30 bg-transparent text-black hover:bg-black/10">
                <Link to="/produtor">Ver painel demo</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Zap, title: "PIX na hora", desc: "Receba assim que o pagamento é aprovado." },
              { icon: Ticket, title: "QR Code próprio", desc: "Check-in pelo celular, sem fila." },
              { icon: BarChart3, title: "Relatórios ao vivo", desc: "Vendas por lote, setor e cupom." },
              { icon: ShieldCheck, title: "Anti-fraude", desc: "Ingresso único, uso único." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl bg-white/95 p-5">
                <f.icon className="h-6 w-6 text-primary" />
                <p className="mt-3 font-display font-semibold text-foreground">{f.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="font-display text-3xl font-bold">Simples de começar</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            "Crie sua conta de produtor em 2 minutos.",
            "Cadastre seu evento, curso ou produto digital.",
            "Compartilhe o link e comece a vender.",
          ].map((t, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 font-display text-primary">{i + 1}</span>
              <p className="mt-4 font-medium">{t}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          {["Taxa transparente", "Sem mensalidade", "Suporte humano"].map((tag) => (
            <span key={tag} className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" /> {tag}
            </span>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}