export function Logo({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const text = tone === "dark" ? "text-foreground" : "text-ink-foreground";
  return (
    <span className={`inline-flex items-baseline gap-1 font-display font-bold text-2xl tracking-tight ${text} ${className}`}>
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_16px_var(--color-primary)]" />
      pagou
      <span className="text-primary">.</span>
    </span>
  );
}