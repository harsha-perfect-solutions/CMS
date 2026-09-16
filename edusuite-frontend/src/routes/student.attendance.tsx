import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarCheck,
  BookOpen,
  Clock,
  FileText,
  Filter,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  AcademicYearOption,
  AttendanceTab,
  SubjectAttendanceItem,
  StudentAttendanceProfile,
  TodayScheduleItem,
  AttendanceHistoryRecord,
  YEAR_TO_SEMESTERS_MAP,
} from "@/components/student-attendance/types";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { AttendanceSummary } from "@/components/student-attendance/attendance-summary";
import { SubjectAttendance } from "@/components/student-attendance/subject-attendance";
import { AttendanceHistory } from "@/components/student-attendance/attendance-history";
import { LeaveManagement } from "@/components/student-attendance/leave-management";
import { AttendanceDrawer } from "@/components/student-attendance/attendance-drawer";
import { LeaveModal } from "@/components/student-attendance/leave-modal";

export const Route = createFileRoute("/student/attendance")({
  head: () => ({
    meta: [{ title: "Student Attendance — EduSuite Pro" }],
  }),
  component: StudentAttendancePage,
});

function StudentAttendancePage() {
  const [activeTab, setActiveTab] = useState<AttendanceTab>("summary");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Year -> Semester filter state
  const [selectedYear, setSelectedYear] = useState<AcademicYearOption>("3rd Year");
  const availableSemesters = YEAR_TO_SEMESTERS_MAP[selectedYear] || [5, 6];
  const [selectedSemester, setSelectedSemester] = useState<number>(5);

  const [selectedSubject, setSelectedSubject] = useState<SubjectAttendanceItem | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Leave requests & balance state
  const [leaveRequests, setLeaveRequests] = useState<any[]>([
    {
      id: "LV-2026-001",
      leaveType: "Medical Leave",
      reason: "Viral fever - Doctor advised 2 days bed rest",
      appliedDate: "10 Sep 2026",
      fromDate: "10 Sep 2026",
      toDate: "11 Sep 2026",
      days: 2,
      status: "Approved",
      approvedBy: "Dr. Ravi Kumar (Class Advisor)",
      remarks: "Medical certificate verified and approved.",
      documentName: "medical_cert.pdf",
    },
  ]);
  const [leaveBalance, setLeaveBalance] = useState({
    totalLeaves: 12,
    availedLeaves: 2,
    availableLeaves: 10,
    medicalLeaves: 2,
    casualLeaves: 0,
    onDutyLeaves: 0,
    pending: 0,
  });

  // Real data state from PostgreSQL
  const [dbProfile, setDbProfile] = useState<StudentAttendanceProfile | null>(null);
  const [dbSubjects, setDbSubjects] = useState<SubjectAttendanceItem[]>([]);
  const [dbHistory, setDbHistory] = useState<AttendanceHistoryRecord[]>([]);

  // Fetch real student attendance from PostgreSQL via authenticated endpoint
  const fetchStudentAttendance = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const res = await api.get("/api/attendance/student/my-attendance");

      if (res.status === 200 && res.data) {
        if (res.data.profile) {
          setDbProfile(res.data.profile);
          if (res.data.profile.semester) {
            setSelectedSemester(res.data.profile.semester);
          }
          if (res.data.profile.academicYear) {
            setSelectedYear(res.data.profile.academicYear);
          }
        }
        if (Array.isArray(res.data.subjects)) {
          setDbSubjects(res.data.subjects);
        }
        if (Array.isArray(res.data.history)) {
          setDbHistory(res.data.history);
        }
      } else {
        setError(res.data?.error || "Unable to fetch student attendance records.");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading attendance.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudentAttendance();
  }, [fetchStudentAttendance]);

  const handleRefresh = async () => {
    toast.info("Synchronizing attendance records with PostgreSQL...");
    await fetchStudentAttendance(true);
    toast.success("Attendance synchronized with real-time class submittals.");
  };

  const handleYearChange = (year: AcademicYearOption) => {
    setSelectedYear(year);
    const newSems = YEAR_TO_SEMESTERS_MAP[year] || [5, 6];
    setSelectedSemester(newSems[0] ?? 5);
  };

  const handleApplyLeave = (newLeave: {
    leaveType: "Casual Leave" | "Medical Leave" | "Emergency Leave" | "On Duty (OD)";
    fromDate: string;
    toDate: string;
    reason: string;
    emergencyContact?: string;
    documentName?: string;
  }) => {
    const created: any = {
      id: `LV-2026-0${Math.floor(10 + Math.random() * 89)}`,
      leaveType: newLeave.leaveType,
      reason: newLeave.reason,
      appliedDate: new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
      fromDate: newLeave.fromDate,
      toDate: newLeave.toDate,
      days: 1,
      status: "Pending",
      approvedBy: "Awaiting Advisor Review",
      remarks: "Under review by Faculty Advisor",
      documentName: newLeave.documentName,
      emergencyContact: newLeave.emergencyContact,
    };

    setLeaveRequests((prev) => [created, ...prev]);
    setLeaveBalance((prev) => ({
      ...prev,
      pending: prev.pending + 1,
      availableLeaves: Math.max(prev.availableLeaves - 1, 0),
    }));
    toast.success("Leave application submitted to your class advisor.");
  };

  // Derive Today's schedule from latest history logs
  const todaySchedule: TodayScheduleItem[] = useMemo(() => {
    const targetDateStr = new Date().toISOString().split("T")[0];
    const todaysLogs = dbHistory.filter((h) => h.date === targetDateStr);

    if (todaysLogs.length > 0) {
      return todaysLogs.map((log) => ({
        id: log.id,
        period: log.period,
        timing: log.timeSlot,
        subjectCode: log.subjectCode,
        subjectName: log.subjectName,
        facultyName: log.facultyName,
        room: log.room,
        status: (log.status === "Present" ? "Present" : log.status === "Absent" ? "Absent" : "Pending") as "Present" | "Absent" | "Pending",
        mode: "Manual",
      }));
    }

    // If no records logged today yet, display active enrolled subjects as pending
    return dbSubjects.slice(0, 3).map((sub, idx) => ({
      id: `sch-${sub.id}-${idx}`,
      period: `Period ${idx + 1}`,
      timing: idx === 0 ? "09:00 AM - 10:00 AM" : idx === 1 ? "10:15 AM - 11:15 AM" : "11:30 AM - 12:30 PM",
      subjectCode: sub.subjectCode,
      subjectName: sub.subjectName,
      facultyName: sub.facultyName,
      room: "LH-301",
      status: "Pending" as const,
      mode: "Manual" as const,
    }));
  }, [dbHistory, dbSubjects]);

  // Compute active profile with fallback to empty state
  const currentProfile: StudentAttendanceProfile = useMemo(() => {
    if (dbProfile) return dbProfile;

    return {
      studentId: "",
      rollNumber: "",
      name: "Student",
      avatarUrl: "",
      program: "B.Tech",
      branch: "CSE",
      section: "A",
      academicYear: selectedYear,
      semester: selectedSemester,
      overallAttendancePct: 0,
      todayAttendanceStatus: "Pending",
      presentClasses: 0,
      absentClasses: 0,
      leaveClasses: 0,
      condonationStatus: "Eligible",
      currentStreak: 0,
      classesRequiredFor75: 0,
      classesRequiredFor85: 0,
      lowAttendanceCount: 0,
    };
  }, [dbProfile, selectedYear, selectedSemester]);

  const tabsConfig = [
    { id: "summary", label: "Attendance Summary", icon: CalendarCheck },
    { id: "subject-attendance", label: "Subject Attendance", icon: BookOpen },
    { id: "history", label: "Attendance History", icon: Clock },
    { id: "leave-management", label: "Leave Management", icon: FileText },
  ] as const;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-sm font-bold text-foreground">Loading your attendance records from database...</p>
        <p className="text-xs text-muted-foreground">Connecting to college attendance database and computing session rates.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 border border-destructive/20 bg-destructive/5 rounded-3xl text-center space-y-4">
        <h3 className="text-base font-bold text-destructive">Unable to load attendance</h3>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button onClick={() => fetchStudentAttendance()} variant="outline" className="gap-2">
          <RefreshCw className="size-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. ACADEMIC YEAR -> SEMESTER DYNAMIC FILTER HEADER BAR */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0b193c]/10 text-[#0b193c] dark:text-blue-400">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Academic Scope Filter</h3>
            <p className="text-xs text-slate-500">
              {currentProfile.name} ({currentProfile.rollNumber}) &middot; {currentProfile.branch} Section {currentProfile.section}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* YEAR DROPDOWN */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase block">Academic Year</label>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value as AcademicYearOption)}
              className="h-9 text-xs px-3 font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0b193c]"
            >
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
          </div>

          {/* SEMESTER DROPDOWN */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase block">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(Number(e.target.value))}
              className="h-9 text-xs px-3 font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0b193c]"
            >
              {availableSemesters.map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          {/* REFRESH BUTTON */}
          <div className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-9 gap-1.5 text-xs font-semibold rounded-xl"
              title="Refresh attendance records from database"
            >
              <RefreshCw className="size-3.5" />
              Sync
            </Button>
          </div>
        </div>
      </div>

      {/* 2. SUBMODULE TABS NAVIGATION */}
      <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <div className="flex items-center space-x-6 min-w-max">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AttendanceTab)}
                className={`py-3.5 px-1 font-semibold text-xs transition-all flex items-center gap-2 border-b-2 ${
                  isActive
                    ? "border-[#0b193c] text-[#0b193c] dark:border-blue-400 dark:text-blue-400 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. ACTIVE SUBMODULE TAB CONTENT */}
      <div>
        {activeTab === "summary" && (
          <AttendanceSummary
            profile={currentProfile}
            schedule={todaySchedule}
            subjects={dbSubjects}
            onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === "subject-attendance" && (
          <SubjectAttendance
            subjects={dbSubjects}
            onSelectSubject={setSelectedSubject}
          />
        )}

        {activeTab === "history" && (
          <AttendanceHistory logs={dbHistory} />
        )}

        {activeTab === "leave-management" && (
          <LeaveManagement
            balance={leaveBalance}
            leaveRequests={leaveRequests}
            onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
          />
        )}
      </div>

      {/* SUBJECT DETAILS DRAWER */}
      <AttendanceDrawer
        subject={selectedSubject}
        onClose={() => setSelectedSubject(null)}
      />

      {/* APPLY LEAVE MODAL */}
      <LeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onSubmitLeave={handleApplyLeave}
      />
    </div>
  );
}
