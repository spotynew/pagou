import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/site/Logo";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Entrar — PAGOU" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ redirect: z.string().optional() }).parse(s),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [loading, setLoading] = useState(false);

  // Apenas caminhos internos (mesma origem) — nunca URLs externas.
  const safeRedirect =
    search.redirect && search.redirect.startsWith("/") && !search.redirect.startsWith("//")
      ? search.redirect
      : null;

  function goAfterAuth() {
    if (safeRedirect) {
      window.location.assign(safeRedirect);
      return;
    }
    navigate({ to: "/minhas-compras" });
  }

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: f.get("email") as string,
      password: f.get("password") as string,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta!");
    goAfterAuth();
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: f.get("email") as string,
      password: f.get("password") as string,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: f.get("name") as string,
          cpf: f.get("cpf") as string,
          phone: f.get("phone") as string,
          postal_code: f.get("postal_code") as string,
          street: f.get("street") as string,
          address_number: f.get("address_number") as string,
          complement: f.get("complement") as string,
          neighborhood: f.get("neighborhood") as string,
          city: f.get("city") as string,
          state: f.get("state") as string,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Verifique seu e-mail para confirmar o acesso.");
  }

  async function google() {
    try {
      const { lovable } = await import("@/integrations/lovable/index");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) return toast.error("Não foi possível entrar com o Google.");
      if (result.redirected) return;
      goAfterAuth();
    } catch {
      toast.error("Login com Google indisponível.");
    }
  }

  return (
    <SiteShell>
      <div className="mx-auto grid min-h-[75vh] max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
        <div className="hidden flex-col justify-between rounded-3xl bg-ink p-10 text-ink-foreground md:flex">
          <Logo tone="light" />
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight">
              Sua carteira de
              <br />
              ingressos e cursos
              <br />
              <span className="text-primary">num só lugar.</span>
            </h2>
            <p className="mt-4 text-ink-foreground/70">
              Compra em segundos, ingresso instantâneo, curso liberado após aprovação.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-foreground/60">
            <ShieldCheck className="h-4 w-4 text-primary" /> Seus dados são protegidos durante a
            transmissão e o armazenamento.
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated">
            <h1 className="font-display text-2xl font-bold">Acesse sua conta</h1>
            <p className="text-sm text-muted-foreground">Entre para acompanhar suas compras.</p>

            <Button type="button" variant="outline" className="mt-6 w-full" onClick={google}>
              Continuar com Google
            </Button>
            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
            </div>

            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div>
                    <Label htmlFor="password">Senha</Label>
                    <Input id="password" name="password" type="password" required />
                  </div>
                  <Button disabled={loading} className="w-full">
                    Entrar
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="name">Nome completo</Label>
                    <Input id="name" name="name" autoComplete="name" required />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="signup-cpf">CPF</Label>
                      <Input
                        id="signup-cpf"
                        name="cpf"
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-phone">Telefone</Label>
                      <Input
                        id="signup-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="(11) 99999-9999"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email2">E-mail</Label>
                    <Input id="email2" name="email" type="email" required />
                  </div>
                  <div>
                    <Label htmlFor="password2">Senha</Label>
                    <Input id="password2" name="password" type="password" minLength={6} required />
                  </div>
                  <p className="border-t border-border pt-4 text-sm font-semibold">Endereço</p>
                  <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                    <div>
                      <Label htmlFor="signup-postal-code">CEP</Label>
                      <Input
                        id="signup-postal-code"
                        name="postal_code"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-street">Rua</Label>
                      <Input
                        id="signup-street"
                        name="street"
                        autoComplete="address-line1"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="signup-number">Número</Label>
                      <Input id="signup-number" name="address_number" required />
                    </div>
                    <div>
                      <Label htmlFor="signup-complement">Complemento</Label>
                      <Input
                        id="signup-complement"
                        name="complement"
                        autoComplete="address-line2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-neighborhood">Bairro</Label>
                      <Input id="signup-neighborhood" name="neighborhood" required />
                    </div>
                    <div>
                      <Label htmlFor="signup-city">Cidade</Label>
                      <Input id="signup-city" name="city" autoComplete="address-level2" required />
                    </div>
                  </div>
                  <div className="max-w-28">
                    <Label htmlFor="signup-state">Estado</Label>
                    <Input
                      id="signup-state"
                      name="state"
                      autoComplete="address-level1"
                      minLength={2}
                      maxLength={2}
                      placeholder="SP"
                      required
                    />
                  </div>
                  <Button disabled={loading} className="w-full">
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Ao continuar, você concorda com nossos{" "}
              <Link to="/termos" className="text-primary hover:underline">
                Termos
              </Link>{" "}
              e nossa{" "}
              <Link to="/privacidade" className="text-primary hover:underline">
                Política de privacidade
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
