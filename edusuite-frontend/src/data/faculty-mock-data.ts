export interface TimetableSlot {
  time: string;
  subject: string;
  section: string;
  room: string;
  status: "Upcoming" | "Completed" | "Ongoing";
}

export interface FacultyStats {
  todaysClasses: number;
  totalStudents: number;
  pendingAssignments: number;
  attendancePending: string;
  upcomingExams: number;
  researchPublications: number;
}

export interface AttendanceData {
  present: number;
  absent: number;
  pending: number;
}

export interface AssignmentStatusData {
  pendingEvaluation: number;
  completed: number;
  overdue: number;
  submittedToday: number;
}

export interface Announcement {
  id: string;
  title: string;
  meta: string;
  category: "Academic" | "NBA" | "Hackathon" | "Workshop" | "Meeting";
}

export interface PerformanceSnapshot {
  averageAttendance: number;
  averageMarks: number;
  assignmentsSubmitted: number;
  studentsAtRisk: number;
  chartData: { name: string; attendance: number; marks: number; submissions: number }[];
}

export interface FacultyEvent {
  id: string;
  title: string;
  time: string;
  type: "Meeting" | "Duty" | "Workshop" | "Seminar" | "Conference";
  location: string;
}

export interface FacultyNotification {
  id: string;
  title: string;
  category: string;
  unread: boolean;
  time: string;
}

export interface PersonalInfo {
  fullName: string;
  gender: string;
  dob: string;
  bloodGroup: string;
  nationality: string;
  maritalStatus: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
}

export interface ProfessionalInfo {
  employeeId: string;
  department: string;
  designation: string;
  employmentType: string;
  joiningDate: string;
  reportingHod: string;
  experienceYears: number;
  qualification: string;
  specialization: string;
}

export interface AcademicInfo {
  assignedSubjects: string[];
  currentSemester: string;
  sections: string[];
  totalTeachingHours: number;
  mentorSections: string[];
  coursesHandled: string[];
}

export interface ResearchPublicationsInfo {
  journalPublications: number;
  conferencePapers: number;
  patents: number;
  books: number;
  researchProjects: number;
  workshopsConducted: number;
}

export interface DocumentItem {
  name: string;
  fileName: string;
  uploadedDate: string;
  size: string;
}

export interface SkillsInfo {
  technicalSkills: string[];
  programmingLanguages: string[];
  researchAreas: string[];
  certifications: string[];
  softwareTools: string[];
}

export interface ProfileStats {
  experience: string;
  subjectsHandled: number;
  studentsMentored: number;
  publications: number;
  projectsGuided: number;
  workshopsConducted: number;
}

export interface ActivityTimelineItem {
  id: string;
  title: string;
  time: string;
  type: string;
}

export interface ProfileCompletionInfo {
  percentage: number;
  missingFields: string[];
}

export interface FacultyProfileData {
  id: string;
  name: string;
  designation: string;
  department: string;
  employeeId: string;
  profilePhoto: string;
  role: string;
  employmentType: string;
  joiningDate: string;
  status: string;
  personalInfo: PersonalInfo;
  professionalInfo: ProfessionalInfo;
  academicInfo: AcademicInfo;
  researchPublications: ResearchPublicationsInfo;
  documents: DocumentItem[];
  skills: SkillsInfo;
  stats: ProfileStats;
  activityTimeline: ActivityTimelineItem[];
  profileCompletion: ProfileCompletionInfo;
}

// TIMETABLE STRUCTURES
export type WeeklySlotType = "Theory" | "Lab" | "Tutorial" | "Project" | "Seminar" | "Mentoring" | "Dept. Meeting";
export type SpecialSlotType = "Lunch" | "Free Period";

export interface WeeklySlot {
  id?: string;
  timetableId?: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
  timeSlot: string;
  startTime: string;
  endTime: string;
  subject: string;
  code: string;
  section: string;
  room: string;
  building: string;
  type: WeeklySlotType;
  role: string;
  isLab?: boolean;
  isCurrentDay?: boolean;
  isOngoing?: boolean;
}

export interface SpecialSlot {
  timeSlot: string;
  startTime: string;
  endTime: string;
  kind: SpecialSlotType;
}

export interface CalendarEvent {
  date: string;
  title: string;
  type: "Working" | "Holiday" | "Exam" | "Leave" | "Workshop" | "Event";
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
}

export interface SubjectSummaryItem {
  name: string;
  code: string;
  semester: string;
  credits: number;
  weeklyHours: number;
  sections: string[];
}

export interface TeachingLoad {
  weeklyClasses: number;
  theoryHours: number;
  labHours: number;
  totalHours: number;
  totalSubjects: number;
  totalSections: number;
}

export interface FreePeriod {
  day: string;
  timeSlot: string;
}

export interface ConflictItem {
  title: string;
  description: string;
  type: "Room" | "Overlap" | "Holiday";
}

export interface TimetableModuleData {
  weeklyGrid: WeeklySlot[];
  monthlyEvents: CalendarEvent[];
  upcomingClasses: UpcomingClassItem[];
  roomAllocations: RoomAllocation[];
  subjectSummary: SubjectSummaryItem[];
  textbookSummary?: any[];
  teachingLoad: TeachingLoad;
  freePeriods: FreePeriod[];
  conflicts: ConflictItem[];
}

// SUBJECT MODULE STRUCTURES
export interface UnitDetail {
  unitName: string;
  topicsCovered: string[];
  topicsRemaining: string[];
  status: "Completed" | "In-Progress" | "Pending";
}

export interface SyllabusProgressData {
  completedUnits: number;
  totalUnits: number;
  completionPercentage: number;
  units: UnitDetail[];
}

export interface CourseOutcome {
  co: string;
  description: string;
  mappingStatus: string;
}

export interface BookReference {
  title: string;
  author: string;
  edition: string;
  type: "Textbook" | "Reference" | "Resource" | "NPTEL";
}

export interface LabDetail {
  labName: string;
  labNumber: string;
  equipmentCount: number;
  weeklyLabHours: number;
  manualLink: string;
}

export interface SectionDetail {
  sectionName: string;
  studentsCount: number;
  classroom: string;
  advisor?: string;
}

export interface TimelineEvent {
  event: string;
  date: string;
  status: "Completed" | "Upcoming";
}

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  regulation: string;
  semester: string;
  credits: number;
  type: "Theory" | "Lab";
  weeklyHours: number;
  assignedSections: string[];
  studentsCount: number;
  status: "Active" | "Completed";
  syllabusProgress: SyllabusProgressData;
  courseOutcomes: CourseOutcome[];
  programOutcomes: string[];
  books: BookReference[];
  labDetails?: LabDetail;
  sectionsDetails: SectionDetail[];
  timeline: TimelineEvent[];
}

// LESSON PLAN MANAGEMENT STRUCTURES
export interface WeeklyPlanItem {
  weekNum: number;
  plannedTopics: string[];
  learningObjectives: string[];
  teachingMethod: string[];
  assessmentMethod: string;
  status: "Completed" | "Pending" | "Ongoing";
}

export interface MonthlyPlanItem {
  monthName: string;
  plannedUnits: string[];
  topics: string[];
  expectedCompletion: string;
  actualProgress: string;
}

export interface LearningOutcomeItem {
  co: string;
  unitOutcomes: string[];
  bloomsLevel: string;
}

export interface LessonResourceItem {
  title: string;
  type: "PPT" | "PDF Notes" | "Lab Manual" | "Video Lecture" | "NPTEL" | "Reference Book";
  link: string;
}

export interface LessonPlanItem {
  id: string;
  name: string;
  code: string;
  semester: string;
  academicYear: string;
  assignedSections: string[];
  totalUnits: number;
  completionPercentage: number;
  status: "Active" | "Completed" | "Pending";
  regulation: string;
  credits: number;
  weeklyHours: number;
  classroom: string;
  teachingMode: "Theory" | "Lab";
  units: UnitDetail[];
  weeklyPlan: WeeklyPlanItem[];
  monthlyPlan: MonthlyPlanItem[];
  learningOutcomes: LearningOutcomeItem[];
  resources: LessonResourceItem[];
  teachingMethods: string[];
  timeline: TimelineEvent[];
}

// ATTENDANCE MODULE STRUCTURES
export interface StudentAttendance {
  rollNumber: string;
  name: string;
  profilePhoto?: string;
  totalClasses: number;
  present: number;
  absent: number;
  percentage: number;
  status: "Safe" | "Warning" | "Critical";
}

export interface LeaveRequest {
  id: string;
  studentName: string;
  rollNumber: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  attachment: boolean;
  status: "Pending" | "Approved" | "Rejected";
}

export interface AttendanceHistoryItem {
  id: string;
  subject: string;
  section: string;
  date: string;
  period: string;
  submittedTime: string;
  totalStudents: number;
}

export interface AttendanceModuleData {
  stats: {
    conducted: number;
    pending: number;
    presentToday: number;
    absentToday: number;
    average: number;
    leavesPending: number;
  };
  students: StudentAttendance[];
  leaveRequests: LeaveRequest[];
  history: AttendanceHistoryItem[];
}

// STUDENT MANAGEMENT MODULE STRUCTURES
export interface StudentDetails {
  id: string;
  name: string;
  rollNumber: string;
  registrationNumber: string;
  gender: string;
  dob: string;
  email: string;
  mobile: string;
  parentName: string;
  parentMobile: string;
  status: "Active" | "Inactive";
  department: string;
  program: string;
  semester: string;
  section: string;
  batch: string;
  mentorName: string;
  isMentee: boolean;
  attendance: {
    totalClasses: number;
    present: number;
    absent: number;
    percentage: number;
  };
  performance: {
    internalMarks: number;
    assignmentScore: number;
    quizScore: number;
    labPerformance: number;
    overallGrade: string;
  };
  assignmentsList: {
    title: string;
    subject: string;
    dueDate: string;
    status: "Submitted" | "Pending" | "Overdue";
  }[];
  counsellingHistory: {
    date: string;
    issue: string;
    notes: string;
    improvementPlan: string;
  }[];
  documents: {
    name: string;
    fileName: string;
    size: string;
  }[];
  timeline: {
    event: string;
    date: string;
  }[];
}

// ASSIGNMENT MANAGEMENT MODULE STRUCTURES
export interface StudentSubmission {
  rollNumber: string;
  studentName: string;
  submissionTime: string;
  delayDuration?: string;
  status: "Submitted" | "Pending" | "Overdue" | "Late";
  fileIndicator: boolean;
  fileName?: string;
  marks?: number;
  feedback?: string;
  evaluationStatus: "Evaluated" | "Pending" | "Draft";
}

export interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  subject: string;
  code: string;
  section: string;
  semester: string;
  academicYear: string;
  dueDate: string;
  maxMarks: number;
  totalStudents: number;
  submittedCount: number;
  evaluationStatus: "Completed" | "Pending" | "In-Progress";
  status: "Active" | "Draft" | "Closed";
  submissions: StudentSubmission[];
  timeline: TimelineEvent[];
}

// STUDY MATERIALS STRUCTURES
export interface VersionItem {
  versionNum: string;
  updatedBy: string;
  updatedDate: string;
  changeSummary: string;
}

export interface StudyMaterialItem {
  id: string;
  title: string;
  description: string;
  subject: string;
  code: string;
  section: string;
  semester: string;
  academicYear: string;
  uploadDate: string;
  lastUpdated: string;
  downloadCount: number;
  studentViews?: number;
  visibilityStatus: "Visible" | "Faculty Only" | "Scheduled";
  fileType: "PDF" | "PPT" | "Video" | "DOC" | "ZIP";
  fileSize: string;
  unit: string;
  topic: string;
  keywords: string[];
  category: "Lecture Notes" | "PPT" | "Lab Manual" | "Question Bank" | "Previous Papers" | "Video Lecture" | "Reference Book" | "NPTEL" | "Research Paper" | "Assignment Resources";
  versions: VersionItem[];
  timeline: TimelineEvent[];
}

export interface FacultyDashboardData {
  facultyName: string;
  designation: string;
  employeeId: string;
  semester: string;
  academicYear: string;
  stats: FacultyStats;
  timetable: TimetableSlot[];
  attendance: AttendanceData;
  assignments: AssignmentStatusData;
  announcements: Announcement[];
  performance: PerformanceSnapshot;
  events: FacultyEvent[];
  notifications: FacultyNotification[];
  profileData: FacultyProfileData;
  timetableData: TimetableModuleData;
  subjectsList: SubjectItem[];
  lessonPlans: LessonPlanItem[];
  attendanceData: AttendanceModuleData;
  studentsDetailsList: StudentDetails[];
  assignmentsDetailsList: AssignmentItem[];
  studyMaterialsList: StudyMaterialItem[];
  assessmentsList: AssessmentModuleData;
  examsList: ExamModuleData;
  researchList: ResearchModuleData;
}

// ──────────────── RESEARCH MODULE INTERFACES ────────────────────────────────
export interface PublicationItem {
  id: string;
  title: string;
  authors: string;
  journalOrConference: string;
  publisher: string;
  year: number;
  doi?: string | undefined;
  issnOrIsbn?: string | undefined;
  indexing: "Scopus" | "SCI" | "SCIE" | "Google Scholar" | "Other";
  status: "Published" | "Accepted" | "Under Review";
  type: "Journal" | "Conference";
  documentUrl?: string | undefined;
}

export interface PatentItem {
  id: string;
  title: string;
  patentNumber: string;
  filingDate: string;
  publicationDate?: string | undefined;
  status: "Filed" | "Published" | "Granted";
  country: string;
}

export interface BookItem {
  id: string;
  title: string;
  publisher: string;
  isbn: string;
  edition: string;
  year: number;
}

export interface ResearchProjectItem {
  id: string;
  title: string;
  fundingAgency: string;
  budget: string;
  duration: string;
  teamMembers: string[];
  status: "Ongoing" | "Completed" | "Proposed";
  progress: number;
}

export interface GrantItem {
  id: string;
  grantName: string;
  agency: string;
  amount: string;
  approvalStatus: "Approved" | "Pending" | "Disbursed";
  startDate: string;
  endDate: string;
}

export interface ConferenceEventItem {
  id: string;
  eventName: string;
  organizer: string;
  location: string;
  date: string;
  role: "Presenter" | "Keynote Speaker" | "Session Chair" | "Attendee";
  certificateStatus: "Received" | "Pending";
}

export interface CertificationItem {
  id: string;
  name: string;
  provider: string;
  completionDate: string;
  expiryDate?: string | undefined;
  credentialId?: string | undefined;
}

export interface AwardItem {
  id: string;
  name: string;
  organization: string;
  date: string;
  description: string;
}

export interface ResearchStats {
  totalPublications: number;
  scopusIndexed: number;
  sciIndexed: number;
  conferences: number;
  patents: number;
  books: number;
  projects: number;
  researchGrants: number;
  citations: number;
  hIndex: number;
}

export interface ResearchDashboardSummary {
  publicationsThisYear: number;
  acceptedPapers: number;
  underReview: number;
  ongoingProjects: number;
  completedProjects: number;
  grantsReceived: number;
}

export interface ResearchAnalyticsInfo {
  publicationsByYear: { year: number; count: number }[];
  citationsTrend: { year: number; count: number }[];
  categoryDistribution: { name: string; count: number; color: string }[];
  researchAreas: { name: string; percentage: number }[];
  grantsByYear: { year: number; amount: number }[];
  projectStatusDistribution: { status: string; count: number; color: string }[];
}

export interface ResearchModuleData {
  stats: ResearchStats;
  dashboardSummary: ResearchDashboardSummary;
  publications: PublicationItem[];
  patents: PatentItem[];
  books: BookItem[];
  projects: ResearchProjectItem[];
  grants: GrantItem[];
  conferences: ConferenceEventItem[];
  certifications: CertificationItem[];
  awards: AwardItem[];
  analytics: ResearchAnalyticsInfo;
}

// ──────────────── EXAMS MODULE INTERFACES ──────────────────────────────────
export type ExamType = "Semester End" | "Mid Term 1" | "Mid Term 2" | "Practical" | "Supplementary";
export type ExamStatus = "Upcoming" | "Completed" | "Ongoing" | "Cancelled";
export type QuestionPaperStatus = "Draft" | "Submitted" | "Approved" | "Rejected";
export type InvigilationStatus = "Assigned" | "Completed" | "Pending";
export type MarksSubmissionStatus = "Pending" | "Draft" | "Submitted";

export interface ExamItem {
  id: string;
  name: string;
  subject: string;
  code: string;
  section: string;
  date: string;
  time: string;
  duration: string;
  venue: string;
  status: ExamStatus;
  type: ExamType;
  supervisor: string;
  maxMarks: number;
}

export interface InvigilationDuty {
  id: string;
  date: string;
  time: string;
  hall: string;
  building: string;
  floor: string;
  studentCount: number;
  examName: string;
  status: InvigilationStatus;
}

export interface QuestionPaper {
  id: string;
  subject: string;
  code: string;
  type: ExamType;
  status: QuestionPaperStatus;
  submittedDate?: string | undefined;
  approvedDate?: string | undefined;
  comments?: string | undefined;
}

export interface HallAllocation {
  id: string;
  hallNumber: string;
  roomCapacity: number;
  assignedStudentsCount: number;
  supervisor: string;
  examName: string;
}

export interface SeatingArrangementItem {
  id: string;
  rollNumber: string;
  studentName: string;
  seatNumber: string;
  hall: string;
  bench: string;
  row: number;
  column: number;
}

export interface ExamStudentMark {
  rollNumber: string;
  studentName: string;
  marksObtained?: number | undefined;
  maxMarks: number;
  grade?: string | undefined;
  remarks?: string | undefined;
  submissionStatus: MarksSubmissionStatus;
}

export interface EvaluationProgressInfo {
  totalScripts: number;
  evaluatedScripts: number;
  marksSubmitted: boolean;
}

export interface ExamAnalyticsInfo {
  passPercentage: number;
  failPercentage: number;
  averageMarks: number;
  highestMarks: number;
  lowestMarks: number;
  gradeDistribution: { grade: string; count: number; color: string }[];
  deptComparison: { dept: string; avg: number }[];
}

export interface ExamStats {
  totalExams: number;
  upcomingExams: number;
  completedExams: number;
  pendingEvaluations: number;
  invigilationDuties: number;
  marksPending: number;
}

export interface ExamModuleData {
  stats: ExamStats;
  exams: ExamItem[];
  invigilations: InvigilationDuty[];
  questionPapers: QuestionPaper[];
  hallAllocations: HallAllocation[];
  seatingArrangements: SeatingArrangementItem[];
  marksSubmissionList: Record<string, ExamStudentMark[]>;
  evaluationProgressList: Record<string, EvaluationProgressInfo>;
  analytics: ExamAnalyticsInfo;
}

// ──────────────── ASSESSMENT MODULE INTERFACES ──────────────────────────────────
export type AssessmentType =
  | "Internal 1"
  | "Internal 2"
  | "Quiz"
  | "Assignment"
  | "Lab Assessment"
  | "Viva"
  | "Seminar"
  | "Project Evaluation";

export type AssessmentStatus = "Draft" | "Published" | "Closed";
export type ApprovalStep = "Draft" | "Faculty Submitted" | "HOD Review" | "Academic Office" | "Published";

export interface StudentMark {
  rollNumber: string;
  studentName: string;
  marksObtained: number;
  maxMarks: number;
  grade: "O" | "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
  result: "Pass" | "Fail";
  remarks: string;
  evaluationStatus: "Evaluated" | "Pending";
}

export interface GradeDistItem {
  grade: string;
  count: number;
  percentage: number;
  color: string;
}

export interface PerformanceSummary {
  highest: number;
  lowest: number;
  average: number;
  median: number;
  passPercentage: number;
  failPercentage: number;
  topPerformers: string[];
  needsImprovement: string[];
}

export interface WorkflowStageItem {
  stage: ApprovalStep;
  status: "Completed" | "Active" | "Pending";
  completedAt?: string | undefined;
  actor?: string | undefined;
}

export interface AssessmentTimelineEvent {
  event: string;
  date: string;
  status: "Completed" | "Upcoming";
}

export interface AssessmentItem {
  id: string;
  name: string;
  type: AssessmentType;
  subject: string;
  code: string;
  section: string;
  semester: string;
  academicYear: string;
  maxMarks: number;
  date: string;
  duration: string;
  weightage: string;
  instructions: string;
  submissionMethod: string;
  status: AssessmentStatus;
  studentsAppeared: number;
  studentsEvaluated: number;
  marks: StudentMark[];
  gradeDistribution: GradeDistItem[];
  performance: PerformanceSummary;
  workflow: WorkflowStageItem[];
  timeline: AssessmentTimelineEvent[];
}

export interface AssessmentStats {
  total: number;
  published: number;
  draft: number;
  marksPending: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  studentsEvaluated: number;
}

export interface AssessmentModuleData {
  stats: AssessmentStats;
  assessments: AssessmentItem[];
}

export const DEPARTMENT_NAMES: Record<string, string> = {
  CSE: "Computer Science & Engineering",
  ECE: "Electronics & Communication Engineering",
  EEE: "Electrical & Electronics Engineering",
  ME: "Mechanical Engineering",
  Civil: "Civil Engineering",
  MBA: "Master of Business Administration",
};

export const TIME_SLOTS = [
  "08:45 - 09:45",
  "09:45 - 10:45",
  "10:45 - 11:45",
  "11:45 - 12:45",
  "12:45 - 13:30",  // Lunch
  "13:30 - 14:30",
  "14:30 - 15:30",
  "15:30 - 16:30",
];

export const LUNCH_SLOT = "12:45 - 13:30";

// Generates a realistic 6-day timetable from the dept's subject list
export function generateWeeklyGrid(subjects: SubjectItem[]): WeeklySlot[] {
  const days: WeeklySlot["day"][] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const teachingSlots = TIME_SLOTS.filter((s) => s !== LUNCH_SLOT);

  const slots: WeeklySlot[] = [];
  const occupied = new Set<string>();

  const parseTime = (slot: string): { startTime: string; endTime: string } => {
    const parts = slot.split(" - ");
    return { startTime: parts[0] ?? slot, endTime: parts[1] ?? slot };
  };

  const theorySubjects = subjects.filter((s) => s.type === "Theory");
  const labSubjects = subjects.filter((s) => s.type === "Lab");

  const canPlaceTeaching = (day: string, slotIdx: number): boolean => {
    const key = (sIdx: number) => `${day}|${TIME_SLOTS[sIdx]}`;
    if (occupied.has(key(slotIdx))) return false;

    // Strict Gap Check: if previous slot had a class, this slot must be free
    if (slotIdx > 0 && TIME_SLOTS[slotIdx - 1] !== LUNCH_SLOT) {
      const hasPrevClass = slots.some((s) => s.day === day && s.timeSlot === TIME_SLOTS[slotIdx - 1]);
      if (hasPrevClass) return false;
    }

    // Strict Gap Check: if next slot has a class, this slot must be free
    if (slotIdx < TIME_SLOTS.length - 1 && TIME_SLOTS[slotIdx + 1] !== LUNCH_SLOT) {
      const hasNextClass = slots.some((s) => s.day === day && s.timeSlot === TIME_SLOTS[slotIdx + 1]);
      if (hasNextClass) return false;
    }

    return true;
  };

  const placeSlot = (
    day: WeeklySlot["day"],
    timeSlot: string,
    subjectName: string,
    code: string,
    section: string,
    room: string,
    building: string,
    type: WeeklySlotType
  ) => {
    const { startTime, endTime } = parseTime(timeSlot);
    slots.push({
      day,
      timeSlot,
      startTime,
      endTime,
      subject: subjectName,
      code,
      section,
      room,
      building,
      type,
      role: type === "Lab" ? "Lab Instructor" : "Faculty",
      isLab: type === "Lab",
    });
    occupied.add(`${day}|${timeSlot}`);
  };

  // 1. SCHEDULE LABS (Occupies two consecutive slots, then followed by gap)
  labSubjects.forEach((lab, labIdx) => {
    const labDays: WeeklySlot["day"][] = ["Tuesday", "Thursday", "Friday"];
    const day = labDays[labIdx % labDays.length] || "Tuesday";

    const s1Idx = 5; // 13:30 - 14:30
    const s2Idx = 6; // 14:30 - 15:30
    const s1 = TIME_SLOTS[s1Idx];
    const s2 = TIME_SLOTS[s2Idx];

    if (s1 && s2 && !occupied.has(`${day}|${s1}`) && !occupied.has(`${day}|${s2}`)) {
      placeSlot(day, s1, `${lab.name} Lab`, lab.code, lab.assignedSections[0] || "A", lab.labDetails?.labName || "Lab 2", "Lab Block", "Lab");
      placeSlot(day, s2, `${lab.name} Lab`, lab.code, lab.assignedSections[0] || "A", lab.labDetails?.labName || "Lab 2", "Lab Block", "Lab");
    }
  });

  // 2. SCHEDULE THEORY
  theorySubjects.forEach((sub, subIdx) => {
    const targetDays: WeeklySlot["day"][] = [
      ["Monday", "Wednesday", "Friday"],
      ["Tuesday", "Thursday", "Saturday"],
    ][subIdx % 2] as WeeklySlot["day"][];

    targetDays.forEach((day) => {
      for (let slotIdx = 0; slotIdx < TIME_SLOTS.length; slotIdx++) {
        const timeSlot = TIME_SLOTS[slotIdx];
        if (!timeSlot || timeSlot === LUNCH_SLOT) continue;
        if (day === "Saturday" && slotIdx > 2) continue; // Saturday: max 2 periods in morning

        if (canPlaceTeaching(day, slotIdx)) {
          const classroom = sub.sectionsDetails[0]?.classroom ?? `Room ${sub.code.slice(-3)}`;
          placeSlot(day, timeSlot, sub.name, sub.code, sub.assignedSections[0] || "A", classroom, "Academic Block A", "Theory");
          break;
        }
      }
    });
  });

  // 3. SCHEDULE TUTORIALS (1 session per theory subject)
  theorySubjects.slice(0, 2).forEach((sub, subIdx) => {
    const day = ["Tuesday", "Thursday"][subIdx % 2] as WeeklySlot["day"];
    for (let slotIdx = 0; slotIdx < TIME_SLOTS.length; slotIdx++) {
      const timeSlot = TIME_SLOTS[slotIdx];
      if (!timeSlot || timeSlot === LUNCH_SLOT) continue;

      if (canPlaceTeaching(day, slotIdx)) {
        const classroom = sub.sectionsDetails[0]?.classroom ?? `Room ${sub.code.slice(-3)}`;
        placeSlot(day, timeSlot, `${sub.name} (Tutorial)`, sub.code, sub.assignedSections[0] || "A", classroom, "Academic Block A", "Tutorial");
        break;
      }
    }
  });

  // 4. SCHEDULE SPECIAL SLOTS
  // Mentoring: Friday period 7
  const mentoringDay = "Friday";
  const mentoringSlotIdx = 7;
  if (canPlaceTeaching(mentoringDay, mentoringSlotIdx)) {
    placeSlot(mentoringDay, TIME_SLOTS[mentoringSlotIdx]!, "Mentoring Hour", "MNTR", "Mentees", "Staff Room", "Faculty Block", "Mentoring");
  }

  // Project Guidance: Wednesday period 5
  const projectDay = "Wednesday";
  const projectSlotIdx = 5;
  if (canPlaceTeaching(projectDay, projectSlotIdx)) {
    placeSlot(projectDay, TIME_SLOTS[projectSlotIdx]!, "Project Guidance", "PRJ", "Batch-1", "Seminar Hall", "PG Block", "Project");
  }

  // Dept Meeting: Monday period 7
  const deptDay = "Monday";
  const deptSlotIdx = 7;
  if (canPlaceTeaching(deptDay, deptSlotIdx)) {
    placeSlot(deptDay, TIME_SLOTS[deptSlotIdx]!, "Dept. Team Meeting", "DEPT", "Faculty", "Conference Room", "Admin Block", "Dept. Meeting");
  }

  return slots;
}

// Helper to generate typical Syllabus Progress
const getSampleSyllabus = (subjectName: string): SyllabusProgressData => {
  return {
    completedUnits: 3,
    totalUnits: 5,
    completionPercentage: 65,
    units: [
      { unitName: "Unit I: Introduction & Core Concepts", topicsCovered: ["Fundamental Terminology", "Historical Context", "Elementary Architectures"], topicsRemaining: [], status: "Completed" },
      { unitName: "Unit II: Modeling & Representation", topicsCovered: ["Basic Structural Models", "Entity Mappings"], topicsRemaining: [], status: "Completed" },
      { unitName: "Unit III: Process Management & Execution", topicsCovered: ["Concurrency Models", "Locking Policies"], topicsRemaining: [], status: "Completed" },
      { unitName: "Unit IV: Optimization & Tuning", topicsCovered: ["Query Plans"], topicsRemaining: ["Indexing Tweaks", "Cache Optimization"], status: "In-Progress" },
      { unitName: "Unit V: Future Scopes & Advanced Paradigms", topicsCovered: [], topicsRemaining: ["Parallel Pipelines", "Distributed Deployments"], status: "Pending" },
    ],
  };
};

// Helper to generate Course Outcomes
const getSampleCOs = (subjectName: string): CourseOutcome[] => {
  return [
    { co: "CO1", description: `Understand fundamental foundations of ${subjectName}.`, mappingStatus: "High" },
    { co: "CO2", description: `Model structural behaviors and representations for ${subjectName}.`, mappingStatus: "Medium" },
    { co: "CO3", description: `Design execution workflows based on ${subjectName} guidelines.`, mappingStatus: "High" },
    { co: "CO4", description: `Apply optimization policies and evaluate efficiency outcomes.`, mappingStatus: "Medium" },
    { co: "CO5", description: `Incorporate future advancements and parallel pipeline models.`, mappingStatus: "Low" },
  ];
};

// Helper to generate Book References
const getSampleBooks = (subjectName: string): BookReference[] => {
  return [
    { title: `Introduction to ${subjectName}`, author: "Dr. A. R. Varma", edition: "3rd Edition", type: "Textbook" },
    { title: `Advanced Foundations of ${subjectName}`, author: "Galvin & Silberschatz", edition: "9th Edition", type: "Reference" },
    { title: `${subjectName} Video Lectures`, author: "NPTEL Online Course Coordinator", edition: "July 2026 Course", type: "NPTEL" },
  ];
};

// Helper to generate timeline
const getSampleTimeline = (): TimelineEvent[] => {
  return [
    { event: "Subject Assigned by HOD", date: "June 15, 2026", status: "Completed" },
    { event: "First Introductory Class Conducted", date: "July 01, 2026", status: "Completed" },
    { event: "Mid-Term Test I Completed", date: "July 25, 2026", status: "Completed" },
    { event: "Assignment #4 Evaluation Marks Updated", date: "Today", status: "Completed" },
    { event: "Mid-Term Test II Schedule", date: "August 18, 2026", status: "Upcoming" },
    { event: "Internal Marks Submission Deadline", date: "August 28, 2026", status: "Upcoming" },
  ];
};

// HELPER TO GENERATE DYNAMIC LESSON PLANS FOR A SUBJECT
const generateLessonPlanForSubject = (sub: SubjectItem): LessonPlanItem => {
  const isLab = sub.type === "Lab";
  return {
    id: `lp-${sub.id}`,
    name: sub.name,
    code: sub.code,
    semester: sub.semester,
    academicYear: "2026-27",
    assignedSections: sub.assignedSections,
    totalUnits: sub.syllabusProgress.totalUnits,
    completionPercentage: sub.syllabusProgress.completionPercentage,
    status: isLab ? "Completed" : sub.status,
    regulation: sub.regulation,
    credits: sub.credits,
    weeklyHours: sub.weeklyHours,
    classroom: sub.sectionsDetails[0]?.classroom || "Room A-302",
    teachingMode: sub.type,
    units: sub.syllabusProgress.units,
    weeklyPlan: [
      { weekNum: 1, plannedTopics: ["Introduction & Fundamentals", "Course Outline & Outcomes Mapping"], learningObjectives: ["Understand fundamental setups", "List learning thresholds"], teachingMethod: ["Lecture", "Demonstration"], assessmentMethod: "Quiz", status: "Completed" },
      { weekNum: 2, plannedTopics: ["Core Modeling Structures", "Visual Representation Frameworks"], learningObjectives: ["Formulate diagrams", "Illustrate execution maps"], teachingMethod: ["Lecture"], assessmentMethod: "Assignment #1", status: "Completed" },
      { weekNum: 3, plannedTopics: ["Process Execution Models", "Locking Policies & Controls"], learningObjectives: ["Create concurrency setups", "Define concurrency constraints"], teachingMethod: isLab ? ["Practical"] : ["Lecture", "Case Study"], assessmentMethod: isLab ? "Experiment Output" : "Class Test", status: "Completed" },
      { weekNum: 4, plannedTopics: ["Query Optimization Pipelines", "Indexing Strategies"], learningObjectives: ["Identify bottlenecks", "Write query tuning scripts"], teachingMethod: ["Practical", "Group Discussion"], assessmentMethod: "Quiz #2", status: "Ongoing" },
      { weekNum: 5, plannedTopics: ["Future Advanced Paradigms", "Distributed Deployments"], learningObjectives: ["Compare distributed setups", "Plan deployment grids"], teachingMethod: ["Project Based Learning"], assessmentMethod: "Mini Project Viva", status: "Pending" },
    ],
    monthlyPlan: [
      { monthName: "July", plannedUnits: ["Unit I", "Unit II"], topics: ["Terminologies", "Modeling Frameworks"], expectedCompletion: "July 25", actualProgress: "Completed on July 24" },
      { monthName: "August", plannedUnits: ["Unit III", "Unit IV"], topics: ["Process Controls", "Optimization Tunings"], expectedCompletion: "August 20", actualProgress: "Ongoing" },
      { monthName: "September", plannedUnits: ["Unit V"], topics: ["Advanced Deployments"], expectedCompletion: "September 15", actualProgress: "Pending" },
    ],
    learningOutcomes: [
      { co: "CO1", unitOutcomes: ["Define fundamental models of study", "Recall architecture configurations"], bloomsLevel: "Remember / Understand" },
      { co: "CO2", unitOutcomes: ["Construct structural representations", "Evaluate locking constraints"], bloomsLevel: "Analyze / Create" },
      { co: "CO3", unitOutcomes: ["Apply optimizations", "Troubleshoot bottlenecks"], bloomsLevel: "Apply / Evaluate" },
    ],
    resources: [
      { title: `${sub.name} Syllabus PPT Slides`, type: "PPT", link: `slides_${sub.code}.ppt` },
      { title: `Unit I & II Study Notes PDF`, type: "PDF Notes", link: `notes_${sub.code}_u1.pdf` },
      { title: `NPTEL Core Video Series`, type: "NPTEL", link: "nptel.org/courses/study" },
    ],
    teachingMethods: isLab ? ["Practical", "Demonstration", "Project Based Learning"] : ["Lecture", "Case Study", "Group Discussion"],
    timeline: [
      { event: "Lesson Plan Drafted & Approved by HOD", date: "June 22, 2026", status: "Completed" },
      { event: "Unit I & II Syllabus Completed", date: "July 24, 2026", status: "Completed" },
      { event: "Mid-Term Examination Syllabus Check", date: "July 25, 2026", status: "Completed" },
      { event: "Expected Syllabus Completion", date: "September 15, 2026", status: "Upcoming" },
    ],
  };
};

// HELPER TO GENERATE DYNAMIC ATTENDANCE LISTS FOR A BRANCH
const generateAttendanceData = (branchName: string): AttendanceModuleData => {
  return {
    stats: {
      conducted: 48,
      pending: 2,
      presentToday: 62,
      absentToday: 4,
      average: 89,
      leavesPending: 3,
    },
    students: [
      { rollNumber: `24${branchName}001`, name: "Aarav Sharma", totalClasses: 48, present: 45, absent: 3, percentage: 93, status: "Safe" },
      { rollNumber: `24${branchName}002`, name: "Bhavna Patel", totalClasses: 48, present: 46, absent: 2, percentage: 95, status: "Safe" },
      { rollNumber: `24${branchName}003`, name: "Chaitanya Rao", totalClasses: 48, present: 32, absent: 16, percentage: 66, status: "Critical" },
      { rollNumber: `24${branchName}004`, name: "Divya Teja", totalClasses: 48, present: 35, absent: 13, percentage: 72, status: "Warning" },
      { rollNumber: `24${branchName}005`, name: "Eshwar Reddy", totalClasses: 48, present: 43, absent: 5, percentage: 89, status: "Safe" },
      { rollNumber: `24${branchName}006`, name: "Farooq Ali", totalClasses: 48, present: 44, absent: 4, percentage: 91, status: "Safe" },
    ],
    leaveRequests: [
      { id: "lv-1", studentName: "Chaitanya Rao", rollNumber: `24${branchName}003`, leaveType: "Medical Leave", fromDate: "2026-08-01", toDate: "2026-08-03", reason: "Severe viral fever, doctor advised bed rest.", attachment: true, status: "Pending" },
      { id: "lv-2", studentName: "Divya Teja", rollNumber: `24${branchName}004`, leaveType: "On Duty (OD)", fromDate: "2026-08-05", toDate: "2026-08-05", reason: "Representing college in regional chess tournament.", attachment: false, status: "Pending" },
    ],
    history: [
      { id: "h1", subject: "Theory Lecture", section: `${branchName}-A`, date: "2026-08-01", period: "1st Period", submittedTime: "Today, 09:55 AM", totalStudents: 66 },
      { id: "h2", subject: "Laboratory Practice", section: `${branchName}-A`, date: "2026-07-31", period: "3rd Period", submittedTime: "Yesterday, 12:05 PM", totalStudents: 66 },
    ],
  };
};

// HELPER TO GENERATE DETAILED STUDENT DETAILS FOR A BRANCH
const generateDetailedStudents = (branchCode: string, facultyName: string): StudentDetails[] => {
  const deptName = DEPARTMENT_NAMES[branchCode] || "Computer Science & Engineering";
  
  const rawList = [
    { name: "Aarav Sharma", email: "aarav@gmail.com", parent: "Mohan Sharma", pct: 93, gpa: 82, grade: "A" },
    { name: "Bhavna Patel", email: "bhavna@gmail.com", parent: "K. Patel", pct: 95, gpa: 88, grade: "A+" },
    { name: "Chaitanya Rao", email: "chaitanya@gmail.com", parent: "R. Rao", pct: 66, gpa: 58, grade: "D" },
    { name: "Divya Teja", email: "divya@gmail.com", parent: "V. Teja", pct: 72, gpa: 64, grade: "C" },
    { name: "Eshwar Reddy", email: "eshwar@gmail.com", parent: "M. Reddy", pct: 89, gpa: 76, grade: "B" },
    { name: "Farooq Ali", email: "farooq@gmail.com", parent: "A. Ali", pct: 91, gpa: 79, grade: "B+" },
  ];

  return rawList.map((stud, idx) => {
    const roll = `24${branchCode}00${idx + 1}`;
    const isMentee = idx < 2;

    return {
      id: `std-${roll}`,
      name: stud.name,
      rollNumber: roll,
      registrationNumber: `REG2026${branchCode}${100 + idx}`,
      gender: idx % 2 === 0 ? "Male" : "Female",
      dob: `2005-08-${10 + idx}`,
      email: stud.email,
      mobile: `+91 90000 1000${idx}`,
      parentName: stud.parent,
      parentMobile: `+91 99999 2000${idx}`,
      status: "Active" as const,
      department: deptName,
      program: "B.Tech",
      semester: "5",
      section: `${branchCode}-A`,
      batch: "2024-2028",
      mentorName: isMentee ? facultyName : "Dr. G. K. Reddy",
      isMentee,
      attendance: {
        totalClasses: 48,
        present: Math.round(48 * (stud.pct / 100)),
        absent: 48 - Math.round(48 * (stud.pct / 100)),
        percentage: stud.pct,
      },
      performance: {
        internalMarks: stud.gpa,
        assignmentScore: Math.round(stud.gpa * 0.95),
        quizScore: Math.round(stud.gpa * 0.95),
        labPerformance: Math.round(stud.gpa * 0.98),
        overallGrade: stud.grade,
      },
      assignmentsList: [
        { title: "Syllabus Review Midterm #1", subject: "Theory", dueDate: "2026-08-01", status: "Submitted" as const },
        { title: "Design Patterns Execution Diagram", subject: "Syllabus", dueDate: "2026-08-10", status: "Pending" as const },
        { title: "Laboratory Asset Mapping Setup", subject: "Lab", dueDate: "2026-07-28", status: "Overdue" as const },
      ],
      counsellingHistory: isMentee ? [
        { date: "2026-07-15", issue: "Shortage of reference textbooks", notes: "Guided to digital library repository credentials.", improvementPlan: "Verify textbook downloads next week." },
        { date: "2026-07-22", issue: "Career confusion", notes: "Explained scope of cloud certifications.", improvementPlan: "Enroll in AWS Free Tier courses." },
      ] : [],
      documents: [
        { name: "Bonafide Letter", fileName: "bonafide_letter.pdf", size: "124 KB" },
        { name: "Official College ID Card Copy", fileName: "student_id_card.pdf", size: "85 KB" },
      ],
      timeline: [
        { event: "Midterm Internal marks updated", date: "Today, 10:15 AM" },
        { event: "Counselling session completed", date: "Yesterday, 04:00 PM" },
        { event: "Weekly attendance list synced", date: "July 28, 2026" },
      ],
    };
  });
};

// HELPER TO GENERATE MOCK ASSIGNMENTS MAPPING SPECIFIC ASSIGNED SUBJECTS FOR A BRANCH
const generateAssignmentsData = (branchCode: string): AssignmentItem[] => {
  return [
    {
      id: `asg-${branchCode}-101`,
      title: "Write-up on System Kernels & Concurrency Controls",
      description: "Submit a detailed layout mapping multithreaded systems execution bottlenecks alongside mutex locks.",
      subject: branchCode === "MBA" ? "Organizational Behavior" : "Operating Systems",
      code: branchCode === "MBA" ? "MB101" : "CS301",
      section: `${branchCode}-A`,
      semester: "5",
      academicYear: "2026-27",
      dueDate: "2026-08-10",
      maxMarks: 100,
      totalStudents: 66,
      submittedCount: 44,
      evaluationStatus: "In-Progress",
      status: "Active",
      submissions: [
        { rollNumber: `24${branchCode}001`, studentName: "Aarav Sharma", submissionTime: "Yesterday, 02:40 PM", status: "Submitted", fileIndicator: true, fileName: "aarav_kernel_control.zip", marks: 92, feedback: "Outstanding analysis of process threads.", evaluationStatus: "Evaluated" },
        { rollNumber: `24${branchCode}002`, studentName: "Bhavna Patel", submissionTime: "Today, 08:15 AM", status: "Submitted", fileIndicator: true, fileName: "bhavna_concurrency.pdf", evaluationStatus: "Pending" },
        { rollNumber: `24${branchCode}003`, studentName: "Chaitanya Rao", submissionTime: "", status: "Overdue", fileIndicator: false, evaluationStatus: "Pending" },
        { rollNumber: `24${branchCode}004`, studentName: "Divya Teja", submissionTime: "Today, 10:30 AM", delayDuration: "2 hours late", status: "Late", fileIndicator: true, fileName: "divya_late_control.pdf", evaluationStatus: "Draft" },
      ],
      timeline: [
        { event: "Assignment Sheet Created & Published", date: "June 25, 2026", status: "Completed" },
        { event: "First Student Submission Logged", date: "July 01, 2026", status: "Completed" },
        { event: "Grading Ratios Evaluation Started", date: "Today", status: "Completed" },
      ],
    },
    {
      id: `asg-${branchCode}-102`,
      title: "ER Diagram modeling and Schema Normalization Case study",
      description: "Draw complete database entity layouts mapping third normal form transitions.",
      subject: branchCode === "MBA" ? "Marketing Management" : "Database Management Systems",
      code: branchCode === "MBA" ? "MB102" : "CS302",
      section: `${branchCode}-B`,
      semester: "5",
      academicYear: "2026-27",
      dueDate: "2026-08-15",
      maxMarks: 100,
      totalStudents: 70,
      submittedCount: 65,
      evaluationStatus: "Completed",
      status: "Closed",
      submissions: [
        { rollNumber: `24${branchCode}001`, studentName: "Aarav Sharma", submissionTime: "Yesterday, 04:55 PM", status: "Submitted", fileIndicator: true, fileName: "aarav_database_er.pdf", marks: 88, feedback: "Good normalization schema designs.", evaluationStatus: "Evaluated" },
      ],
      timeline: [
        { event: "Assignment Created", date: "June 20, 2026", status: "Completed" },
        { event: "Submissions Closed", date: "July 15, 2026", status: "Completed" },
      ],
    },
  ];
};

// HELPER TO GENERATE STUDY MATERIALS MOCK DATA DYNAMICALLY FOR A DEPT
const generateStudyMaterialsData = (branchCode: string): StudyMaterialItem[] => {
  return [
    {
      id: `mat-${branchCode}-301`,
      title: "Syllabus lecture notes on CPU scheduling",
      description: "Complete slide outline referencing Round Robin, FCFS and SJF scheduling behaviors.",
      subject: branchCode === "MBA" ? "Organizational Behavior" : "Operating Systems",
      code: branchCode === "MBA" ? "MB101" : "CS301",
      section: `${branchCode}-A`,
      semester: "5",
      academicYear: "2026-27",
      uploadDate: "2026-07-10",
      lastUpdated: "2026-07-28",
      downloadCount: 142,
      visibilityStatus: "Visible",
      fileType: "PDF",
      fileSize: "2.4 MB",
      unit: "Unit I",
      topic: "CPU Scheduling Algorithms",
      keywords: ["Scheduling", "FCFS", "Round Robin"],
      category: "Lecture Notes",
      versions: [
        { versionNum: "v1.1", updatedBy: "System sync", updatedDate: "2026-07-28", changeSummary: "Fixed formatting of Gantt charts" },
        { versionNum: "v1.0", updatedBy: "System sync", updatedDate: "2026-07-10", changeSummary: "Initial draft release" },
      ],
      timeline: [
        { event: "Material Draft Created", date: "2026-07-10", status: "Completed" },
        { event: "File Approved by HOD", date: "2026-07-12", status: "Completed" },
        { event: "File Made Visible to Students", date: "2026-07-15", status: "Completed" },
      ],
    },
    {
      id: `mat-${branchCode}-302`,
      title: "Relational Algebra & Normalization Rules cheatsheet",
      description: "PDF outline sheet covering join operations, projection, selection and Normal Form layouts.",
      subject: branchCode === "MBA" ? "Marketing Management" : "Database Management Systems",
      code: branchCode === "MBA" ? "MB102" : "CS302",
      section: `${branchCode}-B`,
      semester: "5",
      academicYear: "2026-27",
      uploadDate: "2026-07-18",
      lastUpdated: "2026-07-18",
      downloadCount: 98,
      visibilityStatus: "Visible",
      fileType: "PPT",
      fileSize: "4.8 MB",
      unit: "Unit II",
      topic: "Relational Algebra",
      keywords: ["Relational Algebra", "Normalization", "Database"],
      category: "PPT",
      versions: [
        { versionNum: "v1.0", updatedBy: "System sync", updatedDate: "2026-07-18", changeSummary: "Initial slides copy" },
      ],
      timeline: [
        { event: "Material Uploaded", date: "2026-07-18", status: "Completed" },
      ],
    },
  ];
};

// HELPER TO GENERATE ASSESSMENT MODULE DATA DYNAMICALLY FOR A BRANCH
const generateAssessmentModuleData = (branchCode: string, subjects: SubjectItem[]): AssessmentModuleData => {
  const theorySubjects = subjects.filter((s) => s.type === "Theory");
  const labSubjects = subjects.filter((s) => s.type === "Lab");

  const studentBase = [
    { roll: `24${branchCode}001`, name: "Aarav Sharma",  grade: "A+" as const, result: "Pass" as const },
    { roll: `24${branchCode}002`, name: "Bhavna Patel",  grade: "A"  as const, result: "Pass" as const },
    { roll: `24${branchCode}003`, name: "Chaitanya Rao", grade: "C"  as const, result: "Pass" as const },
    { roll: `24${branchCode}004`, name: "Divya Teja",    grade: "D"  as const, result: "Pass" as const },
    { roll: `24${branchCode}005`, name: "Eshwar Reddy",  grade: "B+" as const, result: "Pass" as const },
    { roll: `24${branchCode}006`, name: "Farooq Ali",    grade: "F"  as const, result: "Fail" as const },
  ];

  const rawPctArr = [88, 76, 52, 38, 72, 25];

  const makeMarks = (maxMark: number): StudentMark[] =>
    studentBase.map((s, idx) => {
      const raw = rawPctArr[idx] ?? 70;
      const obtained = Math.min(Math.round((raw / 100) * maxMark), maxMark);
      return {
        rollNumber: s.roll,
        studentName: s.name,
        marksObtained: obtained,
        maxMarks: maxMark,
        grade: s.grade,
        result: s.result,
        remarks: s.result === "Pass" ? "Good performance" : "Needs Improvement",
        evaluationStatus: (idx < 4 ? "Evaluated" : "Pending") as "Evaluated" | "Pending",
      };
    });

  const makeGradeDist = (marks: StudentMark[]): GradeDistItem[] => {
    const gradeColors: Record<string, string> = { "O": "#22c55e", "A+": "#3b82f6", "A": "#6366f1", "B+": "#a855f7", "B": "#f59e0b", "C": "#f97316", "D": "#ef4444", "F": "#dc2626" };
    const grades = ["O", "A+", "A", "B+", "B", "C", "D", "F"] as const;
    return grades
      .map((g) => {
        const count = marks.filter((m) => m.grade === g).length;
        return { grade: g, count, percentage: Math.round((count / marks.length) * 100), color: gradeColors[g] ?? "#888" };
      })
      .filter((g) => g.count > 0);
  };

  const makePerf = (marks: StudentMark[]): PerformanceSummary => {
    const nums = marks.map((m) => m.marksObtained).sort((a, b) => a - b);
    const mid = Math.floor(nums.length / 2);
    return {
      highest: nums[nums.length - 1] ?? 0,
      lowest: nums[0] ?? 0,
      average: Math.round(nums.reduce((a, b) => a + b, 0) / (nums.length || 1)),
      median: nums.length % 2 === 0 ? Math.round(((nums[mid - 1] ?? 0) + (nums[mid] ?? 0)) / 2) : (nums[mid] ?? 0),
      passPercentage: Math.round((marks.filter((m) => m.result === "Pass").length / marks.length) * 100),
      failPercentage: Math.round((marks.filter((m) => m.result === "Fail").length / marks.length) * 100),
      topPerformers: marks.filter((m) => m.grade === "A+" || m.grade === "O").map((m) => m.studentName),
      needsImprovement: marks.filter((m) => m.grade === "D" || m.grade === "F").map((m) => m.studentName),
    };
  };

  const makeWorkflow = (activeStage: ApprovalStep): WorkflowStageItem[] => {
    const stages: ApprovalStep[] = ["Draft", "Faculty Submitted", "HOD Review", "Academic Office", "Published"];
    const idx = stages.indexOf(activeStage);
    return stages.map((s, i) => ({
      stage: s,
      status: (i < idx ? "Completed" : i === idx ? "Active" : "Pending") as "Completed" | "Active" | "Pending",
      completedAt: i < idx ? "July 2026" : undefined,
      actor: i < idx ? (i <= 1 ? "Faculty" : i === 2 ? "HOD" : "Academic Office") : undefined,
    }));
  };

  const baseTimeline: AssessmentTimelineEvent[] = [
    { event: "Assessment Created", date: "June 15, 2026", status: "Completed" },
    { event: "Assessment Published", date: "June 18, 2026", status: "Completed" },
    { event: "Students Appeared", date: "July 01, 2026", status: "Completed" },
    { event: "Marks Entry Started", date: "July 10, 2026", status: "Completed" },
    { event: "Marks Submitted to HOD", date: "July 20, 2026", status: "Completed" },
    { event: "Results Published", date: "August 05, 2026", status: "Upcoming" },
  ];

  const firstSub = theorySubjects[0] ?? subjects[0];
  const secondSub = theorySubjects[1] ?? theorySubjects[0] ?? subjects[0];
  const labSub = labSubjects[0];
  const assessments: AssessmentItem[] = [];

  if (firstSub) {
    const int1Marks = makeMarks(100);
    assessments.push({ id: `asmnt-${branchCode}-int1`, name: `${firstSub.name} â€” Internal I`, type: "Internal 1", subject: firstSub.name, code: firstSub.code, section: firstSub.assignedSections[0] ?? `${branchCode}-A`, semester: firstSub.semester, academicYear: "2026-27", maxMarks: 100, date: "July 01, 2026", duration: "2 Hours", weightage: "25%", instructions: "Answer all questions. Closed book.", submissionMethod: "Written Booklet", status: "Published", studentsAppeared: 62, studentsEvaluated: 56, marks: int1Marks, gradeDistribution: makeGradeDist(int1Marks), performance: makePerf(int1Marks), workflow: makeWorkflow("Faculty Submitted"), timeline: baseTimeline });

    const int2Marks = makeMarks(100);
    assessments.push({ id: `asmnt-${branchCode}-int2`, name: `${firstSub.name} â€” Internal II`, type: "Internal 2", subject: firstSub.name, code: firstSub.code, section: firstSub.assignedSections[0] ?? `${branchCode}-A`, semester: firstSub.semester, academicYear: "2026-27", maxMarks: 100, date: "August 01, 2026", duration: "2 Hours", weightage: "25%", instructions: "All questions compulsory. Neat presentation.", submissionMethod: "Written Booklet", status: "Published", studentsAppeared: 64, studentsEvaluated: 64, marks: int2Marks, gradeDistribution: makeGradeDist(int2Marks), performance: makePerf(int2Marks), workflow: makeWorkflow("Published"), timeline: baseTimeline });

    const vivaMarks = makeMarks(20);
    assessments.push({ id: `asmnt-${branchCode}-viva`, name: `Semester Viva â€” ${firstSub.name}`, type: "Viva", subject: firstSub.name, code: firstSub.code, section: firstSub.assignedSections[0] ?? `${branchCode}-A`, semester: firstSub.semester, academicYear: "2026-27", maxMarks: 20, date: "August 15, 2026", duration: "20 Min/student", weightage: "10%", instructions: "Oral exam. Bring lab record.", submissionMethod: "Face-to-Face", status: "Draft", studentsAppeared: 0, studentsEvaluated: 0, marks: vivaMarks, gradeDistribution: makeGradeDist(vivaMarks), performance: makePerf(vivaMarks), workflow: makeWorkflow("Draft"), timeline: baseTimeline });
  }

  if (secondSub) {
    const quizMarks = makeMarks(20);
    assessments.push({ id: `asmnt-${branchCode}-quiz1`, name: `${secondSub.name} â€” Unit I Quiz`, type: "Quiz", subject: secondSub.name, code: secondSub.code, section: secondSub.assignedSections[0] ?? `${branchCode}-B`, semester: secondSub.semester, academicYear: "2026-27", maxMarks: 20, date: "July 15, 2026", duration: "30 Minutes", weightage: "5%", instructions: "MCQ format. No negative marking.", submissionMethod: "Online Portal", status: "Closed", studentsAppeared: 68, studentsEvaluated: 68, marks: quizMarks, gradeDistribution: makeGradeDist(quizMarks), performance: makePerf(quizMarks), workflow: makeWorkflow("Published"), timeline: baseTimeline });
  }

  if (labSub) {
    const labMarks = makeMarks(50);
    assessments.push({ id: `asmnt-${branchCode}-lab1`, name: `${labSub.name} â€” Cycle Test I`, type: "Lab Assessment", subject: labSub.name, code: labSub.code, section: labSub.assignedSections[0] ?? `${branchCode}-A`, semester: labSub.semester, academicYear: "2026-27", maxMarks: 50, date: "July 20, 2026", duration: "3 Hours", weightage: "15%", instructions: "Practical exam. Write output and analysis.", submissionMethod: "Lab Record + Viva", status: "Draft", studentsAppeared: 60, studentsEvaluated: 45, marks: labMarks, gradeDistribution: makeGradeDist(labMarks), performance: makePerf(labMarks), workflow: makeWorkflow("Draft"), timeline: baseTimeline });
  }

  const avgScores = assessments.map((a) => a.performance.average);
  return {
    stats: {
      total: assessments.length,
      published: assessments.filter((a) => a.status === "Published").length,
      draft: assessments.filter((a) => a.status === "Draft").length,
      marksPending: assessments.reduce((s, a) => s + (a.studentsAppeared - a.studentsEvaluated), 0),
      averageScore: avgScores.length ? Math.round(avgScores.reduce((a, b) => a + b, 0) / avgScores.length) : 0,
      highestScore: assessments.length ? Math.max(...assessments.map((a) => a.performance.highest)) : 0,
      lowestScore: assessments.length ? Math.min(...assessments.map((a) => a.performance.lowest)) : 0,
      studentsEvaluated: assessments.reduce((s, a) => s + a.studentsEvaluated, 0),
    },
    assessments,
  };
};

// HELPER TO GENERATE EXAMINATION MANAGEMENT MODULE DATA DYNAMICALLY FOR A BRANCH
export const generateExamModuleData = (branchCode: string, subjects: SubjectItem[]): ExamModuleData => {
  const theorySubjects = subjects.filter((s) => s.type === "Theory");
  const labSubjects = subjects.filter((s) => s.type === "Lab");

  const studentBase = [
    { roll: `24${branchCode}001`, name: "Aarav Sharma",  grade: "A+" },
    { roll: `24${branchCode}002`, name: "Bhavna Patel",  grade: "A"  },
    { roll: `24${branchCode}003`, name: "Chaitanya Rao", grade: "C"  },
    { roll: `24${branchCode}004`, name: "Divya Teja",    grade: "D"  },
    { roll: `24${branchCode}005`, name: "Eshwar Reddy",  grade: "B+" },
    { roll: `24${branchCode}006`, name: "Farooq Ali",    grade: "F"  },
  ];

  const rawPctArr = [88, 76, 52, 38, 72, 25];

  const firstSub = theorySubjects[0] ?? subjects[0];
  const secondSub = theorySubjects[1] ?? theorySubjects[0] ?? subjects[0];
  const labSub = labSubjects[0] ?? subjects[0];

  const exams: ExamItem[] = [];
  const invigilations: InvigilationDuty[] = [];
  const questionPapers: QuestionPaper[] = [];
  const hallAllocations: HallAllocation[] = [];
  const seatingArrangements: SeatingArrangementItem[] = [];
  const marksSubmissionList: Record<string, ExamStudentMark[]> = {};
  const evaluationProgressList: Record<string, EvaluationProgressInfo> = {};

  if (firstSub) {
    // Upcoming exam
    exams.push({
      id: `exam-${branchCode}-endsem`,
      name: `${firstSub.name} — Semester End Exam`,
      subject: firstSub.name,
      code: firstSub.code,
      section: firstSub.assignedSections[0] ?? `${branchCode}-A`,
      date: "November 10, 2026",
      time: "09:30 AM - 12:30 PM",
      duration: "3 Hours",
      venue: "Hall 302 (Block C)",
      status: "Upcoming",
      type: "Semester End",
      supervisor: "Self",
      maxMarks: 100
    });

    invigilations.push({
      id: `inv-${branchCode}-1`,
      date: "November 10, 2026",
      time: "09:30 AM - 12:30 PM",
      hall: "Hall 302",
      building: "Science Block",
      floor: "3rd Floor",
      studentCount: 30,
      examName: `${firstSub.name} — End Sem`,
      status: "Assigned"
    });

    questionPapers.push({
      id: `qp-${branchCode}-1`,
      subject: firstSub.name,
      code: firstSub.code,
      type: "Semester End",
      status: "Approved",
      submittedDate: "2026-10-15",
      approvedDate: "2026-10-20",
      comments: "Syllabus covered. Question weightage looks good."
    });

    hallAllocations.push({
      id: `hall-${branchCode}-1`,
      hallNumber: "Hall 302",
      roomCapacity: 40,
      assignedStudentsCount: 30,
      supervisor: "Dr. Rahul Kumar",
      examName: `${firstSub.name} — Semester End`
    });

    studentBase.forEach((s, idx) => {
      seatingArrangements.push({
        id: `seat-${branchCode}-1-${idx}`,
        rollNumber: s.roll,
        studentName: s.name,
        seatNumber: `S-${idx + 1}`,
        hall: "Hall 302",
        bench: `B-${Math.floor(idx / 2) + 1}`,
        row: Math.floor(idx / 3) + 1,
        column: (idx % 3) + 1
      });
    });

    // Add empty submission marks for upcoming exam
    marksSubmissionList[`exam-${branchCode}-endsem`] = studentBase.map((s) => ({
      rollNumber: s.roll,
      studentName: s.name,
      maxMarks: 100,
      submissionStatus: "Pending"
    }));
  }

  if (secondSub) {
    // Completed exam
    exams.push({
      id: `exam-${branchCode}-mid1`,
      name: `${secondSub.name} — Mid Term 1`,
      subject: secondSub.name,
      code: secondSub.code,
      section: secondSub.assignedSections[0] ?? `${branchCode}-B`,
      date: "October 05, 2026",
      time: "10:00 AM - 12:00 PM",
      duration: "2 Hours",
      venue: "Hall 108 (Block A)",
      status: "Completed",
      type: "Mid Term 1",
      supervisor: "Dr. Sandeep Mehta",
      maxMarks: 50
    });

    invigilations.push({
      id: `inv-${branchCode}-2`,
      date: "October 05, 2026",
      time: "10:00 AM - 12:00 PM",
      hall: "Hall 108",
      building: "Main Block",
      floor: "1st Floor",
      studentCount: 25,
      examName: `${secondSub.name} — Mid 1`,
      status: "Completed"
    });

    questionPapers.push({
      id: `qp-${branchCode}-2`,
      subject: secondSub.name,
      code: secondSub.code,
      type: "Mid Term 1",
      status: "Approved",
      submittedDate: "2026-09-20",
      approvedDate: "2026-09-22"
    });

    hallAllocations.push({
      id: `hall-${branchCode}-2`,
      hallNumber: "Hall 108",
      roomCapacity: 30,
      assignedStudentsCount: 25,
      supervisor: "Dr. Sandeep Mehta",
      examName: `${secondSub.name} — Mid Term 1`
    });

    // Add marks submission (draft) for completed exam
    marksSubmissionList[`exam-${branchCode}-mid1`] = studentBase.map((s, idx) => {
      const raw = rawPctArr[idx] ?? 70;
      const obtained = Math.min(Math.round((raw / 100) * 50), 50);
      return {
        rollNumber: s.roll,
        studentName: s.name,
        marksObtained: obtained,
        maxMarks: 50,
        grade: s.grade,
        remarks: obtained >= 20 ? "Good Performance" : "Needs Improvement",
        submissionStatus: "Draft"
      };
    });

    evaluationProgressList[`exam-${branchCode}-mid1`] = {
      totalScripts: studentBase.length,
      evaluatedScripts: 4,
      marksSubmitted: false
    };
  }

  if (labSub) {
    // Practical Exam (Ongoing)
    exams.push({
      id: `exam-${branchCode}-practical`,
      name: `${labSub.name} — Semester Practical`,
      subject: labSub.name,
      code: labSub.code,
      section: labSub.assignedSections[0] ?? `${branchCode}-A`,
      date: "November 05, 2026",
      time: "09:00 AM - 12:00 PM",
      duration: "3 Hours",
      venue: "Lab 3 (Block B)",
      status: "Ongoing",
      type: "Practical",
      supervisor: "Self",
      maxMarks: 50
    });

    questionPapers.push({
      id: `qp-${branchCode}-3`,
      subject: labSub.name,
      code: labSub.code,
      type: "Practical",
      status: "Submitted",
      submittedDate: "2026-10-25"
    });
  }

  const completed = exams.filter((e) => e.status === "Completed");
  const upcoming = exams.filter((e) => e.status === "Upcoming" || e.status === "Ongoing");

  const totalExams = exams.length;
  const upcomingExamsCount = upcoming.length;
  const completedExamsCount = completed.length;
  const pendingEvalCount = completed.filter((e) => {
    const progress = evaluationProgressList[e.id];
    return progress ? progress.evaluatedScripts < progress.totalScripts : true;
  }).length;

  const invigilationDutiesCount = invigilations.length;
  const marksPendingCount = exams.reduce((s, e) => {
    const marks = marksSubmissionList[e.id];
    if (!marks) return s;
    return s + marks.filter((m) => m.submissionStatus !== "Submitted").length;
  }, 0);

  const analytics: ExamAnalyticsInfo = {
    passPercentage: 83,
    failPercentage: 17,
    averageMarks: 72,
    highestMarks: 94,
    lowestMarks: 32,
    gradeDistribution: [
      { grade: "O", count: 1, color: "#22c55e" },
      { grade: "A+", count: 2, color: "#3b82f6" },
      { grade: "A", count: 1, color: "#6366f1" },
      { grade: "B+", count: 1, color: "#a855f7" },
      { grade: "F", count: 1, color: "#ef4444" }
    ],
    deptComparison: [
      { dept: "CSE", avg: 76 },
      { dept: "ECE", avg: 72 },
      { dept: "EEE", avg: 69 },
      { dept: "ME", avg: 65 },
      { dept: "Civil", avg: 62 },
      { dept: "MBA", avg: 82 }
    ]
  };

  return {
    stats: {
      totalExams,
      upcomingExams: upcomingExamsCount,
      completedExams: completedExamsCount,
      pendingEvaluations: pendingEvalCount,
      invigilationDuties: invigilationDutiesCount,
      marksPending: marksPendingCount
    },
    exams,
    invigilations,
    questionPapers,
    hallAllocations,
    seatingArrangements,
    marksSubmissionList,
    evaluationProgressList,
    analytics
  };
};

// HELPER TO GENERATE RESEARCH & PUBLICATIONS MODULE DATA DYNAMICALLY FOR A BRANCH
export const generateResearchModuleData = (branchCode: string, facultyName: string): ResearchModuleData => {
  const publications: PublicationItem[] = [
    {
      id: `pub-${branchCode}-1`,
      title: `Optimized Resource Management in Decentralized cloud systems for ${branchCode} applications`,
      authors: `${facultyName}, Dr. S. K. Gupta, A. Kumar`,
      journalOrConference: "IEEE Transactions on Systems, Man, and Cybernetics",
      publisher: "IEEE",
      year: 2026,
      doi: "10.1109/TSMC.2026.1234567",
      issnOrIsbn: "2168-2216",
      indexing: "SCI",
      status: "Published",
      type: "Journal",
      documentUrl: "#"
    },
    {
      id: `pub-${branchCode}-2`,
      title: `Machine Learning Frameworks for Predictive Failure Analysis in ${branchCode === "MBA" ? "Financial Markets" : "Industrial Equipments"}`,
      authors: `${facultyName}, M. R. Varma`,
      journalOrConference: "International Conference on Advanced Computational Intelligence",
      publisher: "Springer",
      year: 2025,
      doi: "10.1007/978-3-030-99999-9",
      issnOrIsbn: "1865-0929",
      indexing: "Scopus",
      status: "Published",
      type: "Conference",
      documentUrl: "#"
    },
    {
      id: `pub-${branchCode}-3`,
      title: `Multi-agent Collaboration in Distributed Cyber-Physical Systems: A Survey of ${branchCode} Contexts`,
      authors: `${facultyName}, L. N. Murthy`,
      journalOrConference: "Journal of Systems Architecture",
      publisher: "Elsevier",
      year: 2026,
      doi: "10.1016/j.sysarc.2026.102030",
      issnOrIsbn: "1383-7621",
      indexing: "SCIE",
      status: "Accepted",
      type: "Journal"
    },
    {
      id: `pub-${branchCode}-4`,
      title: `Adaptive Control Models in ${branchCode} Engineering Systems`,
      authors: `${facultyName}, K. Prasanna`,
      journalOrConference: "International Journal of System Science",
      publisher: "Taylor & Francis",
      year: 2026,
      doi: "10.1080/00207721.2026.987654",
      issnOrIsbn: "0020-7721",
      indexing: "Google Scholar",
      status: "Under Review",
      type: "Journal"
    }
  ];

  const patents: PatentItem[] = [
    {
      id: `pat-${branchCode}-1`,
      title: `System and Method for Automated Real-time ${branchCode} Signal Diagnostics`,
      patentNumber: "IN-202511012345-A",
      filingDate: "March 12, 2025",
      publicationDate: "September 18, 2025",
      status: "Published",
      country: "India"
    },
    {
      id: `pat-${branchCode}-2`,
      title: `IoT-Enabled Smart Device for Decentralized ${branchCode} Process Controls`,
      patentNumber: "US-11223344-B2",
      filingDate: "January 10, 2023",
      publicationDate: "June 15, 2025",
      status: "Granted",
      country: "United States"
    }
  ];

  const books: BookItem[] = [
    {
      id: `book-${branchCode}-1`,
      title: `Introduction to Modern ${branchCode === "MBA" ? "Business Management" : branchCode + " Systems"}`,
      publisher: "McGraw Hill Education",
      isbn: "978-93-89347-22-1",
      edition: "2nd Edition",
      year: 2024
    },
    {
      id: `book-${branchCode}-2`,
      title: `Advances in Cloud-Edge Intelligence for ${branchCode} Applications`,
      publisher: "CRC Press",
      isbn: "978-0-367-54321-1",
      edition: "1st Edition",
      year: 2025
    }
  ];

  const projects: ResearchProjectItem[] = [
    {
      id: `proj-${branchCode}-1`,
      title: `Development of High-Performance Distributed Simulation Toolkits for ${branchCode} Curriculums`,
      fundingAgency: "DST (Department of Science and Technology)",
      budget: "$35,000",
      duration: "3 Years (2024 - 2027)",
      teamMembers: [`${facultyName} (PI)`, "Dr. A. K. Singh (Co-PI)", "Rahul Verma (JRF)"],
      status: "Ongoing",
      progress: 60
    },
    {
      id: `proj-${branchCode}-2`,
      title: `Automated Edge Analysis Tools for Real-time ${branchCode} Parameter Estimation`,
      fundingAgency: "AICTE (All India Council for Technical Education)",
      budget: "$15,050",
      duration: "2 Years (2022 - 2024)",
      teamMembers: [`${facultyName} (PI)`, "M. Bhavna (Research Associate)"],
      status: "Completed",
      progress: 100
    }
  ];

  const grants: GrantItem[] = [
    {
      id: `gr-${branchCode}-1`,
      grantName: "Empowerment Research Grant (ERG)",
      agency: "SERB (Science and Engineering Research Board)",
      amount: "$25,000",
      approvalStatus: "Disbursed",
      startDate: "2024-04-01",
      endDate: "2027-03-31"
    },
    {
      id: `gr-${branchCode}-2`,
      grantName: "Modernization and Removal of Obsolescence (MODROBS)",
      agency: "AICTE",
      amount: "$10,000",
      approvalStatus: "Approved",
      startDate: "2026-09-01",
      endDate: "2027-08-31"
    }
  ];

  const conferences: ConferenceEventItem[] = [
    {
      id: `conf-${branchCode}-1`,
      eventName: `IEEE International Conference on ${branchCode === "MBA" ? "Strategic Management" : branchCode + " Systems"}`,
      organizer: "IEEE Computer Society",
      location: "New Delhi, India",
      date: "December 15-18, 2025",
      role: "Presenter",
      certificateStatus: "Received"
    },
    {
      id: `conf-${branchCode}-2`,
      eventName: `National Symposium on Advanced Research Trends in ${branchCode}`,
      organizer: "Indian Institute of Technology",
      location: "Mumbai, India",
      date: "September 02-04, 2026",
      role: "Session Chair",
      certificateStatus: "Pending"
    }
  ];

  const certifications: CertificationItem[] = [
    {
      id: `cert-${branchCode}-1`,
      name: "Google Cloud Professional Data Engineer",
      provider: "Google Cloud",
      completionDate: "March 15, 2025",
      expiryDate: "March 15, 2027",
      credentialId: "GCP-PDE-987654"
    },
    {
      id: `cert-${branchCode}-2`,
      name: "Deep Learning Specialization",
      provider: "Coursera (DeepLearning.AI)",
      completionDate: "August 10, 2024",
      credentialId: "COURSERA-DL-123456"
    }
  ];

  const awards: AwardItem[] = [
    {
      id: `aw-${branchCode}-1`,
      name: "Best Researcher Award 2025",
      organization: "Institute of Engineering & Technology",
      date: "December 20, 2025",
      description: "Awarded for exceptional contributions to research publications and high citation index during academic year 2024-25."
    },
    {
      id: `aw-${branchCode}-2`,
      name: "Outstanding Research Paper Certificate",
      organization: "International Research Board",
      date: "June 18, 2024",
      description: "Recognized for the publication of highly-cited review paper in cloud resource modeling systems."
    }
  ];

  const totalPublications = publications.length;
  const scopusIndexed = publications.filter((p) => p.indexing === "Scopus").length;
  const sciIndexed = publications.filter((p) => p.indexing === "SCI" || p.indexing === "SCIE").length;
  const conferencesCount = publications.filter((p) => p.type === "Conference").length;
  const patentsCount = patents.length;
  const booksCount = books.length;
  const projectsCount = projects.length;
  const researchGrantsCount = grants.length;

  const citations = branchCode === "CSE" ? 312 : branchCode === "ECE" ? 220 : branchCode === "EEE" ? 180 : branchCode === "ME" ? 140 : branchCode === "Civil" ? 95 : 120;
  const hIndex = branchCode === "CSE" ? 12 : branchCode === "ECE" ? 9 : branchCode === "EEE" ? 8 : branchCode === "ME" ? 6 : branchCode === "Civil" ? 4 : 5;

  const dashboardSummary: ResearchDashboardSummary = {
    publicationsThisYear: publications.filter((p) => p.year === 2026 && p.status === "Published").length,
    acceptedPapers: publications.filter((p) => p.status === "Accepted").length,
    underReview: publications.filter((p) => p.status === "Under Review").length,
    ongoingProjects: projects.filter((p) => p.status === "Ongoing").length,
    completedProjects: projects.filter((p) => p.status === "Completed").length,
    grantsReceived: grants.filter((g) => g.approvalStatus === "Disbursed" || g.approvalStatus === "Approved").length
  };

  const analytics: ResearchAnalyticsInfo = {
    publicationsByYear: [
      { year: 2022, count: 2 },
      { year: 2023, count: 4 },
      { year: 2024, count: 5 },
      { year: 2025, count: 6 },
      { year: 2026, count: totalPublications }
    ],
    citationsTrend: [
      { year: 2022, count: Math.round(citations * 0.2) },
      { year: 2023, count: Math.round(citations * 0.45) },
      { year: 2024, count: Math.round(citations * 0.7) },
      { year: 2025, count: Math.round(citations * 0.9) },
      { year: 2026, count: citations }
    ],
    categoryDistribution: [
      { name: "SCI Journals", count: sciIndexed, color: "#22c55e" },
      { name: "Scopus Conferences", count: conferencesCount, color: "#3b82f6" },
      { name: "Book Chapters", count: booksCount, color: "#a855f7" },
      { name: "Patents", count: patentsCount, color: "#f59e0b" }
    ],
    researchAreas: [
      { name: "Distributed Systems", percentage: 40 },
      { name: "Machine Learning", percentage: 30 },
      { name: "Embedded Systems", percentage: 20 },
      { name: "Process Automation", percentage: 10 }
    ],
    grantsByYear: [
      { year: 2023, amount: 5000 },
      { year: 2024, amount: 25000 },
      { year: 2025, amount: 15000 },
      { year: 2026, amount: 10000 }
    ],
    projectStatusDistribution: [
      { status: "Ongoing", count: projects.filter((p) => p.status === "Ongoing").length, color: "#3b82f6" },
      { status: "Completed", count: projects.filter((p) => p.status === "Completed").length, color: "#22c55e" },
      { status: "Proposed", count: projects.filter((p) => p.status === "Proposed").length, color: "#f59e0b" }
    ]
  };

  return {
    stats: {
      totalPublications,
      scopusIndexed,
      sciIndexed,
      conferences: conferencesCount,
      patents: patentsCount,
      books: booksCount,
      projects: projectsCount,
      researchGrants: researchGrantsCount,
      citations,
      hIndex
    },
    dashboardSummary,
    publications,
    patents,
    books,
    projects,
    grants,
    conferences,
    certifications,
    awards,
    analytics
  };
};

const cseSubjects: SubjectItem[] = [
  {
    id: "sub-1",
    name: "Operating Systems",
    code: "CS301",
    regulation: "R22",
    semester: "5",
    credits: 4,
    type: "Theory",
    weeklyHours: 4,
    assignedSections: ["CSE-A"],
    studentsCount: 66,
    status: "Active",
    syllabusProgress: getSampleSyllabus("Operating Systems"),
    courseOutcomes: getSampleCOs("Operating Systems"),
    programOutcomes: ["PO1", "PO2", "PO3", "PSO1"],
    books: getSampleBooks("Operating Systems"),
    sectionsDetails: [{ sectionName: "CSE-A", studentsCount: 66, classroom: "Room A-302", advisor: "Mr. T. R. Rao" }],
    timeline: getSampleTimeline(),
  },
  {
    id: "sub-2",
    name: "Database Management Systems",
    code: "CS302",
    regulation: "R22",
    semester: "5",
    credits: 4,
    type: "Theory",
    weeklyHours: 3,
    assignedSections: ["CSE-B"],
    studentsCount: 70,
    status: "Active",
    syllabusProgress: getSampleSyllabus("Database Management Systems"),
    courseOutcomes: getSampleCOs("Database Management Systems"),
    programOutcomes: ["PO1", "PO2", "PO4", "PSO2"],
    books: getSampleBooks("Database Management Systems"),
    sectionsDetails: [{ sectionName: "CSE-B", studentsCount: 70, classroom: "Room A-108", advisor: "Mrs. V. Devi" }],
    timeline: getSampleTimeline(),
  },
  {
    id: "sub-3",
    name: "Compiler Design",
    code: "CS304",
    regulation: "R22",
    semester: "5",
    credits: 3,
    type: "Theory",
    weeklyHours: 3,
    assignedSections: ["CSE-C"],
    studentsCount: 60,
    status: "Active",
    syllabusProgress: getSampleSyllabus("Compiler Design"),
    courseOutcomes: getSampleCOs("Compiler Design"),
    programOutcomes: ["PO1", "PO2", "PO3"],
    books: getSampleBooks("Compiler Design"),
    sectionsDetails: [{ sectionName: "CSE-C", studentsCount: 60, classroom: "Room B-204", advisor: "Dr. N. Roy" }],
    timeline: getSampleTimeline(),
  },
  {
    id: "sub-4",
    name: "Operating Systems Lab",
    code: "CS301L",
    regulation: "R22",
    semester: "5",
    credits: 2,
    type: "Lab",
    weeklyHours: 4,
    assignedSections: ["CSE-A"],
    studentsCount: 66,
    status: "Active",
    syllabusProgress: getSampleSyllabus("Operating Systems Lab"),
    courseOutcomes: getSampleCOs("Operating Systems Lab"),
    programOutcomes: ["PO5", "PO9", "PSO1"],
    books: getSampleBooks("Operating Systems Lab"),
    labDetails: { labName: "Advanced Computing Lab", labNumber: "Lab 3", equipmentCount: 36, weeklyLabHours: 4, manualLink: "OS_Lab_Manual_R22.pdf" },
    sectionsDetails: [{ sectionName: "CSE-A", studentsCount: 66, classroom: "Lab 3", advisor: "Mr. T. R. Rao" }],
    timeline: getSampleTimeline(),
  },
];

const eceSubjects: SubjectItem[] = [
  {
    id: "sub-1",
    name: "Signals & Systems",
    code: "EC201",
    regulation: "R22",
    semester: "3",
    credits: 4,
    type: "Theory",
    weeklyHours: 3,
    assignedSections: ["ECE-A"],
    studentsCount: 75,
    status: "Active",
    syllabusProgress: getSampleSyllabus("Signals & Systems"),
    courseOutcomes: getSampleCOs("Signals & Systems"),
    programOutcomes: ["PO1", "PO2", "PO5"],
    books: getSampleBooks("Signals & Systems"),
    sectionsDetails: [{ sectionName: "ECE-A", studentsCount: 75, classroom: "Room C-201", advisor: "Dr. G. K. Reddy" }],
    timeline: getSampleTimeline(),
  },
  {
    id: "sub-2",
    name: "Microprocessors & Microcontrollers",
    code: "EC202",
    regulation: "R22",
    semester: "3",
    credits: 4,
    type: "Theory",
    weeklyHours: 3,
    assignedSections: ["ECE-B"],
    studentsCount: 70,
    status: "Active",
    syllabusProgress: getSampleSyllabus("Microprocessors"),
    courseOutcomes: getSampleCOs("Microprocessors"),
    programOutcomes: ["PO1", "PO3", "PO4", "PSO2"],
    books: getSampleBooks("Microprocessors"),
    sectionsDetails: [{ sectionName: "ECE-B", studentsCount: 70, classroom: "Room C-205", advisor: "Mr. P. Kumar" }],
    timeline: getSampleTimeline(),
  },
  {
    id: "sub-3",
    name: "Electromagnetic Fields",
    code: "EC203",
    regulation: "R22",
    semester: "3",
    credits: 3,
    type: "Theory",
    weeklyHours: 3,
    assignedSections: ["ECE-A"],
    studentsCount: 75,
    status: "Active",
    syllabusProgress: getSampleSyllabus("Electromagnetic Fields"),
    courseOutcomes: getSampleCOs("Electromagnetic Fields"),
    programOutcomes: ["PO1", "PO2"],
    books: getSampleBooks("Electromagnetic Fields"),
    sectionsDetails: [{ sectionName: "ECE-A", studentsCount: 75, classroom: "Room C-201", advisor: "Dr. G. K. Reddy" }],
    timeline: getSampleTimeline(),
  },
];

const eeeSubjects: SubjectItem[] = [
  {
    id: "sub-1",
    name: "Power Electronics",
    code: "EE401",
    regulation: "R22",
    semester: "7",
    credits: 4,
    type: "Theory",
    weeklyHours: 4,
    assignedSections: ["EEE-A"],
    studentsCount: 95,
    status: "Active",
    syllabusProgress: getSampleSyllabus("Power Electronics"),
    courseOutcomes: getSampleCOs("Power Electronics"),
    programOutcomes: ["PO1", "PO2"],
    books: getSampleBooks("Power Electronics"),
    sectionsDetails: [{ sectionName: "EEE-A", studentsCount: 95, classroom: "Room D-102" }],
    timeline: getSampleTimeline(),
  },
];

const meSubjects: SubjectItem[] = [
  {
    id: "sub-1",
    name: "Thermodynamics",
    code: "ME301",
    regulation: "R22",
    semester: "5",
    credits: 4,
    type: "Theory",
    weeklyHours: 4,
    assignedSections: ["ME-A"],
    studentsCount: 80,
    status: "Active",
    syllabusProgress: getSampleSyllabus("Thermodynamics"),
    courseOutcomes: getSampleCOs("Thermodynamics"),
    programOutcomes: ["PO1", "PO2"],
    books: getSampleBooks("Thermodynamics"),
    sectionsDetails: [{ sectionName: "ME-A", studentsCount: 80, classroom: "Room M-101" }],
    timeline: getSampleTimeline(),
  },
  {
    id: "sub-2",
    name: "Fluid Mechanics",
    code: "ME302",
    regulation: "R22",
    semester: "5",
    credits: 4,
    type: "Theory",
    weeklyHours: 3,
    assignedSections: ["ME-B"],
    studentsCount: 78,
    status: "Active",
    syllabusProgress: getSampleSyllabus("Fluid Mechanics"),
    courseOutcomes: getSampleCOs("Fluid Mechanics"),
    programOutcomes: ["PO1", "PO2", "PO3"],
    books: getSampleBooks("Fluid Mechanics"),
    sectionsDetails: [{ sectionName: "ME-B", studentsCount: 78, classroom: "Room M-104" }],
    timeline: getSampleTimeline(),
  },
];

const civilSubjects: SubjectItem[] = [
  {
    id: "sub-1",
    name: "Structural Analysis",
    code: "CE301",
    regulation: "R22",
    semester: "5",
    credits: 4,
    type: "Theory",
    weeklyHours: 4,
    assignedSections: ["CE-A"],
    studentsCount: 60,
    status: "Active",
    syllabusProgress: getSampleSyllabus("Structural Analysis"),
    courseOutcomes: getSampleCOs("Structural Analysis"),
    programOutcomes: ["PO1", "PO2"],
    books: getSampleBooks("Structural Analysis"),
    sectionsDetails: [{ sectionName: "CE-A", studentsCount: 60, classroom: "Room S-202" }],
    timeline: getSampleTimeline(),
  },
  {
    id: "sub-2",
    name: "Geotechnical Engineering",
    code: "CE302",
    regulation: "R22",
    semester: "5",
    credits: 4,
    type: "Theory",
    weeklyHours: 4,
    assignedSections: ["CE-A"],
    studentsCount: 60,
    status: "Active",
    syllabusProgress: getSampleSyllabus("Geotechnical Engineering"),
    courseOutcomes: getSampleCOs("Geotechnical Engineering"),
    programOutcomes: ["PO1", "PO2", "PO3"],
    books: getSampleBooks("Geotechnical Engineering"),
    sectionsDetails: [{ sectionName: "CE-A", studentsCount: 60, classroom: "Room S-202" }],
    timeline: getSampleTimeline(),
  },
];

const mbaSubjects: SubjectItem[] = [
  {
    id: "sub-1",
    name: "Organizational Behavior",
    code: "MB101",
    regulation: "R25",
    semester: "1",
    credits: 4,
    type: "Theory",
    weeklyHours: 4,
    assignedSections: ["MBA-A"],
    studentsCount: 60,
    status: "Active",
    syllabusProgress: getSampleSyllabus("Organizational Behavior"),
    courseOutcomes: getSampleCOs("Organizational Behavior"),
    programOutcomes: ["PO1", "PO4"],
    books: getSampleBooks("Organizational Behavior"),
    sectionsDetails: [{ sectionName: "MBA-A", studentsCount: 60, classroom: "Room MBA-102" }],
    timeline: getSampleTimeline(),
  },
  {
    id: "sub-2",
    name: "Marketing Management",
    code: "MB102",
    regulation: "R25",
    semester: "1",
    credits: 4,
    type: "Theory",
    weeklyHours: 4,
    assignedSections: ["MBA-B"],
    studentsCount: 60,
    status: "Active",
    syllabusProgress: getSampleSyllabus("Marketing Management"),
    courseOutcomes: getSampleCOs("Marketing Management"),
    programOutcomes: ["PO1", "PO2", "PO3"],
    books: getSampleBooks("Marketing Management"),
    sectionsDetails: [{ sectionName: "MBA-B", studentsCount: 60, classroom: "Room MBA-104" }],
    timeline: getSampleTimeline(),
  },
];



export const FACULTY_DASHBOARD_DATA_BY_DEPT: Record<string, FacultyDashboardData> = {
  CSE: {
    facultyName: "Dr. Rahul Kumar",
    designation: "Associate Professor",
    employeeId: "EMP-102",
    semester: "5",
    academicYear: "2026-27",
    stats: { todaysClasses: 4, totalStudents: 182, pendingAssignments: 7, attendancePending: "2 Classes", upcomingExams: 3, researchPublications: 14 },
    timetable: [
      { time: "09:00 - 10:00", subject: "Operating Systems", section: "CSE-A", room: "A-302", status: "Completed" },
      { time: "10:15 - 11:15", subject: "Database Management Systems", section: "CSE-B", room: "A-108", status: "Ongoing" },
      { time: "11:30 - 12:30", subject: "Design & Analysis of Algorithms", section: "CSE-A", room: "A-302", status: "Upcoming" },
      { time: "14:00 - 15:00", subject: "Compiler Design", section: "CSE-C", room: "B-204", status: "Upcoming" },
    ],
    attendance: { present: 82, absent: 10, pending: 8 },
    assignments: { pendingEvaluation: 24, completed: 145, overdue: 5, submittedToday: 8 },
    announcements: [
      { id: "a1", title: "Internal Marks submission deadline: August 10", meta: "Academic - 1 hr ago", category: "Academic" },
      { id: "a2", title: "NBA Accreditation Review meeting at 3:00 PM", meta: "Meeting - 3 hrs ago", category: "Meeting" },
    ],
    performance: {
      averageAttendance: 85, averageMarks: 76, assignmentsSubmitted: 92, studentsAtRisk: 12,
      chartData: [
        { name: "CSE-A", attendance: 88, marks: 79, submissions: 94 },
        { name: "CSE-B", attendance: 82, marks: 74, submissions: 90 },
      ],
    },
    events: [],
    notifications: [],
    profileData: {
      id: "FAC102", name: "Dr. Rahul Kumar", designation: "Associate Professor", department: "Computer Science & Engineering", employeeId: "EMP-102", profilePhoto: "", role: "Faculty", employmentType: "Full-Time", joiningDate: "July 12, 2020", status: "Active",
      personalInfo: { fullName: "Rahul Kumar", gender: "Male", dob: "August 14, 1985", bloodGroup: "O+", nationality: "Indian", maritalStatus: "Married", phone: "+91 98765 43210", email: "rahul.kumar@college.edu", address: "Flat 402, Royal Enclave, Tech Zone, Visakhapatnam", emergencyContact: "Anitha" },
      professionalInfo: { employeeId: "EMP-102", department: "Computer Science & Engineering", designation: "Associate Professor", employmentType: "Full-Time Permanent", joiningDate: "July 12, 2020", reportingHod: "Dr. S. K. Gupta", experienceYears: 12, qualification: "Ph.D", specialization: "Cloud" },
      academicInfo: { assignedSubjects: ["Operating Systems", "Algorithms", "DBMS", "Compiler Design"], currentSemester: "Semester 5", sections: ["CSE-A", "CSE-B"], totalTeachingHours: 16, mentorSections: ["CSE III-A"], coursesHandled: ["B.Tech CSE"] },
      researchPublications: { journalPublications: 14, conferencePapers: 18, patents: 2, books: 1, researchProjects: 3, workshopsConducted: 8 },
      documents: [],
      skills: { technicalSkills: ["Cloud"], programmingLanguages: ["Java"], researchAreas: ["Edge AI"], certifications: [], softwareTools: [] },
      stats: { experience: "12 Years", subjectsHandled: 8, studentsMentored: 120, publications: 32, projectsGuided: 24, workshopsConducted: 8 },
      activityTimeline: [],
      profileCompletion: { percentage: 92, missingFields: [] }
    },
    timetableData: {
      weeklyGrid: generateWeeklyGrid(cseSubjects),
      monthlyEvents: [],
      upcomingClasses: [],
      roomAllocations: [],
      subjectSummary: [],
      freePeriods: [],
      teachingLoad: { weeklyClasses: 14, theoryHours: 10, labHours: 4, totalHours: 14, totalSubjects: 4, totalSections: 3 },
      conflicts: [],
    },
    subjectsList: cseSubjects,
    lessonPlans: cseSubjects.map(generateLessonPlanForSubject),
    attendanceData: generateAttendanceData("CS"),
    studentsDetailsList: generateDetailedStudents("CSE", "Dr. Rahul Kumar"),
    assignmentsDetailsList: generateAssignmentsData("CSE"),
    studyMaterialsList: generateStudyMaterialsData("CSE"),
    assessmentsList: generateAssessmentModuleData("CSE", cseSubjects),
    examsList: generateExamModuleData("CSE", cseSubjects),
    researchList: generateResearchModuleData("CSE", "Dr. Rahul Kumar"),
  },
  ECE: {
    facultyName: "Dr. Ravi Chandra",
    designation: "Professor",
    employeeId: "EMP-105",
    semester: "3",
    academicYear: "2026-27",
    stats: { todaysClasses: 3, totalStudents: 145, pendingAssignments: 4, attendancePending: "1 Class", upcomingExams: 2, researchPublications: 18 },
    timetable: [],
    attendance: { present: 88, absent: 8, pending: 4 },
    assignments: { pendingEvaluation: 15, completed: 120, overdue: 3, submittedToday: 12 },
    announcements: [],
    performance: { averageAttendance: 89, averageMarks: 72, assignmentsSubmitted: 94, studentsAtRisk: 8, chartData: [] },
    events: [],
    notifications: [],
    profileData: {
      id: "FAC105", name: "Dr. Ravi Chandra", designation: "Professor", department: "Electronics & Communication Engineering", employeeId: "EMP-105", profilePhoto: "", role: "Faculty", employmentType: "Full-Time", joiningDate: "June 01, 2018", status: "Active",
      personalInfo: { fullName: "Ravi Chandra", gender: "Male", dob: "Nov 23, 1980", bloodGroup: "A+", nationality: "Indian", maritalStatus: "Married", phone: "+91 94401 94401", email: "ravi.chandra@college.edu", address: "Visakhapatnam", emergencyContact: "Lakshmi" },
      professionalInfo: { employeeId: "EMP-105", department: "Electronics & Communication Engineering", designation: "Professor", employmentType: "Full-Time Permanent", joiningDate: "June 01, 2018", reportingHod: "Dr. A. K. Singh", experienceYears: 15, qualification: "Ph.D", specialization: "VLSI" },
      academicInfo: { assignedSubjects: ["Signals & Systems"], currentSemester: "Semester 3", sections: ["ECE-A"], totalTeachingHours: 14, mentorSections: ["ECE II-B"], coursesHandled: ["B.Tech ECE"] },
      researchPublications: { journalPublications: 18, conferencePapers: 22, patents: 3, books: 2, researchProjects: 4, workshopsConducted: 12 },
      documents: [],
      skills: { technicalSkills: ["VLSI"], programmingLanguages: ["MATLAB"], researchAreas: ["MEMS"], certifications: [], softwareTools: [] },
      stats: { experience: "15 Years", subjectsHandled: 6, studentsMentored: 150, publications: 40, projectsGuided: 32, workshopsConducted: 12 },
      activityTimeline: [],
      profileCompletion: { percentage: 92, missingFields: [] }
    },
    timetableData: {
      weeklyGrid: generateWeeklyGrid(eceSubjects),
      monthlyEvents: [],
      upcomingClasses: [],
      roomAllocations: [],
      subjectSummary: [],
      freePeriods: [],
      teachingLoad: { weeklyClasses: 10, theoryHours: 8, labHours: 2, totalHours: 10, totalSubjects: 4, totalSections: 2 },
      conflicts: [],
    },
    subjectsList: eceSubjects,
    lessonPlans: eceSubjects.map(generateLessonPlanForSubject),
    attendanceData: generateAttendanceData("EC"),
    studentsDetailsList: generateDetailedStudents("ECE", "Dr. Ravi Chandra"),
    assignmentsDetailsList: generateAssignmentsData("ECE"),
    studyMaterialsList: generateStudyMaterialsData("ECE"),
    assessmentsList: generateAssessmentModuleData("ECE", eceSubjects),
    examsList: generateExamModuleData("ECE", eceSubjects),
    researchList: generateResearchModuleData("ECE", "Dr. Ravi Chandra"),
  },
  EEE: {
    facultyName: "Dr. K. Srinivasan",
    designation: "Assistant Professor",
    employeeId: "EMP-108",
    semester: "7",
    academicYear: "2026-27",
    stats: { todaysClasses: 2, totalStudents: 95, pendingAssignments: 6, attendancePending: "0 Classes", upcomingExams: 4, researchPublications: 8 },
    timetable: [],
    attendance: { present: 91, absent: 6, pending: 3 },
    assignments: { pendingEvaluation: 32, completed: 58, overdue: 4, submittedToday: 1 },
    announcements: [],
    performance: { averageAttendance: 91, averageMarks: 81, assignmentsSubmitted: 89, studentsAtRisk: 4, chartData: [] },
    events: [],
    notifications: [],
    profileData: {
      id: "FAC108", name: "Dr. K. Srinivasan", designation: "Assistant Professor", department: "Electrical & Electronics Engineering", employeeId: "EMP-108", profilePhoto: "", role: "Faculty", employmentType: "Full-Time", joiningDate: "Dec 08, 2021", status: "Active",
      personalInfo: { fullName: "K. Srinivasan", gender: "Male", dob: "April 15, 1989", bloodGroup: "B+", nationality: "Indian", maritalStatus: "Married", phone: "+91 94412 94412", email: "srinivasan.k@college.edu", address: "Visakhapatnam", emergencyContact: "Meenakshi" },
      professionalInfo: { employeeId: "EMP-108", department: "Electrical & Electronics Engineering", designation: "Assistant Professor", employmentType: "Full-Time Permanent", joiningDate: "Dec 08, 2021", reportingHod: "Dr. H. S. Sharma", experienceYears: 8, qualification: "Ph.D", specialization: "Power Electronics" },
      academicInfo: { assignedSubjects: ["Power Electronics"], currentSemester: "Semester 7", sections: ["EEE-A"], totalTeachingHours: 12, mentorSections: ["EEE IV-A"], coursesHandled: ["B.Tech EEE"] },
      researchPublications: { journalPublications: 8, conferencePapers: 12, patents: 1, books: 0, researchProjects: 2, workshopsConducted: 4 },
      documents: [],
      skills: { technicalSkills: [], programmingLanguages: [], researchAreas: [], certifications: [], softwareTools: [] },
      stats: { experience: "8 Years", subjectsHandled: 4, studentsMentored: 95, publications: 20, projectsGuided: 12, workshopsConducted: 4 },
      activityTimeline: [],
      profileCompletion: { percentage: 92, missingFields: [] }
    },
    timetableData: {
      weeklyGrid: generateWeeklyGrid(eeeSubjects),
      monthlyEvents: [],
      upcomingClasses: [],
      roomAllocations: [],
      subjectSummary: [],
      freePeriods: [],
      teachingLoad: { weeklyClasses: 8, theoryHours: 8, labHours: 0, totalHours: 8, totalSubjects: 2, totalSections: 1 },
      conflicts: [],
    },
    subjectsList: eeeSubjects,
    lessonPlans: eeeSubjects.map(generateLessonPlanForSubject),
    attendanceData: generateAttendanceData("EE"),
    studentsDetailsList: generateDetailedStudents("EEE", "Dr. K. Srinivasan"),
    assignmentsDetailsList: generateAssignmentsData("EEE"),
    studyMaterialsList: generateStudyMaterialsData("EEE"),
    assessmentsList: generateAssessmentModuleData("EEE", eeeSubjects),
    examsList: generateExamModuleData("EEE", eeeSubjects),
    researchList: generateResearchModuleData("EEE", "Dr. K. Srinivasan"),
  },
  ME: {
    facultyName: "Dr. Vinod Nayak",
    designation: "Professor",
    employeeId: "EMP-203",
    semester: "5",
    academicYear: "2026-27",
    stats: { todaysClasses: 3, totalStudents: 158, pendingAssignments: 8, attendancePending: "2 Classes", upcomingExams: 1, researchPublications: 22 },
    timetable: [],
    attendance: { present: 78, absent: 15, pending: 7 },
    assignments: { pendingEvaluation: 45, completed: 98, overdue: 12, submittedToday: 3 },
    announcements: [],
    performance: { averageAttendance: 79, averageMarks: 68, assignmentsSubmitted: 84, studentsAtRisk: 18, chartData: [] },
    events: [],
    notifications: [],
    profileData: {
      id: "FAC203", name: "Dr. Vinod Nayak", designation: "Professor", department: "Mechanical Engineering", employeeId: "EMP-203", profilePhoto: "", role: "Faculty", employmentType: "Full-Time", joiningDate: "Oct 14, 2012", status: "Active",
      personalInfo: { fullName: "Vinod Nayak", gender: "Male", dob: "July 04, 1974", bloodGroup: "AB+", nationality: "Indian", maritalStatus: "Married", phone: "+91 98850 98850", email: "vinod.nayak@college.edu", address: "Visakhapatnam", emergencyContact: "Sandhya" },
      professionalInfo: { employeeId: "EMP-203", department: "Mechanical Engineering", designation: "Professor", employmentType: "Full-Time Permanent", joiningDate: "Oct 14, 2012", reportingHod: "Dr. Deshmukh", experienceYears: 18, qualification: "Ph.D", specialization: "Thermal" },
      academicInfo: { assignedSubjects: ["Thermodynamics"], currentSemester: "Semester 5", sections: ["ME-A"], totalTeachingHours: 15, mentorSections: ["ME III-B"], coursesHandled: ["B.Tech ME"] },
      researchPublications: { journalPublications: 22, conferencePapers: 28, patents: 4, books: 3, researchProjects: 5, workshopsConducted: 14 },
      documents: [],
      skills: { technicalSkills: [], programmingLanguages: [], researchAreas: [], certifications: [], softwareTools: [] },
      stats: { experience: "18 Years", subjectsHandled: 12, studentsMentored: 240, publications: 50, projectsGuided: 45, workshopsConducted: 14 },
      activityTimeline: [],
      profileCompletion: { percentage: 92, missingFields: [] }
    },
    timetableData: {
      weeklyGrid: generateWeeklyGrid(meSubjects),
      monthlyEvents: [],
      upcomingClasses: [],
      roomAllocations: [],
      subjectSummary: [],
      freePeriods: [],
      teachingLoad: { weeklyClasses: 12, theoryHours: 9, labHours: 3, totalHours: 12, totalSubjects: 3, totalSections: 2 },
      conflicts: [],
    },
    subjectsList: meSubjects,
    lessonPlans: meSubjects.map(generateLessonPlanForSubject),
    attendanceData: generateAttendanceData("ME"),
    studentsDetailsList: generateDetailedStudents("ME", "Dr. Vinod Nayak"),
    assignmentsDetailsList: generateAssignmentsData("ME"),
    studyMaterialsList: generateStudyMaterialsData("ME"),
    assessmentsList: generateAssessmentModuleData("ME", meSubjects),
    examsList: generateExamModuleData("ME", meSubjects),
    researchList: generateResearchModuleData("ME", "Dr. Vinod Nayak"),
  },
  Civil: {
    facultyName: "Dr. Sandeep Mehta",
    designation: "Associate Professor",
    employeeId: "EMP-208",
    semester: "5",
    academicYear: "2026-27",
    stats: { todaysClasses: 3, totalStudents: 120, pendingAssignments: 5, attendancePending: "1 Class", upcomingExams: 2, researchPublications: 11 },
    timetable: [],
    attendance: { present: 81, absent: 12, pending: 7 },
    assignments: { pendingEvaluation: 18, completed: 96, overdue: 6, submittedToday: 5 },
    announcements: [],
    performance: { averageAttendance: 82, averageMarks: 73, assignmentsSubmitted: 90, studentsAtRisk: 10, chartData: [] },
    events: [],
    notifications: [],
    profileData: {
      id: "FAC208", name: "Dr. Sandeep Mehta", designation: "Associate Professor", department: "Civil Engineering", employeeId: "EMP-208", profilePhoto: "", role: "Faculty", employmentType: "Full-Time", joiningDate: "Aug 20, 2021", status: "Active",
      personalInfo: { fullName: "Sandeep Mehta", gender: "Male", dob: "Oct 10, 1983", bloodGroup: "O-", nationality: "Indian", maritalStatus: "Married", phone: "+91 94902 94902", email: "sandeep@college.edu", address: "Visakhapatnam", emergencyContact: "Jyoti" },
      professionalInfo: { employeeId: "EMP-208", department: "Civil Engineering", designation: "Associate Professor", employmentType: "Full-Time Permanent", joiningDate: "Aug 20, 2021", reportingHod: "Dr. Jha", experienceYears: 10, qualification: "Ph.D", specialization: "Seismic" },
      academicInfo: { assignedSubjects: ["Structural Analysis"], currentSemester: "Semester 5", sections: ["CE-A"], totalTeachingHours: 13, mentorSections: ["CE III-A"], coursesHandled: ["B.Tech Civil"] },
      researchPublications: { journalPublications: 11, conferencePapers: 15, patents: 2, books: 1, researchProjects: 2, workshopsConducted: 6 },
      documents: [],
      skills: { technicalSkills: [], programmingLanguages: [], researchAreas: [], certifications: [], softwareTools: [] },
      stats: { experience: "10 Years", subjectsHandled: 5, studentsMentored: 100, publications: 26, projectsGuided: 18, workshopsConducted: 6 },
      activityTimeline: [],
      profileCompletion: { percentage: 92, missingFields: [] }
    },
    timetableData: {
      weeklyGrid: generateWeeklyGrid(civilSubjects),
      monthlyEvents: [],
      upcomingClasses: [],
      roomAllocations: [],
      subjectSummary: [],
      freePeriods: [],
      teachingLoad: { weeklyClasses: 11, theoryHours: 8, labHours: 3, totalHours: 11, totalSubjects: 3, totalSections: 2 },
      conflicts: [],
    },
    subjectsList: civilSubjects,
    lessonPlans: civilSubjects.map(generateLessonPlanForSubject),
    attendanceData: generateAttendanceData("CE"),
    studentsDetailsList: generateDetailedStudents("Civil", "Dr. Sandeep Mehta"),
    assignmentsDetailsList: generateAssignmentsData("Civil"),
    studyMaterialsList: generateStudyMaterialsData("Civil"),
    assessmentsList: generateAssessmentModuleData("Civil", civilSubjects),
    examsList: generateExamModuleData("Civil", civilSubjects),
    researchList: generateResearchModuleData("Civil", "Dr. Sandeep Mehta"),
  },
  MBA: {
    facultyName: "Dr. Shalini Kapoor",
    designation: "Professor",
    employeeId: "EMP-301",
    semester: "1",
    academicYear: "2026-27",
    stats: { todaysClasses: 2, totalStudents: 120, pendingAssignments: 3, attendancePending: "1 Class", upcomingExams: 1, researchPublications: 26 },
    timetable: [],
    attendance: { present: 93, absent: 4, pending: 3 },
    assignments: { pendingEvaluation: 12, completed: 105, overdue: 3, submittedToday: 18 },
    announcements: [],
    performance: { averageAttendance: 94, averageMarks: 82, assignmentsSubmitted: 95, studentsAtRisk: 2, chartData: [] },
    events: [],
    notifications: [],
    profileData: {
      id: "FAC301", name: "Dr. Shalini Kapoor", designation: "Professor", department: "Master of Business Administration", employeeId: "EMP-301", profilePhoto: "", role: "Faculty", employmentType: "Full-Time", joiningDate: "Jan 10, 2016", status: "Active",
      personalInfo: { fullName: "Shalini Kapoor", gender: "Female", dob: "Sept 05, 1978", bloodGroup: "A-", nationality: "Indian", maritalStatus: "Married", phone: "+91 98450 98450", email: "shalini@college.edu", address: "Visakhapatnam", emergencyContact: "Rajesh" },
      professionalInfo: { employeeId: "EMP-301", department: "Master of Business Administration", designation: "Professor", employmentType: "Full-Time Permanent", joiningDate: "Jan 10, 2016", reportingHod: "Dr. Sen", experienceYears: 20, qualification: "Ph.D", specialization: "Marketing" },
      academicInfo: { assignedSubjects: ["Organizational Behavior", "Marketing Management"], currentSemester: "Semester 1", sections: ["MBA-A", "MBA-B"], totalTeachingHours: 16, mentorSections: ["MBA I-A"], coursesHandled: ["MBA"] },
      researchPublications: { journalPublications: 26, conferencePapers: 32, patents: 2, books: 4, researchProjects: 6, workshopsConducted: 18 },
      documents: [],
      skills: { technicalSkills: [], programmingLanguages: [], researchAreas: [], certifications: [], softwareTools: [] },
      stats: { experience: "20 Years", subjectsHandled: 10, studentsMentored: 280, publications: 58, projectsGuided: 52, workshopsConducted: 18 },
      activityTimeline: [],
      profileCompletion: { percentage: 92, missingFields: [] }
    },
    timetableData: {
      weeklyGrid: generateWeeklyGrid(mbaSubjects),
      monthlyEvents: [],
      upcomingClasses: [],
      roomAllocations: [],
      subjectSummary: [],
      freePeriods: [],
      teachingLoad: { weeklyClasses: 12, theoryHours: 12, labHours: 0, totalHours: 12, totalSubjects: 2, totalSections: 2 },
      conflicts: [],
    },
    subjectsList: mbaSubjects,
    lessonPlans: mbaSubjects.map(generateLessonPlanForSubject),
    attendanceData: generateAttendanceData("MB"),
    studentsDetailsList: generateDetailedStudents("MBA", "Dr. Shalini Kapoor"),
    assignmentsDetailsList: generateAssignmentsData("MBA"),
    studyMaterialsList: generateStudyMaterialsData("MBA"),
    assessmentsList: generateAssessmentModuleData("MBA", mbaSubjects),
    examsList: generateExamModuleData("MBA", mbaSubjects),
    researchList: generateResearchModuleData("MBA", "Dr. Shalini Kapoor"),
  },
};
