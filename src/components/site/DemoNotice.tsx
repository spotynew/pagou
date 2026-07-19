import { DEMO_NOTICE } from "@/lib/company";
import { Info } from "lucide-react";

export function DemoNotice({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      className={
        "inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-foreground/80 " +
        className
      }
    >
      <Info className="h-3.5 w-3.5 text-primary" aria-hidden />
      <span>{DEMO_NOTICE}</span>
    </div>
  );
}