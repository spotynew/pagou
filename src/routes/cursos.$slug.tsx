import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createDraftOrder } from "@/lib/checkout.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { courseBySlugQuery } from "@/lib/queries";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { Clock, User, PlayCircle, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/cursos/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(courseBySlugQuery(params.slug));
    if (!data) throw notFound();
  },
  component: CourseDetail,
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Curso não encontrado</h1>
      </div>
    </SiteShell>
  ),
});

function CourseDetail() {
  const { slug } = Route.useParams();
  const data = useSuspenseQuery(courseBySlugQuery(slug)).data!;
  const { course, modules } = data;
  const navigate = useNavigate();
  const totalLessons = modules.reduce((n, m: any) => n + (m.course_lessons?.length ?? 0), 0);

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
      setAuthLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const createDraft = useServerFn(createDraftOrder);
  const startCheckout = useMutation({
    mutationFn: async () =>
      createDraft({ data: { kind: "course", courseId: course.id, quantity: 1 } }),
    onSuccess: ({ orderId }) => navigate({ to: "/checkout/$orderId", params: { orderId } }),
    onError: (e: any) =>
      toast.error(e?.message ?? "Não foi possível iniciar o checkout. Tente novamente."),
  });

  function handleBuyClick() {
    if (authLoading) return;
    if (!userId) {
      const destination = `/cursos/${slug}?buyNow=1`;
      navigate({ to: "/auth", search: { redirect: destination } });
      return;
    }
    startCheckout.mutate();
  }

  // Retomar automaticamente após login (?buyNow=1).
  const autoFired = useRef(false);
  const buyNow = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("buyNow") === "1";
  useEffect(() => {
    if (!buyNow || autoFired.current) return;
    if (authLoading || !userId) return;
    autoFired.current = true;
    startCheckout.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyNow, authLoading, userId]);

  return (
    <SiteShell>
      <div className="border-b border-border bg-ink text-ink-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">{course.category}</span>
            <h1 className="mt-4 font-display text-4xl font-bold md:text-5xl">{course.title}</h1>
            <p className="mt-4 max-w-2xl text-ink-foreground/80">{course.description}</p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-ink-foreground/70">
              <span className="inline-flex items-center gap-2"><User className="h-4 w-4 text-primary" />{course.instructor_name}</span>
              <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />{course.duration_hours}h</span>
              <span className="inline-flex items-center gap-2"><PlayCircle className="h-4 w-4 text-primary" />{totalLessons} aulas</span>
            </div>
          </div>
          <div className="rounded-3xl border border-ink-foreground/10 bg-card p-6 text-foreground shadow-elevated">
            {course.cover_url && (
              <div className="mb-4 aspect-video overflow-hidden rounded-xl bg-muted">
                <img src={course.cover_url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Investimento</span>
              <span className="font-display text-3xl font-bold">{formatBRL(course.price_cents)}</span>
            </div>
            <Button
              size="lg"
              className="mt-4 w-full rounded-xl"
              disabled={authLoading || startCheckout.isPending}
              onClick={handleBuyClick}
            >
              {authLoading ? "Carregando…" : startCheckout.isPending ? "Reservando…" : "Comprar curso"}
            </Button>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Acesso liberado após confirmação do pagamento.
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="font-display text-2xl font-bold">Conteúdo programático</h2>
        <div className="mt-6 flex flex-col gap-4">
          {modules.map((m: any, idx: number) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 font-display text-primary">{idx + 1}</span>
                <h3 className="font-display text-lg font-semibold">{m.title}</h3>
              </div>
              <ul className="mt-4 divide-y divide-border">
                {(m.course_lessons ?? []).map((l: any) => (
                  <li key={l.id} className="flex items-center justify-between py-3 text-sm">
                    <span className="inline-flex items-center gap-2"><PlayCircle className="h-4 w-4 text-muted-foreground" /> {l.title}</span>
                    {l.duration_minutes && <span className="text-muted-foreground">{l.duration_minutes} min</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}