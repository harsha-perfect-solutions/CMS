import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useRole } from "@/context/role-context";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  CalendarCheck,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Download,
  AlertTriangle,
  History,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Faculty Attendance Components
import { AttendanceHeader } from "@/components/dashboard/attendance/attendance-header";
import { StatisticsCards } from "@/components/dashboard/attendance/statistics-cards";
import { TodayClasses, type TodayClassItem } from "@/components/dashboard/attendance/today-classes";
import { AttendanceForm, type AttendanceStudentItem } from "@/components/dashboard/attendance/attendance-form";
import { AttendanceRegister } from "@/components/dashboard/attendance/attendance-register";
import { AttendanceHistory } from "@/components/dashboard/attendance/attendance-history";
import { AttendanceAnalytics } from "@/components/dashboard/attendance/attendance-analytics";

// Student Attendance Components
import { AttendanceSummary } from "@/components/student-attendance/attendance-summary";
import { SubjectAttendance } from "@/components/student-attendance/subject-attendance";
import { AttendanceHistory as StudentAttendanceHistory } from "@/components/student-attendance/attendance-history";
import { AttendanceDrawer } from "@/components/student-attendance/attendance-drawer";
import type {
  StudentAttendanceProfile,
  SubjectAttendanceItem,
  AttendanceHistoryRecord,
} from "@/components/student-attendance/types";

export const Route = createFileRoute("/anits/attendance")({
  head: () => ({
    meta: [{ title: "Attendance Management — ANITS" }],
  }),
  validateSearch: (search: Record<string, unknown>) => {
    return {
      timetableId: (search.timetableId as string) || undefined,
      tab: (search.tab as string) || undefined,
    };
  },
  component: AnitsAttendancePage,
});

function AnitsAttendancePage() {
  const searchParams = Route.useSearch();
  const { role, department } = useRole();

  const normRole = (role || "").toLowerCase();
  const isFaculty = normRole === "faculty" || normRole === "staff";
  const isStudent = normRole === "student";
  const isHod = normRole === "hod";
  const isAdmin = ["super_admin", "superadmin", "admin", "principal", "academic_dean"].includes(normRole);

  // =========================================================================
  // FACULTY STATE & LOGIC
  // =========================================================================
  const [facultyClasses, setFacultyClasses] = useState<TodayClassItem[]>([]);
  const [facultyStats, setFacultyStats] = useState({
    conducted: 0,
    pending: 0,
    presentToday: 0,
    absentToday: 0,
    average: 0,
    leavesPending: 0,
  });
  const [activeTab, setActiveTab] = useState(searchParams.tab || (searchParams.timetableId ? "mark" : "today"));
  const [activeFormSlot, setActiveFormSlot] = useState<TodayClassItem | null>(null);
  const [rosterStudents, setRosterStudents] = useState<AttendanceStudentItem[]>([]);
  const [loadingFaculty, setLoadingFaculty] = useState(isFaculty || isHod);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================================================================
  // ADMIN & INSTITUTION-WIDE ATTENDANCE LEDGER STATE (POSTGRESQL DRIVEN)
  // =========================================================================
  const [ledgerRecords, setLedgerRecords] = useState<any[]>([]);
  const [ledgerStats, setLedgerStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    attendanceRate: "0.0",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
  });
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerStatus, setLedgerStatus] = useState("All");
  const [ledgerDept, setLedgerDept] = useState(department || "All");
  const [ledgerTimeframe, setLedgerTimeframe] = useState("all");
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);

  // Tab 2: Today's Scheduled Sessions State
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [todaySummary, setTodaySummary] = useState({
    totalSessions: 0,
    submittedSessions: 0,
    pendingSessions: 0,
  });
  const [todayLoading, setTodayLoading] = useState(false);
  const [todayDeptFilter, setTodayDeptFilter] = useState("All");
  const [todayStatusFilter, setTodayStatusFilter] = useState("ALL");
  const [todaySearch, setTodaySearch] = useState("");

  // Load active departments from PostgreSQL
  useEffect(() => {
    if (isAdmin || isHod) {
      api.get("/api/anits/departments")
        .then((res) => {
          if (res.data && Array.isArray(res.data.departments)) {
            setDepartmentsList(res.data.departments);
          }
        })
        .catch(() => {});
    }
  }, [isAdmin, isHod]);

  const fetchLedger = useCallback(async (pageToFetch: number = 1) => {
    try {
      setLedgerLoading(true);
      const params: Record<string, any> = {
        page: pageToFetch,
        pageSize: 25,
      };
      if (ledgerStatus && ledgerStatus !== "All") params.status = ledgerStatus;
      if (ledgerDept && ledgerDept !== "All") params.department = ledgerDept;
      if (ledgerSearch.trim()) params.search = ledgerSearch.trim();
      if (ledgerTimeframe && ledgerTimeframe !== "all") params.timeframe = ledgerTimeframe;

      try {
        const res = await api.get("/api/anits/super-admin/attendance", { params });
        if (res.data) {
          setLedgerRecords(res.data.data || []);
          if (res.data.statistics) {
            setLedgerStats(res.data.statistics);
          }
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      } catch {
        // Fallback for HOD or legacy routes
        const res = await api.get("/api/attendance/ledger", { params });
        if (Array.isArray(res.data)) {
          setLedgerRecords(res.data);
          const p = res.data.filter((r: any) => r.status === "Present").length;
          const a = res.data.filter((r: any) => r.status === "Absent").length;
          const l = res.data.filter((r: any) => r.status === "Late").length;
          const t = res.data.length;
          const rate = t > 0 ? (((p + l) / t) * 100).toFixed(1) : "0.0";
          setLedgerStats({ total: t, present: p, absent: a, late: l, attendanceRate: rate });
          setPagination({ page: 1, pageSize: t, total: t, totalPages: 1 });
        }
      }
    } catch {
      toast.error("Failed to load attendance ledger from PostgreSQL.");
    } finally {
      setLedgerLoading(false);
    }
  }, [ledgerStatus, ledgerDept, ledgerSearch, ledgerTimeframe]);

  const fetchTodaySessions = useCallback(async () => {
    try {
      setTodayLoading(true);
      const params: Record<string, any> = {};
      if (todayDeptFilter && todayDeptFilter !== "All") params.department = todayDeptFilter;
      if (todayStatusFilter && todayStatusFilter !== "ALL") params.status = todayStatusFilter;
      if (todaySearch.trim()) params.search = todaySearch.trim();

      const res = await api.get("/api/anits/super-admin/attendance/today", { params });
      if (res.data) {
        setTodaySessions(res.data.sessions || []);
        if (res.data.summary) {
          setTodaySummary(res.data.summary);
        }
      }
    } catch {
      // Fallback
    } finally {
      setTodayLoading(false);
    }
  }, [todayDeptFilter, todayStatusFilter, todaySearch]);

  const handleExportLedgerCSV = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("cms_token");
      const url = new URL("http://localhost:5000/api/anits/super-admin/attendance/export");
      if (ledgerDept && ledgerDept !== "All") url.searchParams.set("department", ledgerDept);
      if (ledgerStatus && ledgerStatus !== "All") url.searchParams.set("status", ledgerStatus);
      if (ledgerSearch.trim()) url.searchParams.set("search", ledgerSearch.trim());
      if (ledgerTimeframe && ledgerTimeframe !== "all") url.searchParams.set("timeframe", ledgerTimeframe);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to export attendance ledger");
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `ANITS_Master_Attendance_Ledger_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Attendance ledger exported to CSV successfully.");
    } catch {
      toast.error("Unable to export attendance ledger.");
    }
  };

  const handleRefresh = async () => {
    if (ledgerLoading || todayLoading) return;
    const toastId = toast.loading("Refreshing ANITS attendance data from PostgreSQL...");
    try {
      await Promise.all([fetchLedger(pagination.page), fetchTodaySessions()]);
      toast.dismiss(toastId);
      toast.success("Attendance records synchronized with PostgreSQL.");
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to refresh attendance data.");
    }
  };

  const handleClearFilters = () => {
    setLedgerSearch("");
    setLedgerStatus("All");
    setLedgerDept("All");
    setLedgerTimeframe("all");
    fetchLedger(1);
  };

  useEffect(() => {
    if (isAdmin || isHod) {
      fetchLedger(1);
      fetchTodaySessions();
    }
  }, [isAdmin, isHod, fetchLedger, fetchTodaySessions]);

  const fetchFacultyAttendance = useCallback(async () => {
    try {
      setLoadingFaculty(true);
      const res = await api.get("/api/attendance/faculty/today");
      if (res.data) {
        setFacultyClasses(res.data.todayClasses || []);
        setFacultyStats(
          res.data.stats || {
            conducted: 0,
            pending: 0,
            presentToday: 0,
            absentToday: 0,
            average: 0,
            leavesPending: 0,
          }
        );

        if (searchParams.timetableId && res.data.todayClasses) {
          const match = res.data.todayClasses.find((c: any) => c.timetableId === searchParams.timetableId);
          if (match) {
            setActiveFormSlot(match);
            setActiveTab("mark");
          }
        }
      }
    } catch (err: any) {
      toast.error("Failed to load today's faculty classes.");
    } finally {
      setLoadingFaculty(false);
    }
  }, [searchParams.timetableId]);

  const loadRosterForSlot = async (slot: TodayClassItem) => {
    setActiveFormSlot(slot);
    setLoadingRoster(true);
    try {
      const res = await api.get(`/api/attendance/faculty/session/${slot.timetableId}/roster`);
      if (res.data && res.data.students) {
        setRosterStudents(res.data.students);
        setActiveTab("mark");
      }
    } catch (err: any) {
      toast.error("Failed to load session roster from PostgreSQL.");
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleSubmitAttendance = async (data: {
    students: { studentId: string; status: "Present" | "Absent" | "Late"; remarks?: string }[];
    summary: { total: number; present: number; absent: number; late: number; percentage: number };
  }) => {
    if (!activeFormSlot) return;
    setIsSubmitting(true);
    const toastId = toast.loading("Submitting verified attendance to PostgreSQL...");

    try {
      const res = await api.post(`/api/attendance/faculty/session/${activeFormSlot.timetableId}/mark`, {
        date: new Date().toISOString().split("T")[0],
        students: data.students,
        summary: data.summary,
      });

      if (res.status === 200) {
        toast.dismiss(toastId);
        toast.success("Attendance successfully committed to PostgreSQL database.");
        setActiveFormSlot(null);
        setActiveTab("today");
        fetchFacultyAttendance();
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.error || "Failed to submit attendance.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isFaculty || isHod) {
      fetchFacultyAttendance();
    }
  }, [isFaculty, isHod, fetchFacultyAttendance]);

  // =========================================================================
  // STUDENT STATE & LOGIC
  // =========================================================================
  const [studentProfile, setStudentProfile] = useState<StudentAttendanceProfile | null>(null);
  const [studentSubjects, setStudentSubjects] = useState<SubjectAttendanceItem[]>([]);
  const [studentHistory, setStudentHistory] = useState<AttendanceHistoryRecord[]>([]);
  const [studentAlerts, setStudentAlerts] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectAttendanceItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(isStudent);

  const fetchStudentAttendance = useCallback(async () => {
    try {
      setLoadingStudent(true);
      const res = await api.get("/api/attendance/student/my-attendance");
      if (res.data) {
        setStudentProfile(res.data.profile);
        setStudentSubjects(res.data.subjects || []);
        setStudentHistory(res.data.history || []);
        setStudentAlerts(res.data.alerts || []);
      }
    } catch (err: any) {
      toast.error("Failed to load attendance records.");
    } finally {
      setLoadingStudent(false);
    }
  }, []);

  const handleExportStudentCSV = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("cms_token");
      const res = await fetch("http://localhost:5000/api/attendance/student/export?format=csv", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to export attendance");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ANITS_Attendance_${studentProfile?.rollNumber || "Student"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Attendance ledger exported to CSV.");
    } catch (e) {
      toast.error("Unable to export attendance.");
    }
  };

  useEffect(() => {
    if (isStudent) {
      fetchStudentAttendance();
    }
  }, [isStudent, fetchStudentAttendance]);

  // =========================================================================
  // RENDER 1: FACULTY ATTENDANCE INTERFACE
  // =========================================================================
  if (isFaculty) {
    if (loadingFaculty && !activeFormSlot) {
      return (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <AttendanceHeader
          academicYear="2026-27"
          currentDate={new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "short", day: "numeric" })}
          onRefresh={fetchFacultyAttendance}
          isRefreshing={loadingFaculty}
        />

        <StatisticsCards stats={facultyStats} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-card border border-border/60 p-1 rounded-xl">
            <TabsTrigger value="today" className="rounded-lg text-xs font-semibold">
              Today's Sessions
            </TabsTrigger>
            {activeFormSlot && (
              <TabsTrigger value="mark" className="rounded-lg text-xs font-semibold text-primary font-bold">
                Mark Session Attendance
              </TabsTrigger>
            )}
            <TabsTrigger value="history" className="rounded-lg text-xs font-semibold">
              Attendance History
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg text-xs font-semibold">
              Class Analytics
            </TabsTrigger>
          </TabsList>

          {/* Today's Classes */}
          <TabsContent value="today" className="space-y-4">
            <TodayClasses
              classes={facultyClasses}
              onTakeAttendance={loadRosterForSlot}
              onViewRegister={loadRosterForSlot}
            />
          </TabsContent>

          {/* Mark Attendance Roster Form */}
          {activeFormSlot && (
            <TabsContent value="mark" className="space-y-4">
              {loadingRoster ? (
                <div className="p-12 text-center bg-card rounded-2xl border border-border/60">
                  <Loader2 className="size-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-semibold">Loading enrolled students from PostgreSQL...</p>
                </div>
              ) : (
                <AttendanceForm
                  slot={activeFormSlot}
                  students={rosterStudents}
                  onSubmit={handleSubmitAttendance}
                  isSubmitting={isSubmitting}
                />
              )}
            </TabsContent>
          )}

          {/* History */}
          <TabsContent value="history" className="space-y-4">
            <AttendanceHistory />
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-4">
            <AttendanceAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // =========================================================================
  // RENDER 2: STUDENT ATTENDANCE PORTAL
  // =========================================================================
  if (isStudent) {
    if (loadingStudent && !studentProfile) {
      return (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Student Portal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border/60 shadow-xs">
          <div>
            <h2 className="text-xl font-black text-foreground">My Attendance</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              ANITS Academic Attendance Records &middot; AY 2026-27 &middot; Semester {studentProfile?.semester || 6}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportStudentCSV}
              className="h-9 rounded-xl text-xs font-semibold gap-1.5"
            >
              <Download className="size-3.5" /> Export Ledger
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStudentAttendance()}
              disabled={loadingStudent}
              className="h-9 rounded-xl text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${loadingStudent ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* Low Attendance Banner Alerts */}
        {studentAlerts.length > 0 && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs">
              <AlertTriangle className="size-4" /> LOW ATTENDANCE ALERT (&lt;75% Threshold)
            </div>
            <ul className="text-xs list-disc list-inside space-y-0.5 pt-1 text-destructive/90">
              {studentAlerts.map((alert, idx) => (
                <li key={idx}>{alert}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary Metric Cards */}
        {studentProfile && (
          <AttendanceSummary
            profile={studentProfile}
            schedule={[]}
            subjects={studentSubjects}
            onOpenLeaveModal={() => {}}
            onSelectTab={() => {}}
          />
        )}

        {/* Subject-Wise Table */}
        <SubjectAttendance
          subjects={studentSubjects}
          onSelectSubject={(subject) => {
            setSelectedSubject(subject);
            setDrawerOpen(true);
          }}
        />

        {/* Session History Ledger */}
        <StudentAttendanceHistory logs={studentHistory} />

        {/* Subject Drawer Modal */}
        <AttendanceDrawer
          subject={selectedSubject}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      </div>
    );
  }

  // =========================================================================
  // RENDER 3: HOD & ADMIN INSTITUTION-WIDE ATTENDANCE LEDGER
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Header Banner with Action Buttons */}
      <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground">
            {isHod ? `${department || "Department"} Attendance Ledger & Governance` : "ANITS Institutional Attendance Ledger"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time synchronization with PostgreSQL AttendanceRecord ledger across all academic branches.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportLedgerCSV}
            className="h-9 rounded-xl text-xs font-semibold gap-1.5 bg-card hover:bg-muted/50 border-border/70"
          >
            <Download className="size-3.5" /> Export Ledger (CSV)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={ledgerLoading || todayLoading}
            className="h-9 rounded-xl text-xs font-semibold gap-1.5 bg-card hover:bg-muted/50 border-border/70"
          >
            <RefreshCw className={`size-3.5 ${ledgerLoading || todayLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs: Full Ledger vs Today's Sessions */}
      <Tabs defaultValue="ledger" className="space-y-4">
        <TabsList className="bg-card border border-border/60 p-1 rounded-xl">
          <TabsTrigger value="ledger" className="rounded-lg text-xs font-semibold gap-1.5">
            <ClipboardCheck className="size-3.5" /> Attendance Ledger ({ledgerStats.total})
          </TabsTrigger>
          <TabsTrigger value="sessions" className="rounded-lg text-xs font-semibold gap-1.5">
            <CalendarCheck className="size-3.5" /> Today's Scheduled Sessions ({todaySummary.totalSessions})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FULL ATTENDANCE LEDGER */}
        <TabsContent value="ledger" className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Records</span>
              <div className="text-2xl font-black text-foreground mt-1">{ledgerStats.total}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Matching active filter scope</p>
            </Card>

            <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Present</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{ledgerStats.present}</div>
              <p className="text-[10px] text-emerald-600/80 font-medium mt-0.5">Marked present in ledger</p>
            </Card>

            <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Absent</span>
              <div className="text-2xl font-black text-rose-600 mt-1">{ledgerStats.absent}</div>
              <p className="text-[10px] text-rose-600/80 font-medium mt-0.5">Marked absent in ledger</p>
            </Card>

            <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Attendance Rate</span>
              <div className="text-2xl font-black text-blue-600 mt-1">{ledgerStats.attendanceRate}%</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {ledgerStats.late > 0 ? `${ledgerStats.late} late arrivals counted` : "Verified PostgreSQL ledger"}
              </p>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="rounded-xl border border-border/60 shadow-xs p-3.5 bg-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1 min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Filter by student name, roll number, course code..."
                  className="h-8.5 pl-8.5 text-xs bg-muted/30 border-border/60 rounded-lg w-full"
                />
              </div>

              {/* Filters dropdowns & Clear */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Department filter */}
                {isAdmin && (
                  <select
                    value={ledgerDept}
                    onChange={(e) => setLedgerDept(e.target.value)}
                    aria-label="Filter by Department"
                    className="h-8.5 text-xs rounded-lg border border-border/60 bg-muted/30 px-2.5 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">All Departments</option>
                    {departmentsList.length > 0 ? (
                      departmentsList.map((d) => (
                        <option key={d.id} value={d.code}>
                          {d.code} - {d.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="CSE">CSE</option>
                        <option value="AI&ML">AI&amp;ML</option>
                        <option value="AI&DS">AI&amp;DS</option>
                        <option value="IT">IT</option>
                        <option value="EEE">EEE</option>
                        <option value="ECE">ECE</option>
                        <option value="CIVIL">CIVIL</option>
                        <option value="MECHANICAL">MECHANICAL</option>
                      </>
                    )}
                  </select>
                )}

                {/* Status filter */}
                <select
                  value={ledgerStatus}
                  onChange={(e) => setLedgerStatus(e.target.value)}
                  aria-label="Filter by Attendance Status"
                  className="h-8.5 text-xs rounded-lg border border-border/60 bg-muted/30 px-2.5 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="All">All Statuses</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                </select>

                {/* Timeframe filter */}
                <select
                  value={ledgerTimeframe}
                  onChange={(e) => setLedgerTimeframe(e.target.value)}
                  aria-label="Filter by Timeframe"
                  className="h-8.5 text-xs rounded-lg border border-border/60 bg-muted/30 px-2.5 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Dates</option>
                  <option value="daily">Today Only</option>
                  <option value="weekly">Past 7 Days</option>
                  <option value="monthly">Past 30 Days</option>
                </select>

                {/* Clear Filters Button */}
                {(ledgerSearch || ledgerStatus !== "All" || ledgerDept !== "All" || ledgerTimeframe !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-8.5 text-xs rounded-lg gap-1 text-muted-foreground hover:text-foreground px-2"
                  >
                    <RotateCcw className="size-3" /> Clear
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Ledger Table */}
          <Card className="rounded-xl border border-border/60 shadow-xs overflow-hidden bg-card">
            {ledgerLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="size-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-semibold">Loading PostgreSQL attendance ledger...</p>
              </div>
            ) : ledgerRecords.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                {ledgerSearch || ledgerStatus !== "All" || ledgerDept !== "All" || ledgerTimeframe !== "all"
                  ? "No attendance ledger records match the current filters."
                  : "No attendance ledger records exist in PostgreSQL."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/30 border-b border-border/50 text-muted-foreground font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-3">Period</th>
                      <th className="py-3 px-4">Dept &amp; Section</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Faculty</th>
                      <th className="py-3 px-4">Room</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {ledgerRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-foreground font-medium whitespace-nowrap">
                          {rec.date}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-semibold text-foreground">Period {rec.periodNumber || 1}</span>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-foreground">{rec.department}</span>
                          <span className="text-muted-foreground ml-1">
                            {rec.semester ? `Sem ${rec.semester}` : ""} ({rec.section || "A"})
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-foreground">{rec.studentName}</div>
                          <div className="text-[11px] font-mono text-muted-foreground">{rec.rollNo}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-foreground">{rec.courseCode}</div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-44">{rec.courseTitle}</div>
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                          {rec.instructor}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                          {rec.room || "Room N/A"}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={
                              rec.status === "Present"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] font-bold"
                                : rec.status === "Late"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px] font-bold"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[11px] font-bold"
                            }
                          >
                            {rec.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/10 text-xs text-muted-foreground">
                <div>
                  Showing{" "}
                  <span className="font-semibold text-foreground">
                    {(pagination.page - 1) * pagination.pageSize + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-foreground">
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                  </span>{" "}
                  of <span className="font-semibold text-foreground">{pagination.total}</span> records
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1 || ledgerLoading}
                    onClick={() => fetchLedger(pagination.page - 1)}
                    className="h-8 px-2 rounded-lg text-xs gap-1 border-border/60"
                  >
                    <ChevronLeft className="size-3.5" /> Prev
                  </Button>
                  <span className="text-xs px-2 font-medium text-foreground">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages || ledgerLoading}
                    onClick={() => fetchLedger(pagination.page + 1)}
                    className="h-8 px-2 rounded-lg text-xs gap-1 border-border/60"
                  >
                    Next <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB 2: TODAY'S SCHEDULED SESSIONS */}
        <TabsContent value="sessions" className="space-y-4">
          {/* Today Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Scheduled Today</span>
              <div className="text-2xl font-black text-foreground mt-1">{todaySummary.totalSessions}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">MasterTimetable sessions across ANITS</p>
            </Card>

            <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Attendance Submitted</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{todaySummary.submittedSessions}</div>
              <p className="text-[10px] text-emerald-600/80 font-medium mt-0.5">Verified distinct sessions marked</p>
            </Card>

            <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Attendance Pending</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{todaySummary.pendingSessions}</div>
              <p className="text-[10px] text-amber-600/80 font-medium mt-0.5">Awaiting faculty submission</p>
            </Card>
          </div>

          {/* Today Filter Bar */}
          <Card className="rounded-xl border border-border/60 shadow-xs p-3.5 bg-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={todaySearch}
                  onChange={(e) => setTodaySearch(e.target.value)}
                  placeholder="Filter sessions by course code, faculty, room..."
                  className="h-8.5 pl-8.5 text-xs bg-muted/30 border-border/60 rounded-lg w-full"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={todayDeptFilter}
                  onChange={(e) => setTodayDeptFilter(e.target.value)}
                  aria-label="Filter Sessions by Department"
                  className="h-8.5 text-xs rounded-lg border border-border/60 bg-muted/30 px-2.5 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="All">All Departments</option>
                  {departmentsList.map((d) => (
                    <option key={d.id} value={d.code}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>

                <select
                  value={todayStatusFilter}
                  onChange={(e) => setTodayStatusFilter(e.target.value)}
                  aria-label="Filter Sessions by Status"
                  className="h-8.5 text-xs rounded-lg border border-border/60 bg-muted/30 px-2.5 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Sessions</option>
                  <option value="SUBMITTED">Submitted Only</option>
                  <option value="PENDING">Pending Only</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Today Sessions Table */}
          <Card className="rounded-xl border border-border/60 shadow-xs overflow-hidden bg-card">
            {todayLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="size-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-semibold">Loading today's scheduled timetable sessions...</p>
              </div>
            ) : todaySessions.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                No scheduled timetable sessions found matching the current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/30 border-b border-border/50 text-muted-foreground font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Period &amp; Time</th>
                      <th className="py-3 px-4">Dept &amp; Section</th>
                      <th className="py-3 px-4">Course / Subject</th>
                      <th className="py-3 px-4">Faculty</th>
                      <th className="py-3 px-4">Room</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {todaySessions.map((session) => (
                      <tr key={session.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-foreground">Period {session.period}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{session.startTime} - {session.endTime}</div>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-foreground">{session.department}</span>
                          <span className="text-muted-foreground ml-1">Sem {session.semester} ({session.section})</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-foreground">{session.courseCode}</div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-48">{session.courseTitle}</div>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap text-foreground font-medium">
                          {session.instructor}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                          {session.room}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {session.status === "SUBMITTED" ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] font-bold gap-1"
                            >
                              <CheckCircle2 className="size-3" /> SUBMITTED
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px] font-bold gap-1"
                            >
                              <Clock className="size-3" /> PENDING
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
