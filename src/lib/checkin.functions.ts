import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CheckinResult = {
  result: "accepted" | "used" | "invalid" | "cancelled" | "unauthorized";
  ticket_id: string | null;
  event_id: string | null;
  event_title: string | null;
  holder_name: string | null;
  sector: string | null;
  checked_at: string | null;
};

export const redeemTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ code: z.string().trim().min(6).max(128) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("redeem_ticket", {
      _code: data.code,
    });

    if (error) throw new Error(error.message ?? "Não foi possível validar o ingresso");
    const result = Array.isArray(rows) ? rows[0] : null;
    if (!result) throw new Error("Resposta inválida do check-in");
    return result as CheckinResult;
  });
