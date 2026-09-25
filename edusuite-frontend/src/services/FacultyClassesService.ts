import { api } from "@/lib/api";

export interface FacultyClassItem {
  id: string;
  timetableId: string;
  timetableIds: string[];
  courseId: string;
  courseCode: string;
  courseName: string;
  courseType: string;
  credits: number;
  department: string;
  semester: number;
  section: string;
  cleanSection: string;
  classCode: string;
  displayName: string;
  periodsPerWeek: number;
  roomNo: string;
  rooms: string[];
  isLab: boolean;
  academicYear: string;
  days: string[];
  studentCount: number;
  hasEnrollmentData: boolean;
}

export interface FacultyClassesSummary {
  myCourses: number;
  mySections: number;
  assignedStudents: number;
  weeklyPeriods: number;
  totalClasses: number;
  totalSections: number;
  attendanceAlerts: number;
  gradeAlerts: number;
  averageAttendance: number | null;
  averageGpa: number | null;
  academicYear: string;
}

export interface FacultyClassesFilterOptions {
  academicYears: string[];
  semesters: number[];
  sections: string[];
  courses: { id: string; code: string; name: string }[];
}

export interface EnrolledStudent {
  id: string;
  name: string;
  rollNumber: string;
  registrationNumber?: string;
  email: string;
  mobile?: string;
  status: "Active" | "Inactive";
  department: string;
  program?: string;
  semester: string | number;
  section: string;
  cgpa: number;
  attendance: {
    totalClasses: number;
    present: number;
    absent: number;
    percentage: number | null;
    hasData: boolean;
    displayPercentage: string;
  };
  performance?: {
    internalMarks: number;
    overallGrade: string;
    cgpa: number;
  };
  isShortage: boolean;
  isAtRisk: boolean;
  isMentee?: boolean;
}

export interface FacultyClassesResponse {
  faculty: {
    id: string;
    name: string;
    email: string;
    department: string | null;
    rollNumber: string;
  } | null;
  isClassAdvisor: boolean;
  advisedClass: string | null;
  academicYear: string;
  semester: string;
  summary: FacultyClassesSummary;
  filterOptions: FacultyClassesFilterOptions;
  classes: FacultyClassItem[];
  sections: string[];
  classCodes: string[];
  students: EnrolledStudent[];
  totalCount: number;
  message?: string;
}

export const FacultyClassesService = {
  /**
   * Fetch authenticated faculty's assigned classes, cohorts and enrollment data
   * Strictly scoped to authenticated session in PostgreSQL MasterTimetable
   */
  async fetchMyClasses(filters?: {
    semester?: number | string;
    section?: string;
    classId?: string;
    courseId?: string;
    search?: string;
  }): Promise<FacultyClassesResponse> {
    const params: Record<string, any> = {};
    if (filters?.semester && filters.semester !== "All") {
      params.semester = filters.semester;
    }
    if (filters?.section && filters.section !== "All") {
      params.section = filters.section;
    }
    if (filters?.classId && filters.classId !== "All") {
      params.classId = filters.classId;
    }
    if (filters?.courseId && filters.courseId !== "All") {
      params.courseId = filters.courseId;
    }
    if (filters?.search && filters.search.trim()) {
      params.search = filters.search.trim();
    }

    const res = await api.get<FacultyClassesResponse>("/api/faculty/my-classes", { params });

    if (res.status === 403) {
      throw new Error("Access denied: You are not authorized to view these classes.");
    }
    if (res.status === 401) {
      throw new Error("Authentication expired. Please log in again.");
    }
    if (!res.data || res.status >= 400) {
      throw new Error("Unable to load class data from server.");
    }

    return res.data;
  },

  /**
   * Export the authenticated faculty's classes ledger to CSV
   */
  async exportMyClassesCsv(): Promise<Blob> {
    const res = await api.get("/api/faculty/my-classes/export", {
      responseType: "blob",
    });
    return res.data;
  },
};
