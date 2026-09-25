import { api } from "@/lib/api";

export type WeeklySlotType = "Theory" | "Lab";

export interface WeeklySlot {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
  timeSlot: string;
  startTime: string;
  endTime: string;
  subject: string;
  code: string;
  section: string;
  room: string;
  building?: string;
  type: WeeklySlotType;
  role?: string;
  isLab: boolean;
  isCurrentDay?: boolean;
  isOngoing?: boolean;
  periodNumber: number;
  timetableId: string;
}

export interface TeachingLoad {
  weeklyClasses: number;
  theoryHours: number;
  labHours: number;
  totalHours: number;
  totalSubjects: number;
  totalSections: number;
}

export interface UpcomingClassItem {
  subject: string;
  code: string;
  time: string;
  room: string;
  building: string;
  section: string;
  countdown: string;
}

export interface RoomAllocation {
  subject: string;
  code: string;
  room: string;
  building: string;
  type: "Theory" | "Lab";
  capacity: number;
  semester: number;
}

export interface SubjectSummaryItem {
  name: string;
  code: string;
  semester: string;
  credits: number;
  weeklyHours: number;
  sections: string[];
}

export interface FreePeriod {
  day: string;
  timeSlot: string;
}

export interface ConflictItem {
  period: number;
  day: string;
  reason: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: string;
}

export interface FacultyProfileHeader {
  id: string;
  name: string;
  rollNumber: string;
  department: string | null;
  designation: string;
  email: string;
  role: string;
}

export interface TimetableSlotItem {
  id: string;
  timetableId: string;
  time: string;
  startTime: string;
  endTime: string;
  periodNumber: number;
  subject: string;
  subjectCode: string;
  class: string;
  section: string;
  rawSection: string;
  semester: number;
  branch: string;
  room: string;
  sessionType: "Theory" | "Lab";
  type: "Theory" | "Lab";
  isLab: boolean;
  status: "Completed" | "Ongoing" | "Upcoming";
  isOngoing: boolean;
  attendanceSubmitted?: boolean;
  attendanceStatus?: "ATTENDANCE_SUBMITTED" | "PENDING";
}

export interface FacultyTimetableResponse {
  faculty: FacultyProfileHeader | null;
  academicYear: string;
  /** null when faculty has no timetable assignments for the year */
  activeSemester: number | null;
  availableSemesters: number[];
  /** null when no ?week= param was supplied */
  academicWeek: string | null;
  currentDate: string;
  todaySchedule: TimetableSlotItem[];
  teachingLoad: TeachingLoad;
  weeklyGrid: WeeklySlot[];
  upcomingClasses: UpcomingClassItem[];
  roomAllocations: RoomAllocation[];
  subjectSummary: SubjectSummaryItem[];
  freePeriods: FreePeriod[];
  conflicts: ConflictItem[];
  message?: string;
}

export function recalculateSlotStatus(
  startTimeStr: string,
  endTimeStr: string
): "Completed" | "Ongoing" | "Upcoming" {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTime = (tStr: string): number => {
    if (!tStr) return 0;
    const match = tStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return hours * 60 + mins;
  };

  const startMinutes = parseTime(startTimeStr);
  const endMinutes = parseTime(endTimeStr);

  if (currentMinutes >= endMinutes) {
    return "Completed";
  } else if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    return "Ongoing";
  } else {
    return "Upcoming";
  }
}

export const FacultyTimetableService = {
  async fetchMyTimetable(filters?: {
    semester?: number | string;
    academicYear?: string;
    week?: string;
    day?: string;
  }): Promise<FacultyTimetableResponse> {
    const params: Record<string, any> = {};
    if (filters?.semester && filters.semester !== "all") {
      params.semester = filters.semester;
    }
    if (filters?.academicYear) {
      params.academicYear = filters.academicYear;
    }
    if (filters?.week) {
      params.week = filters.week;
    }
    if (filters?.day) {
      params.day = filters.day;
    }

    const res = await api.get<FacultyTimetableResponse>("api/faculty/my-timetable", { params });

    if (res.status === 403) {
      throw new Error("Access denied: You are not authorized to view this timetable.");
    }
    if (res.status === 401) {
      throw new Error("Authentication expired. Please log in again.");
    }
    if (!res.data || res.status >= 400) {
      throw new Error("Unable to load timetable data from server.");
    }

    return res.data;
  },
};
