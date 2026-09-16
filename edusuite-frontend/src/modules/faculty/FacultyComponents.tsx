import React, { useEffect, useState, useMemo } from "react";
import {
  UserCog,
  Plus,
  Search,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Edit,
  Trash2,
  GraduationCap,
  Award,
  Clock,
  Building2,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  Sparkles,
  BookOpen,
  Briefcase,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  UserX,
  Play,
  RotateCcw,
  BarChart2,
  CalendarDays,
  CalendarRange,
  ExternalLink,
  MapPin,
  Coffee,
  X,
  FlaskConical,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  getFaculty,
  createFacultyRecord,
  updateFacultyRecord,
  deleteFacultyRecord,
  fetchFacultyStats,
  type FacultyRecord,
  type FacultyStats,
} from "./FacultyService";
import { useAcademic } from "@/context/academic-context";
import { useRole } from "@/context/role-context";
import {
  fetchLiveFacultyStatus,
  fetchFacultyFullDaySchedule,
  fetchClassStudents,
  submitAttendanceMark,
  fetchSyllabusProgress,
  updateSyllabusUnitStatus,
  fetchAllClassesAttendance,
  INITIAL_FACULTY_STATUS,
  INITIAL_CLASS_STUDENTS,
  INITIAL_SYLLABUS_PROGRESS,
  INITIAL_ALL_CLASSES_ATTENDANCE,
  type LiveFacultyStatus,
  type ClassStudentAttendance,
  type SyllabusProgress,
  type SyllabusUnit,
  type AllClassesAttendanceItem,
  type FacultyFullDaySchedule,
} from "@/modules/academics/AcademicsService";

const DEPARTMENTS_LIST = [
  "All Departments",
  "CSE",
  "ECE",
  "EEE",
  "ME",
  "Civil",
  "MBA",
];

export type FacultySubpart =
  | "roster"
  | "faculty-status"
  | "syllabus-tracker";

const DESIGNATIONS = [
  "All Designations",
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Lecturer",
  "Visiting Faculty",
];

const QUALIFICATIONS = [
  "All Qualifications",
  "Ph.D.",
  "M.Tech",
  "MBA",
];

const EXPERIENCES = [
  "All Experience",
  "3+ Years",
  "5+ Years",
  "10+ Years",
  "15+ Years",
];

const STATUS_LIST = ["All Status", "Active", "On Leave", "Sabbatical"] as const;

export function FacultyModuleView({ initialTab = "faculty-status" }: { initialTab?: FacultySubpart }) {
  const { selectedDepartment } = useAcademic();
  const roleCtx = useRole();
  const currentRole = (roleCtx?.role || "").toLowerCase();
  const isHod = currentRole === "hod" || currentRole.includes("hod");
  const authDept = roleCtx?.department || selectedDepartment || "CSE";

  const [activeSubpart, setActiveSubpart] = useState<FacultySubpart>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveSubpart(initialTab);
    }
  }, [initialTab]);

  // Feature State 1: Faculty Live Status Matrix
  const [facultyStatuses, setFacultyStatuses] = useState<LiveFacultyStatus[]>(INITIAL_FACULTY_STATUS);
  const [liveStatusLoading, setLiveStatusLoading] = useState<boolean>(false);
  const [liveStatusError, setLiveStatusError] = useState<boolean>(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(2);
  const [facultyLiveStatusFilter, setFacultyLiveStatusFilter] = useState<"ALL" | "FREE" | "IN_CLASS" | "ON_LEAVE">("ALL");

  // Modal State for Faculty Full-Day Timetable
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [selectedFacultySchedule, setSelectedFacultySchedule] = useState<FacultyFullDaySchedule | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Feature State 2: Attendance Marking Portal
  const [studentRoster, setStudentRoster] = useState<ClassStudentAttendance[]>(INITIAL_CLASS_STUDENTS);
  const [selectedClass, setSelectedClass] = useState<string>("CSE-3A");
  const [submittingAttendance, setSubmittingAttendance] = useState<boolean>(false);

  // Feature State 3: Syllabus Tracker
  const [syllabusList, setSyllabusList] = useState<SyllabusProgress[]>(INITIAL_SYLLABUS_PROGRESS);

  // Feature State 4: All Classes Attendance Dashboard (Super Admin)
  const [allClassesAttendance, setAllClassesAttendance] = useState<AllClassesAttendanceItem[]>(INITIAL_ALL_CLASSES_ATTENDANCE);
  const [attendanceViewMode, setAttendanceViewMode] = useState<"daily" | "weekly" | "monthly">("daily");

  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All Departments");
  const [faculty, setFaculty] = useState<FacultyRecord[]>([]);
  const [stats, setStats] = useState<FacultyStats | null>(null);
  
  // Search and Filter States
  const [search, setSearch] = useState("");
  const [selectedDesig, setSelectedDesig] = useState("All Designations");
  const [selectedQual, setSelectedQual] = useState("All Qualifications");
  const [selectedExp, setSelectedExp] = useState("All Experience");
  const [selectedStatus, setSelectedStatus] = useState<string>("All Status");

  // Sorting State
  const [sortKey, setSortKey] = useState<keyof FacultyRecord>("fullName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 5;

  const [loading, setLoading] = useState(false);

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedFac, setSelectedFac] = useState<FacultyRecord | null>(null);

  const activeDeptScope = isHod ? authDept : (selectedDeptFilter !== "All Departments" ? selectedDeptFilter : selectedDepartment);

  // Form State
  const [formData, setFormData] = useState<Partial<FacultyRecord>>({
    empId: "",
    fullName: "",
    email: "",
    phone: "",
    designation: "Assistant Professor",
    department: "",
    specialization: "",
    qualification: "Ph.D. in Computer Science",
    experience: 5,
    teachingLoadHours: 16,
    assignedCoursesCount: 2,
    assignedSubjectsList: [],
    attendancePercentage: 95,
    status: "Active",
    publicationsCount: 0,
    performanceRating: "Very Good (4.2/5.0)",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const filters = {
        designation: selectedDesig,
        status: selectedStatus,
        qualification: selectedQual !== "All Qualifications" ? selectedQual : undefined,
        experience: selectedExp !== "All Experience" ? selectedExp : undefined,
      };

      const response = await getFaculty({
        department: activeDeptScope,
        page: currentPage,
        limit: pageSize,
        search,
        filters,
        sort: {
          key: sortKey,
          order: sortOrder,
        },
      });

      setFaculty(response.data);
      setTotalPages(response.totalPages);
      setTotalRecords(response.total);

      const statsData = await fetchFacultyStats(activeDeptScope);
      setStats(statsData);
    } catch {
      toast.error("Failed to sync faculty roster data.");
    } finally {
      setLoading(false);
    }
  };

  // Reload when scope changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeDeptScope, search, selectedDesig, selectedQual, selectedExp, selectedStatus, sortKey, sortOrder]);

  useEffect(() => {
    loadData();
  }, [activeDeptScope, currentPage, search, selectedDesig, selectedQual, selectedExp, selectedStatus, sortKey, sortOrder]);

  // Fetch Live Faculty Status Matrix for selectedPeriod, department & search
  useEffect(() => {
    const loadLiveStatus = async () => {
      setLiveStatusLoading(true);
      setLiveStatusError(false);
      try {
        const statuses = await fetchLiveFacultyStatus(selectedPeriod, activeDeptScope, search);
        setFacultyStatuses(statuses || []);
      } catch (err) {
        setLiveStatusError(true);
      } finally {
        setLiveStatusLoading(false);
      }
    };

    if (activeSubpart === "faculty-status") {
      loadLiveStatus();
    }
  }, [selectedPeriod, activeDeptScope, search, activeSubpart]);

  // Handlers
  const handleSort = (key: keyof FacultyRecord) => {
    setSortOrder((prev) => (sortKey === key ? (prev === "asc" ? "desc" : "asc") : "asc"));
    setSortKey(key);
  };

  const handleOpenAdd = () => {
    setFormData({
      empId: `EMP-FAC-${Math.floor(100 + Math.random() * 800)}`,
      fullName: "",
      email: "",
      phone: "",
      designation: "Assistant Professor",
      department: selectedDepartment,
      specialization: "",
      qualification: "Ph.D. in CS",
      experience: 5,
      teachingLoadHours: 16,
      assignedCoursesCount: 2,
      assignedSubjectsList: [],
      attendancePercentage: 95,
      status: "Active",
      publicationsCount: 0,
      performanceRating: "Very Good (4.2/5.0)",
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (f: FacultyRecord) => {
    setSelectedFac(f);
    setFormData({ ...f });
    setIsEditOpen(true);
  };

  const handleOpenView = (f: FacultyRecord) => {
    setSelectedFac(f);
    setIsViewOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.empId || !formData.fullName) {
      toast.error("Please enter employee ID and full name.");
      return;
    }

    try {
      const created = await createFacultyRecord({
        ...formData,
        department: selectedDepartment,
      });
      loadData();
      setIsAddOpen(false);
      toast.success(`Faculty member ${created.fullName} successfully registered in ${selectedDepartment}!`);
    } catch {
      toast.error("Failed to register faculty member.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFac) return;

    try {
      await updateFacultyRecord(selectedFac.id, formData);
      loadData();
      setIsEditOpen(false);
      toast.success(`Faculty record for ${formData.fullName} updated!`);
    } catch {
      toast.error("Failed to update faculty record.");
    }
  };

  const handleDelete = async (id: string, empId: string, name: string) => {
    if (confirm(`Are you sure you want to delete faculty record for ${name} (${empId})?`)) {
      try {
        await deleteFacultyRecord(id);
        loadData();
        toast.success(`Faculty record ${empId} deleted successfully.`);
      } catch {
        toast.error("Failed to delete faculty record.");
      }
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Employee ID",
      "Full Name",
      "Email",
      "Phone",
      "Designation",
      "Department",
      "Specialization",
      "Qualification",
      "Experience (Yrs)",
      "Workload Hours",
      "Attendance %",
      "Status",
    ];

    const rows = faculty.map((f) => [
      f.empId,
      f.fullName,
      f.email,
      f.phone,
      f.designation,
      f.department,
      f.specialization,
      f.qualification,
      f.experience,
      f.teachingLoadHours,
      f.attendancePercentage,
      f.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `faculty_roster_${selectedDepartment}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler to open faculty full-day timetable modal
  const handleOpenFacultySchedule = async (facultyName: string) => {
    setScheduleLoading(true);
    setIsTimetableModalOpen(true);
    const sched = await fetchFacultyFullDaySchedule(facultyName);
    setSelectedFacultySchedule(sched);
    setScheduleLoading(false);
  };

  // Toggle student attendance
  const handleToggleAttendance = (studentId: string, status: "Present" | "Absent" | "Late") => {
    setStudentRoster((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status } : s))
    );
  };

  const handleMarkAllPresent = () => {
    setStudentRoster((prev) => prev.map((s) => ({ ...s, status: "Present" })));
    toast.success("All students marked Present");
  };

  const handleSubmitAttendance = async () => {
    setSubmittingAttendance(true);
    const res = await submitAttendanceMark({
      classId: selectedClass || "CSE-3A",
      subjectId: "CS302",
      date: new Date().toISOString().split("T")[0],
      period: 2,
      records: studentRoster.map((s) => ({
        studentId: s.id,
        status: s.status,
      })),
    });
    setSubmittingAttendance(false);
    if (res.success) {
      toast.success(res.message);
    }
  };

  const handleToggleSyllabusUnit = async (courseId: string, unitId: string) => {
    let nextStatus: "Completed" | "In Progress" | "Remaining" = "Completed";
    let nextPct = 100;

    setSyllabusList((prev) =>
      prev.map((item) => {
        if (item.id === courseId) {
          const updatedUnits = item.units.map((u) => {
            if (u.id === unitId) {
              const isComp = u.status === "Completed";
              nextStatus = isComp ? "In Progress" : "Completed";
              nextPct = isComp ? 50 : 100;
              return { ...u, status: nextStatus, completionPct: nextPct };
            }
            return u;
          });
          const completedCount = updatedUnits.filter((u) => u.status === "Completed").length;
          const overallProgressPct = Math.round((completedCount / updatedUnits.length) * 100);
          return { ...item, units: updatedUnits, overallProgressPct };
        }
        return item;
      })
    );
    await updateSyllabusUnitStatus(courseId, unitId, nextStatus, nextPct);
    toast.success("Syllabus unit status updated");
  };

  const filteredFacultyStatus = useMemo(() => {
    return facultyStatuses.filter((f) => {
      const matchesSearch =
        !search ||
        (f.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (f.subject || "").toLowerCase().includes(search.toLowerCase()) ||
        (f.currentClass || "").toLowerCase().includes(search.toLowerCase()) ||
        (f.department || "").toLowerCase().includes(search.toLowerCase());

      const dbDept = (f.department || "").trim().toLowerCase();
      const filterDept = selectedDeptFilter.trim().toLowerCase();

      let matchesDept =
        selectedDeptFilter === "All Departments" ||
        selectedDeptFilter === "All" ||
        dbDept === filterDept ||
        dbDept.includes(filterDept) ||
        filterDept.includes(dbDept);

      if (!matchesDept) {
        if ((filterDept === "cse" || filterDept === "computer science") && (dbDept.includes("computer science") || dbDept.includes("cse"))) matchesDept = true;
        else if ((filterDept === "ece" || filterDept === "electronics") && (dbDept.includes("electronics") || dbDept.includes("ece"))) matchesDept = true;
        else if ((filterDept === "eee" || filterDept === "electrical") && (dbDept.includes("electrical") || dbDept.includes("eee"))) matchesDept = true;
        else if ((filterDept === "me" || filterDept === "mechanical") && (dbDept.includes("mechanical") || dbDept.includes("me"))) matchesDept = true;
        else if (filterDept === "civil" && dbDept.includes("civil")) matchesDept = true;
        else if ((filterDept === "it" || filterDept === "information technology") && (dbDept.includes("information technology") || dbDept.includes("it"))) matchesDept = true;
        else if ((filterDept.includes("ai") || filterDept.includes("ml") || filterDept.includes("ds")) && (dbDept.includes("artificial intelligence") || dbDept.includes("machine learning") || dbDept.includes("data science") || dbDept.includes("ai"))) matchesDept = true;
      }

      return matchesSearch && matchesDept;
    });
  }, [facultyStatuses, search, selectedDeptFilter]);

  // Identify active / logged in faculty's card (if user is staff/faculty/HOD)
  const currentFacultyCard = useMemo(() => {
    if (!filteredFacultyStatus.length) return null;
    const personaEmail = (roleCtx?.profile?.email || "").toLowerCase().trim();
    const personaName = (roleCtx?.profile?.personaName || "").toLowerCase().trim();

    if (personaEmail) {
      const match = filteredFacultyStatus.find((f) => f.email && f.email.toLowerCase() === personaEmail);
      if (match) return match;
    }
    if (personaName) {
      const match = filteredFacultyStatus.find(
        (f) => f.name && (f.name.toLowerCase().includes(personaName) || personaName.includes(f.name.toLowerCase()))
      );
      if (match) return match;
    }
    if (isHod) {
      const hodMatch = filteredFacultyStatus.find((f) => f.designation?.toLowerCase().includes("hod"));
      if (hodMatch) return hodMatch;
    }
    return null;
  }, [filteredFacultyStatus, roleCtx?.profile, isHod]);

  // Other faculty members with status filtering
  const otherFacultyMembers = useMemo(() => {
    let list = filteredFacultyStatus;
    if (currentFacultyCard) {
      list = list.filter((f) => f.id !== currentFacultyCard.id);
    }
    if (facultyLiveStatusFilter === "FREE") {
      list = list.filter((f) => f.status === "FREE");
    } else if (facultyLiveStatusFilter === "IN_CLASS") {
      list = list.filter((f) => f.status === "IN CLASS / WORKING");
    } else if (facultyLiveStatusFilter === "ON_LEAVE") {
      list = list.filter((f) => f.status === "ON LEAVE");
    }
    return list;
  }, [filteredFacultyStatus, currentFacultyCard, facultyLiveStatusFilter]);

  const facultyStatusCounts = useMemo(() => {
    const pool = currentFacultyCard ? filteredFacultyStatus.filter((f) => f.id !== currentFacultyCard.id) : filteredFacultyStatus;
    return {
      all: pool.length,
      free: pool.filter((f) => f.status === "FREE").length,
      inClass: pool.filter((f) => f.status === "IN CLASS / WORKING").length,
      onLeave: pool.filter((f) => f.status === "ON LEAVE").length,
    };
  }, [filteredFacultyStatus, currentFacultyCard]);

  const filteredAllClassesAttendance = useMemo(() => {
    return allClassesAttendance.filter((c) => {
      const matchesSearch =
        c.className.toLowerCase().includes(search.toLowerCase()) ||
        c.classTeacher.toLowerCase().includes(search.toLowerCase());
      const matchesDept = selectedDeptFilter === "All Departments" || c.department === selectedDeptFilter;
      return matchesSearch && matchesDept;
    });
  }, [allClassesAttendance, search, selectedDeptFilter]);

  const renderStatusMatrixCard = (f: LiveFacultyStatus, isMyCard: boolean = false) => {
    const isFree = f.status === "FREE";
    const isInClass = f.status === "IN CLASS / WORKING";
    const isOnLeave = f.status === "ON LEAVE";

    return (
      <div
        key={f.id}
        onClick={() => handleOpenFacultySchedule(f.name)}
        className={`p-4 rounded-2xl border transition-all cursor-pointer group relative space-y-3.5 ${
          isMyCard
            ? "bg-primary/5 border-primary shadow-sm hover:border-primary hover:shadow-md"
            : "bg-card border-border/80 shadow-xs hover:border-primary/60 hover:shadow-md"
        }`}
      >
        {/* 1. FACULTY IDENTITY */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="size-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
              {f.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[0.65rem] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold border border-border/60">
                  {f.rollNumber || `FAC-${f.department.slice(0, 3)}`}
                </span>
                <span className="text-[0.68rem] text-primary font-semibold">{f.designation || "Faculty Member"}</span>
                {isMyCard && (
                  <Badge className="bg-primary text-white text-[10px] h-4 px-1.5 font-bold">
                    MY CARD
                  </Badge>
                )}
              </div>
              <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5 pt-0.5 truncate">
                {f.name}
                <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
              </h3>
              <p className="text-xs text-muted-foreground font-mono">{f.department} Department</p>
            </div>
          </div>

          {/* Status Badge */}
          {isFree && (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold shrink-0 text-[11px] px-2.5 py-1">
              🟢 FREE
            </Badge>
          )}
          {isInClass && (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800 font-bold shrink-0 text-[11px] px-2.5 py-1">
              🔵 IN CLASS
            </Badge>
          )}
          {isOnLeave && (
            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold shrink-0 text-[11px] px-2.5 py-1">
              🔴 ON LEAVE
            </Badge>
          )}
        </div>

        {/* 2. DOWNWARD STATUS BANNER (↓ Status) */}
        <div
          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            isFree
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : isInClass
              ? "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300"
              : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider opacity-70">Status:</span>
            <span className="font-bold">
              {isFree ? "Free for Substitution / Unassigned" : isInClass ? "Active Lecture in Session" : (f.leaveReason || "Approved Leave")}
            </span>
          </div>
          <span className="text-[11px] font-mono opacity-80">Period {selectedPeriod}</span>
        </div>

        {/* 3. CLASS ROW (↓ Class) */}
        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="size-3.5 text-primary shrink-0" />
            <span className="text-[10px] uppercase font-mono font-bold text-muted-foreground shrink-0">Class:</span>
            <span className="font-semibold text-foreground truncate">
              {isInClass ? (
                <>
                  <strong className="text-primary font-bold">{f.currentClass || "Assigned Section"}</strong>
                  {f.subject && <span className="text-muted-foreground ml-1.5 font-normal">({f.subject})</span>}
                </>
              ) : isFree ? (
                <span className="text-muted-foreground font-medium">Unassigned (Free Period)</span>
              ) : (
                <span className="text-muted-foreground font-medium">No Class Scheduled</span>
              )}
            </span>
          </div>
        </div>

        {/* 4. ROOM ROW (↓ Room) */}
        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[10px] uppercase font-mono font-bold text-muted-foreground shrink-0">Room:</span>
            <span className="font-semibold text-foreground truncate">
              {isInClass ? (
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{f.roomNo || "Block Hall"}</strong>
              ) : isFree ? (
                <span className="text-muted-foreground font-medium">{f.roomNo || "Faculty Cabin / Dept Lounge"}</span>
              ) : (
                <span className="text-muted-foreground font-medium">Off-Campus</span>
              )}
            </span>
          </div>
        </div>

        {/* 5. FOOTER LINK */}
        <div className="flex items-center justify-between text-[0.68rem] text-muted-foreground pt-1 border-t border-border/50">
          <span className="font-mono">Slot: {f.timeSlot}</span>
          <span className="text-primary font-semibold flex items-center gap-1 group-hover:underline">
            Full Schedule <Calendar className="size-3" />
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <UserCog className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
                Faculty Workspace Control
              </h1>
              <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30 uppercase bg-primary/5">
                {isHod ? `${authDept} DEPARTMENT` : `DEAN: ${selectedDepartment}`}
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Manage department staff workloads, schedules, research publications, and credentials.
            </p>
          </div>
        </div>

        {/* Action Buttons - Top Right Corner */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 gap-2 text-xs font-medium border-border hover:bg-accent"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-2 text-xs font-medium border-border hover:bg-accent"
          >
            <Download className="size-3.5" /> Export Roster
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="h-9 bg-brand-gradient text-white gap-2 font-semibold text-xs shadow-glow hover:opacity-95"
          >
            <Plus className="size-4" /> Add New Faculty
          </Button>
        </div>
      </div>

      {/* SUBPARTS NAVIGATION TAB BAR */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-muted/60 border border-border/80 overflow-x-auto">
        <button
          onClick={() => setActiveSubpart("faculty-status")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubpart === "faculty-status" ? "bg-card text-primary shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="size-3.5" /> 🟢 Real-Time Faculty Status Matrix
        </button>

        <button
          onClick={() => setActiveSubpart("syllabus-tracker")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubpart === "syllabus-tracker" ? "bg-card text-primary shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart2 className="size-3.5" /> 📊 Syllabus Tracker
        </button>

        <button
          onClick={() => setActiveSubpart("roster")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubpart === "roster" ? "bg-card text-primary shadow-sm border border-border/80" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserCog className="size-3.5" /> 👨‍🏫 Faculty Roster & Workload Control
        </button>
      </div>

      {activeSubpart === "roster" && (
        <>
          {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
            <span>Faculty Strength</span>
            <UserCog className="size-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-mono text-primary">{stats?.totalFaculty || 0} Members</p>
          <p className="text-[0.68rem] text-muted-foreground font-mono">
            Prof: {stats?.professors || 0} &middot; Lect: {stats?.lecturers || 0} &middot; Visit: {stats?.visitingFaculty || 0}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
            <span>Cadre Distribution</span>
            <Award className="size-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600">{stats?.professors || 0} Professors</p>
          <p className="text-[0.68rem] text-emerald-600 font-medium font-mono">
            Assoc: {stats?.associateProfessors || 0} &middot; Assist: {stats?.assistantProfessors || 0}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
            <span>Avg Workload & Research</span>
            <Clock className="size-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-blue-600">{stats?.avgWorkload || 0} Hrs / Wk</p>
          <p className="text-[0.68rem] text-muted-foreground font-mono">
            Total Publications: {stats?.totalPublications || 0} Papers
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
            <span>Faculty Attendance</span>
            <Calendar className="size-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-600">{stats?.avgAttendance || 0}% Rate</p>
          <p className="text-[0.68rem] text-muted-foreground font-mono">
            Substitute mapping fully active
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border/80 shadow-sm">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, name, email, specialization, qualification..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

                {/* Department indicator lock */}
          {isHod ? (
            <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-primary/30 bg-primary/5 text-xs font-bold text-primary">
              <Building2 className="size-3.5 text-primary" />
              <span>Scope: {authDept} Department</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/80 bg-muted/40 text-xs font-bold text-foreground">
              <Building2 className="size-3.5 text-muted-foreground" />
              <span>Scope: {selectedDepartment}</span>
            </div>
          )}

          {/* Designation Filter */}
          <Select value={selectedDesig} onValueChange={setSelectedDesig}>
            <SelectTrigger className="h-9 w-full sm:w-[150px] text-xs">
              <Briefcase className="size-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Designation" />
            </SelectTrigger>
            <SelectContent>
              {DESIGNATIONS.map((d) => (
                <SelectItem key={d} value={d} className="text-xs">
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Qualification Filter */}
          <Select value={selectedQual} onValueChange={setSelectedQual}>
            <SelectTrigger className="h-9 w-full sm:w-[150px] text-xs">
              <GraduationCap className="size-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Qualification" />
            </SelectTrigger>
            <SelectContent>
              {QUALIFICATIONS.map((q) => (
                <SelectItem key={q} value={q} className="text-xs">
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Experience Filter */}
          <Select value={selectedExp} onValueChange={setSelectedExp}>
            <SelectTrigger className="h-9 w-full sm:w-[130px] text-xs">
              <Clock className="size-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Experience" />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCES.map((e) => (
                <SelectItem key={e} value={e} className="text-xs">
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-9 w-full sm:w-[130px] text-xs">
              <UserCheck className="size-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_LIST.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {(selectedDesig !== "All Designations" ||
            selectedQual !== "All Qualifications" ||
            selectedExp !== "All Experience" ||
            selectedStatus !== "All Status" ||
            search !== "") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedDesig("All Designations");
                setSelectedQual("All Qualifications");
                setSelectedExp("All Experience");
                setSelectedStatus("All Status");
              }}
              className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="size-3" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* ROSTER TABLE PANEL */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <UserCheck className="size-4 text-primary" /> Faculty Directory & Workload Ledger
            <Badge variant="secondary" className="font-mono text-xs">
              {totalRecords} Members
            </Badge>
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <RefreshCw className="size-5 animate-spin text-primary" />
            Syncing faculty roster data...
          </div>
        ) : faculty.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-xl space-y-2">
            <UserCog className="size-7 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">No faculty records found matching search or scope.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[0.68rem]">
                  <tr>
                    <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort("empId")}>
                      <div className="flex items-center gap-1.5">
                        Emp ID
                        {sortKey === "empId" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort("fullName")}>
                      <div className="flex items-center gap-1.5">
                        Faculty Name
                        {sortKey === "fullName" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort("designation")}>
                      <div className="flex items-center gap-1.5">
                        Designation
                        {sortKey === "designation" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort("qualification")}>
                      <div className="flex items-center gap-1.5">
                        Qualification
                        {sortKey === "qualification" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort("experience")}>
                      <div className="flex items-center gap-1.5">
                        Experience
                        {sortKey === "experience" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort("teachingLoadHours")}>
                      <div className="flex items-center gap-1.5">
                        Workload (Hrs/Wk)
                        {sortKey === "teachingLoadHours" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort("status")}>
                      <div className="flex items-center gap-1.5">
                        Status
                        {sortKey === "status" && (sortOrder === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {faculty.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-foreground">{f.empId}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground">{f.fullName}</div>
                        <div className="text-[0.68rem] text-muted-foreground font-mono">{f.email}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">{f.designation}</td>
                      <td className="py-3 px-3 text-muted-foreground">{f.qualification}</td>
                      <td className="py-3 px-3 text-muted-foreground font-mono">{f.experience} Years</td>
                      <td className="py-3 px-3 font-mono font-bold text-primary text-sm">
                        {f.teachingLoadHours} Hrs ({f.assignedCoursesCount} Courses)
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          className={
                            f.status === "Active"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[0.68rem]"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[0.68rem]"
                          }
                        >
                          {f.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenView(f)}
                            className="h-7 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
                            title="View Dossier"
                          >
                            <Eye className="size-3.5" /> Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(f)}
                            className="size-7 text-muted-foreground hover:text-primary"
                            title="Edit Record"
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(f.id, f.empId, f.fullName)}
                            className="size-7 text-muted-foreground hover:text-red-600"
                            title="Delete Faculty"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-border/60 pt-4 text-xs">
              <span className="text-muted-foreground font-medium">
                Showing page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
                <span className="font-semibold text-foreground">{totalPages || 1}</span> ({totalRecords} records)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="h-8 text-xs px-2.5 border-border"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="h-8 text-xs px-2.5 border-border"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* FEATURE 1: REAL-TIME FACULTY STATUS MATRIX */}
      {activeSubpart === "faculty-status" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/80 shadow-sm">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-muted-foreground uppercase shrink-0">Current Period:</span>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedPeriod === p ? "bg-primary text-white shadow-sm" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Period {p}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {isHod ? (
                <Badge variant="outline" className="px-3 py-1.5 text-xs font-mono font-bold border-primary/30 text-primary bg-primary/5 shrink-0">
                  {filteredFacultyStatus.length} Faculty &middot; {authDept}
                </Badge>
              ) : (
                <>
                  <Badge variant="outline" className="px-3 py-1.5 text-xs font-mono font-bold border-primary/30 text-primary bg-primary/5 shrink-0">
                    {filteredFacultyStatus.length} Faculty
                  </Badge>

                  <Select value={selectedDeptFilter} onValueChange={setSelectedDeptFilter}>
                    <SelectTrigger className="h-9 text-xs w-[160px] rounded-xl"><SelectValue placeholder="Department" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS_LIST.map((d) => (<SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </>
              )}

              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search faculty..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-xs rounded-xl" />
              </div>
            </div>
          </div>

          {liveStatusLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2 border rounded-2xl bg-card">
              <RefreshCw className="size-6 animate-spin text-primary" />
              Loading real-time faculty status matrix from PostgreSQL Database...
            </div>
          ) : liveStatusError ? (
            <div className="p-12 text-center text-xs text-rose-600 border border-rose-200 dark:border-rose-900 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 space-y-3">
              <p className="font-semibold">Unable to load live faculty status from database.</p>
              <Button size="sm" variant="outline" onClick={() => setSelectedPeriod(selectedPeriod)} className="text-xs">
                Retry Connection
              </Button>
            </div>
          ) : filteredFacultyStatus.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground border rounded-2xl bg-card">
              No faculty members found for the selected department/filter.
            </div>
          ) : (
            <div className="space-y-6">
              {/* 1. MY FACULTY CARD (If logged in user matches a faculty/HOD) */}
              {currentFacultyCard && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <UserCheck className="size-3.5 text-primary" /> My Live Status &mdash; Period {selectedPeriod}
                    </h3>
                    <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30 bg-primary/5">
                      Active Profile
                    </Badge>
                  </div>
                  <div className="max-w-xl">
                    {renderStatusMatrixCard(currentFacultyCard, true)}
                  </div>
                </div>
              )}

              {/* 2. OTHER FACULTY MEMBERS SECTION */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-primary" />
                      <h3 className="font-bold text-sm text-foreground">Other faculty members</h3>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {otherFacultyMembers.length} Members
                    </Badge>
                  </div>

                  {/* Status Quick Filter Buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setFacultyLiveStatusFilter("ALL")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        facultyLiveStatusFilter === "ALL"
                          ? "bg-primary text-white shadow-xs"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      All ({facultyStatusCounts.all})
                    </button>
                    <button
                      onClick={() => setFacultyLiveStatusFilter("FREE")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        facultyLiveStatusFilter === "FREE"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                      }`}
                    >
                      🟢 Free ({facultyStatusCounts.free})
                    </button>
                    <button
                      onClick={() => setFacultyLiveStatusFilter("IN_CLASS")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        facultyLiveStatusFilter === "IN_CLASS"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
                      }`}
                    >
                      🔵 In Class ({facultyStatusCounts.inClass})
                    </button>
                    <button
                      onClick={() => setFacultyLiveStatusFilter("ON_LEAVE")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        facultyLiveStatusFilter === "ON_LEAVE"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
                      }`}
                    >
                      🔴 On Leave ({facultyStatusCounts.onLeave})
                    </button>
                  </div>
                </div>

                {/* Faculty Cards Grid */}
                {otherFacultyMembers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-2xl bg-card">
                    No faculty members matching the status filter "{facultyLiveStatusFilter}".
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {otherFacultyMembers.map((f) => renderStatusMatrixCard(f, false))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}



      {/* FEATURE 3: FACULTY ACADEMIC CALENDAR & SYLLABUS TRACKER */}
      {activeSubpart === "syllabus-tracker" && (
        <div className="space-y-6">
          {syllabusList.map((syl) => (
            <div key={syl.id} className="rounded-2xl border border-border/80 bg-card p-5 space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">{syl.courseCode}</Badge>
                    <h2 className="text-base font-bold text-foreground">{syl.courseName}</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Faculty: {syl.facultyName} • Dept: {syl.department}</p>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold">
                    {syl.classesCompleted} / {syl.totalClassesScheduled} Classes Completed
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-bold">
                    {syl.overallProgressPct}% Syllabus Progress
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase">
                  <span>Syllabus Unit Completion Ledger</span>
                  <span>{syl.units.filter((u) => u.status === "Completed").length} / {syl.units.length} Units Done</span>
                </div>
                <Progress value={syl.overallProgressPct} className="h-2.5 rounded-full" />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {syl.units.map((unit) => (
                  <div
                    key={unit.id}
                    onClick={() => handleToggleSyllabusUnit(syl.id, unit.id)}
                    className={`p-3.5 rounded-xl border text-xs space-y-2 cursor-pointer transition-all ${
                      unit.status === "Completed" ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900/50" : "bg-card border-border/80 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold font-mono text-primary">Unit {unit.unitNumber}: {unit.unitTitle}</span>
                      <Badge className={unit.status === "Completed" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}>
                        {unit.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[0.75rem]">{unit.unitTitle}</p>
                    <p className="text-[0.68rem] font-mono text-muted-foreground">Progress: {unit.completionPct}% completed</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULL-DAY PERIOD TIMETABLE MODAL */}
      <Dialog open={isTimetableModalOpen} onOpenChange={setIsTimetableModalOpen}>
        <DialogContent className="max-w-2xl bg-card border-border p-6 shadow-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <UserCog className="size-6" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    {selectedFacultySchedule?.name || "Faculty Timetable"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground font-mono mt-0.5">
                    {selectedFacultySchedule?.department} Department &middot; ID: {selectedFacultySchedule?.facultyId}
                  </DialogDescription>
                </div>
              </div>

              {selectedFacultySchedule && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 font-mono font-bold text-xs px-2.5 py-1">
                    🟢 {selectedFacultySchedule.periods?.filter((p) => p.status === "FREE").length || 0} Free Slots
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-mono font-bold text-xs px-2.5 py-1">
                    🔵 {selectedFacultySchedule.periods?.filter((p) => p.status === "IN CLASS").length || 0} Teaching
                  </Badge>
                </div>
              )}
            </div>
          </DialogHeader>

          {scheduleLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <RefreshCw className="size-6 animate-spin text-primary" />
              Loading live period schedule...
            </div>
          ) : !selectedFacultySchedule ? (
            <div className="p-8 text-center text-xs text-muted-foreground font-medium">
              No schedule records found for this faculty.
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase border-b border-border/40 pb-2">
                <span>Daily Period Schedule Timeline</span>
                <span className="font-mono text-[0.68rem] text-primary">8 Periods Configured</span>
              </div>

              <div className="space-y-2.5">
                {(selectedFacultySchedule?.periods || (selectedFacultySchedule as any)?.fullDaySchedule || []).map((slot: any, idx: number) => {
                  const periodNum = slot.periodNumber || slot.period || (idx + 1);
                  const isInClass = slot.status === "IN CLASS";
                  const isFree = slot.status === "FREE";
                  const isOnLeave = slot.status === "ON LEAVE";
                  const isLab = slot.isLab || (slot.subject && slot.subject.toLowerCase().includes("lab"));

                  return (
                    <div
                      key={periodNum}
                      className="flex items-center gap-3 p-2 rounded-2xl transition-all"
                    >
                      <div className="w-20 shrink-0 text-center py-2 px-2.5 rounded-xl bg-muted/60 border border-border/60">
                        <span className="block font-bold text-xs text-foreground font-mono">P{periodNum}</span>
                        <span className="block text-[0.65rem] text-muted-foreground font-mono">{slot.timeSlot}</span>
                      </div>

                      {isInClass && !isLab && (
                        <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 shrink-0">
                              <BookOpen className="size-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-foreground">{slot.subject}</h4>
                              <p className="text-[0.72rem] font-mono text-muted-foreground font-semibold">{slot.className}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 font-bold text-[0.68rem] px-2.5 py-0.5">
                              🔵 IN CLASS
                            </Badge>
                            <div className="flex items-center gap-1.5 text-[0.72rem] font-mono text-muted-foreground font-semibold">
                              <MapPin className="size-3.5 text-primary" /> {slot.roomNo}
                            </div>
                          </div>
                        </div>
                      )}

                      {isInClass && isLab && (
                        <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 shrink-0">
                              <FlaskConical className="size-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-foreground">{slot.subject}</h4>
                              <p className="text-[0.72rem] font-mono text-muted-foreground font-semibold">{slot.className}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 font-bold text-[0.68rem] px-2.5 py-0.5">
                              🟠 IN CLASS (LAB)
                            </Badge>
                            <div className="flex items-center gap-1.5 text-[0.72rem] font-mono text-muted-foreground font-semibold">
                              <FlaskConical className="size-3.5 text-amber-600" /> {slot.roomNo}
                            </div>
                          </div>
                        </div>
                      )}

                      {isFree && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 shrink-0">
                              <Coffee className="size-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-200">FREE PERIOD</h4>
                              <p className="text-[0.72rem] text-emerald-700 dark:text-emerald-400 font-medium">Available Slot</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 font-bold text-[0.68rem] px-2.5 py-0.5">
                              🟢 FREE
                            </Badge>
                            <span className="text-[0.72rem] text-muted-foreground font-mono font-semibold">—</span>
                          </div>
                        </div>
                      )}

                      {isOnLeave && (
                        <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 shrink-0">
                              <XCircle className="size-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-rose-900 dark:text-rose-200">ON APPROVED LEAVE</h4>
                              <p className="text-[0.72rem] text-rose-700 dark:text-rose-400 font-medium">Substitute Assigned by HOD</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                            <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 font-bold text-[0.68rem] px-2.5 py-0.5">
                              🔴 ON LEAVE
                            </Badge>
                            <span className="text-[0.72rem] text-muted-foreground font-mono font-semibold">—</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Close Button */}
          <DialogFooter className="pt-3 border-t border-border flex justify-end">
            <Button
              onClick={() => setIsTimetableModalOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-10 px-5 gap-1.5 shadow-sm"
            >
              Close Schedule <X className="size-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 1: ADD NEW FACULTY MODAL */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="size-5 text-primary" /> Register New Faculty Member
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Register a new faculty member within the <span className="font-bold">{selectedDepartment}</span> department workspace.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Employee ID *</Label>
                <Input
                  required
                  placeholder="e.g. EMP-FAC-084"
                  value={formData.empId || ""}
                  onChange={(e) => setFormData({ ...formData, empId: e.target.value })}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Full Name *</Label>
                <Input
                  required
                  placeholder="e.g. Dr. S. K. Gupta"
                  value={formData.fullName || ""}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input
                  type="email"
                  placeholder="e.g. skgupta@college.edu"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  placeholder="e.g. +91 9811223344"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Designation</Label>
                <Select
                  value={formData.designation}
                  onValueChange={(val: any) => setFormData({ ...formData, designation: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGNATIONS.filter((d) => d !== "All Designations").map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Qualification</Label>
                <Input
                  placeholder="e.g. Ph.D. in Computer Science"
                  value={formData.qualification || ""}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Experience (Years)</Label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.experience ?? 5}
                  onChange={(e) => setFormData({ ...formData, experience: Number(e.target.value) })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Teaching Load (Hrs/Wk)</Label>
                <Input
                  type="number"
                  min="4"
                  max="30"
                  value={formData.teachingLoadHours ?? 16}
                  onChange={(e) =>
                    setFormData({ ...formData, teachingLoadHours: Number(e.target.value) })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assigned Courses</Label>
                <Input
                  type="number"
                  min="1"
                  max="6"
                  value={formData.assignedCoursesCount ?? 3}
                  onChange={(e) =>
                    setFormData({ ...formData, assignedCoursesCount: Number(e.target.value) })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Employment Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.filter((s) => s !== "All Status").map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Specialization / Research Domain</Label>
              <Input
                placeholder="e.g. Cloud Computing & Microservices Architecture"
                value={formData.specialization || ""}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-brand-gradient text-white text-xs font-semibold">
                Register Faculty
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: EDIT FACULTY MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Edit className="size-5 text-primary" /> Edit Faculty Record ({selectedFac?.empId})
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Full Name</Label>
                <Input
                  required
                  value={formData.fullName || ""}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Designation</Label>
                <Select
                  value={formData.designation}
                  onValueChange={(val: any) => setFormData({ ...formData, designation: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGNATIONS.filter((d) => d !== "All Designations").map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Qualification</Label>
                <Input
                  value={formData.qualification || ""}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Experience (Years)</Label>
                <Input
                  type="number"
                  value={formData.experience ?? 5}
                  onChange={(e) => setFormData({ ...formData, experience: Number(e.target.value) })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Teaching Load (Hrs/Wk)</Label>
                <Input
                  type="number"
                  value={formData.teachingLoadHours ?? 16}
                  onChange={(e) =>
                    setFormData({ ...formData, teachingLoadHours: Number(e.target.value) })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assigned Courses</Label>
                <Input
                  type="number"
                  value={formData.assignedCoursesCount ?? 3}
                  onChange={(e) =>
                    setFormData({ ...formData, assignedCoursesCount: Number(e.target.value) })
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Employment Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.filter((s) => s !== "All Status").map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Attendance Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.attendancePercentage ?? 95}
                  onChange={(e) => setFormData({ ...formData, attendancePercentage: Number(e.target.value) })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Specialization</Label>
              <Input
                value={formData.specialization || ""}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-brand-gradient text-white text-xs font-semibold">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: VIEW FACULTY DOSSIER MODAL */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserCog className="size-5 text-primary" /> Faculty Dossier & Profile
            </DialogTitle>
          </DialogHeader>

          {selectedFac && (
            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {selectedFac.empId}
                  </Badge>
                  <Badge
                    className={
                      selectedFac.status === "Active"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs font-semibold"
                    }
                  >
                    {selectedFac.status}
                  </Badge>
                </div>
                <h2 className="text-base font-bold text-foreground">{selectedFac.fullName}</h2>
                <p className="text-xs text-primary font-mono">{selectedFac.email} &middot; {selectedFac.phone}</p>
              </div>

              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid grid-cols-3 bg-muted/40 border p-1 rounded-xl">
                  <TabsTrigger value="personal" className="text-xs">Personal Info</TabsTrigger>
                  <TabsTrigger value="academic" className="text-xs">Academic & Load</TabsTrigger>
                  <TabsTrigger value="research" className="text-xs">Research & Perf</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-2 mt-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60">
                    <span className="text-muted-foreground font-medium">Full Name:</span>
                    <span className="font-semibold text-foreground">{selectedFac.fullName}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60">
                    <span className="text-muted-foreground font-medium">Email Address:</span>
                    <span className="font-semibold text-foreground">{selectedFac.email}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60 font-mono">
                    <span className="text-muted-foreground font-medium font-sans">Contact Number:</span>
                    <span className="font-semibold text-foreground">{selectedFac.phone}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60">
                    <span className="text-muted-foreground font-medium">Designation:</span>
                    <span className="font-semibold text-foreground">{selectedFac.designation}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60 font-mono">
                    <span className="text-muted-foreground font-medium font-sans">Joining Date:</span>
                    <span className="font-semibold text-foreground">{selectedFac.joiningDate}</span>
                  </div>
                </TabsContent>

                <TabsContent value="academic" className="space-y-2 mt-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60">
                    <span className="text-muted-foreground font-medium">Qualification:</span>
                    <span className="font-semibold text-foreground">{selectedFac.qualification}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60 font-mono">
                    <span className="text-muted-foreground font-medium font-sans">Experience:</span>
                    <span className="font-semibold text-foreground">{selectedFac.experience} Years</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60">
                    <span className="text-muted-foreground font-medium">Specialization:</span>
                    <span className="font-semibold text-foreground truncate max-w-[250px]" title={selectedFac.specialization}>
                      {selectedFac.specialization}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60 font-mono">
                    <span className="text-muted-foreground font-medium font-sans">Weekly Load:</span>
                    <span className="font-bold text-base text-primary">
                      {selectedFac.teachingLoadHours} Hrs ({selectedFac.assignedCoursesCount} Courses)
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-card border border-border/60 space-y-1.5">
                    <span className="text-muted-foreground font-semibold">Assigned Subjects ({selectedFac.assignedCoursesCount}):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFac.assignedSubjectsList?.length > 0 ? (
                        selectedFac.assignedSubjectsList.map((subj) => (
                          <Badge key={subj} variant="outline" className="text-[0.68rem] bg-muted/20">
                            {subj}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[0.68rem] text-muted-foreground">No subjects explicitly mapped</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-card border border-border/60 space-y-1.5">
                    <span className="text-muted-foreground font-semibold">Weekly Timetable:</span>
                    <div className="space-y-1 font-mono text-[0.68rem]">
                      {selectedFac.weeklyTimetable?.length > 0 ? (
                        selectedFac.weeklyTimetable.map((tt, idx) => (
                          <div key={idx} className="flex justify-between border-b border-border/40 pb-1 last:border-b-0">
                            <span className="font-semibold text-foreground">{tt.day} ({tt.time}):</span>
                            <span className="text-muted-foreground">{tt.course} &middot; Rm {tt.room}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[0.68rem] text-muted-foreground font-sans">No slots booked</p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="research" className="space-y-2 mt-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60">
                    <span className="text-muted-foreground font-medium">Research Publications:</span>
                    <span className="font-bold text-primary font-mono text-sm">{selectedFac.publicationsCount} Papers</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60 font-mono">
                    <span className="text-muted-foreground font-medium font-sans">Attendance Summary:</span>
                    <span className="font-bold text-emerald-600 text-sm">{selectedFac.attendancePercentage}% Rate</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60">
                    <span className="text-muted-foreground font-medium">Performance Rating:</span>
                    <span className="font-bold text-amber-600">{selectedFac.performanceRating}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-border/60 space-y-1">
                    <span className="text-muted-foreground font-semibold">Performance Overview:</span>
                    <p className="text-xs text-muted-foreground">
                      Obtained excellent student feedback for teaching efficacy and syllabus compliance. Active contributor to institution accreditation documentation.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsViewOpen(false)}
                  className="w-full text-xs"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
