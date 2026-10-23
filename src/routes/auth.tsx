import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Egg } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in – Matsi Farms" },
      { name: "description", content: "Sign in to Matsi Farms." },
      { property: "og:title", content: "Sign in – Matsi Farms" },
      { property: "og:description", content: "Sign in to Matsi Farms." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Enter your username");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password,
      });
      if (error) throw error;
      navigate({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Wrong username or password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-primary-foreground">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-soft">
          <Egg className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold">Matsi Farms</h1>
        <p className="mt-2 text-center opacity-80">Layer farm records — pens, eggs, feed & health</p>
      </div>
      <div className="rounded-t-3xl bg-card px-6 pb-10 pt-8 shadow-soft sm:mx-auto sm:mb-16 sm:w-full sm:max-w-md sm:rounded-3xl">
        <h2 className="text-2xl font-semibold">Welcome back</h2>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              required
              autoComplete="username"
              autoCapitalize="none"
              className="h-12"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Password</Label>
            <Input
              id="pw"
              type="password"
              required
              autoComplete="current-password"
              className="h-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={busy}>
            {busy ? "Please wait…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Need an account? Ask your admin.
        </p>
      </div>
    </div>
  );
}
