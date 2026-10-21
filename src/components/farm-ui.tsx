import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Stage, VaccineStatus } from "@/lib/farm";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string | undefined; action?: ReactNode | undefined }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-4 shadow-soft sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode | undefined; tone?: "warn" | "bad" | undefined }) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-soft",
        tone === "warn" && "border-warning bg-warning/10",
        tone === "bad" && "border-destructive bg-destructive/10",
      )}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold sm:text-3xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/40 px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "h-12 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function NumInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" inputMode="decimal" min={0} {...props} className={cn(inputCls, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputCls, "appearance-auto", props.className)} />;
}

/** Big stepper for counting eggs on a phone. */
export function Stepper({ value, onChange, quick = [] }: { value: number; onChange: (n: number) => void; quick?: number[] }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="minus" onClick={() => onChange(Math.max(0, value - 1))} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted active:scale-95">
          <Minus className="h-5 w-5" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min={0}
          value={value || ""}
          placeholder="0"
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value || "0", 10) || 0))}
          className={cn(inputCls, "text-center font-display text-xl font-semibold")}
        />
        <button type="button" aria-label="plus" onClick={() => onChange(value + 1)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted active:scale-95">
          <Plus className="h-5 w-5" />
        </button>
      </div>
      {quick.length > 0 && (
        <div className="mt-2 flex gap-1.5">
          {quick.map((q) => (
            <button key={q} type="button" onClick={() => onChange(value + q)} className="h-9 flex-1 rounded-lg border bg-secondary text-sm font-medium text-secondary-foreground active:scale-95">
              +{q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const stageCls: Record<Stage, string> = {
  Brooding: "bg-accent/30 text-accent-foreground",
  Growing: "bg-chart-4/20 text-foreground",
  "Pre-lay": "bg-warning/25 text-warning-foreground",
  Laying: "bg-success/20 text-primary",
  "Post-peak": "bg-muted text-muted-foreground",
};
export function StageBadge({ stage }: { stage: Stage }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", stageCls[stage])}>{stage}</span>;
}

const vacCls: Record<VaccineStatus, string> = {
  Done: "bg-success/20 text-primary",
  Due: "bg-warning/25 text-warning-foreground",
  Overdue: "bg-destructive/15 text-destructive",
};
export function VaccineBadge({ status }: { status: VaccineStatus }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", vacCls[status])}>{status}</span>;
}
