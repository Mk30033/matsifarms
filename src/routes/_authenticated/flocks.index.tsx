import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTable, useRefresh, onError, db } from "@/hooks/use-farm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, Field, Loading, NumInput, PageHeader, Select, StageBadge, TextInput } from "@/components/farm-ui";
import { buildSchedule, flockAgeDays, num, productionStage, todayISO } from "@/lib/farm";
import type { Row } from "@/hooks/use-farm";

export const Route = createFileRoute("/_authenticated/flocks/")({
  head: () => ({ meta: [{ title: "Flocks – Matsi Farms" }] }),
  component: FlocksPage,
});

export function FlockForm({ flock, onDone }: { flock?: Row<"flocks">; onDone: () => void }) {
  const pens = useTable("pens");
  const tiers = useTable("tiers");
  const cages = useTable("cages");
  const refresh = useRefresh();
  const [f, setF] = useState({
    name: flock?.name ?? "", breed: flock?.breed ?? "", hatchery: flock?.hatchery ?? "",
    date_placed: flock?.date_placed ?? todayISO(), age_at_placement_days: flock?.age_at_placement_days ?? 1,
    starting_count: flock?.starting_count ?? 0, current_count: flock?.current_count ?? 0,
    pen_id: flock?.pen_id ?? "", tier_ids: flock?.tier_ids ?? ([] as string[]),
  });
  const up = (k: keyof typeof f, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) { toast.error("Name is required"); return; }
    if (f.starting_count <= 0) { toast.error("Starting count must be more than 0"); return; }
    const payload = { ...f, pen_id: f.pen_id || null, current_count: flock ? f.current_count : f.current_count || f.starting_count };
    try {
      if (flock) await db(supabase.from("flocks").update(payload).eq("id", flock.id));
      else {
        const created = await db(supabase.from("flocks").insert(payload).select().single());
        const rows = created ? buildSchedule(created) : [];
        if (rows.length) await db(supabase.from("vaccination_schedule").insert(rows));
      }
      toast.success(flock ? "Flock updated" : "Flock created with vaccination schedule");
      refresh(); onDone();
    } catch (err) { onError(err); }
  }

  const penTiers = (tiers.data ?? []).filter((t) => t.pen_id === f.pen_id);
  return (
    <form onSubmit={save} className="space-y-3">
      <Field label="Name / batch ID"><TextInput value={f.name} onChange={(e) => up("name", e.target.value)} required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Breed"><TextInput value={f.breed} onChange={(e) => up("breed", e.target.value)} placeholder="Isa Brown" /></Field>
        <Field label="Hatchery"><TextInput value={f.hatchery} onChange={(e) => up("hatchery", e.target.value)} /></Field>
        <Field label="Date placed"><TextInput type="date" value={f.date_placed} onChange={(e) => up("date_placed", e.target.value)} /></Field>
        <Field label="Age at placement (days)"><NumInput inputMode="numeric" value={f.age_at_placement_days} onChange={(e) => up("age_at_placement_days", Number(e.target.value))} /></Field>
        <Field label="Starting count"><NumInput inputMode="numeric" value={f.starting_count || ""} onChange={(e) => up("starting_count", Number(e.target.value))} /></Field>
        <Field label="Current count"><NumInput inputMode="numeric" value={f.current_count || ""} placeholder={String(f.starting_count)} onChange={(e) => up("current_count", Number(e.target.value))} /></Field>
      </div>
      <Field label="Pen"><Select value={f.pen_id} onChange={(e) => { up("pen_id", e.target.value); up("tier_ids", []); }}><option value="">— none —</option>{pens.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      {penTiers.length > 0 && (
        <div>
          <span className="text-sm font-medium">Cage tiers (optional)</span>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {penTiers.map((t) => {
              const on = f.tier_ids.includes(t.id);
              const label = cages.data?.find((c) => c.id === t.cage_id)?.label;
              return (
                <button type="button" key={t.id} onClick={() => up("tier_ids", on ? f.tier_ids.filter((x) => x !== t.id) : [...f.tier_ids, t.id])}
                  className={`h-10 rounded-lg border text-xs font-medium ${on ? "border-primary bg-primary text-primary-foreground" : ""}`}>
                  {label} · {t.level}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <Button type="submit" className="h-12 w-full">{flock ? "Save changes" : "Create flock"}</Button>
    </form>
  );
}

function FlocksPage() {
  const flocks = useTable("flocks");
  const pens = useTable("pens");
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader title="Flocks" subtitle="Batches, ages and production stage" action={<Button className="h-11" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New flock</Button>} />
      {flocks.isLoading ? <Loading /> : !flocks.data?.length ? <Empty title="No flocks yet">Create your first flock.</Empty> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {flocks.data.map((f) => {
            const age = flockAgeDays(f.date_placed, f.age_at_placement_days);
            return (
              <Link key={f.id} to="/flocks/$id" params={{ id: f.id }} className="rounded-2xl border bg-card p-4 shadow-soft transition hover:border-primary">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">{f.name}</div>
                  <StageBadge stage={productionStage(age)} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{f.breed || "—"} · {pens.data?.find((p) => p.id === f.pen_id)?.name ?? "No pen"}</div>
                <div className="mt-3 flex justify-between text-sm">
                  <div><div className="font-display text-xl font-bold">{num(f.current_count)}</div><div className="text-xs text-muted-foreground">of {num(f.starting_count)} live</div></div>
                  <div className="text-right"><div className="font-display text-xl font-bold">{Math.floor(age / 7)}w {age % 7}d</div><div className="text-xs text-muted-foreground">{age} days old</div></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>New flock</DialogTitle></DialogHeader><FlockForm onDone={() => setOpen(false)} /></DialogContent>
      </Dialog>
    </>
  );
}
