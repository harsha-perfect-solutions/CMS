import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  LogOut,
  User as UserIcon,
  Building,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import api from "@/lib/api";

export interface AnitsUserProfile {
  id?: string;
  name?: string;
  rollNumber?: string;
  email?: string;
  role?: string;
  anitsRole?: "ANITS_ADMIN" | "HOD" | "FACULTY" | "STUDENT";
  department?: string;
  semester?: number;
  section?: string;
}

export function AnitsHeader({ user }: { user: AnitsUserProfile | null }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Fetch notifications for attendance
    api
      .get("/api/notifications")
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setNotifications(res.data);
          setUnreadCount(res.data.filter((n: any) => !n.isRead).length);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("cms_token");
    localStorage.removeItem("cms_user");
    toast.success("Signed out of ANITS Attendance & Timetable portal.");
    navigate({ to: "/anits/login" as any });
  };

  const getRoleLabel = () => {
    if (user?.anitsRole === "ANITS_ADMIN") return "ANITS Administration";
    if (user?.anitsRole === "HOD") return `HOD — ${user?.department || "Dept"}`;
    if (user?.anitsRole === "FACULTY") return `Faculty — ${user?.department || "Dept"}`;
    if (user?.anitsRole === "STUDENT") return `Student — ${user?.rollNumber || ""}`;
    return "Authorized User";
  };

  const getInitials = (name?: string) => {
    if (!name) return "AN";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/40 bg-card/80 px-4 md:px-6 backdrop-blur-md">
      {/* LEFT: INSTITUTION TITLE & BRANDING */}
      <div className="flex items-center gap-3 min-w-0">
        <Link to="/anits/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-sm tracking-wider shadow-sm">
            ANITS
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm md:text-base font-bold text-foreground leading-tight">
              Anil Neerukonda Institute of Technology and Sciences
            </h1>
            <p className="truncate text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
              Attendance &amp; Timetable Management
            </p>
          </div>
        </Link>
      </div>

      {/* RIGHT: NOTIFICATIONS, PROFILE & LOGOUT */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Academic Year Badge */}
        <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-semibold py-0.5 px-2.5 bg-muted/40 border-border/60">
          AY 2026-27
        </Badge>

        {/* Notifications Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative size-9 rounded-lg border border-border/40 hover:bg-muted/60"
              aria-label="Open notifications"
            >
              <Bell className="size-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 shadow-lg border-border/60">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Attendance Notifications
              </h4>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-border/40">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No attendance notifications at this time.
                </div>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="p-3 text-xs hover:bg-muted/40 transition-colors">
                    <p className="font-semibold text-foreground">{n.title}</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5 line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-muted-foreground/70 mt-1 inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* User Profile & Logout Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2.5 h-10 px-2.5 rounded-xl border border-border/40 hover:bg-muted/60"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary text-xs font-extrabold">
                {getInitials(user?.name)}
              </div>
              <div className="hidden text-left md:block min-w-0 max-w-[140px]">
                <p className="truncate text-xs font-bold text-foreground leading-tight">
                  {user?.name || "ANITS User"}
                </p>
                <p className="truncate text-[10px] font-medium text-muted-foreground">
                  {getRoleLabel()}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl border-border/60">
            <DropdownMenuLabel className="font-normal px-2 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-bold text-foreground leading-none">{user?.name || "ANITS User"}</p>
                <p className="text-[11px] text-muted-foreground leading-none">{user?.email || ""}</p>
                <div className="pt-1.5 flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold">
                    {user?.anitsRole || "USER"}
                  </Badge>
                  {user?.department && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-semibold">
                      {user.department}
                    </Badge>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/anits/profile" className="flex items-center gap-2 cursor-pointer text-xs font-medium py-2">
                <UserIcon className="size-4 text-muted-foreground" />
                <span>My Profile &amp; Security</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/anits/dashboard" className="flex items-center gap-2 cursor-pointer text-xs font-medium py-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                <span>ANITS Portal Home</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 cursor-pointer text-xs font-medium py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="size-4" />
              <span>Log Out of ANITS</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
