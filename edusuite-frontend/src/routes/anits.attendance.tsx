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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive space-y-1">
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
  // RENDER 3: HOD & ADMIN ATTENDANCE CONTROLS
  // =========================================================================
  return (
    <div className="space-y-6">
      <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {isHod ? `${department || "Department"} Attendance Governance` : "ANITS Institutional Attendance Controls"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time shortage tracking, condonation approvals, and faculty submission status.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border/60 p-4">
          <span className="text-xs font-bold text-muted-foreground">Shortage Students (&lt;75%)</span>
          <div className="text-2xl font-black text-destructive mt-2">14</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Eligible for condonation</p>
        </Card>
        <Card className="rounded-2xl border-border/60 p-4">
          <span className="text-xs font-bold text-muted-foreground">Department Average</span>
          <div className="text-2xl font-black text-foreground mt-2">84.8%</div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Above institutional target</p>
        </Card>
        <Card className="rounded-2xl border-border/60 p-4">
          <span className="text-xs font-bold text-muted-foreground">Faculty Submissions Today</span>
          <div className="text-2xl font-black text-foreground mt-2">{facultyStats.conducted} / {facultyStats.conducted + facultyStats.pending}</div>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">{facultyStats.pending} slots pending</p>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/60 overflow-hidden">
        <CardHeader className="bg-muted/15 border-b border-border/40 py-4 px-6">
          <CardTitle className="text-sm font-bold">Today's Department Sessions</CardTitle>
          <CardDescription className="text-xs">Live attendance verification across scheduled periods</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <TodayClasses
            classes={facultyClasses}
            onTakeAttendance={loadRosterForSlot}
            onViewRegister={loadRosterForSlot}
          />
        </CardContent>
      </Card>
    </div>
  );
}
