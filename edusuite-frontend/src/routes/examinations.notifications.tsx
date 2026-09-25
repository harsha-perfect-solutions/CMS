import { createFileRoute } from "@tanstack/react-router";
import { ExamNotificationManager } from "@/modules/examinations/ExamNotificationManager";

export const Route = createFileRoute("/examinations/notifications")({
  head: () => ({ meta: [{ title: "Exam Notifications — EduSuite Pro" }] }),
  component: ExamNotificationsPage,
});

export function ExamNotificationsPage() {
  return <ExamNotificationManager mode="super-admin" />;
}

