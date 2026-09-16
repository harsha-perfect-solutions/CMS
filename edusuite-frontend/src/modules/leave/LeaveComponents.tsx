import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  RefreshCw,
  Download,
  Search,
  Filter,
  Users,
  Building2,
  AlertCircle,
  AlertTriangle,
  Eye,
  CalendarDays,
  FileUp,
  TrendingUp,
  UserCog,
  Briefcase,
  Plane,
  Heart,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  BookOpen,
  Send,
  Ban,
  Check,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { useRole } from "@/context/role-context";

import {
  fetchFacultyLeaveWorkspace,
  checkTimetableConflicts,
  applyForFacultyLeave,
  withdrawFacultyLeave,
  MOCK_HOLIDAYS_AND_EVENTS,
  type LeaveApplication,
  type LeaveBalance,
  type LeaveWorkspaceData,
  type TimetableConflict,
  type HolidayEvent,
} from "./LeaveService";

// Helper function for conditional class names
function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function LeaveModuleView() {
  const { profile } = useRole();

  // State from PostgreSQL backend workspace
  const [workspaceData, setWorkspaceData] = useState<LeaveWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter states
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All Types");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [selectedYear, setSelectedYear] = useState("AY 2026-27");

  // Selected request for dynamic timeline inspection
  const [selectedTimelineRequest, setSelectedTimelineRequest] = useState<LeaveApplication | null>(null);

  // Dialog States
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedLeaveDetails, setSelectedLeaveDetails] = useState<LeaveApplication | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  // Calendar selection state
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<HolidayEvent | LeaveApplication | null>(null);

  // Apply Leave Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [conflicts, setConflicts] = useState<TimetableConflict[]>([]);
  const [formFields, setFormFields] = useState({
    leaveType: "Casual",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    isHalfDay: false,
    halfDaySession: "MORNING",
    reason: "",
    emergencyContact: "",
    additionalNotes: "",
    attachmentName: "",
  });

  // Load complete leave workspace from backend
  const loadWorkspace = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const data = await fetchFacultyLeaveWorkspace();
      setWorkspaceData(data);
      if (data.activeTimelineRequest) {
        setSelectedTimelineRequest(data.activeTimelineRequest);
      } else if (data.requests.length > 0) {
        setSelectedTimelineRequest(data.requests[0]);
      } else {
        setSelectedTimelineRequest(null);
      }
    } catch (err: any) {
      console.error("Failed to load leave workspace:", err);
      const msg = err.response?.data?.message || "Failed to load leave workspace records from server.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  // Read-only department from backend faculty profile (or fallback to profile context)
  const facultyDepartment = useMemo(() => {
    if (workspaceData?.department) return workspaceData.department;
    if (workspaceData?.faculty?.department) return workspaceData.faculty.department;
    return profile?.department || "CSE";
  }, [workspaceData, profile]);

  const facultyName = useMemo(() => {
    if (workspaceData?.faculty?.name) return workspaceData.faculty.name;
    return profile?.personaName || "Faculty Member";
  }, [workspaceData, profile]);

  const leaves = useMemo(() => workspaceData?.requests || [], [workspaceData]);
  const balances = useMemo(() => workspaceData?.balances || [], [workspaceData]);
  const stats = useMemo(() => workspaceData?.stats, [workspaceData]);

  // Synchronize local search / filter logic
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      const matchesSearch =
        l.reason?.toLowerCase().includes(search.toLowerCase()) ||
        l.id?.toLowerCase().includes(search.toLowerCase()) ||
        l.leaveType?.toLowerCase().includes(search.toLowerCase());

      const matchesType =
        selectedType === "All Types" || l.leaveType.toLowerCase() === selectedType.toLowerCase();

      const matchesStatus =
        selectedStatus === "All Status" ||
        l.status.toLowerCase() === selectedStatus.toLowerCase() ||
        (selectedStatus === "Pending" && (l.status === "SUBMITTED" || l.status === "HOD_REVIEW" || l.status === "PENDING" || l.status === "PENDING_APPROVAL"));

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [leaves, search, selectedType, selectedStatus]);

  // Check calculated duration of requested dates
  const calculatedDays = useMemo(() => {
    if (!formFields.startDate || !formFields.endDate) return 0;
    if (formFields.isHalfDay) return 0.5;
    const start = new Date(formFields.startDate);
    const end = new Date(formFields.endDate);
    if (start > end) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [formFields.startDate, formFields.endDate, formFields.isHalfDay]);

  // Check available balance for selected leave category
  const selectedBalance = useMemo(() => {
    return balances.find((b) => b.leaveType.toLowerCase().includes(formFields.leaveType.toLowerCase()));
  }, [balances, formFields.leaveType]);

  const hasInsufficientBalance = useMemo(() => {
    if (!selectedBalance) return false;
    const available = selectedBalance.remaining - (selectedBalance.pending || 0);
    return calculatedDays > available;
  }, [selectedBalance, calculatedDays]);

  // Real-time Timetable conflict checker when start or end date changes
  useEffect(() => {
    if (!isApplyModalOpen) return;
    if (!formFields.startDate || !formFields.endDate) {
      setConflicts([]);
      return;
    }
    const start = new Date(formFields.startDate);
    const end = new Date(formFields.endDate);
    if (start > end) {
      setConflicts([]);
      return;
    }

    let isMounted = true;
    const runConflictCheck = async () => {
      setCheckingConflicts(true);
      try {
        const found = await checkTimetableConflicts(formFields.startDate, formFields.endDate);
        if (isMounted) setConflicts(found);
      } catch (e) {
        console.error("Conflict check error:", e);
      } finally {
        if (isMounted) setCheckingConflicts(false);
      }
    };

    const timer = setTimeout(runConflictCheck, 350);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formFields.startDate, formFields.endDate, isApplyModalOpen]);

  // Form Reset
  const handleFormReset = () => {
    const today = new Date().toISOString().split("T")[0];
    setFormFields({
      leaveType: "Casual",
      startDate: today,
      endDate: today,
      isHalfDay: false,
      halfDaySession: "MORNING",
      reason: "",
      emergencyContact: "",
      additionalNotes: "",
      attachmentName: "",
    });
    setConflicts([]);
  };

  // Submit Leave Action
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.reason.trim()) {
      toast.error("Please provide a reason for the leave request.");
      return;
    }
    if (!formFields.emergencyContact.trim()) {
      toast.error("Emergency contact details are required.");
      return;
    }
    if (calculatedDays <= 0) {
      toast.error("End date must be on or after start date.");
      return;
    }
    if (hasInsufficientBalance) {
      toast.error(`Insufficient ${formFields.leaveType} Leave balance. Available: ${selectedBalance ? selectedBalance.remaining - (selectedBalance.pending || 0) : 0} days.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await applyForFacultyLeave({
        leaveType: formFields.leaveType,
        startDate: formFields.startDate,
        endDate: formFields.endDate,
        isHalfDay: formFields.isHalfDay,
        halfDaySession: formFields.isHalfDay ? formFields.halfDaySession : undefined,
        reason: formFields.reason,
        emergencyContact: formFields.emergencyContact,
        additionalNotes: formFields.additionalNotes || undefined,
        attachmentName: formFields.attachmentName || undefined,
      });

      toast.success(res.message || "Leave request submitted for approval successfully!");
      setIsApplyModalOpen(false);
      handleFormReset();
      await loadWorkspace(true);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to submit leave request.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action Withdraw / Cancel Leave
  const handleWithdrawLeave = async (id: string) => {
    if (!confirm(`Are you sure you want to withdraw leave request ${id}? This action will cancel the approval workflow.`)) {
      return;
    }
    setWithdrawingId(id);
    try {
      const res = await withdrawFacultyLeave(id);
      toast.success(res.message || `Leave request ${id} withdrawn successfully.`);
      if (selectedLeaveDetails?.id === id) {
        setIsViewDialogOpen(false);
      }
      await loadWorkspace(true);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to withdraw leave request.";
      toast.error(errorMsg);
    } finally {
      setWithdrawingId(null);
    }
  };

  // Export CSV Action - Only authenticated faculty's own leave records
  const handleExportCSV = () => {
    if (filteredLeaves.length === 0) {
      toast.info("No leave records available to export.");
      return;
    }
    const headers = [
      "Leave ID",
      "Faculty",
      "Department",
      "Leave Category",
      "Applied Date",
      "Start Date",
      "End Date",
      "Total Days",
      "Reason",
      "Current Status",
      "Approver / Actor",
    ];
    const rows = filteredLeaves.map((l) => [
      l.id,
      `"${facultyName}"`,
      `"${facultyDepartment}"`,
      `"${l.leaveType} Leave"`,
      l.appliedOn,
      l.startDate,
      l.endDate,
      l.days,
      `"${l.reason.replace(/"/g, '""')}"`,
      l.status,
      `"${l.approver || 'Pending Review'}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `My_Leave_Records_${facultyDepartment}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded personal leave records CSV report.");
  };

  // Calendar configuration (current month)
  const currentMonthName = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date());
  }, []);

  const calendarDays = useMemo(() => {
    const days = [];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    // Fill offset days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ dayNumber: "", isCurrentMonth: false });
    }

    // Fill current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      // Check for holiday or event
      const holiday = MOCK_HOLIDAYS_AND_EVENTS.find((h) => h.date === dateString);

      // Check for faculty's own leaves
      const leave = leaves.find(
        (l) =>
          dateString >= l.startDate &&
          dateString <= l.endDate &&
          l.status !== "CANCELLED" &&
          l.status !== "WITHDRAWN" &&
          l.status !== "Cancelled"
      );

      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateString,
        holiday,
        leave,
      });
    }

    // Pad remaining grid spaces
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({ dayNumber: "", isCurrentMonth: false });
    }

    return days;
  }, [leaves]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-fade-up">
      {/* 1. Header & Toolbar: My Leave & Absence */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <CalendarIcon className="size-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
                My Leave & Absence
              </h1>
              {/* Read-Only Department derived from authenticated faculty profile */}
              <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30 bg-primary/5">
                <Building2 className="size-3 mr-1" />
                Department: {facultyDepartment}
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Apply for leave, view your leave balance, and track approval status.
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start xl:self-auto w-full xl:w-auto">
          {/* Prominent Primary Action Button */}
          <Button
            onClick={() => {
              handleFormReset();
              setIsApplyModalOpen(true);
            }}
            className="h-9 gap-1.5 bg-brand-gradient text-white text-xs font-semibold shadow-glow rounded-xl hover:opacity-95 cursor-pointer shrink-0"
          >
            <Plus className="size-4" /> Apply for Leave
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadWorkspace(true)}
            disabled={loading || refreshing}
            className="h-9 gap-1.5 text-xs font-semibold border-border hover:bg-accent cursor-pointer"
          >
            <RefreshCw className={cn("size-3.5", (loading || refreshing) && "animate-spin")} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-1.5 text-xs font-semibold border-border hover:bg-accent cursor-pointer"
          >
            <Download className="size-3.5" /> Export
          </Button>
        </div>
      </div>

      {loading ? (
        /* Loading skeleton state */
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-muted/60 animate-pulse rounded-2xl border border-border/80" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-[260px] bg-muted/60 animate-pulse rounded-2xl border border-border/80" />
              <div className="h-[360px] bg-muted/60 animate-pulse rounded-2xl border border-border/80" />
            </div>
            <div className="space-y-6">
              <div className="h-[300px] bg-muted/60 animate-pulse rounded-2xl border border-border/80" />
              <div className="h-[220px] bg-muted/60 animate-pulse rounded-2xl border border-border/80" />
            </div>
          </div>
        </div>
      ) : error ? (
        /* Error panel state */
        <div className="p-5 rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive text-sm font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => loadWorkspace()} className="text-xs border-destructive/30 hover:bg-destructive/10">
            Try Again
          </Button>
        </div>
      ) : (
        <>
          {/* 2. Real Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {[
              {
                label: "Casual Leave",
                val: stats?.casualText || "0 / 0 Days",
                icon: Plane,
                bg: "bg-blue-500/10 text-blue-600 border-blue-500/10",
              },
              {
                label: "Sick Leave",
                val: stats?.sickText || "0 / 0 Days",
                icon: Heart,
                bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/10",
              },
              {
                label: "Earned Leave",
                val: stats?.earnedText || "0 / 0 Days",
                icon: UserCog,
                bg: "bg-violet-500/10 text-violet-600 border-violet-500/10",
              },
              {
                label: "Duty Leave",
                val: stats?.dutyText || "0 Remaining",
                icon: Briefcase,
                bg: "bg-amber-500/10 text-amber-600 border-amber-500/10",
              },
              {
                label: "Pending Approvals",
                val: stats?.pendingText || "0 Requests",
                icon: Clock,
                bg: "bg-rose-500/10 text-rose-600 border-rose-500/10",
              },
              {
                label: "Upcoming Leave",
                val: stats?.upcomingText || "No upcoming leaves",
                icon: CalendarDays,
                bg: "bg-sky-500/10 text-sky-600 border-sky-500/10",
              },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-1 hover:border-primary/30 transition-colors duration-300"
                >
                  <div className="flex items-center justify-between text-[0.68rem] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span className="truncate">{card.label}</span>
                    <span className={cn("p-1 rounded-lg shrink-0", card.bg)}>
                      <Icon className="size-3.5" />
                    </span>
                  </div>
                  <p className="font-display text-lg font-bold text-foreground mt-1.5 truncate">{card.val}</p>
                </div>
              );
            })}
          </div>

          {/* 3. Main Layout: Left Column (2/3) and Right Column (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Leave Quota Balances Progress Bars */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <div className="border-b border-border/60 pb-3 flex items-center justify-between">
                  <h3 className="font-bold text-sm md:text-base text-foreground flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" /> Leave Quota Balances
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono font-medium">
                    Academic Year {workspaceData?.academicYear || "2026-27"}
                  </span>
                </div>

                {balances.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    Leave policy has not been configured for your profile.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {balances.map((bal, idx) => {
                      const percent = bal.percent ?? Math.min(100, Math.round((bal.used / (bal.total || 1)) * 100));
                      return (
                        <div key={idx} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-foreground">{bal.leaveType} Leave</span>
                            <span className="text-muted-foreground font-mono text-[0.72rem]">
                              {bal.remaining} Left &middot; {bal.used} Used
                              {bal.pending ? ` (${bal.pending} Pending)` : ""}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", bal.color)}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground font-medium font-mono">
                            <span>{bal.total} Days Entitlement</span>
                            <span>{percent}% Used</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* My Leave Requests Section */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <h3 className="font-bold text-sm md:text-base text-foreground">
                      My Leave Requests
                    </h3>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {filteredLeaves.length} Records
                    </Badge>
                  </div>

                  {/* Filters & Search Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-40">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search ID, reason..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-8 text-xs rounded-lg"
                      />
                    </div>

                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="h-8 w-28 text-xs bg-card border-border">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {["All Types", "Casual", "Sick", "Earned", "Duty Leave"].map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="h-8 w-28 text-xs bg-card border-border">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {["All Status", "Pending", "Approved", "Rejected", "Withdrawn"].map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="h-8 w-28 text-xs bg-card border-border font-mono">
                        <SelectValue placeholder="AY" />
                      </SelectTrigger>
                      <SelectContent>
                        {["AY 2026-27", "AY 2025-26"].map((y) => (
                          <SelectItem key={y} value={y} className="text-xs">
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredLeaves.length === 0 ? (
                  /* Empty state */
                  <div className="py-12 text-center space-y-3 border border-dashed border-border rounded-xl">
                    <div className="p-3 rounded-full bg-muted/30 w-fit mx-auto text-muted-foreground">
                      <FileText className="size-6" />
                    </div>
                    <p className="text-xs font-bold text-foreground">No leave requests yet.</p>
                    <p className="text-[0.72rem] text-muted-foreground max-w-xs mx-auto">
                      You haven't submitted any leave applications matching the active filters.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        handleFormReset();
                        setIsApplyModalOpen(true);
                      }}
                      className="bg-brand-gradient text-white text-xs font-semibold rounded-xl"
                    >
                      <Plus className="size-3.5 mr-1" /> Apply for Leave
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/60">
                    {/* Desktop Table */}
                    <table className="w-full text-left text-xs hidden md:table">
                      <thead className="bg-muted/40 text-muted-foreground font-mono text-[0.68rem] uppercase border-b border-border/60">
                        <tr>
                          <th className="py-3 px-3.5">Request ID</th>
                          <th className="py-3 px-3.5">Leave Type</th>
                          <th className="py-3 px-3.5">Dates</th>
                          <th className="py-3 px-3.5">Days</th>
                          <th className="py-3 px-3.5">Reason</th>
                          <th className="py-3 px-3.5">Submitted</th>
                          <th className="py-3 px-3.5">Status</th>
                          <th className="py-3 px-3.5 text-right pr-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {filteredLeaves.map((l) => {
                          const isPending =
                            l.status === "SUBMITTED" ||
                            l.status === "HOD_REVIEW" ||
                            l.status === "PENDING" ||
                            l.status === "PENDING_APPROVAL";

                          return (
                            <tr
                              key={l.id}
                              onClick={() => setSelectedTimelineRequest(l)}
                              className={cn(
                                "hover:bg-muted/20 transition-colors cursor-pointer",
                                selectedTimelineRequest?.id === l.id && "bg-primary/5 font-medium"
                              )}
                            >
                              <td className="py-3 px-3.5 font-mono font-bold text-primary">
                                {l.id}
                              </td>
                              <td className="py-3 px-3.5 font-semibold text-foreground">
                                {l.leaveType} Leave
                              </td>
                              <td className="py-3 px-3.5 text-muted-foreground font-mono whitespace-nowrap">
                                {l.startDate} to {l.endDate}
                              </td>
                              <td className="py-3 px-3.5 font-bold font-mono text-foreground">
                                {l.days}
                              </td>
                              <td className="py-3 px-3.5 text-muted-foreground truncate max-w-[140px]" title={l.reason}>
                                {l.reason}
                              </td>
                              <td className="py-3 px-3.5 text-muted-foreground font-mono whitespace-nowrap">
                                {l.appliedOn}
                              </td>
                              <td className="py-3 px-3.5">
                                <Badge
                                  className={cn(
                                    l.status === "APPROVED" || l.status === "Approved"
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[0.65rem]"
                                      : l.status === "REJECTED" || l.status === "Rejected"
                                      ? "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[0.65rem]"
                                      : l.status === "WITHDRAWN" || l.status === "CANCELLED" || l.status === "Cancelled"
                                      ? "bg-muted text-muted-foreground border-border text-[0.65rem]"
                                      : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[0.65rem]"
                                  )}
                                >
                                  {l.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-3.5 text-right pr-4">
                                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedLeaveDetails(l);
                                      setIsViewDialogOpen(true);
                                    }}
                                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="View Dossier"
                                  >
                                    <Eye className="size-3.5" />
                                  </Button>
                                  {isPending && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={withdrawingId === l.id}
                                      onClick={() => handleWithdrawLeave(l.id)}
                                      className="size-7 rounded-lg text-muted-foreground hover:text-red-500 cursor-pointer"
                                      title="Withdraw Request"
                                    >
                                      {withdrawingId === l.id ? (
                                        <RefreshCw className="size-3 animate-spin text-red-500" />
                                      ) : (
                                        <Ban className="size-3.5" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Mobile Roster View */}
                    <div className="block md:hidden divide-y divide-border/60">
                      {filteredLeaves.map((l) => {
                        const isPending =
                          l.status === "SUBMITTED" ||
                          l.status === "HOD_REVIEW" ||
                          l.status === "PENDING" ||
                          l.status === "PENDING_APPROVAL";

                        return (
                          <div
                            key={l.id}
                            onClick={() => setSelectedTimelineRequest(l)}
                            className="p-3.5 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-primary">{l.id}</span>
                              <Badge
                                className={cn(
                                  l.status === "APPROVED" || l.status === "Approved"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : l.status === "REJECTED" || l.status === "Rejected"
                                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                    : l.status === "WITHDRAWN" || l.status === "CANCELLED" || l.status === "Cancelled"
                                    ? "bg-muted text-muted-foreground border-border"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                )}
                              >
                                {l.status}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">
                                {l.leaveType} Leave &middot; {l.days} Day(s)
                              </p>
                              <p className="text-[0.68rem] text-muted-foreground font-mono">
                                {l.startDate} to {l.endDate}
                              </p>
                              <p className="text-muted-foreground font-medium line-clamp-1">
                                Reason: {l.reason}
                              </p>
                            </div>
                            <div
                              className="flex items-center justify-end gap-2 pt-2 border-t border-border/30 mt-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedLeaveDetails(l);
                                  setIsViewDialogOpen(true);
                                }}
                                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                              >
                                <Eye className="size-3.5 mr-1" /> View
                              </Button>
                              {isPending && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={withdrawingId === l.id}
                                  onClick={() => handleWithdrawLeave(l.id)}
                                  className="h-7 text-xs text-red-500 hover:text-red-600"
                                >
                                  <Ban className="size-3.5 mr-1" /> Withdraw
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly Attendance & Leave Calendar */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <div className="border-b border-border/60 pb-3 flex items-center justify-between">
                  <h3 className="font-bold text-sm md:text-base text-foreground flex items-center gap-2">
                    <CalendarIcon className="size-4 text-primary" /> Monthly Attendance & Leave Calendar
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold font-mono">{currentMonthName}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5 text-[0.68rem] text-muted-foreground border-b border-border/40 pb-2">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-emerald-500" /> Approved Leave
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-amber-500" /> Pending Review
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-blue-500" /> Institutional Holidays
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1 md:gap-1.5 text-center">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-[0.68rem] font-bold text-muted-foreground py-1 bg-muted/30 rounded-lg">
                      {day}
                    </div>
                  ))}

                  {calendarDays.map((cell, idx) => {
                    const isSelected = !!(
                      selectedCalendarEvent &&
                      ((cell.holiday && "title" in selectedCalendarEvent && selectedCalendarEvent.title === cell.holiday.title) ||
                        (cell.leave && "id" in selectedCalendarEvent && selectedCalendarEvent.id === cell.leave.id))
                    );

                    return (
                      <button
                        key={idx}
                        disabled={!cell.isCurrentMonth}
                        onClick={() => {
                          if (cell.holiday) setSelectedCalendarEvent(cell.holiday);
                          else if (cell.leave) setSelectedCalendarEvent(cell.leave);
                          else setSelectedCalendarEvent(null);
                        }}
                        className={cn(
                          "min-h-12 md:min-h-14 p-1 border border-border/40 rounded-xl relative flex flex-col items-start transition-all hover:bg-muted/30 select-none w-full text-left",
                          !cell.isCurrentMonth && "opacity-20 bg-muted/10 cursor-not-allowed",
                          isSelected ? "ring-2 ring-primary ring-offset-1 bg-primary/5 border-primary/20" : "",
                          cell.holiday && "bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20",
                          cell.leave && (cell.leave.status === "APPROVED" || cell.leave.status === "Approved") && "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20",
                          cell.leave && (cell.leave.status === "HOD_REVIEW" || cell.leave.status === "SUBMITTED" || cell.leave.status === "Pending") && "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20"
                        )}
                      >
                        <span className="text-[0.68rem] font-semibold text-muted-foreground">{cell.dayNumber}</span>
                        {cell.holiday && (
                          <div className="text-[0.55rem] font-bold px-1 py-0.5 rounded mt-0.5 truncate w-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            {cell.holiday.title}
                          </div>
                        )}
                        {cell.leave && (
                          <div
                            className={cn(
                              "text-[0.55rem] font-bold px-1 py-0.5 rounded mt-0.5 truncate w-full",
                              cell.leave.status === "APPROVED" || cell.leave.status === "Approved"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            )}
                          >
                            {cell.leave.leaveType}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedCalendarEvent && (
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/20 animate-fade-in text-xs space-y-1">
                    <div className="flex items-center justify-between border-b border-border/40 pb-1">
                      <span className="font-bold text-foreground">Date Details</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCalendarEvent(null)}
                        className="h-5 px-1 text-[0.65rem] hover:bg-muted font-bold text-red-500"
                      >
                        Clear
                      </Button>
                    </div>
                    {"title" in selectedCalendarEvent ? (
                      <div>
                        <p className="font-semibold text-primary">{selectedCalendarEvent.title}</p>
                        <p className="text-muted-foreground text-[0.68rem]">{selectedCalendarEvent.details}</p>
                        <Badge variant="outline" className="text-[0.6rem] font-mono mt-1">
                          {selectedCalendarEvent.type} Holiday
                        </Badge>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-foreground">
                          Leave ID: {selectedCalendarEvent.id} &middot; {selectedCalendarEvent.leaveType} Leave
                        </p>
                        <p className="text-muted-foreground text-[0.68rem]">Reason: {selectedCalendarEvent.reason}</p>
                        <p className="text-[0.68rem] font-mono text-muted-foreground">
                          {selectedCalendarEvent.startDate} to {selectedCalendarEvent.endDate} ({selectedCalendarEvent.days} days)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (1/3 width) */}
            <div className="space-y-6">
              {/* 4. Active Request Timeline */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="font-bold text-sm md:text-base text-foreground flex items-center gap-1.5">
                    <Clock className="size-4 text-primary shrink-0" /> Active Request Timeline
                  </h3>
                  {selectedTimelineRequest && (
                    <Badge variant="outline" className="text-[0.65rem] font-mono bg-card">
                      {selectedTimelineRequest.id}
                    </Badge>
                  )}
                </div>

                {!selectedTimelineRequest ? (
                  <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    No active requests. Select a leave request to view its approval timeline.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header info for selected request */}
                    <div className="p-3 bg-muted/40 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold font-mono text-primary">{selectedTimelineRequest.id}</span>
                        <Badge
                          className={cn(
                            selectedTimelineRequest.status === "APPROVED" || selectedTimelineRequest.status === "Approved"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[0.62rem]"
                              : selectedTimelineRequest.status === "REJECTED" || selectedTimelineRequest.status === "Rejected"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[0.62rem]"
                              : selectedTimelineRequest.status === "WITHDRAWN"
                              ? "bg-muted text-muted-foreground text-[0.62rem]"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[0.62rem]"
                          )}
                        >
                          {selectedTimelineRequest.status}
                        </Badge>
                      </div>
                      <p className="text-[0.72rem] text-foreground font-semibold">
                        {selectedTimelineRequest.leaveType} Leave &middot; {selectedTimelineRequest.days} Day(s)
                      </p>
                      <p className="text-[0.68rem] text-muted-foreground font-mono">
                        {selectedTimelineRequest.startDate} to {selectedTimelineRequest.endDate}
                      </p>
                      <p className="text-[0.68rem] text-muted-foreground italic">
                        "{selectedTimelineRequest.reason}"
                      </p>
                    </div>

                    {/* Step-by-Step Approval Timeline */}
                    <div className="relative pl-5 border-l-2 border-border/60 ml-2.5 space-y-5 py-1">
                      {selectedTimelineRequest.approvalSteps && selectedTimelineRequest.approvalSteps.length > 0 ? (
                        selectedTimelineRequest.approvalSteps.map((step, idx) => {
                          const isCompleted = step.status === "Completed" || step.status === "APPROVED";
                          const isCurrent = step.status === "Current" || step.status === "Pending";
                          const isRejected = step.status === "REJECTED";

                          return (
                            <div key={idx} className="relative">
                              {/* Circle dot marker */}
                              <span
                                className={cn(
                                  "absolute -left-[27px] top-1 rounded-full border-2 bg-card size-3.5 z-10 flex items-center justify-center",
                                  isCompleted
                                    ? "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
                                    : isRejected
                                    ? "border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/20"
                                    : isCurrent
                                    ? "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20 animate-pulse"
                                    : "border-border text-muted-foreground bg-muted"
                                )}
                              >
                                {isCompleted && <span className="size-1.5 rounded-full bg-emerald-500" />}
                                {isCurrent && <span className="size-1.5 rounded-full bg-amber-500" />}
                                {isRejected && <span className="size-1.5 rounded-full bg-rose-500" />}
                              </span>

                              <div className="text-xs space-y-0.5">
                                <div className="flex items-center justify-between">
                                  <p
                                    className={cn(
                                      "font-bold",
                                      isCompleted
                                        ? "text-foreground"
                                        : isRejected
                                        ? "text-rose-600"
                                        : isCurrent
                                        ? "text-amber-600"
                                        : "text-muted-foreground"
                                    )}
                                  >
                                    {step.name || step.label}
                                  </p>
                                  {(step.date || step.actedAt) && (
                                    <span className="text-[0.65rem] text-muted-foreground font-mono">
                                      {step.date || step.actedAt}
                                    </span>
                                  )}
                                </div>
                                {(step.approver || step.actorName) && (
                                  <p className="text-[0.68rem] text-muted-foreground">
                                    Actor: <span className="font-semibold text-foreground">{step.approver || step.actorName}</span>
                                  </p>
                                )}
                                {(step.remarks || step.comment) && (
                                  <p className="text-[0.68rem] text-primary/90 mt-1 bg-primary/5 px-2 py-1 rounded border border-primary/10 italic">
                                    "{step.remarks || step.comment}"
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground">No approval stages defined.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Upcoming Approved Leave Widget */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-sm md:text-base text-foreground border-b border-border/60 pb-3 flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-primary shrink-0" /> Upcoming Approved Leave
                </h3>

                {stats?.upcomingApproved ? (
                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-emerald-700 dark:text-emerald-300">
                        {stats.upcomingApproved.id}
                      </span>
                      <Badge className="bg-emerald-500/10 text-emerald-600 text-[0.62rem] border-emerald-500/20">
                        APPROVED
                      </Badge>
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-foreground">
                        {stats.upcomingApproved.leaveType} Leave ({stats.upcomingApproved.days} Days)
                      </p>
                      <p className="text-[0.7rem] text-muted-foreground font-mono">
                        {stats.upcomingApproved.startDate} &rarr; {stats.upcomingApproved.endDate}
                      </p>
                      <p className="text-[0.68rem] text-muted-foreground">
                        Reason: {stats.upcomingApproved.reason}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    No upcoming approved leave scheduled.
                  </div>
                )}
              </div>

              {/* 6. Upcoming Holidays & Events Schedule */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-sm md:text-base text-foreground border-b border-border/60 pb-3 flex items-center gap-1.5">
                  <CalendarClock className="size-4 text-primary shrink-0" /> Academic Holidays & Calendar
                </h3>

                <div className="space-y-3">
                  {MOCK_HOLIDAYS_AND_EVENTS.map((event, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-2.5 rounded-xl border border-border/40 bg-muted/10 hover:border-primary/20 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center p-1 bg-card border border-border rounded-lg text-center shrink-0 w-11 h-11 font-mono">
                        <span className="text-[0.6rem] font-bold text-primary uppercase">
                          {new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(event.date))}
                        </span>
                        <span className="text-xs font-extrabold text-foreground">
                          {new Date(event.date).getDate()}
                        </span>
                      </div>
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-foreground">{event.title}</p>
                        <p className="text-[0.68rem] text-muted-foreground line-clamp-1">{event.details}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[0.6rem] font-mono",
                            event.type === "National"
                              ? "bg-purple-500/5 text-purple-600 border-purple-500/20"
                              : event.type === "Exam"
                              ? "bg-rose-500/5 text-rose-600 border-rose-500/20"
                              : "bg-blue-500/5 text-blue-600 border-blue-500/20"
                          )}
                        >
                          {event.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* APPLY FOR LEAVE MODAL                                    */}
      {/* ======================================================== */}
      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <Plus className="size-5 text-primary" /> Apply for Leave
            </DialogTitle>
            <DialogDescription>
              Submit an official leave application for institutional review and approval.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplySubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Leave Category Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Leave Type</Label>
                <Select
                  value={formFields.leaveType}
                  onValueChange={(val) => setFormFields({ ...formFields, leaveType: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Leave Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {balances.map((b) => (
                      <SelectItem key={b.leaveType} value={b.leaveType} className="text-xs">
                        {b.leaveType} Leave ({b.remaining - (b.pending || 0)} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Available Quota Indicator */}
              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="p-2 bg-muted/30 border border-border/60 rounded-xl flex items-center justify-between text-xs h-9">
                  <span className="text-muted-foreground">Available Quota:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedBalance ? selectedBalance.remaining - (selectedBalance.pending || 0) : 0} Days
                  </span>
                </div>
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Date</Label>
                <Input
                  type="date"
                  required
                  value={formFields.startDate}
                  onChange={(e) => setFormFields({ ...formFields, startDate: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">End Date</Label>
                <Input
                  type="date"
                  required
                  value={formFields.endDate}
                  onChange={(e) => setFormFields({ ...formFields, endDate: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Half Day Option */}
              <div className="space-y-1.5 col-span-1 sm:col-span-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 border border-border/80 bg-muted/10 rounded-xl gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formFields.isHalfDay}
                      onChange={(e) => setFormFields({ ...formFields, isHalfDay: e.target.checked })}
                      className="rounded size-4 cursor-pointer text-primary"
                    />
                    <span>Apply as Half-Day Session (0.5 Day)</span>
                  </label>

                  {formFields.isHalfDay && (
                    <div className="flex items-center gap-2 text-xs">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="halfDaySession"
                          checked={formFields.halfDaySession === "MORNING"}
                          onChange={() => setFormFields({ ...formFields, halfDaySession: "MORNING" })}
                        />
                        <span>Morning</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="halfDaySession"
                          checked={formFields.halfDaySession === "AFTERNOON"}
                          onChange={() => setFormFields({ ...formFields, halfDaySession: "AFTERNOON" })}
                        />
                        <span>Afternoon</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Calculated Total Days */}
              <div className="col-span-1 sm:col-span-2 p-2.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
                <span className="font-semibold text-primary">Requested Duration:</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  {calculatedDays} {calculatedDays === 1 ? "Day" : "Days"}
                </span>
              </div>

              {/* Insufficient Balance Warning */}
              {hasInsufficientBalance && (
                <div className="col-span-1 sm:col-span-2 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>
                    Insufficient {formFields.leaveType} Leave balance. You have{" "}
                    {selectedBalance ? selectedBalance.remaining - (selectedBalance.pending || 0) : 0} days available,
                    but requested {calculatedDays} days.
                  </span>
                </div>
              )}

              {/* Timetable Conflict Warning */}
              {conflicts.length > 0 && (
                <div className="col-span-1 sm:col-span-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>Teaching Schedule Conflict ({conflicts.length} Sessions)</span>
                  </div>
                  <p className="text-[0.7rem] text-muted-foreground">
                    This leave overlaps with your scheduled teaching classes. Please arrange alternate coverage or note handover details below:
                  </p>
                  <div className="max-h-28 overflow-y-auto space-y-1.5 pt-1">
                    {conflicts.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-1.5 bg-background/80 rounded border border-amber-500/20 text-[0.68rem] flex items-center justify-between font-mono"
                      >
                        <span className="font-bold text-foreground">
                          {c.date} ({c.day}) &middot; Period {c.periodNumber}
                        </span>
                        <span className="text-muted-foreground">
                          {c.courseCode} ({c.section}) &middot; {c.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Emergency Contact Number *</Label>
                <Input
                  required
                  placeholder="+91 98765 43210"
                  value={formFields.emergencyContact}
                  onChange={(e) => setFormFields({ ...formFields, emergencyContact: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Attachment File Simulation */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Supporting Document (Optional)</Label>
                <div
                  onClick={() => {
                    const sampleDocs = ["Medical_Certificate.pdf", "Conference_Invitation.pdf", "Duty_Letter.pdf"];
                    const chosen = sampleDocs[Math.floor(Math.random() * sampleDocs.length)];
                    setFormFields({ ...formFields, attachmentName: chosen });
                    toast.info(`Uploaded file "${chosen}"`);
                  }}
                  className="border border-dashed border-border hover:border-primary/60 bg-muted/10 hover:bg-muted/20 p-2 rounded-xl h-9 flex items-center justify-center gap-1.5 text-xs text-muted-foreground cursor-pointer truncate"
                >
                  <FileUp className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">
                    {formFields.attachmentName || "Click to upload document..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason for Absence *</Label>
              <Textarea
                required
                rows={2}
                placeholder="Explain the purpose of leave..."
                value={formFields.reason}
                onChange={(e) => setFormFields({ ...formFields, reason: e.target.value })}
                className="text-xs min-h-[60px]"
              />
            </div>

            {/* Handover / Remarks */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Handover / Additional Notes (Optional)</Label>
              <Input
                placeholder="e.g. Syllabus and lab sessions handed over to alternate faculty"
                value={formFields.additionalNotes}
                onChange={(e) => setFormFields({ ...formFields, additionalNotes: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsApplyModalOpen(false)}
                className="h-9 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || hasInsufficientBalance || calculatedDays <= 0}
                className="h-9 bg-brand-gradient text-white text-xs font-semibold shadow-glow rounded-xl hover:opacity-95 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="size-3 animate-spin mr-1.5" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="size-3.5 mr-1.5" />
                    Submit Leave Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* VIEW LEAVE REQUEST DETAILS DOSSIER MODAL                  */}
      {/* ======================================================== */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-4 text-primary shrink-0" />
              Leave Request Dossier &middot; {selectedLeaveDetails?.id}
            </DialogTitle>
            <DialogDescription>
              Submitted on {selectedLeaveDetails?.appliedOn} by {selectedLeaveDetails?.applicantName || facultyName}
            </DialogDescription>
          </DialogHeader>

          {selectedLeaveDetails && (
            <div className="space-y-4 text-xs pt-2">
              {/* Summary Metadata Card */}
              <div className="grid grid-cols-2 gap-3.5 p-3.5 bg-muted/40 rounded-xl border border-border/50">
                <div>
                  <span className="text-[0.68rem] text-muted-foreground block">Leave Type</span>
                  <span className="font-bold text-foreground">{selectedLeaveDetails.leaveType} Leave</span>
                </div>
                <div>
                  <span className="text-[0.68rem] text-muted-foreground block">Total Days</span>
                  <span className="font-bold text-foreground font-mono">{selectedLeaveDetails.days} Day(s)</span>
                </div>
                <div>
                  <span className="text-[0.68rem] text-muted-foreground block">Start Date</span>
                  <span className="font-bold text-foreground font-mono">{selectedLeaveDetails.startDate}</span>
                </div>
                <div>
                  <span className="text-[0.68rem] text-muted-foreground block">End Date</span>
                  <span className="font-bold text-foreground font-mono">{selectedLeaveDetails.endDate}</span>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <span className="text-[0.68rem] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Reason for Absence
                </span>
                <p className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-foreground">
                  {selectedLeaveDetails.reason}
                </p>
              </div>

              {/* Remarks / Handover */}
              {selectedLeaveDetails.remarks && (
                <div className="space-y-1">
                  <span className="text-[0.68rem] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Handover & Additional Notes
                  </span>
                  <p className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-foreground">
                    {selectedLeaveDetails.remarks}
                  </p>
                </div>
              )}

              {/* Emergency Contact */}
              <div className="flex items-center justify-between p-2.5 bg-muted/20 rounded-lg border border-border/40">
                <span className="text-muted-foreground">Emergency Contact:</span>
                <span className="font-mono font-bold text-foreground">
                  {selectedLeaveDetails.emergencyContact || "Not provided"}
                </span>
              </div>

              {/* Status & Reviewers */}
              <div className="space-y-2 pt-1 border-t border-border/40">
                <span className="text-[0.68rem] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Approval Timeline & Review Actors
                </span>
                <div className="space-y-2">
                  {selectedLeaveDetails.approvalSteps?.map((s, i) => (
                    <div key={i} className="p-2.5 rounded-lg border border-border/40 bg-muted/10 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-foreground">{s.name || s.label}</p>
                        {s.approver && (
                          <p className="text-[0.68rem] text-muted-foreground">Reviewer: {s.approver}</p>
                        )}
                        {s.remarks && (
                          <p className="text-[0.68rem] text-primary italic">"{s.remarks}"</p>
                        )}
                      </div>
                      <Badge
                        className={cn(
                          s.status === "Completed" || s.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : s.status === "REJECTED"
                            ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        )}
                      >
                        {s.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 flex items-center justify-between w-full">
            {selectedLeaveDetails &&
              (selectedLeaveDetails.status === "SUBMITTED" ||
                selectedLeaveDetails.status === "HOD_REVIEW" ||
                selectedLeaveDetails.status === "PENDING" ||
                selectedLeaveDetails.status === "PENDING_APPROVAL") && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={withdrawingId === selectedLeaveDetails.id}
                  onClick={() => handleWithdrawLeave(selectedLeaveDetails.id)}
                  className="text-xs rounded-xl cursor-pointer"
                >
                  {withdrawingId === selectedLeaveDetails.id ? (
                    <RefreshCw className="size-3.5 animate-spin mr-1" />
                  ) : (
                    <Ban className="size-3.5 mr-1" />
                  )}
                  Withdraw Request
                </Button>
              )}
            <Button
              onClick={() => setIsViewDialogOpen(false)}
              className="rounded-xl cursor-pointer bg-muted text-foreground text-xs font-semibold px-4 py-2 hover:bg-muted/80 ml-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
