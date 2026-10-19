import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password – Matsi Farms" },
      { name: "description", content: "Set a new Matsi Farms password." },
      { property: "og:title", content: "Reset password – Matsi Farms" },
      { property: "og:description", content: "Set a new Matsi Farms password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <form onSubmit={save} className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-6 shadow-soft">
        <h1 className="text-2xl font-bold">Matsi Farms</h1>
        <p className="text-sm text-muted-foreground">Choose a new password</p>
        <Input type="password" minLength={6} required className="h-12" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button className="h-12 w-full">Save password</Button>
      </form>
    </div>
  );
}
