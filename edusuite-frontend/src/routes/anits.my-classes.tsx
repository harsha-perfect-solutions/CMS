import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRole } from "@/context/role-context";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  BookOpen,
  Layers,
  GraduationCap,
  Building2,
  Search,
  Download,
  RefreshCw,
  Loader2,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  UserCheck,
  MapPin,
  Users,
  Eye,
  CheckCircle2,
  AlertTriangle,
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
} from "@/components/ui/dialog";
import {
  FacultyClassesService,
  type FacultyClassItem,
  type FacultyClassesResponse,
  type EnrolledStudent,
} from "@/services/FacultyClassesService";

export const Route = createFileRoute("/anits/my-classes")({
  head: () => ({
    meta: [{ title: "My Classes & Sections — ANITS" }],
  }),
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || undefined,
      department: (search.department as string) || undefined,
      section: (search.section as string) || undefined,
      semester: (search.semester as string) || undefined,
    };
  },
  component: AnitsClassesAndCohortsPage,
});

// =========================================================================
// FACULTY WORKSPACE: MY CLASSES & SECTIONS (AUTHORITATIVE MASTER TIMETABLE)
// =========================================================================
function FacultyMyClassesWorkspace() {
  const navigate = useNavigate();
  const { role } = useRole();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [data, setData] = useState<FacultyClassesResponse | null>(null);

  // Faculty-scoped filters
  const [selectedSemester, setSelectedSemester] = useState<string>("All");
  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [selectedCourse, setSelectedCourse] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Roster Modal state
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [selectedClassForRoster, setSelectedClassForRoster] = useState<FacultyClassItem | null>(null);
  const [rosterSearch, setRosterSearch] = useState("");

  const loadClasses = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await FacultyClassesService.fetchMyClasses();
      setData(res);
      if (isRefresh) {
        toast.success("Synchronized with ANITS Master Timetable.");
      }
    } catch (err: any) {
      const msg = err.message || "Unable to load your classes.";
      setError(msg);
      toast.error("Failed to load classes", { description: msg });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await FacultyClassesService.exportMyClassesCsv();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `my_classes_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("My Classes CSV exported successfully.");
    } catch (err: any) {
      toast.error("Failed to export classes CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  const classes = data?.classes || [];

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      // Semester filter
      if (selectedSemester !== "All" && String(c.semester) !== selectedSemester) {
        return false;
      }
      // Section filter
      if (selectedSection !== "All") {
        const cleanReq = selectedSection.replace(/^Section\s+/i, "").trim().toUpperCase();
        if (c.cleanSection !== cleanReq && c.section !== selectedSection) {
          return false;
        }
      }
      // Course filter
      if (selectedCourse !== "All") {
        if (c.courseCode !== selectedCourse && c.courseId !== selectedCourse) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = c.courseCode.toLowerCase().includes(q);
        const matchesName = c.courseName.toLowerCase().includes(q);
        const matchesSec = c.section.toLowerCase().includes(q) || c.cleanSection.toLowerCase().includes(q);
        const matchesRoom = (c.roomNo || "").toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesSec && !matchesRoom) {
          return false;
        }
      }
      return true;
    });
  }, [classes, selectedSemester, selectedSection, selectedCourse, searchQuery]);

  const hasActiveFilters =
    selectedSemester !== "All" ||
    selectedSection !== "All" ||
    selectedCourse !== "All" ||
    searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setSelectedSemester("All");
    setSelectedSection("All");
    setSelectedCourse("All");
    setSearchQuery("");
  };

  const studentsInSelectedClass = useMemo(() => {
    if (!selectedClassForRoster || !data?.students) return [];
    return data.students.filter((s) => {
      const cleanSec = (s.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase();
      const matchesSection = cleanSec === selectedClassForRoster.cleanSection;
      const matchesSemester =
        Number(s.semester) === selectedClassForRoster.semester ||
        String(s.semester).includes(String(selectedClassForRoster.semester));
      return matchesSection && matchesSemester;
    });
  }, [selectedClassForRoster, data?.students]);

  const filteredRosterStudents = useMemo(() => {
    if (!rosterSearch.trim()) return studentsInSelectedClass;
    const q = rosterSearch.toLowerCase().trim();
    return studentsInSelectedClass.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }, [studentsInSelectedClass, rosterSearch]);

  const facultyName = data?.faculty?.name || "Dr. Ravi Kumar";
  const facultyDept = data?.faculty?.department || "CSE";
  const academicYear = data?.academicYear || "2026-27";

  const summary = data?.summary || {
    myCourses: 0,
    mySections: 0,
    assignedStudents: 0,
    weeklyPeriods: 0,
  };

  // 1. Loading Skeleton State
  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-card p-5 rounded-xl border border-border/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-56 bg-muted/60 rounded-md" />
            <div className="h-3.5 w-80 bg-muted/40 rounded-md" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-muted/50 rounded-lg" />
            <div className="h-8 w-24 bg-muted/50 rounded-lg" />
          </div>
        </div>

        {/* 4 Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 rounded-xl border-border/60">
              <div className="h-4 w-24 bg-muted/50 rounded mb-3" />
              <div className="h-8 w-16 bg-muted/70 rounded mb-2" />
              <div className="h-3 w-32 bg-muted/40 rounded" />
            </Card>
          ))}
        </div>

        {/* Filter Skeleton */}
        <Card className="p-4 rounded-xl border-border/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 bg-muted/40 rounded-lg" />
            ))}
          </div>
        </Card>

        {/* Ledger Skeleton */}
        <Card className="p-6 rounded-xl border-border/60 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted/30 rounded-xl" />
          ))}
        </Card>
      </div>
    );
  }

  // 2. Error State
  if (error && !data) {
    return (
      <div className="p-12 text-center bg-card rounded-2xl border border-destructive/30 space-y-4 max-w-lg mx-auto mt-8">
        <AlertTriangle className="size-10 text-destructive mx-auto" />
        <h3 className="font-bold text-base text-foreground">Unable to load your classes</h3>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button
          onClick={() => loadClasses(false)}
          className="rounded-xl text-xs bg-primary text-primary-foreground font-semibold"
        >
          <RotateCcw className="size-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header: Personal Faculty Workspace */}
      <div className="bg-card p-5 rounded-xl border border-border/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-foreground tracking-tight">
              MY CLASSES &amp; SECTIONS
            </h1>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
              PostgreSQL Live
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 font-semibold">
              {facultyDept} Department
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Classes and student cohorts assigned to <span className="font-bold text-foreground">{facultyName}</span> from the ANITS Master Timetable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="h-8 text-xs font-semibold rounded-lg gap-1.5 border-border/60 hover:bg-muted/40"
          >
            {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5 text-muted-foreground" />}
            Export CSV
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => loadClasses(true)}
            disabled={isRefreshing}
            className="h-8 text-xs font-semibold rounded-lg gap-1.5 bg-[#0A1128] hover:bg-[#121B3B] text-white"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 2. Four PostgreSQL-Driven Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: MY COURSES */}
        <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Courses</span>
            <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <BookOpen className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground mt-2">
            {summary.myCourses}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Distinct course curriculums taught
          </p>
        </Card>

        {/* CARD 2: MY SECTIONS */}
        <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Sections</span>
            <div className="size-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground mt-2">
            {summary.mySections}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Active cohort divisions taught
          </p>
        </Card>

        {/* CARD 3: ASSIGNED STUDENTS */}
        <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Students</span>
            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Users className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground mt-2">
            {summary.assignedStudents}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Distinct enrolled cohort students
          </p>
        </Card>

        {/* CARD 4: WEEKLY LOAD */}
        <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Weekly Load</span>
            <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground mt-2">
            {summary.weeklyPeriods} <span className="text-sm font-semibold text-muted-foreground">Periods/Wk</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Scheduled in MasterTimetable
          </p>
        </Card>
      </div>

      {/* 3. Faculty-Scoped Filters (NO 'All Departments' filter!) */}
      <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course, section, room..."
              className="h-8 pl-8 text-xs rounded-lg border-border/60 bg-background"
            />
          </div>

          {/* Academic Year */}
          <div>
            <select
              value={academicYear}
              disabled
              className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/60 bg-muted/40 font-medium text-foreground cursor-not-allowed opacity-90"
            >
              <option value="2026-27">Academic Year: 2026-27</option>
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/60 bg-background font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All My Semesters</option>
              {data?.filterOptions?.semesters.map((sem) => (
                <option key={sem} value={String(sem)}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/60 bg-background font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All My Sections</option>
              {data?.filterOptions?.sections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Course Filter */}
          <div>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/60 bg-background font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All My Courses</option>
              {data?.filterOptions?.courses.map((crs) => (
                <option key={crs.id || crs.code} value={crs.code}>
                  {crs.code} — {crs.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reset Filter Action */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40 text-xs">
            <span className="text-muted-foreground">
              Filtered to <span className="font-semibold text-foreground">{filteredClasses.length}</span> of{" "}
              <span className="font-semibold text-foreground">{classes.length}</span> classes
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="size-3" />
              Reset Filters
            </Button>
          </div>
        )}
      </Card>

      {/* 4. Class & Section Ledger */}
      <Card className="rounded-xl border-border/60 overflow-hidden shadow-xs bg-card">
        <CardHeader className="bg-muted/15 border-b border-border/40 py-3.5 px-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">My Class &amp; Section Ledger</CardTitle>
            <CardDescription className="text-xs">
              Showing {filteredClasses.length} of {classes.length} classes
            </CardDescription>
          </div>
          <div className="text-xs text-muted-foreground">
            Academic Year: <span className="font-semibold text-foreground">{academicYear}</span>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {classes.length === 0 ? (
            <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
              <BookOpen className="size-8 text-muted-foreground/40 mx-auto" />
              <p className="font-semibold text-foreground text-sm">No classes are currently assigned to you.</p>
              <p className="text-[11px] max-w-sm mx-auto">
                Your classes will appear here automatically once teaching sessions are assigned in the ANITS Master Timetable.
              </p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
              <AlertTriangle className="size-7 text-amber-500 mx-auto opacity-80" />
              <p className="font-semibold text-foreground text-sm">No classes or sections match the selected filters.</p>
              <p className="text-[11px]">Try resetting filters or searching with a different term.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="mt-2 text-xs rounded-lg"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClasses.map((c) => {
                const isLabCourse = c.isLab || c.courseType === "Lab";
                return (
                  <div
                    key={c.id}
                    className="p-5 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between gap-4"
                  >
                    <div>
                      {/* Top row: Badges and Course Code */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-foreground">
                            {c.courseCode}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              isLabCourse
                                ? "bg-purple-500/10 text-purple-700 border-purple-500/20"
                                : "bg-blue-500/10 text-blue-700 border-blue-500/20"
                            }`}
                          >
                            {isLabCourse ? "Lab" : "Theory"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground font-medium">
                            {c.credits} Credits
                          </Badge>
                        </div>
                        <Badge variant="secondary" className="text-[11px] font-bold bg-primary/10 text-primary">
                          {c.section}
                        </Badge>
                      </div>

                      {/* Course Title */}
                      <h3 className="font-bold text-sm text-foreground mb-3 line-clamp-1">
                        {c.courseName}
                      </h3>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs py-2.5 px-3 rounded-lg bg-muted/20 border border-border/30">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Department &amp; Sem</span>
                          <span className="font-semibold text-foreground">
                            {c.department} &bull; Sem {c.semester}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Weekly Periods</span>
                          <span className="font-semibold text-foreground">
                            {c.periodsPerWeek} {c.periodsPerWeek === 1 ? "Period" : "Periods"}/week
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Assigned Room(s)</span>
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <MapPin className="size-3 text-muted-foreground inline" />
                            {c.roomNo || "Room A-302"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Student Roster</span>
                          <span className="font-semibold text-foreground">
                            {c.hasEnrollmentData && c.studentCount > 0 ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold px-1.5 py-0">
                                {c.studentCount} Students
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-amber-600 italic">
                                Enrollment data unavailable
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedClassForRoster(c);
                          setRosterSearch("");
                          setRosterModalOpen(true);
                        }}
                        className="flex-1 h-8 text-xs font-semibold rounded-lg gap-1.5 border-border/60 hover:bg-muted/40"
                      >
                        <Users className="size-3.5 text-muted-foreground" />
                        View Students
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigate({ to: "/anits/timetable" });
                        }}
                        className="flex-1 h-8 text-xs font-semibold rounded-lg gap-1.5 border-border/60 hover:bg-muted/40"
                      >
                        <Calendar className="size-3.5 text-muted-foreground" />
                        View Timetable
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          navigate({
                            to: "/anits/attendance",
                            search: {
                              timetableId: c.timetableId,
                              tab: "mark",
                            },
                          });
                        }}
                        className="flex-1 h-8 text-xs font-semibold rounded-lg gap-1.5 bg-[#0A1128] hover:bg-[#121B3B] text-white shadow-xs"
                      >
                        <UserCheck className="size-3.5" />
                        Take Attendance
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. View Students Roster Modal */}
      <Dialog open={rosterModalOpen} onOpenChange={setRosterModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
          <DialogHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                Class Roster &bull; {selectedClassForRoster?.courseCode} — {selectedClassForRoster?.courseName}
              </DialogTitle>
              <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary">
                {selectedClassForRoster?.section}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Showing enrolled students for {selectedClassForRoster?.department} Semester {selectedClassForRoster?.semester} ({selectedClassForRoster?.section}) from PostgreSQL.
            </DialogDescription>
          </DialogHeader>

          {/* Search inside Modal */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search students by name, roll number, email..."
                className="h-8 pl-8 text-xs rounded-lg border-border/60 bg-background"
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {filteredRosterStudents.length} of {studentsInSelectedClass.length} Students
            </span>
          </div>

          {/* Students Table */}
          <div className="flex-1 overflow-y-auto border border-border/40 rounded-xl">
            {studentsInSelectedClass.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
                <Users className="size-8 text-muted-foreground/40 mx-auto" />
                <p className="font-semibold text-foreground">Enrollment data currently unavailable</p>
                <p className="text-[11px]">
                  No student records were found matching {selectedClassForRoster?.department} Semester {selectedClassForRoster?.semester} {selectedClassForRoster?.section}.
                </p>
              </div>
            ) : filteredRosterStudents.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">No students matched "{rosterSearch}"</p>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 text-muted-foreground font-semibold border-b border-border/40 sticky top-0 bg-background z-10">
                  <tr>
                    <th className="px-4 py-2.5">Roll No</th>
                    <th className="px-4 py-2.5">Student Name</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5 text-center">Attendance</th>
                    <th className="px-4 py-2.5 text-center">CGPA</th>
                    <th className="px-4 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {filteredRosterStudents.map((s) => {
                    const attPct = s.attendance?.percentage ?? 85;
                    const isShortage = attPct < 75;
                    return (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-mono font-bold text-foreground">
                          {s.rollNumber}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                              {s.name.slice(0, 1)}
                            </div>
                            <span className="font-semibold text-foreground">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-[11px]">
                          {s.email}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              isShortage
                                ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                            }`}
                          >
                            {attPct}%
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center font-semibold text-foreground">
                          {s.cgpa.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          >
                            {s.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="pt-3 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRosterModalOpen(false)}
              className="text-xs rounded-lg"
            >
              Close Roster
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnitsClassesAndCohortsPage() {
  const { role } = useRole();
  const normRole = (role || "").toLowerCase();
  const isAdmin = ["super_admin", "superadmin", "admin", "principal", "academic_dean"].includes(normRole);

  if (!isAdmin) {
    return <FacultyMyClassesWorkspace />;
  }

  return <AdminClassesAndCohortsDirectory />;
}

// =========================================================================
// SUPER ADMIN: INSTITUTION-WIDE CLASSES & STUDENT COHORTS DIRECTORY
// =========================================================================
function AdminClassesAndCohortsDirectory() {
  const searchParams = Route.useSearch();
  const { role, department } = useRole();

  const normRole = (role || "").toLowerCase();
  const isAdmin = ["super_admin", "superadmin", "admin", "principal", "academic_dean"].includes(normRole);

  const [activeTab, setActiveTab] = useState(searchParams.tab || "classes");

  // Summary Metrics
  const [summary, setSummary] = useState({
    activeCourses: 0,
    activeClasses: 0,
    enrolledStudents: 0,
    activeCohortStudents: 0,
    departmentsCount: 0,
    academicYear: "2026-27",
  });

  // Filter Options
  const [filterOptions, setFilterOptions] = useState<{
    departments: { id: string; code: string; name: string }[];
    courses: { id: string; code: string; name: string; department?: string }[];
    sections: string[];
    semesters: number[];
  }>({
    departments: [],
    courses: [],
    sections: [],
    semesters: [],
  });

  // Active Filters
  const [selectedDept, setSelectedDept] = useState(searchParams.department || "All");
  const [selectedSemester, setSelectedSemester] = useState(searchParams.semester || "All");
  const [selectedSection, setSelectedSection] = useState(searchParams.section || "All");
  const [selectedCourse, setSelectedCourse] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Directory Table State
  const [classes, setClasses] = useState<any[]>([]);
  const [classesPagination, setClassesPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [sortBy, setSortBy] = useState("courseCode");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Student Roster Tab State
  const [students, setStudents] = useState<any[]>([]);
  const [studentsPagination, setStudentsPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
  });
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  // Class Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
  const [classDetail, setClassDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<"timetable" | "attendance" | "roster">("timetable");

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Classes Directory
  const fetchClasses = useCallback(async () => {
    try {
      setLoadingClasses(true);
      const params = new URLSearchParams();
      params.set("page", String(classesPagination.page));
      params.set("pageSize", String(classesPagination.pageSize));
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      if (selectedDept && selectedDept !== "All") params.set("department", selectedDept);
      if (selectedSemester && selectedSemester !== "All") params.set("semester", selectedSemester);
      if (selectedSection && selectedSection !== "All") params.set("section", selectedSection);
      if (selectedCourse && selectedCourse !== "All") params.set("courseId", selectedCourse);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await api.get(`/api/anits/super-admin/classes?${params.toString()}`);
      if (res.data) {
        setSummary(res.data.summary || {});
        setFilterOptions(res.data.filterOptions || { departments: [], courses: [], sections: [], semesters: [] });
        setClasses(res.data.classes || []);
        if (res.data.pagination) {
          setClassesPagination((prev) => ({
            ...prev,
            total: res.data.pagination.total,
            totalPages: res.data.pagination.totalPages,
          }));
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to load classes & cohorts data.");
    } finally {
      setLoadingClasses(false);
      setIsRefreshing(false);
    }
  }, [
    classesPagination.page,
    classesPagination.pageSize,
    sortBy,
    sortOrder,
    selectedDept,
    selectedSemester,
    selectedSection,
    selectedCourse,
    debouncedSearch,
  ]);

  // Fetch Student Roster for Tab 2
  const fetchStudents = useCallback(async () => {
    try {
      setLoadingStudents(true);
      const params = new URLSearchParams();
      params.set("page", String(studentsPagination.page));
      params.set("pageSize", String(studentsPagination.pageSize));
      if (selectedDept && selectedDept !== "All") params.set("department", selectedDept);
      if (selectedSemester && selectedSemester !== "All") params.set("semester", selectedSemester);
      if (selectedSection && selectedSection !== "All") params.set("section", selectedSection);
      if (studentSearch) params.set("search", studentSearch);

      const res = await api.get(`/api/anits/super-admin/classes/roster?${params.toString()}`);
      if (res.data) {
        setStudents(res.data.students || []);
        if (res.data.pagination) {
          setStudentsPagination((prev) => ({
            ...prev,
            total: res.data.pagination.total,
            totalPages: res.data.pagination.totalPages,
          }));
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to load student directory.");
    } finally {
      setLoadingStudents(false);
    }
  }, [
    studentsPagination.page,
    studentsPagination.pageSize,
    selectedDept,
    selectedSemester,
    selectedSection,
    studentSearch,
  ]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    if (activeTab === "students") {
      fetchStudents();
    }
  }, [activeTab, fetchStudents]);

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchClasses();
    if (activeTab === "students") {
      fetchStudents();
    }
    toast.success("Synchronized with PostgreSQL.");
  };

  // Export CSV handler
  const handleExport = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (selectedDept && selectedDept !== "All") params.set("department", selectedDept);
      if (selectedSemester && selectedSemester !== "All") params.set("semester", selectedSemester);
      if (selectedSection && selectedSection !== "All") params.set("section", selectedSection);
      if (selectedCourse && selectedCourse !== "All") params.set("courseId", selectedCourse);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const response = await api.get(`/api/anits/super-admin/classes/export?${params.toString()}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `anits_classes_and_cohorts_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Exported classes & cohorts successfully.");
    } catch (err: any) {
      toast.error("Failed to export classes CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedDept("All");
    setSelectedSemester("All");
    setSelectedSection("All");
    setSelectedCourse("All");
    setSearchQuery("");
    setDebouncedSearch("");
    setClassesPagination((p) => ({ ...p, page: 1 }));
  };

  // Open Class Details Modal
  const handleOpenDetail = async (classKey: string) => {
    setSelectedClassKey(classKey);
    setDetailModalOpen(true);
    setDetailTab("timetable");
    setLoadingDetail(true);
    try {
      const res = await api.get(`/api/anits/super-admin/classes/detail?classKey=${encodeURIComponent(classKey)}`);
      setClassDetail(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to load class details.");
      setDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="bg-card p-5 rounded-xl border border-border/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Classes &amp; Student Cohorts
            </h1>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
              PostgreSQL Live
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Institution-wide ANITS classes, sections and student cohorts synchronized with PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="h-8 text-xs font-semibold rounded-lg gap-1.5 border-border/60"
          >
            {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5 text-muted-foreground" />}
            Export CSV
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 text-xs font-semibold rounded-lg gap-1.5 bg-[#0A1128] hover:bg-[#121B3B] text-white"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 2. Four PostgreSQL-Driven Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Active Courses</span>
            <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <BookOpen className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground mt-2">
            {loadingClasses ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : summary.activeCourses}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Synchronized with Course catalog
          </p>
        </Card>

        <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Active Classes / Sections</span>
            <div className="size-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground mt-2">
            {loadingClasses ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : summary.activeClasses}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Distinct cohorts in MasterTimetable
          </p>
        </Card>

        <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Enrolled Students</span>
            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <GraduationCap className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground mt-2">
            {loadingClasses ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : summary.enrolledStudents}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {summary.activeCohortStudents} in active term cohorts
          </p>
        </Card>

        <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Departments</span>
            <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Building2 className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground mt-2">
            {loadingClasses ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : summary.departmentsCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            All Engineering Divisions
          </p>
        </Card>
      </div>

      {/* 3. Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/60 p-1 border border-border/40 rounded-xl">
            <TabsTrigger value="classes" className="rounded-lg text-xs font-semibold px-4 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs">
              <Layers className="size-3.5 mr-1.5" />
              Class &amp; Cohort Directory
            </TabsTrigger>
            <TabsTrigger value="students" className="rounded-lg text-xs font-semibold px-4 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs">
              <Users className="size-3.5 mr-1.5" />
              Student Roster Directory
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: CLASS & COHORT DIRECTORY */}
        {/* ================================================================= */}
        <TabsContent value="classes" className="space-y-4 m-0">
          {/* Filter Bar */}
          <Card className="rounded-xl border-border/60 p-4 shadow-xs bg-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setClassesPagination((p) => ({ ...p, page: 1 }));
                  }}
                  placeholder="Search code, title, faculty..."
                  className="h-8 pl-8 text-xs rounded-lg border-border/60"
                />
              </div>

              {/* Department Filter */}
              <div>
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setClassesPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/60 bg-background font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="All">All Departments</option>
                  {filterOptions.departments.map((d) => (
                    <option key={d.id || d.code} value={d.code}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester Filter */}
              <div>
                <select
                  value={selectedSemester}
                  onChange={(e) => {
                    setSelectedSemester(e.target.value);
                    setClassesPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/60 bg-background font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="All">All Semesters</option>
                  {filterOptions.semesters.map((sem) => (
                    <option key={sem} value={String(sem)}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Filter */}
              <div>
                <select
                  value={selectedSection}
                  onChange={(e) => {
                    setSelectedSection(e.target.value);
                    setClassesPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/60 bg-background font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="All">All Sections</option>
                  {filterOptions.sections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Course Filter */}
              <div>
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value);
                    setClassesPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border/60 bg-background font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="All">All Courses</option>
                  {filterOptions.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active filter count & reset */}
            {(selectedDept !== "All" || selectedSemester !== "All" || selectedSection !== "All" || selectedCourse !== "All" || searchQuery) && (
              <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Filtering active cohorts: <span className="font-bold text-foreground">{classesPagination.total}</span> matching classes
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10"
                >
                  <RotateCcw className="size-3" />
                  Reset Filters
                </Button>
              </div>
            )}
          </Card>

          {/* Directory Table */}
          <Card className="rounded-xl border-border/60 overflow-hidden shadow-xs bg-card">
            <CardHeader className="bg-muted/15 border-b border-border/40 py-3 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Class &amp; Section Ledger</CardTitle>
                <CardDescription className="text-xs">
                  Showing {classes.length} of {classesPagination.total} classes
                </CardDescription>
              </div>
              <div className="text-xs text-muted-foreground">
                Academic Year: <span className="font-semibold text-foreground">{summary.academicYear}</span>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loadingClasses ? (
                <div className="p-16 text-center">
                  <Loader2 className="size-6 animate-spin text-primary mx-auto" />
                  <p className="text-xs text-muted-foreground mt-2 font-medium">Loading classes from PostgreSQL...</p>
                </div>
              ) : classes.length === 0 ? (
                <div className="p-16 text-center text-xs text-muted-foreground">
                  <AlertTriangle className="size-6 text-amber-500 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-foreground">No classes or sections are available for the selected filters.</p>
                  <p className="text-[11px] mt-1">Try resetting filters or searching with a different term.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/30 text-muted-foreground font-semibold border-b border-border/40">
                      <tr>
                        <th className="px-5 py-3">Department</th>
                        <th className="px-5 py-3">Course Code</th>
                        <th className="px-5 py-3">Course Title</th>
                        <th className="px-5 py-3">Section</th>
                        <th className="px-5 py-3">Semester</th>
                        <th className="px-5 py-3">Faculty</th>
                        <th className="px-5 py-3 text-center">Cohort Students</th>
                        <th className="px-5 py-3 text-center">Weekly Periods</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium">
                      {classes.map((c) => (
                        <tr
                          key={c.classKey}
                          onClick={() => handleOpenDetail(c.classKey)}
                          className="hover:bg-muted/20 cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <Badge variant="outline" className="text-[10px] font-bold bg-muted/60">
                              {c.department}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-foreground">
                            {c.courseCode}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-foreground max-w-[200px] truncate">
                            {c.courseName}
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant="secondary" className="text-[10px] font-semibold">
                              {c.section}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground">
                            Sem {c.semester}
                          </td>
                          <td className="px-5 py-3.5 text-foreground font-medium max-w-[180px] truncate">
                            {c.facultyName}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">
                              {c.studentsCount} Students
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-center text-muted-foreground">
                            {c.weeklyPeriods} Periods
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              {c.status}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(c.classKey);
                              }}
                              className="h-7 px-2.5 text-xs text-primary gap-1 hover:bg-primary/10"
                            >
                              <Eye className="size-3" />
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>

            {/* Pagination Controls */}
            <div className="bg-muted/15 border-t border-border/40 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-muted-foreground">
                Showing page <span className="font-bold text-foreground">{classesPagination.page}</span> of{" "}
                <span className="font-bold text-foreground">{classesPagination.totalPages}</span> ({classesPagination.total} total classes)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={classesPagination.page <= 1 || loadingClasses}
                  onClick={() => setClassesPagination((p) => ({ ...p, page: p.page - 1 }))}
                  className="h-7 text-xs px-2.5 rounded-lg border-border/60"
                >
                  <ChevronLeft className="size-3.5 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={classesPagination.page >= classesPagination.totalPages || loadingClasses}
                  onClick={() => setClassesPagination((p) => ({ ...p, page: p.page + 1 }))}
                  className="h-7 text-xs px-2.5 rounded-lg border-border/60"
                >
                  Next
                  <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ================================================================= */}
        {/* TAB 2: STUDENT ROSTER DIRECTORY */}
        {/* ================================================================= */}
        <TabsContent value="students" className="space-y-4 m-0">
          <Card className="rounded-xl border-border/60 overflow-hidden shadow-xs bg-card">
            <CardHeader className="bg-muted/15 border-b border-border/40 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-bold">Institutional Student Directory</CardTitle>
                <CardDescription className="text-xs">
                  Enrolled students categorized by department, semester and cohort section
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setStudentsPagination((p) => ({ ...p, page: 1 }));
                  }}
                  placeholder="Search by name, roll number, email..."
                  className="h-8 pl-8 text-xs rounded-lg border-border/60"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loadingStudents ? (
                <div className="p-16 text-center">
                  <Loader2 className="size-6 animate-spin text-primary mx-auto" />
                  <p className="text-xs text-muted-foreground mt-2">Loading students from PostgreSQL...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="p-16 text-center text-xs text-muted-foreground">
                  No students found matching your criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/30 text-muted-foreground font-semibold border-b border-border/40">
                      <tr>
                        <th className="px-6 py-3">Roll Number</th>
                        <th className="px-6 py-3">Student Name</th>
                        <th className="px-6 py-3">Email Address</th>
                        <th className="px-6 py-3">Department</th>
                        <th className="px-6 py-3">Semester &amp; Section</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium">
                      {students.map((s) => (
                        <tr key={s.id || s.rollNumber} className="hover:bg-muted/20">
                          <td className="px-6 py-3.5 font-mono font-bold text-foreground">{s.rollNumber}</td>
                          <td className="px-6 py-3.5 font-semibold text-foreground">{s.name}</td>
                          <td className="px-6 py-3.5 text-muted-foreground font-mono">{s.email}</td>
                          <td className="px-6 py-3.5">
                            <Badge variant="outline" className="text-[10px]">
                              {s.department}
                            </Badge>
                          </td>
                          <td className="px-6 py-3.5 text-muted-foreground font-medium">
                            Sem {s.semester} &middot; {s.section || "A"}
                          </td>
                          <td className="px-6 py-3.5">
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              {s.status || "Active"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>

            {/* Pagination Controls */}
            <div className="bg-muted/15 border-t border-border/40 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-muted-foreground">
                Showing page <span className="font-bold text-foreground">{studentsPagination.page}</span> of{" "}
                <span className="font-bold text-foreground">{studentsPagination.totalPages}</span> ({studentsPagination.total} total students)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={studentsPagination.page <= 1 || loadingStudents}
                  onClick={() => setStudentsPagination((p) => ({ ...p, page: p.page - 1 }))}
                  className="h-7 text-xs px-2.5 rounded-lg border-border/60"
                >
                  <ChevronLeft className="size-3.5 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={studentsPagination.page >= studentsPagination.totalPages || loadingStudents}
                  onClick={() => setStudentsPagination((p) => ({ ...p, page: p.page + 1 }))}
                  className="h-7 text-xs px-2.5 rounded-lg border-border/60"
                >
                  Next
                  <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================================================================= */}
      {/* 4. CLASS DETAILS MODAL */}
      {/* ================================================================= */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0">
          {loadingDetail || !classDetail ? (
            <div className="p-16 text-center">
              <Loader2 className="size-8 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground mt-2 font-medium">Fetching class sessions and roster...</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Modal Header */}
              <div className="p-6 bg-muted/20 border-b border-border/40">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-bold text-xs bg-primary/10 text-primary border-primary/20">
                    {classDetail.classInfo.department}
                  </Badge>
                  <Badge variant="secondary" className="font-semibold text-xs">
                    {classDetail.classInfo.section}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Semester {classDetail.classInfo.semester}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    AY {classDetail.classInfo.academicYear}
                  </Badge>
                </div>

                <div className="mt-3">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <span className="font-mono text-primary">{classDetail.classInfo.course?.code}</span>
                    <span>&mdash;</span>
                    <span>{classDetail.classInfo.course?.name}</span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                    <span>
                      Faculty: <strong className="text-foreground">{classDetail.classInfo.faculties?.map((f: any) => f.name).join(", ")}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Enrolled: <strong className="text-foreground">{classDetail.classInfo.studentCount} Students</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Curriculum: <strong className="text-foreground">{classDetail.classInfo.course?.credits} Credits ({classDetail.classInfo.course?.category || "Core"})</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Navigation Tabs */}
              <div className="px-6 pt-3 border-b border-border/40 bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <button
                    onClick={() => setDetailTab("timetable")}
                    className={`pb-3 px-1 border-b-2 flex items-center gap-1.5 transition-colors ${
                      detailTab === "timetable" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Calendar className="size-3.5" />
                    Weekly Timetable ({classDetail.timetable?.length} Periods)
                  </button>
                  <button
                    onClick={() => setDetailTab("attendance")}
                    className={`pb-3 px-1 border-b-2 flex items-center gap-1.5 transition-colors ${
                      detailTab === "attendance" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <UserCheck className="size-3.5" />
                    Attendance Summary
                  </button>
                  <button
                    onClick={() => setDetailTab("roster")}
                    className={`pb-3 px-1 border-b-2 flex items-center gap-1.5 transition-colors ${
                      detailTab === "roster" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Users className="size-3.5" />
                    Cohort Student Roster ({classDetail.roster?.length})
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {/* 1. Timetable Schedule */}
                {detailTab === "timetable" && (
                  <div className="space-y-4">
                    <div className="border border-border/40 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/30 text-muted-foreground font-semibold border-b border-border/40">
                          <tr>
                            <th className="px-4 py-2.5">Day</th>
                            <th className="px-4 py-2.5">Period</th>
                            <th className="px-4 py-2.5">Timing</th>
                            <th className="px-4 py-2.5">Room</th>
                            <th className="px-4 py-2.5">Assigned Faculty</th>
                            <th className="px-4 py-2.5 text-right">Format</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 font-medium">
                          {classDetail.timetable?.map((slot: any) => (
                            <tr key={slot.id} className="hover:bg-muted/20">
                              <td className="px-4 py-3 font-semibold text-foreground">{slot.day}</td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  Period {slot.periodNumber}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {slot.startTime} &ndash; {slot.endTime}
                              </td>
                              <td className="px-4 py-3 text-foreground flex items-center gap-1">
                                <MapPin className="size-3 text-muted-foreground" />
                                {slot.roomNo}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {slot.faculty?.name}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Badge variant="secondary" className="text-[10px]">
                                  {slot.isLab ? "Laboratory" : "Theory Lecture"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. Attendance Ledger Summary */}
                {detailTab === "attendance" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Card className="rounded-xl border-border/60 p-3 bg-muted/10 shadow-none">
                        <span className="text-[11px] font-bold text-muted-foreground">Conducted Sessions</span>
                        <div className="text-xl font-black text-foreground mt-1">
                          {classDetail.attendanceSummary?.conductedSessions}
                        </div>
                      </Card>
                      <Card className="rounded-xl border-border/60 p-3 bg-emerald-500/5 shadow-none border-emerald-500/20">
                        <span className="text-[11px] font-bold text-emerald-600">Present Records</span>
                        <div className="text-xl font-black text-emerald-600 mt-1">
                          {classDetail.attendanceSummary?.presentCount}
                        </div>
                      </Card>
                      <Card className="rounded-xl border-border/60 p-3 bg-rose-500/5 shadow-none border-rose-500/20">
                        <span className="text-[11px] font-bold text-rose-600">Absent Records</span>
                        <div className="text-xl font-black text-rose-600 mt-1">
                          {classDetail.attendanceSummary?.absentCount}
                        </div>
                      </Card>
                      <Card className="rounded-xl border-border/60 p-3 bg-blue-500/5 shadow-none border-blue-500/20">
                        <span className="text-[11px] font-bold text-blue-600">Attendance Rate</span>
                        <div className="text-xl font-black text-blue-600 mt-1">
                          {classDetail.attendanceSummary?.attendanceRate}%
                        </div>
                      </Card>
                    </div>

                    <div className="p-4 bg-muted/20 rounded-xl border border-border/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">Cohort Compliance Rate</span>
                        <span className="font-bold text-primary">{classDetail.attendanceSummary?.attendanceRate}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            classDetail.attendanceSummary?.attendanceRate >= 75
                              ? "bg-emerald-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(100, classDetail.attendanceSummary?.attendanceRate || 0)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        ANITS Institutional threshold requires &ge;75% attendance for examination eligibility.
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. Cohort Student Roster */}
                {detailTab === "roster" && (
                  <div className="space-y-4">
                    {classDetail.roster?.length === 0 ? (
                      <div className="p-12 text-center text-xs text-muted-foreground">
                        No students are mapped to this class.
                      </div>
                    ) : (
                      <div className="border border-border/40 rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/30 text-muted-foreground font-semibold border-b border-border/40">
                            <tr>
                              <th className="px-4 py-2.5">Roll Number</th>
                              <th className="px-4 py-2.5">Student Name</th>
                              <th className="px-4 py-2.5">Email</th>
                              <th className="px-4 py-2.5 text-center">Attended Sessions</th>
                              <th className="px-4 py-2.5 text-center">Attendance %</th>
                              <th className="px-4 py-2.5 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40 font-medium">
                            {classDetail.roster?.map((student: any) => (
                              <tr key={student.id} className="hover:bg-muted/20">
                                <td className="px-4 py-3 font-mono font-bold text-foreground">
                                  {student.rollNumber}
                                </td>
                                <td className="px-4 py-3 font-semibold text-foreground">
                                  {student.name}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground font-mono">
                                  {student.email}
                                </td>
                                <td className="px-4 py-3 text-center text-muted-foreground">
                                  {student.attendance?.present + student.attendance?.late} / {student.attendance?.total}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-bold ${
                                      student.attendance?.total === 0
                                        ? "bg-muted text-muted-foreground"
                                        : student.attendance?.rate >= 75
                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                        : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                    }`}
                                  >
                                    {student.attendance?.total === 0 ? "N/A" : `${student.attendance?.rate}%`}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                    {student.status || "Active"}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      * Resolved via canonical institutional cohort mapping (Department {classDetail.classInfo.department} &bull; Semester {classDetail.classInfo.semester} &bull; {classDetail.classInfo.section}).
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default AnitsClassesAndCohortsPage;
