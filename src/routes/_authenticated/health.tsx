import { createFileRoute } from "@tanstack/react-router";
import { Empty, PageHeader } from "@/components/farm-ui";

export const Route = createFileRoute("/_authenticated/health")({
  head: () => ({ meta: [{ title: "Health & Vet – Matsi Farms" }] }),
  component: () => (
    <>
      <PageHeader title="Health & Vet" />
      <Empty title="Coming soon">This section isn't finished yet.</Empty>
    </>
  ),
});
