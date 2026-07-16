import { Link } from "@tanstack/react-router";
import { formatDateTimeBR } from "@/lib/format";
import { MapPin, CalendarDays } from "lucide-react";

export type EventCardData = {
  slug: string;
  title: string;
  cover_url: string | null;
  city: string | null;
  venue: string | null;
  starts_at: string;
  producer_name: string | null;
  category: string | null;
};

export function EventCard({ event }: { event: EventCardData }) {
  return (
    <Link
      to="/eventos/$slug"
      params={{ slug: event.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {event.cover_url && (
          <img
            src={event.cover_url}
            alt={event.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {event.category && (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
            {event.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-2 text-lg font-semibold text-foreground">{event.title}</h3>
        <div className="mt-auto flex flex-col gap-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            {formatDateTimeBR(event.starts_at)}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {event.venue}, {event.city}
          </span>
        </div>
        {event.producer_name && (
          <span className="text-xs uppercase tracking-wide text-muted-foreground/80">por {event.producer_name}</span>
        )}
      </div>
    </Link>
  );
}