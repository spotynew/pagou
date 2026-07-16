import { Link } from "@tanstack/react-router";
import { formatBRL } from "@/lib/format";
import { Clock, User } from "lucide-react";

export type CourseCardData = {
  slug: string;
  title: string;
  cover_url: string | null;
  category: string | null;
  instructor_name: string | null;
  duration_hours: number | null;
  price_cents: number;
};

export function CourseCard({ course }: { course: CourseCardData }) {
  return (
    <Link
      to="/cursos/$slug"
      params={{ slug: course.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {course.cover_url && (
          <img
            src={course.cover_url}
            alt={course.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {course.category && (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
            {course.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-2 text-lg font-semibold text-foreground">{course.title}</h3>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {course.instructor_name && (
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              {course.instructor_name}
            </span>
          )}
          {course.duration_hours != null && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {course.duration_hours}h
            </span>
          )}
        </div>
        <div className="mt-auto flex items-end justify-between">
          <span className="text-xs text-muted-foreground">a partir de</span>
          <span className="font-display text-xl font-bold text-foreground">{formatBRL(course.price_cents)}</span>
        </div>
      </div>
    </Link>
  );
}