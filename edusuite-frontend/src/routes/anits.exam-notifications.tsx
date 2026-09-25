import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRole } from "@/context/role-context";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Megaphone,
  Bell,
  Send,
  Plus,
  RefreshCw,
  Download,
  Search,
  RotateCcw,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Users,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Eye,
  Trash2,
  Lock,
  ShieldCheck,
  FileSpreadsheet,
  Check,
  X,
  FileText,
  AlertCircle,
  Edit3,
  CalendarClock,
  Bookmark,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/anits/exam-notifications")({
  head: () => ({
    meta: [{ title: "Exam Notifications — ANITS Super Admin & HOD Portal" }],
  }),
  component: AnitsExamNotificationsPage,
});

// 15 Authoritative Notification Types per ANITS Examination System specification
const NOTIFICATION_TYPES = [
  { value: "Exam Schedule Published", label: "Exam Schedule Published" },
  { value: "Exam Date Changed", label: "Exam Date Changed" },
  { value: "Exam Time Changed", label: "Exam Time Changed" },
  { value: "Exam Room Changed", label: "Exam Room Changed" },
  { value: "Hall Ticket Released", label: "Hall Ticket Released" },
  { value: "Exam Registration", label: "Exam Registration" },
  { value: "Internal Examination", label: "Internal Examination" },
  { value: "Mid-Semester Examination", label: "Mid-Semester Examination" },
  { value: "End-Semester Examination", label: "End-Semester Examination" },
  { value: "Practical Examination", label: "Practical Examination" },
  { value: "Viva / Project Evaluation", label: "Viva / Project Evaluation" },
  { value: "Exam Result Published", label: "Exam Result Published" },
  { value: "Exam Cancellation", label: "Exam Cancellation" },
  { value: "Exam Rescheduled", label: "Exam Rescheduled" },
  { value: "General Examination Notice", label: "General Examination Notice" },
];

const PRIORITY_OPTIONS = [
  { value: "Normal", label: "Normal (Standard)" },
  { value: "Important", label: "Important" },
  { value: "High", label: "High (Priority)" },
  { value: "Urgent", label: "Urgent (Red Alert)" },
];

const RECIPIENT_TYPES = [
  { value: "Students", label: "Students Only" },
  { value: "Faculty", label: "Faculty Only" },
  { value: "Both", label: "Students & Faculty" },
];

const TARGET_SCOPES = [
  { value: "institution", label: "Institution-wide" },
  { value: "department", label: "Department" },
  { value: "semester", label: "Semester" },
  { value: "section", label: "Section" },
  { value: "course", label: "Course / Subject" },
];

interface MetaState {
  departments: Array<{ id: string; code: string; name: string; hodName?: string }>;
  courses: Array<{ id: string; code: string; name: string; department: string; semester: number; faculty?: string }>;
  examSchedules: Array<{ id: string; name: string; type: string; department: string; year: string; semester: number; startDate: string; endDate: string; status: string }>;
  academicYears: string[];
  semesters: number[];
  userDepartment: string | null;
  userRole: string;
  userName: string;
  authorityLabel: string;
  canCreate: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isHod: boolean;
}

interface StatsState {
  totalNotifications: number;
  publishedCount: number;
  scheduledCount: number;
  unreadPendingCount: number;
}

interface RecipientPreviewState {
  totalRecipients: number;
  studentCount: number;
  facultyCount: number;
  hodCount: number;
  sampleRecipients?: any[];
}

function AnitsExamNotificationsPage() {
  const { role, department } = useRole();

  // Dynamic Metadata from PostgreSQL
  const [meta, setMeta] = useState<MetaState>({
    departments: [],
    courses: [],
    examSchedules: [],
    academicYears: ["2026-27"],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    userDepartment: department || null,
    userRole: role || "super_admin",
    userName: "",
    authorityLabel: "Loading Authority...",
    canCreate: false,
    isSuperAdmin: false,
    isAdmin: false,
    isHod: false,
  });

  // Dynamic Dashboard Statistics from PostgreSQL
  const [stats, setStats] = useState<StatsState>({
    totalNotifications: 0,
    publishedCount: 0,
    scheduledCount: 0,
    unreadPendingCount: 0,
  });

  // PostgreSQL History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterSem, setFilterSem] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterScope, setFilterScope] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScheduledMode, setIsScheduledMode] = useState(false);
  const [selectedExamScheduleId, setSelectedExamScheduleId] = useState<string>("NONE");

  // Live Recipient Forecast State
  const [preview, setPreview] = useState<RecipientPreviewState | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Confirmation Publish Modal State
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);

  // Cancel Batch Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelBatchId, setCancelBatchId] = useState<string>("");
  const [cancelBatchTitle, setCancelBatchTitle] = useState<string>("");
  const [cancelReason, setCancelReason] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Details Dossier Modal State
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Form State
  const [form, setForm] = useState({
    batchId: "",
    type: "Exam Schedule Published",
    title: "",
    priority: "High",
    examScheduleId: "",
    examName: "",
    examDate: "2026-10-15",
    startTime: "10:00 AM",
    endTime: "01:00 PM",
    venue: "Block A - Hall 301",
    department: "CSE",
    academicYear: "2026-27",
    semester: "5",
    section: "ALL",
    courseCode: "ALL",
    recipientType: "Students",
    scope: "department",
    message: "",
    attachmentUrl: "",
    scheduledDate: "2026-10-01",
    scheduledTime: "09:00",
  });

  // Effective HOD Department locked from backend meta
  const authenticatedDept = (meta.userDepartment || department || "CSE").toUpperCase();
  const effectiveDept = meta.isHod ? authenticatedDept : form.department;

  // 1. Fetch metadata options from PostgreSQL
  const fetchMetadata = useCallback(async () => {
    try {
      const res = await api.get("/api/notifications/exam/meta-options");
      if (res.data?.success) {
        setMeta({
          departments: res.data.departments || [],
          courses: res.data.courses || [],
          examSchedules: res.data.examSchedules || [],
          academicYears: res.data.academicYears || ["2026-27"],
          semesters: res.data.semesters || [1, 2, 3, 4, 5, 6, 7, 8],
          userDepartment: res.data.userDepartment,
          userRole: res.data.userRole,
          userName: res.data.userName,
          authorityLabel: res.data.authorityLabel,
          canCreate: res.data.canCreate,
          isSuperAdmin: res.data.isSuperAdmin,
          isAdmin: res.data.isAdmin,
          isHod: res.data.isHod,
        });

        if (res.data.isHod && res.data.userDepartment) {
          setForm((prev) => ({
            ...prev,
            department: res.data.userDepartment,
            scope: prev.scope === "institution" ? "department" : prev.scope,
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching notification metadata:", err);
    }
  }, []);

  // 2. Fetch live dashboard statistics from PostgreSQL
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/api/notifications/exam/stats");
      if (res.data?.success) {
        setStats({
          totalNotifications: res.data.totalNotifications || 0,
          publishedCount: res.data.publishedCount || 0,
          scheduledCount: res.data.scheduledCount || 0,
          unreadPendingCount: res.data.unreadPendingCount || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, []);

  // 3. Fetch history list from PostgreSQL
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.get("/api/notifications/exam/history");
      if (res.data?.success) {
        setHistoryList(res.data.history || []);
      }
    } catch (err: any) {
      console.error("Error loading history:", err);
      toast.error("Failed to load notifications from PostgreSQL.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Combined Refresh
  const handleFullRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchMetadata(), fetchStats(), fetchHistory()]);
    setIsRefreshing(false);
    toast.success("Exam notifications and statistics updated from PostgreSQL.");
  };

  useEffect(() => {
    fetchMetadata();
    fetchStats();
    fetchHistory();

    const handleExternalRefresh = () => {
      fetchStats();
      fetchHistory();
    };

    window.addEventListener("exam-notification-refresh", handleExternalRefresh);
    window.addEventListener("focus", handleExternalRefresh);

    return () => {
      window.removeEventListener("exam-notification-refresh", handleExternalRefresh);
      window.removeEventListener("focus", handleExternalRefresh);
    };
  }, [fetchMetadata, fetchStats, fetchHistory]);

  // 4. Live recipient forecast preview from PostgreSQL
  useEffect(() => {
    if (!createModalOpen) return;
    let active = true;

    async function updatePreview() {
      setIsLoadingPreview(true);
      try {
        const targetDept = meta.isHod ? authenticatedDept : form.department;
        const res = await api.get("/api/notifications/exam/preview-recipients", {
          params: {
            department: targetDept,
            semester: form.semester === "ALL" ? "" : form.semester,
            section: form.section === "ALL" ? "" : form.section,
            courseCode: form.courseCode === "ALL" ? "" : form.courseCode,
            scope: form.scope,
            recipientType: form.recipientType,
            academicYear: form.academicYear,
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

    const timer = setTimeout(updatePreview, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    createModalOpen,
    form.department,
    form.semester,
    form.section,
    form.courseCode,
    form.scope,
    form.recipientType,
    form.academicYear,
    meta.isHod,
    authenticatedDept,
  ]);

  // 5. Dynamic course filtering matching selected department and semester
  const availableCourses = useMemo(() => {
    const targetDept = meta.isHod ? authenticatedDept : form.department;
    return meta.courses.filter((c) => {
      const matchDept =
        targetDept === "ALL" ||
        !c.department ||
        c.department.toUpperCase() === targetDept.toUpperCase();
      const matchSem =
        form.semester === "ALL" ||
        !c.semester ||
        String(c.semester) === String(form.semester);
      return matchDept && matchSem;
    });
  }, [meta.courses, form.department, form.semester, meta.isHod, authenticatedDept]);

  // 6. Handle Examination Dropdown Selection (Auto-fill exam details)
  const handleExamScheduleSelect = (scheduleId: string) => {
    setSelectedExamScheduleId(scheduleId);
    if (scheduleId === "NONE") return;

    const found = meta.examSchedules.find((s) => s.id === scheduleId);
    if (found) {
      setForm((prev) => ({
        ...prev,
        examScheduleId: found.id,
        examName: found.name,
        department: meta.isHod ? authenticatedDept : (found.department || prev.department),
        semester: found.semester ? String(found.semester) : prev.semester,
        academicYear: found.year || prev.academicYear,
        examDate: found.startDate ? found.startDate.slice(0, 10) : prev.examDate,
        title: prev.title || `${found.name} (${found.department} Sem ${found.semester}) Notification`,
      }));
    }
  };

  // 7. Smart Title & Message auto-population when Notification Type changes
  const handleTypeChange = (typeVal: string) => {
    const dept = meta.isHod ? authenticatedDept : form.department === "ALL" ? "ANITS" : form.department;
    const sem = form.semester === "ALL" ? "" : ` Semester ${form.semester}`;

    let title = "";
    let message = "";

    switch (typeVal) {
      case "Exam Schedule Published":
        title = `${dept}${sem} End Semester Examination Schedule Published`;
        message = `The approved examination schedule for ${dept}${sem} has been officially published. All candidates are advised to inspect their paper codes, exam halls, and reporting slots.`;
        break;
      case "Exam Date Changed":
        title = `Exam Date Revision Notice: ${dept}${sem}`;
        message = `Notice: Due to administrative rescheduling, the examination dates for designated subjects in ${dept}${sem} have been revised. Please check your updated schedule immediately.`;
        break;
      case "Exam Time Changed":
        title = `Exam Session Timing Change: ${dept}${sem}`;
        message = `The commencement timing for the upcoming examination session has been updated. Candidates must report to the examination hall 30 minutes prior to the revised start time.`;
        break;
      case "Exam Room Changed":
        title = `Seating Hall / Room Reallocation Notice`;
        message = `Seating venues and examination halls for ${dept}${sem} have been updated. Candidates are instructed to verify their newly allocated block and room before entry.`;
        break;
      case "Hall Ticket Released":
        title = `Examination Hall Tickets Released for Download`;
        message = `Hall tickets for ${dept}${sem} examinations are now available on the ANITS student portal. Download, print, and verify subject codes. Entry without hall ticket is strictly prohibited.`;
        break;
      case "Exam Registration":
        title = `Examination Registration & Fee Payment Circular`;
        message = `Regular and supplementary examination registration for ${dept}${sem} is now open. Eligible students must complete subject enrolment prior to the deadline.`;
        break;
      case "Internal Examination":
        title = `Continuous Assessment / Mid-Term Internal Exam Schedule`;
        message = `The schedule for internal continuous evaluation tests for ${dept}${sem} has been scheduled. Attendance is mandatory for internal marks calculation.`;
        break;
      case "Mid-Semester Examination":
        title = `Mid-Semester Examination Schedule: ${dept}${sem}`;
        message = `Mid-semester examinations will be conducted as per the published academic calendar. Room allocations and syllabi coverage have been updated.`;
        break;
      case "End-Semester Examination":
        title = `Semester ${form.semester || "5"} End Semester Examination Schedule`;
        message = `The comprehensive end-semester examination timetable has been declared. All candidates must adhere strictly to academic integrity and university examination guidelines.`;
        break;
      case "Practical Examination":
        title = `Laboratory & Practical Examination Schedule: ${dept}${sem}`;
        message = `Laboratory practical examinations and viva-voce sessions have been slated for departmental laboratories. Candidates must present complete signed records.`;
        break;
      case "Viva / Project Evaluation":
        title = `Major / Minor Project Evaluation & External Viva Schedule`;
        message = `Project evaluations and panel vivas have been organized. Batches must report with project documentation, code repositories, and presentation slides.`;
        break;
      case "Exam Result Published":
        title = `Provisional End-Semester Examination Results Declared`;
        message = `Provisional marks and SGPA/CGPA for ${dept}${sem} examinations are published. Revaluation and verification requests may be lodged within the specified window.`;
        break;
      case "Exam Cancellation":
        title = `Urgent: Examination Cancellation Notice`;
        message = `The scheduled examination paper has been cancelled due to unforeseen circumstances. Further instructions and revised dates will be notified by the Examination Cell.`;
        break;
      case "Exam Rescheduled":
        title = `Official Rescheduling Notification: ${dept}${sem}`;
        message = `The postponed examination paper has been rescheduled. Review the newly assigned date, session timing, and room allocation.`;
        break;
      case "General Examination Notice":
      default:
        title = `General Examination Notice: ${dept}${sem}`;
        message = `All students and invigilating faculty are reminded to adhere to institutional examination regulations, carry valid ID cards, and avoid prohibited items.`;
        break;
    }

    setForm((prev) => ({
      ...prev,
      type: typeVal,
      title: title || prev.title,
      message: message || prev.message,
    }));
  };

  // 8. Open Publish Confirmation Dialog
  const handleOpenConfirmPublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Please enter a notification title.");
      return;
    }
    if (!form.message.trim()) {
      toast.error("Please enter notification body text.");
      return;
    }
    if ((preview?.totalRecipients || 0) === 0) {
      toast.error("No eligible recipients found for the selected criteria. Cannot publish empty notification.");
      return;
    }
    setConfirmPublishOpen(true);
  };

  // 9. Execute Publish
  const handleConfirmPublish = async () => {
    setIsSubmitting(true);
    const toastId = toast.loading("Publishing exam notification to PostgreSQL...");

    try {
      const payload = {
        batchId: form.batchId || undefined,
        type: form.type,
        title: form.title.trim(),
        message: form.message.trim(),
        priority: form.priority,
        department: meta.isHod ? authenticatedDept : form.department,
        academicYear: form.academicYear,
        semester: form.semester === "ALL" ? undefined : Number(form.semester),
        section: form.section === "ALL" ? undefined : form.section,
        courseCode: form.courseCode === "ALL" ? undefined : form.courseCode,
        examName: form.examName || undefined,
        examScheduleId: form.examScheduleId || undefined,
        examDate: form.examDate || undefined,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        venue: form.venue || undefined,
        scope: form.scope,
        recipientType: form.recipientType,
        attachmentUrl: form.attachmentUrl || undefined,
      };

      const res = await api.post("/api/notifications/exam/publish", payload);

      toast.dismiss(toastId);
      toast.success(
        `Notification published successfully! Delivered to ${res.data?.totalRecipients || 0} recipient(s).`
      );

      setConfirmPublishOpen(false);
      setCreateModalOpen(false);
      resetForm();

      await Promise.all([fetchStats(), fetchHistory()]);
      window.dispatchEvent(new Event("exam-notification-refresh"));
    } catch (err: any) {
      toast.dismiss(toastId);
      const errMsg = err.response?.data?.error || err.message || "Failed to publish exam notification.";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 10. Save Draft
  const handleSaveDraft = async () => {
    if (!form.title.trim()) {
      toast.error("Please provide at least a title to save a draft.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Saving draft to PostgreSQL...");

    try {
      const payload = {
        batchId: form.batchId || undefined,
        type: form.type,
        title: form.title.trim(),
        message: form.message.trim(),
        priority: form.priority,
        department: meta.isHod ? authenticatedDept : form.department,
        academicYear: form.academicYear,
        semester: form.semester === "ALL" ? undefined : Number(form.semester),
        section: form.section === "ALL" ? undefined : form.section,
        courseCode: form.courseCode === "ALL" ? undefined : form.courseCode,
        examName: form.examName || undefined,
        examScheduleId: form.examScheduleId || undefined,
        examDate: form.examDate || undefined,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        venue: form.venue || undefined,
        scope: form.scope,
        recipientType: form.recipientType,
        attachmentUrl: form.attachmentUrl || undefined,
      };

      const res = await api.post("/api/notifications/exam/draft", payload);

      toast.dismiss(toastId);
      toast.success(res.data?.message || "Draft saved successfully. No recipients notified.");

      setCreateModalOpen(false);
      resetForm();

      await Promise.all([fetchStats(), fetchHistory()]);
      window.dispatchEvent(new Event("exam-notification-refresh"));
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.error || "Failed to save draft.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 11. Schedule Notification
  const handleScheduleNotification = async () => {
    if (!form.title.trim()) {
      toast.error("Please enter a notification title.");
      return;
    }
    if (!form.message.trim()) {
      toast.error("Please enter notification body text.");
      return;
    }
    if (!form.scheduledDate || !form.scheduledTime) {
      toast.error("Please select both scheduled publish date and time.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Scheduling exam notification...");

    try {
      const payload = {
        batchId: form.batchId || undefined,
        type: form.type,
        title: form.title.trim(),
        message: form.message.trim(),
        priority: form.priority,
        department: meta.isHod ? authenticatedDept : form.department,
        academicYear: form.academicYear,
        semester: form.semester === "ALL" ? undefined : Number(form.semester),
        section: form.section === "ALL" ? undefined : form.section,
        courseCode: form.courseCode === "ALL" ? undefined : form.courseCode,
        examName: form.examName || undefined,
        examScheduleId: form.examScheduleId || undefined,
        examDate: form.examDate || undefined,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        venue: form.venue || undefined,
        scope: form.scope,
        recipientType: form.recipientType,
        attachmentUrl: form.attachmentUrl || undefined,
        scheduledDate: form.scheduledDate,
        scheduledTime: form.scheduledTime,
      };

      const res = await api.post("/api/notifications/exam/schedule", payload);

      toast.dismiss(toastId);
      toast.success(res.data?.message || "Notification scheduled successfully.");

      setCreateModalOpen(false);
      resetForm();

      await Promise.all([fetchStats(), fetchHistory()]);
      window.dispatchEvent(new Event("exam-notification-refresh"));
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.error || "Failed to schedule notification.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 12. Open Cancel Dialog
  const handleOpenCancelDialog = (batchId: string, title: string) => {
    setCancelBatchId(batchId);
    setCancelBatchTitle(title);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  // 13. Confirm Cancel Batch
  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide an audit cancellation reason.");
      return;
    }

    setIsCancelling(true);
    const toastId = toast.loading("Cancelling notification...");

    try {
      await api.post(`/api/notifications/exam/${cancelBatchId}/cancel`, {
        reason: cancelReason.trim(),
      });

      toast.dismiss(toastId);
      toast.success("Notification batch cancelled successfully.");

      setCancelModalOpen(false);
      await Promise.all([fetchStats(), fetchHistory()]);

      if (selectedBatch && selectedBatch.batchId === cancelBatchId) {
        setSelectedBatch((prev: any) => ({
          ...prev,
          status: "CANCELLED",
          cancelReason: cancelReason.trim(),
        }));
      }

      window.dispatchEvent(new Event("exam-notification-refresh"));
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.error || "Failed to cancel notification.");
    } finally {
      setIsCancelling(false);
    }
  };

  // 14. Edit Draft
  const handleEditDraft = (draftItem: any) => {
    setForm({
      batchId: draftItem.batchId,
      type: draftItem.type || "Exam Schedule Published",
      title: draftItem.title || "",
      priority: draftItem.priority || "High",
      examScheduleId: draftItem.examScheduleId || "",
      examName: draftItem.examName || "",
      examDate: draftItem.examDate || "2026-10-15",
      startTime: draftItem.startTime || "10:00 AM",
      endTime: draftItem.endTime || "01:00 PM",
      venue: draftItem.venue || "Block A - Hall 301",
      department: meta.isHod ? authenticatedDept : (draftItem.department || "CSE"),
      academicYear: draftItem.academicYear || "2026-27",
      semester: draftItem.semester ? String(draftItem.semester) : "ALL",
      section: draftItem.section || "ALL",
      courseCode: draftItem.courseCode || "ALL",
      recipientType: draftItem.recipientType || "Students",
      scope: draftItem.scope || "department",
      message: draftItem.message || "",
      attachmentUrl: draftItem.attachmentUrl || "",
      scheduledDate: draftItem.scheduledDate || "2026-10-01",
      scheduledTime: draftItem.scheduledTime || "09:00",
    });
    setIsScheduledMode(draftItem.status === "SCHEDULED");
    setCreateModalOpen(true);
  };

  const resetForm = () => {
    setForm({
      batchId: "",
      type: "Exam Schedule Published",
      title: "",
      priority: "High",
      examScheduleId: "",
      examName: "",
      examDate: "2026-10-15",
      startTime: "10:00 AM",
      endTime: "01:00 PM",
      venue: "Block A - Hall 301",
      department: meta.isHod ? authenticatedDept : "CSE",
      academicYear: "2026-27",
      semester: "5",
      section: "ALL",
      courseCode: "ALL",
      recipientType: "Students",
      scope: meta.isHod ? "department" : "semester",
      message: "",
      attachmentUrl: "",
      scheduledDate: "2026-10-01",
      scheduledTime: "09:00",
    });
    setIsScheduledMode(false);
    setSelectedExamScheduleId("NONE");
    setPreview(null);
  };

  // 15. Export Filtered History to CSV
  const handleExportCSV = () => {
    if (filteredHistory.length === 0) {
      toast.error("No notifications available to export.");
      return;
    }

    const headers = [
      "Notification ID",
      "Date",
      "Title",
      "Type",
      "Priority",
      "Department",
      "Semester",
      "Course",
      "Target Scope",
      "Recipients",
      "Status",
      "Read Count",
      "Unread Count",
      "Created By",
      "Published At",
      "Scheduled At",
      "Cancelled At",
      "Cancel Reason",
    ];

    const rows = filteredHistory.map((item) => [
      `"${item.batchId}"`,
      `"${new Date(item.createdAt).toLocaleString()}"`,
      `"${(item.title || "").replace(/"/g, '""')}"`,
      `"${item.type}"`,
      `"${item.priority || "Normal"}"`,
      `"${item.department || "ALL"}"`,
      `"${item.semester ? `Sem ${item.semester}` : "ALL"}"`,
      `"${item.courseCode || "ALL"}"`,
      `"${item.scope || "department"}"`,
      item.totalRecipients || 0,
      `"${item.status || "PUBLISHED"}"`,
      item.readCount || 0,
      item.unreadCount || 0,
      `"${item.senderName || "Administrator"}"`,
      `"${item.publishedAt ? new Date(item.publishedAt).toLocaleString() : "—"}"`,
      `"${item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "—"}"`,
      `"${item.cancelledAt ? new Date(item.cancelledAt).toLocaleString() : "—"}"`,
      `"${(item.cancelReason || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `ANITS_Exam_Notifications_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Filtered exam notifications exported to CSV.");
  };

  // 16. Filtered History List Calculation
  const filteredHistory = useMemo(() => {
    return historyList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.message?.toLowerCase().includes(q) ||
        item.senderName?.toLowerCase().includes(q) ||
        item.department?.toLowerCase().includes(q) ||
        item.courseCode?.toLowerCase().includes(q) ||
        item.batchId?.toLowerCase().includes(q);

      const matchType = filterType === "ALL" || item.type === filterType;
      const matchDept =
        filterDept === "ALL" ||
        item.department?.toUpperCase() === filterDept.toUpperCase();
      const matchSem =
        filterSem === "ALL" ||
        String(item.semester) === String(filterSem);
      const matchStatus =
        filterStatus === "ALL" ||
        item.status === filterStatus ||
        (filterStatus === "PUBLISHED" && (item.status === "Active" || item.status === "Published")) ||
        (filterStatus === "CANCELLED" && item.status === "Cancelled");
      const matchScope = filterScope === "ALL" || item.scope === filterScope;

      const matchDate =
        !filterDate ||
        (item.createdAt && item.createdAt.slice(0, 10) === filterDate) ||
        (item.examDate && item.examDate.slice(0, 10) === filterDate);

      return (
        matchSearch &&
        matchType &&
        matchDept &&
        matchSem &&
        matchStatus &&
        matchScope &&
        matchDate
      );
    });
  }, [
    historyList,
    searchQuery,
    filterType,
    filterDept,
    filterSem,
    filterStatus,
    filterScope,
    filterDate,
  ]);

  // Helper for priority badges
  const renderPriorityBadge = (p: string) => {
    switch (p) {
      case "Urgent":
        return (
          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] font-bold uppercase">
            Urgent
          </Badge>
        );
      case "High":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold uppercase">
            High
          </Badge>
        );
      case "Important":
        return (
          <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] font-bold uppercase">
            Important
          </Badge>
        );
      case "Normal":
      default:
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-bold uppercase">
            Normal
          </Badge>
        );
    }
  };

  // Helper for status badges
  const renderStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "CANCELLED":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-semibold">
            Cancelled
          </Badge>
        );
      case "SCHEDULED":
        return (
          <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px] font-semibold">
            Scheduled
          </Badge>
        );
      case "DRAFT":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-semibold">
            Draft
          </Badge>
        );
      case "PUBLISHED":
      case "ACTIVE":
      default:
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-semibold">
            Published
          </Badge>
        );
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. TOP HEADER & AUTHORITY LABEL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Megaphone className="size-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase">
              EXAM NOTIFICATIONS
            </h1>

            {/* Dynamic Authority Badge (Never hardcoded, derived from authenticated identity) */}
            <Badge
              variant="outline"
              className={
                meta.isSuperAdmin
                  ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 text-xs font-semibold px-2.5 py-0.5"
                  : meta.isHod
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-xs font-semibold px-2.5 py-0.5"
                  : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 text-xs font-semibold px-2.5 py-0.5"
              }
            >
              {meta.authorityLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Publish and manage examination notifications across ANITS.
          </p>
        </div>

        {/* Top-Right Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFullRefresh}
            disabled={isLoadingHistory || isRefreshing}
            className="h-9 text-xs gap-1.5 border-border/70 hover:bg-muted/50"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing || isLoadingHistory ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 text-xs gap-1.5 border-border/70 hover:bg-muted/50"
          >
            <Download className="size-3.5" />
            Export
          </Button>

          {/* Action button rendered only for authorized roles */}
          {meta.canCreate && (
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setCreateModalOpen(true);
              }}
              className="h-9 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
            >
              <Plus className="size-3.5" />
              + Create Exam Notification
            </Button>
          )}
        </div>
      </div>

      {/* 2. SUMMARY CARDS (DYNAMIC FROM POSTGRESQL /api/notifications/exam/stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Notifications */}
        <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              TOTAL NOTIFICATIONS
            </p>
            <p className="text-2xl font-extrabold text-foreground mt-1">
              {stats.totalNotifications}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Across database records
            </p>
          </div>
          <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Layers className="size-5" />
          </div>
        </div>

        {/* Card 2: Published */}
        <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              PUBLISHED
            </p>
            <p className="text-2xl font-extrabold text-foreground mt-1">
              {stats.publishedCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Active student/faculty notices
            </p>
          </div>
          <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="size-5" />
          </div>
        </div>

        {/* Card 3: Scheduled */}
        <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              SCHEDULED
            </p>
            <p className="text-2xl font-extrabold text-foreground mt-1">
              {stats.scheduledCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Upcoming exam sessions
            </p>
          </div>
          <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
            <Calendar className="size-5" />
          </div>
        </div>

        {/* Card 4: Unread / Pending Attention */}
        <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              UNREAD / PENDING ATTENTION
            </p>
            <p className="text-2xl font-extrabold text-foreground mt-1">
              {stats.unreadPendingCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Awaiting recipient review
            </p>
          </div>
          <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Clock className="size-5" />
          </div>
        </div>
      </div>

      {/* 3. NOTIFICATION LIST & FILTERS SECTION */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-xs overflow-hidden">
        {/* Header & Filter Controls */}
        <div className="p-4 sm:p-5 border-b border-border/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                Exam Notification History
              </h2>
              <p className="text-xs text-muted-foreground">
                Showing {filteredHistory.length} of {historyList.length} total notifications recorded in PostgreSQL.
              </p>
            </div>
            {(searchQuery ||
              filterType !== "ALL" ||
              filterDept !== "ALL" ||
              filterSem !== "ALL" ||
              filterStatus !== "ALL" ||
              filterScope !== "ALL" ||
              filterDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("ALL");
                  setFilterDept("ALL");
                  setFilterSem("ALL");
                  setFilterStatus("ALL");
                  setFilterScope("ALL");
                  setFilterDate("");
                }}
                className="h-8 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 gap-1.5"
              >
                <RotateCcw className="size-3" /> Reset Filters
              </Button>
            )}
          </div>

          {/* Filter Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, course, sender..."
                className="h-8.5 pl-8.5 text-xs bg-background border-border/70"
              />
            </div>

            {/* Notification Type */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8.5 text-xs bg-background border-border/70">
                <SelectValue placeholder="All Notification Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Notification Types</SelectItem>
                {NOTIFICATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Department (Super Admin can select all; HOD is locked to own department) */}
            {meta.isHod ? (
              <div className="flex items-center gap-2 h-8.5 px-3 rounded-md border border-border/70 bg-muted/40 text-xs font-semibold text-muted-foreground">
                <Lock className="size-3 text-muted-foreground" /> Dept: {authenticatedDept} (Locked)
              </div>
            ) : (
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-8.5 text-xs bg-background border-border/70">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {meta.departments.map((d) => (
                    <SelectItem key={d.id} value={d.code}>
                      {d.code} - {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Semester */}
            <Select value={filterSem} onValueChange={setFilterSem}>
              <SelectTrigger className="h-8.5 text-xs bg-background border-border/70">
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Semesters</SelectItem>
                {meta.semesters.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    Semester {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {/* Status */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8.5 text-xs bg-background border-border/70">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Scope */}
            <Select value={filterScope} onValueChange={setFilterScope}>
              <SelectTrigger className="h-8.5 text-xs bg-background border-border/70">
                <SelectValue placeholder="All Recipient Scopes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Recipient Scopes</SelectItem>
                {TARGET_SCOPES.filter((sc) => (meta.isHod ? sc.value !== "institution" : true)).map((sc) => (
                  <SelectItem key={sc.value} value={sc.value}>
                    {sc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date filter */}
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-8.5 text-xs bg-background border-border/70"
            />
          </div>
        </div>

        {/* Table Content (Full Desktop Width with Clean Overflow) */}
        <div className="w-full overflow-x-auto">
          {isLoadingHistory ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="size-6 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">
                Fetching notifications from PostgreSQL database...
              </p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Megaphone className="size-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm font-semibold text-foreground">
                No examination notifications found.
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No records match your selected filter criteria. Click "+ Create Exam Notification" to dispatch an announcement.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[980px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Recipients</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Read</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredHistory.map((item) => {
                  const readPct = item.readPercentage !== undefined
                    ? item.readPercentage
                    : item.totalRecipients > 0
                    ? Number((((item.readCount || 0) / item.totalRecipients) * 100).toFixed(1))
                    : 0;

                  return (
                    <tr
                      key={item.batchId}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        <span className="block text-[10px] text-muted-foreground/70">
                          {new Date(item.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          {renderPriorityBadge(item.priority || "Normal")}
                          <span className="font-semibold text-foreground truncate max-w-52 block" title={item.title}>
                            {item.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate max-w-64 mt-0.5" title={item.message}>
                          {item.message}
                        </p>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] bg-background">
                          {item.type}
                        </Badge>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-foreground">
                        {item.department || "ALL"}
                      </td>

                      {/* Semester */}
                      <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                        {item.semester ? `Sem ${item.semester}` : "All Semesters"}
                      </td>

                      {/* Course */}
                      <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                        {item.courseCode || "—"}
                      </td>

                      {/* Target (Scope) */}
                      <td className="py-3 px-4 whitespace-nowrap capitalize text-muted-foreground">
                        {item.scope || "department"}
                      </td>

                      {/* Recipients */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-foreground">
                          {item.totalRecipients || 0}
                        </span>{" "}
                        <span className="text-muted-foreground">recipients</span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderStatusBadge(item.status)}
                      </td>

                      {/* Read Stats */}
                      <td className="py-3 px-4 whitespace-nowrap min-w-32">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                          <span>{item.readCount || 0} / {item.totalRecipients || 0} read</span>
                          <span className="font-bold">{readPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, readPct)}%` }}
                          />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedBatch(item);
                            setDetailsModalOpen(true);
                          }}
                          className="size-7 text-muted-foreground hover:text-foreground"
                          title="View Details"
                        >
                          <Eye className="size-3.5" />
                        </Button>

                        {/* Edit Draft */}
                        {item.status === "DRAFT" && meta.canCreate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditDraft(item)}
                            className="size-7 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                            title="Edit Draft"
                          >
                            <Edit3 className="size-3.5" />
                          </Button>
                        )}

                        {/* Cancel Notice (For PUBLISHED or SCHEDULED) */}
                        {(item.status === "PUBLISHED" || item.status === "SCHEDULED" || item.status === "Active") && meta.canCreate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenCancelDialog(item.batchId, item.title)}
                            className="size-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                            title="Cancel Notification"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. CREATE EXAM NOTIFICATION MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Megaphone className="size-4 text-blue-600" />
              {form.batchId ? "Edit Exam Notification" : "Create Exam Notification"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure and dispatch an authoritative examination notice to ANITS students and faculty backed by PostgreSQL.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOpenConfirmPublish} className="space-y-4 pt-2">
            {/* Row 1: Existing Examination Selector (Source of Truth Integration) */}
            <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border border-border/60">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Existing Examination / Event (Source of Truth)</span>
                <span className="text-[10px] text-muted-foreground font-normal">Optional auto-fill</span>
              </Label>
              <Select
                value={selectedExamScheduleId}
                onValueChange={handleExamScheduleSelect}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Select from scheduled university examinations..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— None / Manual Examination Entry —</SelectItem>
                  {meta.examSchedules.map((es) => (
                    <SelectItem key={es.id} value={es.id}>
                      {es.name} ({es.department} Sem {es.semester} - {es.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: Notification Type & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Notification Type *</Label>
                <Select value={form.type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority *</Label>
                <Select
                  value={form.priority}
                  onValueChange={(val) => setForm({ ...form, priority: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notification Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Semester 5 End Semester Examination Schedule"
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Target Audience: Recipient Type & Target Scope */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Recipient Type *</Label>
                <Select
                  value={form.recipientType}
                  onValueChange={(val) => setForm({ ...form, recipientType: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECIPIENT_TYPES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Scope *</Label>
                <Select
                  value={form.scope}
                  onValueChange={(val) => setForm({ ...form, scope: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_SCOPES.filter((sc) =>
                      meta.isHod ? sc.value !== "institution" : true
                    ).map((sc) => (
                      <SelectItem key={sc.value} value={sc.value}>
                        {sc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Department (Locked for HOD, selectable for Admin) & Academic Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department *</Label>
                {meta.isHod ? (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border/80 bg-muted/40 text-xs font-bold text-foreground">
                    <Lock className="size-3 text-muted-foreground" />
                    {authenticatedDept} [Locked to your department]
                  </div>
                ) : (
                  <Select
                    value={form.department}
                    onValueChange={(val) => setForm({ ...form, department: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Entire Institution (All Departments)</SelectItem>
                      {meta.departments.map((d) => (
                        <SelectItem key={d.id} value={d.code}>
                          {d.code} - {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Academic Year</Label>
                <Select
                  value={form.academicYear}
                  onValueChange={(val) => setForm({ ...form, academicYear: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meta.academicYears.map((ay) => (
                      <SelectItem key={ay} value={ay}>
                        AY {ay}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Semester, Section, Course */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Semester</Label>
                <Select
                  value={form.semester}
                  onValueChange={(val) => setForm({ ...form, semester: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Semesters</SelectItem>
                    {meta.semesters.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Semester {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Section</Label>
                <Select
                  value={form.section}
                  onValueChange={(val) => setForm({ ...form, section: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Sections (A, B, C)</SelectItem>
                    <SelectItem value="A">Section A</SelectItem>
                    <SelectItem value="B">Section B</SelectItem>
                    <SelectItem value="C">Section C</SelectItem>
                    <SelectItem value="D">Section D</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Course / Subject</Label>
                <Select
                  value={form.courseCode}
                  onValueChange={(val) => setForm({ ...form, courseCode: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Courses</SelectItem>
                    {availableCourses.map((c) => (
                      <SelectItem key={c.id} value={c.code}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Exam Name, Exam Date, Timing, Venue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Exam Name *</Label>
                <Input
                  value={form.examName}
                  onChange={(e) => setForm({ ...form, examName: e.target.value })}
                  placeholder="e.g. End Semester Exam"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Exam Date</Label>
                <Input
                  type="date"
                  value={form.examDate}
                  onChange={(e) => setForm({ ...form, examDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start & End Time</Label>
                <div className="flex items-center gap-1">
                  <Input
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    placeholder="10:00 AM"
                    className="h-9 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    placeholder="01:00 PM"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Venue / Room</Label>
                <Input
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  placeholder="e.g. Block A - Hall 301"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Message *</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Enter detailed examination instructions, reporting guidelines, dress code, or rules..."
                className="min-h-20 text-xs"
                required
              />
            </div>

            {/* Attachment */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Attachment / Document Link</span>
                <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
              </Label>
              <Input
                value={form.attachmentUrl}
                onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })}
                placeholder="e.g. /documents/schedules/sem5_timetable.pdf"
                className="h-9 text-xs"
              />
            </div>

            {/* Schedule Section Toggle */}
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-purple-600" />
                  <span className="text-xs font-bold text-foreground">
                    Schedule for Future Dispatch
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsScheduledMode(!isScheduledMode)}
                  className={`h-7 text-xs ${isScheduledMode ? "bg-purple-600 text-white hover:bg-purple-700" : ""}`}
                >
                  {isScheduledMode ? "Scheduled Mode ON" : "Schedule"}
                </Button>
              </div>

              {isScheduledMode && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/40">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Publish Date *</Label>
                    <Input
                      type="date"
                      value={form.scheduledDate}
                      onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                      className="h-8 text-xs bg-background"
                      required={isScheduledMode}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Publish Time (Server Time) *</Label>
                    <Input
                      type="time"
                      value={form.scheduledTime}
                      onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                      className="h-8 text-xs bg-background"
                      required={isScheduledMode}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* LIVE RECIPIENT PREVIEW (DIRECT FROM POSTGRESQL) */}
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Users className="size-3.5 text-blue-600" />
                  RECIPIENT PREVIEW (Live from PostgreSQL)
                </span>
                {isLoadingPreview ? (
                  <span className="text-[10px] text-muted-foreground animate-pulse">
                    Querying PostgreSQL recipients...
                  </span>
                ) : (
                  <Badge className="bg-blue-600 text-white font-bold text-[10px]">
                    {preview?.totalRecipients || 0} Total Recipients
                  </Badge>
                )}
              </div>

              {preview ? (
                preview.totalRecipients > 0 ? (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1.5 border-t border-blue-500/10">
                    <div className="p-1.5 rounded-lg bg-background/80 border border-border/40">
                      <span className="text-[10px] text-muted-foreground block">Students</span>
                      <strong className="text-sm font-extrabold text-foreground">{preview.studentCount}</strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-background/80 border border-border/40">
                      <span className="text-[10px] text-muted-foreground block">Faculty</span>
                      <strong className="text-sm font-extrabold text-foreground">{preview.facultyCount}</strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-background/80 border border-border/40">
                      <span className="text-[10px] text-muted-foreground block">Total Recipients</span>
                      <strong className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{preview.totalRecipients}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>No eligible recipients found for the selected criteria.</span>
                  </div>
                )
              ) : null}
            </div>

            {/* Actions: Save Draft / Schedule / Publish Now */}
            <DialogFooter className="pt-3 gap-2 flex-wrap sm:justify-between">
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="h-9 text-xs gap-1.5 border-border/70 hover:bg-muted/60"
                >
                  <Bookmark className="size-3.5" />
                  Save Draft
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>

                {isScheduledMode ? (
                  <Button
                    type="button"
                    onClick={handleScheduleNotification}
                    disabled={isSubmitting}
                    className="h-9 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1.5"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <CalendarClock className="size-3.5" />
                    )}
                    Schedule Notification
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting || (preview?.totalRecipients || 0) === 0}
                    className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5"
                  >
                    <Send className="size-3.5" />
                    Publish Now
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. PUBLISH CONFIRMATION MODAL */}
      <Dialog open={confirmPublishOpen} onOpenChange={setConfirmPublishOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <ShieldCheck className="size-5 text-blue-600" />
              Publish this examination notification?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This action will dispatch live recipient notifications to students and faculty across ANITS and record an authoritative audit entry.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30 space-y-2 text-xs">
            <div className="flex justify-between border-b border-border/40 pb-1.5">
              <span className="text-muted-foreground font-semibold">Title:</span>
              <span className="font-bold text-foreground max-w-56 text-right truncate">{form.title}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-1.5">
              <span className="text-muted-foreground font-semibold">Exam:</span>
              <span className="font-semibold text-foreground">{form.examName || "Standard Session"}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-1.5">
              <span className="text-muted-foreground font-semibold">Department:</span>
              <span className="font-semibold text-foreground">{effectiveDept}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-1.5">
              <span className="text-muted-foreground font-semibold">Semester:</span>
              <span className="font-semibold text-foreground">{form.semester === "ALL" ? "All Semesters" : `Semester ${form.semester}`}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-1.5">
              <span className="text-muted-foreground font-semibold">Target Scope:</span>
              <span className="font-semibold text-foreground capitalize">{form.scope} ({form.recipientType})</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-1.5">
              <span className="text-muted-foreground font-semibold">Recipient Count:</span>
              <span className="font-extrabold text-blue-600 dark:text-blue-400">
                {preview?.totalRecipients || 0} ({preview?.studentCount || 0} Students, {preview?.facultyCount || 0} Faculty)
              </span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-muted-foreground font-semibold">Publish Time:</span>
              <span className="font-semibold text-foreground">Now (Instant Dispatch)</span>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmPublishOpen(false)}
              disabled={isSubmitting}
              className="h-8.5 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPublish}
              disabled={isSubmitting}
              className="h-8.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" /> Publishing...
                </>
              ) : (
                <>
                  <Check className="size-3.5" /> Confirm & Publish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. CANCEL NOTIFICATION MODAL */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <AlertTriangle className="size-5 text-rose-600" />
              Cancel Examination Notification
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cancelling will recall this notification from active recipient dashboards while preserving the record for audit and history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
              <p className="font-semibold text-foreground">{cancelBatchTitle}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">ID: {cancelBatchId}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason for Cancellation *</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Exam session rescheduled per Controller of Examinations notification..."
                className="min-h-20 text-xs"
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelModalOpen(false)}
              disabled={isCancelling}
              className="h-8.5 text-xs"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleConfirmCancel}
              disabled={isCancelling || !cancelReason.trim()}
              className="h-8.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
            >
              {isCancelling ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" /> Cancelling...
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" /> Confirm Cancellation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. NOTIFICATION DETAILS MODAL (DOSSIER) */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="size-4 text-blue-600" />
                Exam Notification Dossier
              </DialogTitle>
              {selectedBatch && renderStatusBadge(selectedBatch.status)}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Batch Identifier: <span className="font-mono">{selectedBatch?.batchId}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedBatch && (
            <div className="space-y-4 text-xs">
              {/* Title & Priority */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-foreground text-sm">
                    {selectedBatch.title}
                  </span>
                  {renderPriorityBadge(selectedBatch.priority || "Normal")}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedBatch.message}
                </p>
                {selectedBatch.attachmentUrl && (
                  <div className="pt-1.5 border-t border-border/40 text-[11px] text-blue-600 font-semibold flex items-center gap-1.5">
                    <FileSpreadsheet className="size-3.5" />
                    Attachment: {selectedBatch.attachmentUrl}
                  </div>
                )}
              </div>

              {/* Cancellation Reason alert if cancelled */}
              {selectedBatch.status === "CANCELLED" && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 space-y-1">
                  <span className="font-bold block">Cancellation Audit Record:</span>
                  <p className="text-xs">{selectedBatch.cancelReason || "Notice recalled by administrator."}</p>
                  <p className="text-[10px] text-rose-600/80">
                    Cancelled by: {selectedBatch.cancelledBy || "Administrator"} on{" "}
                    {selectedBatch.cancelledAt ? new Date(selectedBatch.cancelledAt).toLocaleString() : "—"}
                  </p>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border/60 bg-card">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Type</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedBatch.type}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Department</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedBatch.department || "ALL"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Semester</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedBatch.semester ? `Sem ${selectedBatch.semester}` : "All"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Course</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedBatch.courseCode || "All"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Exam Name</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedBatch.examName || "—"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Exam Date</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedBatch.examDate || "—"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Time Slot</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {selectedBatch.startTime ? `${selectedBatch.startTime} - ${selectedBatch.endTime}` : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Venue</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedBatch.venue || "—"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Target Scope</span>
                  <p className="font-semibold text-foreground mt-0.5 capitalize">{selectedBatch.scope || "department"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Author</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedBatch.senderName || "Administrator"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Author Role</span>
                  <p className="font-semibold text-foreground mt-0.5 uppercase">{selectedBatch.senderRole || "admin"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Created At</span>
                  <p className="font-semibold text-foreground mt-0.5">{new Date(selectedBatch.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Delivery & Read Statistics from PostgreSQL */}
              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Recipient Delivery & Read Tracking (PostgreSQL)</span>
                  <span className="text-blue-600 font-extrabold">
                    {selectedBatch.readPercentage !== undefined ? selectedBatch.readPercentage : 0}% Read
                  </span>
                </span>
                <div className="grid grid-cols-3 gap-2 text-center py-2">
                  <div className="p-2 rounded-lg bg-background border border-border/40">
                    <p className="text-[11px] text-muted-foreground">Total Recipients</p>
                    <p className="text-base font-extrabold text-foreground">{selectedBatch.totalRecipients || 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/40">
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Marked Read</p>
                    <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{selectedBatch.readCount || 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/40">
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">Unread</p>
                    <p className="text-base font-extrabold text-amber-600 dark:text-amber-400">{selectedBatch.unreadCount || 0}</p>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailsModalOpen(false)}
                  className="h-8 text-xs"
                >
                  Close
                </Button>
                {(selectedBatch.status === "PUBLISHED" || selectedBatch.status === "SCHEDULED" || selectedBatch.status === "Active") && meta.canCreate && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setDetailsModalOpen(false);
                      handleOpenCancelDialog(selectedBatch.batchId, selectedBatch.title);
                    }}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Trash2 className="size-3.5" /> Cancel Notification
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
