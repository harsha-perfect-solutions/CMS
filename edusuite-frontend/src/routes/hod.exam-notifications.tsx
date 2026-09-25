import { createFileRoute } from "@tanstack/react-router";
import { ExamNotificationManager } from "@/modules/examinations/ExamNotificationManager";
import { useRole } from "@/context/role-context";

export const Route = createFileRoute("/hod/exam-notifications")({
  head: () => ({
    meta: [{ title: "Department Exam Notifications — HOD Portal" }],
  }),
  component: HodExamNotificationsPage,
});

function HodExamNotificationsPage() {
  const { department } = useRole();
  return <ExamNotificationManager mode="hod" defaultDepartment={department || "CSE"} />;
}
