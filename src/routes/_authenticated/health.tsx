import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTable, useRefresh, onError, db } from "@/hooks/use-farm";
import { Button } from "@/components/ui/button";
import { Empty, Field, Loading, NumInput, PageHeader, Panel, Select, TextInput, VaccineBadge } from "@/components/farm-ui";
import { naira, num, todayISO, vaccineStatus } from "@/lib/farm";

export const Route = createFileRoute("/_authenticated/health")({
  head: () => ({
    meta: [
      { title: "Health & Vet – Matsi Farms" },
      { name: "description", content: "Vaccination schedule, treatments and vet visits for Matsi Farms." },
      { property: "og:title", content: "Health & Vet – Matsi Farms" },
      { property: "og:description", content: "Vaccination schedule, treatments and vet visits for Matsi Farms." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HealthPage,
});

function HealthPage() {
  const flocks = useTable("flocks");
  const schedule = useTable("vaccination_schedule");
  const records = useTable("vaccination_records");
  const treatments = useTable("treatments");
  const visits = useTable("vet_visits");
  const refresh = useRefresh();

  const [vacFlock, setVacFlock] = useState("");
  const [rec, setRec] = useState({ flock_id: "", vaccine_name: "", date_given: todayISO(), route: "", dosage: "", batch_number: "" });
  const [trt, setTrt] = useState({ flock_id: "", drug: "", reason: "", start_date: todayISO(), end_date: "", dosage: "", withdrawal_days: "" });
  const [vet, setVet] = useState({ date: todayISO(), vet_name: "", diagnosis: "", cost: "", notes: "" });

  useEffect(() => {
    if (!vacFlock && flocks.data?.length) setVacFlock(flocks.data[0]!.id);
    if (!rec.flock_id && flocks.data?.length) setRec((r) => ({ ...r, flock_id: flocks.data![0]!.id }));
    if (!trt.flock_id && flocks.data?.length) setTrt((r) => ({ ...r, flock_id: flocks.data![0]!.id }));
  }, [flocks.data]);

  const doneBySchedule = useMemo(() => new Set(records.data?.map((r) => r.schedule_id).filter(Boolean)), [records.data]);
  const flockName = (id: string | null) => flocks.data?.find((f) => f.id === id)?.name ?? "";

  const vacRows = useMemo(
    () => (schedule.data ?? []).filter((s) => s.flock_id === vacFlock),
    [schedule.data, vacFlock],
  );

  const outstanding = useMemo(() => {
    const today = todayISO();
    return (schedule.data ?? [])
      .filter((s) => !doneBySchedule.has(s.id) && s.due_date <= format(addDays(new Date(), 7), "yyyy-MM-dd"))
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 8);
  }, [schedule.data, doneBySchedule]);

  async function markDone(id: string) {
    const s = schedule.data?.find((x) => x.id === id);
    if (!s) return;
    try {
      await db(supabase.from("vaccination_records").insert({
        flock_id: s.flock_id, vaccine_name: s.vaccine_name, date_given: todayISO(),
        route: s.route, dosage: s.dosage, schedule_id: s.id,
      }));
      toast.success(`${s.vaccine_name} marked done`);
      refresh();
    } catch (e) { onError(e); }
  }

  async function saveRecord() {
    if (!rec.flock_id) { toast.error("Select a flock"); return; }
    if (!rec.vaccine_name.trim()) { toast.error("Enter the vaccine name"); return; }
    try {
      await db(supabase.from("vaccination_records").insert({
        flock_id: rec.flock_id, vaccine_name: rec.vaccine_name.trim(), date_given: rec.date_given,
        route: rec.route || null, dosage: rec.dosage || null, batch_number: rec.batch_number || null,
      }));
      toast.success("Vaccination recorded");
      setRec({ ...rec, vaccine_name: "", route: "", dosage: "", batch_number: "" });
      refresh();
    } catch (e) { onError(e); }
  }

  async function saveTreatment() {
    if (!trt.flock_id) { toast.error("Select a flock"); return; }
    if (!trt.drug.trim()) { toast.error("Enter the drug name"); return; }
    try {
      await db(supabase.from("treatments").insert({
        flock_id: trt.flock_id, drug: trt.drug.trim(), reason: trt.reason || null,
        start_date: trt.start_date, end_date: trt.end_date || null, dosage: trt.dosage || null,
        withdrawal_days: trt.withdrawal_days ? Number(trt.withdrawal_days) : null,
      }));
      toast.success("Treatment saved");
      setTrt({ ...trt, drug: "", reason: "", end_date: "", dosage: "", withdrawal_days: "" });
      refresh();
    } catch (e) { onError(e); }
  }

  async function saveVisit() {
    try {
      await db(supabase.from("vet_visits").insert({
        date: vet.date, vet_name: vet.vet_name || null, diagnosis: vet.diagnosis || null,
        cost: vet.cost ? Number(vet.cost) : null, notes: vet.notes || null,
      }));
      toast.success("Vet visit saved");
      setVet({ ...vet, vet_name: "", diagnosis: "", cost: "", notes: "" });
      refresh();
    } catch (e) { onError(e); }
  }

  async function del(table: "treatments" | "vet_visits", id: string) {
    if (!confirm("Delete this record?")) return;
    try { await db(supabase.from(table).delete().eq("id", id)); refresh(); } catch (e) { onError(e); }
  }

  const holdUntil = (start: string, end: string | null, days: number | null) =>
    format(addDays(parseISO(end ?? start), days ?? 0), "yyyy-MM-dd");
  const today = todayISO();

  if (flocks.isLoading) return <><PageHeader title="Health & Vet" /><Loading rows={4} /></>;

  return (
    <>
      <PageHeader title="Health & Vet" subtitle="Vaccinations, treatments and vet visits" />

      <Panel title="Vaccinations due or overdue" className="mb-5">
        <Field label="Flock" className="mb-3 max-w-xs">
          <Select value={vacFlock} onChange={(e) => setVacFlock(e.target.value)}>
            {flocks.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        </Field>
        {!outstanding.length && !vacRows.some((s) => !doneBySchedule.has(s.id)) ? (
          <Empty title="All caught up">No vaccinations are due in the next 7 days.</Empty>
        ) : (
          <ul className="divide-y text-sm">
            {outstanding.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-2.5">
                <div>
                  <div className="font-medium">{s.vaccine_name}</div>
                  <div className="text-xs text-muted-foreground">{flockName(s.flock_id)} · due {s.due_date}{s.age_days ? ` · day ${s.age_days}` : ""}{s.route ? ` · ${s.route}` : ""}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <VaccineBadge status={vaccineStatus(s.due_date, false, today)} />
                  <Button size="sm" variant="outline" onClick={() => markDone(s.id)}>Done</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Record a treatment">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Flock"><Select value={trt.flock_id} onChange={(e) => setTrt({ ...trt, flock_id: e.target.value })}>{flocks.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
            <Field label="Drug"><TextInput value={trt.drug} onChange={(e) => setTrt({ ...trt, drug: e.target.value })} placeholder="e.g. Amprolium" /></Field>
            <Field label="Reason"><TextInput value={trt.reason} onChange={(e) => setTrt({ ...trt, reason: e.target.value })} placeholder="e.g. coccidiosis" /></Field>
            <Field label="Dosage"><TextInput value={trt.dosage} onChange={(e) => setTrt({ ...trt, dosage: e.target.value })} placeholder="e.g. 1 ml/L water" /></Field>
            <Field label="Start date"><TextInput type="date" value={trt.start_date} max={today} onChange={(e) => setTrt({ ...trt, start_date: e.target.value })} /></Field>
            <Field label="End date"><TextInput type="date" value={trt.end_date} onChange={(e) => setTrt({ ...trt, end_date: e.target.value })} /></Field>
            <Field label="Egg withdrawal (days)"><NumInput value={trt.withdrawal_days} onChange={(e) => setTrt({ ...trt, withdrawal_days: e.target.value })} placeholder="e.g. 5" /></Field>
          </div>
          <Button size="lg" className="mt-4 h-12 w-full text-base" onClick={saveTreatment}>Save treatment</Button>
        </Panel>

        <Panel title="Log a vet visit">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><TextInput type="date" value={vet.date} max={today} onChange={(e) => setVet({ ...vet, date: e.target.value })} /></Field>
            <Field label="Vet"><TextInput value={vet.vet_name} onChange={(e) => setVet({ ...vet, vet_name: e.target.value })} placeholder="name" /></Field>
            <Field label="Diagnosis"><TextInput value={vet.diagnosis} onChange={(e) => setVet({ ...vet, diagnosis: e.target.value })} placeholder="findings" /></Field>
            <Field label="Cost (₦)"><NumInput value={vet.cost} onChange={(e) => setVet({ ...vet, cost: e.target.value })} /></Field>
          </div>
          <Field label="Notes" className="mt-3"><TextInput value={vet.notes} onChange={(e) => setVet({ ...vet, notes: e.target.value })} /></Field>
          <Button size="lg" className="mt-4 h-12 w-full text-base" onClick={saveVisit}>Save visit</Button>
        </Panel>
      </div>

      <Panel title="Treatment history" className="mt-5">
        {treatments.isLoading ? <Loading /> : !treatments.data?.length ? <Empty title="No treatments yet" /> : (
          <ul className="divide-y text-sm">
            {treatments.data.map((t) => {
              const hold = holdUntil(t.start_date, t.end_date, t.withdrawal_days);
              const active = hold >= today;
              return (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div>
                    <div className="font-medium">{t.drug} · {flockName(t.flock_id)}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.start_date}{t.end_date ? `–${t.end_date}` : ""}{t.reason ? ` · ${t.reason}` : ""}
                      {t.withdrawal_days ? ` · eggs on hold until ${hold}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {active && t.withdrawal_days ? (
                      <span className="inline-flex rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">Eggs on hold</span>
                    ) : null}
                    <Button variant="ghost" size="icon" onClick={() => del("treatments", t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Vet visit history" className="mt-5">
        {visits.isLoading ? <Loading /> : !visits.data?.length ? <Empty title="No vet visits yet" /> : (
          <ul className="divide-y text-sm">
            {visits.data.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 py-2.5">
                <div>
                  <div className="font-medium">{v.date}{v.vet_name ? ` · ${v.vet_name}` : ""}</div>
                  <div className="text-xs text-muted-foreground">{v.diagnosis || "—"}{v.notes ? ` · ${v.notes}` : ""}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {v.cost ? <span className="text-xs font-medium">{naira(v.cost)}</span> : null}
                  <Button variant="ghost" size="icon" onClick={() => del("vet_visits", v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
