import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { featuredCoursesQuery } from "@/lib/queries";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHeader } from "@/components/site/PageHeader";
import { CourseCard } from "@/components/site/CourseCard";
import { DemoNotice } from "@/components/site/DemoNotice";

export const Route = createFileRoute("/cursos/")({
  head: () => ({
    meta: [
      { title: "Cursos online — PAGOU" },
      { name: "description", content: "Cursos práticos e independentes com acesso vitalício. Aprenda com quem faz." },
      { property: "og:title", content: "Cursos online — PAGOU" },
      { property: "og:description", content: "Cursos práticos e independentes com acesso vitalício." },
      { property: "og:url", content: "https://pagou.lovable.app/cursos" },
    ],
    links: [{ rel: "canonical", href: "https://pagou.lovable.app/cursos" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredCoursesQuery),
  component: CoursesList,
});

function CoursesList() {
  const courses = useSuspenseQuery(featuredCoursesQuery).data;
  return (
    <SiteShell>
      <PageHeader eyebrow="Aprender" title="Cursos" subtitle="Do design ao código, do MEI ao próximo passo da carreira." />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-4"><DemoNotice /></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      </div>
    </SiteShell>
  );
}