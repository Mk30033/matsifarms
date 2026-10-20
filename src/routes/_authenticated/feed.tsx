import { createFileRoute } from "@tanstack/react-router";
import { Empty, PageHeader } from "@/components/farm-ui";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Feed – Matsi Farms" }] }),
  component: () => (
    <>
      <PageHeader title="Feed" />
      <Empty title="Coming soon">This section isn't finished yet.</Empty>
    </>
  ),
});
