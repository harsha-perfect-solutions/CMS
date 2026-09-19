import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Calendar,
  ClipboardCheck,
  Users,
  GraduationCap,
  Layers,
  FileBarChart,
  UserCheck,
  Clock,
  BookOpen,
  User,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import type { AnitsUserProfile } from "./anits-header";

export function AnitsSidebar({
  user,
  onNavigate,
}: {
  user: AnitsUserProfile | null;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const searchStr = useRouterState({ select: (r) => r.location.searchStr });
  const fullPath = searchStr ? `${pathname}${searchStr}` : pathname;

  const [menuQuery, setMenuQuery] = useState("");
  const role = user?.anitsRole || "STUDENT";

  const getPortalTitle = () => {
    switch (role) {
      case "ANITS_ADMIN":
        return "Administration";
      case "HOD":
        return "HOD Portal";
      case "FACULTY":
        return "Faculty Portal";
      case "STUDENT":
      default:
        return "Student Portal";
    }
  };

  const getNavItems = () => {
    switch (role) {
      case "ANITS_ADMIN":
        return [
          { label: "Dashboard", href: "/anits/dashboard", icon: LayoutDashboard },
          { label: "Master Timetable", href: "/anits/timetable", icon: Calendar },
          { label: "Attendance", href: "/anits/attendance", icon: ClipboardCheck },
          { label: "Classes & Cohorts", href: "/anits/my-classes", icon: BookOpen },
          { label: "Faculty", href: "/anits/faculty", icon: Users },
          { label: "Students", href: "/anits/students", icon: GraduationCap },
          { label: "Reports", href: "/anits/reports", icon: FileBarChart },
          { label: "Profile", href: "/anits/profile", icon: User },
        ];

      case "HOD":
        return [
          { label: "Dashboard", href: "/anits/dashboard", icon: LayoutDashboard },
          { label: "Department Timetable", href: "/anits/timetable", icon: Calendar },
          { label: "Attendance", href: "/anits/attendance", icon: ClipboardCheck },
          { label: "Reports", href: "/anits/reports", icon: FileBarChart },
          { label: "Profile", href: "/anits/profile", icon: User },
        ];

      case "FACULTY":
        return [
          { label: "Dashboard", href: "/anits/dashboard", icon: LayoutDashboard },
          { label: "My Timetable", href: "/anits/timetable", icon: Calendar },
          { label: "Attendance", href: "/anits/attendance", icon: ClipboardCheck },
          { label: "My Classes", href: "/anits/my-classes", icon: BookOpen },
          { label: "Reports", href: "/anits/reports", icon: FileBarChart },
          { label: "Profile", href: "/anits/profile", icon: User },
        ];

      case "STUDENT":
      default:
        return [
          { label: "Dashboard", href: "/anits/dashboard", icon: LayoutDashboard },
          { label: "My Timetable", href: "/anits/timetable", icon: Calendar },
          { label: "My Attendance", href: "/anits/attendance", icon: ClipboardCheck },
          { label: "Attendance History", href: "/anits/attendance?tab=history", icon: Clock },
          { label: "Profile", href: "/anits/profile", icon: User },
        ];
    }
  };

  const navItems = getNavItems().filter((item) =>
    item.label.toLowerCase().includes(menuQuery.trim().toLowerCase())
  );

  const getInitials = (name?: string) => {
    if (!name) return "KS";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const displayName = user?.name || (role === "STUDENT" ? "K. Sai Teja" : "Faculty User");
  const displayRole =
    role === "STUDENT"
      ? "Student"
      : role === "FACULTY"
      ? "Faculty"
      : role === "HOD"
      ? "HOD"
      : "Admin";

  return (
    <aside className="flex h-full w-64 flex-col bg-[#0A1128] text-white border-r border-[#172242] select-none">
      {/* 1. Header with EduSuite Pro branding & ANITS tag */}
      <div className="flex flex-col gap-3 px-4 pt-5 pb-3">
        <Link to="/anits/dashboard" className="flex items-center gap-2.5">
          <Logo showName tone="mono" nameClassName="text-white font-extrabold text-base tracking-tight" />
        </Link>
        <div className="text-[10px] uppercase font-bold tracking-widest text-[#7C88A5] flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-blue-500" />
          ANITS ERP
        </div>

        {/* Search menu input matching EduSuite Pro */}
        <div className="relative mt-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#7C88A5]" />
          <Input
            value={menuQuery}
            onChange={(e) => setMenuQuery(e.target.value)}
            placeholder="Search menu..."
            className="h-8.5 w-full border border-[#172242] bg-[#121B3B] pl-9 text-xs text-white placeholder:text-[#7C88A5] rounded-md focus-visible:ring-1 focus-visible:ring-blue-500/50 transition-all"
          />
        </div>
      </div>

      {/* 2. Portal Navigation Section */}
      <div className="flex-1 overflow-y-auto px-3 py-2 no-scrollbar">
        <div className="text-[13px] font-medium text-[#7C88A5] px-3 mt-3 mb-2">
          {getPortalTitle()}
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = (() => {
              // 1. Exact match on fullPath (including query params, e.g. /anits/attendance?tab=history)
              if (fullPath === item.href) return true;

              // 2. If the nav item has query params (e.g. /anits/attendance?tab=history), require exact/prefix match on fullPath
              if (item.href.includes("?")) {
                return fullPath.startsWith(item.href);
              }

              // 3. If the current URL has search query params (e.g. ?tab=history), and another sibling nav item has a specific query matching fullPath,
              // then this base nav item (e.g. /anits/attendance) should NOT be active!
              if (searchStr && navItems.some((n) => n.href !== item.href && n.href.includes("?") && fullPath.startsWith(n.href))) {
                return false;
              }

              // 4. Default pathname matching
              if (item.href === "/anits/dashboard") {
                return pathname === "/anits/dashboard";
              }
              return pathname === item.href || pathname.startsWith(item.href + "/");
            })();

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                to={item.href as any}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-blue-600 text-white font-semibold shadow-xs"
                    : "text-[#94A3B8] hover:bg-[#162B63] hover:text-white"
                )}
              >
                <Icon className={cn("size-4 shrink-0", isActive ? "text-white" : "text-[#94A3B8]")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 3. Bottom User Profile Block matching Target UI */}
      <div className="border-t border-[#172242] bg-[#0A1128] p-3">
        <div className="flex items-center gap-3 px-1">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-700/80 text-xs font-bold text-white shadow-xs border border-white/10">
            {getInitials(displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">
              {displayName}
            </p>
            <p className="truncate text-[11px] text-[#7C88A5]">
              {displayRole}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" title="Online" />
          </div>
        </div>
      </div>
    </aside>
  );
}
