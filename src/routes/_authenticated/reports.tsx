import { createFileRoute } from "@tanstack/react-router";
import { Empty, PageHeader } from "@/components/farm-ui";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports – Matsi Farms" }] }),
  component: () => (
    <>
      <PageHeader title="Reports" />
      <Empty title="Coming soon">This section isn't finished yet.</Empty>
    </>
  ),
});
