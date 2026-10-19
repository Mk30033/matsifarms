import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Matsi Farms" },
      { name: "description", content: "Matsi Farms – manage pens, flocks, eggs, feed and health." },
      { property: "og:title", content: "Matsi Farms" },
      { property: "og:description", content: "Matsi Farms – manage pens, flocks, eggs, feed and health." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/dashboard" : "/auth" });
  },
});
