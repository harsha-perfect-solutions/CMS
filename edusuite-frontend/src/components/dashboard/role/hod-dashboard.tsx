import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  GraduationCap,
  UserCog,
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  CalendarCheck,
  BookOpen,
  Clock,
  FileSpreadsheet,
  TrendingUp,
  Plus,
  FileText,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import api from "@/lib/api";
import { HodIdentityScopeCard } from "../hod-identity-scope-card";
import { TrendLineChart, GroupedBarChart } from "@/components/dashboard/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRole } from "@/context/role-context";

interface HodDashboardStatsResponse {
  department: string;
  departmentName?: string;
  stats: {
    todaysClasses: number;
    totalStudents: number;
    totalFaculty: number;
    totalCourses: number;
    pendingApprovals: number;
    pendingAssignments: number;
    attendancePendingText: string;
    upcomingExams: number;
    researchPublications: number;
    averageCgpa: number;
    averageAttendance: number;
    atRiskStudentsCount: number;
  };
  timetable: Array<{
    id?: string;
    time: string;
    subject: string;
    section: string;
    room: string;
    status: "Completed" | "Ongoing" | "Upcoming";
    facultyName?: string;
  }>;
  attendance: {
    present: number;
    absent: number;
    pending: number;
    percentage: number;
  };
  performance: {
    averageAttendance: number;
    averageMarks: number;
    assignmentsSubmitted: number;
    studentsAtRisk: number;
    chartData: Array<{
      name: string;
      attendance: number;
      marks: number;
      submissions: number;
    }>;
  };
  topSubjects?: Array<{ subject: string; score: number }>;
  studentsList?: Array<{
    id: string;
    rollNumber: string;
    name: string;
    dept: string;
    year: string;
    attendance: string;
    cgpa: string;
    status: string;
  }>;
  facultyMembers?: any[];
  recentAuditLogs?: any[];
}

const DEPARTMENT_NAMES: Record<string, string> = {
  CSE: "Computer Science & Engineering",
  ECE: "Electronics & Communication Engineering",
  EEE: "Electrical & Electronics Engineering",
  ME: "Mechanical Engineering",
  MECHANICAL: "Mechanical Engineering",
  CIVIL: "Civil Engineering",
  CE: "Civil Engineering",
  IT: "Information Technology",
  "AI&DS": "Artificial Intelligence & Data Science",
  AIDS: "Artificial Intelligence & Data Science",
  "AI&ML": "Artificial Intelligence & Machine Learning",
  AIML: "Artificial Intelligence & Machine Learning",
  MBA: "Master of Business Administration",
};

export function HodDashboard() {
  const { profile } = useRole();
  const navigate = useNavigate();
  const userDeptCode = (profile.department || "CSE").toUpperCase();
  const fallbackDeptName = DEPARTMENT_NAMES[userDeptCode] || `${userDeptCode} Department`;

  // Real-time database state
  const [hodLiveStats, setHodLiveStats] = useState<HodDashboardStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search & Filter state for department students table
  const [studentSearch, setStudentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  const fetchRealTimeHodStats = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setFetchError(null);

    try {
      const res = await api.get("/api/hod/dashboard-stats");
      if (res.status === 200 && res.data && res.data.stats) {
        setHodLiveStats(res.data);
        if (isManualRefresh) {
          toast.success("HOD Dashboard data refreshed from PostgreSQL database.");
        }
      } else {
        setFetchError("Unable to load department dashboard data.");
      }
    } catch (err: any) {
      console.error("Error fetching real-time HOD stats from database:", err);
      const errMsg = err.response?.data?.error || "Unable to load department dashboard data.";
      setFetchError(errMsg);
      toast.error("Dashboard Load Error", { description: errMsg });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRealTimeHodStats();
  }, [profile.department, profile.role]);

  const currentDeptCode = hodLiveStats?.department || userDeptCode;
  const resolvedDeptName = hodLiveStats?.departmentName || fallbackDeptName;

  // Filter students list dynamically based on search and status filter
  const filteredStudentsList = useMemo(() => {
    const rawList = hodLiveStats?.studentsList || [];
    return rawList.filter((student) => {
      const matchesSearch =
        !studentSearch ||
        student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.rollNumber.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.dept.toLowerCase().includes(studentSearch.toLowerCase());

      const matchesStatus =
        statusFilter === "All Statuses" ||
        (statusFilter === "Active" && student.status === "Active") ||
        (statusFilter === "At Risk" && student.status === "At Risk");

      return matchesSearch && matchesStatus;
    });
  }, [hodLiveStats?.studentsList, studentSearch, statusFilter]);

  const realTimetable = hodLiveStats?.timetable || [];
  const topSubjectsList = hodLiveStats?.topSubjects || [];

  const handleQuickAction = (label: string) => {
    switch (label) {
      case "Take Attendance":
        navigate({ to: "/hod/attendance" as any });
        break;
      case "Upload Materials":
        navigate({ to: "/faculty/materials" as any });
        break;
      case "Create Assignment":
        navigate({ to: "/faculty/assignments" as any });
        break;
      case "Enter Marks":
        navigate({ to: "/faculty/evaluation-and-marks" as any });
        break;
      case "View Timetable":
        navigate({ to: "/faculty/timetable" as any });
        break;
      case "Exam Notifications":
        navigate({ to: "/hod/exam-notifications" as any });
        break;
      case "Department Faculty":
        navigate({ to: "/hod/faculty" as any });
        break;
      default:
        toast.info(`Navigating to ${label}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HOD IDENTITY & AUTHENTICATED SCOPE BANNER */}
      <HodIdentityScopeCard
        onRefresh={() => fetchRealTimeHodStats(true)}
        isRefreshing={isRefreshing}
        dbConnected={!fetchError}
        departmentCode={currentDeptCode}
        departmentName={resolvedDeptName}
      />

      {/* ERROR BANNER IF DATABASE FETCH FAILED */}
      {fetchError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-600 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="size-5 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={() => fetchRealTimeHodStats(true)}
            className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. DEPARTMENT OVERVIEW KPI CARDS (REAL POSTGRESQL DATA) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-2">
            <span>{currentDeptCode} Department Overview</span>
          </h3>
          <span className="text-xs text-muted-foreground font-mono">
            {isLoading ? "Querying PostgreSQL..." : "100% Real PostgreSQL Data"}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Students"
            value={isLoading ? "..." : String(hodLiveStats?.stats?.totalStudents ?? 0)}
            icon={Users}
            tone="default"
            className="hover:-translate-y-1 transition-all duration-300"
          />
          <KpiCard
            label="Faculty"
            value={isLoading ? "..." : String(hodLiveStats?.stats?.totalFaculty ?? 0)}
            icon={UserCog}
            tone="info"
            className="hover:-translate-y-1 transition-all duration-300"
          />
          <KpiCard
            label={`Attendance (${currentDeptCode})`}
            value={isLoading ? "..." : `${hodLiveStats?.stats?.averageAttendance ?? 0}%`}
            icon={GraduationCap}
            tone="success"
            className="hover:-translate-y-1 transition-all duration-300"
          />
          <KpiCard
            label="Pending Approvals"
            value={isLoading ? "..." : String(hodLiveStats?.stats?.pendingApprovals ?? 0)}
            icon={CheckCircle2}
            tone="warning"
            className="hover:-translate-y-1 transition-all duration-300"
          />
        </div>
      </div>

      {/* 3. DEPARTMENT PERFORMANCE TREND & TOP SUBJECTS */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          title={`${currentDeptCode} Department Performance`}
          description="Attendance, marks and assignment submission trends"
          className="lg:col-span-2"
        >
          {hodLiveStats?.performance?.chartData && hodLiveStats.performance.chartData.length > 0 ? (
            <GroupedBarChart
              data={hodLiveStats.performance.chartData}
              xKey="name"
              series={[
                { key: "attendance", label: "Attendance (%)" },
                { key: "marks", label: "Avg Marks (%)" },
                { key: "submissions", label: "Submissions (%)" },
              ]}
              height={260}
            />
          ) : (
            <div className="h-[220px] grid place-items-center text-xs text-muted-foreground italic">
              {isLoading ? "Loading department performance chart from database..." : "No performance records available for chart."}
            </div>
          )}
        </Panel>

        <Panel title="Top Subjects Performance" description={`Average scores in ${currentDeptCode}`}>
          {topSubjectsList.length > 0 ? (
            <ul className="space-y-4 pt-1">
              {topSubjectsList.map((subject) => (
                <li key={subject.subject}>
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                    <span className="truncate">{subject.subject}</span>
                    <span className="shrink-0 font-mono text-primary font-bold">{subject.score}%</span>
                  </div>
                  <Progress value={subject.score} className="mt-1.5 h-2 bg-muted/60" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="h-[200px] grid place-items-center text-xs text-muted-foreground italic text-center p-4">
              {isLoading ? "Loading subject performance data..." : "No subject performance data available for this department."}
            </div>
          )}
        </Panel>
      </div>

      {/* 4. TODAY'S DEPARTMENT TIMETABLE */}
      <Panel
        title="Today's Department Timetable"
        description={`Scheduled periods for ${resolvedDeptName}`}
        action={
          <button
            onClick={() => navigate({ to: "/faculty/timetable" as any })}
            className="text-xs text-primary hover:underline font-semibold"
          >
            Full Schedule &rarr;
          </button>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Time</TableHead>
                <TableHead>Subject & Faculty</TableHead>
                <TableHead className="w-[120px]">Section</TableHead>
                <TableHead className="w-[120px]">Room</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                    Loading today's department timetable from PostgreSQL database...
                  </TableCell>
                </TableRow>
              ) : realTimetable.length > 0 ? (
                realTimetable.map((slot, index) => (
                  <TableRow key={slot.id || index} className="hover:bg-muted/40 text-xs">
                    <TableCell className="font-mono font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Clock className="size-3.5 shrink-0 text-primary" /> {slot.time}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {slot.subject}
                      {slot.facultyName && (
                        <span className="block text-[0.68rem] text-muted-foreground font-normal">
                          Faculty: {slot.facultyName}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{slot.section}</TableCell>
                    <TableCell className="font-mono">{slot.room}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          slot.status === "Completed"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold"
                            : slot.status === "Ongoing"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold"
                        }
                      >
                        {slot.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                    No classes scheduled for today in this department.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Panel>

      {/* 5. DEPARTMENT STUDENTS TABLE (REAL POSTGRESQL DATA) */}
      <Panel
        title={`Department Students (${currentDeptCode})`}
        description={`Real-time student list for ${resolvedDeptName}`}
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students by name, roll number, or dept..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Statuses" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="Active" className="text-xs">Active</SelectItem>
                <SelectItem value="At Risk" className="text-xs">At Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Roll No</TableHead>
                  <TableHead className="text-xs">Student Name</TableHead>
                  <TableHead className="text-xs">Department</TableHead>
                  <TableHead className="text-xs">Year / Semester</TableHead>
                  <TableHead className="text-xs">Attendance</TableHead>
                  <TableHead className="text-xs">CGPA</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                      Loading department students from PostgreSQL...
                    </TableCell>
                  </TableRow>
                ) : filteredStudentsList.length > 0 ? (
                  filteredStudentsList.map((student) => (
                    <TableRow key={student.id || student.rollNumber} className="hover:bg-muted/40 text-xs">
                      <TableCell className="font-mono font-bold text-primary">{student.rollNumber}</TableCell>
                      <TableCell className="font-semibold">{student.name}</TableCell>
                      <TableCell>{student.dept}</TableCell>
                      <TableCell>{student.year}</TableCell>
                      <TableCell className="font-mono">{student.attendance}</TableCell>
                      <TableCell className="font-mono font-semibold">{student.cgpa}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            student.status === "At Risk"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold"
                          }
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                      No students found matching current department filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Panel>

      {/* 6. QUICK ACTION COCKPIT & AUDIT LOGS */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Action Cockpit */}
        <Panel title="Quick Action Cockpit" description="Operational department shortcuts">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Exam Notifications", icon: Bell, color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/15 border-purple-500/20" },
              { label: "Department Faculty", icon: UserCog, color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/15 border-blue-500/20" },
              { label: "Take Attendance", icon: CalendarCheck, color: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-emerald-500/20" },
              { label: "Upload Materials", icon: FileText, color: "bg-violet-500/10 text-violet-600 hover:bg-violet-500/15 border-violet-500/20" },
              { label: "Enter Marks", icon: FileSpreadsheet, color: "bg-teal-500/10 text-teal-600 hover:bg-teal-500/15 border-teal-500/20" },
              { label: "View Timetable", icon: Clock, color: "bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/15 border-indigo-500/20" },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={() => handleQuickAction(btn.label)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-300 cursor-pointer ${btn.color}`}
              >
                <btn.icon className="size-5 mb-1.5 shrink-0" />
                <span className="text-[0.7rem] font-bold leading-tight">{btn.label}</span>
              </button>
            ))}
          </div>
        </Panel>

        {/* Department Faculty Summary */}
        <Panel title="Department Faculty Roster" description={`${hodLiveStats?.stats?.totalFaculty ?? 0} active department staff`}>
          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
            {hodLiveStats?.facultyMembers && hodLiveStats.facultyMembers.length > 0 ? (
              hodLiveStats.facultyMembers.map((fac: any) => (
                <div
                  key={fac.id}
                  className="flex items-center justify-between p-3 rounded-xl border bg-card text-xs hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 font-bold grid place-items-center">
                      {fac.name ? fac.name.slice(0, 2).toUpperCase() : "FC"}
                    </div>
                    <div>
                      <p className="font-bold leading-snug">{fac.name}</p>
                      <p className="text-[0.65rem] text-muted-foreground">{fac.rollNumber} &middot; {fac.department || currentDeptCode}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[0.65rem] border-emerald-500/30 text-emerald-600 font-bold">
                    {fac.status || "Active"}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-4 italic text-center">No faculty members found in department.</p>
            )}
          </div>
        </Panel>

        {/* Recent Audit Logs */}
        <Panel
          title="Department Audit Log"
          description={`Recent audit activity for ${currentDeptCode}`}
          action={<Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">Audit Trail</Badge>}
        >
          <div className="relative border-l-2 border-indigo-600/25 pl-4 ml-2 space-y-4 py-1.5">
            {hodLiveStats?.recentAuditLogs && hodLiveStats.recentAuditLogs.length > 0 ? (
              hodLiveStats.recentAuditLogs.map((log: any) => (
                <div key={log.id} className="relative group">
                  <div className="absolute -left-[21px] top-1 size-2 rounded-full border-2 border-white bg-indigo-600 group-hover:scale-125 transition-transform duration-300" />
                  <div>
                    <h5 className="text-xs font-bold leading-snug">{log.action || "Department Update"}</h5>
                    <p className="text-[0.65rem] text-muted-foreground mt-0.5">
                      By {log.actorName || "HOD"} &middot; {new Date(log.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-4 italic text-center">No recent audit activity recorded.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
