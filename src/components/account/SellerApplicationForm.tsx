import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export function SellerApplicationForm() {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [document, setDocument] = useState("");
  const [bio, setBio] = useState("");
  const account = useQuery({
    queryKey: ["my-seller-application"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_accounts")
        .select("id, display_name, legal_name, document, bio, status")
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setDisplayName(data.display_name);
        setLegalName(data.legal_name ?? "");
        setDocument(data.document ?? "");
        setBio(data.bio ?? "");
      }
      return data;
    },
  });
  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("request_seller_account", {
        _display_name: displayName,
        _legal_name: legalName,
        _document: document,
        _bio: bio || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-seller-application"] });
      toast.success("Solicitação enviada para análise");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Não foi possível enviar a solicitação"),
  });
  if (account.isPending) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (account.data?.status === "approved")
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-6">
        <h3 className="font-display text-xl font-bold">Conta de produtor aprovada</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu painel já está liberado para cadastrar eventos, cursos e produtos.
        </p>
        <Button asChild className="mt-4">
          <a href="/produtor">Acessar painel</a>
        </Button>
      </div>
    );
  return (
    <form
      className="grid gap-5 rounded-3xl border border-border bg-card p-6 shadow-card md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit.mutate();
      }}
    >
      <div className="md:col-span-2">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl font-bold">Cadastro de produtor/vendedor</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          A conta começa em análise. Nenhuma pessoa consegue se autoaprovar.
        </p>
        {account.data && (
          <p className="mt-3 text-sm font-semibold text-primary">
            Status atual:{" "}
            {account.data.status === "pending" ? "aguardando análise" : "revisão necessária"}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="seller-display">Nome público ou marca</Label>
        <Input
          id="seller-display"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="seller-legal">Nome completo ou razão social</Label>
        <Input
          id="seller-legal"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          required
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="seller-document">CPF ou CNPJ</Label>
        <Input
          id="seller-document"
          inputMode="numeric"
          value={document}
          onChange={(e) => setDocument(e.target.value)}
          required
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="seller-bio">Sobre o negócio</Label>
        <Textarea
          id="seller-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Conte o que você vende ou produz."
        />
      </div>
      <div className="md:col-span-2">
        <Button disabled={submit.isPending}>
          {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {account.data ? "Atualizar solicitação" : "Enviar para análise"}
        </Button>
      </div>
    </form>
  );
}
