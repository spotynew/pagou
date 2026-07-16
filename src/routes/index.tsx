import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { featuredEventsQuery, featuredCoursesQuery } from "@/lib/queries";
import { SiteShell } from "@/components/site/SiteShell";
import { SectionTitle } from "@/components/site/SectionTitle";
import { EventCard } from "@/components/site/EventCard";
import { CourseCard } from "@/components/site/CourseCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Zap, TicketCheck, Search, ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(featuredEventsQuery),
      context.queryClient.ensureQueryData(featuredCoursesQuery),
    ]);
  },
  component: Home,
});

function Home() {
  const events = useSuspenseQuery(featuredEventsQuery).data;
  const courses = useSuspenseQuery(featuredCoursesQuery).data;
  const featured = events.filter((e) => e.featured).slice(0, 3);
  const upcoming = events.slice(0, 4);
  const topCourses = courses.filter((c) => c.featured).slice(0, 3);
  const bestsellers = [...events].sort(() => 0).slice(0, 4);

  const [q, setQ] = useState("");
  const [city, setCity] = useState("all");

  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative overflow-hidden bg-ink text-ink-foreground">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(60%_50%_at_20%_10%,var(--color-primary)_0%,transparent_60%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-[1.15fr_1fr] md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-ink-foreground/15 bg-ink-foreground/5 px-3 py-1 text-xs font-medium text-ink-foreground/80">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Nova experiência PAGOU
            </span>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              Comprou. <span className="text-primary">Pagou.</span> Aproveitou.
            </h1>
            <p className="mt-6 max-w-xl text-base text-ink-foreground/70 md:text-lg">
              Ingressos para shows, cursos e produtos digitais em um só lugar — com o pagamento tratado
              como fintech: rápido, transparente e sem sustos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full text-base">
                <Link to="/eventos">Explorar eventos <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-ink-foreground/20 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 text-base">
                <Link to="/vender">Vender com a PAGOU</Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 text-sm text-ink-foreground/70">
              <Trust icon={<ShieldCheck className="h-5 w-5 text-primary" />} label="Pagamento seguro" />
              <Trust icon={<Zap className="h-5 w-5 text-primary" />} label="PIX na hora" />
              <Trust icon={<TicketCheck className="h-5 w-5 text-primary" />} label="Ingresso 100% digital" />
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="absolute inset-0 rounded-3xl bg-gradient-primary opacity-20 blur-3xl" />
            {featured[0] && (
              <div className="relative overflow-hidden rounded-3xl border border-ink-foreground/10 shadow-elevated">
                <img src={featured[0].cover_url ?? ""} alt="" className="h-[420px] w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-6">
                  <span className="text-xs uppercase tracking-widest text-primary">Destaque</span>
                  <h3 className="mt-1 font-display text-2xl font-bold text-white">{featured[0].title}</h3>
                  <p className="mt-1 text-sm text-white/70">{featured[0].venue} · {featured[0].city}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mx-auto -mb-10 max-w-5xl px-4 pb-6">
          <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-elevated md:grid-cols-[1.6fr_1fr_1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busque por show, curso ou artista" className="h-12 pl-9" />
            </div>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Cidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as cidades</SelectItem>
                <SelectItem value="sp">São Paulo</SelectItem>
                <SelectItem value="rj">Rio de Janeiro</SelectItem>
                <SelectItem value="bh">Belo Horizonte</SelectItem>
                <SelectItem value="poa">Porto Alegre</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="h-12"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="musica">Música</SelectItem>
                <SelectItem value="humor">Humor</SelectItem>
                <SelectItem value="cultura">Cultura</SelectItem>
                <SelectItem value="cursos">Cursos</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild size="lg" className="h-12 rounded-xl">
              <Link to="/eventos">Buscar</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-20">
        <SectionTitle title="Eventos em destaque" subtitle="Shows, festivais e experiências selecionadas para você" action={{ label: "Ver todos", to: "/eventos" }} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-20">
        <SectionTitle title="Cursos em destaque" subtitle="Aprenda com quem faz. Acesso vitalício após a compra." action={{ label: "Ver todos", to: "/cursos" }} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {topCourses.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-20">
        <SectionTitle title="Mais vendidos" subtitle="O que está bombando na PAGOU essa semana" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {bestsellers.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      </div>

      {/* CTA vendedor */}
      <section className="mx-auto max-w-7xl px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-10 md:p-16">
          <div className="max-w-2xl">
            <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">Para produtores</span>
            <h2 className="mt-4 font-display text-3xl font-bold text-black md:text-5xl">Venda com a PAGOU.</h2>
            <p className="mt-3 text-black/80 md:text-lg">
              Cadastre seu evento, curso ou produto digital, receba via PIX em minutos e tenha uma bilheteria completa
              com QR Code, cupons e relatórios em tempo real.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="rounded-full">
                <Link to="/vender">Começar a vender</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-black/20 bg-transparent text-black hover:bg-black/10">
                <Link to="/vender">Falar com o time</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function Trust({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span>{label}</span>
    </div>
  );
}
