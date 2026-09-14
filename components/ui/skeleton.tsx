import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200",
        className,
      )}
    />
  );
}
