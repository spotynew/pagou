import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Menu, X, Search } from "lucide-react";

export function Header() {
  const [session, setSession] = useState<{ email?: string } | null>(null);
  const [hasProducerAccess, setHasProducerAccess] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const updateUser = async (user: { id: string; email?: string } | null) => {
      setSession(user ? { email: user.email } : null);
      if (!user) {
        setHasProducerAccess(false);
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["producer", "admin"]);
      setHasProducerAccess(Boolean(roles?.length));
    };

    supabase.auth.getUser().then(({ data }) => updateUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      void updateUser(currentSession?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const nav = [
    { to: "/", label: "Início" },
    { to: "/eventos", label: "Eventos" },
    { to: "/cursos", label: "Cursos" },
    { to: "/minhas-compras", label: "Minhas compras" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{
                className:
                  "rounded-full px-4 py-2 text-sm font-medium bg-secondary text-foreground",
              }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => navigate({ to: "/eventos" })}
            aria-label="Buscar"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground md:inline-flex"
          >
            <Search className="h-4 w-4" />
          </button>
          {session ? (
            <>
              {hasProducerAccess && (
                <Button asChild size="sm" className="hidden rounded-full sm:inline-flex">
                  <Link to="/produtor">Painel vendedor</Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link to="/minhas-compras">Minha conta</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="rounded-full">
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
          <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-border/60 bg-background md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col p-2">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary"
              >
                {n.label}
              </Link>
            ))}
            {hasProducerAccess && (
              <Link
                to="/produtor"
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-primary hover:bg-secondary"
              >
                Painel vendedor
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
