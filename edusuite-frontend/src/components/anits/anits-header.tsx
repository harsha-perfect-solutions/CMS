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

  // 2. Fetch live notifications
  useEffect(() => {
    api
      .get("/api/notifications")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
        setNotifications(list);
        setUnreadCount(list.filter((n: any) => !n.isRead).length);
      })
      .catch(() => {});
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
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Failed to mark all as read.");
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
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative size-8.5 rounded-lg hover:bg-muted/60"
              aria-label="View notifications"
            >
              <Bell className="size-4.5 text-slate-700 dark:text-slate-200" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 sm:w-96 p-0 rounded-2xl shadow-xl border-border/60">
            <div className="flex items-center justify-between p-4 border-b border-border/40 bg-muted/20">
              <div>
                <h4 className="font-bold text-sm text-foreground">Notifications</h4>
                <p className="text-xs text-muted-foreground">
                  {unreadCount} unread alert{unreadCount !== 1 ? "s" : ""}
                </p>
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-semibold text-primary h-7 px-2"
                >
                  Mark all read
                </Button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border/30">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No notifications found.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 text-xs transition-colors hover:bg-muted/30 flex items-start justify-between gap-3 ${
                      !n.isRead ? "bg-primary/5 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground text-xs">{n.title}</span>
                        {!n.isRead && (
                          <span className="size-1.5 rounded-full bg-primary inline-block shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 pt-0.5">
                        <Clock className="size-3" />
                        <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {!n.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        className="size-7 rounded-lg text-primary hover:bg-primary/10 shrink-0"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))
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
