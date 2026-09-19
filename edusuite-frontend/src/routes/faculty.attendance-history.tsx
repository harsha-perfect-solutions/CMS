import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/faculty/attendance-history")({
  beforeLoad: () => {
    throw redirect({
      to: "/anits/attendance",
      search: { tab: "history" } as any,
    });
  },
  component: () => null,
});
