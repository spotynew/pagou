import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CreditCard,
  Globe2,
  Landmark,
  QrCode,
  ShieldCheck,
  TicketCheck,
  WalletCards,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { SellerApplicationForm } from "@/components/account/SellerApplicationForm";
import { Button } from "@/components/ui/button";
import { COMPANY } from "@/lib/company";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/vender")({
  head: () => ({
    meta: [
      { title: "Venda com a PAGOU — Sua operação de vendas" },
      {
        name: "description",
        content:
          "Página de vendas, PIX, ingressos com QR Code, check-in, cursos e recebimento direto na sua conta Mercado Pago.",
      },
      { property: "og:title", content: "Venda com a PAGOU" },
      {
        property: "og:description",
        content: "Sua página, sua marca, seus clientes e seu dinheiro direto na sua conta.",
      },
    ],
  }),
  component: SellerLanding,
});

const directPlans = [
  {
    name: "Start",
    price: "299",
    description: "Para quem está começando a vender com estrutura profissional.",
    limit: "Até R$ 10 mil/mês ou 200 vendas",
    features: [
      "1 evento ou curso ativo",
      "Subdomínio PAGOU",
      "Ingresso com QR Code",
      "Painel de vendas",
      "1 administrador",
    ],
  },
  {
    name: "Pro",
    price: "499",
    description: "Para operações frequentes que precisam de mais autonomia.",
    limit: "Até R$ 25 mil/mês ou 1.000 vendas",
    features: [
      "Até 3 eventos ou cursos ativos",
      "Domínio próprio",
      "Lotes e cupons",
      "Reenvio de ingresso",
      "2 administradores",
    ],
  },
  {
    name: "Growth",
    price: "990",
    description: "Para produtores em crescimento com eventos e cursos.",
    limit: "Até R$ 50 mil/mês ou 3.000 vendas",
    features: [
      "Eventos e cursos",
      "Área de membros",
      "Marca própria",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
  },
  {
    name: "Gestão própria",
    price: "1.950",
    description: "Uma operação completa de vendas com implantação assistida.",
    limit: "Até R$ 100 mil/mês ou 10.000 vendas",
    setup: "Implantação a partir de R$ 2.500",
    featured: true,
    features: [
      "White-label completo",
      "Páginas de vendas",
      "Eventos e cursos",
      "Até 10 administradores",
      "Treinamento e suporte",
    ],
  },
];

function SellerLanding() {
  const user = useQuery({
    queryKey: ["seller-onboarding-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  return (
    <SiteShell>
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-[1.15fr_0.85fr] md:py-28">
          <div className="flex flex-col justify-center">
            <span className="w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Venda com a sua marca
            </span>
            <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.08] md:text-6xl">
              Sua página. Seus clientes. <span className="text-primary">Seu dinheiro.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              A PAGOU reúne página de vendas, checkout, ingresso digital, QR Code, check-in, cursos
              e gestão. Comece com nosso gateway ou conecte sua conta Mercado Pago e receba
              diretamente, sem solicitar repasses à PAGOU.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-lg px-6">
                <a href="#cadastro-produtor">
                  Começar agora <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-lg px-6">
                <a href={COMPANY.whatsappHref} target="_blank" rel="noreferrer">
                  Falar com um especialista
                </a>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
              <Trust icon={ShieldCheck} label="Pagamento seguro" />
              <Trust icon={TicketCheck} label="Ingresso digital" />
              <Trust icon={BarChart3} label="Gestão em tempo real" />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/45 p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Uma operação completa
            </p>
            <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
              {[
                {
                  icon: Globe2,
                  title: "Página própria",
                  desc: "Marca, fotos, domínio e conteúdo do seu negócio.",
                },
                {
                  icon: WalletCards,
                  title: "Checkout integrado",
                  desc: "PIX disponível e cartão ativado após configuração.",
                },
                {
                  icon: QrCode,
                  title: "QR Code e check-in",
                  desc: "Ingresso digital e controle de entrada.",
                },
                {
                  icon: BarChart3,
                  title: "Dados e relatórios",
                  desc: "Vendas, clientes, lotes e resultados.",
                },
              ].map((feature) => (
                <div key={feature.title} className="bg-card p-5">
                  <feature.icon className="h-5 w-5 text-primary" />
                  <p className="mt-4 font-display font-semibold">{feature.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Duas formas de receber
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
            Escolha o modelo que acompanha o seu momento
          </h2>
          <p className="mt-4 text-muted-foreground">
            Comece sem mensalidade ou assuma o controle completo dos recebimentos com sua própria
            conta.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-7 shadow-card md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Para começar
                </span>
                <h3 className="mt-2 font-display text-2xl font-bold">Gateway PAGOU</h3>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-muted-foreground">
              Use a estrutura de pagamentos da PAGOU, sem mensalidade e sem implantação.
            </p>
            <div className="mt-6 divide-y divide-border rounded-xl border border-border">
              <FeeRow
                title="Eventos e ingressos"
                value="8% + R$ 2,00"
                detail="Os 8% podem ser repassados. Os R$ 2,00 ficam com o produtor."
              />
              <FeeRow
                title="Cursos e produtos digitais"
                value="8% + R$ 1,99"
                detail="Descontados do produtor e não repassados ao comprador."
              />
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              <Feature>Você só paga quando vende</Feature>
              <Feature>Página, checkout e entrega digital incluídos</Feature>
              <Feature>Ideal para validar a operação antes de assumir mensalidade</Feature>
            </ul>
            <Button asChild variant="outline" className="mt-7 w-full rounded-lg">
              <a href="#cadastro-produtor">Começar sem mensalidade</a>
            </Button>
          </div>

          <div className="rounded-2xl border-2 border-ink bg-ink p-7 text-ink-foreground shadow-card md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Para crescer
                </span>
                <h3 className="mt-2 font-display text-2xl font-bold">Recebimento direto</h3>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <Landmark className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-ink-foreground/70">
              Conecte sua conta Mercado Pago. Cada venda é processada na sua conta e segue o prazo
              de recebimento que você contratar com o provedor.
            </p>
            <div className="mt-6 rounded-xl border border-ink-foreground/15 bg-ink-foreground/5 p-5">
              <p className="text-sm text-ink-foreground/65">Mensalidades a partir de</p>
              <p className="mt-1 font-display text-4xl font-bold">
                R$ 299<span className="text-base font-normal text-ink-foreground/60">/mês</span>
              </p>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              <Feature dark>Sem retenção ou solicitação de saque à PAGOU</Feature>
              <Feature dark>
                Taxas do Mercado Pago debitadas da conta conectada, conforme o contrato do vendedor
              </Feature>
              <Feature dark>Sua taxa de conveniência pode ajudar a pagar a operação</Feature>
            </ul>
            <Button asChild className="mt-7 w-full rounded-lg">
              <a href="#planos">Conhecer planos</a>
            </Button>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          PIX do gateway PAGOU está operacional. Cartão e recebimento direto são ativados após a
          configuração segura do checkout e da conta do vendedor.
        </p>
      </section>

      <section id="planos" className="border-y border-border bg-secondary/35">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <div className="max-w-3xl">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Planos de gestão direta
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
              Preços que crescem junto com o seu negócio
            </h2>
            <p className="mt-4 text-muted-foreground">
              Em todos os planos, as vendas são processadas na conta Mercado Pago conectada pelo
              cliente.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {directPlans.map((plan) => (
              <article
                key={plan.name}
                className={`flex h-full flex-col rounded-2xl border bg-card p-6 ${plan.featured ? "border-ink shadow-elevated" : "border-border shadow-card"}`}
              >
                {plan.featured && (
                  <span className="mb-4 w-fit rounded-full bg-ink px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-foreground">
                    Operação completa
                  </span>
                )}
                <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-relaxed text-muted-foreground">
                  {plan.description}
                </p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="pb-1 text-sm text-muted-foreground">R$</span>
                  <span className="font-display text-4xl font-bold">{plan.price}</span>
                  <span className="pb-1 text-sm text-muted-foreground">/mês</span>
                </div>
                <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs font-medium">
                  {plan.limit}
                </p>
                {plan.setup && <p className="mt-2 text-xs text-muted-foreground">{plan.setup}</p>}
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {plan.features.map((item) => (
                    <Feature key={item}>{item}</Feature>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={plan.featured ? "default" : "outline"}
                  className="mt-7 w-full rounded-lg"
                >
                  <a href={COMPANY.whatsappHref} target="_blank" rel="noreferrer">
                    Quero este plano
                  </a>
                </Button>
              </article>
            ))}
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Aplicam-se o limite financeiro ou o limite de vendas, o que for atingido primeiro.
            Condições de implantação podem ser negociadas conforme prazo e escopo.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Mais que um link
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
              Uma presença digital que transmite confiança
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              O comprador entende quem está vendendo, o que está comprando e como acessar. Sua marca
              permanece presente da página de vendas ao check-in ou à área de membros.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Building2,
                title: "Identidade do negócio",
                text: "Logo, cores, imagens, informações e domínio próprio.",
              },
              {
                icon: TicketCheck,
                title: "Jornada completa",
                text: "Venda, confirmação, ingresso, QR Code e check-in.",
              },
              {
                icon: BarChart3,
                title: "Dados sob controle",
                text: "Clientes, pedidos e desempenho em um só painel.",
              },
              {
                icon: ShieldCheck,
                title: "Transparência",
                text: "Preço, taxa e total apresentados antes do pagamento.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-5">
                <item.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 font-display font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cadastro-produtor" className="border-t border-border bg-secondary/35">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <div className="mx-auto mb-9 max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Cadastro de vendedor
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
              Estruture sua operação com a PAGOU
            </h2>
            <p className="mt-4 text-muted-foreground">
              Envie os dados do seu negócio para análise. Depois da aprovação, você poderá criar
              eventos, cursos, lotes e acompanhar suas vendas pelo painel.
            </p>
          </div>
          {user.data ? (
            <SellerApplicationForm />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
              <h3 className="font-display text-2xl font-bold">Comece criando sua conta</h3>
              <p className="mt-2 text-muted-foreground">
                Depois do cadastro pessoal, você poderá enviar os dados da sua operação para
                análise.
              </p>
              <Button asChild className="mt-5 rounded-lg">
                <Link to="/auth" search={{ redirect: "/vender#cadastro-produtor" }}>
                  Criar conta de vendedor
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 px-4 py-14 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">
              Pronto para estruturar suas vendas?
            </h2>
            <p className="mt-2 text-ink-foreground/65">
              Fale com nosso time e escolha o modelo ideal para o seu volume.
            </p>
          </div>
          <Button asChild size="lg" className="rounded-lg px-6">
            <a href={COMPANY.whatsappHref} target="_blank" rel="noreferrer">
              Conversar com a PAGOU <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}

function Trust({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </span>
  );
}

function Feature({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <li
      className={`flex items-start gap-2 ${dark ? "text-ink-foreground/80" : "text-foreground/85"}`}
    >
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}

function FeeRow({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{title}</p>
        <p className="font-display font-bold text-primary">{value}</p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}
