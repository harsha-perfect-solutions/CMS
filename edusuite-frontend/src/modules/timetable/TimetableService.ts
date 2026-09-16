import api from "@/lib/api";

export interface TimetablePeriod {
  id: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
  periodNumber: number; // 1 to 8
  startTime: string;    // e.g. "09:00 AM"
  endTime: string;      // e.g. "10:00 AM"
  subjectCode: string;  // e.g. "CS502"
  subjectName: string;  // e.g. "Compiler Design"
  facultyId: string;
  facultyName: string;
  roomNo: string;       // e.g. "Block-A 301"
  isLab: boolean;
  branch: string;       // e.g. "CSE"
  semester: number;     // 1, 3, 5, 7
  section: string;      // "Section A", "Section B"
}

export interface TimetableGrid {
  branch: string;
  semester: number;
  section: string;
  academicYear: string;
  schedule: TimetablePeriod[];
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictReason?: string;
}

export const BRANCHES = [
  "CSE",
  "ECE",
  "ME",
  "CE",
  "EEE",
  "IT",
  "AI&DS",
];

export const SEMESTERS = [1, 3, 5, 7];

export const SECTIONS = ["Section A", "Section B", "Section C"];

export const DAYS: TimetablePeriod["day"][] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const PERIOD_SLOTS = [
  { periodNumber: 1, startTime: "08:45 AM", endTime: "09:45 AM" },
  { periodNumber: 2, startTime: "09:45 AM", endTime: "10:45 AM" },
  { periodNumber: 3, startTime: "10:45 AM", endTime: "11:45 AM" },
  { periodNumber: 4, startTime: "11:45 AM", endTime: "12:45 PM" },
  { periodNumber: 5, startTime: "01:30 PM", endTime: "02:30 PM" },
  { periodNumber: 6, startTime: "02:30 PM", endTime: "03:30 PM" },
  { periodNumber: 7, startTime: "03:30 PM", endTime: "04:30 PM" },
];

export function checkScheduleConflict(
  schedule: TimetablePeriod[],
  newPeriod: Partial<TimetablePeriod>
): ConflictCheckResult {
  // Check if faculty is already teaching elsewhere in the same day and period
  if (newPeriod.facultyName && newPeriod.facultyName !== "Faculty Not Assigned") {
    const clash = schedule.find(
      (p) =>
        p.id !== newPeriod.id &&
        p.day === newPeriod.day &&
        p.periodNumber === newPeriod.periodNumber &&
        p.facultyName &&
        p.facultyName.toLowerCase() === newPeriod.facultyName?.toLowerCase()
    );

    if (clash) {
      return {
        hasConflict: true,
        conflictReason: `⚠️ CLASH ALERT: ${newPeriod.facultyName} is already assigned to Period ${clash.periodNumber} on ${clash.day} (${clash.subjectName || clash.subjectCode})!`,
      };
    }
  }

  // Check if room is already occupied in the same day and period
  if (newPeriod.roomNo && newPeriod.roomNo.trim() !== "") {
    const roomClash = schedule.find(
      (p) =>
        p.id !== newPeriod.id &&
        p.day === newPeriod.day &&
        p.periodNumber === newPeriod.periodNumber &&
        p.roomNo &&
        p.roomNo.trim().toLowerCase() === newPeriod.roomNo?.trim().toLowerCase()
    );

    if (roomClash) {
      return {
        hasConflict: true,
        conflictReason: `⚠️ ROOM CLASH: Room ${newPeriod.roomNo} is already occupied by ${roomClash.subjectName || roomClash.subjectCode} in Period ${roomClash.periodNumber} on ${roomClash.day}!`,
      };
    }
  }

  return { hasConflict: false };
}

export async function fetchTimetableGrid(
  branch: string = "CSE",
  semester: number = 5,
  section: string = "Section A",
  academicYear: string = "2026-27"
): Promise<TimetableGrid> {
  try {
    const res = await api.get("/api/academics/timetable", {
      params: { branch, semester, section, academicYear },
    });
    if (res && res.data) {
      return {
        branch: res.data.branch || branch,
        semester: res.data.semester || semester,
        section: res.data.section || section,
        academicYear: res.data.academicYear || academicYear,
        schedule: Array.isArray(res.data.schedule) ? res.data.schedule : [],
      };
    }
  } catch (err) {
    console.error("Failed to fetch timetable grid from PostgreSQL:", err);
  }

  return {
    branch,
    semester,
    section,
    academicYear,
    schedule: [],
  };
}

export async function autoGenerateTimetable(
  branch: string,
  semester: number,
  section: string
): Promise<TimetableGrid> {
  const res = await api.post("/api/academics/timetable/generate", { branch, semester, section });
  if (res && res.data && Array.isArray(res.data.schedule)) {
    return res.data;
  }
  return fetchTimetableGrid(branch, semester, section);
}

export async function updateTimetablePeriod(
  periodData: Partial<TimetablePeriod>
): Promise<any> {
  const res = await api.put("/api/academics/timetable/update-period", periodData);
  return res.data;
}
