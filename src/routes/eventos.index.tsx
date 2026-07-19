import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { featuredEventsQuery } from "@/lib/queries";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHeader } from "@/components/site/PageHeader";
import { EventCard } from "@/components/site/EventCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DemoNotice } from "@/components/site/DemoNotice";

export const Route = createFileRoute("/eventos/")({
  head: () => ({
    meta: [
      { title: "Eventos e shows — PAGOU" },
      { name: "description", content: "Descubra shows, festivais e experiências no Brasil todo. Compre com PIX e receba seu ingresso na hora." },
      { property: "og:title", content: "Eventos e shows — PAGOU" },
      { property: "og:description", content: "Descubra shows, festivais e experiências no Brasil todo." },
      { property: "og:url", content: "https://pagou.lovable.app/eventos" },
    ],
    links: [{ rel: "canonical", href: "https://pagou.lovable.app/eventos" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredEventsQuery),
  component: EventsList,
});

function EventsList() {
  const events = useSuspenseQuery(featuredEventsQuery).data;
  const [q, setQ] = useState("");
  const [city, setCity] = useState("all");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchQ = q.trim() === "" || e.title.toLowerCase().includes(q.toLowerCase());
      const matchCity = city === "all" || (e.city ?? "").toLowerCase().includes(city);
      const matchCat = category === "all" || (e.category ?? "").toLowerCase() === category;
      return matchQ && matchCity && matchCat;
    });
  }, [events, q, city, category]);

  return (
    <SiteShell>
      <PageHeader eyebrow="Catálogo" title="Todos os eventos" subtitle="Filtre por cidade, data ou categoria e ache o próximo rolê." />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-4"><DemoNotice /></div>
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card md:grid-cols-[1.6fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <label htmlFor="eventos-busca" className="sr-only">Buscar eventos por nome</label>
            <Input id="eventos-busca" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome" className="h-11 pl-9" />
          </div>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-11" aria-label="Filtrar por cidade"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cidades</SelectItem>
              <SelectItem value="são paulo">São Paulo</SelectItem>
              <SelectItem value="rio">Rio de Janeiro</SelectItem>
              <SelectItem value="belo">Belo Horizonte</SelectItem>
              <SelectItem value="porto">Porto Alegre</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-11" aria-label="Filtrar por categoria"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              <SelectItem value="música">Música</SelectItem>
              <SelectItem value="humor">Humor</SelectItem>
              <SelectItem value="cultura">Cultura</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
        {filtered.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">Nenhum evento encontrado com esses filtros.</p>
        )}
      </div>
    </SiteShell>
  );
}