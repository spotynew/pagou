import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Zap, BarChart3, Ticket } from "lucide-react";
import { SellerApplicationForm } from "@/components/account/SellerApplicationForm";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/vender")({
  head: () => ({
    meta: [
      { title: "Venda com a PAGOU — Bilheteria online" },
      {
        name: "description",
        content:
          "Cadastre seu evento, curso ou produto digital e receba via PIX em minutos. Bilheteria completa com QR Code, cupons e relatórios.",
      },
      { property: "og:title", content: "Venda com a PAGOU" },
      { property: "og:description", content: "Bilheteria online completa para produtores." },
    ],
  }),
  component: SellerLanding,
});

function SellerLanding() {
  const user = useQuery({
    queryKey: ["seller-onboarding-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
  return (
    <SiteShell>
      <section className="bg-gradient-primary">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div className="text-black">
            <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
              Para produtores
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold md:text-6xl">
              Venda de forma simples, segura e profissional.
            </h1>
            <p className="mt-4 max-w-xl text-black/80 md:text-lg">
              Cadastre em minutos, receba os repasses conforme o meio de pagamento e acompanhe tudo
              em um painel feito para quem produz.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="rounded-full">
                <Link to="/auth">Criar conta grátis</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-black/30 bg-transparent text-black hover:bg-black/10"
              >
                <Link to="/produtor">Acessar painel do produtor</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                icon: Zap,
                title: "PIX e cartão",
                desc: "Aceite PIX e cartão sem integrar credenciais no site.",
              },
              { icon: Ticket, title: "QR Code próprio", desc: "Check-in pelo celular, sem fila." },
              {
                icon: BarChart3,
                title: "Relatórios de vendas",
                desc: "Vendas por lote, setor e cupom.",
              },
              {
                icon: Ticket,
                title: "Gestão de lotes e setores",
                desc: "Organize sua bilheteria por lote e setor.",
              },
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
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 font-display text-primary">
                {i + 1}
              </span>
              <p className="mt-4 font-medium">{t}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-16 max-w-3xl" id="cadastro-produtor">
          {user.data ? (
            <SellerApplicationForm />
          ) : (
            <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-card">
              <h3 className="font-display text-2xl font-bold">Comece criando sua conta</h3>
              <p className="mt-2 text-muted-foreground">
                Depois do cadastro pessoal, você poderá enviar os dados da sua operação para
                análise.
              </p>
              <Button asChild className="mt-5">
                <Link to="/auth" search={{ redirect: "/vender#cadastro-produtor" }}>
                  Criar conta de produtor
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
