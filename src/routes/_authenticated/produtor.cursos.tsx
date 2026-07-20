import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ComponentProps } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/lib/format";
import {
  createProducerCourse,
  listProducerCourses,
  setProducerCoursePublished,
} from "@/lib/producer.functions";

export const Route = createFileRoute("/_authenticated/produtor/cursos")({
  component: ProducerCourses,
});

type CourseFormData = {
  title: string;
  description?: string;
  coverUrl?: string;
  category?: string;
  instructorName: string;
  durationHours: number;
  priceCents: number;
};

function ProducerCourses() {
  const queryClient = useQueryClient();
  const loadCourses = useServerFn(listProducerCourses);
  const createCourse = useServerFn(createProducerCourse);
  const setPublished = useServerFn(setProducerCoursePublished);
  const [showForm, setShowForm] = useState(false);
  const courses = useQuery({ queryKey: ["producer-courses"], queryFn: () => loadCourses() });
  const create = useMutation({
    mutationFn: (data: CourseFormData) => createCourse({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["producer-courses"] });
      await queryClient.invalidateQueries({ queryKey: ["producer-dashboard"] });
      setShowForm(false);
      toast.success("Curso criado como rascunho.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const publish = useMutation({
    mutationFn: (data: { courseId: string; published: boolean }) => setPublished({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["producer-courses"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Catálogo</p>
          <h1 className="font-display text-3xl font-bold">Cursos</h1>
          <p className="text-sm text-muted-foreground">Cadastre a oferta comercial do curso.</p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>
          {showForm ? "Fechar formulário" : "Novo curso"}
        </Button>
      </div>

      {showForm && (
        <form
          className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-card md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            create.mutate({
              title: String(form.get("title")),
              description: String(form.get("description") || ""),
              coverUrl: String(form.get("coverUrl") || ""),
              category: String(form.get("category") || ""),
              instructorName: String(form.get("instructorName")),
              durationHours: Number(form.get("durationHours")),
              priceCents: Math.round(Number(form.get("price")) * 100),
            });
          }}
        >
          <CourseField label="Nome do curso" name="title" required />
          <CourseField label="Categoria" name="category" />
          <div className="md:col-span-2">
            <Label htmlFor="course-description">Descrição</Label>
            <Textarea id="course-description" name="description" />
          </div>
          <CourseField label="URL da capa" name="coverUrl" type="url" />
          <CourseField label="Instrutor" name="instructorName" required />
          <CourseField
            label="Duração em horas"
            name="durationHours"
            type="number"
            min="0.5"
            step="0.5"
            required
          />
          <CourseField label="Preço (R$)" name="price" type="number" min="1" step="0.01" required />
          <div className="md:col-span-2">
            <Button disabled={create.isPending}>
              {create.isPending ? "Criando…" : "Criar curso como rascunho"}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {courses.isPending && <p className="text-sm text-muted-foreground">Carregando cursos…</p>}
        {courses.data?.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum curso cadastrado nesta conta.
          </p>
        )}
        {courses.data?.map((course) => (
          <div key={course.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-semibold">{course.title}</h2>
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                    {course.published ? "Publicado" : "Rascunho"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {course.instructor_name} · {course.duration_hours}h
                </p>
                <p className="mt-2 font-semibold">{formatBRL(course.price_cents)}</p>
              </div>
              <div className="flex gap-2">
                {course.published && (
                  <Button asChild size="sm" variant="outline">
                    <a href={`/cursos/${course.slug}`} target="_blank" rel="noreferrer">
                      Ver página
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={course.published ? "outline" : "default"}
                  disabled={publish.isPending}
                  onClick={() =>
                    publish.mutate({ courseId: course.id, published: !course.published })
                  }
                >
                  {course.published ? "Despublicar" : "Publicar"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CourseField({
  label,
  name,
  ...props
}: { label: string; name: string } & ComponentProps<typeof Input>) {
  const id = `course-${name}`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} {...props} />
    </div>
  );
}
