import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTable, useRefresh, onError, db } from "@/hooks/use-farm";
import { Button } from "@/components/ui/button";
import { Empty, Loading, PageHeader, Panel, TextInput, NumInput } from "@/components/farm-ui";
import { CAGE_LABELS, TIER_LEVELS, num } from "@/lib/farm";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/pens")({
  head: () => ({ meta: [{ title: "Pens & Cages – Matsi Farms" }] }),
  component: PensPage,
});

function PensPage() {
  const pens = useTable("pens");
  const cages = useTable("cages");
  const tiers = useTable("tiers");
  const eggs = useTable("egg_collections");
  const refresh = useRefresh();
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const latestByTier = useMemo(() => {
    const m = new Map<string, { date: string; total: number }>();
    for (const e of eggs.data ?? []) {
      const cur = m.get(e.tier_id);
      const t = e.good + e.cracked;
      if (!cur || e.date > cur.date) m.set(e.tier_id, { date: e.date, total: t });
      else if (e.date === cur.date) cur.total += t;
    }
    return m;
  }, [eggs.data]);

  async function addPen() {
    const name = newName.trim() || `Pen ${(pens.data?.length ?? 0) + 1}`;
    try {
      await db(supabase.from("pens").insert({ name, sort_order: (pens.data?.length ?? 0) + 1 }));
      setNewName("");
      toast.success(`${name} added with Cage A & B`);
      refresh();
    } catch (e) { onError(e); }
  }
  async function rename(id: string) {
    if (!editName.trim()) { toast.error("Name is required"); return; }
    try {
      await db(supabase.from("pens").update({ name: editName.trim() }).eq("id", id));
      setEditing(null); refresh(); toast.success("Pen renamed");
    } catch (e) { onError(e); }
  }
  async function remove(id: string) {
    try { await db(supabase.from("pens").delete().eq("id", id)); refresh(); toast.success("Pen deleted"); } catch (e) { onError(e); }
  }
  async function setBirds(tierId: string, n: number) {
    try { await db(supabase.from("tiers").update({ bird_count: n }).eq("id", tierId)); refresh(); } catch (e) { onError(e); }
  }
  async function clearSample() {
    try {
      await db(supabase.from("flocks").delete().eq("is_sample", true));
      await db(supabase.from("pens").delete().eq("is_sample", true));
      await db(supabase.from("feed_stock").delete().eq("supplier", "Sample Feeds Ltd"));
      toast.success("Sample data cleared"); refresh();
    } catch (e) { onError(e); }
  }

  const hasSample = (pens.data ?? []).some((p) => p.is_sample);

  return (
    <>
      <PageHeader title="Pens & Cages" subtitle="Each pen has Cage A and Cage B, each with Top, Middle and Bottom tiers." />
      <Panel className="mb-5">
        <div className="flex gap-2">
          <TextInput placeholder={`Pen ${(pens.data?.length ?? 0) + 1}`} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button className="h-12 shrink-0" onClick={addPen}><Plus className="h-4 w-4" /> Add pen</Button>
        </div>
      </Panel>

      {pens.isLoading ? <Loading /> : !pens.data?.length ? (
        <Empty title="No pens yet">Add your first pen above.</Empty>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {pens.data.map((p) => {
            const pc = (cages.data ?? []).filter((c) => c.pen_id === p.id);
            const birds = (tiers.data ?? []).filter((t) => t.pen_id === p.id).reduce((s, t) => s + t.bird_count, 0);
            return (
              <Panel key={p.id}>
                <div className="mb-4 flex items-center justify-between gap-2">
                  {editing === p.id ? (
                    <div className="flex flex-1 gap-2">
                      <TextInput value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                      <Button className="h-12" onClick={() => rename(p.id)}>Save</Button>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-lg font-semibold">{p.name} {p.is_sample && <span className="ml-1 rounded bg-accent/30 px-1.5 text-xs">sample</span>}</h2>
                      <p className="text-xs text-muted-foreground">{num(birds)} birds</p>
                    </div>
                  )}
                  {editing !== p.id && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(p.id); setEditName(p.name); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {p.name}?</AlertDialogTitle>
                            <AlertDialogDescription>This removes its cages and all egg records for this pen.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove(p.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {CAGE_LABELS.map((label) => {
                    const cage = pc.find((c) => c.label === label);
                    return (
                      <div key={label} className="rounded-xl bg-secondary/60 p-2">
                        <div className="mb-2 text-center text-sm font-semibold">Cage {label}</div>
                        <div className="space-y-2">
                          {TIER_LEVELS.map((lvl) => {
                            const t = (tiers.data ?? []).find((x) => x.cage_id === cage?.id && x.level === lvl);
                            const latest = t ? latestByTier.get(t.id) : undefined;
                            return (
                              <div key={lvl} className="rounded-lg border bg-card p-2">
                                <div className="text-xs font-medium text-muted-foreground">{lvl}</div>
                                <div className="mt-1 flex items-center gap-1">
                                  <NumInput
                                    key={t?.bird_count}
                                    defaultValue={t?.bird_count ?? 0}
                                    className="h-9 px-2 text-sm"
                                    aria-label="birds"
                                    onBlur={(e) => t && Number(e.target.value) !== t.bird_count && setBirds(t.id, Number(e.target.value) || 0)}
                                  />
                                  <span className="text-xs text-muted-foreground">birds</span>
                                </div>
                                <div className="mt-1 text-xs">🥚 {latest ? `${latest.total} on ${latest.date}` : "—"}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {hasSample && (
        <Panel className="mt-6" title="Sample data">
          <p className="mb-3 text-sm text-muted-foreground">Remove the sample pens, flock and records once you're ready to enter your own farm.</p>
          <Button variant="destructive" onClick={clearSample}>Clear sample data</Button>
        </Panel>
      )}
    </>
  );
}
