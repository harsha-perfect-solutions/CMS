import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/anits/rooms")({
  beforeLoad: () => {
    throw redirect({
      to: "/anits/timetable",
      search: { tab: "room" },
    });
  },
});
