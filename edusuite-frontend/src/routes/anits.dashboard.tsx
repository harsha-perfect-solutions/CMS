import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Calendar,
  ClipboardCheck,
  Users,
  GraduationCap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import api from "@/lib/api";

export const Route = createFileRoute("/anits/dashboard")({
  head: () => ({
    meta: [{ title: "ANITS Dashboard — Attendance & Timetable Management" }],
  }),
  component: AnitsDashboardPage,
});

function AnitsDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboard = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      setError(null);
      
      // Attempt dedicated Super Admin dashboard endpoint first, fallback to standard role endpoint
      let res;
      try {
        res = await api.get("/api/anits/super-admin/dashboard");
      } catch (err: any) {
        if (err.response?.status === 403) {
          // If not super admin, call role-based dashboard endpoint
          res = await api.get("/api/anits/dashboard");
        } else {
          throw err;
        }
      }

      if (res && res.data) {
        setData(res.data);
        if (showToast) toast.success("ANITS Dashboard refreshed with live PostgreSQL data.");
      }
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      const errMsg = err.response?.data?.error || "Failed to load dashboard metrics from PostgreSQL.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-24 bg-muted/60 rounded-full animate-pulse" />
            <div className="h-5 w-32 bg-muted/60 rounded-full animate-pulse" />
          </div>
          <div className="h-8 w-64 bg-muted/60 rounded-xl animate-pulse" />
          <div className="h-4 w-96 bg-muted/50 rounded-lg animate-pulse" />
          <div className="flex gap-2 pt-2">
            <div className="h-9 w-24 bg-muted/60 rounded-lg animate-pulse" />
            <div className="h-9 w-32 bg-muted/60 rounded-lg animate-pulse" />
            <div className="h-9 w-48 bg-muted/60 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-card border border-border/60 rounded-xl p-5 space-y-3 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-4 w-28 bg-muted/60 rounded" />
                <div className="size-8 rounded-full bg-muted/60" />
              </div>
              <div className="h-8 w-20 bg-muted/70 rounded" />
              <div className="h-3 w-36 bg-muted/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center bg-card rounded-2xl border border-destructive/30 space-y-4 max-w-lg mx-auto mt-12 shadow-sm">
        <AlertTriangle className="size-10 text-destructive mx-auto" />
        <h3 className="font-extrabold text-lg text-foreground">Unable to load ANITS dashboard data</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {error}
        </p>
        <div className="pt-2">
          <Button onClick={() => { setLoading(true); fetchDashboard(); }} className="rounded-xl text-xs font-semibold gap-2">
            <RefreshCw className="size-3.5" /> Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  const role = data?.anitsRole || "STUDENT";
  const m = data?.metrics || {};

  const getRoleDisplayName = () => {
    if (role === "ANITS_ADMIN") return data?.identity?.name || "Administrator";
    if (role === "HOD") return `${data?.department || "Dept"} HOD`;
    if (role === "FACULTY") return data?.faculty?.name || "Faculty";
    return `${data?.student?.name || "K. Sai Teja"} (Student)`;
  };

  const displayRoleBadge = () => {
    if (role === "ANITS_ADMIN") {
      const rawRole = data?.identity?.role || "SUPER_ADMIN";
      return rawRole.replace(/_/g, " ").toUpperCase();
    }
    return role.replace(/_/g, " ");
  };

  const displayDateStr = () => {
    if (data?.today?.day && data?.today?.date) {
      return `${data.today.day}, ${data.today.date}`;
    }
    if (data?.day && data?.date) {
      return `${data.day}, ${data.date}`;
    }
    return new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "2-digit", day: "2-digit" });
  };

  return (
    <div className="space-y-6">
      {/* 1. Welcome Banner matching Target UI (EduSuite Pro Style) */}
      <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-xs space-y-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
              {displayRoleBadge()}
            </span>
            {data?.identity?.adminId && (
              <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                ID: {data.identity.adminId}
              </span>
            )}
            <span className="text-xs text-muted-foreground">&middot;</span>
            <span className="text-xs text-muted-foreground font-medium">
              {displayDateStr()}
            </span>
          </div>

          <h2 className="text-2xl font-black text-foreground tracking-tight mt-2">
            Welcome, {getRoleDisplayName()}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time synchronization with ANITS MasterTimetable and PostgreSQL AttendanceRecord ledger.
          </p>
        </div>

        {/* Action Buttons Row matching Target UI */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboard(true)}
            disabled={isRefreshing}
            className="h-9 rounded-lg text-xs font-medium gap-2 bg-card hover:bg-muted/50 border-border/70"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 rounded-lg text-xs font-medium gap-2 bg-card hover:bg-muted/50 border-border/70"
          >
            <Link to="/anits/timetable">
              <Calendar className="size-3.5" />
              {role === "ANITS_ADMIN" ? "Master Timetable" : "My Timetable"}
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="h-9 rounded-lg text-xs font-semibold gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Link to="/anits/attendance">
              <ClipboardCheck className="size-3.5" />
              Open Full Attendance Ledger
            </Link>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STUDENT DASHBOARD METRIC CARDS (2x2 Grid matching Target UI) */}
      {/* ========================================================================= */}
      {role === "STUDENT" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {/* Card 1: Overall Attendance */}
          <Card className="rounded-xl border border-border/60 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Overall Attendance</span>
                <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-foreground mt-3">
                {m.overallPercentage ?? 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Required ANITS threshold: <span className="font-semibold text-foreground">75%</span>
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Total Classes Conducted */}
          <Card className="rounded-xl border border-border/60 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Total Classes Conducted</span>
                <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                  <BookOpen className="size-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-foreground mt-3">
                {m.totalConducted ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                PostgreSQL AttendanceRecord ledger
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Present / Late / Absent */}
          <Card className="rounded-xl border border-border/60 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Present / Late / Absent</span>
                <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                  <ClipboardCheck className="size-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-foreground mt-3">
                {m.presentCount ?? 0} <span className="text-xl font-normal text-muted-foreground/60">/</span> {m.lateCount ?? 0} <span className="text-xl font-normal text-muted-foreground/60">/</span> {m.absentCount ?? 0}
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5">
                Attended: {(m.presentCount ?? 0) + (m.lateCount ?? 0)} sessions
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Shortage Alerts */}
          <Card className="rounded-xl border border-border/60 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Shortage Alerts</span>
                <div className={`size-8 rounded-full flex items-center justify-center ${
                  (m.lowAttendanceCount ?? 0) > 0
                    ? "bg-rose-100 dark:bg-rose-950/50 text-rose-600"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}>
                  <AlertTriangle className="size-4" />
                </div>
              </div>
              <div className={`text-3xl font-black mt-3 ${
                (m.lowAttendanceCount ?? 0) > 0 ? "text-rose-600" : "text-foreground"
              }`}>
                {m.lowAttendanceCount ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {(m.lowAttendanceCount ?? 0) > 0 ? "Subjects below 75% threshold" : "All subjects eligible"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FACULTY DASHBOARD METRICS */}
      {/* ========================================================================= */}
      {role === "FACULTY" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-xl border border-border/60 shadow-xs bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Today's Assigned Classes</span>
                  <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                    <Calendar className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.todayClassesCount ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Assigned on {data?.day}</p>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border/60 shadow-xs bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Attendance Pending</span>
                  <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                    <Clock className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.attendancePendingCount ?? 0}</div>
                <p className="text-xs text-amber-600 font-semibold mt-1">Requires roster submission</p>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border/60 shadow-xs bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Classes Completed</span>
                  <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.classesCompletedToday ?? 0}</div>
                <p className="text-xs text-emerald-600 font-semibold mt-1">Marked in PostgreSQL</p>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border/60 shadow-xs bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Weekly Teaching Load</span>
                  <div className="size-8 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                    <BookOpen className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.totalAssignedWeekly ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Total periods per week</p>
              </CardContent>
            </Card>
          </div>

          {/* Today Classes Action Schedule */}
          <Card className="rounded-xl border border-border/60 shadow-xs overflow-hidden bg-card">
            <CardHeader className="bg-muted/15 border-b border-border/40 py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Today's Teaching Schedule &amp; Attendance</CardTitle>
                <CardDescription className="text-xs">Directly linked to ANITS MasterTimetable</CardDescription>
              </div>
              <Button asChild size="sm" className="rounded-lg text-xs font-bold gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                <Link to="/anits/attendance">
                  <ClipboardCheck className="size-4" /> Take Attendance
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data?.todayClasses?.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No classes scheduled for you today ({data?.day}).
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {data?.todayClasses?.map((c: any) => (
                    <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-foreground">{c.subjectCode} - {c.subjectName}</span>
                          {c.isLab && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">Lab</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Period {c.periodNumber} &middot; {c.time} &middot; {c.branch} Sem {c.semester} ({c.section}) &middot; Room {c.roomNo}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={
                            c.attendanceStatus === "Attendance Submitted"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs py-1"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs py-1"
                          }
                        >
                          {c.attendanceStatus}
                        </Badge>
                        <Button asChild size="sm" variant="outline" className="rounded-lg text-xs font-semibold">
                          <Link to="/anits/attendance" search={{ timetableId: c.id } as any}>
                            Mark Attendance &rarr;
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. HOD DASHBOARD METRICS */}
      {/* ========================================================================= */}
      {role === "HOD" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-xl border border-border/60 shadow-xs bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Department Classes Today</span>
                <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                  <Calendar className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground mt-2">{m.todayClassesCount ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{data?.department} slots scheduled</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border/60 shadow-xs bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Department Attendance</span>
                <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground mt-2">{m.departmentAttendancePercentage ?? 0}%</div>
              <p className="text-xs text-emerald-600 font-semibold mt-1">Average semester rate</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border/60 shadow-xs bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Attendance Pending</span>
                <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                  <Clock className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground mt-2">{m.attendancePendingCount ?? 0}</div>
              <p className="text-xs text-amber-600 font-semibold mt-1">Today's unsubmitted slots</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border/60 shadow-xs bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Shortage Students (&lt;75%)</span>
                <div className="size-8 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 mt-2">{m.studentsBelow75Percent ?? 0}</div>
              <p className="text-xs text-rose-600 font-semibold mt-1">Require condonation review</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ANITS ADMIN DASHBOARD METRICS */}
      {/* ========================================================================= */}
      {role === "ANITS_ADMIN" && (() => {
        const todaysClasses = data?.timetable?.todaysClasses ?? m.todayClassesTotal ?? 0;
        const submittedCount = data?.attendance?.submitted ?? m.attendanceSubmittedCount ?? 0;
        const pendingCount = data?.attendance?.pending ?? m.attendancePendingCount ?? 0;
        const activeFaculty = data?.members?.activeFaculty ?? m.totalFaculty ?? 0;
        const activeStudents = data?.members?.activeStudents ?? m.totalStudents ?? 0;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Today's Classes */}
            <Card className="rounded-xl border border-border/60 shadow-xs bg-card hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Today's Classes</span>
                  <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                    <Calendar className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{todaysClasses}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {todaysClasses > 0 ? "Scheduled across all departments" : "No classes scheduled today"}
                </p>
              </CardContent>
            </Card>

            {/* 2. Attendance Submitted */}
            <Card className="rounded-xl border border-border/60 shadow-xs bg-card hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Attendance Submitted</span>
                  <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{submittedCount}</div>
                <p className="text-xs text-emerald-600 font-semibold mt-1">Submitted in PostgreSQL</p>
              </CardContent>
            </Card>

            {/* 3. Attendance Pending */}
            <Card className="rounded-xl border border-border/60 shadow-xs bg-card hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Attendance Pending</span>
                  <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                    <Clock className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{pendingCount}</div>
                <p className="text-xs text-amber-600 font-semibold mt-1">Awaiting faculty marking</p>
              </CardContent>
            </Card>

            {/* 4. Active Members */}
            <Card className="rounded-xl border border-border/60 shadow-xs bg-card hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Active Members</span>
                  <div className="size-8 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                    <Users className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">
                  {activeFaculty} / {activeStudents}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Faculty / Students registered</p>
              </CardContent>
            </Card>
          </div>
        );
      })()}
    </div>
  );
}
