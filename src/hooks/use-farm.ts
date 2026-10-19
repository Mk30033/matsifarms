import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Tables = Database["public"]["Tables"];
export type TableName = keyof Tables;
export type Row<T extends TableName> = Tables[T]["Row"];

const ORDER: Partial<Record<TableName, { col: string; asc: boolean }>> = {
  pens: { col: "sort_order", asc: true },
  flocks: { col: "date_placed", asc: false },
  egg_sessions: { col: "date", asc: false },
  egg_collections: { col: "date", asc: false },
  mortality_logs: { col: "date", asc: false },
  feed_stock: { col: "date_received", asc: false },
  feed_usage: { col: "date", asc: false },
  vaccination_schedule: { col: "due_date", asc: true },
  vaccination_records: { col: "date_given", asc: false },
  treatments: { col: "start_date", asc: false },
  vet_visits: { col: "date", asc: false },
  weight_logs: { col: "date", asc: false },
};

/** Load all rows of a table for the signed-in user (RLS scopes to the owner). */
export function useTable<T extends TableName>(table: T) {
  return useQuery({
    queryKey: ["t", table],
    queryFn: async () => {
      const all: Row<T>[] = [];
      const o = ORDER[table];
      for (let from = 0; ; from += 1000) {
        let q = supabase.from(table).select("*").range(from, from + 999);
        if (o) q = q.order(o.col, { ascending: o.asc });
        const { data, error } = await q;
        if (error) throw error;
        all.push(...(data as unknown as Row<T>[]));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });
}

export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["t"] });
}

export function onError(e: unknown) {
  const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Something went wrong";
  toast.error(msg);
}

export async function db<T>(p: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}
