import React, { useState, useEffect, useMemo } from "react";
import {
  Bell,
  Send,
  History,
  CheckCircle2,
  Users,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Filter,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  Lock,
  Layers,
  Sparkles,
  Info,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Panel } from "@/components/dashboard/panel";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface ExamNotificationManagerProps {
  mode: "super-admin" | "hod" | "examination";
  defaultDepartment?: string;
}

export function ExamNotificationManager({
  mode,
  defaultDepartment,
}: ExamNotificationManagerProps) {
  const isHod = mode === "hod";
  const isSuperAdmin = mode === "super-admin" || mode === "examination";

  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");

  // Metadata from PostgreSQL
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>(["2026-27"]);
  const [semesters, setSemesters] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8]);
  const [userDept, setUserDept] = useState<string>(defaultDepartment || "CSE");

  // Form State
  const [form, setForm] = useState({
    type: "EXAM_SCHEDULE",
    title: "",
    message: "",
    priority: "High",
    department: defaultDepartment || "CSE",
    academicYear: "2026-27",
    semester: "5",
    section: "ALL",
    courseCode: "ALL",
    examDate: "2026-10-12",
    examTime: "10:00 AM - 01:00 PM",
    venue: "Block A - Room 302",
    scope: isHod ? "department" : "semester",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<{
    totalRecipients: number;
    studentCount: number;
    facultyCount: number;
    hodCount: number;
    sampleRecipients?: any[];
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");

  // Selected Detail Modal State
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // 1. Fetch metadata on mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await api.get("/api/notifications/exam/meta-options");
        if (res.data?.success) {
          setDepartments(res.data.departments || []);
          setCourses(res.data.courses || []);
          if (res.data.academicYears) setAcademicYears(res.data.academicYears);
          if (res.data.semesters) setSemesters(res.data.semesters);
          if (res.data.userDepartment) {
            setUserDept(res.data.userDepartment);
            if (isHod) {
              setForm((prev) => ({ ...prev, department: res.data.userDepartment }));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load exam notification metadata:", err);
      }
    }
    loadMeta();
  }, [isHod]);

  // 2. Fetch history
  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await api.get("/api/notifications/exam/history");
      if (res.data?.success) {
        setHistoryList(res.data.history || []);
      }
    } catch (err) {
      console.error("Failed to load exam notification history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // 3. Dynamic recipient forecast preview
  useEffect(() => {
    let active = true;
    async function updatePreview() {
      setIsLoadingPreview(true);
      try {
        const targetDept = isHod ? userDept : form.department;
        const res = await api.get("/api/notifications/exam/preview-recipients", {
          params: {
            department: targetDept,
            semester: form.semester,
            section: form.section,
            courseCode: form.courseCode === "ALL" ? "" : form.courseCode,
            scope: form.scope,
          },
        });
        if (active && res.data?.success) {
          setPreview(res.data);
        }
      } catch {
        if (active) setPreview(null);
      } finally {
        if (active) setIsLoadingPreview(false);
      }
    }

    const timer = setTimeout(updatePreview, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form.department, form.semester, form.section, form.courseCode, form.scope, isHod, userDept]);

  // 4. Smart pre-fills on notification type selection
  const handleTypeChange = (typeVal: string) => {
    let title = "";
    let message = "";
    const dept = isHod ? userDept : form.department;
    const sem = form.semester;

    switch (typeVal) {
      case "EXAM_SCHEDULE":
        title = `Semester ${sem} End-Semester Examination Schedule Published`;
        message = `The official Semester ${sem} examination timetable for ${dept} has been approved and published. Students are required to inspect the date sheet and reporting times.`;
        break;
      case "EXAM_DATE_CHANGED":
        title = `Rescheduled Exam Notice: ${dept} Semester ${sem}`;
        message = `Please note that the upcoming examination date and session have been revised per Academic Controller orders. Check revised timings.`;
        break;
      case "EXAM_VENUE_CHANGED":
        title = `Examination Venue & Seating Hall Relocation`;
        message = `Seating arrangements for the scheduled examination have been allocated. Please report to the assigned examination block 15 minutes prior to commencement.`;
        break;
      case "HALL_TICKET_AVAILABLE":
        title = `Examination Hall Tickets Released for Download`;
        message = `Official hall tickets for ${dept} Semester ${sem} examinations are now available on the portal. Verify your barcode and registered subjects.`;
        break;
      case "EXAM_ELIGIBILITY_ALERT":
        title = `Attendance Shortage & Examination Condonation Notice`;
        message = `Students with attendance below 75% are cautioned to immediately verify eligibility requirements with the department office.`;
        break;
      case "EXAM_REMINDER":
        title = `Examination Reminder: Reporting & Mandatory ID Cards`;
        message = `Mandatory reminder: Carry your printed hall ticket and valid college ID card. Electronic gadgets and smart watches are strictly prohibited.`;
        break;
      case "RESULTS_PUBLISHED":
        title = `End-Semester SGPA / Grade Card Results Declared`;
        message = `The provisional examination results have been verified and published. Students may access their grade memo and apply for revaluation within 7 days.`;
        break;
      case "EXAM_CANCELLED":
        title = `Examination Postponed / Rescheduled Notice`;
        message = `Due to unavoidable circumstances, the scheduled examination has been postponed. The revised date will be communicated shortly.`;
        break;
      default:
        title = form.title;
        message = form.message;
    }

    setForm((prev) => ({
      ...prev,
      type: typeVal,
      title: title || prev.title,
      message: message || prev.message,
    }));
  };

  // 5. Filtered courses matching selected department and semester
  const availableCourses = useMemo(() => {
    const dept = isHod ? userDept : form.department;
    return courses.filter((c) => {
      const matchDept = dept === "ALL" || !c.department || c.department.toUpperCase() === dept.toUpperCase();
      const matchSem = form.semester === "ALL" || !c.semester || String(c.semester) === String(form.semester);
      return matchDept && matchSem;
    });
  }, [courses, form.department, form.semester, isHod, userDept]);

  // 6. Submit notification dispatch
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      return toast.error("Please enter a valid notification title and message.");
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Publishing notification to PostgreSQL...");

    try {
      const payload = {
        type: form.type,
        title: form.title.trim(),
        message: form.message.trim(),
        priority: form.priority,
        department: isHod ? userDept : form.department,
        academicYear: form.academicYear,
        semester: form.semester === "ALL" ? undefined : Number(form.semester),
        section: form.section === "ALL" ? undefined : form.section,
        courseCode: form.courseCode === "ALL" ? undefined : form.courseCode,
        examDate: form.examDate || undefined,
        examTime: form.examTime || undefined,
        venue: form.venue || undefined,
        scope: form.scope,
      };

      const res = await api.post("/api/notifications/exam/publish", payload);

      toast.dismiss(toastId);
      toast.success(
        `Dispatched successfully! Delivered to ${res.data?.totalRecipients || 0} recipient(s).`
      );

      // Refresh history and preview
      fetchHistory();
      setActiveTab("history");
    } catch (err: any) {
      toast.dismiss(toastId);
      const errMsg = err.response?.data?.error || err.message || "Failed to publish exam notification.";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Cancel / Recall Batch
  const handleCancelBatch = async (batchId: string) => {
    if (!confirm("Are you sure you want to cancel and recall this examination notice?")) {
      return;
    }

    const toastId = toast.loading("Cancelling notification...");
    try {
      await api.post(`/api/notifications/exam/${batchId}/cancel`);
      toast.dismiss(toastId);
      toast.success("Notification batch successfully cancelled.");
      fetchHistory();
      if (selectedBatch && selectedBatch.batchId === batchId) {
        setSelectedBatch((prev: any) => ({ ...prev, status: "Cancelled" }));
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.error || "Failed to cancel notification.");
    }
  };

  // 8. Filtered History List
  const filteredHistory = useMemo(() => {
    return historyList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.message?.toLowerCase().includes(q) ||
        item.senderName?.toLowerCase().includes(q) ||
        item.department?.toLowerCase().includes(q) ||
        item.courseCode?.toLowerCase().includes(q);

      const matchType = filterType === "ALL" || item.type === filterType;
      const matchPriority = filterPriority === "ALL" || item.priority === filterPriority;

      return matchSearch && matchType && matchPriority;
    });
  }, [historyList, searchQuery, filterType, filterPriority]);

  // Aggregate Metrics
  const totalBatches = historyList.length;
  const totalDelivered = historyList.reduce((acc, h) => acc + (h.totalRecipients || 0), 0);
  const totalRead = historyList.reduce((acc, h) => acc + (h.readCount || 0), 0);
  const readPercentage = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
              <Bell className="size-5" />
            </div>
            <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
              Examination Notification Workspace
            </h1>
            <Badge
              variant="outline"
              className={
                isSuperAdmin
                  ? "bg-purple-500/10 text-purple-700 border-purple-500/20 text-xs font-semibold"
                  : "bg-blue-500/10 text-blue-700 border-blue-500/20 text-xs font-semibold"
              }
            >
              {isSuperAdmin ? "Super Admin Authority" : `HOD Scope (${userDept})`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isSuperAdmin
              ? "Publish official institutional examination schedules, venue allocations, and hall ticket notices across all departments."
              : `Create and publish examination notices strictly for ${userDept} students and assigned faculty.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHistory}
            disabled={isLoadingHistory}
            className="h-9 text-xs gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isLoadingHistory ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveTab("compose")}
            className="h-9 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="size-3.5" /> Compose Notice
          </Button>
        </div>
      </div>

      {/* KPI METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Dispatched Notices"
          value={totalBatches.toString()}
          subtitle="Total announcement batches"
          icon={Layers}
        />
        <KpiCard
          title="Delivered Recipients"
          value={totalDelivered.toLocaleString()}
          subtitle="PostgreSQL recipient records"
          icon={Users}
        />
        <KpiCard
          title="Overall Read Rate"
          value={`${readPercentage}%`}
          subtitle={`${totalRead} of ${totalDelivered} read`}
          icon={CheckCircle2}
        />
        <KpiCard
          title="Active Status"
          value="Healthy"
          subtitle="Real-time delivery active"
          icon={ShieldCheck}
        />
      </div>

      {/* WORKSPACE TABS */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="bg-muted/60 p-1 border border-border">
          <TabsTrigger value="compose" className="gap-2 text-xs font-semibold">
            <Send className="size-3.5" /> Send Exam Notification
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-xs font-semibold">
            <History className="size-3.5" /> Sent History &amp; Delivery Stats ({historyList.length})
          </TabsTrigger>
        </TabsList>

        {/* -------------------- TAB 1: COMPOSE -------------------- */}
        <TabsContent value="compose" className="space-y-6">
          <form onSubmit={handlePublish} className="space-y-6">
            <Panel title="Notification Configuration" icon={Sparkles}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Notification Type */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Notification Type *</Label>
                  <Select value={form.type} onValueChange={handleTypeChange}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXAM_SCHEDULE">📅 Exam Schedule Published</SelectItem>
                      <SelectItem value="EXAM_DATE_CHANGED">🔄 Exam Date/Time Changed</SelectItem>
                      <SelectItem value="EXAM_VENUE_CHANGED">📍 Exam Venue Changed</SelectItem>
                      <SelectItem value="HALL_TICKET_AVAILABLE">🎫 Hall Ticket Available</SelectItem>
                      <SelectItem value="EXAM_ELIGIBILITY_ALERT">⚠️ Exam Eligibility Alert</SelectItem>
                      <SelectItem value="EXAM_REMINDER">⏰ Exam Reminder</SelectItem>
                      <SelectItem value="RESULTS_PUBLISHED">🏆 Results Published</SelectItem>
                      <SelectItem value="EXAM_CANCELLED">❌ Exam Cancelled / Postponed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Priority */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(val) => setForm({ ...form, priority: val })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">🔴 High Priority (Immediate Popover)</SelectItem>
                      <SelectItem value="Medium">🟡 Medium Priority (Standard Notice)</SelectItem>
                      <SelectItem value="Low">🔵 Low Priority (General Info)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Department */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">Department *</Label>
                    {isHod && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                        <Lock className="size-3" /> Locked to {userDept}
                      </span>
                    )}
                  </div>
                  {isHod ? (
                    <div className="p-2.5 rounded-lg border border-border bg-muted/40 flex items-center justify-between text-xs font-bold text-foreground">
                      <span>{userDept} (Computer Science &amp; Engineering)</span>
                      <Badge variant="outline" className="text-[10px]">HOD Department</Badge>
                    </div>
                  ) : (
                    <Select
                      value={form.department}
                      onValueChange={(val) => setForm({ ...form, department: val, courseCode: "ALL" })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">🏛️ All Departments (Entire College)</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.code}>
                            {d.code} — {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* 4. Academic Year */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Academic Year</Label>
                  <Select
                    value={form.academicYear}
                    onValueChange={(val) => setForm({ ...form, academicYear: val })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select AY" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((ay) => (
                        <SelectItem key={ay} value={ay}>
                          AY {ay}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 5. Semester */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Semester</Label>
                  <Select
                    value={form.semester}
                    onValueChange={(val) => setForm({ ...form, semester: val, courseCode: "ALL" })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Semesters</SelectItem>
                      {semesters.map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          Semester {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 6. Section */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Section</Label>
                  <Select
                    value={form.section}
                    onValueChange={(val) => setForm({ ...form, section: val })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Sections (A, B, C, D)</SelectItem>
                      <SelectItem value="A">Section A</SelectItem>
                      <SelectItem value="B">Section B</SelectItem>
                      <SelectItem value="C">Section C</SelectItem>
                      <SelectItem value="D">Section D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 7. Course / Subject */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Course / Subject</Label>
                  <Select
                    value={form.courseCode}
                    onValueChange={(val) => setForm({ ...form, courseCode: val })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Courses in Cohort</SelectItem>
                      {availableCourses.map((c) => (
                        <SelectItem key={c.id} value={c.code}>
                          {c.code} — {c.name} {c.faculty ? `(${c.faculty})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 8. Recipient Scope */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Recipient Scope *</Label>
                  <Select
                    value={form.scope}
                    onValueChange={(val) => setForm({ ...form, scope: val })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Target Scope" />
                    </SelectTrigger>
                    <SelectContent>
                      {isSuperAdmin && (
                        <SelectItem value="all">🌐 Entire Institution (All Students &amp; Faculty)</SelectItem>
                      )}
                      <SelectItem value="department">🏢 Department Scope (All Cohorts)</SelectItem>
                      <SelectItem value="semester">📚 Specific Semester Cohort</SelectItem>
                      <SelectItem value="section">👥 Specific Section Only</SelectItem>
                      <SelectItem value="course">📖 Specific Course Enrolled Only</SelectItem>
                      <SelectItem value="students">🎓 Students Only</SelectItem>
                      <SelectItem value="faculty">👨‍🏫 Faculty Only</SelectItem>
                      <SelectItem value="hod">👔 Department HOD Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 9. Exam Date */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Exam Date</Label>
                  <Input
                    type="date"
                    value={form.examDate}
                    onChange={(e) => setForm({ ...form, examDate: e.target.value })}
                    className="text-xs"
                  />
                </div>

                {/* 10. Exam Time */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Exam Time / Session</Label>
                  <Input
                    placeholder="e.g. 10:00 AM - 01:00 PM"
                    value={form.examTime}
                    onChange={(e) => setForm({ ...form, examTime: e.target.value })}
                    className="text-xs"
                  />
                </div>

                {/* 11. Venue */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-foreground">Venue / Seating Block</Label>
                  <Input
                    placeholder="e.g. Block A - Room 302 / Central Exam Hall"
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* LIVE RECIPIENT PREVIEW BANNER */}
              <div className="mt-5 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      Delivery Target Forecast
                      {isLoadingPreview && <RefreshCw className="size-3 animate-spin text-muted-foreground" />}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Calculated dynamically from real PostgreSQL records.
                    </p>
                  </div>
                </div>

                {preview ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      Total: {preview.totalRecipients} Recipients
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Students: {preview.studentCount}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Faculty: {preview.facultyCount}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      HOD: {preview.hodCount}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Calculating recipients...</span>
                )}
              </div>
            </Panel>

            {/* NOTIFICATION CONTENT PANEL */}
            <Panel title="Announcement Content" icon={Bell}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Notification Title *</Label>
                  <Input
                    placeholder="Enter prominent notice title..."
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="text-xs font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Official Message Body *</Label>
                  <Textarea
                    rows={4}
                    placeholder="Provide detailed instructions, rules, condonation guidelines, or exam schedule notes..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="text-xs leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Info className="size-3.5 text-blue-600" />
                    <span>Audit trail will automatically log author identity and recipient timestamp in PostgreSQL.</span>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || (preview && preview.totalRecipients === 0)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 px-5 h-9"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" /> Dispatching...
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" /> Publish Notification
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Panel>
          </form>
        </TabsContent>

        {/* -------------------- TAB 2: HISTORY -------------------- */}
        <TabsContent value="history" className="space-y-4">
          <Panel title="Published Notification Records" icon={History}>
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-4 border-b border-border">
              <div className="relative w-full sm:w-80">
                <Search className="size-3.5 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search notices, course, sender..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="text-xs h-9 w-40">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="EXAM_SCHEDULE">Exam Schedule</SelectItem>
                    <SelectItem value="EXAM_DATE_CHANGED">Date Changed</SelectItem>
                    <SelectItem value="EXAM_VENUE_CHANGED">Venue Changed</SelectItem>
                    <SelectItem value="HALL_TICKET_AVAILABLE">Hall Ticket</SelectItem>
                    <SelectItem value="EXAM_ELIGIBILITY_ALERT">Eligibility Alert</SelectItem>
                    <SelectItem value="EXAM_REMINDER">Reminder</SelectItem>
                    <SelectItem value="RESULTS_PUBLISHED">Results</SelectItem>
                    <SelectItem value="EXAM_CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="text-xs h-9 w-32">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Priorities</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* History Table */}
            {isLoadingHistory ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
                Loading PostgreSQL notification records...
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
                <Bell className="size-8 text-muted-foreground/30 mx-auto" />
                <p className="font-semibold text-foreground">No notification records found.</p>
                <p>Compose and publish your first examination notification above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Notification</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Sender</th>
                      <th className="p-3">Target</th>
                      <th className="p-3">Recipients</th>
                      <th className="p-3">Delivery Rate</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredHistory.map((item) => {
                      const rate =
                        item.totalRecipients > 0
                          ? Math.round((item.readCount / item.totalRecipients) * 100)
                          : 0;

                      return (
                        <tr key={item.batchId} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 whitespace-nowrap text-muted-foreground text-[11px]">
                            {new Date(item.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="p-3 max-w-xs">
                            <div className="font-bold text-foreground line-clamp-1">{item.title}</div>
                            <div className="text-[11px] text-muted-foreground line-clamp-1">
                              {item.message}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase font-bold py-0 ${
                                item.priority === "High"
                                  ? "border-rose-500/30 text-rose-600 bg-rose-500/10"
                                  : "border-blue-500/30 text-blue-600 bg-blue-500/10"
                              }`}
                            >
                              {item.type.replace("EXAM_", "")}
                            </Badge>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="font-semibold text-foreground">{item.senderName}</div>
                            <div className="text-[10px] text-muted-foreground capitalize">
                              {item.senderRole}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="font-bold text-foreground">
                              {item.department} {item.semester ? `Sem ${item.semester}` : ""}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {item.courseCode || item.scope || "General"}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-bold text-foreground">{item.totalRecipients}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">
                              ({item.readCount} read)
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full"
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-muted-foreground">{rate}%</span>
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                item.status === "Cancelled"
                                  ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              }`}
                            >
                              {item.status || "Active"}
                            </Badge>
                          </td>
                          <td className="p-3 whitespace-nowrap text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedBatch(item);
                                setDetailModalOpen(true);
                              }}
                              className="h-7 text-xs px-2"
                              title="View Dossier"
                            >
                              <Eye className="size-3.5 mr-1" /> View
                            </Button>
                            {item.status !== "Cancelled" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelBatch(item.batchId)}
                                className="h-7 text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                title="Cancel / Recall Notice"
                              >
                                <XCircle className="size-3.5 mr-1" /> Recall
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      {/* DETAIL DOSSIER MODAL */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold font-display">
              <Bell className="size-4.5 text-blue-600" />
              Examination Notification Dossier
            </DialogTitle>
            <DialogDescription className="text-xs">
              Delivery metrics, recipient resolution, and audit record from PostgreSQL.
            </DialogDescription>
          </DialogHeader>

          {selectedBatch && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-bold">
                    Batch: {selectedBatch.batchId}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      selectedBatch.priority === "High"
                        ? "text-rose-600 border-rose-500/20 bg-rose-500/10"
                        : "text-blue-600 border-blue-500/20 bg-blue-500/10"
                    }
                  >
                    Priority: {selectedBatch.priority}
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-foreground">{selectedBatch.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{selectedBatch.message}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <span className="text-[10px] text-muted-foreground">Department</span>
                  <div className="font-bold text-foreground">{selectedBatch.department}</div>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <span className="text-[10px] text-muted-foreground">Semester</span>
                  <div className="font-bold text-foreground">
                    {selectedBatch.semester ? `Semester ${selectedBatch.semester}` : "All"}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <span className="text-[10px] text-muted-foreground">Course</span>
                  <div className="font-bold text-foreground">{selectedBatch.courseCode || "All"}</div>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <span className="text-[10px] text-muted-foreground">Exam Date</span>
                  <div className="font-bold text-foreground">{selectedBatch.examDate || "N/A"}</div>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <span className="text-[10px] text-muted-foreground">Exam Time</span>
                  <div className="font-bold text-foreground">{selectedBatch.examTime || "N/A"}</div>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <span className="text-[10px] text-muted-foreground">Venue</span>
                  <div className="font-bold text-foreground">{selectedBatch.venue || "N/A"}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                <h4 className="font-bold text-foreground text-xs flex items-center justify-between">
                  <span>Delivery Breakdown</span>
                  <span className="text-muted-foreground">
                    {selectedBatch.readCount} read / {selectedBatch.unreadCount} unread
                  </span>
                </h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${
                          selectedBatch.totalRecipients > 0
                            ? Math.round((selectedBatch.readCount / selectedBatch.totalRecipients) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-emerald-600">
                    {selectedBatch.totalRecipients > 0
                      ? Math.round((selectedBatch.readCount / selectedBatch.totalRecipients) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Author: {selectedBatch.senderName}</span>
                  <span>Dispatched: {new Date(selectedBatch.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailModalOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
            {selectedBatch && selectedBatch.status !== "Cancelled" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  handleCancelBatch(selectedBatch.batchId);
                }}
                className="text-xs"
              >
                Recall Notice
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
