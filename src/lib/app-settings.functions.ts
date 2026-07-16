import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const settingsInput = z.object({
  support_email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .max(200)
    .optional()
    .or(z.literal("")),
  privacy_email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .max(200)
    .optional()
    .or(z.literal("")),
  whatsapp_support: z.string().trim().max(40).optional().or(z.literal("")),
});

export const updateAppSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => settingsInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas administradores podem alterar as configurações.");

    const payload = {
      support_email: data.support_email ? data.support_email : null,
      privacy_email: data.privacy_email ? data.privacy_email : null,
      whatsapp_support: data.whatsapp_support ? data.whatsapp_support : null,
    };

    const { error } = await supabase
      .from("app_settings")
      .update(payload)
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });