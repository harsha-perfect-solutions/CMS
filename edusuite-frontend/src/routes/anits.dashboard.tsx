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
  Building2,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Megaphone,
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
  const [trendTimeframe, setTrendTimeframe] = useState<"7d" | "30d" | "month">("7d");

  const fetchDashboard = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      setError(null);

      // Determine authenticated user role from localStorage cache
      const cachedUserStr = typeof window !== "undefined" ? localStorage.getItem("cms_user") : null;
      let cachedUser: any = null;
      try {
        cachedUser = cachedUserStr ? JSON.parse(cachedUserStr) : null;
      } catch (_) {}

      const userRole = (cachedUser?.anitsRole || cachedUser?.role || "").toLowerCase();
      const isHodRole = userRole === "hod";
      const isAdminRole = [
        "anits_admin",
        "super_admin",
        "superadmin",
        "admin",
        "principal",
        "academic_dean",
      ].includes(userRole);

      let res: any;
      if (isHodRole) {
        res = await api.get("/api/anits/hod/dashboard");
      } else if (isAdminRole) {
        res = await api.get("/api/anits/super-admin/dashboard");
      } else {
        res = await api.get("/api/anits/dashboard");
      }

      if (res.status >= 400 || res.data?.error) {
        throw new Error(res.data?.error || `Server responded with status ${res.status}`);
      }

      if (res && res.data) {
        const resolvedRole = isHodRole ? "HOD" : (res.data.anitsRole || (isAdminRole ? "ANITS_ADMIN" : "STUDENT"));
        setData({ ...res.data, anitsRole: resolvedRole });
        if (showToast) toast.success("ANITS Dashboard refreshed with live PostgreSQL data.");
      }
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      const errMsg = err.response?.data?.error || err.message || "Failed to load dashboard metrics from PostgreSQL.";
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

  const displayDateStr = () => {
    if (data?.today?.day && data?.today?.date) {
      return `${data.today.day}, ${data.today.date}`;
    }
    if (data?.day && data?.date) {
      return `${data.day}, ${data.date}`;
    }
    return new Intl.DateTimeFormat("en-US", { weekday: "long", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  };

  // =========================================================================
  // RENDER: HOD DYNAMIC DASHBOARD (REQUIREMENT 5-15)
  // =========================================================================
  if (role === "HOD") {
    const hod = data?.hodIdentity || {};
    const deptCode = hod.departmentCode || "CSE";
    const deptName = hod.departmentName || "Department";
    const hodName = hod.name || "Head of Department";
    const todayClasses: any[] = Array.isArray(data?.todayClasses) ? data.todayClasses : [];
    const facultyAtt: any[] = Array.isArray(data?.facultyAttendanceToday) ? data.facultyAttendanceToday : [];
    const classWise: any[] = Array.isArray(data?.classWiseAttendance) ? data.classWiseAttendance : [];
    const alerts = data?.alerts || {};

    // Defensively handle attendanceTrend whether returned as an Array or as an Object { hasTrendData, trend }
    const trendRaw = data?.attendanceTrend;
    const trend: any[] = Array.isArray(trendRaw)
      ? trendRaw
      : Array.isArray(trendRaw?.trend)
      ? trendRaw.trend
      : [];
    const hasTrendData =
      trendRaw?.hasTrendData !== undefined && trendRaw?.hasTrendData !== null
        ? Boolean(trendRaw.hasTrendData && trend.length > 0)
        : trend.some((t: any) => (t.totalSessions || t.total || 0) > 0);

    return (
      <div className="space-y-6">
        {/* Breadcrumb Bar */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <span>Home</span>
          <ChevronRight className="size-3 text-muted-foreground/60" />
          <span>HOD Portal</span>
          <ChevronRight className="size-3 text-muted-foreground/60" />
          <span className="text-foreground font-bold">Dashboard</span>
        </div>

        {/* 1. HOD DEPARTMENT IDENTITY BANNER (Requirement 6) */}
        <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                HOD &middot; {deptCode}
              </Badge>
              <span className="text-xs text-muted-foreground">&middot;</span>
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                <Calendar className="size-3.5 text-blue-600" />
                {displayDateStr()}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Welcome, {hodName}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              {deptName} Department Overview &middot; Real-time ANITS PostgreSQL Synchronization
            </p>

            {/* Action Buttons Row (Requirement 6) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchDashboard(true)}
                disabled={isRefreshing}
                className="h-9 rounded-lg text-xs font-semibold gap-2 bg-card hover:bg-muted/50 border-border/70"
              >
                <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 rounded-lg text-xs font-semibold gap-2 bg-card hover:bg-muted/50 border-border/70"
              >
                <Link to={"/anits/timetable" as any}>
                  <Calendar className="size-3.5 text-primary" />
                  Department Timetable
                </Link>
              </Button>

              <Button
                asChild
                size="sm"
                className="h-9 rounded-lg text-xs font-semibold gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                <Link to={"/anits/attendance" as any}>
                  <ClipboardCheck className="size-3.5" />
                  Open Department Attendance
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Side: Department Details Card (Requirement 6) */}
          <div className="bg-muted/30 border border-border/60 rounded-xl p-4 min-w-[260px] shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Department
              </span>
              <Building2 className="size-4 text-blue-600" />
            </div>
            <p className="text-sm font-extrabold text-foreground leading-snug">
              {deptName}
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
              <span className="text-muted-foreground">Security Boundary</span>
              <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-600 bg-blue-50 dark:bg-blue-950/30">
                Scope: {deptCode}
              </Badge>
            </div>
          </div>
        </div>

        {/* 2. FOUR DEPARTMENT KPI CARDS (Requirement 7) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Department Students */}
          <Card className="rounded-xl border border-border/60 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">{deptCode} Students</span>
                <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                  <Users className="size-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-foreground mt-3">
                {m.departmentStudents ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active enrolled in {deptCode}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Department Faculty */}
          <Card className="rounded-xl border border-border/60 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">{deptCode} Faculty</span>
                <div className="size-8 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                  <GraduationCap className="size-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-foreground mt-3">
                {m.departmentFaculty ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Department teaching faculty
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Active Classes */}
          <Card className="rounded-xl border border-border/60 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">Active Classes</span>
                <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                  <BookOpen className="size-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-foreground mt-3">
                {m.activeClasses ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Distinct academic cohorts
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Department Attendance */}
          <Card className="rounded-xl border border-border/60 shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">Department Attendance</span>
                <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-foreground mt-3">
                {m.departmentAttendance ?? 0}%
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                Required threshold: 75%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 3. TWO-COLUMN: ATTENDANCE TREND & CLASS-WISE DISTRIBUTION (Requirement 12 & 13) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Department Attendance Trend (Requirement 12) */}
          <Card className="rounded-xl border border-border/60 shadow-xs bg-card">
            <CardHeader className="py-4 px-5 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  {deptCode} Attendance Trend
                </CardTitle>
                <CardDescription className="text-xs">
                  Daily aggregate attendance rates from PostgreSQL
                </CardDescription>
              </div>

              {/* Timeframe Toggle Buttons (Requirement 12) */}
              <div className="inline-flex p-0.5 rounded-lg bg-muted/60 border border-border/50 text-[11px]">
                <button
                  onClick={() => setTrendTimeframe("7d")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    trendTimeframe === "7d" ? "bg-card text-blue-600 shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setTrendTimeframe("30d")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    trendTimeframe === "30d" ? "bg-card text-blue-600 shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => setTrendTimeframe("month")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    trendTimeframe === "month" ? "bg-card text-blue-600 shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Current Month
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {!hasTrendData ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Insufficient historical attendance data.</p>
                  <p className="text-[11px]">No verified session records found for {deptCode} in the selected period.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trend.map((dayItem: any) => {
                    const rateVal = Number(dayItem.rate ?? dayItem.attendanceRate ?? 0);
                    return (
                      <div key={dayItem.date} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{dayItem.day} ({dayItem.date})</span>
                          <span className="font-bold text-blue-600">{rateVal}%</span>
                        </div>
                        <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, rateVal))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Class-wise Attendance Distribution (Requirement 13) */}
          <Card className="rounded-xl border border-border/60 shadow-xs bg-card">
            <CardHeader className="py-4 px-5 border-b border-border/40">
              <CardTitle className="text-base font-bold text-foreground">
                Class-wise Attendance Distribution ({deptCode})
              </CardTitle>
              <CardDescription className="text-xs">
                Section-level breakdown of present, absent, and late marks
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {classWise.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No class-wise attendance recorded for {deptCode} yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {classWise.map((cls: any) => (
                    <div key={cls.section} className="p-3.5 rounded-xl border border-border/50 bg-muted/15 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-bold text-xs bg-card border-border/80">
                          {cls.section}
                        </Badge>
                        <span className="text-xs font-black text-foreground">
                          {cls.rate}%
                        </span>
                      </div>

                      <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            cls.rate >= 75 ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, cls.rate))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium pt-0.5">
                        <span className="text-emerald-600">P: {cls.present}</span>
                        <span className="text-amber-600">L: {cls.late}</span>
                        <span className="text-rose-600">A: {cls.absent}</span>
                        <span>Total: {cls.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 4. TODAY'S DEPARTMENT CLASSES (Requirement 14) */}
        <Card className="rounded-xl border border-border/60 shadow-xs overflow-hidden bg-card">
          <CardHeader className="py-4 px-6 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Today's Classes ({deptCode})
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time schedule from ANITS MasterTimetable for {data?.today?.day || "today"}
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="outline" className="h-8.5 rounded-lg text-xs font-semibold gap-1.5">
              <Link to={"/anits/timetable" as any}>
                <Calendar className="size-3.5" /> Full Department Timetable
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {todayClasses.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No classes scheduled for {deptCode} today ({data?.today?.day}).
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {todayClasses.map((c: any) => {
                  const subjectCode = c.subjectCode || c.courseCode || "N/A";
                  const subjectName = c.subjectName || c.courseName || "Assigned Lecture";
                  const room = c.roomNo || c.room || "Room 101";
                  const isSubmitted = c.attendanceStatus === "Attendance Submitted" || c.attendanceStatus === "Submitted";
                  const isPending = c.attendanceStatus === "Attendance Pending" || c.attendanceStatus === "Pending";
                  const isOngoing = c.status === "Ongoing";

                  return (
                    <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/15 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-foreground">
                            {subjectCode} - {subjectName}
                          </span>
                          {c.isLab && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
                              Laboratory
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Period {c.periodNumber} ({c.time}) &middot; Sem {c.semester} ({c.section}) &middot; Room {room} &middot; <span className="font-semibold text-foreground">{c.facultyName}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-xs py-1 px-2.5 font-bold ${
                            isSubmitted
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : isPending
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : isOngoing
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                              : "bg-muted text-muted-foreground border-border/60"
                          }`}
                        >
                          {isSubmitted ? "Attendance Submitted" : isPending ? "Attendance Pending" : (c.attendanceStatus || "Pending")}
                        </Badge>
                        <Button asChild size="sm" variant="ghost" className="rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-700">
                          <Link to={"/anits/attendance" as any}>
                            Ledger &rarr;
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. TWO-COLUMN: FACULTY ATTENDANCE TODAY & DEPARTMENT ALERTS (Requirement 15 & 37) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Faculty Attendance Today (Requirement 15) */}
          <Card className="rounded-xl border border-border/60 shadow-xs bg-card">
            <CardHeader className="py-4 px-5 border-b border-border/40">
              <CardTitle className="text-base font-bold text-foreground">
                Faculty Attendance ({deptCode})
              </CardTitle>
              <CardDescription className="text-xs">
                Teaching staff scheduled for today's departmental periods
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {facultyAtt.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No faculty members scheduled for teaching periods today.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {facultyAtt.map((f: any) => {
                    const periodsCount = f.periodsToday ?? f.scheduledPeriods ?? 0;
                    const statusStr = f.status || (periodsCount === 0 ? "No Classes Today" : f.attendanceStatus === "All Submitted" ? "Present" : "Pending");
                    return (
                      <div key={f.facultyId} className="p-3.5 px-5 flex items-center justify-between gap-3 hover:bg-muted/10">
                        <div>
                          <p className="font-bold text-xs text-foreground">{f.facultyName}</p>
                          <p className="text-[11px] text-muted-foreground">{periodsCount} period(s) scheduled today</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            statusStr === "Present" || statusStr === "All Submitted"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : statusStr === "On Duty" || statusStr === "Partially Submitted"
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          }`}
                        >
                          {statusStr}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Department Governance Alerts & Quick Actions (Requirement 37) */}
          <Card className="rounded-xl border border-border/60 shadow-xs bg-card">
            <CardHeader className="py-4 px-5 border-b border-border/40">
              <CardTitle className="text-base font-bold text-foreground">
                Department Alerts &amp; Quick Actions
              </CardTitle>
              <CardDescription className="text-xs">
                Operational compliance items requiring HOD review
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2.5">
                {/* Shortage Alert */}
                <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 flex items-start gap-3">
                  <AlertTriangle className="size-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs flex-1">
                    <p className="font-bold text-rose-900 dark:text-rose-200">
                      Attendance Shortage Notice
                    </p>
                    <p className="text-rose-700 dark:text-rose-300 mt-0.5">
                      {alerts.shortageStudentsCount ?? alerts.studentsBelowThreshold ?? 0} students in {deptCode} currently fall below the required 75% ANITS cutoff.
                    </p>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="text-xs text-rose-700 hover:text-rose-800 font-bold shrink-0">
                    <Link to="/anits/attendance" search={{ tab: "student" } as any}>
                      Review
                    </Link>
                  </Button>
                </div>

                {/* Pending Conduction Alert */}
                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 flex items-start gap-3">
                  <Clock className="size-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs flex-1">
                    <p className="font-bold text-amber-900 dark:text-amber-200">
                      Pending Attendance Rosters
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                      {alerts.pendingAttendanceClassesCount ?? alerts.pendingAttendanceSessions ?? alerts.pendingSessionsCount ?? 0} teaching slots today awaiting faculty attendance submission.
                    </p>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="text-xs text-amber-700 hover:text-amber-800 font-bold shrink-0">
                    <Link to="/anits/attendance" search={{ tab: "faculty" } as any}>
                      Audit
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Action Links */}
              <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm" className="h-9 rounded-lg text-xs font-semibold gap-1.5 justify-start">
                  <Link to="/anits/attendance" search={{ tab: "faculty" } as any}>
                    <GraduationCap className="size-3.5 text-purple-600" />
                    Faculty Conduction
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-9 rounded-lg text-xs font-semibold gap-1.5 justify-start">
                  <Link to="/anits/reports">
                    <TrendingUp className="size-3.5 text-blue-600" />
                    Department Reports
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: OTHER ROLES (STUDENT, FACULTY, ADMIN) PRESERVED INTACT
  // =========================================================================
  const getRoleDisplayName = () => {
    if (role === "ANITS_ADMIN") return data?.identity?.name || "Administrator";
    if (role === "FACULTY") return data?.faculty?.name || "Faculty";
    const rawName = data?.student?.name || "K. Sai Teja";
    return rawName.replace(/\s*\(Student\)$/i, "").trim();
  };

  const displayRoleBadge = () => {
    if (role === "ANITS_ADMIN") {
      const rawRole = data?.identity?.role || "SUPER_ADMIN";
      return rawRole.replace(/_/g, " ").toUpperCase();
    }
    return role.replace(/_/g, " ");
  };

  return (
    <div className="space-y-6">
      {/* 1. Welcome Banner */}
      <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-xs space-y-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
              {displayRoleBadge()}
            </span>
            {role === "STUDENT" && data?.student && (
              <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-md">
                Roll: {data.student.rollNumber} &middot; {data.student.department} Sem {data.student.semester} ({data.student.section})
              </span>
            )}
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

        {/* Action Buttons Row */}
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
            <Link to={"/anits/timetable" as any}>
              <Calendar className="size-3.5" />
              {role === "ANITS_ADMIN" ? "Master Timetable" : "My Timetable"}
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="h-9 rounded-lg text-xs font-semibold gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Link to={"/anits/attendance" as any}>
              <ClipboardCheck className="size-3.5" />
              Open Full Attendance Ledger
            </Link>
          </Button>

          {(role === "ANITS_ADMIN" || role === "HOD") && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 rounded-lg text-xs font-semibold gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30 shadow-xs"
            >
              <Link to={"/anits/exam-notifications" as any}>
                <Megaphone className="size-3.5 text-purple-600 dark:text-purple-400" />
                Exam Notifications
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* STUDENT DASHBOARD METRIC CARDS */}
      {role === "STUDENT" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
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

          {/* TODAY'S CLASSES FOR STUDENT */}
          <Card className="rounded-xl border border-border/60 shadow-xs bg-card">
            <CardHeader className="p-5 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="size-4 text-blue-600" /> Today's Classes
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Scheduled classes for {data?.day || "Today"} ({data?.date}) &middot; Section {data?.student?.section || "A"}
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="ghost" className="text-xs font-semibold gap-1 text-primary">
                <Link to="/anits/timetable">View Full Timetable &rarr;</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {!data?.todaySchedule || data.todaySchedule.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No classes scheduled for your section today ({data?.day}).
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {data.todaySchedule.map((c: any) => (
                    <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-foreground">{c.subject}</span>
                          {c.isLab && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">Lab</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Period {c.periodNumber} &middot; {c.time} &middot; Faculty: <span className="font-medium text-foreground">{c.faculty}</span> &middot; Room: <span className="font-medium text-foreground">{c.roomNo}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            c.status === "Completed"
                              ? "bg-slate-500/10 text-slate-600 border-slate-500/20 text-xs py-0.5"
                              : c.status === "Ongoing"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs py-0.5 font-bold animate-pulse"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs py-0.5"
                          }
                        >
                          {c.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* FACULTY DASHBOARD METRICS */}
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

          <Card className="rounded-xl border border-border/60 shadow-xs overflow-hidden bg-card">
            <CardHeader className="bg-muted/15 border-b border-border/40 py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Today's Teaching Schedule &amp; Attendance</CardTitle>
                <CardDescription className="text-xs">Directly linked to ANITS MasterTimetable</CardDescription>
              </div>
              <Button asChild size="sm" className="rounded-lg text-xs font-bold gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                <Link to={"/anits/attendance" as any}>
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

      {/* ANITS ADMIN DASHBOARD METRICS */}
      {role === "ANITS_ADMIN" && (() => {
        const todaysClasses = data?.timetable?.todaysClasses ?? m.todayClassesTotal ?? 0;
        const submittedCount = data?.attendance?.submitted ?? m.attendanceSubmittedCount ?? 0;
        const pendingCount = data?.attendance?.pending ?? m.attendancePendingCount ?? 0;
        const activeFaculty = data?.members?.activeFaculty ?? m.totalFaculty ?? 0;
        const activeStudents = data?.members?.activeStudents ?? m.totalStudents ?? 0;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
