import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTable, useRefresh, onError, db } from "@/hooks/use-farm";
import { Button } from "@/components/ui/button";
import { Empty, Field, Loading, NumInput, PageHeader, Panel, Select, Stat, TextInput } from "@/components/farm-ui";
import { feedSummary } from "@/lib/feed";
import { naira, num, todayISO } from "@/lib/farm";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Feed – Matsi Farms" },
      { name: "description", content: "Track feed stock, usage and how many days of feed are left." },
      { property: "og:title", content: "Feed – Matsi Farms" },
      { property: "og:description", content: "Track feed stock, usage and how many days of feed are left." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedPage,
});

const TYPES = ["starter", "grower", "layer"] as const;
type FeedType = (typeof TYPES)[number];

function FeedPage() {
  const stock = useTable("feed_stock");
  const usage = useTable("feed_usage");
  const pens = useTable("pens");
  const refresh = useRefresh();

  const sum = useMemo(() => feedSummary(stock.data ?? [], usage.data ?? []), [stock.data, usage.data]);

  const settings = useQuery({
    queryKey: ["farm_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("farm_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const threshold = settings.data?.low_feed_threshold_kg ?? 200;

  const [d, setD] = useState({ date_received: todayISO(), feed_type: "layer" as FeedType, bags: "", kg_per_bag: "25", cost_per_bag: "", supplier: "" });
  const [u, setU] = useState({ date: todayISO(), feed_type: "layer" as FeedType, kg: "", pen_id: "" });
  const [thr, setThr] = useState("");

  async function saveDelivery() {
    if (Number(d.bags) <= 0) { toast.error("Enter the number of bags"); return; }
    try {
      await db(supabase.from("feed_stock").insert({
        date_received: d.date_received, feed_type: d.feed_type, bags: Number(d.bags),
        kg_per_bag: Number(d.kg_per_bag) || 25, cost_per_bag: Number(d.cost_per_bag) || 0, supplier: d.supplier || null,
      }));
      toast.success(`Added ${num(Number(d.bags) * (Number(d.kg_per_bag) || 25))} kg of ${d.feed_type}`);
      setD({ ...d, bags: "", cost_per_bag: "", supplier: "" });
      refresh();
    } catch (e) { onError(e); }
  }

  async function saveUsage() {
    if (Number(u.kg) <= 0) { toast.error("Enter the kg used"); return; }
    try {
      await db(supabase.from("feed_usage").insert({
        date: u.date, feed_type: u.feed_type, kg: Number(u.kg), pen_id: u.pen_id || null,
      }));
      toast.success(`Logged ${num(Number(u.kg))} kg used`);
      setU({ ...u, kg: "" });
      refresh();
    } catch (e) { onError(e); }
  }

  async function saveThreshold() {
    const v = Number(thr);
    if (!thr || v < 0) { toast.error("Enter a valid weight in kg"); return; }
    try {
      if (settings.data) await db(supabase.from("farm_settings").update({ low_feed_threshold_kg: v }).eq("id", settings.data.id));
      else await db(supabase.from("farm_settings").insert({ low_feed_threshold_kg: v }));
      toast.success("Low-stock alert updated");
      setThr("");
      settings.refetch();
    } catch (e) { onError(e); }
  }

  async function delStock(id: string) {
    if (!confirm("Delete this delivery?")) return;
    try { await db(supabase.from("feed_stock").delete().eq("id", id)); refresh(); } catch (e) { onError(e); }
  }
  async function delUsage(id: string) {
    if (!confirm("Delete this usage record?")) return;
    try { await db(supabase.from("feed_usage").delete().eq("id", id)); refresh(); } catch (e) { onError(e); }
  }

  const daysLeft = sum.daysLeft === Infinity ? "—" : `${sum.daysLeft.toFixed(1)} days`;
  const feedTone = sum.onHand < threshold ? ("bad" as const) : sum.daysLeft < 7 ? ("warn" as const) : undefined;

  if (stock.isLoading || usage.isLoading) return <><PageHeader title="Feed" /><Loading rows={4} /></>;

  return (
    <>
      <PageHeader title="Feed" subtitle="Stock in, feed out, and how long it will last" />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Feed on hand" value={`${num(sum.onHand)} kg`} hint={sum.byType.map((t) => `${t.type[0]!.toUpperCase()} ${num(Math.max(0, t.kg))}`).join(" · ")} />
        <Stat label="Days left" value={daysLeft} tone={feedTone} hint={sum.onHand < threshold ? `Below your ${num(threshold)} kg alert level` : `Using ~${num(sum.avgDaily)} kg/day`} />
        <Stat label="Avg daily use" value={`${num(sum.avgDaily, 1)} kg`} hint="Last 14 days" />
        <Stat label="Cost per kg" value={naira(sum.costPerKg)} hint={`${num(sum.usedKg)} kg used to date`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Record a delivery">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date received"><TextInput type="date" value={d.date_received} max={todayISO()} onChange={(e) => setD({ ...d, date_received: e.target.value })} /></Field>
            <Field label="Type"><Select value={d.feed_type} onChange={(e) => setD({ ...d, feed_type: e.target.value as FeedType })}>{TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}</Select></Field>
            <Field label="Bags"><NumInput value={d.bags} onChange={(e) => setD({ ...d, bags: e.target.value })} placeholder="e.g. 50" /></Field>
            <Field label="Kg per bag"><NumInput value={d.kg_per_bag} onChange={(e) => setD({ ...d, kg_per_bag: e.target.value })} /></Field>
            <Field label="Cost per bag (₦)"><NumInput value={d.cost_per_bag} onChange={(e) => setD({ ...d, cost_per_bag: e.target.value })} placeholder="e.g. 27000" /></Field>
            <Field label="Supplier"><TextInput value={d.supplier} onChange={(e) => setD({ ...d, supplier: e.target.value })} placeholder="optional" /></Field>
          </div>
          <Button size="lg" className="mt-4 h-12 w-full text-base" onClick={saveDelivery}>Add to stock</Button>
        </Panel>

        <Panel title="Record feed used">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><TextInput type="date" value={u.date} max={todayISO()} onChange={(e) => setU({ ...u, date: e.target.value })} /></Field>
            <Field label="Type"><Select value={u.feed_type} onChange={(e) => setU({ ...u, feed_type: e.target.value as FeedType })}>{TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}</Select></Field>
            <Field label="Kg used"><NumInput value={u.kg} onChange={(e) => setU({ ...u, kg: e.target.value })} placeholder="e.g. 75" /></Field>
            <Field label="Pen (optional)"><Select value={u.pen_id} onChange={(e) => setU({ ...u, pen_id: e.target.value })}><option value="">Whole farm</option>{pens.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          </div>
          <Button size="lg" className="mt-4 h-12 w-full text-base" onClick={saveUsage}>Log usage</Button>
          <div className="mt-4 flex items-end gap-2 border-t pt-3">
            <Field label={`Low-stock alert (kg) — now ${num(threshold)} kg`} className="flex-1"><NumInput value={thr} onChange={(e) => setThr(e.target.value)} placeholder={String(threshold)} /></Field>
            <Button variant="outline" className="h-12" onClick={saveThreshold}>Save</Button>
          </div>
        </Panel>
      </div>

      <Panel title="Deliveries" className="mt-5">
        {!stock.data?.length ? <Empty title="No deliveries yet" /> : (
          <ul className="divide-y text-sm">
            {stock.data.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2.5">
                <div>
                  <div className="font-medium capitalize">{r.date_received} · {r.feed_type} · {num(r.bags)} bags</div>
                  <div className="text-xs text-muted-foreground">{num(Number(r.bags) * Number(r.kg_per_bag))} kg · {naira(Number(r.bags) * Number(r.cost_per_bag))}{r.supplier ? ` · ${r.supplier}` : ""}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => delStock(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Usage history" className="mt-5">
        {!usage.data?.length ? <Empty title="No usage logged yet" /> : (
          <ul className="divide-y text-sm">
            {usage.data.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2.5">
                <div>
                  <div className="font-medium capitalize">{r.date} · {r.feed_type} · {num(r.kg)} kg</div>
                  <div className="text-xs text-muted-foreground">{pens.data?.find((p) => p.id === r.pen_id)?.name ?? "Whole farm"}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => delUsage(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
