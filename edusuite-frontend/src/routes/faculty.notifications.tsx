import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { ModulePage, TableItem } from "@/components/dashboard/module-page";
import api from "@/lib/api";

export const Route = createFileRoute("/faculty/notifications")({
  head: () => ({
    meta: [{ title: "Notifications — EduSuite Pro" }],
  }),
  component: FacultyNotificationsPage,
});

function FacultyNotificationsPage() {
  const [items, setItems] = useState<TableItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionCount, setActionCount] = useState(0);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await api.get("/api/notifications");
        const list = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
        const unread = typeof res.data?.unreadCount === "number" ? res.data.unreadCount : list.filter((n: any) => !n.isRead).length;
        const actions = list.filter((n: any) => 
          n.type === "FACULTY_EVALUATION" || 
          n.type?.includes("SHORTAGE") || 
          n.type?.includes("RESCHED")
        ).length;

        setTotalCount(list.length);
        setUnreadCount(unread);
        setActionCount(actions);

        const mapped: TableItem[] = list.map((n: any) => ({
          id: n.id,
          name: n.title,
          category: n.type || "Examination",
          date: new Date(n.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          status: !n.isRead ? "Pending" : "Completed",
          details: n.message,
          metric: !n.isRead ? "Unread" : "Read",
        }));

        setItems(mapped);
      } catch (err) {
        console.error("Failed to load faculty notifications:", err);
      }
    }
    loadNotifications();
  }, []);

  return (
    <ModulePage
      title="Notifications"
      description="Real-time examination notices, faculty evaluation duties, and timetable alerts"
      icon={Bell}
      tabs={["All", "Pending", "Completed"]}
      highlights={[
        { label: "Total Notifications", value: totalCount.toString() },
        { label: "Unread Badges", value: unreadCount.toString() },
        { label: "Action Required", value: `${actionCount} Alerts` },
        { label: "Last Checked", value: "Live" },
      ]}
      initialItems={items}
    />
  );
}
