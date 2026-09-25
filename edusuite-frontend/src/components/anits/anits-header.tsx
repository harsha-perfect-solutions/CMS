import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  LogOut,
  User as UserIcon,
  Search,
  ChevronDown,
  CheckCircle2,
  Clock,
  Menu,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Ticket,
  Award,
  MapPin,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

export function AnitsHeader({
  user,
  onToggleSidebar,
}: {
  user: AnitsUserProfile | null;
  onToggleSidebar?: () => void;
}) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const [notifsError, setNotifsError] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState("2026-27");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    students: any[];
    faculty: any[];
    departments: any[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // 1. Fetch live academic year from PostgreSQL
  useEffect(() => {
    api
      .get("/api/anits/academic-year")
      .then((res) => {
        if (res.data?.academicYear) {
          setAcademicYear(res.data.academicYear);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Fetch live real-time notifications with focus & periodic polling
  const fetchNotifications = async (quiet = false) => {
    try {
      if (!quiet) setIsLoadingNotifs(true);
      setNotifsError(null);
      const res = await api.get("/api/notifications");
      const list = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
      const unread = typeof res.data?.unreadCount === "number" ? res.data.unreadCount : list.filter((n: any) => !n.isRead).length;
      setNotifications(list);
      setUnreadCount(unread);
    } catch (err: any) {
      console.error("Live notifications fetch error:", err);
      setNotifsError("Unable to load notifications.");
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Re-fetch on page/window focus and custom refresh events
    const handleFocus = () => fetchNotifications(true);
    const handleCustomRefresh = () => fetchNotifications(true);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("exam-notification-refresh", handleCustomRefresh);

    // Periodic refresh every 30 seconds (safe interval without excessive DB hammering)
    const interval = setInterval(() => fetchNotifications(true), 30000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("exam-notification-refresh", handleCustomRefresh);
      clearInterval(interval);
    };
  }, []);

  // 3. Debounced global search for Super Admin & HOD
  useEffect(() => {
    if (user?.anitsRole === "STUDENT") {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const searchEndpoint = user?.anitsRole === "HOD"
          ? "/api/anits/hod/search"
          : "/api/anits/super-admin/search";
        const res = await api.get(searchEndpoint, {
          params: { q },
        });
        setSearchResults(res.data);
        setSearchOpen(true);
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.anitsRole]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new Event("exam-notification-refresh"));
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      window.dispatchEvent(new Event("exam-notification-refresh"));
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Failed to mark all as read.");
    }
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return "Recent";
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return "Yesterday";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getNotificationStyle = (type?: string, title: string = "") => {
    const t = (type || "").toUpperCase();
    if (t.includes("SHORTAGE") || t.includes("ALERT") || title.includes("Attendance")) {
      return {
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/20",
        dot: "bg-amber-500",
        icon: AlertTriangle,
      };
    }
    if (t.includes("CANCEL")) {
      return {
        color: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-500/10 border-rose-500/20",
        dot: "bg-rose-500",
        icon: AlertCircle,
      };
    }
    if (t.includes("RESCHED")) {
      return {
        color: "text-yellow-600 dark:text-yellow-400",
        bg: "bg-yellow-500/10 border-yellow-500/20",
        dot: "bg-yellow-500",
        icon: Calendar,
      };
    }
    if (t.includes("HALL_TICKET") || t.includes("TICKET")) {
      return {
        color: "text-indigo-600 dark:text-indigo-400",
        bg: "bg-indigo-500/10 border-indigo-500/20",
        dot: "bg-indigo-500",
        icon: Ticket,
      };
    }
    if (t.includes("RESULTS") || (t.includes("ELIGIB") && !title.includes("Notice"))) {
      return {
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        dot: "bg-emerald-500",
        icon: Award,
      };
    }
    if (t.includes("VENUE")) {
      return {
        color: "text-violet-600 dark:text-violet-400",
        bg: "bg-violet-500/10 border-violet-500/20",
        dot: "bg-violet-500",
        icon: MapPin,
      };
    }
    return {
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
      dot: "bg-blue-600",
      icon: Bell,
    };
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.isRead) {
      await handleMarkAsRead(n.id);
    }
    setNotifOpen(false);
    if (n.link) {
      navigate({ to: n.link as any });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("cms_token");
    localStorage.removeItem("cms_user");
    toast.success("Signed out of ANITS Attendance & Timetable portal.");
    navigate({ to: "/anits/login" as any });
  };

  const rawDisplayName = user?.name || (user?.anitsRole === "STUDENT" ? "K. Sai Teja" : "Administrator");
  const displayName = rawDisplayName.replace(/\s*\(Student\)$/i, "").trim();
  const roleLabel =
    user?.anitsRole === "STUDENT"
      ? "STUDENT"
      : user?.anitsRole === "FACULTY"
      ? "FACULTY"
      : user?.anitsRole === "HOD"
      ? `HOD · ${user?.department || "CSE"}`
      : "ADMIN";

  const getInitials = (name?: string) => {
    if (!name) return "SA";
    const parts = name.replace(/[()]/g, "").trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const totalResultsCount =
    (searchResults?.students?.length || 0) +
    (searchResults?.faculty?.length || 0) +
    (searchResults?.departments?.length || 0);

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-border/60 bg-card/95 px-4 md:px-6 backdrop-blur-md">
      {/* LEFT: TOGGLE + SEARCH INPUT (MATCHING TARGET UI) */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="size-8.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground shrink-0"
          title="Toggle Navigation"
        >
          <Menu className="size-4.5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>

        {/* Global Search Input with Real Database Results Dropdown (Admin & HOD only) */}
        {user?.anitsRole !== "STUDENT" && (
          <div className="relative hidden sm:block min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setSearchOpen(true);
              }}
              placeholder="Search students, staff, departments..."
              className="h-8.5 w-52 md:w-72 lg:w-84 pl-8.5 pr-3 text-xs bg-muted/30 border-border/60 rounded-md focus-visible:ring-1 focus-visible:ring-blue-500/40"
            />

            {/* Live Search Results Popover/Dropdown */}
            {searchOpen && searchQuery.trim().length >= 2 && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setSearchOpen(false)}
                />
                <div className="absolute left-0 top-10 z-50 w-80 md:w-96 rounded-xl border border-border/60 bg-popover shadow-xl overflow-hidden divide-y divide-border/40 text-xs">
                  <div className="p-2.5 bg-muted/30 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      ANITS Database Search
                    </span>
                    {isSearching && (
                      <span className="text-[10px] text-primary font-medium animate-pulse">
                        Searching...
                      </span>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto p-1.5 space-y-2">
                    {totalResultsCount === 0 && !isSearching && (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No matching records found for "{searchQuery}".
                      </div>
                    )}

                    {/* Departments */}
                    {searchResults?.departments && searchResults.departments.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                          Departments
                        </div>
                        {searchResults.departments.map((d) => (
                          <div
                            key={d.id}
                            onClick={() => {
                              setSearchOpen(false);
                              navigate({ to: "/anits/timetable" as any });
                            }}
                            className="px-2.5 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <p className="font-bold text-foreground text-xs">{d.name}</p>
                              <p className="text-[10px] text-muted-foreground">Code: {d.code} &middot; HOD: {d.hodName || "Assigned"}</p>
                            </div>
                            <Badge variant="outline" className="text-[9px]">Dept</Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Faculty */}
                    {searchResults?.faculty && searchResults.faculty.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                          Faculty &amp; Staff
                        </div>
                        {searchResults.faculty.map((f) => (
                          <div
                            key={f.id}
                            onClick={() => {
                              setSearchOpen(false);
                              if (user?.anitsRole === "HOD") {
                                navigate({ to: "/anits/attendance" as any, search: { tab: "faculty" } as any });
                              } else {
                                navigate({ to: "/anits/faculty" as any, search: { search: f.rollNumber } as any });
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <p className="font-bold text-foreground text-xs">{f.name}</p>
                              <p className="text-[10px] text-muted-foreground">{f.rollNumber} &middot; {f.department || "General"}</p>
                            </div>
                            <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-600">Faculty</Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Students */}
                    {searchResults?.students && searchResults.students.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                          Students
                        </div>
                        {searchResults.students.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSearchOpen(false);
                              if (user?.anitsRole === "HOD") {
                                navigate({ to: "/anits/attendance" as any, search: { tab: "student" } as any });
                              } else {
                                navigate({ to: "/anits/students" as any, search: { search: s.rollNumber } as any });
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <p className="font-bold text-foreground text-xs">{s.name}</p>
                              <p className="text-[10px] text-muted-foreground">{s.rollNumber} &middot; {s.department} Sem {s.semester || 1} ({s.section || "A"})</p>
                            </div>
                            <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600">Student</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: ACADEMIC YEAR, NOTIFICATION BELL, USER CHIP */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
        {/* Dynamic Academic Year Badge from PostgreSQL */}
        <Badge
          variant="outline"
          className="text-[11px] font-semibold py-1 px-2.5 bg-muted/40 border-border/60 text-foreground"
        >
          AY {academicYear}
        </Badge>

        {/* Notifications Popover */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative size-8.5 rounded-lg hover:bg-muted/60"
              aria-label="View notifications"
            >
              <Bell className="size-4.5 text-slate-700 dark:text-slate-200" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid min-w-4 h-4 px-1 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs animate-pulse">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 sm:w-96 p-0 rounded-2xl shadow-xl border-border/60">
            <div className="flex items-center justify-between p-4 border-b border-border/40 bg-muted/20">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-foreground">Notifications</h4>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs font-semibold text-primary hover:text-primary/80 h-7 px-2"
                  >
                    Mark all read
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-border/30">
              {isLoadingNotifs && notifications.length === 0 ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="size-8 rounded-full bg-muted shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-full" />
                        <div className="h-2.5 bg-muted rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifsError ? (
                <div className="p-8 text-center space-y-2">
                  <AlertCircle className="size-8 text-amber-500 mx-auto" />
                  <p className="text-xs text-muted-foreground font-medium">{notifsError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNotifications(false)}
                    className="h-7 text-xs gap-1.5"
                  >
                    <RotateCw className="size-3" /> Retry
                  </Button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <Bell className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                  No new notifications.
                </div>
              ) : (
                notifications.map((n) => {
                  const style = getNotificationStyle(n.type, n.title);
                  const IconComp = style.icon;
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3.5 text-xs transition-colors hover:bg-muted/40 flex items-start gap-3 cursor-pointer group ${
                        !n.isRead ? "bg-primary/[0.04]" : "text-muted-foreground opacity-80 hover:opacity-100"
                      }`}
                    >
                      <div
                        className={`size-8 rounded-xl flex items-center justify-center shrink-0 border ${style.bg} ${style.color}`}
                      >
                        <IconComp className="size-4" />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className={`font-semibold truncate text-xs ${!n.isRead ? "text-foreground font-bold" : "text-foreground/80"}`}>
                            {n.title}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {n.priority === "High" && (
                              <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                High
                              </span>
                            )}
                            {!n.isRead && (
                              <span className="size-2 rounded-full bg-blue-600 shrink-0 shadow-xs" title="Unread" />
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 pt-0.5 flex-wrap">
                          <Clock className="size-3" />
                          <span>{formatRelativeTime(n.createdAt)}</span>
                          {n.senderName && <span>&middot; {n.senderName}</span>}
                          {n.courseCode && <span className="font-semibold text-primary">[{n.courseCode}]</span>}
                          {n.link && (
                            <span className="text-primary font-medium group-hover:underline ml-auto">
                              View details →
                            </span>
                          )}
                        </div>
                      </div>
                      {!n.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          className="size-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Mark as read"
                        >
                          <CheckCircle2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* User Avatar & Dropdown matching Target UI */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-full hover:bg-muted/50 transition-colors"
            >
              <div className="size-7.5 rounded-full bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                {getInitials(displayName)}
              </div>
              <div className="hidden md:flex flex-col text-left leading-none">
                <span className="text-xs font-semibold text-foreground truncate max-w-36">
                  {displayName}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                  {roleLabel}
                </span>
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/60">
            <DropdownMenuLabel>
              <p className="font-bold text-xs text-foreground truncate">{displayName}</p>
              <p className="text-[11px] text-muted-foreground font-medium truncate">{user?.email || "user@anits.edu.in"}</p>
              <div className="mt-1">
                <Badge variant="secondary" className="text-[10px] font-semibold uppercase">
                  {roleLabel}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/anits/profile" className="flex items-center gap-2 text-xs cursor-pointer">
                <UserIcon className="size-3.5" />
                <span>My Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/anits/dashboard" className="flex items-center gap-2 text-xs cursor-pointer">
                <ShieldCheck className="size-3.5" />
                <span>Portal Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
