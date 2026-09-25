import {
  LayoutDashboard,
  BadgeCheck,
  GraduationCap,
  School,
  Users,
  UserCog,
  CalendarCheck,
  ClipboardCheck,
  CalendarRange,
  BookOpen,
  FileSpreadsheet,
  Award,
  Library,
  Bus,
  Wallet,
  Briefcase,
  BarChart3,
  MessageSquare,
  Settings,
  User,
  GitBranch,
  Package,
  ShieldAlert,
  Siren,
  Globe,
  Calendar,
  FileText,
  CheckSquare,
  CreditCard,
  Bell,
  Brain,
  ClipboardList,
  TrendingUp,
  Building2,
  UserCheck,
  FileCheck2,
  Video,
  Database,
  Send,
  HelpCircle,
  ShieldCheck,
  FileCheck,
  Sparkles,
  Ticket,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

import { ACADEMIC_DEAN_NAVIGATION } from "@/config/navigation/academic-dean";
import { STUDENT_DEAN_NAVIGATION } from "@/config/navigation/student-dean";
import { IQAC_NAVIGATION } from "@/config/navigation/iqac";
import { IMA_NAVIGATION } from "@/config/navigation/ima";
import { RESEARCH_NAVIGATION } from "@/config/navigation/research";
import { FINANCE_NAVIGATION } from "@/config/navigation/finance";
import { EXAMINATION_NAVIGATION } from "@/config/navigation/examination";
import { PLACEMENT_NAVIGATION } from "@/config/navigation/placement";
import { LIBRARIAN_NAVIGATION } from "@/config/navigation/librarian";
import { TRANSPORT_NAVIGATION } from "@/config/navigation/transport";
import { FACULTY_NAVIGATION } from "@/config/navigation/faculty";

import type { LoginRole } from "@/config/roles";
import { hasPermission, type UserPermissionContext } from "@/lib/permissions";
import { getNavigationByRole } from "./navigation/index";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. Empty = everyone. */
  roles?: LoginRole[];
  requiredFlags?: string[];
  moduleId?: string;
  requiredPermission?: "read" | "create" | "update" | "delete" | "approve";
  badge?: string;
  children?: { title: string; url: string; moduleId?: string }[] | undefined;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const studentNavigation: NavSection[] = [
  {
    label: "Student Workspace",
    items: [
      { title: "Dashboard", url: "/student/dashboard", icon: LayoutDashboard },
      { title: "Digital Notice Board", url: "/communication", icon: ClipboardList },
      { title: "Learning Management", url: "/student/lms", icon: BookOpen },
      { title: "Timetable", url: "/student/timetable", icon: CalendarRange },
      { title: "Attendance", url: "/student/attendance", icon: ClipboardCheck },
      { title: "Feedback", url: "/student/feedback", icon: MessageSquare },
      { title: "Course Registrations", url: "/student/examinations", icon: FileText },
      { title: "Discussion Forum", url: "/student/discussion-forum", icon: MessageCircle },
      { title: "Payments", url: "/student/finance", icon: CreditCard },
      { title: "OPAC", url: "/student/library", icon: Library },
      { title: "Updates", url: "/student/updates", icon: Sparkles },
      { title: "Webinars", url: "/student/webinars", icon: Video },
      { title: "Student ID Card", url: "/student/id-card", icon: BadgeCheck },
      { title: "My Profile", url: "/student/profile", icon: User },
    ],
  },
];

export const PLACEMENT_OFFICER_NAVIGATION: NavSection[] = [
  {
    label: "Placement Officer Portal",
    items: [
      { title: "Dashboard", url: "/placement/dashboard", icon: LayoutDashboard },
      { title: "Companies", url: "/placement/companies", icon: Building2 },
      { title: "Recruiters", url: "/placement/recruiters", icon: UserCheck },
      { title: "Placement Drives", url: "/placement/drives", icon: Briefcase },
      { title: "Eligible Students", url: "/placement/students", icon: GraduationCap },
      { title: "Applications", url: "/placement/applications", icon: ClipboardList },
      { title: "Assessment Management", url: "/placement/assessments", icon: FileCheck2 },
      { title: "Assessment Requests", url: "/placement/assessment-requests", icon: FileCheck2, badge: "Pending" },
      { title: "Interview Management", url: "/placement/interviews", icon: Video },
      { title: "Offers", url: "/placement/offers", icon: Award },
      { title: "Analytics", url: "/placement/analytics", icon: BarChart3 },
      { title: "Reports", url: "/placement/reports", icon: FileSpreadsheet },
      { title: "Notifications", url: "/placement/notifications", icon: Bell },
      { title: "Settings", url: "/placement/settings", icon: Settings },
    ],
  },
];

export const navigation: NavSection[] = [
  {
    label: "Menu",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Approval Workflows", url: "/approval-workflows", icon: GitBranch, badge: "Diagram", roles: ["super-admin"] },
      { title: "AI & Analytics", url: "/ai-analytics", icon: BarChart3, roles: ["super-admin"] },
      { title: "Emergency Broadcast", url: "/emergency", icon: Siren, roles: ["super-admin"], badge: "Instant" },
    ],
  },
  {
    label: "Academics",
    items: [
      { title: "Pre-Admission Portal", url: "/pre-admission", icon: School, moduleId: "pre-admission" },
      { title: "Admission Office", url: "/admission", icon: GraduationCap, moduleId: "admission" },
      { title: "Academics", url: "/academics", icon: GraduationCap, moduleId: "academics" },
      { title: "Students", url: "/students", icon: Users, moduleId: "student-info", roles: ["super-admin", "staff"] },
      { title: "Faculty", url: "/faculty", icon: UserCog, moduleId: "hrms" },
      { title: "Attendance", url: "/attendance", icon: CalendarCheck, moduleId: "attendance" },
      { title: "Timetable", url: "/timetable", icon: CalendarRange, moduleId: "academics" },
      { title: "LMS", url: "/lms", icon: BookOpen, moduleId: "lms" },
    ],
  },
  {
    label: "Examinations",
    items: [
      {
        title: "Examinations",
        url: "/examinations",
        icon: FileSpreadsheet,
        moduleId: "examination",
        roles: ["super-admin", "staff"],
        children: [
          { title: "Dashboard", url: "/examinations", moduleId: "examination" },
          { title: "Exam Schedule", url: "/examinations/schedule", moduleId: "examination" },
          { title: "Hall Tickets", url: "/examinations/hall-tickets", moduleId: "examination" },
          { title: "Internal Marks", url: "/examinations/internal-marks", moduleId: "examination" },
          { title: "Revaluation", url: "/examinations/revaluation", moduleId: "examination" },
          { title: "Exam Analytics", url: "/examinations/analytics", moduleId: "examination" },
          { title: "Reports", url: "/examinations/reports", moduleId: "examination" },
          { title: "Notifications", url: "/examinations/notifications", moduleId: "examination" },
        ],
      },
      { title: "Results", url: "/results", icon: Award, moduleId: "examination" },
    ],
  },
  {
    label: "Campus Services",
    items: [
      { title: "Library", url: "/library", icon: Library, moduleId: "library" },
      { title: "Transport", url: "/transport", icon: Bus, moduleId: "transport" },
      { title: "Placements", url: "/placements", icon: Briefcase, moduleId: "placement" },
      { title: "Inventory", url: "/inventory", icon: Package, moduleId: "inventory" },
      { title: "Procurement", url: "/procurement", icon: Package, moduleId: "procurement" },
      { title: "Campus Events", url: "/campus-events", icon: CalendarRange, moduleId: "events" },
      { title: "Grievances", url: "/grievance", icon: ShieldAlert, moduleId: "grievance" },
      {
        title: "Alumni Network",
        url: "/alumni",
        icon: Globe,
        moduleId: "alumni",
        children: [
          { title: "Dashboard", url: "/alumni?tab=dashboard" },
          { title: "Directory", url: "/alumni?tab=directory" },
          { title: "Analytics", url: "/alumni?tab=analytics" },
        ],
      },
      {
        title: "Alumni Intelligence",
        url: "/super-admin/alumni-analytics",
        icon: Brain,
        roles: ["super-admin", "staff"],
        children: [
          { title: "Overview", url: "/super-admin/alumni-analytics?tab=overview" },
          { title: "Demographics", url: "/super-admin/alumni-analytics?tab=demographics" },
          { title: "Career Intelligence", url: "/super-admin/alumni-analytics?tab=careers" },
          { title: "Engagement", url: "/super-admin/alumni-analytics?tab=engagement" },
          { title: "Mentorship", url: "/super-admin/alumni-analytics?tab=mentorship" },
          { title: "Referrals", url: "/super-admin/alumni-analytics?tab=referrals" },
          { title: "Donations", url: "/super-admin/alumni-analytics?tab=donations" },
          { title: "Events", url: "/super-admin/alumni-analytics?tab=events" },
          { title: "IQAC Feedback", url: "/super-admin/alumni-analytics?tab=feedback" },
          { title: "Department Comparative", url: "/super-admin/alumni-analytics?tab=departments" }
        ],
      },
    ],
  },
];

function resolveUrlForUser(url: string, user: UserPermissionContext, title?: string): string {
  // Preserve standalone module URLs without rewriting
  if (
    url.startsWith("/librarian") ||
    url.startsWith("/transport") ||
    url.startsWith("/staff") ||
    url.startsWith("/alumni") ||
    url.startsWith("/super-admin") ||
    url.startsWith("/super-admin/alumni-analytics") ||
    [
      "/employee-management",
      "/leave",
      "/payroll",
      "/inventory",
      "/procurement",
      "/campus-events",
      "/pre-admission",
      "/admission",
      "/accreditation",
      "/grievance",
      "/alumni",
      "/approval-workflows",
      "/emergency",
      "/super-admin/emergency",
    ].includes(url)
  ) {
    return url;
  }

  const role = user.role;
  const flags = user.flags;

  if (role === "super-admin" || role === "super_admin") {
    return url === "/dashboard" ? "/super-admin/dashboard" : url;
  }

  if (role === "student") {
    if (url === "/dashboard") return "/student/dashboard";
    if (url === "/academics") return "/student/courses";
    if (url === "/examinations") return "/student/examinations";
    if (url === "/results") return "/student/examinations";
    if (url === "/finance") return "/student/finance";
    if (url === "/attendance") return "/student/attendance";
    if (url === "/lms") return "/student/lms";
    if (url === "/settings") return "/student/profile";
    if (url === "/timetable") return "/student/timetable";
    if (url === "/library") return "/student/library";
    if (url === "/grievance" || url === "/feedback") return "/student/feedback";
    if (url === "/discussion-forum") return "/student/discussion-forum";
    if (url === "/id-card") return "/student/id-card";
  }

  if (role === "parent") {
    if (url === "/dashboard") return "/parent/dashboard";
    if (url === "/attendance") return "/parent/attendance";
    if (url === "/finance") return "/parent/fees";
    if (url === "/transport") return "/parent/transport";
    if (url === "/settings") return "/parent/dashboard";
  }

  if (role === "staff") {
    if (flags.includes("isHod")) {
      if (url === "/dashboard") return "/hod/dashboard";
      if (url === "/settings") return "/faculty/profile";
      if (url === "/attendance") return "/attendance";
      if (url === "/timetable") return "/timetable";
      if (url === "/examinations") return "/examinations";
      if (url === "/results") return "/results";
      if (url === "/faculty") return "/faculty";
      if (url === "/students") return "/students";
      if (url === "/academics") return "/academics";
    }
    if (flags.includes("isDean")) {
      if (url === "/dashboard") return "/dean/dashboard";
      if (url === "/settings") return "/faculty/profile";
      if (url === "/subject-allocation" || title === "Subject Allocation" || title === "Workload") return "/dean/subject-allocation";
      return url;
    }
    if (flags.includes("isExamController") || flags.includes("isExamAssistant")) {
      if (url === "/dashboard" || url === "/examinations") return "/examcell/dashboard";
      if (url === "/settings") return "/faculty/profile";
    }
    if (flags.includes("isPlacementOfficer")) {
      if (url === "/dashboard" || url === "/placements") return "/placement/dashboard";
      if (url === "/students") return "/placement/students";
      if (url === "/settings") return "/placement/settings";
      if (title === "Companies") return "/placement/companies";
      if (title === "Drives") return "/placement/drives";
      if (title === "Students") return "/placement/students";
    }
    if (flags.includes("isLibraryAdmin")) {
      if (url === "/dashboard" || url === "/library") return "/library/dashboard";
      if (url === "/settings") return "/faculty/profile";
      if (title === "Books" || title === "Search Catalogue" || title === "Catalogue")
        return "/library/books";
      if (title === "Issues" || title === "Circulation") return "/library/issues";
    }
    if (flags.includes("isTransportOfficer")) {
      if (url === "/dashboard" || url === "/transport") return "/transport/dashboard";
      if (url === "/settings") return "/faculty/profile";
      if (title === "Routes") return "/transport/routes";
      if (title === "Buses" || title === "Vehicles") return "/transport/buses";
    }
    if (flags.includes("isHRManager")) {
      if (url === "/dashboard" || url === "/hr") return "/hr/dashboard";
      if (url === "/settings") return "/faculty/profile";
      if (title === "Employees") return "/hr/employees";
      if (title === "Payroll") return "/hr/payroll";
    }
    if (flags.includes("isFinanceOfficer")) {
      if (url === "/dashboard" || url === "/finance") return "/finance/dashboard";
      if (url === "/settings") return "/faculty/profile";
      if (title === "Fees") return "/finance/fees";
      if (title === "Reports") return "/finance/reports";
    }

    if (url === "/dashboard") return "/faculty/dashboard";
    if (url === "/attendance") return "/faculty/attendance";
    if (url === "/lms") return "/faculty/lms";
    if (url === "/examinations") {
      return flags.includes("isExamAssistant") ? "/examcell/dashboard" : "/faculty/evaluation-and-marks";
    }
    if (url === "/results") return "/faculty/results";
    if (url === "/settings") return "/faculty/profile";
  }

  if (role === "external-user") {
    if (url === "/dashboard") return "/external-user/dashboard";
    if (url === "/settings") return "/external-user/dashboard";
  }

  return url;
}

export const RECRUITER_NAVIGATION: NavSection[] = [
  {
    label: "Recruiter Portal",
    items: [
      { title: "Dashboard", url: "/external-user/dashboard?module=dashboard", icon: LayoutDashboard },
      { title: "Company Profile", url: "/external-user/dashboard?module=company-profile", icon: Building2 },
      { title: "Placement Drives", url: "/external-user/dashboard?module=placement-drives", icon: Briefcase },
      { title: "Assessments", url: "/external-user/dashboard?module=assessments", icon: FileCheck2 },
      { title: "Question Bank", url: "/external-user/dashboard?module=question-bank", icon: Database },
      { title: "Assessment Requests", url: "/external-user/dashboard?module=assessment-requests", icon: Send },
      { title: "Interview Management", url: "/external-user/dashboard?module=interviews", icon: Video },
      { title: "Offer Management", url: "/external-user/dashboard?module=offers", icon: Award },
      { title: "Reports", url: "/external-user/dashboard?module=reports", icon: BarChart3 },
      { title: "Notifications", url: "/external-user/dashboard?module=notifications", icon: Bell },
      { title: "Support", url: "/external-user/dashboard?module=support", icon: HelpCircle },
      { title: "Profile & Security", url: "/external-user/dashboard?module=profile-security", icon: ShieldCheck },
    ],
  },
];

export const SUPER_ADMIN_NAVIGATION: NavSection[] = [
  {
    label: "Super Admin Control Center",
    items: [
      { title: "Super Admin Cockpit", url: "/super-admin/dashboard", icon: ShieldCheck, badge: "Master" },
      { title: "Exam Notifications", url: "/super-admin/exam-notifications", icon: Bell, badge: "Live" },
      { title: "Acceptance Requests", url: "/super-admin/approval-requests", icon: CheckSquare, badge: "Pending" },
      { title: "Emergency Broadcast", url: "/emergency", icon: Siren, badge: "Instant" },
      { title: "Approval Workflows", url: "/approval-workflows", icon: GitBranch, badge: "Diagram" },
      { title: "AI System Health", url: "/ai-analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Academics & Admissions",
    items: [
      { title: "Pre-Admission Portal", url: "/super-admin/pre-admission", icon: School },
      { title: "Admission Office", url: "/admission", icon: GraduationCap },
      { title: "Academic Management", url: "/academics", icon: GraduationCap },
      { title: "Students Directory", url: "/students", icon: Users },
      { title: "Faculty & Staff HR", url: "/faculty", icon: UserCog },
      { title: "Attendance & Biometrics", url: "/attendance", icon: CalendarCheck },
      { title: "Master Timetable", url: "/timetable", icon: CalendarRange },
      { title: "LMS & Learning", url: "/super-admin/lms", icon: BookOpen },
    ],
  },
  {
    label: "Examinations & Evaluation",
    items: [
      {
        title: "Examinations",
        url: "/examinations",
        icon: FileSpreadsheet,
        children: [
          { title: "Dashboard", url: "/examinations" },
          { title: "Exam Schedule", url: "/examinations/schedule" },
          { title: "Hall Tickets", url: "/examinations/hall-tickets" },
          { title: "Internal Marks", url: "/examinations/internal-marks" },
          { title: "Revaluation", url: "/examinations/revaluation" },
          { title: "Exam Analytics", url: "/examinations/analytics" },
          { title: "Reports", url: "/examinations/reports" },
          { title: "Notifications", url: "/super-admin/exam-notifications" },
        ],
      },
      { title: "Results & Grade Cards", url: "/results", icon: Award },
    ],
  },
  {
    label: "Campus Services & Facilities",
    items: [
      { title: "Library Management", url: "/library", icon: Library },
      { title: "Transport & Fleet Management", url: "/transport", icon: Bus },
      { title: "Placements & Recruiters", url: "/placements", icon: Briefcase },
      { title: "Payroll Management", url: "/super-admin/payroll", icon: CreditCard, badge: "ERP" },
      { title: "Financial Ledger & Fees", url: "/finance", icon: Wallet },
      { title: "Inventory & Assets", url: "/inventory", icon: Package },
      { title: "Procurement & Purchases", url: "/procurement", icon: Package },
      { title: "Campus Events", url: "/campus-events", icon: CalendarRange },
      { title: "Grievances & Support", url: "/grievance", icon: ShieldAlert },
      { title: "Alumni Network", url: "/alumni", icon: Globe },
    ],
  },
  {
    label: "Executive Deans Portfolios",
    items: [
      { title: "Academic Dean", url: "/staff/academic-dean", icon: GraduationCap },
      { title: "Student Dean", url: "/staff/student-dean", icon: Users },
      { title: "IQAC Quality", url: "/staff/iqac", icon: BadgeCheck },
      { title: "IMA Governance", url: "/staff/ima", icon: Building2 },
      { title: "Research & Dev", url: "/staff/research-development", icon: TrendingUp },
      { title: "Finance Dean", url: "/staff/finance-dean", icon: Wallet },
      { title: "Examination Dean", url: "/staff/examination-dean", icon: FileSpreadsheet },
      { title: "Placement Dean", url: "/staff/placement-dean", icon: Briefcase },
    ],
  },
];


export function navigationForUser(user: UserPermissionContext, currentPath?: string): NavSection[] {
  // Path-based Dean portfolio navigation matching (guarantees ONLY that dean's sidebar is shown)
  if (currentPath) {
    if (currentPath.startsWith("/librarian")) return LIBRARIAN_NAVIGATION;
    if (currentPath.startsWith("/transport")) return TRANSPORT_NAVIGATION;
    if (currentPath.startsWith("/staff/academic-dean")) return ACADEMIC_DEAN_NAVIGATION;
    if (currentPath.startsWith("/staff/student-dean")) return STUDENT_DEAN_NAVIGATION;
    if (currentPath.startsWith("/staff/iqac")) return IQAC_NAVIGATION;
    if (currentPath.startsWith("/staff/ima")) return IMA_NAVIGATION;
    if (currentPath.startsWith("/staff/research-development")) return RESEARCH_NAVIGATION;
    if (currentPath.startsWith("/staff/finance-dean")) return FINANCE_NAVIGATION;
    if (currentPath.startsWith("/staff/examination-dean")) return EXAMINATION_NAVIGATION;
    if (currentPath.startsWith("/staff/placement-dean")) return PLACEMENT_NAVIGATION;
  }

  // Super Admin Navigation
  if (user.role === "super-admin" || user.role === "super_admin") {
    return SUPER_ADMIN_NAVIGATION;
  }

  // If user has isExamController (Officer), return the exact sidebar configurations
  if (user.role === "staff" && user.flags.includes("isExamController")) {
    return [
      {
        label: "Exam Officer Portal",
        items: [
          { title: "Dashboard", url: "/examcell/dashboard", icon: LayoutDashboard },
          { title: "Examcell Updates", url: "/examcell/updates", icon: CalendarCheck },
          { title: "Hall Ticket Control", url: "/examcell/hall-tickets", icon: UserCog },
          { title: "Correction Analysis", url: "/examcell/correction-analysis", icon: FileText },
          { title: "Results Publisher", url: "/examcell/results", icon: Award },
          { title: "Exam Analytics", url: "/examcell/analytics", icon: BarChart3 },
          { title: "Bloomstick Analysis", url: "/examcell/bloomstick", icon: Brain },
          { title: "Notifications", url: "/examcell/notifications", icon: Bell },
          { title: "My Profile", url: "/faculty/profile", icon: Settings }
        ]
      }
    ];
  }

  // Central Exam Assistant Portal Navigation
  if (user.role === "staff" && user.flags.includes("isExamAssistant")) {
    return [
      {
        label: "Central Exam Assistant Portal",
        items: [
          { title: "Dashboard", url: "/examcell/dashboard", icon: LayoutDashboard },
          { title: "Course & Exam Enroll", url: "/examcell/course-enroll", icon: FileSpreadsheet },
          { title: "Schedule Exam", url: "/examcell/schedule", icon: CalendarRange },
          { title: "Timetable Builder", url: "/examcell/timetable", icon: CalendarCheck },
          { title: "Hall Ticket Control", url: "/examcell/hall-tickets", icon: Ticket },
          { title: "Correction Requests", url: "/examcell/correction-requests", icon: ClipboardList },
          { title: "Question Bank", url: "/examcell/questions", icon: Database },
          { title: "Bloomstick Analysis", url: "/examcell/bloomstick", icon: Brain },
          { title: "Supplementary Students", url: "/examcell/supplementary", icon: Users },
          { title: "Notifications", url: "/examcell/notifications", icon: Bell },
          { title: "My Profile", url: "/faculty/profile", icon: Settings },
        ],
      },
    ];
  }

  // Librarian Portal Navigation
  if (user.role === "librarian" || user.flags.includes("isLibraryAdmin")) {
    return LIBRARIAN_NAVIGATION;
  }

  // Transport Portal Navigation
  if (user.role === "transport" || user.flags.includes("isTransportOfficer")) {
    return TRANSPORT_NAVIGATION;
  }

  // Student Portal Navigation
  if (user.role === "student") {
    return studentNavigation;
  }

  // Dean specific navigation — each dean sees ONLY their own modules
  const deanKey = (user.externalPersona || user.role) as LoginRole;
  if (deanKey) {
    const deanNav = getNavigationByRole(deanKey);
    if (deanNav && deanNav.length > 0) {
      return deanNav;
    }
  }
  // Legacy generic dean flag fallback (isDean without specific role)
  if (user.role !== "super-admin" && user.flags.includes("isDean")) {
    return getNavigationByRole("academic_dean" as any);
  }
  // Placement Officer specific navigation menu
  if (user.role !== "super-admin" && (user.role === "placement" || user.flags.includes("isPlacementOfficer"))) {
    return PLACEMENT_OFFICER_NAVIGATION;
  }

  // Corporate Recruiter ATS Navigation
  if (user.role === "external-user" && (user.externalPersona === "recruiter" || !user.externalPersona)) {
    return RECRUITER_NAVIGATION;
  }


  // Check if staff has administrative flags
  const isAdminStaff = user.flags.some(flag => 
    ["isHod", "isDean", "isExamController", "isPlacementOfficer", "isLibraryAdmin", 
     "isTransportOfficer", "isHRManager", "isFinanceOfficer"].includes(flag)
  );

  // Faculty Workspace Navigation (Applies to faculty role and standard staff without admin flags)
  const isFacultyUser = (user.role === "faculty" || user.role === "staff") && !isAdminStaff && !user.flags.includes("isExamAssistant");
  if (isFacultyUser) {
    return FACULTY_NAVIGATION;
  }

  const isStaff = user.role === "staff" || user.role === "faculty";
  const isExamAssistant = isStaff && user.flags.includes("isExamAssistant");

  return navigation
    .map((section) => {
      // If user is standard faculty, completely skip the Examinations section
      if (section.label === "Examinations" && isStaff && !isExamAssistant) {
        return {
          ...section,
          items: [],
        };
      }

      let items = section.items
        .filter((item) => {
          const isFaculty = user.role === "faculty" || user.role === "staff";
          const isHod = user.role === "hod" || user.flags.includes("isHod");
          const hasAdmissionAccess =
            user.role === "super-admin" ||
            user.role === "super_admin" ||
            user.role === "admin" ||
            user.flags.includes("isSystemAdmin") ||
            user.flags.includes("isAdmissionOfficer") ||
            user.flags.includes("isPrincipal") ||
            user.flags.includes("isVicePrincipal");

          // Completely remove Pre-Admission and Admission for Faculty / Staff users without explicit admission privileges
          if (
            (isFaculty || isHod) &&
            !hasAdmissionAccess &&
            (item.title === "Pre-Admission Portal" ||
              item.title === "Admission Office" ||
              item.url === "/pre-admission" ||
              item.url === "/admission" ||
              item.moduleId === "pre-admission" ||
              item.moduleId === "admission")
          ) {
            return false;
          }

          // Hide Library, Hostel, and Transport for HOD users
          if (
            isHod &&
            (item.title === "Library" ||
              item.url === "/library" ||
              item.moduleId === "library" ||
              item.title === "Hostel" ||
              item.url === "/hostel" ||
              item.moduleId === "hostel" ||
              item.title === "Transport" ||
              item.url === "/transport" ||
              item.moduleId === "transport")
          ) {
            return false;
          }

          // 1. Role level filtering (optional explicit block)
          if (item.roles && !item.roles.includes(user.role)) {
            return false;
          }

          // Hide separate root Results link for staff since it's now inside Examinations dropdown
          if (item.title === "Results" && isStaff) {
            return false;
          }

          // 2. Privilege flag filtering
          if (item.requiredFlags && !item.requiredFlags.some((flag) => user.flags.includes(flag))) {
            return false;
          }

          // 3. Module permission check
          if (item.moduleId) {
            const action = item.requiredPermission || "read";
            const perm = hasPermission(user, item.moduleId, action);
            return perm.allowed;
          }

          return true;
        })
        .map((item): NavItem => {
          const newUrl = resolveUrlForUser(item.url, user, item.title);
          let newChildren = item.children?.map((child) => ({
            ...child,
            url: resolveUrlForUser(child.url, user, child.title),
          }));

          // If the user is an Exam Assistant / Faculty, inject the exact assistant modules into the "Examinations" children dropdown!
          if (item.title === "Examinations" && isStaff && isExamAssistant) {
            newChildren = [
              { title: "Dashboard", url: "/examcell/dashboard" },
              { title: "Course & Exam Enroll", url: "/examcell/course-enroll" },
              { title: "Schedule Exam", url: "/examcell/schedule" },
              { title: "Timetable Builder", url: "/examcell/timetable" },
              { title: "Hall Tickets", url: "/examcell/hall-tickets" },
              { title: "Correction Requests", url: "/examcell/correction-requests" },
              { title: "Question Bank", url: "/examcell/questions" },
              { title: "Results", url: "/examcell/results" },
              { title: "Exam Analytics", url: "/examcell/analytics" },
              { title: "Supplementary Students", url: "/examcell/supplementary" },
              { title: "Notifications", url: "/examcell/notifications" }
            ].map(c => ({
              ...c,
              moduleId: "examination",
              url: resolveUrlForUser(c.url, user, c.title)
            }));
          } else if (item.title === "Examinations" && isStaff && !isExamAssistant && !isExamController) {
            newChildren = undefined;
          }

          let title = item.title;
          let icon = item.icon;
          if (item.title === "Settings") {
            title = "My Profile";
            icon = User;
          }

          return {
            ...item,
            title,
            icon,
            url: newUrl,
            children: newChildren,
          };
        });

      // For standard staff, append Evaluations & Marks link inside Academics section
      if (section.label === "Academics" && isStaff && !isExamAssistant) {
        items = [
          ...items,
          {
            title: "Evaluations & Marks",
            url: resolveUrlForUser("/faculty/evaluation-and-marks", user, "Evaluations & Marks"),
            icon: FileSpreadsheet,
          } as NavItem
        ];
      }

      return {
        ...section,
        items,
      };
    })
    .filter((section) => section.items.length > 0);
}
