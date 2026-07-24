import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPublicEventBySlug } from "@/lib/public-event.functions";

export type CourseOutlineLesson = {
  id: string;
  title: string;
  duration_minutes: number | null;
};

export type CourseOutlineModule = {
  id: string;
  title: string;
  course_lessons?: CourseOutlineLesson[];
};

export const featuredEventsQuery = queryOptions({
  queryKey: ["events", "featured"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("events")
      .select(
        "id, slug, title, cover_url, city, venue, starts_at, producer_name, category, featured",
      )
      .eq("published", true)
      .order("starts_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export const featuredCoursesQuery = queryOptions({
  queryKey: ["courses", "featured"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("courses")
      .select(
        "id, slug, title, cover_url, category, instructor_name, duration_hours, price_cents, producer_name, featured",
      )
      .eq("published", true)
      .order("featured", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export function eventBySlugQuery(slug: string) {
  return queryOptions({
    queryKey: ["event", slug],
    queryFn: () => getPublicEventBySlug({ data: { slug } }),
  });
}

export function courseBySlugQuery(slug: string) {
  return queryOptions({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data: course, error } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      if (!course) return null;
      const { data: modules } = await supabase.rpc("get_course_outline", {
        _course_id: course.id,
      });
      const outline = Array.isArray(modules) ? (modules as CourseOutlineModule[]) : [];
      return { course, modules: outline };
    },
  });
}
