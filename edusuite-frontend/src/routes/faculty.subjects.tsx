import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRole } from "@/context/role-context";
import { api } from "@/lib/api";
import type { SubjectItem } from "@/data/faculty-mock-data";

// Subcomponents imports
import { SubjectHeader } from "@/components/dashboard/subjects/subject-header";
import { SearchFilterBar } from "@/components/dashboard/subjects/search-filter-bar";
import { StatisticsCards } from "@/components/dashboard/subjects/statistics-cards";
import { SubjectGrid } from "@/components/dashboard/subjects/subject-grid";
import { SubjectDetailsDrawer } from "@/components/dashboard/subjects/subject-details-drawer";
import { SkeletonLoader } from "@/components/dashboard/subjects/skeleton-loader";
import { toast } from "sonner";

export const Route = createFileRoute("/faculty/subjects")({
  head: () => ({
    meta: [{ title: "My Subjects & Academics — EduSuite Pro" }],
  }),
  component: FacultySubjectsPage,
});

function FacultySubjectsPage() {
  const { profile } = useRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [departmentName, setDepartmentName] = useState<string>("Computer Science & Engineering");
  const [academicYear, setAcademicYear] = useState<string>("2026-27");
  const [semester, setSemester] = useState<string>("Semester 5");
  const [originalSubjects, setOriginalSubjects] = useState<SubjectItem[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch real subjects assigned to the authenticated faculty member from PostgreSQL
  const fetchSubjects = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        toast.loading("Synchronizing subjects from database...", { id: "refresh-subjects" });
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await api.get("/api/faculty/subjects");
      const data = res.data || {};

      setOriginalSubjects(data.subjects || []);
      if (data.departmentName) setDepartmentName(data.departmentName);
      if (data.academicYear) setAcademicYear(data.academicYear);
      if (data.semester) setSemester(data.semester);

      if (isRefresh) {
        toast.success("Subjects synchronized with database", { id: "refresh-subjects" });
      }
    } catch (err: any) {
      console.error("Failed to load faculty subjects:", err);
      const errMsg = err?.response?.data?.error || "Failed to load assigned subjects.";
      setError(errMsg);
      if (isRefresh) {
        toast.error("Failed to synchronize subjects", { id: "refresh-subjects" });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleRefresh = () => {
    fetchSubjects(true);
  };

  const handleSelectSubject = (subject: SubjectItem) => {
    setSelectedSubject(subject);
    setDrawerOpen(true);
  };

  const filteredSubjects = useMemo(() => {
    return originalSubjects.filter((sub) => {
      const matchesSearch =
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = selectedType === "ALL" || sub.type === selectedType;
      const matchesStatus = selectedStatus === "ALL" || sub.status === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [originalSubjects, searchQuery, selectedType, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <SubjectHeader
        departmentName={departmentName}
        academicYear={academicYear}
        semester={semester}
      />

      {/* 2. Global Load Stats */}
      <StatisticsCards subjects={originalSubjects} />

      {/* 3. Search and Filter Controls */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onRefresh={handleRefresh}
      />

      {/* 4. Grid view vs Skeletons */}
      {loading ? (
        <SkeletonLoader />
      ) : error ? (
        <div className="p-8 text-center border border-dashed rounded-3xl bg-card text-destructive text-sm font-semibold">
          {error}
        </div>
      ) : (
        <SubjectGrid
          subjects={filteredSubjects}
          onSelectSubject={handleSelectSubject}
        />
      )}

      {/* 5. Subject Details Sliding Drawer */}
      <SubjectDetailsDrawer
        subject={selectedSubject}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
