import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

async function requireAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Apenas administradores podem gerenciar usuários.");
}

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    const ids = data.users.map((user) => user.id);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, phone").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);
    return data.users.map((user) => ({
      id: user.id,
      email: user.email ?? "",
      fullName: profiles?.find((profile) => profile.id === user.id)?.full_name ?? "",
      phone: profiles?.find((profile) => profile.id === user.id)?.phone ?? "",
      roles: roles?.filter((role) => role.user_id === user.id).map((role) => role.role) ?? [],
      createdAt: user.created_at,
      bannedUntil: user.banned_until ?? null,
    }));
  });

const actionInput = z.object({
  userId: z.string().uuid(),
  action: z.enum(["ban", "unban", "delete"]),
});

export const manageAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => actionInput.parse(raw))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.userId === context.userId)
      throw new Error("Você não pode bloquear ou excluir a própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: targetIsAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: data.userId,
      _role: "admin",
    });
    if (targetIsAdmin)
      throw new Error("Outra conta administrativa não pode ser alterada por esta tela.");
    const result =
      data.action === "delete"
        ? await supabaseAdmin.auth.admin.deleteUser(data.userId)
        : await supabaseAdmin.auth.admin.updateUserById(data.userId, {
            ban_duration: data.action === "ban" ? "876000h" : "none",
          });
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });
