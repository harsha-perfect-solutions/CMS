export type ExamSubmodule =
  | "course-registration"
  | "exam-registration"
  | "hall-ticket"
  | "results"
  | "exam-notifications";

export type CourseRegWorkflowStatus =
  | "Not Started"
  | "Submitted"
  | "Advisor Approved"
  | "HOD Approved"
  | "Completed";

export type ExamRegWorkflowStatus =
  | "Locked"
  | "Pending Payment"
  | "Paid & Registered";

export type HallTicketWorkflowStatus =
  | "Locked"
  | "Generated"
  | "Downloaded";

export type ResultWorkflowStatus =
  | "Not Published"
  | "Published";

export type HallTicketCategory = "regular" | "supplementary";
export type ResultCategory = "regular" | "supplementary" | "internal";

export type AcademicYearOption = "1st Year" | "2nd Year" | "3rd Year" | "4th Year";

export const YEAR_TO_SEMESTERS_MAP: Record<AcademicYearOption, number[]> = {
  "1st Year": [1, 2],
  "2nd Year": [3, 4],
  "3rd Year": [5, 6],
  "4th Year": [7, 8],
};

export interface StudentExamProfile {
  studentId: string;
  rollNumber: string;
  name: string;
  avatarUrl: string;
  program: string;
  degree: string;
  branch: string;
  section: string;
  currentSemester: number;
  batch: string;
  academicYear: string;
  cgpa: number;
  sgpa: number;
  creditsEarned: number;
  totalRequiredCredits: number;
  activeBacklogs: number;
  rank: number;
  totalStudents: number;
  examCenter: string;
  examSession: string;
  advisorName: string;
  registrationDeadline: string;
}

export interface UpcomingExamItem {
  id: string;
  semester: number;
  subjectCode: string;
  subjectName: string;
  examDate: string;
  timeSlot: string;
  duration: string;
  hallNumber: string;
  seatNumber: string;
  credits: number;
  type: "Theory" | "Lab" | "Elective";
  status: "Scheduled" | "Completed" | "In Progress";
}

export interface InternalMarkItem {
  semester: number;
  subjectCode: string;
  subjectName: string;
  mid1: number;
  mid2: number;
  assignment: number;
  attendanceMark: number;
  totalInternal: number;
  maxInternal: number;
  status: "Published" | "Pending";
}

export interface SemesterResultItem {
  semester: number;
  academicYear: string;
  monthYear: string;
  creditsAttempted: number;
  creditsEarned: number;
  sgpa: number;
  cgpa: number;
  rank: number;
  resultStatus: "Pass" | "Fail";
  gradeCardUrl?: string;
  publishedDate?: string;
  downloadCount?: number;
  memoStatus?: "Declared" | "Verified" | "Revaluation Pending" | "Withheld";
  memoNumber?: string;
  category?: "Regular" | "Supplementary" | "Improvement" | "Revaluation";
  subjects: Array<{
    code: string;
    name: string;
    internal: number;
    external: number;
    total: number;
    grade: string;
    credits: number;
    status: "Pass" | "Fail";
  }>;
}

export interface AvailableCourseItem {
  id: string;
  semester: number;
  code: string;
  name: string;
  faculty: string;
  credits: number;
  category: "Core" | "Professional Elective" | "Open Elective" | "Lab" | "Project";
  availableSeats: number;
  totalSeats: number;
  timings: string;
  room: string;
  prerequisite: string;
  isRegistered: boolean;
  status: "Open" | "Full" | "Waitlist";
}

export interface RegistrationWorkflowStep {
  step: "Student" | "Advisor" | "HOD" | "Approved";
  actor: string;
  date?: string;
  status: "Completed" | "Pending" | "In Progress";
  comments?: string;
}

export interface ExamRegistrationItem {
  id: string;
  examType: "Regular" | "Supplementary" | "Improvement";
  subjectCode: string;
  subjectName: string;
  semester: number;
  credits: number;
  feeAmount: number;
  paymentStatus: "Paid" | "Pending" | "Overdue";
  registrationDeadline: string;
  lateFee: number;
  examCentrePreference: string;
  status: "Registered" | "Pending Payment" | "Approved";
  receiptNumber?: string;
}

export interface HallTicketRecordItem {
  id: string;
  semester: number;
  academicYear: string;
  examType: string;
  hallTicketNumber: string;
  generatedDate: string;
  examCenter: string;
  status: "Released" | "Downloaded" | "Pending" | "Withheld" | "Not Released" | "Verified & Issued";
  reportingTime?: string;
  instructions?: string[];
  subjects: UpcomingExamItem[];
}

export interface DownloadHistoryItem {
  id: string;
  title: string;
  type: "Memo" | "Hall Ticket";
  downloadedDate: string;
  fileSize: string;
  semester: number;
}

export interface RevaluationRequestItem {
  id: string;
  semester: number;
  subjectCode: string;
  subjectName: string;
  revaluationType: "Paper Revaluation" | "Recounting" | "Script Copy";
  reason: string;
  comments: string;
  status: "Submitted" | "Under Review" | "Updated" | "No Change";
  submittedDate: string;
  feeAmount: number;
}
