import { differenceInCalendarDays, format, parseISO, addDays } from "date-fns";

export const APP_NAME = "Matsi Farms";
export const EGGS_PER_CRATE = 30;

export const todayISO = () => format(new Date(), "yyyy-MM-dd");

export const naira = (n: number | null | undefined) =>
  "₦" + Number(n ?? 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });

export const num = (n: number | null | undefined, d = 0) =>
  Number(n ?? 0).toLocaleString("en-NG", { maximumFractionDigits: d });

/** Age of a flock in days, given its placement date and age when placed. */
export function flockAgeDays(datePlaced: string, ageAtPlacementDays: number, today = new Date()) {
  return Math.max(0, differenceInCalendarDays(today, parseISO(datePlaced)) + (ageAtPlacementDays || 0));
}

export type Stage = "Brooding" | "Growing" | "Pre-lay" | "Laying" | "Post-peak";

/** Production stage from age in weeks for commercial layers. */
export function productionStage(ageDays: number): Stage {
  const w = ageDays / 7;
  if (w < 6) return "Brooding";
  if (w < 16) return "Growing";
  if (w < 19) return "Pre-lay";
  if (w < 50) return "Laying";
  return "Post-peak";
}

/** Lay rate % = eggs ÷ live birds × 100. */
export function layRate(eggs: number, liveBirds: number) {
  if (!liveBirds) return 0;
  return (eggs / liveBirds) * 100;
}

export function toCrates(eggs: number) {
  return { crates: Math.floor(eggs / EGGS_PER_CRATE), loose: eggs % EGGS_PER_CRATE };
}

export type VaccineStatus = "Done" | "Overdue" | "Due";
export function vaccineStatus(dueDate: string, done: boolean, today = todayISO()): VaccineStatus {
  if (done) return "Done";
  return dueDate < today ? "Overdue" : "Due";
}

/** Typical Nigerian commercial layer vaccination program (age in days). */
export const VACCINE_TEMPLATE: { name: string; age: number; route: string; dosage: string }[] = [
  { name: "Marek's disease", age: 1, route: "Subcutaneous (neck)", dosage: "0.2 ml/bird" },
  { name: "Newcastle (ND) – HB1 / Intraocular", age: 7, route: "Eye drop", dosage: "1 drop/bird" },
  { name: "Gumboro (IBD) – 1st", age: 14, route: "Drinking water", dosage: "1 dose/bird" },
  { name: "Newcastle (ND) – Lasota 1st", age: 21, route: "Drinking water", dosage: "1 dose/bird" },
  { name: "Gumboro (IBD) – 2nd", age: 28, route: "Drinking water", dosage: "1 dose/bird" },
  { name: "Infectious Bronchitis (IB)", age: 35, route: "Drinking water", dosage: "1 dose/bird" },
  { name: "Fowl pox", age: 42, route: "Wing web", dosage: "1 dose/bird" },
  { name: "Newcastle (ND) – Lasota 2nd", age: 49, route: "Drinking water", dosage: "1 dose/bird" },
  { name: "Fowl typhoid", age: 56, route: "Intramuscular", dosage: "0.5 ml/bird" },
  { name: "Newcastle (ND) – Komarov", age: 70, route: "Intramuscular", dosage: "0.5 ml/bird" },
  { name: "Egg Drop Syndrome (EDS)", age: 112, route: "Intramuscular", dosage: "0.5 ml/bird" },
  { name: "Newcastle (ND) – Lasota booster", age: 126, route: "Drinking water", dosage: "1 dose/bird" },
];

/** Build schedule rows from the template, relative to a flock's placement. */
export function buildSchedule(flock: { id: string; date_placed: string; age_at_placement_days: number }) {
  const hatch = addDays(parseISO(flock.date_placed), -(flock.age_at_placement_days || 0));
  return VACCINE_TEMPLATE.filter((v) => v.age >= (flock.age_at_placement_days || 0)).map((v) => ({
    flock_id: flock.id,
    vaccine_name: v.name,
    age_days: v.age,
    due_date: format(addDays(hatch, v.age), "yyyy-MM-dd"),
    route: v.route,
    dosage: v.dosage,
  }));
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0] ?? {});
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    `${APP_NAME} – ${filename}`,
    `Exported ${format(new Date(), "yyyy-MM-dd HH:mm")}`,
    "",
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `matsi-farms-${filename.toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const TIER_LEVELS = ["Top", "Middle", "Bottom"] as const;
export const CAGE_LABELS = ["A", "B"] as const;
