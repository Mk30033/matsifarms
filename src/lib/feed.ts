import type { Row } from "@/hooks/use-farm";

/** Feed stock math: kg on hand, average daily use (last 14 days), days remaining. */
export function feedSummary(stock: Row<"feed_stock">[], usage: Row<"feed_usage">[], today = new Date()) {
  const receivedKg = stock.reduce((s, r) => s + Number(r.bags) * Number(r.kg_per_bag), 0);
  const usedKg = usage.reduce((s, r) => s + Number(r.kg), 0);
  const totalCost = stock.reduce((s, r) => s + Number(r.bags) * Number(r.cost_per_bag), 0);
  const costPerKg = receivedKg ? totalCost / receivedKg : 0;
  const cutoff = new Date(today.getTime() - 14 * 864e5).toISOString().slice(0, 10);
  const recent = usage.filter((u) => u.date > cutoff);
  const days = new Set(recent.map((u) => u.date)).size || 1;
  const avgDaily = recent.reduce((s, r) => s + Number(r.kg), 0) / days;
  const onHand = Math.max(0, receivedKg - usedKg);
  const byType = (["starter", "grower", "layer"] as const).map((t) => ({
    type: t,
    kg: stock.filter((s) => s.feed_type === t).reduce((a, r) => a + Number(r.bags) * Number(r.kg_per_bag), 0) -
      usage.filter((u) => u.feed_type === t).reduce((a, r) => a + Number(r.kg), 0),
  }));
  return { onHand, avgDaily, daysLeft: avgDaily ? onHand / avgDaily : Infinity, costPerKg, byType, usedKg };
}
