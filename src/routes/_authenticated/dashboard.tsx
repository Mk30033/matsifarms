import { createFileRoute } from "@tanstack/react-router";
import { Empty, PageHeader } from "@/components/farm-ui";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard – Matsi Farms" }] }),
  component: () => (
    <>
      <PageHeader title="Dashboard" />
      <Empty title="Coming soon">This section isn't finished yet.</Empty>
    </>
  ),
});
