import {
  LayoutDashboard,
  User,
  CalendarRange,
  BookOpen,
  ClipboardList,
  CalendarCheck,
  FileSpreadsheet,
  TrendingUp,
  Wallet,
  BarChart3,
  Bell,
  Settings,
  Users,
  Award,
} from "lucide-react";
import type { NavSection } from "@/config/navigation";

export const FACULTY_NAVIGATION: NavSection[] = [
  {
    label: "Faculty Workspace",
    items: [
      { title: "Dashboard / Work Wallet", url: "/faculty/dashboard", icon: LayoutDashboard },
      { title: "Academics", url: "/faculty/subjects", icon: BookOpen },
      { title: "My Classes / Students", url: "/faculty/students", icon: Users },
      { title: "Attendance", url: "/faculty/attendance", icon: CalendarCheck },
      { title: "Timetable", url: "/faculty/timetable", icon: CalendarRange },
      { title: "LMS", url: "/faculty/lms", icon: BookOpen },
      { title: "Examinations", url: "/faculty/examinations", icon: FileSpreadsheet },
      { title: "Exam Notifications", url: "/hod/exam-notifications", icon: Bell, badge: "Dept" },
      { title: "Results", url: "/faculty/results", icon: Award },
      { title: "Lesson Plans", url: "/faculty/lesson-plan", icon: ClipboardList },
      { title: "Faculty Work & Research", url: "/faculty/research", icon: TrendingUp },
      { title: "Leave", url: "/faculty/leave", icon: CalendarRange },
      { title: "Payroll", url: "/faculty/payroll", icon: Wallet },
      { title: "Reports", url: "/faculty/reports", icon: BarChart3 },
      { title: "Notifications", url: "/faculty/notifications", icon: Bell },
      { title: "My Profile", url: "/faculty/profile", icon: User },
      { title: "Settings", url: "/faculty/settings", icon: Settings },
    ],
  },
];
