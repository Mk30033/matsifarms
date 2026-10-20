import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTable, useRefresh, onError, db } from "@/hooks/use-farm";
import { Button } from "@/components/ui/button";
import { Empty, Field, Loading, PageHeader, Panel, Select, Stepper, TextInput } from "@/components/farm-ui";
import { todayISO } from "@/lib/farm";

export const Route = createFileRoute("/_authenticated/mortality")({
  head: () => ({ meta: [{ title: "Mortality & Culls – Matsi Farms" }] }),
  component: MortPage,
});

function MortPage() {
  const flocks = useTable("flocks");
  const pens = useTable("pens");
  const cages = useTable("cages");
  const tiers = useTable("tiers");
  const logs = useTable("mortality_logs");
  const refresh = useRefresh();
  const [f, setF] = useState({ date: todayISO(), flock_id: "", tier_id: "", kind: "death", count: 1, cause: "" });
  useEffect(() => { if (!f.flock_id && flocks.data?.length) setF((x) => ({ ...x, flock_id: flocks.data![0]!.id })); }, [flocks.data]);
  const flock = flocks.data?.find((x) => x.id === f.flock_id);
  const penTiers = (tiers.data ?? []).filter((t) => t.pen_id === flock?.pen_id);

  async function save() {
    if (!flock) { toast.error("Select a flock"); return; }
    if (f.count < 1) { toast.error("Count must be at least 1"); return; }
    try {
      await db(supabase.from("mortality_logs").insert({ ...f, pen_id: flock.pen_id, tier_id: f.tier_id || null }));
      toast.success(`Logged ${f.count} ${f.kind}${f.count > 1 ? "s" : ""}`);
      setF({ ...f, count: 1, cause: "" }); refresh();
    } catch (e) { onError(e); }
  }
  async function del(id: string) {
    if (!confirm("Delete this record? The birds will be added back to the flock.")) return;
    try { await db(supabase.from("mortality_logs").delete().eq("id", id)); refresh(); } catch (e) { onError(e); }
  }

  return (
    <>
      <PageHeader title="Mortality & Culls" subtitle="Each entry reduces the flock's live count" />
      {!flocks.isLoading && !flocks.data?.length ? <Empty title="Create a flock first" /> : (
        <Panel className="mb-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><TextInput type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Flock"><Select value={f.flock_id} onChange={(e) => setF({ ...f, flock_id: e.target.value, tier_id: "" })}>{flocks.data?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
            <Field label="Cage / tier"><Select value={f.tier_id} onChange={(e) => setF({ ...f, tier_id: e.target.value })}><option value="">Whole pen</option>{penTiers.map((t) => <option key={t.id} value={t.id}>Cage {cages.data?.find((c) => c.id === t.cage_id)?.label} · {t.level}</option>)}</Select></Field>
            <Field label="Type"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="death">Death</option><option value="cull">Cull</option></Select></Field>
          </div>
          <div className="mt-3"><span className="text-sm font-medium">Count</span><div className="mt-1.5"><Stepper value={f.count} onChange={(v) => setF({ ...f, count: v })} quick={[5, 10]} /></div></div>
          <Field label="Cause / notes" className="mt-3"><TextInput value={f.cause} onChange={(e) => setF({ ...f, cause: e.target.value })} placeholder="e.g. heat stress, prolapse" /></Field>
          <Button size="lg" className="mt-4 h-14 w-full text-base" onClick={save}>Log loss</Button>
        </Panel>
      )}
      <Panel title="History">
        {logs.isLoading ? <Loading /> : !logs.data?.length ? <Empty title="No losses recorded" /> : (
          <ul className="divide-y text-sm">
            {logs.data.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                <div><div className="font-medium">{m.date} · <span className="capitalize">{m.kind}</span> · {m.count}</div>
                  <div className="text-xs text-muted-foreground">{flocks.data?.find((x) => x.id === m.flock_id)?.name} · {pens.data?.find((p) => p.id === m.pen_id)?.name ?? ""} · {m.cause || "—"}</div></div>
                <Button variant="ghost" size="icon" onClick={() => del(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
