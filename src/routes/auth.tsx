import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  head: () => ({ meta: [{ title: "Entrar — PAGOU" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: f.get("email") as string, password: f.get("password") as string });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/minhas-compras" });
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
        data: { full_name: f.get("name") as string },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Verifique seu e-mail.");
  }

  async function google() {
    try {
      const { lovable } = await import("@/integrations/lovable/index");
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) return toast.error("Não foi possível entrar com o Google.");
      if (result.redirected) return;
      navigate({ to: "/minhas-compras" });
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
            <h2 className="font-display text-4xl font-bold leading-tight">Sua carteira de<br />ingressos e cursos<br /><span className="text-primary">num só lugar.</span></h2>
            <p className="mt-4 text-ink-foreground/70">Compra em segundos, ingresso instantâneo, curso liberado após aprovação.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-foreground/60">
            <ShieldCheck className="h-4 w-4 text-primary" /> Dados protegidos com criptografia de ponta a ponta.
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
                  <div><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required /></div>
                  <div><Label htmlFor="password">Senha</Label><Input id="password" name="password" type="password" required /></div>
                  <Button disabled={loading} className="w-full">Entrar</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="mt-4 space-y-4">
                  <div><Label htmlFor="name">Nome</Label><Input id="name" name="name" required /></div>
                  <div><Label htmlFor="email2">E-mail</Label><Input id="email2" name="email" type="email" required /></div>
                  <div><Label htmlFor="password2">Senha</Label><Input id="password2" name="password" type="password" minLength={6} required /></div>
                  <Button disabled={loading} className="w-full">Criar conta</Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Ao continuar, você concorda com nossos <Link to="/" className="text-primary hover:underline">Termos</Link>.
            </p>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}