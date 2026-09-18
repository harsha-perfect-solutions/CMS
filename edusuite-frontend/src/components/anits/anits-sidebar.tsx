import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Calendar,
  ClipboardCheck,
  Users,
  GraduationCap,
  Layers,
  DoorOpen,
  FileBarChart,
  UserCheck,
  Clock,
  BookOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnitsUserProfile } from "./anits-header";

export function AnitsSidebar({ user }: { user: AnitsUserProfile | null }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const searchStr = useRouterState({ select: (r) => r.location.searchStr });
  const fullPath = searchStr ? `${pathname}${searchStr}` : pathname;

  const role = user?.anitsRole || "STUDENT";

  const getNavItems = () => {
    switch (role) {
      case "ANITS_ADMIN":
        return [
          { label: "Dashboard", href: "/anits/dashboard", icon: LayoutDashboard },
          { label: "Master Timetable", href: "/anits/timetable", icon: Calendar },
          { label: "Attendance", href: "/anits/attendance", icon: ClipboardCheck },
          { label: "Faculty", href: "/anits/my-classes?tab=faculty", icon: Users },
          { label: "Students", href: "/anits/my-classes?tab=students", icon: GraduationCap },
          { label: "Sections", href: "/anits/my-classes?tab=sections", icon: Layers },
          { label: "Rooms", href: "/anits/timetable?tab=rooms", icon: DoorOpen },
          { label: "Reports", href: "/anits/reports", icon: FileBarChart },
          { label: "Profile", href: "/anits/profile", icon: Settings },
        ];

      case "HOD":
        return [
          { label: "Dashboard", href: "/anits/dashboard", icon: LayoutDashboard },
          { label: "Department Timetable", href: "/anits/timetable", icon: Calendar },
          { label: "Attendance", href: "/anits/attendance", icon: ClipboardCheck },
          { label: "Faculty Attendance", href: "/anits/attendance?tab=faculty", icon: UserCheck },
          { label: "Student Attendance", href: "/anits/attendance?tab=student", icon: GraduationCap },
          { label: "Reports", href: "/anits/reports", icon: FileBarChart },
          { label: "Profile", href: "/anits/profile", icon: Settings },
        ];

      case "FACULTY":
        return [
          { label: "Dashboard", href: "/anits/dashboard", icon: LayoutDashboard },
          { label: "My Timetable", href: "/anits/timetable", icon: Calendar },
          { label: "Take Attendance", href: "/anits/attendance", icon: ClipboardCheck },
          { label: "My Classes", href: "/anits/my-classes", icon: BookOpen },
          { label: "Attendance History", href: "/anits/attendance?tab=history", icon: Clock },
          { label: "Reports", href: "/anits/reports", icon: FileBarChart },
          { label: "Profile", href: "/anits/profile", icon: Settings },
        ];

      case "STUDENT":
      default:
        return [
          { label: "Dashboard", href: "/anits/dashboard", icon: LayoutDashboard },
          { label: "My Timetable", href: "/anits/timetable", icon: Calendar },
          { label: "My Attendance", href: "/anits/attendance", icon: ClipboardCheck },
          { label: "Attendance History", href: "/anits/attendance?tab=history", icon: Clock },
          { label: "Profile", href: "/anits/profile", icon: Settings },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border/40 bg-card/60 backdrop-blur-md">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border/40 flex items-center gap-3">
        <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-sm">
          A
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-xs tracking-tight text-foreground">
            ANITS PORTAL
          </p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            {role.replace("_", " ")}
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Management
        </div>
        {navItems.map((item) => {
          const isActive =
            item.href.includes("?")
              ? fullPath === item.href
              : pathname === item.href || (item.href !== "/anits/dashboard" && pathname.startsWith(item.href) && !fullPath.includes("?"));

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href as any}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className={cn("size-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Institutional Footer */}
      <div className="p-4 border-t border-border/40 bg-muted/10">
        <div className="rounded-xl bg-muted/40 p-3 border border-border/40 text-[11px] text-muted-foreground">
          <p className="font-bold text-foreground">ANITS Visakhapatnam</p>
          <p className="text-[10px] mt-0.5">Autonomous Institution</p>
          <p className="text-[9px] text-muted-foreground/70 mt-1">Affiliated to Andhra University</p>
        </div>
      </div>
    </aside>
  );
}
