import { api } from "@/lib/api";
import type {
  WeeklySlot,
  CalendarEvent,
  UpcomingClassItem,
  RoomAllocation,
  SubjectSummaryItem,
  TeachingLoad,
  FreePeriod,
  ConflictItem,
} from "@/data/faculty-mock-data";

export interface FacultyProfileHeader {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
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
}

export interface FacultyTimetableResponse {
  faculty: FacultyProfileHeader | null;
  academicYear: string;
  activeSemester: number;
  availableSemesters: number[];
  academicWeek: string;
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
