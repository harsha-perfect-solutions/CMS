import { Router, Response } from "express";
import { prisma } from "../../db";
import { authenticateToken, AuthenticatedRequest } from "../auth/auth.routes";
import { auditLog } from "../super-admin/super-admin.routes";

const router = Router();

// Helper to compute YYYY-MM-DD date range bounds based on timeframe
function getDateBounds(timeframe: string = "daily", baseDateStr?: string) {
  const baseDate = baseDateStr ? new Date(baseDateStr) : new Date();
  const endDateStr = baseDate.toISOString().split("T")[0];

  const startDateObj = new Date(baseDate);
  if (timeframe === "weekly") {
    startDateObj.setDate(startDateObj.getDate() - 6);
  } else if (timeframe === "monthly") {
    startDateObj.setDate(startDateObj.getDate() - 29);
  }

  const startDateStr = startDateObj.toISOString().split("T")[0];
  return { startDateStr, endDateStr };
}

// Helper to normalize department code and name variations (e.g. "Computer Science & Engineering" -> "CSE")
export function normalizeDeptCode(deptStr?: string): string {
  if (!deptStr) return "";
  const d = deptStr.trim().toUpperCase();
  if (d.includes("COMPUTER") || d.includes("CSE") || d === "CS" || d === "COMP") return "CSE";
  if (d.includes("ELECTRONICS") || d.includes("COMMUNICATION") || d === "ECE") return "ECE";
  if (d.includes("ELECTRICAL") || d === "EEE") return "EEE";
  if (d.includes("MECHANICAL") || d === "ME") return "MECHANICAL";
  if (d.includes("CIVIL") || d === "CE") return "CIVIL";
  if (d.includes("INFORMATION") || d === "IT") return "IT";
  if (d.includes("DATA") || d.includes("AIDS") || d.includes("AI&DS")) return "AI&DS";
  if (d.includes("MACHINE") || d.includes("AIML") || d.includes("AI&ML")) return "AI&ML";
  return d;
}

// Helper to return all database variations for a department or branch code (e.g. "ME" <-> "MECHANICAL")
export function getMatchingDepartments(branchOrDept?: string): string[] {
  if (!branchOrDept) return [];
  const raw = branchOrDept.trim();
  const upper = raw.toUpperCase();
  if (upper === "ME" || upper === "MECHANICAL" || upper.includes("MECHANICAL")) {
    return ["ME", "MECHANICAL", "Mechanical Engineering", "Mechanical"];
  }
  if (upper === "CSE" || upper === "CS" || upper.includes("COMPUTER")) {
    return ["CSE", "CS", "Computer Science & Engineering", "Computer Science"];
  }
  if (upper === "ECE" || upper === "EC" || upper.includes("ELECTRONICS")) {
    return ["ECE", "EC", "Electronics & Communication Engineering", "Electronics"];
  }
  if (upper === "EEE" || upper === "EE" || upper.includes("ELECTRICAL")) {
    return ["EEE", "EE", "Electrical & Electronics Engineering", "Electrical"];
  }
  if (upper === "CIVIL" || upper === "CE" || upper.includes("CIVIL")) {
    return ["CIVIL", "CE", "Civil Engineering", "Civil"];
  }
  if (upper === "IT" || upper.includes("INFORMATION")) {
    return ["IT", "Information Technology"];
  }
  if (upper.includes("AI&DS") || upper.includes("AIDS") || upper.includes("DATA SCIENCE")) {
    return ["AI&DS", "AIDS", "Artificial Intelligence & Data Science"];
  }
  if (upper.includes("AI&ML") || upper.includes("AIML") || upper.includes("MACHINE LEARNING")) {
    return ["AI&ML", "AIML", "Artificial Intelligence & Machine Learning"];
  }
  return [raw, upper];
}

// Authoritative helper to resolve authorized student roster for a timetable session
export async function resolveAuthorizedSessionRoster(timetable: {
  id: string;
  branch: string;
  semester: number;
  section: string;
  courseId?: string | null;
}) {
  const cleanSec = (timetable.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase();

  // 1. Prefer CourseRegistration if present
  if (timetable.courseId) {
    const registrations = await prisma.courseRegistration.findMany({
      where: {
        courseId: timetable.courseId,
        status: "APPROVED",
        student: {
          status: { not: "Inactive" },
        },
      },
      include: { student: true },
      orderBy: { student: { rollNumber: "asc" } },
    });

    if (registrations.length > 0) {
      const sectionFiltered = registrations
        .map((r) => r.student)
        .filter((s) => {
          if (!s.section) return true;
          const sSec = s.section.replace(/^Section\s+/i, "").trim().toUpperCase();
          return sSec === cleanSec;
        });

      const pool = sectionFiltered.length > 0 ? sectionFiltered : registrations.map((r) => r.student);
      return pool.map((s) => ({
        id: s.id,
        rollNumber: s.rollNumber,
        name: s.name,
        department: s.department,
        semester: s.semester,
        section: s.section || cleanSec,
        avatarUrl: s.avatarUrl,
      }));
    }
  }

  // 2. Safe Fallback: Cohort matching with department normalization (e.g. ME <-> MECHANICAL)
  const depts = getMatchingDepartments(timetable.branch);
  const students = await prisma.student.findMany({
    where: {
      department: { in: depts, mode: "insensitive" as const },
      semester: timetable.semester,
      section: { in: [cleanSec, `Section ${cleanSec}`] },
      status: { not: "Inactive" },
    },
    select: {
      id: true,
      rollNumber: true,
      name: true,
      department: true,
      semester: true,
      section: true,
      avatarUrl: true,
    },
    orderBy: { rollNumber: "asc" },
  });

  return students;
}

// Helper to resolve and enforce department RBAC scope
async function resolveDepartmentScope(
  req: AuthenticatedRequest,
  res: Response
): Promise<{ department?: string; isAuthorized: boolean }> {
  const role = (req.userRole || "").toLowerCase();

  if (role === "hod" || role.includes("hod")) {
    let dept = req.userDepartment;
    if (!dept && req.userId) {
      const faculty = await prisma.faculty.findUnique({ where: { id: req.userId } });
      if (faculty?.department) {
        dept = faculty.department;
      }
    }

    if (!dept) {
      res.status(403).json({
        error: "Access denied. HOD department is not configured. Please contact administration.",
      });
      return { isAuthorized: false };
    }

    const normDept = normalizeDeptCode(dept);
    const requestedDept = req.query.department as string;

    if (
      requestedDept &&
      requestedDept !== "All" &&
      requestedDept !== "All Departments" &&
      normDept &&
      normalizeDeptCode(requestedDept) !== normDept
    ) {
      res.status(403).json({
        error: `Access denied. HOD is restricted to viewing ${dept} department data only.`,
      });
      return { isAuthorized: false };
    }

    return { department: normDept || dept, isAuthorized: true };
  }

  const requestedDept = req.query.department as string;
  if (requestedDept && requestedDept !== "All" && requestedDept !== "All Departments") {
    return { department: normalizeDeptCode(requestedDept), isAuthorized: true };
  }

  return { department: undefined, isAuthorized: true };
}

// ==========================================
// 1. DASHBOARD STATS API (TOP 4 KPI CARDS)
// ==========================================
router.get("/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scope = await resolveDepartmentScope(req, res);
    if (!scope.isAuthorized) return;

    const timeframe = (req.query.timeframe as string) || "daily";
    const requestedDate = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const { startDateStr, endDateStr } = getDateBounds(timeframe, requestedDate);

    const studentFilter = scope.department
      ? { user: { department: { contains: scope.department, mode: "insensitive" as const } } }
      : {};

    const timeframeDateFilter = {
      date: { gte: startDateStr, lte: endDateStr },
    };

    const todayDateFilter = {
      date: requestedDate,
    };

    // Calculate timeframe aggregates
    const [
      totalRecordsTimeframe,
      presentTimeframe,
      lateTimeframe,
      todayPresent,
      todayAbsent,
      todayLate,
    ] = await Promise.all([
      prisma.attendanceRecord.count({
        where: { ...studentFilter, ...timeframeDateFilter },
      }),
      prisma.attendanceRecord.count({
        where: { ...studentFilter, ...timeframeDateFilter, status: "Present" },
      }),
      prisma.attendanceRecord.count({
        where: { ...studentFilter, ...timeframeDateFilter, status: "Late" },
      }),
      prisma.attendanceRecord.count({
        where: { ...studentFilter, ...todayDateFilter, status: "Present" },
      }),
      prisma.attendanceRecord.count({
        where: { ...studentFilter, ...todayDateFilter, status: "Absent" },
      }),
      prisma.attendanceRecord.count({
        where: { ...studentFilter, ...todayDateFilter, status: "Late" },
      }),
    ]);

    const attendedTimeframe = presentTimeframe + lateTimeframe;
    const averageAttendance =
      totalRecordsTimeframe > 0
        ? Number(((attendedTimeframe / totalRecordsTimeframe) * 100).toFixed(1))
        : 0;

    const presentTodayCount = todayPresent + todayLate;
    const absentTodayCount = todayAbsent;

    // Calculate Shortage Alerts (<75%)
    // Group records by student to check individual attendance rates
    const groupedStudents = await prisma.attendanceRecord.groupBy({
      by: ["userId", "status"],
      where: { ...studentFilter },
      _count: { id: true },
    });

    const studentTotals: Record<string, { total: number; attended: number }> = {};
    for (const g of groupedStudents) {
      if (!studentTotals[g.userId]) {
        studentTotals[g.userId] = { total: 0, attended: 0 };
      }
      studentTotals[g.userId].total += g._count.id;
      if (g.status === "Present" || g.status === "Late") {
        studentTotals[g.userId].attended += g._count.id;
      }
    }

    let shortageAlertsCount = 0;
    for (const uId in studentTotals) {
      const st = studentTotals[uId];
      if (st.total > 0 && (st.attended / st.total) * 100 < 75) {
        shortageAlertsCount++;
      }
    }

    // Also check timetables/classes with <75% attendance for shortage count if zero student alerts
    const timetables = await prisma.masterTimetable.findMany({
      where: scope.department
        ? { branch: { contains: scope.department, mode: "insensitive" as const } }
        : {},
      select: { id: true },
    });

    if (timetables.length > 0) {
      const ttIds = timetables.map((t) => t.id);
      const classAttGrouped = await prisma.attendanceRecord.groupBy({
        by: ["timetableId", "status"],
        where: {
          timetableId: { in: ttIds },
          ...timeframeDateFilter,
        },
        _count: { id: true },
      });

      const classTotals: Record<string, { total: number; attended: number }> = {};
      for (const cg of classAttGrouped) {
        if (!cg.timetableId) continue;
        if (!classTotals[cg.timetableId]) {
          classTotals[cg.timetableId] = { total: 0, attended: 0 };
        }
        classTotals[cg.timetableId].total += cg._count.id;
        if (cg.status === "Present" || cg.status === "Late") {
          classTotals[cg.timetableId].attended += cg._count.id;
        }
      }

      let classShortageCount = 0;
      for (const tId in classTotals) {
        const ct = classTotals[tId];
        if (ct.total > 0 && (ct.attended / ct.total) * 100 < 75) {
          classShortageCount++;
        }
      }

      shortageAlertsCount = Math.max(shortageAlertsCount, classShortageCount);
    }

    return res.json({
      averageAttendance,
      presentToday: presentTodayCount,
      absentToday: absentTodayCount,
      shortageAlertsCount,
      totalRecords: totalRecordsTimeframe,
      timeframe,
      date: requestedDate,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. ALL CLASSES ATTENDANCE DASHBOARD
// ==========================================
router.get("/classes", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scope = await resolveDepartmentScope(req, res);
    if (!scope.isAuthorized) return;

    const timeframe = (req.query.timeframe as string) || "daily";
    const requestedDate = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const searchQuery = (req.query.search as string || "").trim().toLowerCase();

    const { startDateStr: dailyStart, endDateStr: dailyEnd } = getDateBounds("daily", requestedDate);
    const { startDateStr: weeklyStart, endDateStr: weeklyEnd } = getDateBounds("weekly", requestedDate);
    const { startDateStr: monthlyStart, endDateStr: monthlyEnd } = getDateBounds("monthly", requestedDate);

    const timetables = await prisma.masterTimetable.findMany({
      where: {
        ...(scope.department
          ? { branch: { contains: scope.department, mode: "insensitive" as const } }
          : {}),
      },
      include: { faculty: true, course: true },
      take: 50,
    });

    const ttIds = timetables.map((t) => t.id);

    // Group students by department & semester
    const studentGrouped = await prisma.student.groupBy({
      by: ["department", "semester"],
      _count: { id: true },
    });

    const studentMap: Record<string, number> = {};
    for (const sg of studentGrouped) {
      if (!sg.department) continue;
      const key = `${sg.department.toLowerCase()}-${sg.semester}`;
      studentMap[key] = sg._count.id;
    }

    // Fetch attendance records for daily, weekly, monthly ranges
    const [dailyAtt, weeklyAtt, monthlyAtt] = await Promise.all([
      prisma.attendanceRecord.groupBy({
        by: ["timetableId", "status"],
        where: {
          timetableId: { in: ttIds },
          date: { gte: dailyStart, lte: dailyEnd },
        },
        _count: { id: true },
      }),
      prisma.attendanceRecord.groupBy({
        by: ["timetableId", "status"],
        where: {
          timetableId: { in: ttIds },
          date: { gte: weeklyStart, lte: weeklyEnd },
        },
        _count: { id: true },
      }),
      prisma.attendanceRecord.groupBy({
        by: ["timetableId", "status"],
        where: {
          timetableId: { in: ttIds },
          date: { gte: monthlyStart, lte: monthlyEnd },
        },
        _count: { id: true },
      }),
    ]);

    const buildAttMap = (grouped: typeof dailyAtt) => {
      const map: Record<string, Record<string, number>> = {};
      for (const g of grouped) {
        if (!g.timetableId) continue;
        if (!map[g.timetableId]) map[g.timetableId] = { Present: 0, Absent: 0, Late: 0 };
        map[g.timetableId][g.status] = g._count.id;
      }
      return map;
    };

    const dailyMap = buildAttMap(dailyAtt);
    const weeklyMap = buildAttMap(weeklyAtt);
    const monthlyMap = buildAttMap(monthlyAtt);

    const result = [];

    for (const tt of timetables) {
      const className = `${tt.branch}-${tt.semester}${tt.section.replace(/section\s*/i, "").trim() || "A"}`;
      const teacherName = tt.faculty ? tt.faculty.name : "Faculty Member";

      if (
        searchQuery &&
        !className.toLowerCase().includes(searchQuery) &&
        !teacherName.toLowerCase().includes(searchQuery) &&
        !tt.branch.toLowerCase().includes(searchQuery) &&
        !(tt.course?.code || "").toLowerCase().includes(searchQuery) &&
        !(tt.course?.name || "").toLowerCase().includes(searchQuery)
      ) {
        continue;
      }

      const totalStudents = studentMap[`${tt.branch.toLowerCase()}-${tt.semester}`] || 60;

      const calcPct = (map: Record<string, Record<string, number>>) => {
        const stats = map[tt.id] || { Present: 0, Absent: 0, Late: 0 };
        const total = stats.Present + stats.Absent + stats.Late;
        if (total === 0) return 0;
        return Number((((stats.Present + stats.Late) / total) * 100).toFixed(1));
      };

      const dailyPct = calcPct(dailyMap);
      const weeklyPct = calcPct(weeklyMap);
      const monthlyPct = calcPct(monthlyMap);

      const activeMap = timeframe === "weekly" ? weeklyMap : timeframe === "monthly" ? monthlyMap : dailyMap;
      const activeStats = activeMap[tt.id] || { Present: 0, Absent: 0, Late: 0 };

      const presentCount = activeStats.Present;
      const absentCount = activeStats.Absent;
      const lateCount = activeStats.Late;
      const currentPct = timeframe === "weekly" ? weeklyPct : timeframe === "monthly" ? monthlyPct : dailyPct;

      result.push({
        id: tt.id,
        timetableId: tt.id,
        className,
        department: tt.branch,
        section: tt.section,
        semester: tt.semester,
        courseCode: tt.course ? tt.course.code : `${tt.branch}${tt.semester}01`,
        courseTitle: tt.course ? tt.course.name : "Assigned Subject",
        instructor: teacherName,
        classTeacher: teacherName,
        facultyId: tt.facultyId,
        totalStudents,
        presentCount,
        absentCount,
        lateCount,
        percentage: currentPct,
        dailyPct,
        weeklyPct,
        monthlyPct,
        status: currentPct >= 75 ? "Normal" : "Defaulter Warning",
        governanceStatus: currentPct >= 75 ? "SATISFACTORY" : "SHORTAGE / ACTION REQUIRED",
        date: requestedDate,
      });
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. ATTENDANCE RECORDS LEDGER API
// ==========================================
router.get("/ledger", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scope = await resolveDepartmentScope(req, res);
    if (!scope.isAuthorized) return;

    const statusFilter = req.query.status as string;
    const searchQuery = (req.query.search as string || "").trim();
    const userRoleNorm = (req.userRole || "").toLowerCase();
    const isSuperOrAdmin = ["super_admin", "admin", "principal", "anits_admin"].includes(userRoleNorm);
    const defaultTimeframe = isSuperOrAdmin ? "all" : "daily";
    const timeframe = (req.query.timeframe as string) || defaultTimeframe;
    const requestedDate = req.query.date as string;

    const where: any = {};

    if (scope.department) {
      where.user = { department: { contains: scope.department, mode: "insensitive" as const } };
    }

    if (statusFilter && statusFilter !== "All") {
      where.status = statusFilter;
    }

    if (timeframe && timeframe !== "all" && timeframe !== "All") {
      const { startDateStr, endDateStr } = getDateBounds(timeframe, requestedDate);
      where.date = { gte: startDateStr, lte: endDateStr };
    }

    if (searchQuery) {
      where.OR = [
        { user: { name: { contains: searchQuery, mode: "insensitive" as const } } },
        { user: { rollNumber: { contains: searchQuery, mode: "insensitive" as const } } },
        { user: { department: { contains: searchQuery, mode: "insensitive" as const } } },
        { timetable: { course: { code: { contains: searchQuery, mode: "insensitive" as const } } } },
        { timetable: { course: { name: { contains: searchQuery, mode: "insensitive" as const } } } },
      ];
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        user: true,
        course: true,
        faculty: true,
        timetable: { include: { course: true, faculty: true } },
      },
      orderBy: { date: "desc" },
      take: 200,
    });

    const result = records.map((r) => ({
      id: r.id,
      studentId: r.userId,
      rollNo: r.user ? r.user.rollNumber : "N/A",
      studentName: r.user ? r.user.name : "Student",
      department: r.user?.department || "Unassigned",
      section: r.user?.section || "Unassigned",
      semester: r.user?.semester ?? null,
      date: r.date,
      periodNumber: r.periodNumber || 1,
      status: r.status,
      courseCode: r.course?.code || r.timetable?.course?.code || "N/A",
      courseTitle: r.course?.name || r.timetable?.course?.name || "Subject Lecture",
      instructor: r.faculty?.name || r.timetable?.faculty?.name || "Faculty Member",
    }));

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. CASCADING ATTENDANCE SELECTORS & ROSTER API
// ==========================================

// GET /api/attendance/classes-list: Fetch available classes/semesters for department
router.get("/classes-list", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scope = await resolveDepartmentScope(req, res);
    if (!scope.isAuthorized) return;

    const dept = scope.department || (req.query.department as string);
    if (!dept || dept === "All" || dept === "All Departments") {
      return res.status(400).json({ error: "Department parameter is required." });
    }
    const depts = getMatchingDepartments(dept);

    // Query distinct semesters in Student and MasterTimetable for this department
    const studentSemesters = await prisma.student.groupBy({
      by: ["semester"],
      where: {
        department: { in: depts, mode: "insensitive" as const },
        semester: { not: null },
      },
    });

    const ttSemesters = await prisma.masterTimetable.groupBy({
      by: ["semester"],
      where: {
        branch: { in: depts, mode: "insensitive" as const },
      },
    });

    const semSet = new Set<number>();
    studentSemesters.forEach((s) => { if (s.semester) semSet.add(s.semester); });
    ttSemesters.forEach((t) => { if (t.semester) semSet.add(t.semester); });

    // Default to semesters 1..8 if database empty
    if (semSet.size === 0) {
      [1, 2, 3, 4, 5, 6, 7, 8].forEach((s) => semSet.add(s));
    }

    const sortedSems = Array.from(semSet).sort((a, b) => a - b);
    const classes = sortedSems.map((sem) => {
      const yr = Math.ceil(sem / 2);
      const yearSuffix = yr === 1 ? "1st" : yr === 2 ? "2nd" : yr === 3 ? "3rd" : `${yr}th`;
      return {
        id: String(sem),
        semester: sem,
        year: yr,
        label: `${yearSuffix} Year (Sem ${sem})`,
      };
    });

    return res.json(classes);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/attendance/sections-list: Fetch available sections for selected department + class/semester
router.get("/sections-list", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scope = await resolveDepartmentScope(req, res);
    if (!scope.isAuthorized) return;

    const dept = scope.department || (req.query.department as string);
    if (!dept || dept === "All" || dept === "All Departments") {
      return res.status(400).json({ error: "Department parameter is required." });
    }
    const depts = getMatchingDepartments(dept);
    const semParam = req.query.semester || req.query.classId;
    const sem = semParam ? Number(semParam) : undefined;

    const studentSections = await prisma.student.groupBy({
      by: ["section"],
      where: {
        department: { in: depts, mode: "insensitive" as const },
        ...(sem ? { semester: sem } : {}),
        section: { not: "" },
      },
    });

    const ttSections = await prisma.masterTimetable.groupBy({
      by: ["section"],
      where: {
        branch: { in: depts, mode: "insensitive" as const },
        ...(sem ? { semester: sem } : {}),
      },
    });

    const secSet = new Set<string>();
    studentSections.forEach((s) => {
      if (s.section) {
        const clean = s.section.replace(/^(section\s*|[A-Za-z&]+-?)/i, "").trim() || s.section;
        secSet.add(clean.toUpperCase());
      }
    });

    ttSections.forEach((t) => {
      if (t.section) {
        const clean = t.section.replace(/^(section\s*|[A-Za-z&]+-?)/i, "").trim() || t.section;
        secSet.add(clean.toUpperCase());
      }
    });

    if (secSet.size === 0) {
      ["A", "B"].forEach((sec) => secSet.add(sec));
    }

    const sections = Array.from(secSet).sort();
    return res.json(sections);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/attendance/session-info: Fetch timetable subject/faculty info for class, section, period & date
router.get("/session-info", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scope = await resolveDepartmentScope(req, res);
    if (!scope.isAuthorized) return;

    const dept = scope.department || (req.query.department as string);
    if (!dept || dept === "All" || dept === "All Departments") {
      return res.status(400).json({ error: "Department parameter is required." });
    }
    const depts = getMatchingDepartments(dept);
    const semParam = req.query.semester || req.query.classId;
    const sem = semParam ? Number(semParam) : undefined;
    const section = (req.query.section as string || "").trim();
    const periodNumber = Number(req.query.periodNumber || 1);

    if (!sem || !section) {
      return res.json({ hasSubject: false, message: "Select a class and section to view timetable session details." });
    }

    const tt = await prisma.masterTimetable.findFirst({
      where: {
        branch: { in: depts, mode: "insensitive" as const },
        ...(sem ? { semester: sem } : {}),
        section: { contains: section, mode: "insensitive" as const },
        periodNumber,
      },
      include: { course: true, faculty: true },
    });

    if (!tt) {
      return res.json({
        hasSubject: false,
        message: `No timetable subject assigned for Period ${periodNumber}.`,
      });
    }

    return res.json({
      hasSubject: true,
      timetableId: tt.id,
      subjectCode: tt.course?.code || "N/A",
      subjectName: tt.course?.name || "Department Course",
      facultyName: tt.faculty?.name || "Faculty Member",
      room: tt.roomNo || "Room 101",
      periodNumber: tt.periodNumber || periodNumber,
      day: tt.day || "Today",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/attendance/roster: Fetch real enrolled students with existing PostgreSQL attendance status
router.get("/roster", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scope = await resolveDepartmentScope(req, res);
    if (!scope.isAuthorized) return;

    const semParam = req.query.semester || req.query.classId;
    const section = (req.query.section as string || "").trim();
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const periodNumber = Number(req.query.periodNumber || 2);
    const dept = scope.department || (req.query.department as string);
    if (!dept || dept === "All" || dept === "All Departments") {
      return res.status(400).json({ error: "Department parameter is required." });
    }
    const depts = getMatchingDepartments(dept);

    // DO NOT return students if class or section is missing!
    if (!semParam || !section || semParam === "all" || section === "all") {
      return res.json([]);
    }

    const sem = Number(semParam);

    // Build section filter matching "A", "CSE-A", "Section A", etc.
    const sectionPattern = section.length === 1 ? section : section;

    const students = await prisma.student.findMany({
      where: {
        department: { in: depts, mode: "insensitive" as const },
        ...(isNaN(sem) ? {} : { semester: sem }),
        OR: [
          { section: { contains: sectionPattern, mode: "insensitive" as const } },
          { section: { endsWith: sectionPattern, mode: "insensitive" as const } },
        ],
        status: "Active",
      },
      select: {
        id: true,
        rollNumber: true,
        name: true,
        department: true,
        section: true,
        semester: true,
      },
      take: 100,
      orderBy: { rollNumber: "asc" },
    });

    if (students.length === 0) {
      // Fallback: If section specific search returns empty, fetch active department students for that semester
      const deptStudents = await prisma.student.findMany({
        where: {
          department: { contains: dept, mode: "insensitive" as const },
          ...(isNaN(sem) ? {} : { semester: sem }),
          status: "Active",
        },
        select: {
          id: true,
          rollNumber: true,
          name: true,
          department: true,
          section: true,
          semester: true,
        },
        take: 60,
        orderBy: { rollNumber: "asc" },
      });
      students.push(...deptStudents);
    }

    const studentIds = students.map((s) => s.id);

    // Fetch existing attendance records for these students on that date & period
    const existingRecords = await prisma.attendanceRecord.findMany({
      where: {
        userId: { in: studentIds },
        date,
        periodNumber,
      },
    });

    const recordMap: Record<string, string> = {};
    existingRecords.forEach((r) => {
      recordMap[r.userId] = r.status;
    });

    const formatted = students.map((s) => ({
      id: s.id,
      rollNo: s.rollNumber,
      name: s.name,
      department: s.department || dept,
      section: s.section || section,
      semester: s.semester,
      status: (recordMap[s.id] as "Present" | "Absent" | "Late") || "Present",
    }));

    return res.json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. BULK TRANSACTIONAL ATTENDANCE MARKING API
// ==========================================
router.post("/mark", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const role = (req.userRole || "").toLowerCase();
  if (role === "student" || role === "parent") {
    return res.status(403).json({ error: "Access denied. Students and parents are not permitted to mark or modify attendance." });
  }
  if (role !== "faculty" && role !== "hod" && role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ error: "Access denied. Authorized faculty or administrative privileges required." });
  }

  const { timetableId, date, periodNumber, records } = req.body;

  if (!date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "date (YYYY-MM-DD) and non-empty records array are required." });
  }

  const period = Number(periodNumber) || 1;

  try {
    let assignedTT: any = null;
    if (timetableId) {
      assignedTT = await prisma.masterTimetable.findUnique({
        where: { id: timetableId },
      });
      if (!assignedTT) {
        return res.status(404).json({ error: "Timetable session not found." });
      }

      // Check unassigned session
      if (!assignedTT.facultyId) {
        if (role !== "super_admin" && role !== "admin") {
          return res.status(403).json({
            error: "Access denied. Unassigned timetable session cannot be marked by faculty without administrative assignment.",
          });
        }
      } else if (assignedTT.facultyId !== req.userId && role !== "super_admin" && role !== "admin") {
        return res.status(403).json({
          error: "Access denied. You are not authorized to mark attendance for a class assigned to another faculty member.",
        });
      }

      // Validate student ownership: all students must belong to the authorized roster
      const roster = await resolveAuthorizedSessionRoster(assignedTT);
      const authorizedIds = new Set(roster.map((s) => s.id));
      for (const r of records) {
        if (!authorizedIds.has(r.studentId)) {
          return res.status(400).json({
            error: `Validation failed: Student ${r.studentId} does not belong to the authorized roster for this class. Transaction rejected.`,
          });
        }
      }
    }

    const markingFacultyId = (role === "faculty" || role === "hod") ? req.userId : (assignedTT?.facultyId || undefined);

    if (timetableId) {
      const existingCount = await prisma.attendanceRecord.count({
        where: {
          timetableId,
          date,
          periodNumber: period,
        },
      });
      if (existingCount > 0 && !req.body.overwrite && !req.body.allowUpdate) {
        return res.status(409).json({
          error: `Attendance for this session has already been submitted for date ${date} (Period ${period}). Duplicate submission prevented.`,
          code: "DUPLICATE_SESSION",
          alreadySubmitted: true,
        });
      }
    }

    const results = await prisma.$transaction(
      records.map((r: { studentId: string; status: string; remarks?: string }) =>
        prisma.attendanceRecord.upsert({
          where: {
            userId_date_periodNumber: {
              userId: r.studentId,
              date,
              periodNumber: period,
            },
          },
          update: {
            status: r.status,
            ...(timetableId && { timetableId }),
            ...(assignedTT?.courseId && { courseId: assignedTT.courseId }),
            ...(markingFacultyId && { facultyId: markingFacultyId }),
            ...(r.remarks && { remarks: r.remarks }),
          },
          create: {
            userId: r.studentId,
            date,
            periodNumber: period,
            status: r.status,
            ...(timetableId && { timetableId }),
            ...(assignedTT?.courseId && { courseId: assignedTT.courseId }),
            ...(markingFacultyId && { facultyId: markingFacultyId }),
            ...(r.remarks && { remarks: r.remarks }),
          },
        })
      )
    );

    await auditLog(req, "ATTENDANCE_MARKED", "Attendance & Biometrics", "AttendanceRecord", timetableId || date);

    return res.json({
      success: true,
      message: `Successfully recorded attendance for ${results.length} students on ${date} (Period ${period}).`,
      count: results.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. EXPORT ATTENDANCE LOG API
// ==========================================
router.get(["/export", "/faculty/export", "/student/export"], authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    const authRole = (req.userRole || "").toLowerCase();

    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const timeframe = (req.query.timeframe as string) || "all";
    const searchQuery = (req.query.search as string || "").trim();

    const where: any = {};

    // Strict role scoping
    if (authRole === "student") {
      // Students can ONLY export their own attendance records
      where.userId = authUserId;
    } else if (authRole === "faculty") {
      // Strict security: if requester is faculty, restrict ONLY to sessions taught by them
      where.OR = [
        { facultyId: authUserId },
        { timetable: { facultyId: authUserId } },
      ];
    } else {
      const scope = await resolveDepartmentScope(req, res);
      if (!scope.isAuthorized) return;
      if (scope.department) {
        where.user = { department: { contains: scope.department, mode: "insensitive" as const } };
      }
    }

    const statusFilter = req.query.status as string;
    if (statusFilter && statusFilter !== "All" && statusFilter !== "All Statuses") {
      where.status = statusFilter;
    }

    if (timeframe && timeframe !== "all" && timeframe !== "All") {
      const { startDateStr, endDateStr } = getDateBounds(timeframe);
      where.date = { gte: startDateStr, lte: endDateStr };
    }

    if (searchQuery) {
      const searchCondition = [
        { user: { name: { contains: searchQuery, mode: "insensitive" as const } } },
        { user: { rollNumber: { contains: searchQuery, mode: "insensitive" as const } } },
      ];
      if (where.OR && authRole === "faculty") {
        where.AND = [
          { OR: where.OR },
          { OR: searchCondition },
        ];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        user: true,
        course: true,
        faculty: true,
        timetable: { include: { course: true, faculty: true } },
      },
      orderBy: { date: "desc" },
      take: 2000,
    });

    await auditLog(
      req,
      "ATTENDANCE_EXPORTED",
      "Attendance",
      "AttendanceRecord",
      authRole === "student" ? `Student:${authUserId}` : authRole === "faculty" ? `Faculty:${authUserId}` : "Exported Data"
    );

    if (authRole === "student") {
      const studentExportData = records.map((r) => ({
        Date: r.date,
        Subject: r.timetable?.course?.name || r.course?.name || "Subject",
        CourseCode: r.timetable?.course?.code || r.course?.code || "",
        Faculty: r.timetable?.faculty?.name || r.faculty?.name || "Faculty information unavailable",
        Period: `Period ${r.periodNumber || 1}`,
        Room: r.timetable?.roomNo || "Room 101",
        Status: r.status,
      }));

      if (req.query.format === "csv" || req.headers["accept"] === "text/csv") {
        const csvHeader = "Date,Subject,Course Code,Faculty,Period,Room,Status";
        const csvRows = studentExportData.map((row) =>
          `"${row.Date}","${row.Subject.replace(/"/g, '""')}","${row.CourseCode}","${row.Faculty.replace(/"/g, '""')}","${row.Period}","${row.Room}","${row.Status}"`
        );
        const csvOutput = [csvHeader, ...csvRows].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="student_attendance_${authUserId}_${new Date().toISOString().split("T")[0]}.csv"`);
        return res.send(csvOutput);
      }

      return res.json(studentExportData);
    }

    const isSuperAdmin = ["super_admin", "admin", "principal", "anits_admin"].includes(authRole);
    if (isSuperAdmin && (req.query.format === "csv" || req.headers["accept"] === "text/csv")) {
      const csvHeader = "Date,Student Name,Roll Number,Department,Subject,Course Code,Faculty,Section,Period,Room,Status";
      const csvRows = records.map((r) => {
        const d = r.date;
        const sName = (r.user?.name || "Student").replace(/"/g, '""');
        const roll = (r.user?.rollNumber || "N/A").replace(/"/g, '""');
        const dept = (r.user?.department || r.timetable?.branch || r.course?.department || "Unassigned").replace(/"/g, '""');
        const subj = (r.course?.name || r.timetable?.course?.name || "Subject Lecture").replace(/"/g, '""');
        const code = (r.course?.code || r.timetable?.course?.code || "N/A").replace(/"/g, '""');
        const fac = (r.faculty?.name || r.timetable?.faculty?.name || "Faculty information unavailable").replace(/"/g, '""');
        const sec = (r.user?.section || r.timetable?.section || "A").replace(/"/g, '""');
        const per = `Period ${r.periodNumber || r.timetable?.periodNumber || 1}`;
        const rm = (r.timetable?.roomNo || "Room N/A").replace(/"/g, '""');
        const st = r.status;
        return `"${d}","${sName}","${roll}","${dept}","${subj}","${code}","${fac}","${sec}","${per}","${rm}","${st}"`;
      });
      const csvOutput = [csvHeader, ...csvRows].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="ANITS_Master_Attendance_Ledger_${new Date().toISOString().split("T")[0]}.csv"`);
      return res.send(csvOutput);
    }

    const exportData = records.map((r) => ({
      Date: r.date,
      Subject: r.timetable?.course?.name || r.course?.name || "Subject",
      CourseCode: r.timetable?.course?.code || r.course?.code || "",
      Section: r.timetable?.section || r.user?.section || "A",
      Period: r.periodNumber || 1,
      Student: r.user?.name || "",
      RollNumber: r.user?.rollNumber || "",
      Status: r.status,
    }));

    if (req.query.format === "csv" || req.headers["accept"] === "text/csv") {
      const csvHeader = "Date,Subject,CourseCode,Section,Period,Student,Roll Number,Status";
      const csvRows = exportData.map((row) =>
        `"${row.Date}","${row.Subject.replace(/"/g, '""')}","${row.CourseCode}","${row.Section}","${row.Period}","${row.Student.replace(/"/g, '""')}","${row.RollNumber}","${row.Status}"`
      );
      const csvOutput = [csvHeader, ...csvRows].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="faculty_attendance_${new Date().toISOString().split("T")[0]}.csv"`);
      return res.send(csvOutput);
    }

    return res.json(exportData);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. COMPATIBILITY ATTENDANCE ENDPOINTS
// ==========================================

router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const records = await prisma.attendanceRecord.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });

    return res.json(records);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const role = (req.userRole || "").toLowerCase();
  if (role === "student" || role === "parent") {
    return res.status(403).json({ error: "Access denied. Students and parents are not permitted to mark or modify attendance." });
  }
  if (role !== "faculty" && role !== "hod" && role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ error: "Access denied. Authorized faculty or administrative privileges required." });
  }

  const { date, status, periodNumber, studentId } = req.body;

  if (!date || !status) {
    return res.status(400).json({ error: "Please specify both date (YYYY-MM-DD) and status." });
  }

  const targetUserId = studentId || req.userId;
  if (!targetUserId) {
    return res.status(400).json({ error: "Target studentId is required." });
  }

  // Verify target is a student
  const targetStudent = await prisma.student.findUnique({ where: { id: targetUserId } });
  if (!targetStudent) {
    return res.status(404).json({ error: "Student record not found." });
  }

  const period = Number(periodNumber) || 1;
  const markingFacultyId = (role === "faculty" || role === "hod") ? req.userId : undefined;

  try {
    const record = await prisma.attendanceRecord.upsert({
      where: {
        userId_date_periodNumber: { userId: targetUserId, date, periodNumber: period },
      },
      update: {
        status,
        ...(markingFacultyId && { facultyId: markingFacultyId }),
      },
      create: {
        userId: targetUserId,
        date,
        periodNumber: period,
        status,
        ...(markingFacultyId && { facultyId: markingFacultyId }),
      },
    });

    return res.json({ message: "Attendance logged successfully!", record });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 8. AUTHENTICATED FACULTY TODAY'S ATTENDANCE SESSIONS & STATS
// ==========================================
router.get("/faculty/today", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    const authRole = (req.userRole || "").toLowerCase();

    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized. Authentication session required." });
    }

    if (authRole === "student" || authRole === "parent") {
      return res.status(403).json({ error: "Access denied. Students and parents cannot access faculty attendance management." });
    }

    // 1. Resolve Faculty identity strictly from authenticated JWT session
    let faculty = await prisma.faculty.findUnique({
      where: { id: authUserId },
      select: { id: true, rollNumber: true, name: true, email: true, department: true },
    });

    if (!faculty && (authRole === "super_admin" || authRole === "admin")) {
      faculty = await prisma.faculty.findFirst({
        where: { status: "Active" },
        orderBy: { name: "asc" },
        select: { id: true, rollNumber: true, name: true, email: true, department: true },
      });
    }

    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    // Determine target date and day in IST (Asia/Kolkata, UTC+5:30)
    let targetDateStr = req.query.date as string;
    let targetDay = "";
    let formattedDate = "";

    if (targetDateStr) {
      const parts = targetDateStr.split("-").map(Number);
      if (parts.length === 3) {
        const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
        targetDay = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "long" }).format(d);
        formattedDate = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "long", month: "short", day: "numeric", year: "numeric" }).format(d);
      }
    } else {
      const now = new Date();
      targetDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
      targetDay = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "long" }).format(now);
      formattedDate = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "long", month: "short", day: "numeric", year: "numeric" }).format(now);
    }

    // Query all timetable records for this faculty to resolve active academic year & semesters
    const allFacultyTimetables = await prisma.masterTimetable.findMany({
      where: { facultyId: faculty.id },
      select: { id: true, academicYear: true, semester: true },
    });
    const allTTIds = allFacultyTimetables.map((t) => t.id);
    const activeAcademicYear = allFacultyTimetables[0]?.academicYear || "2026-27";
    const distinctSemesters = Array.from(new Set(allFacultyTimetables.map((t) => t.semester))).sort((a, b) => a - b);
    const semesterLabel = distinctSemesters.length > 0
      ? distinctSemesters.map((s) => `Semester ${s}`).join(", ")
      : "Semester 5";

    // Query faculty timetable sessions for targetDay
    const timetableSlots = await prisma.masterTimetable.findMany({
      where: {
        facultyId: faculty.id,
        day: targetDay,
      },
      include: { course: true, faculty: true },
      orderBy: { periodNumber: "asc" },
    });

    // Check attendance submittals for these slots on targetDateStr
    const timetableIds = timetableSlots.map((s) => s.id);
    const existingRecords = await prisma.attendanceRecord.findMany({
      where: {
        timetableId: { in: timetableIds },
        date: targetDateStr,
      },
    });

    // Group records by timetableId
    const recordsByTimetable = new Map<string, { present: number; absent: number; late: number; total: number }>();
    for (const r of existingRecords) {
      if (!r.timetableId) continue;
      if (!recordsByTimetable.has(r.timetableId)) {
        recordsByTimetable.set(r.timetableId, { present: 0, absent: 0, late: 0, total: 0 });
      }
      const s = recordsByTimetable.get(r.timetableId)!;
      s.total += 1;
      if (r.status === "Present") s.present += 1;
      else if (r.status === "Absent") s.absent += 1;
      else if (r.status === "Late") s.late += 1;
    }

    const classes = timetableSlots.map((slot) => {
      const cleanSec = (slot.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase();
      const classCode = `${slot.branch}-${slot.semester}${cleanSec}`;
      const statsForSlot = recordsByTimetable.get(slot.id);
      const isSubmitted = Boolean(statsForSlot && statsForSlot.total > 0);
      const status = isSubmitted ? "ATTENDANCE SUBMITTED" : "UPCOMING";

      return {
        id: slot.id,
        timetableId: slot.id,
        periodNumber: slot.periodNumber,
        period: slot.periodNumber,
        startTime: slot.startTime || "09:00 AM",
        endTime: slot.endTime || "10:00 AM",
        time: `${slot.startTime || "09:00 AM"} - ${slot.endTime || "10:00 AM"}`,
        subject: `${slot.course?.code || "SUB"} - ${slot.course?.name || "Subject"}`,
        subjectCode: slot.course?.code || "SUB",
        subjectName: slot.course?.name || "Subject",
        section: `${slot.branch} Sec ${cleanSec}`,
        rawSection: cleanSec,
        classCode,
        branch: slot.branch,
        semester: slot.semester,
        room: slot.roomNo || "Room 101",
        isLab: slot.isLab,
        classType: slot.isLab ? "Lab" : "Theory",
        academicYear: slot.academicYear || activeAcademicYear,
        facultyName: slot.faculty?.name || faculty?.name || "Faculty",
        status,
        attendanceSubmitted: isSubmitted,
        attendanceMarked: isSubmitted,
        submittedStats: statsForSlot ? {
          present: statsForSlot.present,
          absent: statsForSlot.absent,
          late: statsForSlot.late,
          total: statsForSlot.total,
        } : null,
      };
    });

    // Compute top summary metrics strictly from real PostgreSQL data
    const [totalConductedAgg, todayPresentCount, todayAbsentCount, todayLateCount, pendingLeavesCount] = await Promise.all([
      prisma.attendanceRecord.groupBy({
        by: ["timetableId", "date", "periodNumber"],
        where: { timetableId: { in: allTTIds } },
      }),
      prisma.attendanceRecord.count({
        where: {
          timetableId: { in: allTTIds },
          date: targetDateStr,
          status: "Present",
        },
      }),
      prisma.attendanceRecord.count({
        where: {
          timetableId: { in: allTTIds },
          date: targetDateStr,
          status: "Absent",
        },
      }),
      prisma.attendanceRecord.count({
        where: {
          timetableId: { in: allTTIds },
          date: targetDateStr,
          status: "Late",
        },
      }),
      prisma.facultyLeave.count({
        where: {
          facultyId: faculty.id,
          status: { in: ["SUBMITTED", "HOD_REVIEW", "PENDING", "Pending"] },
        },
      }),
    ]);

    const totalConducted = totalConductedAgg.length;
    const pendingToday = classes.filter((c) => !c.attendanceSubmitted).length;

    const totalFacultyRecords = await prisma.attendanceRecord.findMany({
      where: { timetableId: { in: allTTIds } },
      select: { status: true },
    });
    const facultyPresentCount = totalFacultyRecords.filter((r) => r.status === "Present" || r.status === "Late").length;
    const averageAttendance = totalFacultyRecords.length > 0
      ? Math.round((facultyPresentCount / totalFacultyRecords.length) * 100)
      : 0;

    const stats = {
      conducted: totalConducted,
      pending: pendingToday,
      presentToday: todayPresentCount,
      absentToday: todayAbsentCount,
      lateToday: todayLateCount,
      average: averageAttendance,
      leavesPending: pendingLeavesCount,
    };

    return res.json({
      faculty: {
        id: faculty.id,
        name: faculty.name,
        department: faculty.department,
      },
      targetDate: targetDateStr,
      targetDay,
      formattedDate,
      departmentName: faculty.department || "N/A",
      academicYear: activeAcademicYear,
      semester: semesterLabel,
      semesters: distinctSemesters,
      stats,
      classes,
      todayClasses: classes,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 9. ENROLLED STUDENTS ROSTER FOR A SPECIFIC TIMETABLE SESSION
// ==========================================
router.get("/faculty/session/:timetableId/roster", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    const authRole = (req.userRole || "").toLowerCase();
    const { timetableId } = req.params;
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];

    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    if (authRole === "student" || authRole === "parent") {
      return res.status(403).json({ error: "Access denied. Students and parents are not authorized to access session rosters." });
    }

    const timetable = await prisma.masterTimetable.findUnique({
      where: { id: timetableId },
      include: { course: true, faculty: true },
    });

    if (!timetable) {
      return res.status(404).json({ error: "Timetable session not found." });
    }

    // Ownership check & Unassigned session check
    if (!timetable.facultyId) {
      if (authRole !== "super_admin" && authRole !== "admin") {
        return res.status(403).json({
          error: "Access denied. Unassigned timetable session has no assigned faculty.",
        });
      }
    } else if (timetable.facultyId !== authUserId && authRole !== "super_admin" && authRole !== "admin") {
      return res.status(403).json({
        error: "Access denied. You are not authorized to access students or attendance for this session.",
      });
    }

    const cleanSec = (timetable.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase();

    // Query enrolled students matching session via authoritative roster resolver
    const students = await resolveAuthorizedSessionRoster(timetable);

    // Query existing marks on that date & period
    const studentIds = students.map((s) => s.id);
    const existingRecords = await prisma.attendanceRecord.findMany({
      where: {
        userId: { in: studentIds },
        date,
        periodNumber: timetable.periodNumber,
      },
    });

    const statusMap = new Map<string, "Present" | "Absent" | "Late">();
    for (const r of existingRecords) {
      statusMap.set(r.userId, r.status as "Present" | "Absent" | "Late");
    }

    const roster = students.map((s) => ({
      id: s.id,
      studentId: s.id,
      rollNumber: s.rollNumber,
      name: s.name,
      department: s.department,
      semester: s.semester,
      section: s.section || cleanSec,
      avatarUrl: s.avatarUrl,
      status: statusMap.get(s.id) || "Present",
    }));

    return res.json({
      session: {
        id: timetable.id,
        timetableId: timetable.id,
        courseId: timetable.courseId,
        subjectCode: timetable.course?.code || "SUB",
        subjectName: timetable.course?.name || "Subject",
        subject: `${timetable.course?.code || "SUB"} - ${timetable.course?.name || "Subject"}`,
        courseCode: timetable.course?.code || "SUB",
        courseName: timetable.course?.name || "Subject",
        faculty: timetable.faculty?.name || "Faculty",
        facultyName: timetable.faculty?.name || "Faculty",
        department: timetable.branch,
        branch: timetable.branch,
        section: `${timetable.branch} Sec ${cleanSec}`,
        cleanSection: cleanSec,
        academicYear: timetable.academicYear || "2026-27",
        semester: timetable.semester,
        periodNumber: timetable.periodNumber,
        period: timetable.periodNumber,
        startTime: timetable.startTime || "09:00 AM",
        endTime: timetable.endTime || "10:00 AM",
        time: `${timetable.startTime || "09:00 AM"} - ${timetable.endTime || "10:00 AM"}`,
        room: timetable.roomNo || "Room 101",
        isLab: timetable.isLab,
        classType: timetable.isLab ? "Lab" : "Theory",
        date,
        isAlreadySubmitted: existingRecords.length > 0,
      },
      students: roster,
      totalCount: roster.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 10. SUBMIT ATTENDANCE FOR A TIMETABLE SESSION (ATOMIC TRANSACTION)
// ==========================================
router.post(["/faculty/session/:timetableId/mark", "/faculty/session/:timetableId/submit"], authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    const authRole = (req.userRole || "").toLowerCase();
    const { timetableId } = req.params;
    const { date } = req.body;
    const records = req.body.records || req.body.students;

    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    if (authRole === "student" || authRole === "parent") {
      return res.status(403).json({ error: "Access denied. Students and parents are not permitted to mark attendance." });
    }
    if (authRole !== "faculty" && authRole !== "hod" && authRole !== "admin" && authRole !== "super_admin") {
      return res.status(403).json({ error: "Access denied. Authorized faculty or administrative privileges required." });
    }

    if (!date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "date (YYYY-MM-DD) and non-empty records array are required." });
    }

    const timetable = await prisma.masterTimetable.findUnique({
      where: { id: timetableId },
      include: { course: true, faculty: true },
    });

    if (!timetable) {
      return res.status(404).json({ error: "Timetable session not found." });
    }

    // Ownership check & Unassigned session check
    if (!timetable.facultyId) {
      if (authRole !== "super_admin" && authRole !== "admin") {
        return res.status(403).json({
          error: "Access denied. Unassigned timetable session cannot be marked by faculty. Administrative assignment required.",
        });
      }
    } else if (timetable.facultyId !== authUserId && authRole !== "super_admin" && authRole !== "admin") {
      return res.status(403).json({
        error: "Access denied. You are not authorized to mark attendance for this class.",
      });
    }

    // Validate attendance statuses
    const validStatuses = new Set(["Present", "Absent", "Late"]);
    for (const r of records) {
      if (!r.status || !validStatuses.has(r.status)) {
        return res.status(400).json({
          error: `Validation failed: Invalid attendance status '${r.status}'. Status must be 'Present', 'Absent', or 'Late'.`,
        });
      }
    }

    // Student roster validation: verify every student belongs to the authorized roster
    const roster = await resolveAuthorizedSessionRoster(timetable);
    const authorizedIds = new Set(roster.map((s) => s.id));
    for (const r of records) {
      const sId = r.studentId || r.id;
      if (!sId || !authorizedIds.has(sId)) {
        return res.status(400).json({
          error: `Validation failed: Student with ID ${sId} is not enrolled in this session (${timetable.branch} ${timetable.section} Sem ${timetable.semester}). Entire transaction rolled back.`,
        });
      }
    }

    const period = timetable.periodNumber;
    const courseId = timetable.courseId || undefined;
    const markingFacultyId = (authRole === "faculty" || authRole === "hod") ? authUserId : (timetable.facultyId || undefined);

    // Check if session has existing attendance on this date
    const existingCount = await prisma.attendanceRecord.count({
      where: {
        timetableId: timetable.id,
        date,
        periodNumber: period,
      },
    });
    const isAlreadySubmitted = existingCount > 0;
    if (isAlreadySubmitted && !req.body.overwrite && !req.body.allowUpdate) {
      return res.status(409).json({
        error: `Attendance for this session has already been submitted for date ${date} (Period ${period}). Duplicate submission prevented.`,
        code: "DUPLICATE_SESSION",
        alreadySubmitted: true,
      });
    }

    // Execute atomic PostgreSQL transaction
    const results = await prisma.$transaction(async (tx) => {
      // 1. Upsert all attendance records
      const upserted = await Promise.all(
        records.map((r: { studentId?: string; id?: string; status: string; remarks?: string }) => {
          const sId = r.studentId || r.id;
          return tx.attendanceRecord.upsert({
            where: {
              userId_date_periodNumber: {
                userId: sId!,
                date,
                periodNumber: period,
              },
            },
            update: {
              status: r.status,
              timetableId: timetable.id,
              ...(courseId && { courseId }),
              ...(markingFacultyId && { facultyId: markingFacultyId }),
              ...(r.remarks && { remarks: r.remarks }),
            },
            create: {
              userId: sId!,
              date,
              periodNumber: period,
              status: r.status,
              timetableId: timetable.id,
              ...(courseId && { courseId }),
              ...(markingFacultyId && { facultyId: markingFacultyId }),
              ...(r.remarks && { remarks: r.remarks }),
            },
          });
        })
      );

      // 2. Dispatch notifications to students
      const subjectLabel = timetable.course?.name || timetable.course?.code || "Class Session";
      await tx.notification.createMany({
        data: records.map((r: { studentId: string; status: string }) => ({
          studentId: r.studentId,
          title: "Attendance Posted",
          message: `Attendance posted for ${subjectLabel} on ${date} (Period ${period}). Status: ${r.status}.`,
          type: "ATTENDANCE",
        })),
      });

      return upserted;
    });

    const presentCount = records.filter((r: any) => r.status === "Present").length;
    const absentCount = records.filter((r: any) => r.status === "Absent").length;
    const lateCount = records.filter((r: any) => r.status === "Late").length;

    await auditLog(
      req,
      isAlreadySubmitted ? "ATTENDANCE_EDITED" : "ATTENDANCE_SUBMITTED",
      "Attendance",
      "AttendanceRecord",
      `${timetable.id}:${date}:P${period}`
    );

    return res.json({
      success: true,
      message: `Successfully recorded attendance for ${results.length} students on ${date} (Period ${period}).`,
      count: results.length,
      presentCount,
      absentCount,
      lateCount,
      isAlreadySubmitted,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 11. FACULTY ATTENDANCE REGISTER
// ==========================================
router.get("/faculty/register", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    const authRole = (req.userRole || "").toLowerCase();

    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    let faculty = await prisma.faculty.findUnique({
      where: { id: authUserId },
      select: { id: true, name: true, department: true },
    });

    if (!faculty && (authRole === "super_admin" || authRole === "admin")) {
      faculty = await prisma.faculty.findFirst({
        where: { status: "Active" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, department: true },
      });
    }

    if (!faculty) {
      return res.status(403).json({ error: "Faculty profile not found." });
    }

    const { subject, section, date: dateFilter, status: statusFilter } = req.query as Record<string, string>;

    const whereTimetable: any = { facultyId: faculty.id };
    if (subject && subject !== "ALL") {
      whereTimetable.OR = [
        { courseId: subject },
        { course: { code: subject } },
        { course: { name: { contains: subject, mode: "insensitive" as const } } },
      ];
    }
    if (section && section !== "ALL") {
      const cleanSec = section.replace(/^Section\s+/i, "").trim().toUpperCase();
      whereTimetable.section = { in: [cleanSec, `Section ${cleanSec}`] };
    }

    const timetables = await prisma.masterTimetable.findMany({
      where: whereTimetable,
      include: { course: true },
    });

    const cohortConditions = timetables.map((t) => {
      const cleanSec = (t.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase();
      return {
        department: { in: getMatchingDepartments(t.branch), mode: "insensitive" as const },
        semester: t.semester,
        section: { in: [cleanSec, `Section ${cleanSec}`] },
      };
    });

    if (cohortConditions.length === 0) {
      return res.json([]);
    }

    const students = await prisma.student.findMany({
      where: { OR: cohortConditions, status: { not: "Inactive" } },
      select: { id: true, rollNumber: true, name: true, department: true, semester: true, section: true },
      orderBy: { rollNumber: "asc" },
    });

    const studentIds = students.map((s) => s.id);
    const whereRecords: any = {
      userId: { in: studentIds },
      timetableId: { in: timetables.map((t) => t.id) },
    };
    if (dateFilter) {
      whereRecords.date = dateFilter;
    }

    const records = await prisma.attendanceRecord.findMany({
      where: whereRecords,
      orderBy: { date: "desc" },
    });

    let register = students.map((s) => {
      const sRecords = records.filter((r) => r.userId === s.id);
      const total = sRecords.length;
      const present = sRecords.filter((r) => r.status === "Present" || r.status === "Late").length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 100;

      return {
        id: s.id,
        rollNumber: s.rollNumber,
        name: s.name,
        department: s.department,
        semester: s.semester,
        section: s.section,
        totalClasses: total,
        attendedClasses: present,
        percentage,
        status: percentage >= 75 ? "Present" : "Shortage",
      };
    });

    if (statusFilter && statusFilter !== "ALL") {
      register = register.filter((s) => s.status.toLowerCase() === statusFilter.toLowerCase());
    }

    return res.json(register);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 12. FACULTY ATTENDANCE HISTORY LOG
// ==========================================
router.get("/faculty/history", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    const authRole = (req.userRole || "").toLowerCase();

    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    if (authRole === "student" || authRole === "parent") {
      return res.status(403).json({ error: "Access denied. Students and parents are not permitted." });
    }

    let faculty = await prisma.faculty.findUnique({
      where: { id: authUserId },
      select: { id: true, name: true, department: true },
    });

    if (!faculty && (authRole === "super_admin" || authRole === "admin")) {
      faculty = await prisma.faculty.findFirst({
        where: { status: "Active" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, department: true },
      });
    }

    if (!faculty) {
      return res.status(403).json({ error: "Faculty profile not found." });
    }

    const facultyTimetables = await prisma.masterTimetable.findMany({
      where: { facultyId: faculty.id },
      include: { course: true },
    });
    const ttIds = facultyTimetables.map((t) => t.id);

    const records = await prisma.attendanceRecord.findMany({
      where: {
        OR: [
          { facultyId: faculty.id },
          { timetableId: { in: ttIds } },
        ],
      },
      include: {
        timetable: { include: { course: true } },
        course: true,
      },
      orderBy: [{ date: "desc" }, { periodNumber: "desc" }],
    });

    // Group by (timetableId, date, periodNumber)
    const sessionMap = new Map<string, {
      id: string;
      timetableId: string;
      date: string;
      periodNumber: number;
      period: number;
      subject: string;
      subjectCode: string;
      subjectName: string;
      section: string;
      semester: number;
      academicYear: string;
      courseId: string;
      time: string;
      room: string;
      present: number;
      absent: number;
      late: number;
      total: number;
      attendanceRate: number;
      submittedTime: string;
    }>();

    for (const r of records) {
      const ttId = r.timetableId || "no-tt";
      const pNum = r.periodNumber || 1;
      const key = `${ttId}_${r.date}_${pNum}`;

      if (!sessionMap.has(key)) {
        const cName = r.timetable?.course?.name || r.course?.name || "Subject";
        const cCode = r.timetable?.course?.code || r.course?.code || "SUB";
        const cleanSec = (r.timetable?.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase();

        sessionMap.set(key, {
          id: key,
          timetableId: r.timetableId || "",
          date: r.date,
          periodNumber: pNum,
          period: pNum,
          subject: `${cCode} - ${cName}`,
          subjectCode: cCode,
          subjectName: cName,
          section: r.timetable?.branch ? `${r.timetable.branch} Sec ${cleanSec}` : cleanSec,
          semester: r.timetable?.semester || 5,
          academicYear: r.timetable?.academicYear || "2026-27",
          courseId: r.timetable?.courseId || r.courseId || "",
          time: r.timetable?.startTime ? `${r.timetable.startTime} - ${r.timetable.endTime}` : "Scheduled",
          room: r.timetable?.roomNo || "Room 101",
          present: 0,
          absent: 0,
          late: 0,
          total: 0,
          attendanceRate: 0,
          submittedTime: new Date(r.updatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        });
      }

      const item = sessionMap.get(key)!;
      item.total += 1;
      if (r.status === "Present") item.present += 1;
      else if (r.status === "Absent") item.absent += 1;
      else if (r.status === "Late") item.late += 1;
    }

    // Compute attendance rate for each session
    for (const item of sessionMap.values()) {
      item.attendanceRate = item.total > 0 ? Math.round(((item.present + item.late) / item.total) * 100) : 0;
    }

    let allSessions = Array.from(sessionMap.values()).sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.periodNumber - a.periodNumber;
    });

    // Apply query filters
    const { semester, section, course, dateFrom, dateTo, status, search } = req.query;

    if (semester && semester !== "All") {
      const semNum = Number(semester);
      if (!isNaN(semNum)) {
        allSessions = allSessions.filter((s) => s.semester === semNum);
      }
    }
    if (section && section !== "All") {
      const clean = String(section).replace(/^Section\s+/i, "").trim().toUpperCase();
      allSessions = allSessions.filter((s) => s.section.toUpperCase().includes(clean));
    }
    if (course && course !== "All") {
      const cStr = String(course).toLowerCase();
      allSessions = allSessions.filter((s) =>
        s.subjectCode.toLowerCase().includes(cStr) ||
        s.subjectName.toLowerCase().includes(cStr) ||
        (s.courseId && s.courseId.toLowerCase() === cStr)
      );
    }
    if (dateFrom) {
      allSessions = allSessions.filter((s) => s.date >= String(dateFrom));
    }
    if (dateTo) {
      allSessions = allSessions.filter((s) => s.date <= String(dateTo));
    }
    if (status && status !== "All") {
      const st = String(status).toLowerCase();
      if (st === "submitted") {
        allSessions = allSessions.filter((s) => s.total > 0);
      } else if (st === "pending") {
        allSessions = allSessions.filter((s) => s.total === 0);
      } else if (st === "shortage") {
        allSessions = allSessions.filter((s) => s.attendanceRate < 75);
      } else if (st === "good") {
        allSessions = allSessions.filter((s) => s.attendanceRate >= 75);
      }
    }
    if (search && String(search).trim()) {
      const q = String(search).toLowerCase().trim();
      allSessions = allSessions.filter((s) =>
        s.subject.toLowerCase().includes(q) ||
        s.section.toLowerCase().includes(q) ||
        s.date.includes(q) ||
        (s.room && s.room.toLowerCase().includes(q))
      );
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.max(1, parseInt(req.query.pageSize as string) || 25);
    const total = allSessions.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paginatedSessions = allSessions.slice((page - 1) * pageSize, page * pageSize);

    return res.json({
      history: paginatedSessions,
      data: paginatedSessions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 13. FACULTY ATTENDANCE ANALYTICS (REAL POSTGRESQL DATA)
// ==========================================
router.get("/faculty/analytics", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    const authRole = (req.userRole || "").toLowerCase();

    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    if (authRole === "student" || authRole === "parent") {
      return res.status(403).json({ error: "Access denied. Students and parents are not permitted." });
    }

    let faculty = await prisma.faculty.findUnique({
      where: { id: authUserId },
      select: { id: true, name: true, department: true },
    });

    if (!faculty && (authRole === "super_admin" || authRole === "admin")) {
      faculty = await prisma.faculty.findFirst({
        where: { status: "Active" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, department: true },
      });
    }

    if (!faculty) {
      return res.status(403).json({ error: "Faculty profile not found." });
    }

    const timetables = await prisma.masterTimetable.findMany({
      where: { facultyId: faculty.id },
      include: { course: true },
    });
    const ttIds = timetables.map((t) => t.id);

    const records = await prisma.attendanceRecord.findMany({
      where: {
        OR: [
          { facultyId: faculty.id },
          { timetableId: { in: ttIds } },
        ],
      },
      include: {
        user: true,
        course: true,
        timetable: { include: { course: true } },
      },
      orderBy: { date: "asc" },
    });

    const total = records.length;
    if (total === 0) {
      return res.json({
        hasData: false,
        totalRecords: 0,
        distributionData: [],
        trendData: [],
        subjectWise: [],
        courseWise: [],
        sectionWise: [],
        lowAttendanceStudents: [],
        repeatedAbsences: [],
      });
    }

    const present = records.filter((r) => r.status === "Present").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const late = records.filter((r) => r.status === "Late").length;

    const distributionData = [
      { name: "Present", value: Math.round((present / total) * 100), count: present },
      { name: "Absent", value: Math.round((absent / total) * 100), count: absent },
      { name: "Late", value: Math.round((late / total) * 100), count: late },
    ];

    // Compute real trend by date
    const dateMap = new Map<string, { total: number; attended: number }>();
    for (const r of records) {
      if (!dateMap.has(r.date)) {
        dateMap.set(r.date, { total: 0, attended: 0 });
      }
      const d = dateMap.get(r.date)!;
      d.total += 1;
      if (r.status === "Present" || r.status === "Late") d.attended += 1;
    }

    const trendData = Array.from(dateMap.entries()).map(([date, counts]) => {
      const dObj = new Date(date);
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayLabel = dayNames[dObj.getDay()] || date;
      return {
        date,
        day: `${dayLabel} (${date.slice(5)})`,
        attendance: Math.round((counts.attended / counts.total) * 100),
      };
    });

    // Subject-wise attendance
    const subjectMap = new Map<string, { name: string; code: string; total: number; attended: number }>();
    for (const r of records) {
      const code = r.timetable?.course?.code || r.course?.code || "SUB";
      const name = r.timetable?.course?.name || r.course?.name || "Subject";
      if (!subjectMap.has(code)) {
        subjectMap.set(code, { name, code, total: 0, attended: 0 });
      }
      const s = subjectMap.get(code)!;
      s.total += 1;
      if (r.status === "Present" || r.status === "Late") s.attended += 1;
    }

    const subjectWise = Array.from(subjectMap.values()).map((s) => ({
      code: s.code,
      name: s.name,
      total: s.total,
      attended: s.attended,
      percentage: Math.round((s.attended / s.total) * 100),
    }));

    // Course-wise and section-wise analytics (Requirement 23)
    const courseSectionMap = new Map<string, {
      courseCode: string;
      courseName: string;
      section: string;
      semester: number;
      branch: string;
      conductedSessions: number;
      totalRecords: number;
      present: number;
      absent: number;
      late: number;
      pendingSessions: number;
    }>();

    for (const tt of timetables) {
      const cleanSec = (tt.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase();
      const code = tt.course?.code || "SUB";
      const name = tt.course?.name || "Subject";
      const key = `${code}_${cleanSec}_${tt.semester}`;

      if (!courseSectionMap.has(key)) {
        courseSectionMap.set(key, {
          courseCode: code,
          courseName: name,
          section: `${tt.branch} Sec ${cleanSec}`,
          semester: tt.semester,
          branch: tt.branch,
          conductedSessions: 0,
          totalRecords: 0,
          present: 0,
          absent: 0,
          late: 0,
          pendingSessions: 0,
        });
      }
    }

    const sessionTracker = new Set<string>();
    for (const r of records) {
      const tt = r.timetable;
      if (!tt) continue;
      const cleanSec = (tt.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase();
      const code = tt.course?.code || r.course?.code || "SUB";
      const key = `${code}_${cleanSec}_${tt.semester}`;

      if (courseSectionMap.has(key)) {
        const cs = courseSectionMap.get(key)!;
        cs.totalRecords += 1;
        if (r.status === "Present") cs.present += 1;
        else if (r.status === "Absent") cs.absent += 1;
        else if (r.status === "Late") cs.late += 1;

        const sessionKey = `${tt.id}_${r.date}_${r.periodNumber}`;
        if (!sessionTracker.has(sessionKey)) {
          sessionTracker.add(sessionKey);
          cs.conductedSessions += 1;
        }
      }
    }

    const courseWise = Array.from(courseSectionMap.values()).map((cs) => {
      const rate = cs.totalRecords > 0 ? Math.round(((cs.present + cs.late) / cs.totalRecords) * 100) : 0;
      return {
        ...cs,
        attendanceRate: rate,
        percentage: rate,
      };
    });

    // Low attendance students (< 75%)
    const studentStats = new Map<string, {
      studentId: string;
      name: string;
      rollNumber: string;
      section: string;
      subject: string;
      total: number;
      attended: number;
      absent: number;
    }>();

    for (const r of records) {
      if (!r.user) continue;
      const sId = r.user.id;
      if (!studentStats.has(sId)) {
        studentStats.set(sId, {
          studentId: sId,
          name: r.user.name,
          rollNumber: r.user.rollNumber,
          section: r.user.section || "A",
          subject: r.timetable?.course?.name || r.course?.name || "Subject",
          total: 0,
          attended: 0,
          absent: 0,
        });
      }
      const st = studentStats.get(sId)!;
      st.total += 1;
      if (r.status === "Present" || r.status === "Late") st.attended += 1;
      else if (r.status === "Absent") st.absent += 1;
    }

    const lowAttendanceStudents = Array.from(studentStats.values())
      .map((st) => ({
        ...st,
        attendancePct: Math.round((st.attended / st.total) * 100),
        threshold: 75,
        status: "Shortage Alert",
      }))
      .filter((st) => st.attendancePct < 75);

    const repeatedAbsences = Array.from(studentStats.values())
      .filter((st) => st.absent >= 2)
      .map((st) => ({
        ...st,
        attendancePct: Math.round((st.attended / st.total) * 100),
        consecutiveAbsences: st.absent,
      }));

    return res.json({
      hasData: true,
      totalRecords: total,
      distributionData,
      trendData,
      subjectWise,
      courseWise,
      sectionWise: courseWise,
      lowAttendanceStudents,
      repeatedAbsences,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 14. AUTHENTICATED STUDENT PORTAL ATTENDANCE
// ==========================================
router.get(["/student/my-attendance", "/student"], authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    const authRole = (req.userRole || "").toLowerCase();

    if (!authUserId) {
      return res.status(401).json({ error: "Session expired or unauthorized. Please sign in again." });
    }

    let targetStudentId = authUserId;

    if (authRole === "student") {
      const spoofedId = req.query.studentId as string;
      if (spoofedId && spoofedId !== authUserId) {
        return res.status(403).json({
          error: "Access denied. Students are not authorized to view another student's attendance records.",
        });
      }
      targetStudentId = authUserId;
    } else if (authRole === "parent") {
      const requestedId = req.query.studentId as string;
      if (!requestedId) {
        const linked = await prisma.student.findFirst({
          where: { parentId: authUserId },
          select: { id: true },
        });
        if (!linked) {
          return res.status(404).json({ error: "No student linked to this parent account." });
        }
        targetStudentId = linked.id;
      } else {
        const studentMatch = await prisma.student.findFirst({
          where: { id: requestedId, parentId: authUserId },
        });
        if (!studentMatch) {
          return res.status(403).json({
            error: "Access denied. You are not authorized to view this student's attendance.",
          });
        }
        targetStudentId = studentMatch.id;
      }
    } else if (authRole === "super_admin" || authRole === "admin") {
      const requestedId = req.query.studentId as string;
      if (requestedId) {
        targetStudentId = requestedId;
      } else {
        const firstStudent = await prisma.student.findFirst({ select: { id: true } });
        if (firstStudent) targetStudentId = firstStudent.id;
      }
    } else {
      // Faculty and others are forbidden from accessing the student personal attendance endpoint
      return res.status(403).json({
        error: "Access denied. Faculty must use faculty attendance management routes.",
      });
    }

    const student = await prisma.student.findUnique({
      where: { id: targetStudentId },
      include: {
        attendanceRecords: {
          include: {
            course: true,
            faculty: true,
            timetable: {
              include: { course: true, faculty: true },
            },
          },
          orderBy: [{ date: "desc" }, { periodNumber: "desc" }],
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Student profile not found." });
    }

    const records = student.attendanceRecords || [];
    const totalConducted = records.length;
    const presentClasses = records.filter((r) => r.status === "Present").length;
    const lateClasses = records.filter((r) => r.status === "Late").length;
    const attendedClasses = presentClasses + lateClasses;
    const absentClasses = records.filter((r) => r.status === "Absent").length;
    const leaveClasses = records.filter((r) => r.status === "Medical Leave" || r.status === "On Duty").length;

    // Phase 3 canonical formula: (Present + Late) / Total Conducted * 100
    const overallAttendancePct = totalConducted > 0
      ? Number(((attendedClasses / totalConducted) * 100).toFixed(1))
      : 0.0;

    // Dynamic Academic Year calculation from semester
    const sem = student.semester || 5;
    const yr = Math.ceil(sem / 2);
    const dynamicYear = (yr === 1 ? "1st Year" : yr === 2 ? "2nd Year" : yr === 3 ? "3rd Year" : "4th Year") as "1st Year" | "2nd Year" | "3rd Year" | "4th Year";

    // Group by course/subject
    const courseMap = new Map<string, {
      courseId: string;
      code: string;
      name: string;
      credits: number;
      facultyName: string;
      conducted: number;
      present: number;
      late: number;
      absent: number;
      attended: number;
      leave: number;
      historyLogs: any[];
    }>();

    for (const r of records) {
      const courseObj = r.timetable?.course || r.course;
      const courseKey = courseObj?.code || r.courseId || "SUB";
      const courseName = courseObj?.name || "Department Course";
      const facultyName = r.timetable?.faculty?.name || r.faculty?.name || "Faculty information unavailable";
      const credits = courseObj?.credits || 4;

      if (!courseMap.has(courseKey)) {
        courseMap.set(courseKey, {
          courseId: courseObj?.id || courseKey,
          code: courseKey,
          name: courseName,
          credits,
          facultyName,
          conducted: 0,
          present: 0,
          late: 0,
          absent: 0,
          attended: 0,
          leave: 0,
          historyLogs: [],
        });
      }

      const c = courseMap.get(courseKey)!;
      c.conducted += 1;
      if (r.status === "Present") {
        c.present += 1;
        c.attended += 1;
      } else if (r.status === "Late") {
        c.late += 1;
        c.attended += 1;
      } else if (r.status === "Absent") {
        c.absent += 1;
      } else {
        c.leave += 1;
      }

      c.historyLogs.push({
        id: r.id,
        date: r.date,
        period: `Period ${r.periodNumber || 1}`,
        periodNumber: r.periodNumber || 1,
        timeSlot: r.timetable ? `${r.timetable.startTime || "09:00 AM"} - ${r.timetable.endTime || "10:00 AM"}` : "Scheduled Session",
        subjectCode: courseKey,
        subjectName: courseName,
        facultyName,
        room: r.timetable?.roomNo || "Room 101",
        status: r.status,
        mode: "Manual",
        remarks: r.remarks || "Regular Session Attendance",
      });
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const displayedSubjects = Array.from(courseMap.values()).map((c) => {
      // Phase 3 canonical formula for subject-wise attendance
      const pct = c.conducted > 0 ? Number(((c.attended / c.conducted) * 100).toFixed(1)) : 0.0;
      const status = pct >= 85 ? "Above 85%" : pct >= 75 ? "75-85%" : "Below 75%";
      const governanceStatus = pct >= 85 ? "GOOD / ELIGIBLE" : pct >= 75 ? "WARNING" : "LOW ATTENDANCE";

      // Calculate actual monthly trends strictly from real session dates
      const monthMap = new Map<string, { conducted: number; attended: number }>();
      for (const log of c.historyLogs) {
        const monthKey = log.date.substring(0, 7); // YYYY-MM
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, { conducted: 0, attended: 0 });
        }
        const m = monthMap.get(monthKey)!;
        m.conducted += 1;
        if (log.status === "Present" || log.status === "Late") {
          m.attended += 1;
        }
      }

      const monthlyTrend = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, data]) => {
          const monthNum = parseInt(monthKey.split("-")[1], 10) - 1;
          const monthLabel = monthNames[monthNum] || monthKey;
          const monthPct = data.conducted > 0 ? Number(((data.attended / data.conducted) * 100).toFixed(1)) : 0;
          return { month: monthLabel, pct: monthPct, conducted: data.conducted };
        });

      return {
        id: c.courseId,
        academicYear: dynamicYear,
        semester: student.semester || 5,
        subjectCode: c.code,
        subjectName: c.name,
        facultyName: c.facultyName,
        facultyDesignation: "Faculty Member",
        facultyEmail: c.facultyName !== "Faculty information unavailable" ? `${c.facultyName.toLowerCase().replace(/[^a-z]/g, "")}@anits.edu.in` : "unavailable@anits.edu.in",
        facultyAvatar: "",
        credits: c.credits,
        conducted: c.conducted,
        present: c.present,
        late: c.late,
        attended: c.attended,
        absent: c.absent,
        leave: c.leave,
        attendancePct: pct,
        status: status as "Above 85%" | "75-85%" | "Below 75%",
        governanceStatus,
        classesNeeded75: pct < 75 ? Math.ceil((0.75 * c.conducted - c.attended) / 0.25) : 0,
        classesNeeded85: pct < 85 ? Math.ceil((0.85 * c.conducted - c.attended) / 0.15) : 0,
        classesMissed: c.absent,
        medicalLeaves: c.leave,
        facultyRemarks: pct >= 75 ? "Good consistency and attendance" : "Attendance shortage alert",
        aiRiskPrediction: pct < 75 ? ("High Shortage Risk" as const) : pct < 85 ? ("Moderate Risk" as const) : ("Low Risk" as const),
        monthlyTrend,
        weeklyTrend: [],
        hasTrendData: monthlyTrend.length >= 2,
        historyLogs: c.historyLogs,
      };
    });

    const historyLogs = records.slice(0, 100).map((r) => {
      const courseObj = r.timetable?.course || r.course;
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dObj = new Date(r.date);
      const dayStr = dayNames[dObj.getDay()] || "Day";

      return {
        id: r.id,
        date: r.date,
        day: dayStr,
        period: `Period ${r.periodNumber || 1}`,
        periodNumber: r.periodNumber || 1,
        timeSlot: r.timetable ? `${r.timetable.startTime || "09:00 AM"} - ${r.timetable.endTime || "10:00 AM"}` : "Scheduled Session",
        subjectCode: courseObj?.code || r.courseId || "SUB",
        subjectName: courseObj?.name || "Department Course",
        facultyName: r.timetable?.faculty?.name || r.faculty?.name || "Faculty information unavailable",
        room: r.timetable?.roomNo || "Room 101",
        status: r.status as "Present" | "Absent" | "Late" | "Medical Leave" | "On Duty" | "Holiday",
        mode: "Manual" as const,
        remarks: r.remarks || "Regular Session Attendance",
      };
    });

    const targetDateStr = new Date().toISOString().split("T")[0];
    const todayRecords = records.filter((r) => r.date === targetDateStr);
    const todayStatus = todayRecords.length > 0
      ? (todayRecords.some((r) => r.status === "Present" || r.status === "Late") ? "Present" : "Absent")
      : "Pending";

    const profile = {
      studentId: student.id,
      rollNumber: student.rollNumber,
      name: student.name,
      avatarUrl: student.avatarUrl || "",
      program: "B.Tech",
      branch: student.department || "N/A",
      section: student.section || "A",
      academicYear: dynamicYear,
      semester: student.semester || 5,
      overallAttendancePct,
      todayAttendanceStatus: todayStatus as any,
      presentClasses,
      absentClasses,
      lateClasses,
      totalConducted,
      leaveClasses,
      condonationStatus: overallAttendancePct >= 75 ? ("Eligible" as const) : ("Condonation Required" as const),
      currentStreak: Math.min(12, attendedClasses),
      classesRequiredFor75: overallAttendancePct < 75 ? Math.ceil((0.75 * totalConducted - attendedClasses) / 0.25) : 0,
      classesRequiredFor85: overallAttendancePct < 85 ? Math.ceil((0.85 * totalConducted - attendedClasses) / 0.15) : 0,
      lowAttendanceCount: displayedSubjects.filter((s) => s.attendancePct < 75).length,
    };

    const summary = {
      totalConducted,
      present: presentClasses,
      absent: absentClasses,
      late: lateClasses,
      attended: attendedClasses,
      percentage: overallAttendancePct,
      overallAttendancePct,
    };

    return res.json({
      summary,
      profile,
      subjects: displayedSubjects,
      history: historyLogs,
      records: historyLogs,
      stats: {
        overallAttendancePct,
        overallPercentage: overallAttendancePct,
        presentClasses,
        absentClasses,
        lateClasses,
        totalConducted,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// CANONICAL ATTENDANCE SESSION ALIASES
// ==========================================

// POST /api/attendance/sessions: Register / lookup attendance session
router.post("/sessions", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { timetableId, date, periodNumber } = req.body;
    if (!timetableId) {
      return res.status(400).json({ error: "timetableId is required to initialize session." });
    }
    const timetable = await prisma.masterTimetable.findUnique({
      where: { id: timetableId },
      include: { course: true, faculty: true },
    });
    if (!timetable) {
      return res.status(404).json({ error: "Timetable session not found." });
    }
    const targetDate = date || new Date().toISOString().split("T")[0];
    const targetPeriod = Number(periodNumber) || timetable.periodNumber;

    const existingCount = await prisma.attendanceRecord.count({
      where: {
        timetableId: timetable.id,
        date: targetDate,
        periodNumber: targetPeriod,
      },
    });

    return res.json({
      success: true,
      sessionId: timetable.id,
      date: targetDate,
      periodNumber: targetPeriod,
      timetable,
      isAlreadySubmitted: existingCount > 0,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/attendance/sessions/:id: Retrieve roster and details for session
router.get("/sessions/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timetable = await prisma.masterTimetable.findUnique({
      where: { id: req.params.id },
      include: { course: true, faculty: true },
    });
    if (!timetable) return res.status(404).json({ error: "Session not found." });
    const roster = await resolveAuthorizedSessionRoster(timetable);
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const existingRecords = await prisma.attendanceRecord.findMany({
      where: {
        userId: { in: roster.map((s) => s.id) },
        date,
        periodNumber: timetable.periodNumber,
      },
    });
    return res.json({
      success: true,
      session: timetable,
      roster,
      existingRecords,
      isAlreadySubmitted: existingRecords.length > 0,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/attendance/sessions/:id/records: Mark records for session
router.post("/sessions/:id/records", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const authUserId = req.userId;
  const authRole = (req.userRole || "").toLowerCase();
  const timetableId = req.params.id;
  const { date } = req.body;
  const records = req.body.records || req.body.students;

  if (!authUserId) return res.status(401).json({ error: "Unauthorized." });
  if (authRole === "student" || authRole === "parent") {
    return res.status(403).json({ error: "Access denied. Students cannot mark attendance." });
  }
  if (!date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "date and non-empty records array are required." });
  }

  const timetable = await prisma.masterTimetable.findUnique({
    where: { id: timetableId },
    include: { course: true, faculty: true },
  });
  if (!timetable) return res.status(404).json({ error: "Timetable session not found." });

  const period = timetable.periodNumber;
  const existingCount = await prisma.attendanceRecord.count({
    where: { timetableId: timetable.id, date, periodNumber: period },
  });
  if (existingCount > 0 && !req.body.overwrite && !req.body.allowUpdate) {
    return res.status(409).json({
      error: `Attendance for this session has already been submitted for date ${date} (Period ${period}). Duplicate submission prevented.`,
      code: "DUPLICATE_SESSION",
      alreadySubmitted: true,
    });
  }

  const markingFacultyId = (authRole === "faculty" || authRole === "hod") ? authUserId : (timetable.facultyId || undefined);
  const courseId = timetable.courseId || undefined;

  const results = await prisma.$transaction(async (tx) => {
    return Promise.all(
      records.map((r: any) => {
        const sId = r.studentId || r.id;
        return tx.attendanceRecord.upsert({
          where: {
            userId_date_periodNumber: { userId: sId, date, periodNumber: period },
          },
          update: {
            status: r.status,
            timetableId: timetable.id,
            ...(courseId && { courseId }),
            ...(markingFacultyId && { facultyId: markingFacultyId }),
          },
          create: {
            userId: sId,
            date,
            periodNumber: period,
            status: r.status,
            timetableId: timetable.id,
            ...(courseId && { courseId }),
            ...(markingFacultyId && { facultyId: markingFacultyId }),
          },
        });
      })
    );
  });

  return res.json({
    success: true,
    message: `Recorded attendance for ${results.length} students.`,
    count: results.length,
  });
});

// GET /api/attendance/student/:studentId: Student attendance lookup with authorization
router.get("/student/:studentId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    const authRole = (req.userRole || "").toLowerCase();
    const targetStudentId = req.params.studentId;

    if (authRole === "student" && authUserId !== targetStudentId) {
      const selfStudent = await prisma.student.findUnique({ where: { id: authUserId } });
      if (selfStudent?.id !== targetStudentId && selfStudent?.rollNumber !== targetStudentId) {
        return res.status(403).json({ error: "Access denied. Students are only authorized to view their own attendance." });
      }
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id: targetStudentId }, { rollNumber: targetStudentId }],
      },
    });

    if (!student) return res.status(404).json({ error: "Student not found." });

    const records = await prisma.attendanceRecord.findMany({
      where: { userId: student.id },
      include: { course: true, faculty: true, timetable: { include: { course: true, faculty: true } } },
      orderBy: [{ date: "desc" }, { periodNumber: "asc" }],
    });

    const totalConducted = records.length;
    const present = records.filter((r) => r.status === "Present").length;
    const late = records.filter((r) => r.status === "Late").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const attended = present + late;
    const percentage = totalConducted > 0 ? Number(((attended / totalConducted) * 100).toFixed(1)) : 0;

    return res.json({
      success: true,
      student: {
        id: student.id,
        rollNumber: student.rollNumber,
        name: student.name,
        department: student.department,
        semester: student.semester,
        section: student.section,
      },
      summary: {
        totalConducted,
        present,
        late,
        absent,
        attended,
        percentage,
        overallPercentage: percentage,
      },
      records,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;

