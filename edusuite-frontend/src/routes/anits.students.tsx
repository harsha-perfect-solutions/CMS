import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useRole } from "@/context/role-context";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  GraduationCap,
  Users,
  Building2,
  Calendar,
  Search,
  Download,
  RefreshCw,
  Loader2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Edit2,
  UserX,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Layers,
  MapPin,
  ShieldAlert,
  Database,
  ArrowUpDown,
  Phone,
  Mail,
  UserCheck,
  Check,
  X,
  Award,
  CreditCard,
  Home,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/anits/students")({
  head: () => ({
    meta: [{ title: "Student Management — ANITS" }],
  }),
  validateSearch: (search: Record<string, unknown>) => {
    return {
      search: (search.search as string) || undefined,
      department: (search.department as string) || undefined,
      semester: search.semester ? Number(search.semester) : undefined,
      section: (search.section as string) || undefined,
      status: (search.status as string) || undefined,
      page: search.page ? Number(search.page) : undefined,
      pageSize: search.pageSize ? Number(search.pageSize) : undefined,
      sortBy: (search.sortBy as string) || undefined,
      sortOrder: (search.sortOrder as "asc" | "desc") || undefined,
    };
  },
  component: AnitsStudentsPage,
});

function AnitsStudentsPage() {
  const searchParams = Route.useSearch();
  const { role } = useRole();

  const normRole = (role || "").toLowerCase();
  const isAdmin = ["super_admin", "superadmin", "admin", "principal", "academic_dean"].includes(normRole);

  // Summary Metrics from PostgreSQL
  const [summary, setSummary] = useState({
    totalStudents: 0,
    activeStudents: 0,
    departmentsCount: 0,
    validCohortStudents: 0,
  });

  // Filter options from PostgreSQL
  const [filterOptions, setFilterOptions] = useState<{
    departments: { id: string; code: string; name: string }[];
    semesters: number[];
    sections: string[];
    statuses: string[];
  }>({
    departments: [],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    sections: ["A", "B"],
    statuses: ["Active", "Inactive", "Suspended"],
  });

  // Active filters
  const [selectedDept, setSelectedDept] = useState<string>(searchParams.department || "All");
  const [selectedSem, setSelectedSem] = useState<string>(searchParams.semester ? String(searchParams.semester) : "All");
  const [selectedSec, setSelectedSec] = useState<string>(searchParams.section || "All");
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.status || "All");
  const [searchQuery, setSearchQuery] = useState(searchParams.search || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.search || "");

  // Directory Table State
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: searchParams.page || 1,
    pageSize: searchParams.pageSize || 25,
    total: 0,
    totalPages: 1,
  });
  const [sortBy, setSortBy] = useState(searchParams.sortBy || "rollNumber");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(searchParams.sortOrder || "asc");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Modal States - Student Profile Details
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Add Student Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    rollNumber: "",
    name: "",
    email: "",
    department: "CSE",
    semester: 1,
    section: "A",
    year: 1,
    studentType: "Day Scholar",
    cgpa: "8.0",
    creditsEarned: "0",
    feeStatus: "Paid",
    password: "",
  });

  // Edit Student Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    rollNumber: "",
    name: "",
    email: "",
    department: "",
    semester: 1,
    section: "A",
    year: 1,
    studentType: "Day Scholar",
    cgpa: "8.0",
    creditsEarned: "0",
    feeStatus: "Paid",
    status: "Active",
  });

  // Deactivate Student Modal
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);
  const [studentToDeactivate, setStudentToDeactivate] = useState<any | null>(null);

  // Debounce search query input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch student directory data from backend
  const fetchData = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) setIsRefreshing(true);
      else setLoading(true);
      setHasError(false);

      try {
        const params: Record<string, any> = {
          page: pagination.page,
          pageSize: pagination.pageSize,
          sortBy,
          sortOrder,
        };

        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (selectedDept !== "All" && selectedDept !== "All Departments") params.department = selectedDept;
        if (selectedSem !== "All" && selectedSem !== "All Semesters") params.semester = selectedSem;
        if (selectedSec !== "All" && selectedSec !== "All Sections") params.section = selectedSec;
        if (selectedStatus !== "All" && selectedStatus !== "All Statuses") params.status = selectedStatus;

        const res = await api.get("/api/anits/super-admin/students", { params });
        const data = res.data;

        if (data.summary) {
          setSummary({
            totalStudents: data.summary.totalStudents || 0,
            activeStudents: data.summary.activeStudents || 0,
            departmentsCount: data.summary.departmentsCount || 0,
            validCohortStudents: data.summary.validCohortStudents || 0,
          });
        }

        if (data.filterOptions) {
          setFilterOptions({
            departments: data.filterOptions.departments || [],
            semesters: data.filterOptions.semesters || [1, 2, 3, 4, 5, 6, 7, 8],
            sections: data.filterOptions.sections || ["A", "B"],
            statuses: data.filterOptions.statuses || ["Active", "Inactive", "Suspended"],
          });
        }

        setStudentsList(data.students || []);

        if (data.pagination) {
          setPagination({
            page: data.pagination.page,
            pageSize: data.pagination.pageSize,
            total: data.pagination.total,
            totalPages: data.pagination.totalPages,
          });
        }
      } catch (err: any) {
        console.error("Error fetching students directory:", err);
        setHasError(true);
        toast.error(err.response?.data?.error || "Failed to load student directory.");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [pagination.page, pagination.pageSize, sortBy, sortOrder, debouncedSearch, selectedDept, selectedSem, selectedSec, selectedStatus]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Student Details Modal
  const openStudentDetails = async (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsDetailsOpen(true);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/api/anits/super-admin/students/${studentId}`);
      setStudentDetails(res.data?.student || null);
    } catch (err: any) {
      console.error("Error fetching student details:", err);
      toast.error(err.response?.data?.error || "Failed to load student profile.");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (student: any) => {
    setEditForm({
      id: student.id,
      rollNumber: student.rollNumber,
      name: student.name,
      email: student.email,
      department: student.department || "CSE",
      semester: student.semester || 1,
      section: student.section || "A",
      year: student.year || Math.ceil((student.semester || 1) / 2),
      studentType: student.studentType || "Day Scholar",
      cgpa: student.cgpa !== null && student.cgpa !== undefined ? String(student.cgpa) : "8.0",
      creditsEarned: student.creditsEarned !== null && student.creditsEarned !== undefined ? String(student.creditsEarned) : "0",
      feeStatus: student.feeStatus || "Paid",
      status: student.status || "Active",
    });
    setIsEditOpen(true);
  };

  // Open Deactivate Confirmation
  const openDeactivateModal = (student: any) => {
    setStudentToDeactivate(student);
    setIsDeactivateOpen(true);
  };

  // Handle Add Student Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.rollNumber.trim() || !addForm.name.trim() || !addForm.email.trim() || !addForm.department) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmittingAdd(true);
    try {
      await api.post("/api/anits/super-admin/students", addForm);
      toast.success("Student registered successfully.");
      setIsAddOpen(false);
      setAddForm({
        rollNumber: "",
        name: "",
        email: "",
        department: "CSE",
        semester: 1,
        section: "A",
        year: 1,
        studentType: "Day Scholar",
        cgpa: "8.0",
        creditsEarned: "0",
        feeStatus: "Paid",
        password: "",
      });
      fetchData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to register student.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handle Edit Student Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.email.trim() || !editForm.department) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      await api.put(`/api/anits/super-admin/students/${editForm.id}`, editForm);
      toast.success("Student record updated successfully.");
      setIsEditOpen(false);
      fetchData(true);
      if (selectedStudentId === editForm.id && isDetailsOpen) {
        openStudentDetails(editForm.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update student record.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Safe Deactivation Submit
  const handleDeactivateSubmit = async () => {
    if (!studentToDeactivate) return;
    setIsSubmittingDeactivate(true);
    try {
      const res = await api.delete(`/api/anits/super-admin/students/${studentToDeactivate.id}`);
      toast.success(res.data?.message || "Student deactivated safely. Historical data preserved.");
      setIsDeactivateOpen(false);
      setStudentToDeactivate(null);
      fetchData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to deactivate student.");
    } finally {
      setIsSubmittingDeactivate(false);
    }
  };

  // Handle CSV Export
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("cms_token") : null;
      const url = new URL("http://localhost:5000/api/anits/super-admin/students/export");
      if (debouncedSearch.trim()) url.searchParams.set("search", debouncedSearch.trim());
      if (selectedDept !== "All") url.searchParams.set("department", selectedDept);
      if (selectedSem !== "All") url.searchParams.set("semester", selectedSem);
      if (selectedSec !== "All") url.searchParams.set("section", selectedSec);
      if (selectedStatus !== "All") url.searchParams.set("status", selectedStatus);

      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to export student directory");
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `ANITS_Student_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Student directory CSV exported successfully.");
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error("Failed to export student directory CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedDept("All");
    setSelectedSem("All");
    setSelectedSec("All");
    setSelectedStatus("All");
    setSearchQuery("");
    setDebouncedSearch("");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  // Handle Column Sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const getInitials = (name?: string) => {
    if (!name) return "ST";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  };

  // Access check fallback
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-4">
        <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-600">
          <ShieldAlert className="size-8" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Access Restricted</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Institution-wide Student Management is restricted to ANITS Super Administrators. Your current role does not have authorization to access this module.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP BREADCRUMB & HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hover:text-foreground transition-colors">Home</span>
            <ChevronRight className="size-3" />
            <span>Administration</span>
            <ChevronRight className="size-3" />
            <span className="font-semibold text-foreground">Students</span>
          </nav>
          <div className="flex items-center gap-3 pt-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Student Management
            </h1>
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[11px] font-semibold gap-1.5 py-0.5"
            >
              <Database className="size-3" />
              PostgreSQL Live
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Institution-wide ANITS student records, academic cohorts and attendance information synchronized with PostgreSQL.
          </p>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={isExporting || loading}
            className="text-xs font-semibold h-8.5 rounded-lg border-border/60 hover:bg-muted/60"
          >
            {isExporting ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="size-3.5 mr-1.5" />
            )}
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={isRefreshing || loading}
            className="text-xs font-semibold h-8.5 rounded-lg border-border/60 hover:bg-muted/60"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="text-xs font-semibold h-8.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Plus className="size-3.5 mr-1.5" />
            Register Student
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <Card className="rounded-xl border-border/60 bg-card shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total Students</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                {summary.totalStudents.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground">Enrolled institutional candidates</p>
            </div>
            <div className="size-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <GraduationCap className="size-5.5" />
            </div>
          </CardContent>
        </Card>

        {/* Active Students */}
        <Card className="rounded-xl border-border/60 bg-card shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Active Students</p>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-600">
                {summary.activeStudents.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground">Good standing status</p>
            </div>
            <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5.5" />
            </div>
          </CardContent>
        </Card>

        {/* Departments */}
        <Card className="rounded-xl border-border/60 bg-card shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Departments</p>
              <h3 className="text-2xl font-bold tracking-tight text-purple-600">
                {summary.departmentsCount}
              </h3>
              <p className="text-[11px] text-muted-foreground">All Engineering Divisions</p>
            </div>
            <div className="size-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <Building2 className="size-5.5" />
            </div>
          </CardContent>
        </Card>

        {/* Students With Valid Cohort */}
        <Card className="rounded-xl border-border/60 bg-card shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Students With Valid Cohort</p>
              <h3 className="text-2xl font-bold tracking-tight text-indigo-600">
                {summary.validCohortStudents.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground">Mapped to Dept, Sem &amp; Section</p>
            </div>
            <div className="size-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers className="size-5.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. SEARCH & MULTI-FILTER BAR */}
      <Card className="rounded-xl border-border/60 bg-card shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, roll number, email..."
                className="h-9 w-full pl-9 pr-8 text-xs bg-background border-border/60 rounded-lg focus-visible:ring-1 focus-visible:ring-blue-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Department */}
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-9 px-3 text-xs bg-background border border-border/60 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              >
                <option value="All">All Departments</option>
                {filterOptions.departments.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>

              {/* Semester */}
              <select
                value={selectedSem}
                onChange={(e) => {
                  setSelectedSem(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-9 px-3 text-xs bg-background border border-border/60 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              >
                <option value="All">All Semesters</option>
                {filterOptions.semesters.map((s) => (
                  <option key={s} value={String(s)}>
                    Semester {s}
                  </option>
                ))}
              </select>

              {/* Section */}
              <select
                value={selectedSec}
                onChange={(e) => {
                  setSelectedSec(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-9 px-3 text-xs bg-background border border-border/60 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              >
                <option value="All">All Sections</option>
                {filterOptions.sections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec.replace(/^Section\s+/i, "")}
                  </option>
                ))}
              </select>

              {/* Status */}
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-9 px-3 text-xs bg-background border border-border/60 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              >
                <option value="All">All Statuses</option>
                {filterOptions.statuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              {/* Clear Filters */}
              {(selectedDept !== "All" ||
                selectedSem !== "All" ||
                selectedSec !== "All" ||
                selectedStatus !== "All" ||
                searchQuery.trim() !== "") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <RotateCcw className="size-3.5 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. INSTITUTIONAL STUDENT DIRECTORY TABLE */}
      <Card className="rounded-xl border-border/60 bg-card shadow-xs overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/50 bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Institutional Student Directory
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Enrolled students categorized by department, semester and cohort section
            </CardDescription>
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            Showing <span className="font-bold text-foreground">{studentsList.length > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0}</span> to{" "}
            <span className="font-bold text-foreground">
              {Math.min(pagination.page * pagination.pageSize, pagination.total)}
            </span>{" "}
            of <span className="font-bold text-foreground">{pagination.total}</span> students
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("rollNumber")}
                  >
                    <div className="flex items-center gap-1.5">
                      Roll Number
                      <ArrowUpDown className="size-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1.5">
                      Student Name
                      <ArrowUpDown className="size-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("department")}
                  >
                    <div className="flex items-center gap-1.5">
                      Department
                      <ArrowUpDown className="size-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("semester")}
                  >
                    <div className="flex items-center gap-1.5">
                      Semester &amp; Section
                      <ArrowUpDown className="size-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Category</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1.5">
                      Status
                      <ArrowUpDown className="size-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Attendance Rate</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="size-6 animate-spin text-blue-600" />
                        <p className="text-xs">Loading ANITS student directory from PostgreSQL...</p>
                      </div>
                    </td>
                  </tr>
                ) : hasError ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-destructive">
                      <p className="text-xs font-semibold">Failed to fetch students. Please click Refresh to retry.</p>
                    </td>
                  </tr>
                ) : studentsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <GraduationCap className="size-8 text-muted-foreground/50" />
                        <p className="text-xs font-medium text-foreground">No student records found</p>
                        <p className="text-[11px]">Try adjusting your search query or active filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  studentsList.map((student) => {
                    const statusLower = (student.status || "active").toLowerCase();
                    const att = student.attendance;
                    const percentage = att?.percentage ?? 100;
                    const isShortage = att?.isShortage;

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        {/* Roll Number */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <span className="grid size-7 place-items-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-200 dark:border-blue-900 shrink-0">
                              {getInitials(student.name)}
                            </span>
                            <span>{student.rollNumber}</span>
                          </div>
                        </td>

                        {/* Student Name & Email */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground leading-tight">
                            {student.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]">
                            {student.email}
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="text-[11px] font-bold px-2 py-0.5 bg-muted/40 border-border/60 text-foreground"
                          >
                            {student.department || "General"}
                          </Badge>
                        </td>

                        {/* Semester & Section */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-medium text-foreground">
                            Sem {student.semester || "—"} &middot; {student.section ? `Sec ${student.section.replace(/^Section\s+/i, "")}` : "A"}
                          </div>
                          {student.year && (
                            <div className="text-[10px] text-muted-foreground">Year {student.year}</div>
                          )}
                        </td>

                        {/* Category / Student Type */}
                        <td className="py-3 px-4 whitespace-nowrap text-muted-foreground text-[11px]">
                          {student.studentType || "Day Scholar"}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                              statusLower === "active"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                : statusLower === "inactive"
                                ? "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {student.status || "Active"}
                          </Badge>
                        </td>

                        {/* Attendance Rate */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold ${
                                isShortage ? "text-red-600" : "text-emerald-600"
                              }`}
                            >
                              {percentage}%
                            </span>
                            {att?.totalSessions > 0 ? (
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1.5 py-0 ${
                                  isShortage
                                    ? "bg-red-500/10 text-red-600 border-red-500/20"
                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                }`}
                              >
                                {isShortage ? "Shortage" : "Eligible"}
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">No data</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openStudentDetails(student.id)}
                              className="size-7.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
                              title="View Student Profile"
                            >
                              <Eye className="size-3.5" />
                              <span className="sr-only">View</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(student)}
                              className="size-7.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10"
                              title="Edit Student"
                            >
                              <Edit2 className="size-3.5" />
                              <span className="sr-only">Edit</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeactivateModal(student)}
                              className="size-7.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                              title="Deactivate Student"
                            >
                              <UserX className="size-3.5" />
                              <span className="sr-only">Deactivate</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rows per page:</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value, 10);
                  setPagination((p) => ({ ...p, pageSize: newSize, page: 1 }));
                }}
                className="h-8 px-2 text-xs bg-background border border-border/60 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 self-center">
              <Button
                variant="outline"
                size="icon"
                disabled={pagination.page <= 1 || loading}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="size-8 rounded-lg border-border/60"
              >
                <ChevronLeft className="size-4" />
                <span className="sr-only">Previous Page</span>
              </Button>

              <span className="text-muted-foreground px-2">
                Page <strong className="text-foreground">{pagination.page}</strong> of{" "}
                <strong className="text-foreground">{Math.max(1, pagination.totalPages)}</strong>
              </span>

              <Button
                variant="outline"
                size="icon"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="size-8 rounded-lg border-border/60"
              >
                <ChevronRight className="size-4" />
                <span className="sr-only">Next Page</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 5. MODAL: STUDENT PROFILE & ACADEMIC DOSSIER */}
      {/* ========================================================================= */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-border/60 shadow-2xl">
          {loadingDetails ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="size-8 animate-spin text-blue-600" />
              <p className="text-xs text-muted-foreground">Loading complete student profile from PostgreSQL...</p>
            </div>
          ) : !studentDetails ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              Student profile information could not be retrieved.
            </div>
          ) : (
            <div className="space-y-0">
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-md shrink-0">
                    {getInitials(studentDetails.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-foreground leading-tight">
                        {studentDetails.name}
                      </h2>
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-bold"
                      >
                        {studentDetails.status || "Active"}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      Roll Number: <strong className="text-foreground">{studentDetails.rollNumber}</strong> &middot; {studentDetails.email}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        Dept: {studentDetails.department || "General"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        Sem {studentDetails.semester} &middot; Sec {studentDetails.section ? studentDetails.section.replace(/^Section\s+/i, "") : "A"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {studentDetails.studentType || "Day Scholar"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end gap-1">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Attendance Rate</span>
                    <p className={`text-xl font-extrabold ${studentDetails.attendanceSummary?.isShortage ? "text-red-600" : "text-emerald-600"}`}>
                      {studentDetails.attendanceSummary?.attendancePercentage}%
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold ${
                        studentDetails.attendanceSummary?.isShortage
                          ? "bg-red-500/10 text-red-600 border-red-500/30"
                          : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      }`}
                    >
                      {studentDetails.attendanceSummary?.eligibility}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Tabs Section */}
              <div className="p-6">
                <Tabs defaultValue="academic" className="space-y-4">
                  <TabsList className="grid grid-cols-5 h-9 p-1 bg-muted/40 rounded-xl border border-border/50 text-xs">
                    <TabsTrigger value="academic" className="text-xs rounded-lg font-semibold">
                      Academic Profile
                    </TabsTrigger>
                    <TabsTrigger value="timetable" className="text-xs rounded-lg font-semibold">
                      Cohort Timetable
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="text-xs rounded-lg font-semibold">
                      Attendance ({studentDetails.attendanceSummary?.totalSessions || 0})
                    </TabsTrigger>
                    <TabsTrigger value="courses" className="text-xs rounded-lg font-semibold">
                      Course Enrollment
                    </TabsTrigger>
                    <TabsTrigger value="parent" className="text-xs rounded-lg font-semibold">
                      Parent Linkage
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: ACADEMIC PROFILE */}
                  <TabsContent value="academic" className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <div className="p-3.5 rounded-xl border border-border/60 bg-muted/15 space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Academic Department</span>
                        <p className="font-bold text-sm text-foreground">{studentDetails.department || "General"}</p>
                        <p className="text-[11px] text-muted-foreground">Engineering Division</p>
                      </div>
                      <div className="p-3.5 rounded-xl border border-border/60 bg-muted/15 space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Academic Term</span>
                        <p className="font-bold text-sm text-foreground">
                          Semester {studentDetails.semester} (Year {studentDetails.year || Math.ceil((studentDetails.semester || 1) / 2)})
                        </p>
                        <p className="text-[11px] text-muted-foreground">Academic Year 2026-27</p>
                      </div>
                      <div className="p-3.5 rounded-xl border border-border/60 bg-muted/15 space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Cohort Section</span>
                        <p className="font-bold text-sm text-foreground">
                          Section {studentDetails.section ? studentDetails.section.replace(/^Section\s+/i, "") : "A"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">Institutional Cohort</p>
                      </div>
                      <div className="p-3.5 rounded-xl border border-border/60 bg-muted/15 space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">CGPA Performance</span>
                        <div className="flex items-center gap-1.5">
                          <Award className="size-4 text-amber-500" />
                          <p className="font-bold text-sm text-foreground">{studentDetails.cgpa ?? "8.0"}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Cumulative Grade Point Average</p>
                      </div>
                      <div className="p-3.5 rounded-xl border border-border/60 bg-muted/15 space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Credits Earned</span>
                        <p className="font-bold text-sm text-foreground">{studentDetails.creditsEarned ?? 0} Credits</p>
                        <p className="text-[11px] text-muted-foreground">Total Degree Progress</p>
                      </div>
                      <div className="p-3.5 rounded-xl border border-border/60 bg-muted/15 space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Fee Settlement Status</span>
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="size-4 text-emerald-500" />
                          <p className="font-bold text-sm text-foreground">{studentDetails.feeStatus || "Paid"}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Institutional Accounts Status</p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB 2: COHORT TIMETABLE */}
                  <TabsContent value="timetable" className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
                        MasterTimetable Cohort Schedule ({studentDetails.cohortTimetable?.length || 0} Slots)
                      </h4>
                      <Badge variant="outline" className="text-[10px]">
                        Cohort: {studentDetails.department} &middot; Sem {studentDetails.semester} &middot; Sec {studentDetails.section ? studentDetails.section.replace(/^Section\s+/i, "") : "A"}
                      </Badge>
                    </div>

                    {studentDetails.cohortTimetable && studentDetails.cohortTimetable.length > 0 ? (
                      <div className="max-h-72 overflow-y-auto border border-border/60 rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground border-b border-border/50">
                            <tr>
                              <th className="p-2.5">Day</th>
                              <th className="p-2.5">Period &amp; Time</th>
                              <th className="p-2.5">Course / Subject</th>
                              <th className="p-2.5">Faculty</th>
                              <th className="p-2.5">Room</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {studentDetails.cohortTimetable.map((slot: any) => (
                              <tr key={slot.id} className="hover:bg-muted/20">
                                <td className="p-2.5 font-bold text-foreground">{slot.day}</td>
                                <td className="p-2.5 whitespace-nowrap">
                                  <div className="font-semibold">Period {slot.periodNumber}</div>
                                  <div className="text-[10px] text-muted-foreground">{slot.startTime} - {slot.endTime}</div>
                                </td>
                                <td className="p-2.5">
                                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                                    <span>{slot.course?.code || "SUBJ"}</span>
                                    {slot.isLab && (
                                      <Badge variant="outline" className="text-[8px] bg-blue-500/10 text-blue-600 border-blue-500/30">
                                        LAB
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate max-w-xs">
                                    {slot.course?.name || "Subject Allocation"}
                                  </div>
                                </td>
                                <td className="p-2.5 whitespace-nowrap">
                                  <div className="font-medium text-foreground">{slot.faculty?.name || "Assigned Faculty"}</div>
                                  <div className="text-[10px] text-muted-foreground">{slot.faculty?.rollNumber || "FAC"}</div>
                                </td>
                                <td className="p-2.5 whitespace-nowrap text-muted-foreground font-mono">
                                  {slot.roomNo || "Room TBD"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center border border-dashed border-border/60 rounded-xl bg-muted/10 space-y-1.5">
                        <Calendar className="size-6 text-muted-foreground/60 mx-auto" />
                        <p className="text-xs font-semibold text-foreground">Timetable mapping unavailable for this student.</p>
                        <p className="text-[11px] text-muted-foreground">
                          No MasterTimetable slots mapped for branch '{studentDetails.department}', semester {studentDetails.semester}, section '{studentDetails.section}'.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 3: ATTENDANCE LEDGER */}
                  <TabsContent value="attendance" className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Conducted Sessions</span>
                        <p className="text-lg font-bold text-foreground">{studentDetails.attendanceSummary?.totalSessions || 0}</p>
                      </div>
                      <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">Present</span>
                        <p className="text-lg font-bold text-emerald-600">{studentDetails.attendanceSummary?.presentCount || 0}</p>
                      </div>
                      <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
                        <span className="text-[10px] font-bold text-red-600 uppercase">Absent</span>
                        <p className="text-lg font-bold text-red-600">{studentDetails.attendanceSummary?.absentCount || 0}</p>
                      </div>
                      <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
                        <span className="text-[10px] font-bold text-amber-600 uppercase">Late</span>
                        <p className="text-lg font-bold text-amber-600">{studentDetails.attendanceSummary?.lateCount || 0}</p>
                      </div>
                    </div>

                    <div className="border border-border/60 rounded-xl overflow-hidden">
                      <div className="p-3 bg-muted/20 border-b border-border/50 flex items-center justify-between">
                        <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
                          Attendance Session History
                        </h4>
                        <span className="text-[11px] text-muted-foreground">
                          Eligibility Threshold: &ge; {studentDetails.attendanceSummary?.eligibilityThreshold || 75}%
                        </span>
                      </div>
                      {studentDetails.attendanceHistory && studentDetails.attendanceHistory.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground border-b border-border/40">
                              <tr>
                                <th className="p-2.5">Date</th>
                                <th className="p-2.5">Period</th>
                                <th className="p-2.5">Course / Subject</th>
                                <th className="p-2.5">Faculty</th>
                                <th className="p-2.5">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {studentDetails.attendanceHistory.map((rec: any) => {
                                const st = (rec.status || "").toLowerCase();
                                return (
                                  <tr key={rec.id} className="hover:bg-muted/15">
                                    <td className="p-2.5 font-mono text-foreground">{rec.date}</td>
                                    <td className="p-2.5">Period {rec.periodNumber || 1}</td>
                                    <td className="p-2.5 font-medium text-foreground">
                                      {rec.course?.code ? `${rec.course.code} — ${rec.course.name}` : "General Session"}
                                    </td>
                                    <td className="p-2.5 text-muted-foreground">{rec.faculty?.name || "Assigned Faculty"}</td>
                                    <td className="p-2.5">
                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] font-bold uppercase ${
                                          st === "present"
                                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                            : st === "absent"
                                            ? "bg-red-500/10 text-red-600 border-red-500/30"
                                            : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                        }`}
                                      >
                                        {rec.status}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-xs text-muted-foreground">
                          No attendance sessions recorded yet for this student.
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* TAB 4: COURSE ENROLLMENT */}
                  <TabsContent value="courses" className="space-y-4 pt-2">
                    {studentDetails.courseRegistrations && studentDetails.courseRegistrations.length > 0 ? (
                      <div className="border border-border/60 rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground border-b border-border/50">
                            <tr>
                              <th className="p-2.5">Course Code</th>
                              <th className="p-2.5">Course Name</th>
                              <th className="p-2.5">Credits</th>
                              <th className="p-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {studentDetails.courseRegistrations.map((reg: any) => (
                              <tr key={reg.id} className="hover:bg-muted/20">
                                <td className="p-2.5 font-mono font-bold text-foreground">{reg.course?.code}</td>
                                <td className="p-2.5 font-semibold text-foreground">{reg.course?.name}</td>
                                <td className="p-2.5">{reg.course?.credits || 3}</td>
                                <td className="p-2.5">
                                  <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600">
                                    Enrolled
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center border border-dashed border-border/60 rounded-xl bg-muted/10 space-y-2">
                        <BookOpen className="size-6 text-muted-foreground/60 mx-auto" />
                        <h4 className="text-xs font-semibold text-foreground">Course enrollment mapping is not available.</h4>
                        <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                          Individual CourseRegistration database records have not yet been assigned to this student. Academic coursework is currently driven via MasterTimetable cohort allocations.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 5: PARENT LINKAGE */}
                  <TabsContent value="parent" className="space-y-4 pt-2">
                    {studentDetails.parent ? (
                      <div className="p-4 rounded-xl border border-border/60 bg-muted/15 space-y-3">
                        <div className="flex items-center justify-between border-b border-border/50 pb-3">
                          <div>
                            <p className="font-bold text-sm text-foreground">{studentDetails.parent.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">Parent ID: {studentDetails.parent.rollNumber}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                            {studentDetails.parent.status || "Active"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="size-3.5 text-primary" />
                            <span className="text-foreground">{studentDetails.parent.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="size-3.5 text-primary" />
                            <span className="text-foreground">Dept: {studentDetails.parent.department || "General"}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center border border-dashed border-border/60 rounded-xl bg-muted/10 space-y-1.5">
                        <Users className="size-6 text-muted-foreground/60 mx-auto" />
                        <p className="text-xs font-semibold text-foreground">No parent or guardian linkage recorded.</p>
                        <p className="text-[11px] text-muted-foreground">Parent profile has not been configured in PostgreSQL.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-muted/15 border-t border-border/50 flex items-center justify-between">
                <div className="text-[11px] text-muted-foreground">
                  Record Created: {new Date(studentDetails.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDetailsOpen(false);
                      openEditModal(studentDetails);
                    }}
                    className="text-xs font-semibold h-8 rounded-lg"
                  >
                    <Edit2 className="size-3.5 mr-1" />
                    Edit Profile
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsDetailsOpen(false)}
                    className="text-xs font-semibold h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. MODAL: REGISTER NEW STUDENT */}
      {/* ========================================================================= */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-border/60 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Register New Student</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new institutional student record directly into PostgreSQL.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Roll Number *</label>
                <Input
                  required
                  placeholder="e.g. 26CSA99"
                  value={addForm.rollNumber}
                  onChange={(e) => setAddForm({ ...addForm, rollNumber: e.target.value.toUpperCase() })}
                  className="h-8.5 text-xs uppercase font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Full Name *</label>
                <Input
                  required
                  placeholder="Student's Name"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="h-8.5 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Email Address *</label>
              <Input
                required
                type="email"
                placeholder="student@cms.com"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value.toLowerCase() })}
                className="h-8.5 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Department *</label>
                <select
                  required
                  value={addForm.department}
                  onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                  className="h-8.5 w-full px-2 text-xs bg-background border border-border/60 rounded-md"
                >
                  {filterOptions.departments.map((d) => (
                    <option key={d.id} value={d.code}>
                      {d.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Semester</label>
                <select
                  value={addForm.semester}
                  onChange={(e) => {
                    const sem = parseInt(e.target.value, 10);
                    setAddForm({ ...addForm, semester: sem, year: Math.ceil(sem / 2) });
                  }}
                  className="h-8.5 w-full px-2 text-xs bg-background border border-border/60 rounded-md"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Section</label>
                <select
                  value={addForm.section}
                  onChange={(e) => setAddForm({ ...addForm, section: e.target.value })}
                  className="h-8.5 w-full px-2 text-xs bg-background border border-border/60 rounded-md"
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Student Category</label>
                <select
                  value={addForm.studentType}
                  onChange={(e) => setAddForm({ ...addForm, studentType: e.target.value })}
                  className="h-8.5 w-full px-2 text-xs bg-background border border-border/60 rounded-md"
                >
                  <option value="Day Scholar">Day Scholar</option>
                  <option value="Hostel">Hostel</option>
                  <option value="College Bus">College Bus</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Fee Status</label>
                <select
                  value={addForm.feeStatus}
                  onChange={(e) => setAddForm({ ...addForm, feeStatus: e.target.value })}
                  className="h-8.5 w-full px-2 text-xs bg-background border border-border/60 rounded-md"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="text-xs h-8.5 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingAdd}
                className="text-xs font-semibold h-8.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmittingAdd ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Plus className="size-3.5 mr-1" />}
                Register Student
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 7. MODAL: EDIT STUDENT */}
      {/* ========================================================================= */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-border/60 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Edit Student Record</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify student information for <strong className="text-foreground">{editForm.rollNumber}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Full Name *</label>
              <Input
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="h-8.5 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Email Address *</label>
              <Input
                required
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value.toLowerCase() })}
                className="h-8.5 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Department</label>
                <select
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  className="h-8.5 w-full px-2 text-xs bg-background border border-border/60 rounded-md"
                >
                  {filterOptions.departments.map((d) => (
                    <option key={d.id} value={d.code}>
                      {d.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Semester</label>
                <select
                  value={editForm.semester}
                  onChange={(e) => {
                    const sem = parseInt(e.target.value, 10);
                    setEditForm({ ...editForm, semester: sem, year: Math.ceil(sem / 2) });
                  }}
                  className="h-8.5 w-full px-2 text-xs bg-background border border-border/60 rounded-md"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Section</label>
                <select
                  value={editForm.section}
                  onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                  className="h-8.5 w-full px-2 text-xs bg-background border border-border/60 rounded-md"
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Category</label>
                <select
                  value={editForm.studentType}
                  onChange={(e) => setEditForm({ ...editForm, studentType: e.target.value })}
                  className="h-8.5 w-full px-2 text-xs bg-background border border-border/60 rounded-md"
                >
                  <option value="Day Scholar">Day Scholar</option>
                  <option value="Hostel">Hostel</option>
                  <option value="College Bus">College Bus</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">CGPA</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={editForm.cgpa}
                  onChange={(e) => setEditForm({ ...editForm, cgpa: e.target.value })}
                  className="h-8.5 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="h-8.5 w-full px-2 text-xs bg-background border border-border/60 rounded-md font-bold"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="text-xs h-8.5 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingEdit}
                className="text-xs font-semibold h-8.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmittingEdit ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Check className="size-3.5 mr-1" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 8. MODAL: SAFE DEACTIVATION CONFIRMATION */}
      {/* ========================================================================= */}
      <Dialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/60 shadow-2xl p-6">
          <DialogHeader>
            <div className="size-11 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
              <AlertTriangle className="size-5.5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Safely Deactivate Student?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to deactivate{" "}
              <strong className="text-foreground">{studentToDeactivate?.name}</strong> (
              <span className="font-mono text-foreground">{studentToDeactivate?.rollNumber}</span>)?
              <div className="mt-2.5 p-3 rounded-xl bg-muted/30 border border-border/50 text-[11px] space-y-1">
                <p className="font-semibold text-foreground">Database Safety Guarantee:</p>
                <p className="text-muted-foreground">
                  The student status will be updated to <strong className="text-foreground">'Inactive'</strong>. All historical attendance records, academic cohort linkages, and marks are strictly preserved.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeactivateOpen(false)}
              className="text-xs h-8.5 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmittingDeactivate}
              onClick={handleDeactivateSubmit}
              className="text-xs font-semibold h-8.5 rounded-lg bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmittingDeactivate ? (
                <Loader2 className="size-3.5 mr-1 animate-spin" />
              ) : (
                <UserX className="size-3.5 mr-1" />
              )}
              Confirm Deactivation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
