import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const freeTicketInput = z.object({
  eventId: z.string().uuid(),
  ticketBatchId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
});

export const issueFreeEventTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => freeTicketInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: orderId, error } = await context.supabase.rpc("issue_free_event_tickets", {
      _event_id: data.eventId,
      _batch_id: data.ticketBatchId,
      _quantity: data.quantity,
    });
    if (error || !orderId) {
      throw new Error(error?.message ?? "Não foi possível emitir os ingressos gratuitos.");
    }
    return { orderId };
  });
