import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createAppUser, listAdminUsers, setUserPassword, type AdminUser } from "@/lib/admin.functions";
import { PageHeader, Panel, Field, TextInput, Button } from "@/components/farm-ui";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard – Matsi Farms" },
      { name: "description", content: "Manage Matsi Farms user accounts." },
      { property: "og:title", content: "Admin Dashboard – Matsi Farms" },
      { property: "og:description", content: "Manage Matsi Farms user accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async () => {
    try {
      const users = await listAdminUsers();
      return { users };
    } catch {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminPage,
});

function AdminPage() {
  const initial = Route.useLoaderData().users;
  const [users, setUsers] = useState<AdminUser[]>(initial);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");

  async function reload() {
    setUsers(await listAdminUsers());
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createAppUser({ data: { username, password } });
      toast.success(`Account "${username.trim()}" created`);
      setUsername("");
      setPassword("");
      await reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(userId: string, uname: string) {
    setBusy(true);
    try {
      await setUserPassword({ data: { userId, password: newPw } });
      toast.success(`Password updated for ${uname}`);
      setResetFor(null);
      setNewPw("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const me = Route.useRouteContext().user;

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Create users and manage passwords" />

      <Panel title="Create a new user" className="mb-5">
        <form onSubmit={addUser} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Username">
            <TextInput required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. Musa" />
          </Field>
          <Field label="Password">
            <TextInput required type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password for this user" />
          </Field>
          <Button type="submit" size="lg" className="h-12" disabled={busy}>
            <UserPlus className="h-4 w-4" /> Create user
          </Button>
        </form>
      </Panel>

      <Panel title={`Users (${users.length})`}>
        {!users.length ? (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <div className="divide-y">
            {users.map((u) => (
              <div key={u.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{u.username}</div>
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(u.createdAt).toLocaleDateString()}
                      {u.id === me.id && " · you"}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setResetFor(resetFor === u.id ? null : u.id);
                      setNewPw("");
                    }}
                  >
                    <KeyRound className="h-4 w-4" /> Change password
                  </Button>
                </div>
                {resetFor === u.id && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      savePassword(u.id, u.username);
                    }}
                    className="mt-2 flex flex-wrap items-end gap-2"
                  >
                    <Field label="New password" className="min-w-48 flex-1">
                      <TextInput required type="text" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                    </Field>
                    <Button type="submit" disabled={busy}>Save</Button>
                    <Button type="button" variant="ghost" onClick={() => setResetFor(null)}>Cancel</Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
