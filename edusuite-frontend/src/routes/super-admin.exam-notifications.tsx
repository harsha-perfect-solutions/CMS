import { createFileRoute } from "@tanstack/react-router";
import { ExamNotificationManager } from "@/modules/examinations/ExamNotificationManager";

export const Route = createFileRoute("/super-admin/exam-notifications")({
  head: () => ({
    meta: [{ title: "Exam Notification Management — Super Admin" }],
  }),
  component: SuperAdminExamNotificationsPage,
});

function SuperAdminExamNotificationsPage() {
  return <ExamNotificationManager mode="super-admin" />;
}
