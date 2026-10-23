import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { usernameToEmail } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";

type AdminContext = { supabase: Database extends never ? never : any; userId: string };

/** Verify the caller has the admin role, then hand back the service-role client. */
async function requireAdmin(context: AdminContext) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !isAdmin) throw new Error("Only admins can do that");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type AdminUser = { id: string; username: string; createdAt: string };

export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    const admin = await requireAdmin(context as AdminContext);
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    return data.users
      .map((u) => {
        const meta = (u.user_metadata ?? {}) as Record<string, string>;
        const fallback = u.email ? u.email.split("@")[0] : "";
        return {
          id: u.id,
          username: meta["username"] || fallback || "user",
          createdAt: u.created_at,
        };
      })
      .sort((a, b) => a.username.localeCompare(b.username));
  });

export const createAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { username: string; password: string }) => {
    const username = (input.username ?? "").trim();
    const password = input.password ?? "";
    if (username.length < 2) throw new Error("Username must be at least 2 characters");
    if (password.length < 4) throw new Error("Password must be at least 4 characters");
    return { username, password };
  })
  .handler(async ({ data, context }): Promise<AdminUser> => {
    const admin = await requireAdmin(context as AdminContext);
    const { data: existing } = await admin
      .from("profiles")
      .select("user_id")
      .eq("username", data.username)
      .maybeSingle();
    if (existing) throw new Error("That username is already taken");
    const { data: created, error } = await admin.auth.admin.createUser({
      email: usernameToEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username },
    });
    if (error) throw new Error(error.message);
    const userId = created.user!.id;
    await admin.from("user_roles").insert({ user_id: userId, role: "user" });
    return { id: userId, username: data.username, createdAt: created.user!.created_at };
  });

export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; password: string }) => {
    if ((input.password ?? "").length < 4) throw new Error("Password must be at least 4 characters");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const admin = await requireAdmin(context as AdminContext);
    const { error } = await admin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
