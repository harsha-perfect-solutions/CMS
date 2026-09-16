import type { LoginRole, DepartmentCode, ExternalPersona } from "@/config/roles";

export type PermissionAction = "read" | "create" | "update" | "delete" | "approve";

export type PermissionScope = "own" | "department" | "school" | "campus" | "institution" | "global";

export interface UserPermissionContext {
  role: LoginRole;
  flags: string[];
  department?: DepartmentCode | undefined;
  externalPersona?: ExternalPersona | undefined;
  featureFlags?: Record<string, boolean> | undefined;
}

// Module IDs mapping:
// admission, student-info, academics, attendance, examination, lms, placement, hostel, transport, library, finance, hrms, inventory, accreditation, communication, grievance, alumni

export interface ModulePermissions {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  approve: boolean;
  scope: PermissionScope;
}

// Helper to check if a specific staff flag grants admin control over a module
export function getFlagOverrideForModule(
  flags: string[],
  moduleId: string,
): Partial<ModulePermissions> | null {
  if (flags.includes("isSystemAdmin") || flags.includes("isPrincipal")) {
    return { read: true, create: true, update: true, delete: true, approve: true, scope: "global" };
  }

  switch (moduleId) {
    case "admission":
      if (flags.includes("isPrincipal") || flags.includes("isVicePrincipal")) {
        return {
          read: true,
          create: true,
          update: true,
          delete: true,
          approve: true,
          scope: "institution",
        };
      }
      break;
    case "student-info":
      if (flags.includes("isHod")) {
        return {
          read: true,
          create: true,
          update: true,
          delete: true,
          approve: true,
          scope: "department",
        };
      }
      if (flags.includes("isClassAdvisor") || flags.includes("isMentor")) {
        return {
          read: true,
          create: false,
          update: true,
          delete: false,
          approve: false,
          scope: "department",
        };
      }
      break;
    case "academics":
      if (flags.includes("isDean")) {
        return {
          read: true,
          create: true,
          update: true,
          delete: true,
          approve: true,
          scope: "school",
        };
      }
      if (flags.includes("isHod")) {
        return {
          read: true,
          create: true,
          update: true,
          delete: false,
          approve: true,
          scope: "department",
        };
      }
      break;
    case "attendance":
      if (flags.includes("isHod")) {
        return {
          read: true,
          create: true,
          update: true,
          delete: true,
          approve: true,
          scope: "department",
        }; // Attendance override
      }
      break;
    case "examination":
      if (flags.includes("isExamController")) {
        return {
          read: true,
          create: true,
          update: true,
          delete: true,
          approve: true,
          scope: "global",
        };
      }
      if (flags.includes("isHod")) {
        return {
          read: true,
          create: true,
          update: true,
          delete: false,
          approve: true,
          scope: "department",
        };
      }
      break;
    case "placement":
      if (flags.includes("isPlacementOfficer")) {
        return {
          read: true,
          create: true,
          update: true,
          delete: true,
          approve: true,
          scope: "global",
        };
      }
      break;
    case "hostel":
      if (flags.includes("isHostelWarden")) {
        return {
          read: true,
          create: true,
          update: true,
          delete: true,
          approve: true,
          scope: "global",
        };
      }
      break;
    case "transport":
      if (flags.includes("isTransportOfficer")) {
        return {
          read: true,
          create: true,
          update: true,
          delete: true,
          approve: true,
          scope: "global",
        };
      }
      break;
    case "library":
      if (flags.includes("isLibraryAdmin")) {
        return {
          read: true,
          create: true,
          update: true,
          delete: true,
          approve: true,
          scope: "global",
        };
      }
      break;
    case "finance":
      if (flags.includes("isFinanceOfficer")) {
        return {
          read: true,
          create: true,
          update: true,
          delete: true,
          approve: true,
          scope: "global",
        };
      }
      break;
    case "hrms":
      if (flags.includes("isHRManager")) {
        return {
          read: true,
          create: true,
          update: true,
          delete: true,
          approve: true,
          scope: "global",
        };
      }
      break;
    case "inventory":
      if (flags.includes("isInventoryManager") || flags.includes("isPurchaseManager")) {
        return {
          read: true,
          create: true,
          update: true,
          delete: true,
          approve: true,
          scope: "global",
        };
      }
      break;
    case "accreditation":
      if (
        flags.includes("isIQACCoordinator") ||
        flags.includes("isNAACCoordinator") ||
        flags.includes("isNBACoordinator")
      ) {
        return {
          read: true,
          create: true,
          update: true,
          delete: false,
          approve: true,
          scope: "global",
        };
      }
      break;
    case "alumni":
      if (flags.includes("isTrainingCoordinator")) {
        return {
          read: true,
          create: true,
          update: true,
          delete: false,
          approve: false,
          scope: "global",
        };
      }
      break;
  }

  return null;
}

// Get the base permissions for a core login role
export function getBasePermissions(
  role: LoginRole,
  moduleId: string,
  externalPersona?: ExternalPersona,
): ModulePermissions {
  const denyAll: ModulePermissions = {
    read: false,
    create: false,
    update: false,
    delete: false,
    approve: false,
    scope: "own",
  };

  if (role === "super-admin" || role === "super_admin") {
    return { read: true, create: true, update: true, delete: true, approve: true, scope: "global" };
  }

  // Deny Admission & Pre-Admission modules to Faculty, Staff, and HOD by default
  if (
    (role === "faculty" || role === "staff" || role === "hod") &&
    (moduleId === "admission" || moduleId === "pre-admission")
  ) {
    return denyAll;
  }

  // Admin and management roles have full access to all modules
  if (
    [
      "admin",
      "principal",
      "vice_principal",
      "dean",
      "hod",
      "faculty",
      "exam_cell",
      "librarian",
      "placement",
      "warden",
      "transport",
      "accounts",
      "lms",
      "alumni_coordinator",
      "staff",
    ].includes(role)
  ) {
    return {
      read: true,
      create: true,
      update: true,
      delete: true,
      approve: true,
      scope: "institution",
    };
  }

  switch (role) {
    case "student":
      // Students have read-only access to most things and own-scoped access
      if (
        [
          "student-info",
          "attendance",
          "examination",
          "lms",
          "results",
          "library",
          "transport",
          "hostel",
          "campus-events",
          "events",
        ].includes(moduleId)
      ) {
        return {
          read: true,
          create: false,
          update: false,
          delete: false,
          approve: false,
          scope: "own",
        };
      }
      if (moduleId === "finance") {
        return {
          read: true,
          create: true,
          update: false,
          delete: false,
          approve: false,
          scope: "own",
        }; // Pay fees
      }
      if (moduleId === "grievance") {
        return {
          read: true,
          create: true,
          update: false,
          delete: false,
          approve: false,
          scope: "own",
        }; // Raise grievance
      }
      break;

    case "parent":
      // Parents view their child's data
      if (
        [
          "student-info",
          "attendance",
          "examination",
          "results",
          "finance",
          "transport",
          "campus-events",
          "events",
        ].includes(moduleId)
      ) {
        return {
          read: true,
          create: false,
          update: false,
          delete: false,
          approve: false,
          scope: "own",
        };
      }
      break;

    case "external-user":
      // External User access depends on the sub-persona
      if (!externalPersona) return denyAll;

      if (externalPersona === "applicant" && moduleId === "admission") {
        return {
          read: true,
          create: true,
          update: true,
          delete: false,
          approve: false,
          scope: "own",
        };
      }
      if (externalPersona === "alumni" && moduleId === "alumni") {
        return {
          read: true,
          create: false,
          update: true,
          delete: false,
          approve: false,
          scope: "own",
        };
      }
      if (externalPersona === "recruiter" && moduleId === "placement") {
        return {
          read: true,
          create: true,
          update: true,
          delete: false,
          approve: false,
          scope: "own",
        };
      }
      if (externalPersona === "vendor" && (moduleId === "inventory" || moduleId === "procurement")) {
        return {
          read: true,
          create: false,
          update: true,
          delete: false,
          approve: false,
          scope: "own",
        };
      }
      if (externalPersona === "guest-faculty" && (moduleId === "academics" || moduleId === "events" || moduleId === "campus-events")) {
        return {
          read: true,
          create: false,
          update: false,
          delete: false,
          approve: false,
          scope: "own",
        };
      }
      break;
  }

  return denyAll;
}

// Master permission checker
// Formula: Permission = Role + Privilege + Module + Action + Scope
export function hasPermission(
  user: UserPermissionContext,
  moduleId: string,
  action: PermissionAction,
): { allowed: boolean; scope: PermissionScope } {
  // 0. Faculty, Staff, and HOD Role Restrictions for Admission and Pre-Admission
  const isFacultyUser = user.role === "faculty" || user.role === "staff";
  const isHodUser = user.role === "hod" || user.flags?.includes("isHod");
  const hasAdmissionPrivilege =
    user.role === "super-admin" ||
    user.role === "super_admin" ||
    user.role === "admin" ||
    user.flags?.includes("isSystemAdmin") ||
    user.flags?.includes("isAdmissionOfficer") ||
    user.flags?.includes("isPrincipal") ||
    user.flags?.includes("isVicePrincipal");

  if ((isFacultyUser || isHodUser) && !hasAdmissionPrivilege) {
    if (moduleId === "admission" || moduleId === "pre-admission") {
      return { allowed: false, scope: "own" };
    }
  }

  // 0. HOD Role Restrictions for Library, Hostel, and Transport
  if (isHodUser) {
    if (moduleId === "library" && !user.flags?.includes("isLibraryAdmin")) {
      return { allowed: false, scope: "own" };
    }
    if (moduleId === "hostel" && !user.flags?.includes("isHostelWarden")) {
      return { allowed: false, scope: "own" };
    }
    if (moduleId === "transport" && !user.flags?.includes("isTransportOfficer")) {
      return { allowed: false, scope: "own" };
    }
  }

  // 0. Licensing & Feature Flags Check
  if (user.featureFlags) {
    if (moduleId === "finance" && !user.featureFlags["finance"])
      return { allowed: false, scope: "own" };
    if (moduleId === "hostel" && !user.featureFlags["hostel"]) return { allowed: false, scope: "own" };
    if (moduleId === "transport" && !user.featureFlags["transport"])
      return { allowed: false, scope: "own" };
    if (moduleId === "placement" && !user.featureFlags["placement"])
      return { allowed: false, scope: "own" };
    if (moduleId === "library" && !user.featureFlags["library"])
      return { allowed: false, scope: "own" };
  }

  // 1. Get base permission for the role
  const permissions = getBasePermissions(user.role, moduleId, user.externalPersona);

  // 2. Layer privilege flag overrides on top (if staff or faculty)
  if (user.role === "staff" || user.role === "faculty") {
    const override = getFlagOverrideForModule(user.flags, moduleId);
    if (override) {
      Object.assign(permissions, override);
    }
  }

  // 3. Return allowed status and scope
  return {
    allowed: permissions[action],
    scope: permissions.scope,
  };
}

export function canAccessModule(
  user: UserPermissionContext,
  moduleId: string,
  action: PermissionAction = "read",
): boolean {
  return hasPermission(user, moduleId, action).allowed;
}

export function canAccessRoute(user: UserPermissionContext, routeUrl: string): boolean {
  if (routeUrl === "/dashboard" || routeUrl === "/approval-workflows") return true;

  // Map route URLs to module IDs
  const routeToModuleMap: Record<string, string> = {
    "/pre-admission": "pre-admission",
    "/admission": "admission",
    "/dashboard/pre-admission": "pre-admission",
    "/dashboard/admission": "admission",
    "/academics": "academics",
    "/students": "student-info",
    "/faculty": "hrms",
    "/attendance": "attendance",
    "/timetable": "academics",
    "/lms": "lms",
    "/examinations": "examination",
    "/results": "examination",
    "/library": "library",
    "/hostel": "hostel",
    "/transport": "transport",
    "/placements": "placement",
    "/inventory": "inventory",
    "/procurement": "procurement",
    "/campus-events": "events",
    "/grievance": "grievance",
    "/alumni": "alumni",
    "/employee-management": "hrms",
    "/leave": "hrms",
    "/payroll": "finance",
    "/finance": "finance",
    "/hr": "hrms",
    "/accreditation": "accreditation",
    "/reports": "student-info",
    "/communication": "communication",
  };

  const moduleId = routeToModuleMap[routeUrl];
  if (!moduleId) return true;

  return canAccessModule(user, moduleId, "read");
}

export function getDashboardKeyForUser(user: UserPermissionContext): string {
  const { role, flags } = user;

  if (role === "staff") {
    if (flags.includes("isAdmin") || flags.includes("isOperationsAdmin")) return "admin";
    if (flags.includes("isHod")) return "hod";
    if (flags.includes("isDean")) return "dean";
    if (flags.includes("isExamController")) return "exam_cell";
    if (flags.includes("isPlacementOfficer")) return "placement";
    if (flags.includes("isLibraryAdmin")) return "librarian";
    if (flags.includes("isTransportOfficer")) return "transport";
    if (flags.includes("isHostelWarden")) return "warden";
    if (flags.includes("isFinanceOfficer")) return "accounts";
    if (flags.includes("isPrincipal")) return "principal";
    if (flags.includes("isVicePrincipal")) return "vice_principal";
    if (flags.includes("isSystemAdmin")) return "super_admin";
    return "staff";
  }

  if (role === "super-admin" || role === "super_admin") return "super_admin";
  return role;
}

export function resolveTargetUrlForUser(
  user: UserPermissionContext,
  url: string,
  title?: string,
): string {
  if (
    [
      "/employee-management",
      "/leave",
      "/payroll",
      "/inventory",
      "/procurement",
      "/campus-events",
      "/admission",
      "/accreditation",
      "/grievance",
      "/alumni",
      "/approval-workflows",
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
    if (url === "/results") return "/student/results";
    if (url === "/attendance") return "/student/attendance";
    if (url === "/lms") return "/student/lms";
    if (url === "/settings") return "/student/profile";
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
      if (url === "/faculty") return "/hod/faculty";
      if (url === "/attendance") return "/hod/attendance";
      if (url === "/reports") return "/hod/reports";
      if (url === "/settings") return "/faculty/profile";
    }
    if (flags.includes("isDean")) {
      if (url === "/dashboard") return "/dean/dashboard";
      if (url === "/settings") return "/faculty/profile";
    }
    if (flags.includes("isExamController")) {
      if (url === "/dashboard") return "/examination/dashboard";
      if (url === "/settings") return "/faculty/profile";
    }
    if (flags.includes("isPlacementOfficer")) {
      if (url === "/dashboard" || url === "/placements") return "/placement/dashboard";
      if (url === "/students") return "/placement/students";
      if (url === "/settings") return "/faculty/profile";
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
    if (flags.includes("isHostelWarden")) {
      if (url === "/dashboard" || url === "/hostel") return "/hostel/dashboard";
      if (url === "/settings") return "/faculty/profile";
      if (title === "Rooms" || title === "Allotment") return "/hostel/rooms";
      if (title === "Students") return "/hostel/students";
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
    if (url === "/examinations") return "/faculty/examinations";
    if (url === "/results") return "/faculty/results";
    if (url === "/settings") return "/faculty/profile";
  }

  if (role === "external-user") {
    if (url === "/dashboard") return "/external-user/dashboard";
    if (url === "/settings") return "/external-user/dashboard";
  }

  return url;
}
