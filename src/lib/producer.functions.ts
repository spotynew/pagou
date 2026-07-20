import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type AuthContext = { supabase: SupabaseClient<Database>; userId: string };

async function requireProducer(context: AuthContext) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: producer }, { data: admin }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "producer" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
  ]);
  if (!producer && !admin) throw new Error("Sua conta não possui acesso de produtor.");

  const { data: seller, error } = await supabaseAdmin
    .from("seller_accounts")
    .select("id, display_name, legal_name, status")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !seller) throw new Error("Conta de vendedor não encontrada.");
  if (seller.status !== "approved")
    throw new Error("Sua conta de vendedor ainda não foi aprovada.");
  return { supabaseAdmin, seller };
}

function slugify(value: string) {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
  return `${base || "item"}-${crypto.randomUUID().slice(0, 8)}`;
}

const optionalUrl = z.union([z.string().url(), z.literal("")]).optional();

export const getProducerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin, seller } = await requireProducer(context);
    const [{ data: events }, { data: courses }, { data: orders, error }] = await Promise.all([
      supabaseAdmin
        .from("events")
        .select("id, ticket_types(ticket_batches(quantity_sold))")
        .eq("seller_id", seller.id),
      supabaseAdmin.from("courses").select("id").eq("seller_id", seller.id),
      supabaseAdmin
        .from("orders")
        .select("id, status, total_cents, created_at, buyer_name, order_items(title)")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false }),
    ]);
    if (error) throw new Error(error.message);

    const paidOrders = (orders ?? []).filter((order) => order.status === "paid");
    const ticketsSold = (events ?? []).reduce(
      (total, event) =>
        total +
        event.ticket_types.reduce(
          (typeTotal, type) =>
            typeTotal +
            type.ticket_batches.reduce((batchTotal, batch) => batchTotal + batch.quantity_sold, 0),
          0,
        ),
      0,
    );
    return {
      seller,
      metrics: {
        revenueCents: paidOrders.reduce((total, order) => total + order.total_cents, 0),
        paidOrders: paidOrders.length,
        ticketsSold,
        catalogItems: (events?.length ?? 0) + (courses?.length ?? 0),
      },
      recentOrders: (orders ?? []).slice(0, 10).map((order) => ({
        id: order.id,
        buyerName: order.buyer_name || "Cliente",
        item: order.order_items.map((item) => item.title).join(" + ") || "Pedido",
        totalCents: order.total_cents,
        status: order.status,
        createdAt: order.created_at,
      })),
    };
  });

export const listProducerEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin, seller } = await requireProducer(context);
    const { data, error } = await supabaseAdmin
      .from("events")
      .select(
        "id, title, slug, city, venue, starts_at, published, sales_count, ticket_types(id, name, sector, ticket_batches(id, name, price_cents, quantity_total, quantity_sold, active, max_per_order))",
      )
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const createEventInput = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(5000).optional(),
  coverUrl: optionalUrl,
  category: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2).max(100),
  venue: z.string().trim().min(2).max(160),
  address: z.string().trim().min(3).max(240),
  startsAt: z.string().datetime(),
  ageRating: z.string().trim().max(30).optional(),
  ticketName: z.string().trim().min(2).max(80),
  sector: z.string().trim().max(80).optional(),
  batchName: z.string().trim().min(2).max(80),
  priceCents: z.number().int().min(100).max(100_000_000),
  quantityTotal: z.number().int().min(1).max(100_000),
  maxPerOrder: z.number().int().min(1).max(10),
});

export const createProducerEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => createEventInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, seller } = await requireProducer(context);
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .insert({
        seller_id: seller.id,
        title: data.title,
        slug: slugify(data.title),
        description: data.description || null,
        cover_url: data.coverUrl || null,
        category: data.category || null,
        city: data.city,
        venue: data.venue,
        address: data.address,
        starts_at: data.startsAt,
        age_rating: data.ageRating || null,
        producer_name: seller.display_name,
        published: false,
        is_demo: false,
      })
      .select("id")
      .single();
    if (eventError || !event)
      throw new Error(eventError?.message ?? "Não foi possível criar o evento.");

    const { data: ticketType, error: typeError } = await supabaseAdmin
      .from("ticket_types")
      .insert({
        event_id: event.id,
        name: data.ticketName,
        sector: data.sector || null,
      })
      .select("id")
      .single();
    if (typeError || !ticketType) {
      await supabaseAdmin.from("events").delete().eq("id", event.id);
      throw new Error(typeError?.message ?? "Não foi possível criar o ingresso.");
    }

    const { error: batchError } = await supabaseAdmin.from("ticket_batches").insert({
      ticket_type_id: ticketType.id,
      name: data.batchName,
      price_cents: data.priceCents,
      quantity_total: data.quantityTotal,
      max_per_order: data.maxPerOrder,
      active: true,
    });
    if (batchError) {
      await supabaseAdmin.from("events").delete().eq("id", event.id);
      throw new Error(batchError.message);
    }
    return { id: event.id };
  });

export const setProducerEventPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ eventId: z.string().uuid(), published: z.boolean() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, seller } = await requireProducer(context);
    const { error } = await supabaseAdmin
      .from("events")
      .update({ published: data.published })
      .eq("id", data.eventId)
      .eq("seller_id", seller.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listProducerCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin, seller } = await requireProducer(context);
    const { data, error } = await supabaseAdmin
      .from("courses")
      .select(
        "id, title, slug, category, instructor_name, duration_hours, price_cents, published, sales_count",
      )
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const createCourseInput = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(5000).optional(),
  coverUrl: optionalUrl,
  category: z.string().trim().max(80).optional(),
  instructorName: z.string().trim().min(2).max(120),
  durationHours: z.number().min(0.5).max(10_000),
  priceCents: z.number().int().min(100).max(100_000_000),
});

export const createProducerCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => createCourseInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, seller } = await requireProducer(context);
    const { data: course, error } = await supabaseAdmin
      .from("courses")
      .insert({
        seller_id: seller.id,
        title: data.title,
        slug: slugify(data.title),
        description: data.description || null,
        cover_url: data.coverUrl || null,
        category: data.category || null,
        instructor_name: data.instructorName,
        duration_hours: data.durationHours,
        price_cents: data.priceCents,
        producer_name: seller.display_name,
        published: false,
        is_demo: false,
      })
      .select("id")
      .single();
    if (error || !course) throw new Error(error?.message ?? "Não foi possível criar o curso.");
    return { id: course.id };
  });

export const setProducerCoursePublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ courseId: z.string().uuid(), published: z.boolean() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, seller } = await requireProducer(context);
    const { error } = await supabaseAdmin
      .from("courses")
      .update({ published: data.published })
      .eq("id", data.courseId)
      .eq("seller_id", seller.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
