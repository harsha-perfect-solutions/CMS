import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRole } from "@/context/role-context";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Layers,
  AlertCircle,
  RefreshCw,
  Clock,
  Plus,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

// Subcomponents
import { LessonPlanHeader } from "@/components/dashboard/lesson-plan/lesson-plan-header";
import { StatisticsCards } from "@/components/dashboard/lesson-plan/statistics-cards";
import { SearchFilterBar } from "@/components/dashboard/lesson-plan/search-filter-bar";
import { LessonPlanGrid } from "@/components/dashboard/lesson-plan/lesson-plan-grid";
import { LessonPlanDrawer } from "@/components/dashboard/lesson-plan/lesson-plan-drawer";
import { SkeletonLoader } from "@/components/dashboard/lesson-plan/skeleton-loader";
import { CreateLessonPlanModal } from "@/components/dashboard/lesson-plan/create-lesson-plan-modal";
import { MarkCompleteModal } from "@/components/dashboard/lesson-plan/mark-complete-modal";
import { TodayUpcomingLessons } from "@/components/dashboard/lesson-plan/today-upcoming-lessons";
import { SyllabusProgressView } from "@/components/dashboard/lesson-plan/syllabus-progress-view";

export const Route = createFileRoute("/faculty/lesson-plan")({
  head: () => ({
    meta: [{ title: "Lesson Plans — EduSuite Pro" }],
  }),
  component: FacultyLessonPlanPage,
});

function FacultyLessonPlanPage() {
  const { profile } = useRole();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Backend state
  const [plans, setPlans] = useState<any[]>([]);
  const [assignedCourses, setAssignedCourses] = useState<any[]>([]);
  const [syllabusProgress, setSyllabusProgress] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPlans: 0,
    completedPlans: 0,
    activePlans: 0,
    pendingLayouts: 0,
    plannedUnits: 0,
    averageCoverage: 0,
  });
  const [department, setDepartment] = useState<string>("");
  const [academicYear, setAcademicYear] = useState<string>("2026-27");
  const [semester, setSemester] = useState<string>("Semester 5");
  const [facultyName, setFacultyName] = useState<string>(
    profile?.name || profile?.personaName || "Dr. Ravi Kumar"
  );

  // Active view tab: "all", "today", "completed", "progress"
  const [activeTab, setActiveTab] = useState<string>("all");

  // Filters & layout
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals & drawers
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planToComplete, setPlanToComplete] = useState<any | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);

  // Primary loader from PostgreSQL
  const fetchLessonPlans = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [plansRes, coursesRes] = await Promise.all([
        api.get("/api/faculty/lesson-plans"),
        api.get("/api/faculty/lesson-plans/assigned-courses"),
      ]);

      if (plansRes.data?.success) {
        setPlans(plansRes.data.plans || []);
        if (plansRes.data.stats) setStats(plansRes.data.stats);
        if (plansRes.data.syllabusProgress) setSyllabusProgress(plansRes.data.syllabusProgress);
        if (plansRes.data.department) setDepartment(plansRes.data.department);
        if (plansRes.data.academicYear) setAcademicYear(plansRes.data.academicYear);
        if (plansRes.data.semester) setSemester(plansRes.data.semester);
        if (plansRes.data.faculty?.name) setFacultyName(plansRes.data.faculty.name);
      } else {
        setError(plansRes.data?.error || "Failed to load lesson plans.");
      }

      if (coursesRes.data?.courses) {
        setAssignedCourses(coursesRes.data.courses);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Unable to connect to lesson planning service.";
      setError(msg);
      toast.error("Failed to fetch lesson plans", { description: msg });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLessonPlans();
  }, [fetchLessonPlans]);

  // Unique subjects for filter
  const uniqueSubjectOptions = useMemo(() => {
    if (assignedCourses.length > 0) {
      return assignedCourses.map((c) => ({
        id: c.courseId,
        code: c.code,
        name: c.name,
      }));
    }
    const map = new Map<string, { id: string; code: string; name: string }>();
    plans.forEach((p) => {
      if (p.courseId && !map.has(p.courseId)) {
        map.set(p.courseId, {
          id: p.courseId,
          code: p.courseCode || p.code || "SUB",
          name: p.courseName || p.name || "Subject",
        });
      }
    });
    return Array.from(map.values());
  }, [assignedCourses, plans]);

  // Filter plans
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const code = (p.courseCode || p.code || "").toLowerCase();
      const name = (p.courseName || p.name || "").toLowerCase();
      const unit = (p.unitTitle || "").toLowerCase();
      const topic = (p.topic || "").toLowerCase();

      const matchesSearch =
        !q ||
        code.includes(q) ||
        name.includes(q) ||
        unit.includes(q) ||
        topic.includes(q);

      const matchesStatus =
        selectedStatus === "ALL" ||
        p.status?.toUpperCase() === selectedStatus.toUpperCase();

      const matchesSubject =
        selectedSubject === "ALL" ||
        p.courseId === selectedSubject ||
        p.courseCode === selectedSubject ||
        p.courseName === selectedSubject;

      return matchesSearch && matchesStatus && matchesSubject;
    });
  }, [plans, searchQuery, selectedStatus, selectedSubject]);

  // Completed plans for history tab
  const completedPlans = useMemo(() => {
    return plans.filter((p) => p.status === "COMPLETED");
  }, [plans]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingPlan(null);
    setCreateModalOpen(true);
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setCreateModalOpen(true);
  };

  const handleViewPlan = (plan: any) => {
    setSelectedPlan(plan);
    setDrawerOpen(true);
  };

  const handleOpenCompleteModal = (plan: any) => {
    setPlanToComplete(plan);
    setCompleteModalOpen(true);
  };

  const handlePrint = () => {
    toast.info("Opening standard print preview for lesson plans...");
    window.print();
  };

  const handleExportPdf = () => {
    toast.success("Compiling Lesson Plans PDF document...", {
      description: `${plans.length} authorized plans included.`,
    });

    // Create printable document in iframe/new tab
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>EduSuite Pro - Lesson Plan Register - ${facultyName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #111; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 0; }
            .meta { font-size: 12px; color: #475569; margin-top: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; color: #334155; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; }
            .badge-completed { background: #dcfce7; color: #166534; }
            .badge-planned { background: #dbeafe; color: #1e40af; }
            .badge-draft { background: #f1f5f9; color: #475569; }
            @media print {
              body { margin: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">EduSuite Pro &middot; Faculty Lesson Plan Register</h1>
            <div class="meta">
              <strong>Faculty:</strong> ${facultyName} &nbsp;|&nbsp;
              <strong>Department:</strong> ${department || profile.department || "Computer Science & Engineering"} &nbsp;|&nbsp;
              <strong>Academic Year:</strong> ${academicYear} &nbsp;|&nbsp;
              <strong>Semester:</strong> ${semester}
            </div>
            <div class="meta" style="margin-top: 4px;">
              Generated on: ${new Date().toLocaleString()} &middot; Total Plans: ${plans.length} &middot; Completed: ${stats.completedPlans} &middot; Avg Coverage: ${stats.averageCoverage}%
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Subject / Code</th>
                <th>Sec</th>
                <th>Unit</th>
                <th>Topic / Subtopic</th>
                <th>Planned Date</th>
                <th>Duration</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Coverage</th>
                <th>Notes / Details</th>
              </tr>
            </thead>
            <tbody>
              ${plans
                .map(
                  (p) => `
                <tr>
                  <td><strong>${p.courseCode || p.code || "SUB"}</strong><br/>${p.courseName || p.name || ""}</td>
                  <td>${p.section || "A"}</td>
                  <td>Unit ${p.unitNumber || 1}<br/><small style="color:#64748b">${p.unitTitle || ""}</small></td>
                  <td><strong>${p.topic || ""}</strong>${p.subtopic ? `<br/><small>${p.subtopic}</small>` : ""}</td>
                  <td>${p.plannedDate ? p.plannedDate.split("T")[0] : "-"}</td>
                  <td>${p.durationMinutes || 60} min</td>
                  <td>${p.teachingMode || "Theory"}</td>
                  <td>
                    <span class="badge ${
                      p.status === "COMPLETED"
                        ? "badge-completed"
                        : p.status === "PLANNED"
                        ? "badge-planned"
                        : "badge-draft"
                    }">
                      ${p.status}
                    </span>
                  </td>
                  <td>${p.coveragePercentage || 0}%</td>
                  <td style="font-size:10px; color:#475569;">${p.teachingNotes || p.requiredResources || "-"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  // Error state with retry
  if (error && plans.length === 0) {
    return (
      <div className="space-y-6">
        <LessonPlanHeader
          academicYear={academicYear}
          semester={semester}
          departmentName={department || profile.department}
          facultyName={facultyName}
          isRefreshing={refreshing}
          onRefresh={() => fetchLessonPlans(false)}
          onPrint={handlePrint}
          onExportPdf={handleExportPdf}
        />
        <div className="p-12 text-center border border-dashed rounded-3xl bg-card space-y-4">
          <AlertCircle className="size-12 text-destructive mx-auto opacity-70" />
          <h3 className="font-extrabold text-base text-foreground">Unable to load lesson plans</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">{error}</p>
          <Button
            onClick={() => fetchLessonPlans(false)}
            variant="outline"
            className="rounded-xl cursor-pointer text-xs"
          >
            <RefreshCw className="size-3.5 mr-2" /> Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header with dynamic department & academic context */}
      <LessonPlanHeader
        academicYear={academicYear}
        semester={semester}
        departmentName={department || profile.department || "Computer Science & Engineering"}
        facultyName={facultyName}
        isRefreshing={refreshing}
        onRefresh={() => fetchLessonPlans(true)}
        onPrint={handlePrint}
        onExportPdf={handleExportPdf}
      />

      {/* 2. Dynamic 6 KPI Statistics Cards backed strictly by PostgreSQL */}
      <StatisticsCards stats={stats} />

      {/* 3. Primary Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-2">
          <TabsList className="bg-muted/60 p-1 rounded-2xl h-10">
            <TabsTrigger value="all" className="rounded-xl text-xs font-semibold px-3.5">
              <BookOpen className="size-3.5 mr-1.5" /> All Lesson Plans ({plans.length})
            </TabsTrigger>
            <TabsTrigger value="today" className="rounded-xl text-xs font-semibold px-3.5">
              <Clock className="size-3.5 mr-1.5" /> Today & Upcoming
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-xl text-xs font-semibold px-3.5">
              <CheckCircle2 className="size-3.5 mr-1.5" /> Teaching History ({completedPlans.length})
            </TabsTrigger>
            <TabsTrigger value="progress" className="rounded-xl text-xs font-semibold px-3.5">
              <Layers className="size-3.5 mr-1.5" /> Syllabus Progress
            </TabsTrigger>
          </TabsList>

          {activeTab === "all" && (
            <Button
              onClick={handleOpenCreate}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer text-xs h-9 px-3.5 font-semibold shrink-0"
            >
              <Plus className="size-3.5 mr-1.5" /> Create Lesson Plan
            </Button>
          )}
        </div>

        {/* Tab 1: All Lesson Plans */}
        <TabsContent value="all" className="space-y-4">
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            selectedSubject={selectedSubject}
            onSubjectChange={setSelectedSubject}
            uniqueSubjects={uniqueSubjectOptions}
            onCreatePlan={handleOpenCreate}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {loading ? (
            <SkeletonLoader />
          ) : (
            <LessonPlanGrid
              plans={filteredPlans}
              onSelectPlan={handleViewPlan}
              onView={handleViewPlan}
              onEdit={handleEditPlan}
              onMarkComplete={handleOpenCompleteModal}
              onCreatePlan={handleOpenCreate}
            />
          )}
        </TabsContent>

        {/* Tab 2: Today & Upcoming Sessions */}
        <TabsContent value="today" className="space-y-4">
          {loading ? (
            <SkeletonLoader />
          ) : (
            <TodayUpcomingLessons
              plans={plans}
              onViewPlan={handleViewPlan}
              onMarkComplete={handleOpenCompleteModal}
            />
          )}
        </TabsContent>

        {/* Tab 3: Completed Teaching History */}
        <TabsContent value="completed" className="space-y-4">
          {loading ? (
            <SkeletonLoader />
          ) : (
            <LessonPlanGrid
              plans={completedPlans}
              onSelectPlan={handleViewPlan}
              onView={handleViewPlan}
              onEdit={handleEditPlan}
              onMarkComplete={handleOpenCompleteModal}
              onCreatePlan={handleOpenCreate}
            />
          )}
        </TabsContent>

        {/* Tab 4: Syllabus Progress Breakdown */}
        <TabsContent value="progress" className="space-y-4">
          {loading ? (
            <SkeletonLoader />
          ) : (
            <SyllabusProgressView progressList={syllabusProgress} />
          )}
        </TabsContent>
      </Tabs>

      {/* Slide-out Lesson Plan Detail Drawer */}
      <LessonPlanDrawer
        plan={selectedPlan}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onMarkComplete={handleOpenCompleteModal}
      />

      {/* Create / Edit Lesson Plan Modal */}
      <CreateLessonPlanModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        assignedCourses={assignedCourses}
        facultyName={facultyName}
        editingPlan={editingPlan}
        onSuccess={() => fetchLessonPlans(true)}
      />

      {/* Mark Completed Modal */}
      <MarkCompleteModal
        plan={planToComplete}
        open={completeModalOpen}
        onOpenChange={setCompleteModalOpen}
        onSuccess={() => fetchLessonPlans(true)}
      />
    </div>
  );
}
