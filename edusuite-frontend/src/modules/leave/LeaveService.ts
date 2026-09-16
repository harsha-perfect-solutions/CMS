import api from "@/lib/api";

export interface ApprovalStep {
  stepNumber?: number;
  name?: string;
  label?: string;
  status: "Completed" | "Current" | "Pending" | "APPROVED" | "REJECTED";
  date?: string;
  actedAt?: string;
  approver?: string;
  actorName?: string;
  remarks?: string;
  comment?: string;
}

export interface TimetableConflict {
  date: string;
  day: string;
  courseCode: string;
  courseName: string;
  section: string;
  time: string;
  room: string;
  periodNumber: number;
}

export interface LeaveApplication {
  id: string;
  dbId?: string;
  applicantName?: string;
  applicantRole?: string;
  department?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  isHalfDay: boolean;
  halfDaySession?: string | null;
  emergencyContact: string;
  remarks?: string;
  attachmentName?: string;
  status: string; // "HOD_REVIEW" | "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN" | "CANCELLED"
  rejectionReason?: string;
  appliedOn: string;
  approver: string;
  approvalSteps: ApprovalStep[];
  timetableConflicts?: TimetableConflict[];
}

export interface LeaveBalance {
  leaveType: string;
  remaining: number;
  used: number;
  pending?: number;
  total: number;
  percent?: number;
  color: string;
}

export interface LeaveWorkspaceStats {
  casualText: string;
  casualRemaining: number;
  casualUsed: number;
  casualTotal: number;
  sickText: string;
  sickRemaining: number;
  sickUsed: number;
  sickTotal: number;
  earnedText: string;
  earnedRemaining: number;
  earnedUsed: number;
  earnedTotal: number;
  dutyText: string;
  dutyRemaining: number;
  dutyUsed: number;
  dutyTotal: number;
  pendingText: string;
  pendingCount: number;
  upcomingText: string;
  upcomingApproved?: LeaveApplication | null;
}

export interface LeaveWorkspaceData {
  success: boolean;
  faculty: {
    id: string;
    name: string;
    email: string;
    rollNumber: string;
    department?: string;
  };
  department: string;
  academicYear: string;
  stats: LeaveWorkspaceStats;
  balances: LeaveBalance[];
  requests: LeaveApplication[];
  activeTimelineRequest: LeaveApplication | null;
}

/**
 * Fetch complete Personal Faculty Leave Workspace data directly from PostgreSQL
 */
export async function fetchFacultyLeaveWorkspace(): Promise<LeaveWorkspaceData> {
  const res = await api.get("/api/faculty/leave/workspace");
  return res.data;
}

/**
 * Check if the requested leave dates conflict with faculty teaching timetable slots
 */
export async function checkTimetableConflicts(startDate: string, endDate: string): Promise<TimetableConflict[]> {
  const res = await api.get("/api/faculty/leave/check-conflicts", {
    params: { startDate, endDate },
  });
  return res.data?.conflicts || [];
}

/**
 * Apply for a new leave request (backed by PostgreSQL transaction and ApprovalRequest workflow)
 */
export async function applyForFacultyLeave(payload: {
  leaveType: string;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  halfDaySession?: string;
  reason: string;
  emergencyContact?: string;
  additionalNotes?: string;
  attachmentName?: string;
}): Promise<{ success: boolean; message: string; leave: any; timetableConflicts?: TimetableConflict[] }> {
  const res = await api.post("/api/faculty/leave", payload);
  return res.data;
}

/**
 * Withdraw / cancel a pending leave request
 */
export async function withdrawFacultyLeave(id: string): Promise<{ success: boolean; message: string }> {
  const res = await api.post(`/api/faculty/leave/${id}/withdraw`);
  return res.data;
}

export interface HolidayEvent {
  date: string;
  title: string;
  details: string;
  type: "National" | "Exam" | "College";
}

export const MOCK_HOLIDAYS_AND_EVENTS: HolidayEvent[] = [
  { date: "2026-08-15", title: "Independence Day", details: "National Gazetted Holiday", type: "National" },
  { date: "2026-08-22", title: "Ganesh Chaturthi", details: "State Festival Holiday", type: "College" },
  { date: "2026-08-28", title: "Mid-Term Examination", details: "Academic Evaluation Begins", type: "Exam" },
];

