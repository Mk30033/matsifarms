import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTable, useRefresh, onError, db } from "@/hooks/use-farm";
import { Button } from "@/components/ui/button";
import { Empty, Field, Loading, NumInput, PageHeader, Panel, Select, Stepper, TextInput } from "@/components/farm-ui";
import { CAGE_LABELS, TIER_LEVELS, layRate, num, todayISO, toCrates } from "@/lib/farm";

export const Route = createFileRoute("/_authenticated/eggs")({
  head: () => ({ meta: [{ title: "Egg Collection – Matsi Farms" }] }),
  component: EggsPage,
});

type Counts = Record<string, { good: number; cracked: number; rejected: number }>;

function EggsPage() {
  const pens = useTable("pens");
  const cages = useTable("cages");
  const tiers = useTable("tiers");
  const flocks = useTable("flocks");
  const sessions = useTable("egg_sessions");
  const eggs = useTable("egg_collections");
  const refresh = useRefresh();

  const [date, setDate] = useState(todayISO());
  const [penId, setPenId] = useState("");
  const [session, setSession] = useState<"morning" | "evening">(new Date().getHours() < 13 ? "morning" : "evening");
  const [counts, setCounts] = useState<Counts>({});
  const [crates, setCrates] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!penId && pens.data?.length) setPenId(pens.data[0].id); }, [pens.data, penId]);

  const penTiers = useMemo(() => {
    const out: { id: string; cage_id: string; cage: string; level: string }[] = [];
    for (const label of CAGE_LABELS) {
      const c = cages.data?.find((x) => x.pen_id === penId && x.label === label);
      for (const lvl of TIER_LEVELS) {
        const t = tiers.data?.find((x) => x.cage_id === c?.id && x.level === lvl);
        if (t && c) out.push({ id: t.id, cage_id: c.id, cage: label, level: lvl });
      }
    }
    return out;
  }, [cages.data, tiers.data, penId]);

  const existing = sessions.data?.find((s) => s.pen_id === penId && s.date === date && s.session === session);
  const flock = flocks.data?.find((f) => f.pen_id === penId);
  const penBirds = (flocks.data ?? []).filter((f) => f.pen_id === penId).reduce((s, f) => s + f.current_count, 0);

  const set = (tid: string, k: "good" | "cracked" | "rejected", v: number) =>
    setCounts((c) => ({ ...c, [tid]: { good: 0, cracked: 0, rejected: 0, ...c[tid], [k]: v } }));

  const totGood = Object.values(counts).reduce((s, c) => s + c.good, 0);
  const totCracked = Object.values(counts).reduce((s, c) => s + c.cracked, 0);
  const totRej = Object.values(counts).reduce((s, c) => s + c.rejected, 0);

  function loadExisting(sid: string) {
    const s = sessions.data?.find((x) => x.id === sid);
    if (!s) return;
    setDate(s.date); setPenId(s.pen_id); setSession(s.session as "morning" | "evening");
    const c: Counts = {};
    for (const e of eggs.data ?? []) if (e.session_id === sid) c[e.tier_id] = { good: e.good, cracked: e.cracked, rejected: e.rejected };
    setCounts(c); setCrates(s.crates?.toString() ?? ""); setEditingId(sid);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() { setCounts({}); setCrates(""); setEditingId(null); }

  async function save() {
    if (!penId) return toast.error("Select a pen");
    if (totGood + totCracked + totRej === 0) return toast.error("Enter at least one egg count");
    if (existing && existing.id !== editingId) {
      toast.warning("An entry already exists for this pen, date and session.", { action: { label: "Edit it", onClick: () => loadExisting(existing.id) } });
      return;
    }
    setSaving(true);
    try {
      let sid = editingId;
      const payload = { pen_id: penId, date, session, flock_id: flock?.id ?? null, crates: crates ? Number(crates) : null };
      if (sid) await db(supabase.from("egg_sessions").update(payload).eq("id", sid));
      else sid = (await db(supabase.from("egg_sessions").insert(payload).select("id").single())).id;
      const rows = penTiers.map((t) => ({
        session_id: sid!, pen_id: penId, cage_id: t.cage_id, tier_id: t.id, date, session,
        good: counts[t.id]?.good ?? 0, cracked: counts[t.id]?.cracked ?? 0, rejected: counts[t.id]?.rejected ?? 0,
      }));
      await db(supabase.from("egg_collections").upsert(rows, { onConflict: "session_id,tier_id" }));
      toast.success(`Saved ${totGood + totCracked} eggs`);
      reset(); refresh();
    } catch (e) { onError(e); } finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm("Delete this collection?")) return;
    try { await db(supabase.from("egg_sessions").delete().eq("id", id)); refresh(); toast.success("Deleted"); } catch (e) { onError(e); }
  }

  // Table filters
  const [from, setFrom] = useState(() => new Date(Date.now() - 13 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState(todayISO());
  const [fPen, setFPen] = useState("");
  const [fFlock, setFFlock] = useState("");
  const list = useMemo(() => {
    const totals = new Map<string, { good: number; cracked: number; rejected: number }>();
    for (const e of eggs.data ?? []) {
      const t = totals.get(e.session_id) ?? { good: 0, cracked: 0, rejected: 0 };
      t.good += e.good; t.cracked += e.cracked; t.rejected += e.rejected; totals.set(e.session_id, t);
    }
    return (sessions.data ?? [])
      .filter((s) => s.date >= from && s.date <= to && (!fPen || s.pen_id === fPen) && (!fFlock || s.flock_id === fFlock))
      .map((s) => ({ ...s, ...(totals.get(s.id) ?? { good: 0, cracked: 0, rejected: 0 }) }));
  }, [sessions.data, eggs.data, from, to, fPen, fFlock]);

  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of list) m.set(r.date, (m.get(r.date) ?? 0) + r.good + r.cracked);
    return m;
  }, [list]);
  const totalBirds = (flocks.data ?? []).reduce((s, f) => s + f.current_count, 0);

  if (pens.isLoading) return <Loading rows={5} />;
  if (!pens.data?.length) return <><PageHeader title="Egg Collection" /><Empty title="Add a pen first">Go to Pens & Cages to set up your farm.</Empty></>;

  const crateInfo = toCrates(totGood);

  return (
    <>
      <PageHeader title="Egg Collection" subtitle={editingId ? "Editing an existing entry" : "Record eggs for each cage tier"} />
      <Panel className="mb-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Date"><TextInput type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Pen"><Select value={penId} onChange={(e) => { setPenId(e.target.value); reset(); }}>{pens.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <div className="col-span-2">
            <span className="text-sm font-medium">Session</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(["morning", "evening"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setSession(s)} className={`h-12 rounded-xl border text-sm font-semibold capitalize ${session === s ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>{s}</button>
              ))}
            </div>
          </div>
        </div>
        {existing && existing.id !== editingId && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-warning/20 p-3 text-sm">
            <span>An entry already exists for this pen, date and session.</span>
            <Button size="sm" variant="outline" onClick={() => loadExisting(existing.id)}>Edit it</Button>
          </div>
        )}
        <div className="mt-4 text-xs text-muted-foreground">Flock: {flock?.name ?? "none assigned"} · {num(penBirds)} live birds</div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {CAGE_LABELS.map((cage) => (
            <div key={cage} className="space-y-3 rounded-2xl bg-secondary/50 p-3">
              <div className="font-semibold">Cage {cage}</div>
              {penTiers.filter((t) => t.cage === cage).map((t) => (
                <div key={t.id} className="rounded-xl border bg-card p-3">
                  <div className="mb-2 text-sm font-medium">{t.level}</div>
                  <Stepper value={counts[t.id]?.good ?? 0} onChange={(v) => set(t.id, "good", v)} quick={[10, 30]} />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-muted-foreground">Cracked
                      <NumInput inputMode="numeric" className="mt-1 h-10" value={counts[t.id]?.cracked || ""} onChange={(e) => set(t.id, "cracked", Number(e.target.value) || 0)} />
                    </label>
                    <label className="text-xs text-muted-foreground">Rejected
                      <NumInput inputMode="numeric" className="mt-1 h-10" value={counts[t.id]?.rejected || ""} onChange={(e) => set(t.id, "rejected", Number(e.target.value) || 0)} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Crates collected (optional)"><NumInput value={crates} onChange={(e) => setCrates(e.target.value)} placeholder={String(crateInfo.crates)} /></Field>
          <div className="rounded-xl bg-muted p-3 text-sm"><div className="text-muted-foreground">Good</div><div className="font-display text-xl font-bold">{totGood}</div><div className="text-xs">{crateInfo.crates} crates + {crateInfo.loose}</div></div>
          <div className="rounded-xl bg-muted p-3 text-sm"><div className="text-muted-foreground">Cracked / Rejected</div><div className="font-display text-xl font-bold">{totCracked} / {totRej}</div></div>
          <div className="rounded-xl bg-muted p-3 text-sm"><div className="text-muted-foreground">Session lay rate</div><div className="font-display text-xl font-bold">{layRate(totGood + totCracked, penBirds).toFixed(1)}%</div></div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="lg" className="h-14 flex-1 text-base" onClick={save} disabled={saving}>{saving ? "Saving…" : editingId ? "Update entry" : "Save collection"}</Button>
          {(editingId || totGood > 0) && <Button size="lg" variant="outline" className="h-14" onClick={reset}>Clear</Button>}
        </div>
      </Panel>

      <Panel title="Collection history">
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Select value={fPen} onChange={(e) => setFPen(e.target.value)}><option value="">All pens</option>{pens.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          <Select value={fFlock} onChange={(e) => setFFlock(e.target.value)}><option value="">All flocks</option>{flocks.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select>
        </div>
        {!list.length ? <Empty title="No collections in this range" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Date</th><th>Pen</th><th>Session</th><th className="text-right">Good</th><th className="text-right">Crk</th><th className="text-right">Rej</th><th className="text-right">Day total</th><th className="text-right">Lay %</th><th /></tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2">{r.date}</td>
                    <td>{pens.data.find((p) => p.id === r.pen_id)?.name}</td>
                    <td className="capitalize">{r.session}</td>
                    <td className="text-right font-medium">{r.good}</td>
                    <td className="text-right">{r.cracked}</td>
                    <td className="text-right">{r.rejected}</td>
                    <td className="text-right">{byDay.get(r.date)}</td>
                    <td className="text-right">{layRate(byDay.get(r.date) ?? 0, totalBirds).toFixed(0)}%</td>
                    <td className="whitespace-nowrap text-right">
                      <Button variant="ghost" size="icon" onClick={() => loadExisting(r.id)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
