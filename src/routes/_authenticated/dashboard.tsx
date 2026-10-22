import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTable } from "@/hooks/use-farm";
import { Empty, Loading, PageHeader, Panel, StageBadge, Stat } from "@/components/farm-ui";
import { feedSummary } from "@/lib/feed";
import { flockAgeDays, layRate, num, productionStage, toCrates, todayISO, vaccineStatus } from "@/lib/farm";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard – Matsi Farms" },
      { name: "description", content: "Today's eggs, lay rate, feed left and health alerts at a glance." },
      { property: "og:title", content: "Dashboard – Matsi Farms" },
      { property: "og:description", content: "Today's eggs, lay rate, feed left and health alerts at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const flocks = useTable("flocks");
  const pens = useTable("pens");
  const sessions = useTable("egg_sessions");
  const eggs = useTable("egg_collections");
  const mortality = useTable("mortality_logs");
  const stock = useTable("feed_stock");
  const usage = useTable("feed_usage");
  const schedule = useTable("vaccination_schedule");
  const records = useTable("vaccination_records");

  const loading = flocks.isLoading || sessions.isLoading || eggs.isLoading || stock.isLoading || usage.isLoading || schedule.isLoading || records.isLoading;

  const today = todayISO();
  const birds = (flocks.data ?? []).reduce((s, f) => s + f.current_count, 0);

  const totalsBySession = useMemo(() => {
    const m = new Map<string, { good: number; cracked: number; rejected: number }>();
    for (const e of eggs.data ?? []) {
      const t = m.get(e.session_id) ?? { good: 0, cracked: 0, rejected: 0 };
      t.good += e.good; t.cracked += e.cracked; t.rejected += e.rejected;
      m.set(e.session_id, t);
    }
    return m;
  }, [eggs.data]);

  const todayEggs = useMemo(
    () => (sessions.data ?? []).filter((s) => s.date === today).reduce((n, s) => n + (totalsBySession.get(s.id)?.good ?? 0) + (totalsBySession.get(s.id)?.cracked ?? 0), 0),
    [sessions.data, totalsBySession, today],
  );

  const last7 = useMemo(() => {
    const cutoff = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
    const days = new Map<string, number>();
    for (const s of sessions.data ?? []) {
      if (s.date < cutoff) continue;
      const t = totalsBySession.get(s.id);
      if (t) days.set(s.date, (days.get(s.date) ?? 0) + t.good + t.cracked);
    }
    return [...days.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [sessions.data, totalsBySession]);

  const weekGood = last7.reduce((s, [, n]) => s + n, 0);
  const weekRate = layRate(weekGood / 7, birds);

  const feed = useMemo(() => feedSummary(stock.data ?? [], usage.data ?? []), [stock.data, usage.data]);

  const losses7 = useMemo(() => {
    const cutoff = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
    return (mortality.data ?? []).filter((m) => m.date >= cutoff).reduce((s, m) => s + m.count, 0);
  }, [mortality.data]);

  const overdueVacs = useMemo(() => {
    const done = new Set(records.data?.map((r) => r.schedule_id).filter(Boolean));
    return (schedule.data ?? []).filter((s) => !done.has(s.id) && vaccineStatus(s.due_date, false, today) === "Overdue");
  }, [schedule.data, records.data, today]);

  const maxDay = Math.max(1, ...last7.map(([, n]) => n));

  if (loading) return <><PageHeader title="Dashboard" /><Loading rows={5} /></>;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={birds ? `${num(birds)} birds across ${flocks.data?.length ?? 0} flock${flocks.data?.length === 1 ? "" : "s"}` : undefined}
        action={<Link to="/eggs" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Record eggs</Link>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Eggs today" value={num(todayEggs)} hint={toCrates(todayEggs).crates ? `${toCrates(todayEggs).crates} crates + ${toCrates(todayEggs).loose}` : undefined} />
        <Stat label="7-day lay rate" value={`${weekRate.toFixed(1)}%`} hint={`${num(weekGood)} eggs this week`} />
        <Stat
          label="Feed left"
          value={feed.daysLeft === Infinity ? "—" : `${feed.daysLeft.toFixed(0)} days`}
          tone={feed.onHand === 0 ? "bad" : feed.daysLeft < 7 ? "warn" : undefined}
          hint={`${num(feed.onHand)} kg on hand`}
        />
        <Stat label="Losses (7 days)" value={num(losses7)} tone={losses7 > birds * 0.01 ? "warn" : undefined} hint={overdueVacs.length ? `${overdueVacs.length} overdue vaccine${overdueVacs.length === 1 ? "" : "s"}` : "Vaccines up to date"} />
      </div>

      {!flocks.data?.length ? (
        <Empty title="Set up your farm">Add a pen and a flock to start tracking production.</Empty>
      ) : (
        <Panel title="Flocks" className="mb-5">
          <ul className="divide-y text-sm">
            {flocks.data.map((f) => {
              const age = flockAgeDays(f.date_placed, f.age_at_placement_days);
              return (
                <li key={f.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div>
                    <Link to="/flocks/$id" params={{ id: f.id }} className="font-medium hover:text-primary">{f.name}</Link>
                    <div className="text-xs text-muted-foreground">{pens.data?.find((p) => p.id === f.pen_id)?.name ?? "No pen"} · {num(f.current_count)} birds · {Math.floor(age / 7)} weeks</div>
                  </div>
                  <StageBadge stage={productionStage(age)} />
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {last7.length > 0 && (
        <Panel title="Eggs – last 7 days" className="mb-5">
          <div className="flex h-32 items-end gap-2">
            {last7.map(([day, n]) => (
              <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t-lg bg-primary/80" style={{ height: `${Math.max(4, (n / maxDay) * 100)}%` }} />
                <span className="text-[10px] text-muted-foreground">{day.slice(5)}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {overdueVacs.length > 0 && (
        <Panel title="Overdue vaccinations" action={<Link to="/health" className="text-sm font-medium text-primary">Open Health</Link>}>
          <ul className="divide-y text-sm">
            {overdueVacs.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-2.5">
                <div>
                  <div className="font-medium">{s.vaccine_name}</div>
                  <div className="text-xs text-muted-foreground">{flocks.data?.find((f) => f.id === s.flock_id)?.name} · due {s.due_date}</div>
                </div>
                <span className="inline-flex rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">Overdue</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
