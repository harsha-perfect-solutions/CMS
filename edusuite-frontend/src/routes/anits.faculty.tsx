import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useRole } from "@/context/role-context";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
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

export const Route = createFileRoute("/anits/faculty")({
  head: () => ({
    meta: [{ title: "Faculty Management — ANITS" }],
  }),
  validateSearch: (search: Record<string, unknown>) => {
    return {
      search: (search.search as string) || undefined,
      department: (search.department as string) || undefined,
      status: (search.status as string) || undefined,
      page: search.page ? Number(search.page) : undefined,
      pageSize: search.pageSize ? Number(search.pageSize) : undefined,
      sortBy: (search.sortBy as string) || undefined,
      sortOrder: (search.sortOrder as "asc" | "desc") || undefined,
    };
  },
  component: AnitsFacultyPage,
});

function AnitsFacultyPage() {
  const searchParams = Route.useSearch();
  const { role } = useRole();

  const normRole = (role || "").toLowerCase();
  const isAdmin = ["super_admin", "superadmin", "admin", "principal", "academic_dean"].includes(normRole);

  // Summary Metrics from PostgreSQL
  const [summary, setSummary] = useState({
    totalFaculty: 0,
    activeFaculty: 0,
    departmentsCount: 0,
    assignedTimetableFaculty: 0,
  });

  // Filter options from PostgreSQL
  const [filterOptions, setFilterOptions] = useState<{
    departments: { id: string; code: string; name: string }[];
    statuses: string[];
  }>({
    departments: [],
    statuses: ["Active", "Inactive", "On Leave"],
  });

  // Active filters
  const [selectedDept, setSelectedDept] = useState(searchParams.department || "All");
  const [selectedStatus, setSelectedStatus] = useState(searchParams.status || "All");
  const [searchQuery, setSearchQuery] = useState(searchParams.search || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.search || "");

  // Directory Table State
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: searchParams.page || 1,
    pageSize: searchParams.pageSize || 25,
    total: 0,
    totalPages: 1,
  });
  const [sortBy, setSortBy] = useState(searchParams.sortBy || "name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(searchParams.sortOrder || "asc");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Modal States
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [facultyDetails, setFacultyDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Add Faculty Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    rollNumber: "",
    email: "",
    department: "",
    role: "faculty",
    status: "Active",
    password: "",
  });

  // Edit Faculty Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    rollNumber: "",
    email: "",
    department: "",
    role: "faculty",
    status: "Active",
  });

  // Deactivate Modal
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [facultyToDeactivate, setFacultyToDeactivate] = useState<any | null>(null);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination((p) => ({ ...p, page: 1 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch faculty directory & summary data
  const fetchData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setIsRefreshing(true);
      else setLoading(true);
      setHasError(false);

      try {
        const res = await api.get("/api/anits/super-admin/faculty", {
          params: {
            search: debouncedSearch.trim() || undefined,
            department: selectedDept !== "All" ? selectedDept : undefined,
            status: selectedStatus !== "All" ? selectedStatus : undefined,
            page: pagination.page,
            pageSize: pagination.pageSize,
            sortBy,
            sortOrder,
          },
        });

        if (res.data) {
          setSummary(res.data.summary || {
            totalFaculty: 0,
            activeFaculty: 0,
            departmentsCount: 0,
            assignedTimetableFaculty: 0,
          });

          if (res.data.filterOptions) {
            setFilterOptions(res.data.filterOptions);
          }

          setFacultyList(res.data.faculty || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      } catch (err: any) {
        console.error("Failed to load ANITS faculty data:", err);
        setHasError(true);
        toast.error("Unable to load faculty data from server.");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [debouncedSearch, selectedDept, selectedStatus, pagination.page, pagination.pageSize, sortBy, sortOrder]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch Faculty Details for Modal
  const openFacultyDetails = async (id: string) => {
    setSelectedFacultyId(id);
    setIsDetailsOpen(true);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/api/anits/super-admin/faculty/${id}`);
      setFacultyDetails(res.data);
    } catch (err: any) {
      console.error("Error loading faculty details:", err);
      toast.error("Failed to load faculty details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (f: any) => {
    setEditForm({
      id: f.id,
      name: f.name,
      rollNumber: f.rollNumber,
      email: f.email,
      department: f.department || "",
      role: f.role || "faculty",
      status: f.status || "Active",
    });
    setIsEditOpen(true);
  };

  // Open Deactivate Confirmation Modal
  const openDeactivateModal = (f: any) => {
    setFacultyToDeactivate(f);
    setIsDeactivateOpen(true);
  };

  // Handle Add Faculty Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.rollNumber.trim() || !addForm.email.trim() || !addForm.department) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmittingAdd(true);
    try {
      await api.post("/api/anits/super-admin/faculty", addForm);
      toast.success("Faculty member created successfully.");
      setIsAddOpen(false);
      setAddForm({
        name: "",
        rollNumber: "",
        email: "",
        department: "",
        role: "faculty",
        status: "Active",
        password: "",
      });
      fetchData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create faculty member.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handle Edit Faculty Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.rollNumber.trim() || !editForm.email.trim() || !editForm.department) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      await api.put(`/api/anits/super-admin/faculty/${editForm.id}`, editForm);
      toast.success("Faculty member updated successfully.");
      setIsEditOpen(false);
      fetchData(true);
      if (selectedFacultyId === editForm.id && isDetailsOpen) {
        openFacultyDetails(editForm.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update faculty member.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Safe Deactivation Submit
  const handleDeactivateSubmit = async () => {
    if (!facultyToDeactivate) return;
    setIsSubmittingDeactivate(true);
    try {
      const res = await api.delete(`/api/anits/super-admin/faculty/${facultyToDeactivate.id}`);
      toast.success(res.data?.message || "Faculty deactivated safely. Historical data preserved.");
      setIsDeactivateOpen(false);
      setFacultyToDeactivate(null);
      fetchData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to deactivate faculty.");
    } finally {
      setIsSubmittingDeactivate(false);
    }
  };

  // Handle CSV Export
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("cms_token") : null;
      const url = new URL("http://localhost:5000/api/anits/super-admin/faculty/export");
      if (debouncedSearch.trim()) url.searchParams.set("search", debouncedSearch.trim());
      if (selectedDept !== "All") url.searchParams.set("department", selectedDept);
      if (selectedStatus !== "All") url.searchParams.set("status", selectedStatus);

      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to export faculty directory");
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `ANITS_Faculty_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Faculty directory CSV exported successfully.");
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error("Failed to export faculty directory CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedDept("All");
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

  // Access check fallback
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-4">
        <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-600">
          <ShieldAlert className="size-8" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Access Restricted</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Institution-wide Faculty Management is restricted to ANITS Super Administrators. Your current role does not have authorization to access this module.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Section with Page Title and Global Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="size-6 text-blue-600 dark:text-blue-400" />
            Faculty Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Institution-wide ANITS faculty directory, academic assignments and timetable workload synchronized with PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => fetchData(true)}
            variant="outline"
            size="sm"
            disabled={isRefreshing || loading}
            className="h-9 px-3 text-xs gap-1.5 border-border/70"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            disabled={isExporting || loading || facultyList.length === 0}
            className="h-9 px-3 text-xs gap-1.5 border-border/70"
          >
            {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Export CSV
          </Button>

          <Button
            onClick={() => setIsAddOpen(true)}
            size="sm"
            className="h-9 px-3.5 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Plus className="size-3.5" />
            Add Faculty
          </Button>
        </div>
      </div>

      {/* 2. PostgreSQL Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Faculty */}
        <Card className="border-border/60 shadow-xs hover:border-border transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Faculty
            </CardTitle>
            <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-16 bg-muted/60 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-foreground tracking-tight">
                {summary.totalFaculty}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Active PostgreSQL faculty records
            </p>
          </CardContent>
        </Card>

        {/* Active Faculty */}
        <Card className="border-border/60 shadow-xs hover:border-border transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Faculty
            </CardTitle>
            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserCheck className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-16 bg-muted/60 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                {summary.activeFaculty}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Status = &apos;Active&apos; teaching faculty
            </p>
          </CardContent>
        </Card>

        {/* Departments */}
        <Card className="border-border/60 shadow-xs hover:border-border transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Departments
            </CardTitle>
            <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Building2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-16 bg-muted/60 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-foreground tracking-tight">
                {summary.departmentsCount}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Academic branches represented
            </p>
          </CardContent>
        </Card>

        {/* Assigned to Timetable */}
        <Card className="border-border/60 shadow-xs hover:border-border transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned to Timetable
            </CardTitle>
            <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Calendar className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-16 bg-muted/60 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-foreground tracking-tight">
                {summary.assignedTimetableFaculty}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Distinct faculty in MasterTimetable
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Server-Side Filter and Search Bar */}
      <Card className="border-border/60 shadow-xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search faculty by name, faculty ID, email..."
                className="pl-9 h-9 text-xs rounded-lg border-border/70"
              />
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="w-full h-9 px-3 text-xs rounded-lg border border-border/70 bg-background font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="All">All Departments</option>
                {filterOptions.departments.map((d) => (
                  <option key={d.id || d.code} value={d.code}>
                    {d.code} {d.name ? `— ${d.name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter & Reset */}
            <div className="flex items-center gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="w-full h-9 px-3 text-xs rounded-lg border border-border/70 bg-background font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="All">All Statuses</option>
                {filterOptions.statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {(selectedDept !== "All" || selectedStatus !== "All" || searchQuery.trim()) && (
                <Button
                  onClick={handleResetFilters}
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
                  title="Reset all filters"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Faculty Directory Table */}
      <Card className="border-border/60 shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Faculty Directory</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Showing {facultyList.length} of {pagination.total} registered faculty members
            </CardDescription>
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            Page {pagination.page} of {pagination.totalPages}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {hasError ? (
            <div className="p-8 text-center space-y-3">
              <AlertTriangle className="size-8 text-amber-500 mx-auto" />
              <p className="text-sm font-medium text-foreground">Unable to load faculty data.</p>
              <Button onClick={() => fetchData(true)} size="sm" variant="outline" className="h-8 text-xs">
                Retry
              </Button>
            </div>
          ) : loading && facultyList.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Loader2 className="size-8 text-primary animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground">Fetching PostgreSQL faculty directory...</p>
            </div>
          ) : facultyList.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users className="size-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-semibold text-foreground">
                {selectedDept !== "All"
                  ? "No faculty members found for this department."
                  : "No faculty records found."}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? "Try adjusting your search criteria or resetting filters."
                  : "There are currently no faculty members matching the selected parameters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                    <th
                      onClick={() => handleSort("rollNumber")}
                      className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                    >
                      Faculty ID {sortBy === "rollNumber" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      onClick={() => handleSort("name")}
                      className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                    >
                      Name {sortBy === "name" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      onClick={() => handleSort("department")}
                      className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                    >
                      Department {sortBy === "department" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="py-3 px-4">Designation / Role</th>
                    <th
                      onClick={() => handleSort("status")}
                      className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                    >
                      Status {sortBy === "status" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="py-3 px-4 text-center">Assigned Subjects</th>
                    <th className="py-3 px-4 text-center">Weekly Load</th>
                    <th className="py-3 px-4 text-center">Today&apos;s Classes</th>
                    <th className="py-3 px-4 text-center">Attendance Sessions</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {facultyList.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/40 transition-colors group">
                      {/* Faculty ID */}
                      <td className="py-3 px-4 font-mono font-medium text-foreground whitespace-nowrap">
                        {f.rollNumber}
                      </td>

                      {/* Name & Email */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                          {f.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{f.email}</div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="font-semibold text-[11px] bg-muted/40 border-border/70">
                          {f.department || "General"}
                        </Badge>
                      </td>

                      {/* Designation / Role */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="capitalize font-medium text-foreground">
                          {f.role === "hod" ? "Head of Department (HOD)" : "Assistant Professor"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold tracking-wide ${
                            f.status === "Active"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : f.status === "On Leave"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : "bg-red-500/10 text-red-600 border-red-500/30"
                          }`}
                        >
                          {f.status}
                        </Badge>
                      </td>

                      {/* Assigned Subjects */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-semibold text-foreground">{f.assignedSubjectsCount}</span>
                        {Boolean(f.assignedSections && (Array.isArray(f.assignedSections) ? f.assignedSections.length > 0 : String(f.assignedSections).length > 0)) && (
                          <div className="text-[10px] text-muted-foreground">
                            Sec {Array.isArray(f.assignedSections)
                              ? `${f.assignedSections.slice(0, 3).join(", ")}${f.assignedSections.length > 3 ? "..." : ""}`
                              : String(f.assignedSections)}
                          </div>
                        )}
                      </td>

                      {/* Weekly Load */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge variant="outline" className="text-[11px] font-medium bg-blue-500/5 text-blue-700 border-blue-200">
                          {f.weeklyTeachingLoad} hrs / wk
                        </Badge>
                      </td>

                      {/* Today's Classes */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            f.todayClassesCount > 0 ? "text-foreground font-bold" : "text-muted-foreground"
                          }`}
                        >
                          {f.todayClassesCount} periods
                        </span>
                      </td>

                      {/* Attendance Sessions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-medium text-foreground">{f.attendanceSessionsCount} logged</span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            onClick={() => openFacultyDetails(f.id)}
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                            title="View Faculty Details"
                          >
                            <Eye className="size-3.5" />
                          </Button>

                          <Button
                            onClick={() => openEditModal(f)}
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                            title="Edit Faculty"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>

                          {f.status === "Active" && (
                            <Button
                              onClick={() => openDeactivateModal(f)}
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                              title="Deactivate Faculty"
                            >
                              <UserX className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} faculty members
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pagination.pageSize}
                onChange={(e) =>
                  setPagination((p) => ({ ...p, pageSize: Number(e.target.value), page: 1 }))
                }
                className="h-8 px-2 text-xs rounded border border-border/70 bg-background text-foreground"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>

              <div className="flex items-center gap-1">
                <Button
                  onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                  disabled={pagination.page <= 1 || loading}
                  variant="outline"
                  size="icon"
                  className="size-8"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>

                <span className="px-2 text-xs font-medium">
                  {pagination.page} / {pagination.totalPages}
                </span>

                <Button
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))
                  }
                  disabled={pagination.page >= pagination.totalPages || loading}
                  variant="outline"
                  size="icon"
                  className="size-8"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 5. Modal: Faculty Details */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="size-5 text-blue-600" />
              Faculty Profile &amp; Academic Workload
            </DialogTitle>
            <DialogDescription className="text-xs">
              Live records synchronized with PostgreSQL MasterTimetable, SubjectAllocation, and AttendanceRecord.
            </DialogDescription>
          </DialogHeader>

          {loadingDetails || !facultyDetails ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="size-8 text-primary animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground">Loading PostgreSQL faculty record...</p>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {/* Profile Header Card */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">{facultyDetails.faculty.name}</h3>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        facultyDetails.faculty.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-300"
                          : "bg-red-500/10 text-red-600 border-red-300"
                      }`}
                    >
                      {facultyDetails.faculty.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 space-x-2">
                    <span className="font-mono font-medium">{facultyDetails.faculty.rollNumber}</span>
                    <span>&middot;</span>
                    <span>{facultyDetails.faculty.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-semibold text-xs bg-background">
                    Dept: {facultyDetails.faculty.department}
                  </Badge>
                  <Badge variant="outline" className="font-semibold text-xs capitalize bg-blue-50 text-blue-700 border-blue-200">
                    {facultyDetails.faculty.role === "hod" ? "HOD" : "Faculty"}
                  </Badge>
                </div>
              </div>

              {/* Metrics Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-lg border bg-background">
                  <div className="text-xs text-muted-foreground">Weekly Load</div>
                  <div className="text-lg font-bold text-foreground mt-0.5">
                    {facultyDetails.workload.weeklyTeachingLoadHours} hrs
                  </div>
                  <div className="text-[10px] text-muted-foreground">{facultyDetails.workload.totalTimetableSlots} slots/wk</div>
                </div>

                <div className="p-3 rounded-lg border bg-background">
                  <div className="text-xs text-muted-foreground">Subject Allocations</div>
                  <div className="text-lg font-bold text-foreground mt-0.5">
                    {facultyDetails.workload.allocatedSubjectsCount}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Active subjects</div>
                </div>

                <div className="p-3 rounded-lg border bg-background">
                  <div className="text-xs text-muted-foreground">Today&apos;s Schedule</div>
                  <div className="text-lg font-bold text-foreground mt-0.5">
                    {facultyDetails.todaySchedule.length} classes
                  </div>
                  <div className="text-[10px] text-muted-foreground">{facultyDetails.todayDay}</div>
                </div>

                <div className="p-3 rounded-lg border bg-background">
                  <div className="text-xs text-muted-foreground">Attendance Sessions</div>
                  <div className="text-lg font-bold text-foreground mt-0.5">
                    {facultyDetails.attendanceSummary.distinctSessionsSubmitted}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{facultyDetails.attendanceSummary.totalRecordsLogged} records</div>
                </div>
              </div>

              {/* Tabs for Timetable, Allocations, and Today's Schedule */}
              <Tabs defaultValue="timetable" className="w-full">
                <TabsList className="grid grid-cols-3 w-full h-9">
                  <TabsTrigger value="timetable" className="text-xs">
                    Master Timetable ({facultyDetails.timetable.length})
                  </TabsTrigger>
                  <TabsTrigger value="allocations" className="text-xs">
                    Subject Allocations ({facultyDetails.allocations.length})
                  </TabsTrigger>
                  <TabsTrigger value="today" className="text-xs">
                    Today&apos;s Sessions ({facultyDetails.todaySchedule.length})
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Master Timetable */}
                <TabsContent value="timetable" className="space-y-3 pt-2">
                  {facultyDetails.timetable.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground border rounded-lg">
                      No timetable slots currently assigned in MasterTimetable.
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-muted/40 border-b text-muted-foreground font-semibold">
                            <th className="p-2.5">Day</th>
                            <th className="p-2.5">Period</th>
                            <th className="p-2.5">Time</th>
                            <th className="p-2.5">Course</th>
                            <th className="p-2.5">Section</th>
                            <th className="p-2.5">Room</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {facultyDetails.timetable.map((slot: any) => (
                            <tr key={slot.id} className="hover:bg-muted/20">
                              <td className="p-2.5 font-semibold text-foreground">{slot.dayOfWeek}</td>
                              <td className="p-2.5">Period {slot.periodNumber}</td>
                              <td className="p-2.5 text-muted-foreground font-mono text-[11px]">
                                {slot.startTime} - {slot.endTime}
                              </td>
                              <td className="p-2.5">
                                <span className="font-semibold text-foreground">{slot.course?.code || "—"}</span>
                                <div className="text-[10px] text-muted-foreground">{slot.course?.name}</div>
                              </td>
                              <td className="p-2.5 font-medium">Sec {slot.section || "A"}</td>
                              <td className="p-2.5 text-muted-foreground">{slot.room || "Room TBA"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                {/* Tab: Subject Allocations */}
                <TabsContent value="allocations" className="space-y-3 pt-2">
                  {facultyDetails.allocations.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground border rounded-lg">
                      No formal subject allocations recorded in SubjectAllocation.
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-muted/40 border-b text-muted-foreground font-semibold">
                            <th className="p-2.5">Course Code</th>
                            <th className="p-2.5">Course Name</th>
                            <th className="p-2.5">Section</th>
                            <th className="p-2.5">Academic Year</th>
                            <th className="p-2.5">Semester</th>
                            <th className="p-2.5 text-center">Weekly Periods</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {facultyDetails.allocations.map((alloc: any) => (
                            <tr key={alloc.id} className="hover:bg-muted/20">
                              <td className="p-2.5 font-mono font-semibold text-foreground">
                                {alloc.course?.code || "—"}
                              </td>
                              <td className="p-2.5 font-medium text-foreground">{alloc.course?.name || "—"}</td>
                              <td className="p-2.5 font-medium">Sec {alloc.section || "A"}</td>
                              <td className="p-2.5 text-muted-foreground">{alloc.academicYear}</td>
                              <td className="p-2.5 text-muted-foreground">Sem {alloc.semester || "—"}</td>
                              <td className="p-2.5 text-center font-semibold text-blue-600">
                                {alloc.weeklyLoad || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                {/* Tab: Today's Schedule */}
                <TabsContent value="today" className="space-y-3 pt-2">
                  {facultyDetails.todaySchedule.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground border rounded-lg">
                      No classes scheduled for today ({facultyDetails.todayDay}).
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-muted/40 border-b text-muted-foreground font-semibold">
                            <th className="p-2.5">Period</th>
                            <th className="p-2.5">Time</th>
                            <th className="p-2.5">Course</th>
                            <th className="p-2.5">Section</th>
                            <th className="p-2.5">Room</th>
                            <th className="p-2.5 text-right">Attendance Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {facultyDetails.todaySchedule.map((cls: any) => (
                            <tr key={cls.id} className="hover:bg-muted/20">
                              <td className="p-2.5 font-semibold text-foreground">Period {cls.periodNumber}</td>
                              <td className="p-2.5 font-mono text-muted-foreground text-[11px]">
                                {cls.startTime} - {cls.endTime}
                              </td>
                              <td className="p-2.5">
                                <span className="font-semibold text-foreground">{cls.course?.code}</span>
                                <span className="text-[11px] text-muted-foreground ml-1.5">{cls.course?.name}</span>
                              </td>
                              <td className="p-2.5 font-medium">Sec {cls.section || "A"}</td>
                              <td className="p-2.5 text-muted-foreground">{cls.room || "TBA"}</td>
                              <td className="p-2.5 text-right">
                                {cls.isAttendanceSubmitted ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-300 text-[10px]">
                                    <CheckCircle2 className="size-3 mr-1" /> Submitted
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300 text-[10px]">
                                    <Clock className="size-3 mr-1" /> Pending
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsDetailsOpen(false)} variant="outline" size="sm" className="h-8 text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Modal: Add Faculty */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Plus className="size-4 text-blue-600" />
                Add New Faculty Member
              </DialogTitle>
              <DialogDescription className="text-xs">
                Create a faculty profile directly in the PostgreSQL Faculty table.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Dr. K. Ramesh"
                  className="h-8.5 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Faculty ID / Roll Number <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={addForm.rollNumber}
                  onChange={(e) => setAddForm((f) => ({ ...f, rollNumber: e.target.value }))}
                  placeholder="e.g. FAC-CSE-099"
                  className="h-8.5 text-xs uppercase"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Institutional Email <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="e.g. ramesh.cse@anits.edu.in"
                  className="h-8.5 text-xs lowercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={addForm.department}
                    onChange={(e) => setAddForm((f) => ({ ...f, department: e.target.value }))}
                    className="w-full h-8.5 px-2.5 text-xs rounded-md border border-border/70 bg-background text-foreground"
                  >
                    <option value="">Select Dept</option>
                    {filterOptions.departments.map((d) => (
                      <option key={d.id || d.code} value={d.code}>
                        {d.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Role</label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full h-8.5 px-2.5 text-xs rounded-md border border-border/70 bg-background text-foreground"
                  >
                    <option value="faculty">Faculty / Staff</option>
                    <option value="hod">Head of Dept (HOD)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Status</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full h-8.5 px-2.5 text-xs rounded-md border border-border/70 bg-background text-foreground"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Initial Password</label>
                  <Input
                    type="password"
                    value={addForm.password}
                    onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Defaults to Faculty@123"
                    className="h-8.5 text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                onClick={() => setIsAddOpen(false)}
                variant="outline"
                size="sm"
                className="h-8.5 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingAdd}
                size="sm"
                className="h-8.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmittingAdd ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                Save Faculty
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. Modal: Edit Faculty */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Edit2 className="size-4 text-amber-600" />
                Edit Faculty Profile
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update authorized institutional faculty details in PostgreSQL.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-8.5 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Faculty ID / Roll Number <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={editForm.rollNumber}
                  onChange={(e) => setEditForm((f) => ({ ...f, rollNumber: e.target.value }))}
                  className="h-8.5 text-xs uppercase"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Institutional Email <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="h-8.5 text-xs lowercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={editForm.department}
                    onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                    className="w-full h-8.5 px-2.5 text-xs rounded-md border border-border/70 bg-background text-foreground"
                  >
                    <option value="">Select Dept</option>
                    {filterOptions.departments.map((d) => (
                      <option key={d.id || d.code} value={d.code}>
                        {d.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full h-8.5 px-2.5 text-xs rounded-md border border-border/70 bg-background text-foreground"
                  >
                    <option value="faculty">Faculty / Staff</option>
                    <option value="hod">Head of Dept (HOD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full h-8.5 px-2.5 text-xs rounded-md border border-border/70 bg-background text-foreground"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                onClick={() => setIsEditOpen(false)}
                variant="outline"
                size="sm"
                className="h-8.5 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingEdit}
                size="sm"
                className="h-8.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isSubmittingEdit ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                Update Faculty
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 8. Modal: Safe Deactivate Confirmation */}
      <Dialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-red-600">
              <UserX className="size-4" />
              Deactivate Faculty Member
            </DialogTitle>
            <DialogDescription className="text-xs">
              Historical academic retention policy: This will mark the faculty member as Inactive rather than hard-deleting records.
            </DialogDescription>
          </DialogHeader>

          {facultyToDeactivate && (
            <div className="py-3 text-xs space-y-3">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200">
                <p className="font-semibold">Safe Deactivation Policy:</p>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Historical attendance entries ({facultyToDeactivate.attendanceSessionsCount || 0} sessions), timetable schedules ({facultyToDeactivate.weeklyTeachingLoad || 0} weekly periods), and subject allocations will remain completely intact in PostgreSQL.
                </p>
              </div>

              <p className="text-foreground">
                Are you sure you want to deactivate{" "}
                <span className="font-bold">{facultyToDeactivate.name}</span> ({facultyToDeactivate.rollNumber})?
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              onClick={() => setIsDeactivateOpen(false)}
              variant="outline"
              size="sm"
              className="h-8.5 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeactivateSubmit}
              disabled={isSubmittingDeactivate}
              size="sm"
              className="h-8.5 text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmittingDeactivate ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Confirm Deactivation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
