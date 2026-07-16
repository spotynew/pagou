import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppSettings = {
  support_email: string | null;
  privacy_email: string | null;
  whatsapp_support: string | null;
};

export const appSettingsQuery = () =>
  queryOptions({
    queryKey: ["app-settings"],
    queryFn: async (): Promise<AppSettings> => {
      const { data } = await supabase
        .from("app_settings")
        .select("support_email, privacy_email, whatsapp_support")
        .eq("id", true)
        .maybeSingle();
      return (
        data ?? { support_email: null, privacy_email: null, whatsapp_support: null }
      );
    },
    staleTime: 60_000,
  });

export function hasAnyContact(s: AppSettings | undefined | null) {
  if (!s) return false;
  return Boolean(s.support_email || s.privacy_email || s.whatsapp_support);
}

export const CONTACTS_PENDING_MESSAGE = "Canais de atendimento em implantação.";