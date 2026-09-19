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
  UserCheck,
  GraduationCap,
  User,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const hodDept = department || "CSE";
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
  const [ledgerDept, setLedgerDept] = useState(isHod ? hodDept : "All");
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
  const [todayDeptFilter, setTodayDeptFilter] = useState(isHod ? hodDept : "All");
  const [todayStatusFilter, setTodayStatusFilter] = useState("ALL");
  const [todaySearch, setTodaySearch] = useState("");

  // =========================================================================
  // HOD ACTIVE TAB & DATA STATES
  // =========================================================================
  const [activeHodTab, setActiveHodTab] = useState<string>(
    searchParams.tab === "faculty" || searchParams.tab === "student" || searchParams.tab === "sessions"
      ? searchParams.tab
      : "ledger"
  );

  useEffect(() => {
    if (searchParams.tab) {
      setActiveHodTab(searchParams.tab);
    }
  }, [searchParams.tab]);

  // HOD Faculty Conduction State
  const [facultyConduction, setFacultyConduction] = useState<any[]>([]);
  const [facultyConductionSummary, setFacultyConductionSummary] = useState({
    totalFaculty: 0,
    totalScheduled: 0,
    totalConducted: 0,
    completionRate: "0.0",
  });
  const [facultyConductionLoading, setFacultyConductionLoading] = useState(false);
  const [facultyConductionSearch, setFacultyConductionSearch] = useState("");

  // HOD Student Attendance & Shortage State
  const [studentAttendanceList, setStudentAttendanceList] = useState<any[]>([]);
  const [studentAttendanceSummary, setStudentAttendanceSummary] = useState({
    totalStudents: 0,
    eligibleCount: 0,
    shortageCount: 0,
    averageAttendance: "0.0",
  });
  const [studentAttendanceLoading, setStudentAttendanceLoading] = useState(false);
  const [studentAttendanceSearch, setStudentAttendanceSearch] = useState("");
  const [studentAttendanceFilter, setStudentAttendanceFilter] = useState("All");

  // Student Drilldown Modal State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<any | null>(null);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

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
      if (!isHod && ledgerDept && ledgerDept !== "All") params.department = ledgerDept;
      if (ledgerSearch.trim()) params.search = ledgerSearch.trim();
      if (ledgerTimeframe && ledgerTimeframe !== "all") params.timeframe = ledgerTimeframe;

      try {
        const endpoint = isHod ? "/api/anits/hod/attendance/ledger" : "/api/anits/super-admin/attendance";
        const res = await api.get(endpoint, { params });
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
        // Fallback for legacy routes
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
  }, [isHod, ledgerStatus, ledgerDept, ledgerSearch, ledgerTimeframe]);

  const fetchTodaySessions = useCallback(async () => {
    try {
      setTodayLoading(true);
      const params: Record<string, any> = {};
      const deptFilter = isHod ? hodDept : todayDeptFilter;
      if (deptFilter && deptFilter !== "All") params.department = deptFilter;
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
  }, [isHod, hodDept, todayDeptFilter, todayStatusFilter, todaySearch]);

  const fetchFacultyConduction = useCallback(async () => {
    try {
      setFacultyConductionLoading(true);
      const res = await api.get("/api/anits/hod/attendance/faculty-conduction");
      if (res.data) {
        setFacultyConduction(res.data.faculty || []);
        if (res.data.summary) {
          setFacultyConductionSummary(res.data.summary);
        }
      }
    } catch {
      toast.error("Failed to load faculty conduction records.");
    } finally {
      setFacultyConductionLoading(false);
    }
  }, []);

  const fetchStudentAttendanceList = useCallback(async () => {
    try {
      setStudentAttendanceLoading(true);
      const params: Record<string, any> = {};
      if (studentAttendanceSearch.trim()) params.search = studentAttendanceSearch.trim();
      if (studentAttendanceFilter && studentAttendanceFilter !== "All") params.status = studentAttendanceFilter;

      const res = await api.get("/api/anits/hod/attendance/students", { params });
      if (res.data) {
        setStudentAttendanceList(res.data.students || []);
        if (res.data.summary) {
          setStudentAttendanceSummary(res.data.summary);
        }
      }
    } catch {
      toast.error("Failed to load department student attendance.");
    } finally {
      setStudentAttendanceLoading(false);
    }
  }, [studentAttendanceSearch, studentAttendanceFilter]);

  const openStudentDetail = async (studentId: string) => {
    try {
      setSelectedStudentId(studentId);
      setIsDrilldownOpen(true);
      setStudentDetailLoading(true);
      const res = await api.get(`/api/anits/hod/attendance/student/${studentId}`);
      if (res.data) {
        setStudentDetail(res.data);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to load student attendance drilldown.");
      setIsDrilldownOpen(false);
    } finally {
      setStudentDetailLoading(false);
    }
  };

  const handleExportLedgerCSV = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("cms_token");
      const exportEndpoint = isHod
        ? "http://localhost:5000/api/anits/hod/attendance/export"
        : "http://localhost:5000/api/anits/super-admin/attendance/export";
      const url = new URL(exportEndpoint);
      if (!isHod && ledgerDept && ledgerDept !== "All") url.searchParams.set("department", ledgerDept);
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
      a.download = `ANITS_${isHod ? hodDept : "Master"}_Attendance_Ledger_${new Date().toISOString().split("T")[0]}.csv`;
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
    if (ledgerLoading || todayLoading || facultyConductionLoading || studentAttendanceLoading) return;
    const toastId = toast.loading("Refreshing ANITS attendance data from PostgreSQL...");
    try {
      if (isHod) {
        await Promise.all([
          fetchLedger(pagination.page),
          fetchTodaySessions(),
          fetchFacultyConduction(),
          fetchStudentAttendanceList(),
        ]);
      } else {
        await Promise.all([fetchLedger(pagination.page), fetchTodaySessions()]);
      }
      toast.dismiss(toastId);
      toast.success("Attendance records synchronized with PostgreSQL.");
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to refresh attendance data.");
    }
  };

  // Tab change dynamic loader for HOD
  useEffect(() => {
    if (isHod) {
      if (activeHodTab === "faculty") {
        fetchFacultyConduction();
      } else if (activeHodTab === "student") {
        fetchStudentAttendanceList();
      } else if (activeHodTab === "sessions") {
        fetchTodaySessions();
      } else if (activeHodTab === "ledger") {
        fetchLedger(pagination.page);
      }
    }
  }, [isHod, activeHodTab, fetchFacultyConduction, fetchStudentAttendanceList, fetchTodaySessions, fetchLedger, pagination.page]);

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
          semester="5"
          currentDate={new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "short", day: "numeric" })}
        />

        <StatisticsCards attendanceData={{ stats: facultyStats } as any} />

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
                  onCancel={() => setActiveFormSlot(null)}
                  isSubmitting={isSubmitting}
                />
              )}
            </TabsContent>
          )}

          {/* History */}
          <TabsContent value="history" className="space-y-4">
            <AttendanceHistory history={[]} isLoading={false} />
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
        {drawerOpen && (
          <AttendanceDrawer
            subject={selectedSubject}
            onClose={() => setDrawerOpen(false)}
          />
        )}
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
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground">
              {isHod ? `${hodDept} Attendance Management & Governance` : "ANITS Institutional Attendance Ledger"}
            </h2>
            {isHod && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold text-xs">
                HOD &middot; {hodDept}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isHod
              ? `Real-time synchronization with PostgreSQL AttendanceRecord ledger for ${hodDept} students, courses, and sessions.`
              : "Real-time synchronization with PostgreSQL AttendanceRecord ledger across all academic branches."}
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
            disabled={ledgerLoading || todayLoading || facultyConductionLoading || studentAttendanceLoading}
            className="h-9 rounded-xl text-xs font-semibold gap-1.5 bg-card hover:bg-muted/50 border-border/70"
          >
            <RefreshCw className={`size-3.5 ${ledgerLoading || todayLoading || facultyConductionLoading || studentAttendanceLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs: Full Ledger vs Today's Sessions vs Faculty Conduction vs Student Attendance */}
      <Tabs value={activeHodTab} onValueChange={setActiveHodTab} className="space-y-4">
        <TabsList className="bg-card border border-border/60 p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="ledger" className="rounded-lg text-xs font-semibold gap-1.5">
            <ClipboardCheck className="size-3.5" /> Attendance Ledger ({ledgerStats.total})
          </TabsTrigger>
          <TabsTrigger value="sessions" className="rounded-lg text-xs font-semibold gap-1.5">
            <CalendarCheck className="size-3.5" /> Today's Scheduled Sessions ({todaySummary.totalSessions})
          </TabsTrigger>
          {isHod && (
            <>
              <TabsTrigger value="faculty" className="rounded-lg text-xs font-semibold gap-1.5">
                <UserCheck className="size-3.5" /> Faculty Attendance ({facultyConductionSummary.totalFaculty})
              </TabsTrigger>
              <TabsTrigger value="student" className="rounded-lg text-xs font-semibold gap-1.5">
                <GraduationCap className="size-3.5" /> Student Attendance ({studentAttendanceSummary.totalStudents})
              </TabsTrigger>
            </>
          )}
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
                {isAdmin ? (
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
                ) : isHod ? (
                  <div className="h-8.5 text-xs rounded-lg border border-primary/40 bg-primary/10 px-2.5 flex items-center font-bold text-primary">
                    {hodDept} Dept
                  </div>
                ) : null}

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
                {isAdmin ? (
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
                ) : isHod ? (
                  <div className="h-8.5 text-xs rounded-lg border border-primary/40 bg-primary/10 px-2.5 flex items-center font-bold text-primary">
                    {hodDept} Dept
                  </div>
                ) : null}

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

        {/* TAB 3: HOD FACULTY ATTENDANCE & CONDUCTION AUDIT */}
        {isHod && (
          <TabsContent value="faculty" className="space-y-4">
            {/* Faculty Conduction KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Department Faculty</span>
                <div className="text-2xl font-black text-foreground mt-1">{facultyConductionSummary.totalFaculty}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{hodDept} teaching faculty</p>
              </Card>

              <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Scheduled Sessions</span>
                <div className="text-2xl font-black text-blue-600 mt-1">{facultyConductionSummary.totalScheduled}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">MasterTimetable allocations</p>
              </Card>

              <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Conducted Sessions</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{facultyConductionSummary.totalConducted}</div>
                <p className="text-[10px] text-emerald-600/80 font-medium mt-0.5">Submitted attendance sessions</p>
              </Card>

              <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Conduction Rate</span>
                <div className="text-2xl font-black text-indigo-600 mt-1">{facultyConductionSummary.completionRate}%</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Session conduction ratio</p>
              </Card>
            </div>

            {/* Filter Bar */}
            <Card className="rounded-xl border border-border/60 shadow-xs p-3.5 bg-card">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={facultyConductionSearch}
                    onChange={(e) => setFacultyConductionSearch(e.target.value)}
                    placeholder="Filter by faculty name, designation, or subject..."
                    className="h-8.5 pl-8.5 text-xs bg-muted/30 border-border/60 rounded-lg w-full"
                  />
                </div>
              </div>
            </Card>

            {/* Faculty Table */}
            <Card className="rounded-xl border border-border/60 shadow-xs overflow-hidden bg-card">
              {facultyConductionLoading ? (
                <div className="p-12 text-center">
                  <Loader2 className="size-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-semibold">Loading department faculty conduction records...</p>
                </div>
              ) : facultyConduction.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  No faculty members found for {hodDept} department.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/30 border-b border-border/50 text-muted-foreground font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Faculty Name</th>
                        <th className="py-3 px-4">Designation</th>
                        <th className="py-3 px-4">Assigned Subjects</th>
                        <th className="py-3 px-3 text-center">Scheduled</th>
                        <th className="py-3 px-3 text-center">Conducted</th>
                        <th className="py-3 px-3 text-center">Pending</th>
                        <th className="py-3 px-4 text-center">Submission Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {facultyConduction
                        .filter((f) => {
                          if (!facultyConductionSearch.trim()) return true;
                          const q = facultyConductionSearch.toLowerCase();
                          return (
                            f.facultyName.toLowerCase().includes(q) ||
                            f.email.toLowerCase().includes(q) ||
                            f.designation.toLowerCase().includes(q) ||
                            (f.subjects || []).some((s: string) => s.toLowerCase().includes(q))
                          );
                        })
                        .map((f) => {
                          const rateNum = parseFloat(f.submissionRate || "0");
                          return (
                            <tr key={f.facultyId} className="hover:bg-muted/20 transition-colors">
                              <td className="py-2.5 px-4">
                                <div className="font-bold text-foreground">{f.facultyName}</div>
                                <div className="text-[11px] text-muted-foreground">{f.email}</div>
                              </td>
                              <td className="py-2.5 px-4 whitespace-nowrap text-muted-foreground font-medium">
                                {f.designation}
                              </td>
                              <td className="py-2.5 px-4">
                                <div className="flex flex-wrap gap-1 max-w-md">
                                  {(f.subjects || []).map((sub: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-[10px] bg-muted/40 font-mono">
                                      {sub}
                                    </Badge>
                                  ))}
                                  {(!f.subjects || f.subjects.length === 0) && (
                                    <span className="text-muted-foreground text-[11px]">No allocated subjects</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold font-mono text-foreground">
                                {f.scheduledClasses}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-600">
                                {f.completedClasses}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold font-mono text-amber-600">
                                {f.pendingClasses}
                              </td>
                              <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                <Badge
                                  variant="outline"
                                  className={
                                    rateNum >= 80
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] font-bold"
                                      : rateNum >= 50
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px] font-bold"
                                      : "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[11px] font-bold"
                                  }
                                >
                                  {f.submissionRate}%
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>
        )}

        {/* TAB 4: HOD STUDENT ATTENDANCE & SHORTAGE AUDIT */}
        {isHod && (
          <TabsContent value="student" className="space-y-4">
            {/* Student Attendance KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Department Students</span>
                <div className="text-2xl font-black text-foreground mt-1">{studentAttendanceSummary.totalStudents}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Enrolled in {hodDept}</p>
              </Card>

              <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Average Attendance</span>
                <div className="text-2xl font-black text-blue-600 mt-1">{studentAttendanceSummary.averageAttendance}%</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Department aggregate rate</p>
              </Card>

              <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Eligible Students</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{studentAttendanceSummary.eligibleCount}</div>
                <p className="text-[10px] text-emerald-600/80 font-medium mt-0.5">&ge;75% Attendance threshold</p>
              </Card>

              <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Attendance Shortage</span>
                <div className="text-2xl font-black text-rose-600 mt-1">{studentAttendanceSummary.shortageCount}</div>
                <p className="text-[10px] text-rose-600/80 font-medium mt-0.5">&lt;75% Condonation required</p>
              </Card>
            </div>

            {/* Filter Bar */}
            <Card className="rounded-xl border border-border/60 shadow-xs p-3.5 bg-card">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={studentAttendanceSearch}
                    onChange={(e) => setStudentAttendanceSearch(e.target.value)}
                    placeholder="Filter by student name or roll number..."
                    className="h-8.5 pl-8.5 text-xs bg-muted/30 border-border/60 rounded-lg w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={studentAttendanceFilter}
                    onChange={(e) => setStudentAttendanceFilter(e.target.value)}
                    aria-label="Filter by Eligibility"
                    className="h-8.5 text-xs rounded-lg border border-border/60 bg-muted/30 px-2.5 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">All Eligibility Statuses</option>
                    <option value="Eligible">Eligible (&ge;75%)</option>
                    <option value="Shortage">Attendance Shortage (&lt;75%)</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Students Table */}
            <Card className="rounded-xl border border-border/60 shadow-xs overflow-hidden bg-card">
              {studentAttendanceLoading ? (
                <div className="p-12 text-center">
                  <Loader2 className="size-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-semibold">Loading department student attendance...</p>
                </div>
              ) : studentAttendanceList.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  No students found matching the current search criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/30 border-b border-border/50 text-muted-foreground font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Roll Number</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-3">Sem &amp; Sec</th>
                        <th className="py-3 px-3 text-center">Total Sessions</th>
                        <th className="py-3 px-3 text-center">Attended</th>
                        <th className="py-3 px-3 text-center">Absent</th>
                        <th className="py-3 px-4 text-center">Attendance Rate</th>
                        <th className="py-3 px-4 text-center">Eligibility</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {studentAttendanceList.map((st) => {
                        const isShortage = st.eligibility === "Shortage";
                        return (
                          <tr key={st.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                              {st.rollNo}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-foreground">
                              {st.name}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                              Sem {st.semester} ({st.section})
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-foreground">
                              {st.totalClasses}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600">
                              {st.presentClasses + (st.lateClasses || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600">
                              {st.absentClasses}
                            </td>
                            <td className="py-2.5 px-4 text-center whitespace-nowrap font-mono font-bold">
                              <span className={isShortage ? "text-rose-600 font-black" : "text-emerald-600"}>
                                {st.attendanceRate}%
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={
                                  isShortage
                                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[11px] font-bold"
                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] font-bold"
                                }
                              >
                                {isShortage ? "Attendance Shortage" : "Eligible"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-center whitespace-nowrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openStudentDetail(st.id)}
                                className="h-7 px-2.5 text-[11px] rounded-lg font-semibold hover:bg-primary/10 hover:text-primary border-border/60"
                              >
                                View Details
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* STUDENT ATTENDANCE DRILLDOWN DIALOG */}
      <Dialog open={isDrilldownOpen} onOpenChange={setIsDrilldownOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <GraduationCap className="size-5 text-primary" />
              Student Attendance Details &middot; {studentDetail?.student?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Official attendance ledger drilldown and subject breakdown from PostgreSQL.
            </DialogDescription>
          </DialogHeader>

          {studentDetailLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="size-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-semibold">Loading student records...</p>
            </div>
          ) : studentDetail ? (
            <div className="space-y-4 text-xs">
              {/* Student Metadata Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/60">
                <div>
                  <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Roll Number</span>
                  <div className="font-mono font-bold text-foreground text-xs mt-0.5">{studentDetail.student.rollNo}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Department</span>
                  <div className="font-bold text-foreground text-xs mt-0.5">{studentDetail.student.department}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Semester &amp; Sec</span>
                  <div className="font-bold text-foreground text-xs mt-0.5">Sem {studentDetail.student.semester} ({studentDetail.student.section})</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Eligibility Status</span>
                  <div className="mt-0.5">
                    <Badge
                      variant="outline"
                      className={
                        studentDetail.attendanceSummary.status === "Shortage"
                          ? "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-bold"
                          : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold"
                      }
                    >
                      {studentDetail.attendanceSummary.status === "Shortage" ? "Attendance Shortage" : "Eligible"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Attendance Summary Banner */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Total Sessions</div>
                  <div className="text-lg font-black font-mono mt-0.5">{studentDetail.attendanceSummary.totalSessions}</div>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase">Attended</div>
                  <div className="text-lg font-black font-mono text-emerald-600 mt-0.5">{studentDetail.attendanceSummary.attendedSessions}</div>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <div className="text-[10px] font-bold text-rose-600 uppercase">Absent</div>
                  <div className="text-lg font-black font-mono text-rose-600 mt-0.5">{studentDetail.attendanceSummary.absentSessions}</div>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <div className="text-[10px] font-bold text-blue-600 uppercase">Rate %</div>
                  <div className={`text-lg font-black font-mono mt-0.5 ${
                    parseFloat(studentDetail.attendanceSummary.attendancePercentage) < 75 ? "text-rose-600" : "text-blue-600"
                  }`}>
                    {studentDetail.attendanceSummary.attendancePercentage}%
                  </div>
                </div>
              </div>

              {/* Subject-Wise Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Subject-Wise Attendance Breakdown</h4>
                <div className="rounded-xl border border-border/60 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/30 border-b border-border/50 text-muted-foreground font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Subject / Course</th>
                        <th className="py-2.5 px-3 text-center">Conducted</th>
                        <th className="py-2.5 px-3 text-center">Attended</th>
                        <th className="py-2.5 px-3 text-center">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(studentDetail.subjectWise || []).map((sub: any, idx: number) => {
                        const pctNum = parseFloat(sub.percentage || "0");
                        return (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="py-2 px-3">
                              <div className="font-bold text-foreground">{sub.courseTitle}</div>
                              <div className="text-[10px] font-mono text-muted-foreground">{sub.courseCode}</div>
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-semibold">{sub.conducted}</td>
                            <td className="py-2 px-3 text-center font-mono font-semibold text-emerald-600">{sub.attended}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold">
                              <span className={pctNum < 75 ? "text-rose-600" : "text-emerald-600"}>
                                {sub.percentage}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {(!studentDetail.subjectWise || studentDetail.subjectWise.length === 0) && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-muted-foreground">
                            No subject attendance records found for this student.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Attendance Log */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Recent Attendance History</h4>
                <div className="rounded-xl border border-border/60 overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/30 border-b border-border/50 text-muted-foreground font-semibold uppercase text-[10px] sticky top-0 bg-muted">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-2 text-center">Period</th>
                        <th className="py-2 px-3">Subject</th>
                        <th className="py-2 px-3">Faculty</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(studentDetail.history || []).map((h: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="py-1.5 px-3 font-mono text-[11px] whitespace-nowrap">{h.date}</td>
                          <td className="py-1.5 px-2 text-center font-semibold">{h.period}</td>
                          <td className="py-1.5 px-3 truncate max-w-36">{h.subject}</td>
                          <td className="py-1.5 px-3 text-muted-foreground truncate max-w-28">{h.faculty}</td>
                          <td className="py-1.5 px-3 text-center whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={
                                h.status === "Present"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold"
                                  : h.status === "Late"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold"
                                  : "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-bold"
                              }
                            >
                              {h.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {(!studentDetail.history || studentDetail.history.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-muted-foreground">
                            No attendance history logs recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
