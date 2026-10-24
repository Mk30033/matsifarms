import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Bird, Egg, HeartPulse, LayoutDashboard, LogOut, Shield, Skull, Warehouse, Wheat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildSchedule } from "@/lib/farm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard, mobile: true },
  { to: "/eggs", label: "Egg Collection", short: "Eggs", icon: Egg, mobile: true },
  { to: "/flocks", label: "Flocks", short: "Flocks", icon: Bird, mobile: true },
  { to: "/feed", label: "Feed", short: "Feed", icon: Wheat, mobile: true },
  { to: "/health", label: "Health & Vet", short: "Health", icon: HeartPulse, mobile: true },
  { to: "/mortality", label: "Mortality & Culls", short: "Losses", icon: Skull, mobile: false },
  { to: "/pens", label: "Pens & Cages", short: "Pens", icon: Warehouse, mobile: false },
  { to: "/reports", label: "Reports", short: "Reports", icon: BarChart3, mobile: false },
  { to: "/admin", label: "Admin Dashboard", short: "Admin", icon: Shield, mobile: false, adminOnly: true },
] as const;

function useSeed() {
  const qc = useQueryClient();
  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("farm_settings").select("seeded").maybeSingle();
      if (s?.seeded) return;
      const { error } = await supabase.rpc("seed_sample_data");
      if (error) return;
      const { data: flocks } = await supabase.from("flocks").select("id,date_placed,age_at_placement_days").eq("is_sample", true);
      for (const f of flocks ?? []) {
        const rows = buildSchedule(f);
        if (rows.length) await supabase.from("vaccination_schedule").insert(rows);
      }
      qc.invalidateQueries();
    })();
  }, [qc]);
}

function Shell() {
  useSeed();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = Route.useRouteContext();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => setIsAdmin((data ?? []).some((r) => r.role === "admin")));
  }, [user.id]);

  const visibleNav = NAV.filter((n) => !("adminOnly" in n && n.adminOnly) || isAdmin);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Egg className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold">Matsi Farms</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "opacity-80 hover:bg-sidebar-accent/60",
                )}
              >
                <n.icon className={cn("h-5 w-5", active && "text-sidebar-primary")} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs">
          <div className="truncate opacity-70">{user.email}</div>
          <button onClick={signOut} className="mt-2 flex items-center gap-2 font-medium hover:text-sidebar-primary">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Egg className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold">Matsi Farms</span>
          </div>
          <div className="flex items-center gap-1">
            {NAV.filter((n) => !n.mobile).map((n) => (
              <Link key={n.to} to={n.to} aria-label={n.label} className={cn("rounded-lg p-2", path.startsWith(n.to) ? "bg-secondary text-primary" : "text-muted-foreground")}>
                <n.icon className="h-5 w-5" />
              </Link>
            ))}
            <button onClick={signOut} aria-label="Sign out" className="rounded-lg p-2 text-muted-foreground">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="pb-safe mx-auto max-w-6xl px-4 pt-5 md:px-8 md:pb-10 md:pt-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.filter((n) => n.mobile).map((n) => {
          const active = path.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
              <n.icon className={cn("h-6 w-6", active && "fill-primary/15")} />
              {n.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
