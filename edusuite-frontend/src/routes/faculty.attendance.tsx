import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRole } from "@/context/role-context";
import api from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { AttendanceHeader } from "@/components/dashboard/attendance/attendance-header";
import { SearchFilterBar } from "@/components/dashboard/attendance/search-filter-bar";
import { StatisticsCards } from "@/components/dashboard/attendance/statistics-cards";
import { TodayClasses, type TodayClassItem } from "@/components/dashboard/attendance/today-classes";
import { AttendanceForm, type AttendanceStudentItem } from "@/components/dashboard/attendance/attendance-form";
import { AttendanceRegister, type RegisterStudentItem } from "@/components/dashboard/attendance/attendance-register";
import { AttendanceHistory, type AttendanceHistorySessionItem } from "@/components/dashboard/attendance/attendance-history";
import { AttendanceAnalytics } from "@/components/dashboard/attendance/attendance-analytics";
import { SkeletonLoader } from "@/components/dashboard/attendance/skeleton-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/faculty/attendance")({
  head: () => ({
    meta: [{ title: "Attendance Management — EduSuite Pro" }],
  }),
  validateSearch: (search: Record<string, unknown>) => {
    return {
      timetableId: (search.timetableId as string) || undefined,
      semester: search.semester ? Number(search.semester) : undefined,
      section: (search.section as string) || undefined,
      period: search.period ? Number(search.period) : undefined,
    };
  },
  component: FacultyAttendancePage,
});

function FacultyAttendancePage() {
  const searchParams = Route.useSearch();
  const { profile } = useRole();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");

  // Real data state from PostgreSQL
  const [todayClasses, setTodayClasses] = useState<TodayClassItem[]>([]);
  const [stats, setStats] = useState({
    conducted: 0,
    pending: 0,
    presentToday: 0,
    absentToday: 0,
    average: 0,
    leavesPending: 0,
  });
  const [academicYear, setAcademicYear] = useState("2024-25");
  const [semester, setSemester] = useState("Sem 1 / Sem 5");
  const [targetDate, setTargetDate] = useState("");

  // Attendance Form state
  const [activeFormSlot, setActiveFormSlot] = useState<TodayClassItem | null>(null);
  const [rosterStudents, setRosterStudents] = useState<AttendanceStudentItem[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register, History & Analytics data
  const [registerStudents, setRegisterStudents] = useState<RegisterStudentItem[]>([]);
  const [historySessions, setHistorySessions] = useState<AttendanceHistorySessionItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<{
    distributionData: { name: string; value: number }[];
    trendData: { day: string; attendance: number }[];
    subjectWise?: { code: string; name: string; total: number; attended: number; percentage: number }[];
    lowAttendanceStudents?: {
      studentId: string;
      name: string;
      rollNumber: string;
      section: string;
      subject: string;
      attendancePct: number;
      threshold: number;
      status: string;
    }[];
    repeatedAbsences?: {
      studentId: string;
      name: string;
      rollNumber: string;
      section: string;
      subject: string;
      consecutiveAbsences: number;
      attendancePct: number;
    }[];
    hasData: boolean;
    totalRecords: number;
  }>({
    distributionData: [],
    trendData: [],
    subjectWise: [],
    lowAttendanceStudents: [],
    repeatedAbsences: [],
    hasData: true,
    totalRecords: 0,
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [selectedSection, setSelectedSection] = useState("ALL");

  // Fetch today's schedule and attendance stats from PostgreSQL
  const fetchTodayData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await api.get("/api/attendance/faculty/today");

      if (res.data && res.status === 200) {
        setTodayClasses(res.data.classes || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
        if (res.data.academicYear) setAcademicYear(res.data.academicYear);
        if (res.data.semester) setSemester(res.data.semester);
        if (res.data.targetDate) setTargetDate(res.data.targetDate);
      } else {
        toast.error("Failed to load today's schedule", {
          description: res.data?.error || "Could not retrieve timetable sessions.",
        });
      }
    } catch (err: any) {
      toast.error("Network error while loading schedule");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch register data
  const fetchRegisterData = useCallback(async () => {
    try {
      const res = await api.get("/api/attendance/faculty/register");
      if (res.data && Array.isArray(res.data)) {
        setRegisterStudents(res.data);
      }
    } catch (err) {
      console.error("Failed to load attendance register", err);
    }
  }, []);

  // Fetch session submission history
  const fetchHistoryData = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get("/api/attendance/faculty/history");
      if (res.data && Array.isArray(res.data)) {
        setHistorySessions(res.data);
      }
    } catch (err) {
      console.error("Failed to load attendance history", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoadingAnalytics(true);
      const res = await api.get("/api/attendance/faculty/analytics");
      if (res.data && res.status === 200) {
        setAnalyticsData({
          distributionData: res.data.distributionData || [],
          trendData: res.data.trendData || [],
          subjectWise: res.data.subjectWise || [],
          lowAttendanceStudents: res.data.lowAttendanceStudents || [],
          repeatedAbsences: res.data.repeatedAbsences || [],
          hasData: res.data.hasData !== false,
          totalRecords: res.data.totalRecords || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load attendance analytics", err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayData();
    fetchRegisterData();
    fetchHistoryData();
    fetchAnalyticsData();
  }, [fetchTodayData, fetchRegisterData, fetchHistoryData, fetchAnalyticsData]);

  const handleRefresh = async () => {
    setLoading(true);
    toast.info("Refreshing attendance data from PostgreSQL...");
    await Promise.all([fetchTodayData(true), fetchRegisterData(), fetchHistoryData(), fetchAnalyticsData()]);
    setLoading(false);
    toast.success("Attendance records synchronized.");
  };

  // Open Attendance Taking Interface with real enrolled student roster
  const handleTakeAttendance = async (slot: TodayClassItem) => {
    try {
      setLoadingRoster(true);
      const timetableId = slot.timetableId || slot.id;
      const res = await api.get(`/api/attendance/faculty/session/${timetableId}/roster`);

      if (res.status === 403) {
        toast.error("Access Forbidden", {
          description: "You are not authorized to mark attendance for this session.",
        });
        return;
      }

      if (res.data && res.data.students) {
        setRosterStudents(res.data.students);
        setActiveFormSlot({
          ...slot,
          room: res.data.session?.room || slot.room,
        });
      } else {
        toast.error("Could not load class roster", {
          description: res.data?.error || "No students found for this session.",
        });
      }
    } catch (err: any) {
      toast.error("Failed to load class roster");
    } finally {
      setLoadingRoster(false);
    }
  };

  // Auto-open session roster if timetableId is passed via navigation from Timetable
  useEffect(() => {
    if (searchParams.timetableId && !activeFormSlot && !loading) {
      const match = todayClasses.find((c) => (c.timetableId || c.id) === searchParams.timetableId);
      if (match) {
        handleTakeAttendance(match);
      } else {
        handleTakeAttendance({
          id: searchParams.timetableId,
          timetableId: searchParams.timetableId,
          periodNumber: searchParams.period || 1,
          time: "Scheduled Session",
          subject: "Class Session",
          section: searchParams.section || "A",
          rawSection: searchParams.section || "Section A",
          semester: searchParams.semester || 1,
          status: "Ongoing",
        });
      }
    }
  }, [searchParams.timetableId, todayClasses, activeFormSlot, loading]);

  const handleViewRegister = (slot: TodayClassItem) => {
    setSelectedSubject(slot.subject);
    setSelectedSection(slot.rawSection || slot.section);
    setActiveTab("register");
  };

  // Atomic submission to PostgreSQL
  const handleSubmitAttendance = async (records: { studentId: string; status: "Present" | "Absent" | "Late" }[]) => {
    if (!activeFormSlot) return;

    try {
      setIsSubmitting(true);
      const timetableId = activeFormSlot.timetableId || activeFormSlot.id;
      const subDate = targetDate || new Date().toISOString().split("T")[0];

      const res = await api.post(`/api/attendance/faculty/session/${timetableId}/mark`, {
        date: subDate,
        records,
      });

      if (res.status === 200 && res.data?.success) {
        toast.success("Attendance submitted successfully!", {
          description: res.data.message || `Recorded attendance for ${records.length} students.`,
        });

        // Close form and refresh views
        setActiveFormSlot(null);
        await Promise.all([fetchTodayData(true), fetchRegisterData(), fetchHistoryData(), fetchAnalyticsData()]);
      } else {
        toast.error("Failed to submit attendance", {
          description: res.data?.error || "An error occurred during submission.",
        });
      }
    } catch (err: any) {
      toast.error("Submission failed due to network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter lists
  const availableSubjects = useMemo(() => {
    const list = todayClasses.map((c) => c.subject);
    return Array.from(new Set(list));
  }, [todayClasses]);

  const availableSections = useMemo(() => {
    const list = todayClasses.map((c) => c.rawSection || c.section);
    return Array.from(new Set(list));
  }, [todayClasses]);

  // Filtered Today's Classes
  const filteredTodayClasses = useMemo(() => {
    return todayClasses.filter((c) => {
      if (selectedSubject !== "ALL" && c.subject !== selectedSubject) return false;
      if (selectedSection !== "ALL" && (c.rawSection || c.section) !== selectedSection && c.section !== selectedSection) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSub = c.subject.toLowerCase().includes(q);
        const matchSec = c.section.toLowerCase().includes(q);
        const matchCode = (c.classCode || "").toLowerCase().includes(q);
        if (!matchSub && !matchSec && !matchCode) return false;
      }
      return true;
    });
  }, [todayClasses, selectedSubject, selectedSection, searchQuery]);

  // Filtered Register Students
  const filteredRegister = useMemo(() => {
    return registerStudents.filter((s) => {
      if (selectedSection !== "ALL" && s.section !== selectedSection && `Section ${s.section}` !== selectedSection) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchRoll = s.rollNumber.toLowerCase().includes(q);
        if (!matchName && !matchRoll) return false;
      }
      return true;
    });
  }, [registerStudents, selectedSection, searchQuery]);

  const displayDate = targetDate
    ? new Date(targetDate).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <AttendanceHeader
        academicYear={academicYear}
        semester={semester}
        currentDate={displayDate}
      />

      {/* 2. Global Load Stats (Direct from PostgreSQL) */}
      <StatisticsCards attendanceData={{ stats }} />

      {/* 3. Search and filter tools */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSubject={selectedSubject}
        onSubjectChange={setSelectedSubject}
        selectedSection={selectedSection}
        onSectionChange={setSelectedSection}
        onRefresh={handleRefresh}
        subjectsList={availableSubjects}
        sectionsList={availableSections}
      />

      {/* 4. Tab Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-2">
          <TabsList className="bg-card border border-border/60 p-1 rounded-xl">
            <TabsTrigger value="today" className="text-xs font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              Today's Schedule & Attendance ({todayClasses.length})
            </TabsTrigger>
            <TabsTrigger value="register" className="text-xs font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              Student Attendance Register
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              Attendance History ({historySessions.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              Attendance Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Today's Classes & Attendance Taking Interface */}
        <TabsContent value="today" className="space-y-6">
          {loadingRoster ? (
            <div className="bg-card border rounded-3xl p-12 text-center shadow-card space-y-3">
              <Loader2 className="size-8 text-primary animate-spin mx-auto" />
              <p className="text-sm font-bold text-foreground">Loading class roster from database...</p>
              <p className="text-xs text-muted-foreground">Fetching verified student enrollments for this session.</p>
            </div>
          ) : activeFormSlot ? (
            <AttendanceForm
              slot={{
                ...activeFormSlot,
                facultyName: profile.name || "Dr. Ravi Kumar",
                date: targetDate || new Date().toISOString().split("T")[0],
              }}
              students={rosterStudents}
              onCancel={() => setActiveFormSlot(null)}
              onSubmit={handleSubmitAttendance}
              isSubmitting={isSubmitting}
            />
          ) : loading ? (
            <SkeletonLoader />
          ) : (
            <TodayClasses
              classes={filteredTodayClasses}
              onTakeAttendance={handleTakeAttendance}
              onViewRegister={handleViewRegister}
            />
          )}
        </TabsContent>

        {/* Tab 2: Attendance Register */}
        <TabsContent value="register" className="space-y-6">
          <AttendanceRegister
            students={filteredRegister}
            subject={selectedSubject}
            section={selectedSection}
          />
        </TabsContent>

        {/* Tab 3: Attendance History */}
        <TabsContent value="history" className="space-y-6">
          <AttendanceHistory
            history={historySessions}
            isLoading={loadingHistory}
          />
        </TabsContent>

        {/* Tab 4: Attendance Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <AttendanceAnalytics
            distributionData={analyticsData.distributionData}
            trendData={analyticsData.trendData}
            subjectWise={analyticsData.subjectWise}
            lowAttendanceStudents={analyticsData.lowAttendanceStudents}
            repeatedAbsences={analyticsData.repeatedAbsences}
            hasData={analyticsData.hasData}
            totalRecords={analyticsData.totalRecords}
            isLoading={loadingAnalytics}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
