import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function documentLabel(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length === 14) return `CNPJ final ${digits.slice(-4)}`;
  if (digits.length === 11) return `CPF final ${digits.slice(-4)}`;
  return null;
}

export const getPublicEventBySlug = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) =>
    z.object({ slug: z.string().trim().min(1).max(120) }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: event, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) return null;

    const [{ data: ticketTypes, error: ticketError }, organizerResult] = await Promise.all([
      supabaseAdmin
        .from("ticket_types")
        .select(
          "id, name, sector, description, sort_order, ticket_batches(id, name, price_cents, quantity_total, quantity_sold, active, max_per_order, starts_at, ends_at, sort_order)",
        )
        .eq("event_id", event.id)
        .order("sort_order"),
      event.seller_id
        ? supabaseAdmin
            .from("seller_accounts")
            .select("display_name, legal_name, document, avatar_url, bio, status")
            .eq("id", event.seller_id)
            .eq("status", "approved")
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (ticketError) throw new Error(ticketError.message);
    if (organizerResult.error) throw new Error(organizerResult.error.message);

    const organizer = organizerResult.data
      ? {
          displayName: organizerResult.data.display_name,
          legalName: organizerResult.data.legal_name,
          documentLabel: documentLabel(organizerResult.data.document),
          avatarUrl: organizerResult.data.avatar_url,
          bio: organizerResult.data.bio,
        }
      : null;

    const producerIdentification = organizer
      ? [
          organizer.displayName,
          organizer.legalName && organizer.legalName !== organizer.displayName
            ? organizer.legalName
            : null,
          organizer.documentLabel,
        ]
          .filter(Boolean)
          .join(" · ")
      : event.producer_name;

    return {
      event: { ...event, producer_name: producerIdentification },
      ticketTypes: ticketTypes ?? [],
      organizer,
    };
  });
