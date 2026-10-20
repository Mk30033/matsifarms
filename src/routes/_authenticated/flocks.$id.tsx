import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useTable, useRefresh, onError, db } from "@/hooks/use-farm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, Loading, NumInput, PageHeader, Panel, Stat, StageBadge, TextInput, VaccineBadge } from "@/components/farm-ui";
import { flockAgeDays, layRate, num, productionStage, todayISO, vaccineStatus } from "@/lib/farm";
import { FlockForm } from "./flocks.index";

export const Route = createFileRoute("/_authenticated/flocks/$id")({
  head: () => ({ meta: [{ title: "Flock – Matsi Farms" }] }),
  component: FlockDetail,
});

function FlockDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const refresh = useRefresh();
  const flocks = useTable("flocks");
  const sessions = useTable("egg_sessions");
  const eggs = useTable("egg_collections");
  const morts = useTable("mortality_logs");
  const sched = useTable("vaccination_schedule");
  const recs = useTable("vaccination_records");
  const feed = useTable("feed_usage");
  const weights = useTable("weight_logs");
  const [edit, setEdit] = useState(false);
  const [w, setW] = useState({ date: todayISO(), avg: "", n: "" });

  const flock = flocks.data?.find((f) => f.id === id);
  const sessionIds = new Set((sessions.data ?? []).filter((s) => s.flock_id === id).map((s) => s.id));
  const eggDays = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of eggs.data ?? []) if (sessionIds.has(e.session_id)) m.set(e.date, (m.get(e.date) ?? 0) + e.good + e.cracked);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-30).map(([date, eggs]) => ({ date: date.slice(5), eggs }));
  }, [eggs.data, sessions.data]);

  if (flocks.isLoading) return <Loading rows={4} />;
  if (!flock) return <Empty title="Flock not found"><Link to="/flocks" className="text-primary">Back to flocks</Link></Empty>;

  const age = flockAgeDays(flock.date_placed, flock.age_at_placement_days);
  const fm = (morts.data ?? []).filter((m) => m.flock_id === id);
  const fs = (sched.data ?? []).filter((s) => s.flock_id === id);
  const fr = (recs.data ?? []).filter((r) => r.flock_id === id);
  const ff = (feed.data ?? []).filter((r) => r.flock_id === id);
  const fw = (weights.data ?? []).filter((r) => r.flock_id === id);
  const lastDay = eggDays.at(-1)?.eggs ?? 0;

  async function del() {
    if (!confirm("Delete this flock and all its records?")) return;
    try { await db(supabase.from("flocks").delete().eq("id", id)); refresh(); navigate({ to: "/flocks" }); toast.success("Flock deleted"); } catch (e) { onError(e); }
  }
  async function addWeight() {
    if (!Number(w.avg)) { toast.error("Enter average weight"); return; }
    try { await db(supabase.from("weight_logs").insert({ flock_id: id, date: w.date, avg_weight_g: Number(w.avg), sample_size: Number(w.n) || null })); setW({ ...w, avg: "", n: "" }); refresh(); toast.success("Weight logged"); } catch (e) { onError(e); }
  }

  return (
    <>
      <Link to="/flocks" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Flocks</Link>
      <PageHeader title={flock.name} subtitle={`${flock.breed || "—"} · ${flock.hatchery || "—"} · placed ${flock.date_placed}`}
        action={<div className="flex gap-2"><Button variant="outline" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" /> Edit</Button><Button variant="ghost" onClick={del}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>} />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Live birds" value={num(flock.current_count)} hint={`${num(flock.starting_count - flock.current_count)} lost`} />
        <Stat label="Age" value={`${Math.floor(age / 7)}w ${age % 7}d`} hint={<StageBadge stage={productionStage(age)} />} />
        <Stat label="Last day eggs" value={num(lastDay)} />
        <Stat label="Lay rate" value={`${layRate(lastDay, flock.current_count).toFixed(1)}%`} />
      </div>
      <Tabs defaultValue="eggs">
        <TabsList className="mb-3 flex w-full overflow-x-auto"><TabsTrigger value="eggs">Eggs</TabsTrigger><TabsTrigger value="mort">Mortality</TabsTrigger><TabsTrigger value="vac">Vaccines</TabsTrigger><TabsTrigger value="feed">Feed</TabsTrigger><TabsTrigger value="weight">Weight</TabsTrigger></TabsList>
        <TabsContent value="eggs"><Panel>{eggDays.length ? (
          <div className="h-64"><ResponsiveContainer><BarChart data={eggDays}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="eggs" fill="var(--chart-1)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        ) : <Empty title="No eggs recorded for this flock" />}</Panel></TabsContent>
        <TabsContent value="mort"><Panel>{fm.length ? <ul className="divide-y text-sm">{fm.map((m) => <li key={m.id} className="flex justify-between py-2"><span>{m.date} · <span className="capitalize">{m.kind}</span> · {m.cause || "—"}</span><b>{m.count}</b></li>)}</ul> : <Empty title="No losses recorded" />}</Panel></TabsContent>
        <TabsContent value="vac"><Panel>{fs.length ? <ul className="divide-y text-sm">{fs.map((s) => { const r = fr.find((x) => x.schedule_id === s.id); return <li key={s.id} className="flex items-center justify-between gap-2 py-2"><span>{s.vaccine_name}<br /><span className="text-xs text-muted-foreground">Due {s.due_date}{r ? ` · given ${r.date_given}` : ""}</span></span><VaccineBadge status={vaccineStatus(s.due_date, !!r)} /></li>; })}</ul> : <Empty title="No schedule" />}</Panel></TabsContent>
        <TabsContent value="feed"><Panel>{ff.length ? <ul className="divide-y text-sm">{ff.map((u) => <li key={u.id} className="flex justify-between py-2"><span>{u.date} · <span className="capitalize">{u.feed_type}</span></span><b>{num(u.kg, 1)} kg</b></li>)}</ul> : <Empty title="No feed logged for this flock" />}</Panel></TabsContent>
        <TabsContent value="weight"><Panel>
          <div className="mb-3 grid grid-cols-3 gap-2"><TextInput type="date" value={w.date} onChange={(e) => setW({ ...w, date: e.target.value })} /><NumInput placeholder="Avg g" value={w.avg} onChange={(e) => setW({ ...w, avg: e.target.value })} /><NumInput placeholder="Sample" value={w.n} onChange={(e) => setW({ ...w, n: e.target.value })} /></div>
          <Button className="mb-3 w-full" onClick={addWeight}>Log body weight</Button>
          {fw.length ? <ul className="divide-y text-sm">{fw.map((x) => <li key={x.id} className="flex justify-between py-2"><span>{x.date}{x.sample_size ? ` · n=${x.sample_size}` : ""}</span><b>{num(x.avg_weight_g)} g</b></li>)}</ul> : <Empty title="No weights yet" />}
        </Panel></TabsContent>
      </Tabs>
      <Dialog open={edit} onOpenChange={setEdit}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit flock</DialogTitle></DialogHeader><FlockForm flock={flock} onDone={() => setEdit(false)} /></DialogContent></Dialog>
    </>
  );
}
