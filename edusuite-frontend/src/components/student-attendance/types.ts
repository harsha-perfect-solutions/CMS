export type AcademicYearOption = "1st Year" | "2nd Year" | "3rd Year" | "4th Year";

export const YEAR_TO_SEMESTERS_MAP: Record<AcademicYearOption, number[]> = {
  "1st Year": [1, 2],
  "2nd Year": [3, 4],
  "3rd Year": [5, 6],
  "4th Year": [7, 8],
};

export type AttendanceTab =
  | "summary"
  | "subject-attendance"
  | "history"
  | "leave-management";

export interface StudentAttendanceProfile {
  studentId: string;
  rollNumber: string;
  name: string;
  avatarUrl: string;
  program: string;
  branch: string;
  section: string;
  academicYear: AcademicYearOption;
  semester: number;
  overallAttendancePct: number;
  todayAttendanceStatus: "Present" | "Absent font-bold" | "Pending" | "Holiday";
  presentClasses: number;
  absentClasses: number;
  lateClasses?: number;
  totalConducted?: number;
  leaveClasses: number;
  condonationStatus: "Eligible" | "Condonation Required" | "Ineligible";
  currentStreak: number; // in days
  classesRequiredFor75: number;
  classesRequiredFor85: number;
  lowAttendanceCount: number;
}

export interface TodayScheduleItem {
  id: string;
  period: string;
  timing: string;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  room: string;
  status: "Present" | "Absent" | "Pending";
  mode: "Biometric" | "QR Code" | "Manual";
}

export interface AttendanceHistoryRecord {
  id: string;
  date: string;
  day: string;
  period: string;
  timeSlot: string;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  room: string;
  status: "Present" | "Absent" | "Late" | "Medical Leave" | "On Duty" | "Holiday";
  mode: "Biometric" | "QR Code" | "Manual";
  remarks: string;
}

export interface SubjectAttendanceItem {
  id: string;
  academicYear: AcademicYearOption;
  semester: number;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  facultyDesignation: string;
  facultyEmail: string;
  facultyAvatar: string;
  credits: number;
  conducted: number;
  present?: number;
  late?: number;
  attended: number;
  absent: number;
  leave: number;
  attendancePct: number;
  status: "Above 85%" | "75-85%" | "Below 75%";
  governanceStatus?: string;
  classesNeeded75: number;
  classesNeeded85: number;
  classesMissed: number;
  medicalLeaves: number;
  facultyRemarks: string;
  aiRiskPrediction: "Low Risk" | "Moderate Risk" | "High Shortage Risk";
  monthlyTrend: { month: string; pct: number }[];
  weeklyTrend: { week: string; pct: number }[];
  hasTrendData?: boolean;
  historyLogs: AttendanceHistoryRecord[];
}

export interface CalendarDayItem {
  date: string;
  dayNumber: number;
  dayName: string;
  status: "Present" | "Absent" | "Leave" | "Holiday" | "Exam";
  title?: string;
  periods: TodayScheduleItem[];
}

export interface LeaveRequestItem {
  id: string;
  leaveType: "Casual Leave" | "Medical Leave" | "Emergency Leave" | "On Duty (OD)";
  reason: string;
  appliedDate: string;
  fromDate: string;
  toDate: string;
  days: number;
  status: "Approved" | "Pending" | "Rejected";
  approvedBy: string;
  remarks: string;
  documentName?: string;
  emergencyContact?: string;
}

export interface LeaveBalanceSummary {
  availableLeaves: number;
  appliedLeaves: number;
  approved: number;
  pending: number;
  rejected: number;
  medical: number;
  emergency: number;
  onDuty: number;
}
