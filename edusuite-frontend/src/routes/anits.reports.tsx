import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRole } from "@/context/role-context";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  RotateCcw,
  Calendar,
  Building2,
  GraduationCap,
  Users,
  Layers,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileBarChart,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Database,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/anits/reports")({
  head: () => ({
    meta: [{ title: "ANITS Reports & Analytics Center — ANITS ERP" }],
  }),
  component: AnitsReportsPage,
});

interface ReportOverview {
  totalAttendanceRecords: number;
  totalScheduledSessions: number;
  totalStudents: number;
  totalFaculty: number;
  totalCourses: number;
  totalDepartments: number;
  departments: { id: string; code: string; name: string }[];
  academicYear: string;
  activeSemester: number;
  serverTimestamp: string;
}

interface ColumnDef {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  format?: "text" | "number" | "percentage" | "badge" | "date";
}

interface ReportResponse {
  title: string;
  description: string;
  columns: ColumnDef[];
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statistics: Record<string, any>;
  filters: Record<string, any>;
  generatedAt: string;
  generatedBy: string;
}

type ReportCategory =
  | "attendance"
  | "timetable"
  | "students"
  | "faculty"
  | "classes"
  | "departments"
  | "data-quality";

interface SubReportConfig {
  id: string;
  label: string;
  description: string;
}

const SUB_REPORTS: Record<ReportCategory, SubReportConfig[]> = {
  attendance: [
    { id: "summary", label: "Institutional Attendance Summary", description: "Aggregate student attendance across all scheduled sessions and cohorts" },
    { id: "department", label: "Department Attendance", description: "Department-wise student counts, sessions conducted, and attendance percentages" },
    { id: "conduction", label: "Attendance Conduction Audit", description: "Session conduction ratios determined by unique timetable session instances" },
    { id: "low-attendance", label: "Students Below 75% Cutoff", description: "Deficit audit identifying students falling below official condonation thresholds" },
    { id: "course", label: "Course-wise Attendance", description: "Subject and course-level attendance performance across all active curricula" },
  ],
  timetable: [
    { id: "master", label: "Master Timetable Matrix", description: "Comprehensive schedule matrix showing day, period, room, and section allocations" },
    { id: "faculty-workload", label: "Faculty Timetable Workload", description: "Weekly teaching period distribution across active faculty members" },
    { id: "room-utilization", label: "Room Utilization Audit", description: "Room occupancy metrics calculated against 42-slot weekly institutional capacity" },
    { id: "conflicts", label: "Timetable Conflict Audit", description: "Automated clash detector inspecting faculty and room double-booking rules" },
  ],
  students: [
    { id: "roster", label: "Institutional Student Roster", description: "Complete institutional student directory with cohort and status metadata" },
    { id: "cohort-distribution", label: "Student Cohort Distribution", description: "Class and section distribution mapped by department and semester" },
  ],
  faculty: [
    { id: "directory", label: "Faculty Directory", description: "Teaching staff registry with departmental allocations and status" },
    { id: "workload", label: "Faculty Workload Breakdown", description: "Distribution of theory lectures and laboratory sessions per faculty member" },
  ],
  classes: [
    { id: "summary", label: "Class & Cohort Summary", description: "Operational class units mapped by department, semester, section, and lead faculty" },
  ],
  departments: [
    { id: "summary", label: "Institutional Department Summary", description: "Comprehensive departmental overview of students, faculty, courses, and sessions" },
  ],
  "data-quality": [
    { id: "integrity", label: "Data Quality & Integrity Audit", description: "Rigorous operational audit verifying 8 relational database invariants" },
  ],
};

function AnitsReportsPage() {
  const { role, department: userDept } = useRole();
  const normRole = (role || "").toLowerCase();
  const isAdmin = ["super_admin", "superadmin", "admin", "principal", "academic_dean"].includes(normRole);
  const isHod = normRole === "hod";
  const isFaculty = normRole === "faculty" || normRole === "staff";
  const isStudent = normRole === "student";

  // Category and sub-report selection
  const [activeCategory, setActiveCategory] = useState<ReportCategory>("attendance");
  const [activeReportType, setActiveReportType] = useState<string>("summary");

  // Overview state
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState<boolean>(true);

  // Filters
  const [academicYear, setAcademicYear] = useState<string>("2026-27");
  const [selectedDept, setSelectedDept] = useState<string>(isHod ? (userDept || "") : "");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  useEffect(() => {
    if (isHod && userDept && selectedDept !== userDept) {
      setSelectedDept(userDept);
    }
  }, [isHod, userDept, selectedDept]);

  // Report Data state
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Export action state
  const [exporting, setExporting] = useState<string | null>(null);

  // Set default sub-report when category changes
  const handleCategoryChange = (cat: ReportCategory) => {
    setActiveCategory(cat);
    const subList = SUB_REPORTS[cat];
    if (subList && subList.length > 0) {
      setActiveReportType(subList[0].id);
    }
    setCurrentPage(1);
  };

  // Load Overview Data
  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await api.get("api/anits/reports/overview");
      if (res.data) {
        setOverview(res.data);
        const activeYear = res.data.activeAcademicYear || res.data.academicYear;
        if (activeYear && !academicYear) {
          setAcademicYear(activeYear);
        }
      }
    } catch (err: any) {
      console.error("Failed to load reports overview:", err);
    } finally {
      setOverviewLoading(false);
    }
  }, [academicYear]);

  // Load Report Data
  const loadReportData = useCallback(async () => {
    setDataLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      params.append("category", activeCategory);
      params.append("reportType", activeReportType);
      params.append("page", currentPage.toString());
      params.append("limit", pageSize.toString());

      const deptToUse = isHod ? (userDept || selectedDept) : selectedDept;
      if (academicYear) params.append("academicYear", academicYear);
      if (deptToUse && deptToUse !== "all") params.append("department", deptToUse);
      if (selectedSemester && selectedSemester !== "all") params.append("semester", selectedSemester);
      if (selectedSection && selectedSection !== "all") params.append("section", selectedSection);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const res = await api.get(`api/anits/reports/data?${params.toString()}`);
      if (res.data && res.data.columns) {
        setReportData({
          ...res.data,
          total: res.data.total ?? res.data.pagination?.totalRows ?? res.data.rows?.length ?? 0,
          totalPages: res.data.totalPages ?? res.data.pagination?.totalPages ?? 1,
        });
      } else {
        throw new Error(res.data?.error?.message || res.data?.error || "Invalid report response structure");
      }
    } catch (err: any) {
      console.error("Failed to generate report:", err);
      const serverMsg = err.response?.data?.error?.message || err.response?.data?.error || err.message;
      setErrorMsg(serverMsg || "Unable to generate report from PostgreSQL database.");
      setReportData(null);
    } finally {
      setDataLoading(false);
    }
  }, [
    activeCategory,
    activeReportType,
    currentPage,
    pageSize,
    academicYear,
    selectedDept,
    selectedSemester,
    selectedSection,
    dateFrom,
    dateTo,
    isHod,
    userDept,
  ]);

  // Initial Load
  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedDept(isHod ? (userDept || "") : "");
    setSelectedSemester("");
    setSelectedSection("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
    toast.info("Report filters reset to defaults.");
  };

  // Download Filtered CSV
  const handleExportCSV = async () => {
    setExporting("csv");
    const toastId = toast.loading("Generating filter-aware CSV export from PostgreSQL...");
    try {
      const params = new URLSearchParams();
      params.append("category", activeCategory);
      params.append("reportType", activeReportType);
      if (academicYear) params.append("academicYear", academicYear);
      const deptToUse = isHod ? (userDept || selectedDept) : selectedDept;
      if (deptToUse && deptToUse !== "all") params.append("department", deptToUse);
      if (selectedSemester && selectedSemester !== "all") params.append("semester", selectedSemester);
      if (selectedSection && selectedSection !== "all") params.append("section", selectedSection);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const token = localStorage.getItem("token") || localStorage.getItem("cms_token");
      const baseURL = (api.getBaseURL() || "http://localhost:5000/").replace(/\/$/, "");
      const res = await fetch(`${baseURL}/api/anits/reports/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("CSV Export generation failed");

      const blob = await res.blob();
      const filename = `ANITS_${activeCategory}_${activeReportType}_${new Date().toISOString().slice(0, 10)}.csv`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success(`${filename} successfully downloaded.`);
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "Failed to download CSV export.");
    } finally {
      setExporting(null);
    }
  };

  // One-click Department Summary Export
  const handleExportDeptSummary = async () => {
    setExporting("dept_summary");
    const toastId = toast.loading("Exporting complete Department Summary from PostgreSQL...");
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("cms_token");
      const baseURL = (api.getBaseURL() || "http://localhost:5000/").replace(/\/$/, "");
      const res = await fetch(`${baseURL}/api/anits/reports/department-summary/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Department summary export failed");

      const blob = await res.blob();
      const filename = `ANITS_Department_Summary_${new Date().toISOString().slice(0, 10)}.csv`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success("ANITS Department Summary successfully downloaded.");
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "Failed to export department summary.");
    } finally {
      setExporting(null);
    }
  };

  // Print View (window.print with clean layout)
  const handlePrint = () => {
    toast.info("Preparing print-ready institutional report...");
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedDept && selectedDept !== "all") count++;
    if (selectedSemester && selectedSemester !== "all") count++;
    if (selectedSection && selectedSection !== "all") count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [selectedDept, selectedSemester, selectedSection, dateFrom, dateTo]);

  // Non-SuperAdmin Fallback (for student/faculty who visit /anits/reports)
  if (!isAdmin && !isHod) {
    return (
      <div className="space-y-6">
        <div className="bg-card p-5 rounded-xl border border-border/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Attendance &amp; Timetable Reports</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Role-governed reports generated directly from ANITS PostgreSQL databases.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isStudent && (
            <Card className="rounded-xl border-border/60 shadow-xs">
              <CardHeader className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Personal Attendance Ledger</CardTitle>
                    <CardDescription className="text-xs">Complete session history for enrolled semester</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Exports your individual session dates, subject codes, faculty names, periods, room numbers, and verified status.
                </p>
                <Button
                  onClick={async () => {
                    const token = localStorage.getItem("token") || localStorage.getItem("cms_token");
                    const res = await fetch("http://localhost:5000/api/attendance/export", {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "ANITS_My_Attendance_Ledger.csv";
                    a.click();
                  }}
                  className="w-full rounded-lg text-xs font-semibold gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="size-4" /> Download CSV Ledger
                </Button>
              </CardContent>
            </Card>
          )}

          {isFaculty && (
            <Card className="rounded-xl border-border/60 shadow-xs">
              <CardHeader className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Teaching Session Register</CardTitle>
                    <CardDescription className="text-xs">Historical sessions conducted by you</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Exports all timetable sessions marked by your faculty account with section details and student attendance totals.
                </p>
                <Button
                  onClick={async () => {
                    const token = localStorage.getItem("token") || localStorage.getItem("cms_token");
                    const res = await fetch("http://localhost:5000/api/attendance/faculty/export", {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "ANITS_Faculty_Attendance_Register.csv";
                    a.click();
                  }}
                  className="w-full rounded-lg text-xs font-semibold gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="size-4" /> Download Teaching Register
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Cell Renderer Utility
  const renderCellValue = (row: any, col: ColumnDef) => {
    const val = row[col.key];
    if (val === null || val === undefined || val === "") return <span className="text-muted-foreground/60">—</span>;

    if (col.format === "percentage") {
      const numVal = Number(val);
      const isDeficit = numVal < 75;
      return (
        <span
          className={`font-semibold text-xs px-2 py-0.5 rounded-md ${
            isDeficit
              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-bold"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
          }`}
        >
          {numVal.toFixed(1)}%
        </span>
      );
    }

    if (col.format === "badge") {
      let badgeStyle = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200";
      const s = String(val).toLowerCase();
      if (s === "optimal" || s === "eligible" || s === "active" || s === "verified" || s === "present") {
        badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300";
      } else if (s === "moderate" || s === "warning" || s === "late") {
        badgeStyle = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300";
      } else if (s === "action required" || s === "condonation required" || s === "inactive" || s === "absent" || s.includes("conflict")) {
        badgeStyle = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300";
      } else if (s === "cse" || s === "ece" || s === "eee" || s === "mech" || s === "civil" || s === "it") {
        badgeStyle = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300";
      }

      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${badgeStyle}`}>
          {String(val)}
        </span>
      );
    }

    if (col.format === "number") {
      return <span className="font-mono text-xs">{typeof val === "number" ? val.toLocaleString() : val}</span>;
    }

    return <span className="text-xs text-foreground/90">{String(val)}</span>;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* 1. INSTITUTIONAL HEADER & GLOBAL ACTIONS */}
      {/* ========================================================================= */}
      <div className="bg-card p-5 rounded-xl border border-border/60 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground tracking-tight">ANITS Reports &amp; Analytics Center</h2>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 text-[11px] font-semibold">
              PostgreSQL Verified
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Authoritative compliance, attendance, and timetable analytics generated live from the central PostgreSQL database.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadOverview();
              loadReportData();
              toast.success("Synchronized reports with latest PostgreSQL records.");
            }}
            disabled={overviewLoading || dataLoading}
            className="h-9 text-xs font-semibold gap-1.5 border-border/80 hover:bg-muted/60"
          >
            <RefreshCw className={`size-3.5 ${overviewLoading || dataLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {!isHod && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportDeptSummary}
              disabled={exporting === "dept_summary"}
              className="h-9 text-xs font-semibold gap-1.5 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/40"
            >
              <Building2 className="size-3.5" />
              Export Department Summary
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 text-xs font-semibold gap-1.5 border-border/80 hover:bg-muted/60"
          >
            <Printer className="size-3.5" />
            Print / PDF
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            disabled={exporting === "csv" || !reportData?.rows?.length}
            className="h-9 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Download className="size-3.5" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REPORT DASHBOARD OVERVIEW CARDS (4 Real PostgreSQL Metrics) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Attendance Records */}
        <Card className="rounded-xl border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Attendance Records</p>
              <p className="text-2xl font-black text-foreground tracking-tight">
                {overviewLoading ? "..." : overview?.totalAttendanceRecords?.toLocaleString() ?? "0"}
              </p>
              <p className="text-[11px] text-muted-foreground">Logged session marks in ledger</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileSpreadsheet className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Scheduled Sessions */}
        <Card className="rounded-xl border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scheduled Sessions</p>
              <p className="text-2xl font-black text-foreground tracking-tight">
                {overviewLoading ? "..." : (overview?.totalScheduledSessions ?? (overview as any)?.scheduledSessions)?.toLocaleString() ?? "0"}
              </p>
              <p className="text-[11px] text-muted-foreground">Master Timetable slots</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Calendar className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Active Students */}
        <Card className="rounded-xl border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Students</p>
              <p className="text-2xl font-black text-foreground tracking-tight">
                {overviewLoading ? "..." : overview?.totalStudents?.toLocaleString() ?? "0"}
              </p>
              <p className="text-[11px] text-muted-foreground">Enrolled cohort headcount</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <GraduationCap className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Active Faculty */}
        <Card className="rounded-xl border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Faculty</p>
              <p className="text-2xl font-black text-foreground tracking-tight">
                {overviewLoading ? "..." : overview?.totalFaculty?.toLocaleString() ?? "0"}
              </p>
              <p className="text-[11px] text-muted-foreground">Teaching &amp; academic staff</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. REPORT CATEGORY NAVIGATION (7 Categories) */}
      {/* ========================================================================= */}
      <div className="bg-card p-1.5 rounded-xl border border-border/60 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
          {[
            { id: "attendance", label: "Attendance", icon: CheckCircle2 },
            { id: "timetable", label: "Timetable", icon: Calendar },
            { id: "students", label: "Students", icon: GraduationCap },
            { id: "faculty", label: "Faculty", icon: Users },
            { id: "classes", label: "Classes", icon: Layers },
            ...(!isHod ? [
              { id: "departments", label: "Departments", icon: Building2 },
              { id: "data-quality", label: "Data Quality", icon: ShieldCheck },
            ] : []),
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id as ReportCategory)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="size-3.5 shrink-0" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SUB-REPORT SELECTOR CHIPS */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2">
        {SUB_REPORTS[activeCategory].map((sub) => {
          const isSubActive = activeReportType === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => {
                setActiveReportType(sub.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                isSubActive
                  ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700 font-semibold"
                  : "bg-background text-muted-foreground border-border/70 hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              {sub.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 5. GLOBAL REPORT FILTERS PANEL */}
      {/* ========================================================================= */}
      <Card className="rounded-xl border-border/60 shadow-xs">
        <CardHeader className="p-4 pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                Global Report Filters
              </CardTitle>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  {activeFiltersCount} Active
                </Badge>
              )}
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-medium text-muted-foreground hover:text-rose-600 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="size-3" /> Reset Filters
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Academic Year */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Academic Year</label>
              <select
                value={academicYear}
                onChange={(e) => {
                  setAcademicYear(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-8 text-xs rounded-md border border-border/80 bg-background px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="2026-27">2026-27 (Current Active)</option>
                <option value="2025-26">2025-26</option>
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Department</label>
              {isHod ? (
                <div className="w-full h-8 text-xs rounded-md border border-primary/40 bg-primary/10 px-2.5 flex items-center font-bold text-primary">
                  {userDept || "Department"} (Scoped)
                </div>
              ) : (
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-8 text-xs rounded-md border border-border/80 bg-background px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Departments</option>
                  {overview?.departments?.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Semester */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-8 text-xs rounded-md border border-border/80 bg-background px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s.toString()}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => {
                  setSelectedSection(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-8 text-xs rounded-md border border-border/80 bg-background px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Sections</option>
                <option value="Section A">Section A</option>
                <option value="Section B">Section B</option>
                <option value="Section C">Section C</option>
                <option value="Section D">Section D</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 text-xs px-2"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 text-xs px-2"
              />
            </div>
          </div>

          {/* Applied Filters Metadata Bar (Requirement 50) */}
          <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground/80">Applied Filters:</span>
            <Badge variant="outline" className="text-[10px] h-5 font-normal bg-muted/30">
              Year: {academicYear || "All"}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5 font-normal bg-muted/30">
              Department: {selectedDept || "All Departments"}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5 font-normal bg-muted/30">
              Semester: {selectedSemester ? `Sem ${selectedSemester}` : "All Semesters"}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5 font-normal bg-muted/30">
              Section: {selectedSection || "All Sections"}
            </Badge>
            {(dateFrom || dateTo) && (
              <Badge variant="outline" className="text-[10px] h-5 font-normal bg-muted/30">
                Date: {dateFrom || "Start"} → {dateTo || "End"}
              </Badge>
            )}
            {reportData?.generatedAt && (
              <span className="ml-auto text-[10px] text-muted-foreground/70">
                Generated: {new Date(reportData.generatedAt).toLocaleString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 6. SELECTED REPORT HEADER & DYNAMIC STATISTICS */}
      {/* ========================================================================= */}
      <div className="bg-card p-4 rounded-xl border border-border/60 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-foreground">{reportData?.title || "Report Preview"}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {reportData?.description || "Authoritative report preview backed by live PostgreSQL relations."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] font-semibold bg-muted/30">
              {dataLoading
                ? "Generating..."
                : errorMsg
                ? "Error"
                : reportData?.total !== undefined
                ? `${reportData.total.toLocaleString()} Total Records`
                : "—"}
            </Badge>
          </div>
        </div>

        {/* Dynamic Statistics Metric Badges */}
        {reportData?.statistics && Object.keys(reportData.statistics).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
            {Object.entries(reportData.statistics).map(([k, v]) => {
              const formattedKey = k.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
              return (
                <div
                  key={k}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/60 text-xs"
                >
                  <span className="text-muted-foreground text-[11px]">{formattedKey}:</span>
                  <span className="font-bold text-foreground">
                    {typeof v === "number" && k.toLowerCase().includes("rate")
                      ? `${v.toFixed(1)}%`
                      : typeof v === "number"
                      ? v.toLocaleString()
                      : String(v)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 7. INTERACTIVE REPORT PREVIEW TABLE */}
      {/* ========================================================================= */}
      <Card className="rounded-xl border-border/60 shadow-xs overflow-hidden">
        {dataLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="size-6 text-blue-600 animate-spin" />
            <p className="text-xs font-semibold text-foreground">Generating report...</p>
            <p className="text-[11px] text-muted-foreground">Aggregating database relations and applying filter constraints</p>
          </div>
        ) : errorMsg ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle className="size-7 text-rose-600" />
            <p className="text-sm font-bold text-foreground">Unable to generate report.</p>
            <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md">{errorMsg}</p>
            <Button size="sm" variant="outline" onClick={loadReportData} className="text-xs gap-1.5 mt-2">
              <RefreshCw className="size-3" /> Retry Generation
            </Button>
          </div>
        ) : !reportData?.rows || reportData.rows.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-center">
            <Database className="size-7 text-muted-foreground/40" />
            <p className="text-xs font-semibold text-foreground">No records found for the selected filters.</p>
            <p className="text-[11px] text-muted-foreground max-w-sm">
              Try adjusting your Department, Semester, Section, or Date Range filter parameters to view records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/60 text-[11px] font-semibold text-muted-foreground">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  {reportData.columns.map((col) => (
                    <th
                      key={col.key}
                      className={`py-3 px-4 ${
                        col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left"
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {reportData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-muted-foreground text-[11px]">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    {reportData.columns.map((col) => (
                      <td
                        key={col.key}
                        className={`py-3 px-4 ${
                          col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left"
                        }`}
                      >
                        {renderCellValue(row, col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar (Requirement 36) */}
        {reportData && reportData.totalPages > 1 && (
          <div className="p-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                Showing Page <strong className="text-foreground">{currentPage}</strong> of{" "}
                <strong className="text-foreground">{reportData.totalPages}</strong> (
                {reportData.total.toLocaleString()} records)
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 text-xs rounded border border-border/70 bg-background px-1.5 focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || dataLoading}
                className="h-8 px-2.5 text-xs gap-1"
              >
                <ChevronLeft className="size-3.5" /> Prev
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(reportData.totalPages, p + 1))}
                disabled={currentPage >= reportData.totalPages || dataLoading}
                className="h-8 px-2.5 text-xs gap-1"
              >
                Next <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* 8. PRINT-ONLY INSTITUTIONAL HEADER & AUDIT METADATA (@media print) */}
      {/* ========================================================================= */}
      <div className="hidden print:block fixed inset-0 bg-white p-8 z-50 text-black">
        <div className="border-b-2 border-black pb-4 mb-4 text-center">
          <h1 className="text-xl font-bold uppercase tracking-wider">
            ANIL NEERUKONDA INSTITUTE OF TECHNOLOGY AND SCIENCES
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            (Autonomous - Affiliated to Andhra University, Approved by AICTE, Accredited by NBA &amp; NAAC &apos;A&apos; Grade)
          </p>
          <h2 className="text-base font-bold mt-2 uppercase">{reportData?.title || "Academic Report"}</h2>
          <div className="text-xs text-gray-500 mt-1 flex justify-between">
            <span>Academic Year: {academicYear}</span>
            <span>Generated: {new Date().toLocaleString()}</span>
            <span>Generated By: ANITS Super Admin</span>
          </div>
        </div>

        <table className="w-full text-xs border border-gray-400 border-collapse mt-4">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-400">
              <th className="p-2 border-r border-gray-400 text-center">#</th>
              {reportData?.columns.map((col) => (
                <th key={col.key} className="p-2 border-r border-gray-400 text-left">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportData?.rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-300">
                <td className="p-2 border-r border-gray-300 text-center">{i + 1}</td>
                {reportData?.columns.map((col) => (
                  <td key={col.key} className="p-2 border-r border-gray-300">
                    {String(row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
