import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useTable } from "@/hooks/use-farm";
import { Button } from "@/components/ui/button";
import { Empty, Field, Loading, PageHeader, Panel, Select, Stat, TextInput } from "@/components/farm-ui";
import { downloadCSV, layRate, naira, num, todayISO } from "@/lib/farm";
import { feedSummary } from "@/lib/feed";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports – Matsi Farms" },
      { name: "description", content: "Production, mortality and feed reports with CSV export." },
      { property: "og:title", content: "Reports – Matsi Farms" },
      { property: "og:description", content: "Production, mortality and feed reports with CSV export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const flocks = useTable("flocks");
  const pens = useTable("pens");
  const sessions = useTable("egg_sessions");
  const eggs = useTable("egg_collections");
  const mortality = useTable("mortality_logs");
  const stock = useTable("feed_stock");
  const usage = useTable("feed_usage");

  const loading = flocks.isLoading || sessions.isLoading || eggs.isLoading || mortality.isLoading || stock.isLoading || usage.isLoading;

  const [from, setFrom] = useState(() => new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState(todayISO());
  const [fFlock, setFFlock] = useState("");

  const inRange = useMemo(() => (sessions.data ?? []).filter((s) => s.date >= from && s.date <= to && (!fFlock || s.flock_id === fFlock)), [sessions.data, from, to, fFlock]);

  const totalsBySession = useMemo(() => {
    const m = new Map<string, { good: number; cracked: number; rejected: number }>();
    for (const e of eggs.data ?? []) {
      const t = m.get(e.session_id) ?? { good: 0, cracked: 0, rejected: 0 };
      t.good += e.good; t.cracked += e.cracked; t.rejected += e.rejected;
      m.set(e.session_id, t);
    }
    return m;
  }, [eggs.data]);

  const byFlock = useMemo(() => {
    const m = new Map<string, { good: number; cracked: number; rejected: number }>();
    for (const s of inRange) {
      const t = totalsBySession.get(s.id) ?? { good: 0, cracked: 0, rejected: 0 };
      const key = s.flock_id ?? "";
      const c = m.get(key) ?? { good: 0, cracked: 0, rejected: 0 };
      c.good += t.good; c.cracked += t.cracked; c.rejected += t.rejected;
      m.set(key, c);
    }
    return m;
  }, [inRange, totalsBySession]);

  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of inRange) {
      const t = totalsBySession.get(s.id);
      if (t) m.set(s.date, (m.get(s.date) ?? 0) + t.good + t.cracked);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [inRange, totalsBySession]);

  const grand = useMemo(() => {
    let good = 0, cracked = 0, rejected = 0;
    for (const s of inRange) {
      const t = totalsBySession.get(s.id) ?? { good: 0, cracked: 0, rejected: 0 };
      good += t.good; cracked += t.cracked; rejected += t.rejected;
    }
    return { good, cracked, rejected };
  }, [inRange, totalsBySession]);

  const birds = (flocks.data ?? []).filter((f) => !fFlock || f.id === fFlock).reduce((s, f) => s + f.current_count, 0);
  const dayCount = byDay.length || 1;

  const mort = useMemo(() => {
    const rows = (mortality.data ?? []).filter((m) => m.date >= from && m.date <= to && (!fFlock || m.flock_id === fFlock));
    const byCause = new Map<string, number>();
    let deaths = 0, culls = 0;
    for (const r of rows) {
      if (r.kind === "cull") culls += r.count; else deaths += r.count;
      const c = (r.cause ?? "Unknown").trim() || "Unknown";
      byCause.set(c, (byCause.get(c) ?? 0) + r.count);
    }
    return { rows, deaths, culls, byCause: [...byCause.entries()].sort((a, b) => b[1] - a[1]) };
  }, [mortality.data, from, to, fFlock]);

  const feedUsed = useMemo(() => {
    const rows = (usage.data ?? []).filter((u) => u.date >= from && u.date <= to);
    const kg = rows.reduce((s, r) => s + Number(r.kg), 0);
    const sum = feedSummary(stock.data ?? [], usage.data ?? []);
    return { rows, kg, estCost: kg * sum.costPerKg };
  }, [usage.data, stock.data, from, to]);

  function exportEggs() {
    downloadCSV("egg-production", inRange
      .map((s) => ({
        date: s.date, pen: pens.data?.find((p) => p.id === s.pen_id)?.name ?? "",
        flock: flocks.data?.find((f) => f.id === s.flock_id)?.name ?? "", session: s.session,
        good: totalsBySession.get(s.id)?.good ?? 0, cracked: totalsBySession.get(s.id)?.cracked ?? 0,
        rejected: totalsBySession.get(s.id)?.rejected ?? 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)));
  }

  function exportMortality() {
    downloadCSV("mortality", mort.rows
      .map((m) => ({ date: m.date, kind: m.kind, count: m.count, cause: m.cause ?? "", flock: flocks.data?.find((f) => f.id === m.flock_id)?.name ?? "" }))
      .sort((a, b) => a.date.localeCompare(b.date)));
  }

  function exportFeed() {
    downloadCSV("feed-usage", feedUsed.rows
      .map((u) => ({ date: u.date, feed_type: u.feed_type, kg: u.kg, pen: pens.data?.find((p) => p.id === u.pen_id)?.name ?? "" }))
      .sort((a, b) => a.date.localeCompare(b.date)));
  }

  if (loading) return <><PageHeader title="Reports" /><Loading rows={5} /></>;

  return (
    <>
      <PageHeader title="Reports" subtitle="Production, losses and feed for any date range" />

      <Panel className="mb-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="From"><TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><TextInput type="date" value={to} max={todayISO()} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="Flock"><Select value={fFlock} onChange={(e) => setFFlock(e.target.value)}><option value="">All flocks</option>{flocks.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
        </div>
      </Panel>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Eggs collected" value={num(grand.good + grand.cracked)} hint={`${num(grand.good)} good · ${num(grand.cracked)} cracked · ${num(grand.rejected)} rejected`} />
        <Stat label="Average lay rate" value={`${layRate(grand.good / dayCount, birds).toFixed(1)}%`} hint={`${num(grand.good / dayCount, 0)} eggs/day avg · ${num(birds)} birds`} />
        <Stat label="Losses" value={num(mort.deaths + mort.culls)} hint={`${num(mort.deaths)} deaths · ${num(mort.culls)} culls`} />
        <Stat label="Feed used" value={`${num(feedUsed.kg)} kg`} hint={naira(feedUsed.estCost) ? `~${naira(feedUsed.estCost)} est. cost` : undefined} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Production by flock" action={<Button variant="outline" size="sm" onClick={exportEggs}><Download className="h-4 w-4" /> CSV</Button>}>
          {!byFlock.size ? <Empty title="No collections in this range" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Flock</th><th className="text-right">Good</th><th className="text-right">Cracked</th><th className="text-right">Rejected</th></tr></thead>
                <tbody>
                  {[...byFlock.entries()].map(([id, t]) => (
                    <tr key={id} className="border-t">
                      <td className="py-2 font-medium">{flocks.data?.find((f) => f.id === id)?.name ?? "Unassigned"}</td>
                      <td className="text-right">{num(t.good)}</td>
                      <td className="text-right">{num(t.cracked)}</td>
                      <td className="text-right">{num(t.rejected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Eggs by day" action={<Button variant="outline" size="sm" onClick={exportFeed}><Download className="h-4 w-4" /> Feed CSV</Button>}>
          {!byDay.length ? <Empty title="No collections in this range" /> : (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 text-left text-xs text-muted-foreground bg-card"><tr><th className="py-2">Date</th><th className="text-right">Eggs</th><th className="text-right">Crates</th></tr></thead>
                <tbody>
                  {byDay.map(([day, n]) => (
                    <tr key={day} className="border-t">
                      <td className="py-2">{day}</td>
                      <td className="text-right font-medium">{num(n)}</td>
                      <td className="text-right text-muted-foreground">{Math.floor(n / 30)} + {n % 30}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Losses by cause" className="mt-5" action={<Button variant="outline" size="sm" onClick={exportMortality}><Download className="h-4 w-4" /> CSV</Button>}>
        {!mort.byCause.length ? <Empty title="No losses in this range" /> : (
          <ul className="divide-y text-sm">
            {mort.byCause.map(([cause, n]) => (
              <li key={cause} className="flex items-center justify-between gap-2 py-2.5">
                <span className="font-medium">{cause}</span>
                <span>{num(n)} birds</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
