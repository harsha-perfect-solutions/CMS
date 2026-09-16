import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import type { StudentDetails } from "@/data/faculty-mock-data";

// Subcomponents imports
import { StudentHeader } from "@/components/dashboard/students/student-header";
import { SearchFilterBar } from "@/components/dashboard/students/search-filter-bar";
import { StatisticsCards, type SummaryMetrics } from "@/components/dashboard/students/statistics-cards";
import { MyClassesBanner, type AssignedClass } from "@/components/dashboard/students/my-classes-banner";
import { StudentDirectory } from "@/components/dashboard/students/student-directory";
import { StudentDetailDrawer } from "@/components/dashboard/students/student-detail-drawer";
import { SkeletonLoader } from "@/components/dashboard/students/skeleton-loader";
import { toast } from "sonner";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/faculty/students")({
  head: () => ({
    meta: [{ title: "My Classes & Students — EduSuite Pro" }],
  }),
  component: FacultyStudentsPage,
});

function FacultyStudentsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Backend state
  const [faculty, setFaculty] = useState<any>(null);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [students, setStudents] = useState<StudentDetails[]>([]);
  const [summary, setSummary] = useState<SummaryMetrics>({
    totalClasses: 0,
    totalSections: 0,
    assignedStudents: 0,
    attendanceAlerts: 0,
    gradeAlerts: 0,
    averageAttendance: null,
    averageGpa: null,
  });
  const [academicYear, setAcademicYear] = useState("2026-27");
  const [semester, setSemester] = useState("Semester 5");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("ALL");
  const [selectedThreshold, setSelectedThreshold] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedMentoring, setSelectedMentoring] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Drawer state
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Primary data loader strictly backed by PostgreSQL
  const fetchMyClassesAndStudents = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      const res = await api.get("/api/faculty/my-classes-students", {
        params: {
          classId: selectedClassId !== "ALL" ? selectedClassId : undefined,
          search: searchQuery.trim() || undefined,
          threshold: selectedThreshold !== "ALL" ? selectedThreshold : undefined,
          status: selectedStatus !== "ALL" ? selectedStatus : undefined,
          mentoring: selectedMentoring !== "ALL" ? selectedMentoring : undefined,
        },
      });

      if (res.status === 200 && res.data) {
        setFaculty(res.data.faculty);
        setAssignedClasses(res.data.classes || []);
        setStudents(res.data.students || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
        if (res.data.academicYear) setAcademicYear(res.data.academicYear);
        if (res.data.semester) setSemester(res.data.semester);
      } else if (res.status === 403) {
        setError(res.data?.error || "Access denied. You are not authorized to view this class roster.");
      } else {
        setError("Failed to retrieve assigned student roster from database.");
      }
    } catch (err: any) {
      console.error("Error fetching faculty classes and students:", err);
      setError("Unable to connect to EduSuite API server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedClassId, searchQuery, selectedThreshold, selectedStatus, selectedMentoring]);

  // Initial load and filter re-fetch
  useEffect(() => {
    fetchMyClassesAndStudents();
  }, [fetchMyClassesAndStudents]);

  // Live Refresh Handler
  const handleRefresh = async () => {
    setRefreshing(true);
    toast.info("Synchronizing roster with PostgreSQL database...", {
      description: "Fetching updated attendance and assignment records.",
    });
    await fetchMyClassesAndStudents(true);
    toast.success("Roster updated successfully!", {
      description: "Live PostgreSQL data synchronized.",
    });
  };

  // Export Roster (Only Authorized Faculty Students)
  const handleExport = async () => {
    try {
      toast.info("Preparing student roster export...", {
        description: "Compiling authorized records from PostgreSQL.",
      });
      const res = await api.get("/api/faculty/my-classes-students/export");
      const exportList = res.data?.students || students;

      if (!exportList || exportList.length === 0) {
        toast.error("No student records available to export.");
        return;
      }

      const headers = ["Roll Number", "Full Name", "Email", "Department", "Semester", "Section", "CGPA", "Status"];
      const rows = exportList.map((s: any) => [
        s.rollNumber || "",
        `"${(s.name || "").replace(/"/g, '""')}"`,
        s.email || "",
        s.department || "",
        s.semester || "",
        s.section || "",
        s.cgpa || "",
        s.status || "Active",
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `My_Classes_Students_${faculty?.rollNumber || "Faculty"}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Roster exported successfully!", {
        description: `Exported ${exportList.length} assigned student records.`,
      });
    } catch (err: any) {
      toast.error("Failed to export roster: " + err.message);
    }
  };

  const handleSelectStudent = (student: StudentDetails) => {
    setSelectedStudent(student);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <StudentHeader
        academicYear={academicYear}
        semester={semester}
        isRefreshing={refreshing}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />

      {/* Error state display */}
      {error && (
        <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchMyClassesAndStudents()}
            className="h-8 rounded-xl text-xs"
          >
            <RefreshCw className="size-3.5 mr-1.5" /> Try Again
          </Button>
        </div>
      )}

      {/* 2. Top Summary KPI Cards */}
      <StatisticsCards summary={summary} />

      {/* 3. Prominent MY CLASSES Section */}
      <MyClassesBanner
        classes={assignedClasses}
        selectedClassId={selectedClassId}
        onSelectClass={setSelectedClassId}
      />

      {/* 4. Toolbar Search & Filters */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        assignedClasses={assignedClasses}
        selectedClassId={selectedClassId}
        onClassChange={setSelectedClassId}
        selectedThreshold={selectedThreshold}
        onThresholdChange={setSelectedThreshold}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedMentoring={selectedMentoring}
        onMentoringChange={setSelectedMentoring}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* 5. Student Directory List / Grid */}
      {loading ? (
        <SkeletonLoader />
      ) : (
        <StudentDirectory
          students={students}
          viewMode={viewMode}
          onSelectStudent={handleSelectStudent}
        />
      )}

      {/* 6. Authorized Detail Sliding Drawer */}
      <StudentDetailDrawer
        student={selectedStudent}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
