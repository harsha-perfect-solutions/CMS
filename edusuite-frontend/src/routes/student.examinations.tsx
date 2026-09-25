import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { getMockStudents, getMockExams, saveStudentCourseRegistration, toggleStudentCourseRegistration } from "@/lib/mock-examcell-state";
import api from "@/lib/api";
import { useRole } from "@/context/role-context";
import {
  ExamSubmodule,
  CourseRegWorkflowStatus,
  ExamRegWorkflowStatus,
  HallTicketWorkflowStatus,
  ResultWorkflowStatus,
  AcademicYearOption,
  YEAR_TO_SEMESTERS_MAP,
  HallTicketRecordItem,
  SemesterResultItem,
} from "@/components/student-examinations/types";
import {
  MOCK_EXAM_PROFILE,
  MOCK_UPCOMING_EXAMS,
  MOCK_SEMESTER_RESULTS,
  MOCK_AVAILABLE_COURSES,
  MOCK_REGISTRATION_WORKFLOW,
  MOCK_EXAM_REGISTRATIONS,
} from "@/components/student-examinations/mock-data";

// Submodule Views
import { CourseRegistration } from "@/components/student-examinations/course-registration";
import { ExamRegistration } from "@/components/student-examinations/exam-registration";
import { HallTicket } from "@/components/student-examinations/hall-ticket";
import { Results } from "@/components/student-examinations/results";

// Modals & Drawers
import { HallTicketModal } from "@/components/student-examinations/modals/hall-ticket-modal";
import { GradeCardModal } from "@/components/student-examinations/modals/grade-card-modal";
import { CourseDetailsDrawer } from "@/components/student-examinations/modals/course-details-drawer";
import { RegistrationModal } from "@/components/student-examinations/modals/registration-modal";
import { RevaluationModal } from "@/components/student-examinations/modals/revaluation-modal";

// UI Primitives & Icons
import {
  BookOpen,
  Ticket,
  Award,
  ClipboardCheck,
  Lock,
  Bell,
  Clock,
  AlertTriangle,
  AlertCircle,
  Calendar,
  MapPin,
  CheckCircle2,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/student/examinations")({
  head: () => ({
    meta: [{ title: "Examinations — EduSuite Pro ERP" }],
  }),
  component: StudentExaminationsPage,
});

function StudentExaminationsPage() {
  // Active Submodule Tab
  const [activeSubmodule, setActiveSubmodule] = useState<ExamSubmodule>("course-registration");

  // Year & Semester State
  const [selectedYear, setSelectedYear] = useState<AcademicYearOption>("3rd Year");
  const [selectedSemester, setSelectedSemester] = useState<number>(5);

  // Linked Workflow State
  const [courseRegStatus, setCourseRegStatus] = useState<CourseRegWorkflowStatus>("Draft");
  const [examRegStatus, setExamRegStatus] = useState<ExamRegWorkflowStatus>("Locked");
  const [hallTicketStatus, setHallTicketStatus] = useState<HallTicketWorkflowStatus>("Locked");
  const [resultStatus, setResultStatus] = useState<ResultWorkflowStatus>("Not Published");

  // Real-time Database Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const [notifsError, setNotifsError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoadingNotifs(true);
      setNotifsError(null);
      const res = await api.get("/api/notifications");
      const list = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
      const unread = typeof res.data?.unreadCount === "number" ? res.data.unreadCount : list.filter((n: any) => !n.isRead).length;
      setNotifications(list);
      setUnreadCount(unread);
    } catch (err: any) {
      setNotifsError("Unable to load notifications.");
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Failed to mark all as read.");
    }
  };

  // Dynamic Datasets
  const [profile, setProfile] = useState(MOCK_EXAM_PROFILE);
  const [upcomingExams, setUpcomingExams] = useState(MOCK_UPCOMING_EXAMS);
  const [semesterResults] = useState(MOCK_SEMESTER_RESULTS);
  const [availableCourses, setAvailableCourses] = useState(MOCK_AVAILABLE_COURSES);
  const [workflow] = useState(MOCK_REGISTRATION_WORKFLOW);
  const [examRegistrations, setExamRegistrations] = useState(MOCK_EXAM_REGISTRATIONS);

  const normalizeDept = (dept: string) => {
    if (dept === "AIML") return "AI&ML";
    if (dept === "AIDS") return "AI&DS";
    if (dept === "MECH") return "MECHANICAL";
    return dept;
  };

  // Load user profile details dynamically
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get("/api/auth/profile");
        if (res.status === 200 && res.data) {
          const profileData = {
            ...MOCK_EXAM_PROFILE,
            studentId: res.data.id || "st-1",
            rollNumber: res.data.rollNumber,
            studentName: res.data.name,
            name: res.data.name,
            email: res.data.email,
            department: res.data.department || "CSE",
            branch: res.data.department || "CSE",
            semester: res.data.semester || 1,
            currentSemester: res.data.semester || 1,
            cgpa: res.data.cgpa || 8.85,
            creditsEarned: res.data.creditsEarned || 0,
            avatarUrl: res.data.avatarUrl || "",
            section: res.data.section || "A",
          };
          setProfile(profileData);

          // Auto-select correct Year and Semester
          const sem = profileData.semester;
          setSelectedSemester(sem);
          if (sem <= 2) {
            setSelectedYear("1st Year");
          } else if (sem <= 4) {
            setSelectedYear("2nd Year");
          } else if (sem <= 6) {
            setSelectedYear("3rd Year");
          } else {
            setSelectedYear("4th Year");
          }
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    }
    fetchProfile();
  }, []);

  // Load course catalog dynamically based on selected semester and profile department
  useEffect(() => {
    async function fetchCatalog() {
      if (!profile.department) return;
      try {
        const res = await api.get(`/api/courses?semester=${selectedSemester}`);
        if (res.status === 200 && res.data) {
          const mapped = res.data.map((c: any) => {
            return {
              id: c.id,
              code: c.code,
              name: c.name,
              credits: c.credits,
              type: c.category || "Core",
              faculty: c.faculty || "Dr. Diya Deshmukh",
              semester: c.semester,
              availableSeats: 58,
              totalSeats: 60,
              isRegistered: c.isRegistered,
              status: c.status,
              description: `Approved course offered for CSE Sem ${selectedSemester}.`,
              syllabus: ["Foundations & Core Principles", "System Architecture", "Operational Execution"]
            };
          });
          setAvailableCourses(mapped);

          // Dynamically compute workflow states from database courses
          const registered = mapped.filter((c: any) => c.isRegistered);
          if (registered.length > 0) {
            setCourseRegStatus("Completed");

            // Check if any registered course is paid in the database
            const anyPaid = registered.some((c: any) => c.status === "exam_registered_paid");
            if (anyPaid) {
              setExamRegStatus("Paid & Registered");
              setHallTicketStatus("Generated");
            } else {
              setExamRegStatus("Pending Payment");
              setHallTicketStatus("Locked");
            }
          } else {
            setCourseRegStatus("Draft");
            setExamRegStatus("Locked");
            setHallTicketStatus("Locked");
          }
        } else {
          setAvailableCourses([]);
        }
      } catch (err) {
        console.error("Failed to load course catalog:", err);
        setAvailableCourses([]);
      }
    }
    fetchCatalog();
  }, [profile.department, selectedSemester, profile.rollNumber]);


  // Synchronize student's database authorization status with active view states
  useEffect(() => {
    async function checkHallTicketAuthorization() {
      try {
        const res = await api.get(`/api/student/exams/hall-ticket?semester=${selectedSemester}`);
        if (res.status === 200 && res.data && res.data.released) {
          setHallTicketStatus("Generated");
          setExamRegStatus("Paid & Registered");
          return;
        }
      } catch (e) {}

      // Fallback check against local records
      const mockStudents = getMockStudents();
      const record = mockStudents.find(s => 
        s.roll_number === profile.rollNumber || s.roll_number === "22CS101" || s.roll_number === "26CSA01"
      );

      if (record && (record.hall_ticket_status === 'Generated' || record.hall_ticket_status === 'RELEASED' || record.is_overridden)) {
        setHallTicketStatus("Generated");
        setExamRegStatus("Paid & Registered");
      } else {
        setHallTicketStatus("Locked");
      }
    }

    checkHallTicketAuthorization();
  }, [profile.rollNumber, selectedSemester]);

  // Hall Ticket Modal — supports both current & archive hall tickets
  const [hallTicketModalOpen, setHallTicketModalOpen] = useState(false);
  const [selectedHallTicketRecord, setSelectedHallTicketRecord] = useState<HallTicketRecordItem | null>(null);

  // Grade Card Modal
  const [gradeCardModalOpen, setGradeCardModalOpen] = useState(false);
  const [selectedSemesterResult, setSelectedSemesterResult] = useState<SemesterResultItem | null>(null);

  // Course Drawer
  const [courseDrawerOpen, setCourseDrawerOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  // Registration Modal
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);

  // Revaluation Modal
  const [revaluationModalOpen, setRevaluationModalOpen] = useState(false);

  // Year Change Handler
  const handleYearChange = (year: AcademicYearOption) => {
    setSelectedYear(year);
    const sems = YEAR_TO_SEMESTERS_MAP[year] || [1, 2];
    const defaultSem = sems[0] ?? 1;
    setSelectedSemester(defaultSem);
    toast.info(`Switched to ${year} (Semester ${defaultSem})`);
  };

  const handleSemesterChange = (sem: number) => {
    setSelectedSemester(sem);
    toast.info(`Switched to Semester ${sem}`);
  };

  // Submodules list
  const submodulesList = [
    { id: "course-registration", label: "Course Registration", icon: BookOpen },
    { id: "exam-registration", label: "Exam Registration", icon: ClipboardCheck },
    { id: "hall-ticket", label: "Hall Ticket", icon: Ticket },
    { id: "results", label: "Results & Memos", icon: Award },
    { id: "exam-notifications", label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}`, icon: Bell },
  ];

  // Helper counts
  const semesterCourses = availableCourses.filter((c) => c.semester === selectedSemester);
  const registeredCoursesList = semesterCourses.filter((c) => c.isRegistered);
  const registeredCreditsSum = registeredCoursesList.reduce((s, c) => s + c.credits, 0);
  const totalOfferedCredits = semesterCourses.reduce((s, c) => s + c.credits, 0);

  // Fetch approved timetable from backend for student cohort
  const [publishedTimetableExams, setPublishedTimetableExams] = useState<any[]>([]);

  useEffect(() => {
    async function fetchPublishedTimetable() {
      try {
        const res = await api.get(`/api/student/exams/timetable?department=${profile.department || "CSE"}&semester=${selectedSemester}`);
        if (res.status === 200 && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setPublishedTimetableExams(res.data);
        } else {
          setPublishedTimetableExams([]);
        }
      } catch (err) {
        setPublishedTimetableExams([]);
      }
    }
    fetchPublishedTimetable();
  }, [profile.department, selectedSemester]);

  // Dynamically map ONLY registered courses or approved published timetable for registered courses
  const registeredCourseCodes = registeredCoursesList.map((c) => c.code);

  const filteredTimetableSlots = publishedTimetableExams.filter((t) =>
    registeredCourseCodes.length > 0 ? registeredCourseCodes.includes(t.subjectCode) : false
  );

  const dynamicUpcomingExams = filteredTimetableSlots.length > 0
    ? filteredTimetableSlots.map((t, idx) => ({
        id: t.id || `t-${idx}`,
        subjectCode: t.subjectCode,
        subjectName: t.subjectName,
        examDate: t.examDate,
        timeSlot: t.timeSlot || "Morning (10:00 AM - 01:00 PM)",
        hallNumber: t.hallNumber || "Block A - Room 101",
        seatNumber: t.seatNumber || `A-${20 + idx}`,
      }))
    : registeredCoursesList.map((c, index) => {
        const dates = ["2026-08-12", "2026-08-14", "2026-08-17", "2026-08-19"];
        return {
          id: c.id,
          subjectCode: c.code,
          subjectName: c.name,
          examDate: dates[index % dates.length],
          timeSlot: "Morning (10:00 AM - 01:00 PM)",
          hallNumber: `Block A - Room 10${1 + (index % 3)}`,
          seatNumber: `A-1${index + 2}`,
        };
      });

  // Find matching exam schedule to determine flat fee and freeze lock state
  const mockSchedules = getMockExams();
  const matchedSchedule = mockSchedules.find(
    (s) =>
      s.department === (profile.department || "CSE") &&
      s.semester === selectedSemester &&
      s.status === "Upcoming"
  );
  const flatFee = matchedSchedule?.examFee || 2000;
  const isExamFrozen = !matchedSchedule;

  // Workflow Triggers
  const handleCompleteCourseRegistration = async () => {
    const registered = availableCourses.filter(c => c.isRegistered);
    const courseIds = registered.map(c => c.id);

    try {
      if (courseIds.length > 0) {
        await api.post("/api/courses/register", { courseIds });
      }
    } catch (e) {}

    registered.forEach(c => {
      saveStudentCourseRegistration(profile.rollNumber || "AIDS26005", c.code);
      saveStudentCourseRegistration(profile.name || "Sanjay Gupta", c.code);
      saveStudentCourseRegistration("AIDS26005", c.code);
      saveStudentCourseRegistration("22CS101", c.code);
    });

    setCourseRegStatus("Completed");
    setExamRegStatus("Pending Payment");
    toast.success("Course Registration Completed! Exam Registration is now UNLOCKED.");
  };

  const handleCompleteAllExamRegistration = async (courseIds: string[]) => {
    try {
      const res = await api.post("/api/courses/pay-exams", { courseIds });
      if (res.status === 200) {
        setCourseRegStatus("Completed");
        setExamRegStatus("Paid & Registered");
        setHallTicketStatus("Generated");
        toast.success("Exam fee payment successful! Hall Ticket UNLOCKED & GENERATED.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to submit exam fee payment.");
    }
  };

  const handleRegisterSingleExam = (examRegId: string) => {
    setExamRegistrations((prev) => {
      const next = prev.map((reg) => {
        if (reg.id === examRegId) {
          return {
            ...reg,
            paymentStatus: "Paid" as const,
            status: "Approved" as const,
            receiptNumber: `EXM-REC-${Math.floor(1000 + Math.random() * 9000)}`,
          };
        }
        return reg;
      });

      const allPaid = next.every((r) => r.paymentStatus === "Paid");
      if (allPaid) {
        setExamRegStatus("Paid & Registered");
        setHallTicketStatus("Generated");
        toast.success("All exam registrations paid! Hall Ticket UNLOCKED.");
      } else {
        setExamRegStatus("Pending Payment");
        toast.success("Single exam fee paid!");
      }
      return next;
    });
  };

  const handleToggleRegisterCourse = (courseId: string) => {
    setAvailableCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          const nextRegistered = !c.isRegistered;

          toggleStudentCourseRegistration(profile.rollNumber || "AIDS26005", c.code);
          toggleStudentCourseRegistration(profile.name || "Sanjay Gupta", c.code);
          toggleStudentCourseRegistration("AIDS26005", c.code);
          toggleStudentCourseRegistration("22CS101", c.code);

          toast.success(
            nextRegistered
              ? `Registered for ${c.code} (${c.name})`
              : `Dropped ${c.code} (${c.name})`
          );
          return {
            ...c,
            isRegistered: nextRegistered,
            availableSeats: nextRegistered ? c.availableSeats - 1 : c.availableSeats + 1,
          };
        }
        return c;
      })
    );
  };

  const handleTogglePublishResults = () => {
    if (resultStatus === "Published") {
      setResultStatus("Not Published");
      toast.info("Results status set to Evaluation In Progress.");
    } else {
      setResultStatus("Published");
      toast.success("Results published by Controller of Examinations!");
    }
  };

  // Semester Navigation inside GradeCard Modal
  const handleNavigateSemester = (sem: number) => {
    const result = semesterResults.find((r) => r.semester === sem);
    if (result) {
      setSelectedSemesterResult(result);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* 1. TOP 4 METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Branch */}
        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <span className="text-xs font-semibold text-slate-500 block">Your Branch / Department</span>
          <div className="text-3xl font-extrabold text-[#0b193c] dark:text-blue-400 font-display">
            {profile.department}
          </div>
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-[#0b193c]/10 text-[#0b193c] dark:text-blue-400 border border-[#0b193c]/20">
            Department Profile
          </span>
        </div>

        {/* Card 2: Earned Credits */}
        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <span className="text-xs font-semibold text-slate-500 block">Total Earned Credits</span>
          <div className="text-3xl font-extrabold text-[#0b193c] dark:text-blue-400 font-display">
            0 Credits
          </div>
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-[#0b193c]/10 text-[#0b193c] dark:text-blue-400 border border-[#0b193c]/20">
            From declared results
          </span>
        </div>

        {/* Card 3: Registered Courses */}
        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <span className="text-xs font-semibold text-slate-500 block">Registered Courses (Sem {selectedSemester})</span>
          <div className="text-3xl font-extrabold text-[#0b193c] dark:text-blue-400 font-display">
            {registeredCoursesList.length}
          </div>
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-[#0b193c]/10 text-[#0b193c] dark:text-blue-400 border border-[#0b193c]/20">
            Completed Enrolment
          </span>
        </div>

        {/* Card 4: Registered Credits */}
        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <span className="text-xs font-semibold text-slate-500 block">Total Registered Credits (Sem {selectedSemester})</span>
          <div className="text-3xl font-extrabold text-[#0b193c] dark:text-blue-400 font-display">
            {registeredCreditsSum} Credits
          </div>
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-[#0b193c]/10 text-[#0b193c] dark:text-blue-400 border border-[#0b193c]/20">
            Max Limit: {totalOfferedCredits} Credits
          </span>
        </div>

      </div>

      {/* 2. SUBMODULE TABS */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-6">
          {submodulesList.map((sub) => {
            const IconComp = sub.icon;
            const isActive = activeSubmodule === sub.id;

            let isLocked = false;
            if (sub.id === "exam-registration") {
              const currentSemester = profile.semester || 1;
              if (selectedSemester === currentSemester) {
                isLocked = courseRegStatus !== "Completed" || isExamFrozen;
              } else if (selectedSemester > currentSemester) {
                isLocked = true;
              }
            }
            if (sub.id === "hall-ticket") {
              const currentSemester = profile.semester || 1;
              if (selectedSemester === currentSemester) {
                isLocked = examRegStatus !== "Paid & Registered";
              } else if (selectedSemester > currentSemester) {
                isLocked = true;
              }
            }

            return (
              <button
                key={sub.id}
                onClick={() => setActiveSubmodule(sub.id as ExamSubmodule)}
                className={`pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
                  isActive
                    ? "border-[#0b193c] text-[#0b193c] dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <IconComp className="h-4 w-4" />
                <span>{sub.label}</span>
                {isLocked && <Lock className="h-3 w-3 opacity-60" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MAIN SUBMODULE VIEWS */}
      {activeSubmodule === "course-registration" && (
        <CourseRegistration
          profile={profile}
          courses={availableCourses}
          workflow={workflow}
          courseRegStatus={courseRegStatus}
          selectedYear={selectedYear}
          selectedSemester={selectedSemester}
          onYearChange={handleYearChange}
          onSemesterChange={handleSemesterChange}
          onToggleRegister={handleToggleRegisterCourse}
          onOpenCourseDrawer={(course) => {
            setSelectedCourse(course);
            setCourseDrawerOpen(true);
          }}
          onOpenConfirmModal={() => setRegistrationModalOpen(true)}
          onCompleteCourseRegistration={handleCompleteCourseRegistration}
          onNavigateToExamReg={() => setActiveSubmodule("exam-registration")}
        />
      )}

      {activeSubmodule === "exam-registration" && (
        <ExamRegistration
          profile={profile}
          examRegistrations={examRegistrations}
          courses={availableCourses}
          courseRegStatus={courseRegStatus}
          examRegStatus={examRegStatus}
          selectedYear={selectedYear}
          selectedSemester={selectedSemester}
          flatFee={flatFee}
          isFrozen={isExamFrozen}
          onYearChange={handleYearChange}
          onSemesterChange={handleSemesterChange}
          onRegisterExam={handleRegisterSingleExam}
          onCompleteAllExamReg={handleCompleteAllExamRegistration}
          onNavigateToCourseReg={() => setActiveSubmodule("course-registration")}
          onNavigateToHallTicket={() => setActiveSubmodule("hall-ticket")}
        />
      )}

      {activeSubmodule === "hall-ticket" && (
        <HallTicket
          profile={profile}
          exams={dynamicUpcomingExams}
          examRegStatus={examRegStatus}
          hallTicketStatus={hallTicketStatus}
          selectedYear={selectedYear}
          selectedSemester={selectedSemester}
          onYearChange={handleYearChange}
          onSemesterChange={handleSemesterChange}
          onOpenModal={(ht) => {
            setSelectedHallTicketRecord(ht || null);
            setHallTicketModalOpen(true);
          }}
          onNavigateToExamReg={() => setActiveSubmodule("exam-registration")}
        />
      )}

      {activeSubmodule === "results" && (
        <Results
          profile={profile}
          semesterResults={semesterResults}
          resultStatus={resultStatus}
          selectedYear={selectedYear}
          selectedSemester={selectedSemester}
          onYearChange={handleYearChange}
          onSemesterChange={handleSemesterChange}
          onOpenGradeCardModal={(res) => {
            setSelectedSemesterResult(res);
            setGradeCardModalOpen(true);
          }}
          onApplyRevaluation={() => setRevaluationModalOpen(true)}
          onTogglePublishResults={handleTogglePublishResults}
        />
      )}

      {activeSubmodule === "exam-notifications" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">Examination Notifications & Alerts</h3>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs font-semibold">
                    {unreadCount} Unread
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Real-time official notifications regarding examination timetables, hall tickets, venue allocations, and attendance eligibility.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchNotifications}
                disabled={isLoadingNotifs}
                className="text-xs h-8 gap-1.5"
              >
                <RotateCw className={`size-3.5 ${isLoadingNotifs ? "animate-spin" : ""}`} /> Refresh
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {isLoadingNotifs && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                Loading notifications...
              </div>
            ) : notifsError ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-xs text-muted-foreground">{notifsError}</p>
                <Button variant="outline" size="sm" onClick={fetchNotifications}>
                  Retry
                </Button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
                <Bell className="size-8 text-muted-foreground/30 mx-auto" />
                <p className="font-semibold text-sm text-foreground">No new notifications.</p>
                <p>You are all caught up with your examination notices.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isShortage = n.type?.includes("SHORTAGE") || n.title?.includes("Attendance");
                const isResched = n.type?.includes("RESCHED");
                const isCancel = n.type?.includes("CANCEL");
                const isHallTicket = n.type?.includes("HALL_TICKET") || n.type?.includes("TICKET");
                const isVenue = n.type?.includes("VENUE");
                const isResult = n.type?.includes("RESULTS");

                return (
                  <div
                    key={n.id}
                    className={`p-5 transition-colors flex items-start gap-4 ${
                      !n.isRead ? "bg-blue-50/40 dark:bg-blue-950/20" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    <div
                      className={`size-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isShortage
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-600"
                          : isCancel
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-600"
                          : isResched
                          ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600"
                          : isHallTicket
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600"
                          : isVenue
                          ? "bg-violet-500/10 border-violet-500/20 text-violet-600"
                          : isResult
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                          : "bg-blue-500/10 border-blue-500/20 text-blue-600"
                      }`}
                    >
                      {isShortage ? (
                        <AlertTriangle className="size-5" />
                      ) : isCancel ? (
                        <AlertCircle className="size-5" />
                      ) : isResched ? (
                        <Calendar className="size-5" />
                      ) : isHallTicket ? (
                        <Ticket className="size-5" />
                      ) : isVenue ? (
                        <MapPin className="size-5" />
                      ) : isResult ? (
                        <Award className="size-5" />
                      ) : (
                        <Bell className="size-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-sm font-bold ${!n.isRead ? "text-foreground" : "text-foreground/80"}`}>
                            {n.title}
                          </h4>
                          <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider py-0 px-1.5">
                            {n.type || "EXAM"}
                          </Badge>
                          {!n.isRead && (
                            <span className="size-2 rounded-full bg-blue-600 inline-block shrink-0" title="Unread" />
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                          <Clock className="size-3" />
                          {new Date(n.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {n.message}
                      </p>
                      {n.link && (
                        <div className="pt-1">
                          <a
                            href={n.link}
                            onClick={() => {
                              if (!n.isRead) handleMarkAsRead(n.id);
                            }}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                          >
                            Open linked page →
                          </a>
                        </div>
                      )}
                    </div>
                    {!n.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMarkAsRead(n.id)}
                        className="size-8 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 shrink-0"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="size-4" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      <HallTicketModal
        open={hallTicketModalOpen}
        onOpenChange={setHallTicketModalOpen}
        profile={profile}
        exams={dynamicUpcomingExams}
        hallTicketRecord={selectedHallTicketRecord}
      />

      <GradeCardModal
        open={gradeCardModalOpen}
        onOpenChange={setGradeCardModalOpen}
        profile={profile}
        result={selectedSemesterResult}
        allResults={semesterResults}
        onNavigateSemester={handleNavigateSemester}
        onApplyRevaluation={() => {
          setGradeCardModalOpen(false);
          setRevaluationModalOpen(true);
        }}
      />

      <CourseDetailsDrawer
        open={courseDrawerOpen}
        onOpenChange={setCourseDrawerOpen}
        course={selectedCourse}
        onRegister={(c) => handleToggleRegisterCourse(c.id)}
        onDrop={(c) => handleToggleRegisterCourse(c.id)}
      />

      <RegistrationModal
        open={registrationModalOpen}
        onOpenChange={setRegistrationModalOpen}
        selectedCourses={registeredCoursesList}
        allCourses={availableCourses}
        onConfirm={async (nptelSubmissions) => {
          try {
            const courseIds = registeredCoursesList.map(c => c.id);
            // 1. Submit checked courses
            if (courseIds.length > 0) {
              await api.post("/api/courses/register", { courseIds });
            }

            // 2. Submit NPTEL certifications for unchecked skipped courses
            if (nptelSubmissions.length > 0) {
              await api.post("/api/courses/nptel", { submissions: nptelSubmissions });
            }

            setCourseRegStatus("Completed");
            setExamRegStatus("Pending Payment");
            toast.success("Course registration and NPTEL exemptions submitted successfully!");
          } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to submit course registrations.");
          }
        }}
      />

      <RevaluationModal
        open={revaluationModalOpen}
        onOpenChange={setRevaluationModalOpen}
        semesterResults={semesterResults}
        defaultSemester={selectedSemesterResult?.semester || selectedSemester}
        onSubmitRevaluation={(data) => {
          toast.success(`Revaluation request for ${data.subjectCode} submitted! Ref: REV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
        }}
      />

    </div>
  );
}
