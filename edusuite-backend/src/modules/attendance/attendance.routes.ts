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
    const timeframe = (req.query.timeframe as string) || "daily";
    const requestedDate = req.query.date as string;

    const where: any = {};

    if (scope.department) {
      where.user = { department: { contains: scope.department, mode: "insensitive" as const } };
    }

    if (statusFilter && statusFilter !== "All") {
      where.status = statusFilter;
    }

    if (timeframe && timeframe !== "all") {
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
router.get("/export", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scope = await resolveDepartmentScope(req, res);
    if (!scope.isAuthorized) return;

    const timeframe = (req.query.timeframe as string) || "all";
    const searchQuery = (req.query.search as string || "").trim();

    const where: any = {};

    if (scope.department) {
      where.user = { department: { contains: scope.department, mode: "insensitive" as const } };
    }

    if (timeframe && timeframe !== "all") {
      const { startDateStr, endDateStr } = getDateBounds(timeframe);
      where.date = { gte: startDateStr, lte: endDateStr };
    }

    if (searchQuery) {
      where.OR = [
        { user: { name: { contains: searchQuery, mode: "insensitive" as const } } },
        { user: { rollNumber: { contains: searchQuery, mode: "insensitive" as const } } },
      ];
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        user: true,
        timetable: { include: { course: true, faculty: true } },
      },
      orderBy: { date: "desc" },
      take: 500,
    });

    await auditLog(
      req,
      "ATTENDANCE_EXPORTED",
      "Attendance & Biometrics",
      "AttendanceRecord",
      scope.department || "All Departments"
    );

    const exportData = records.map((r) => ({
      ID: r.id,
      RollNumber: r.user?.rollNumber || "",
      StudentName: r.user?.name || "",
      Department: r.user?.department || "",
      Semester: r.user?.semester || "",
      Date: r.date,
      Period: r.periodNumber || 1,
      Status: r.status,
      CourseCode: r.timetable?.course?.code || "",
      CourseName: r.timetable?.course?.name || "",
      FacultyName: r.timetable?.faculty?.name || "",
    }));

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

    // 1. Resolve Faculty identity strictly from authenticated JWT session
    let faculty = await prisma.faculty.findUnique({
      where: { id: authUserId },
      select: { id: true, rollNumber: true, name: true, email: true, department: true },
    });

    if (!faculty && (authRole === "super_admin" || authRole === "admin")) {
      faculty = await prisma.faculty.findFirst({
        where: { email: "faculty@cms.com" },
        select: { id: true, rollNumber: true, name: true, email: true, department: true },
      });
    }

    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    // Determine target date and day of week
    const targetDateStr = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const targetDateObj = new Date(targetDateStr);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const targetDay = dayNames[targetDateObj.getDay()] || "Friday";

    // Query faculty timetable sessions for that day
    const timetableSlots = await prisma.masterTimetable.findMany({
      where: {
        facultyId: faculty.id,
        day: targetDay,
      },
      include: { course: true },
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
      const stats = recordsByTimetable.get(r.timetableId)!;
      stats.total += 1;
      if (r.status === "Present") stats.present += 1;
      else if (r.status === "Absent") stats.absent += 1;
      else if (r.status === "Late") stats.late += 1;
    }

    const classes = timetableSlots.map((slot) => {
      const cleanSec = (slot.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase();
      const classCode = `${slot.branch}-${slot.semester}${cleanSec}`;
      const stats = recordsByTimetable.get(slot.id);
      const isSubmitted = Boolean(stats && stats.total > 0);

      const status = isSubmitted ? "Completed" : "Pending";

      return {
        id: slot.id,
        timetableId: slot.id,
        periodNumber: slot.periodNumber,
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
        status,
        attendanceSubmitted: isSubmitted,
        submittedStats: stats ? {
          present: stats.present,
          absent: stats.absent,
          late: stats.late,
          total: stats.total,
        } : null,
      };
    });

    // Compute top summary metrics
    const allFacultyTimetables = await prisma.masterTimetable.findMany({
      where: { facultyId: faculty.id },
      select: { id: true },
    });
    const allTTIds = allFacultyTimetables.map((t) => t.id);

    const [totalConductedAgg, todayPresentCount, todayAbsentCount] = await Promise.all([
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
      : 85;

    const stats = {
      conducted: totalConducted,
      pending: pendingToday,
      presentToday: todayPresentCount,
      absentToday: todayAbsentCount,
      average: averageAttendance,
      leavesPending: 0,
    };

    return res.json({
      faculty: {
        id: faculty.id,
        name: faculty.name,
        department: faculty.department,
      },
      targetDate: targetDateStr,
      targetDay,
      departmentName: faculty.department || "N/A",
      academicYear: "2026-27",
      semester: classes.length > 0 ? `Sem ${classes[0].semester}` : "Semester 5",
      stats,
      classes,
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
        section: `${timetable.branch} Sec ${cleanSec}`,
        cleanSection: cleanSec,
        periodNumber: timetable.periodNumber,
        time: `${timetable.startTime || "09:00 AM"} - ${timetable.endTime || "10:00 AM"}`,
        room: timetable.roomNo || "Room 101",
        date,
        facultyName: timetable.faculty?.name || "Faculty",
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
router.post("/faculty/session/:timetableId/mark", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    const authRole = (req.userRole || "").toLowerCase();
    const { timetableId } = req.params;
    const { date, records } = req.body;

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

    // Student roster validation: verify every student belongs to the authorized roster
    const roster = await resolveAuthorizedSessionRoster(timetable);
    const authorizedIds = new Set(roster.map((s) => s.id));
    for (const r of records) {
      if (!authorizedIds.has(r.studentId)) {
        return res.status(400).json({
          error: `Validation failed: Student with ID ${r.studentId} is not enrolled in this session (${timetable.branch} ${timetable.section} Sem ${timetable.semester}). Entire transaction rolled back.`,
        });
      }
    }

    const period = timetable.periodNumber;
    const courseId = timetable.courseId || undefined;
    const markingFacultyId = (authRole === "faculty" || authRole === "hod") ? authUserId : (timetable.facultyId || undefined);

    // Execute atomic transaction
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
            timetableId: timetable.id,
            ...(courseId && { courseId }),
            ...(markingFacultyId && { facultyId: markingFacultyId }),
            ...(r.remarks && { remarks: r.remarks }),
          },
          create: {
            userId: r.studentId,
            date,
            periodNumber: period,
            status: r.status,
            timetableId: timetable.id,
            ...(courseId && { courseId }),
            ...(markingFacultyId && { facultyId: markingFacultyId }),
            ...(r.remarks && { remarks: r.remarks }),
          },
        })
      )
    );

    const presentCount = records.filter((r: any) => r.status === "Present").length;
    const absentCount = records.filter((r: any) => r.status === "Absent").length;
    const lateCount = records.filter((r: any) => r.status === "Late").length;

    await auditLog(
      req,
      "FACULTY_ATTENDANCE_SUBMITTED",
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
        where: { email: "faculty@cms.com" },
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

    const cohortConditions = timetables.map((t) => {
      const cleanSec = (t.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase();
      return {
        department: { equals: t.branch, mode: "insensitive" as const },
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
    const records = await prisma.attendanceRecord.findMany({
      where: { userId: { in: studentIds } },
      orderBy: { date: "desc" },
    });

    const register = students.map((s) => {
      const sRecords = records.filter((r) => r.userId === s.id);
      const total = sRecords.length;
      const present = sRecords.filter((r) => r.status === "Present" || r.status === "Late").length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 85;

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

    return res.json(register);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 12. FACULTY ATTENDANCE ANALYTICS
// ==========================================
router.get("/faculty/analytics", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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
        where: { email: "faculty@cms.com" },
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
      where: { timetableId: { in: ttIds } },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === "Present").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const late = records.filter((r) => r.status === "Late").length;

    const distributionData = [
      { name: "Present", value: total > 0 ? Math.round((present / total) * 100) : 85 },
      { name: "Absent", value: total > 0 ? Math.round((absent / total) * 100) : 10 },
      { name: "Late", value: total > 0 ? Math.round((late / total) * 100) : 5 },
    ];

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const trendData = days.map((day) => ({
      day,
      attendance: 88 + Math.floor(Math.sin(day.charCodeAt(0)) * 6),
    }));

    return res.json({
      hasData: total > 0,
      totalRecords: total,
      distributionData,
      trendData,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 13. AUTHENTICATED STUDENT PORTAL ATTENDANCE
// ==========================================
router.get(["/student/my-attendance", "/student"], authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const student = await prisma.student.findUnique({
      where: { id: authUserId },
      include: {
        attendanceRecords: {
          include: {
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
    const presentRecords = records.filter((r) => r.status === "Present" || r.status === "Late");
    const presentClasses = presentRecords.length;
    const absentClasses = records.filter((r) => r.status === "Absent").length;
    const leaveClasses = records.filter((r) => r.status === "Medical Leave" || r.status === "On Duty").length;

    const overallAttendancePct = totalConducted > 0
      ? Number(((presentClasses / totalConducted) * 100).toFixed(1))
      : 88.0;

    // Group by course/subject
    const courseMap = new Map<string, {
      courseId: string;
      code: string;
      name: string;
      credits: number;
      facultyName: string;
      conducted: number;
      attended: number;
      absent: number;
      leave: number;
      historyLogs: any[];
    }>();

    for (const r of records) {
      const course = r.timetable?.course;
      const courseKey = course?.code || r.courseId || "CS501";
      const courseName = course?.name || "Department Course";
      const facultyName = r.timetable?.faculty?.name || "Dr. Ravi Kumar";
      const credits = course?.credits || 4;

      if (!courseMap.has(courseKey)) {
        courseMap.set(courseKey, {
          courseId: course?.id || courseKey,
          code: courseKey,
          name: courseName,
          credits,
          facultyName,
          conducted: 0,
          attended: 0,
          absent: 0,
          leave: 0,
          historyLogs: [],
        });
      }

      const c = courseMap.get(courseKey)!;
      c.conducted += 1;
      if (r.status === "Present" || r.status === "Late") {
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
        timeSlot: `${r.timetable?.startTime || "09:00 AM"} - ${r.timetable?.endTime || "10:00 AM"}`,
        subjectCode: courseKey,
        subjectName: courseName,
        facultyName,
        room: r.timetable?.roomNo || "LH-301",
        status: r.status,
        mode: "Manual",
        remarks: r.remarks || "Regular Session",
      });
    }

    const displayedSubjects = Array.from(courseMap.values()).map((c) => {
      const pct = c.conducted > 0 ? Number(((c.attended / c.conducted) * 100).toFixed(1)) : 85.0;
      const status = pct >= 85 ? "Above 85%" : pct >= 75 ? "75-85%" : "Below 75%";
      return {
        id: c.courseId,
        academicYear: "3rd Year" as const,
        semester: student.semester || 5,
        subjectCode: c.code,
        subjectName: c.name,
        facultyName: c.facultyName,
        facultyDesignation: "Assistant Professor",
        facultyEmail: "faculty@cms.com",
        facultyAvatar: "",
        credits: c.credits,
        conducted: c.conducted,
        attended: c.attended,
        absent: c.absent,
        leave: c.leave,
        attendancePct: pct,
        status: status as "Above 85%" | "75-85%" | "Below 75%",
        classesNeeded75: pct < 75 ? Math.ceil((0.75 * c.conducted - c.attended) / 0.25) : 0,
        classesNeeded85: pct < 85 ? Math.ceil((0.85 * c.conducted - c.attended) / 0.15) : 0,
        classesMissed: c.absent,
        medicalLeaves: c.leave,
        facultyRemarks: pct >= 75 ? "Good consistency and attendance" : "Attendance shortage alert",
        aiRiskPrediction: pct < 75 ? ("High Shortage Risk" as const) : pct < 85 ? ("Moderate Risk" as const) : ("Low Risk" as const),
        monthlyTrend: [
          { month: "Jul", pct: 90 },
          { month: "Aug", pct: 85 },
          { month: "Sep", pct },
        ],
        weeklyTrend: [
          { week: "W1", pct: 92 },
          { week: "W2", pct: 88 },
          { week: "W3", pct },
        ],
        historyLogs: c.historyLogs,
      };
    });

    const historyLogs = records.slice(0, 50).map((r) => {
      const course = r.timetable?.course;
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dObj = new Date(r.date);
      const dayStr = dayNames[dObj.getDay()] || "Day";

      return {
        id: r.id,
        date: r.date,
        day: dayStr,
        period: `Period ${r.periodNumber || 1}`,
        timeSlot: `${r.timetable?.startTime || "09:00 AM"} - ${r.timetable?.endTime || "10:00 AM"}`,
        subjectCode: course?.code || r.courseId || "CS501",
        subjectName: course?.name || "Department Course",
        facultyName: r.timetable?.faculty?.name || "Dr. Ravi Kumar",
        room: r.timetable?.roomNo || "LH-301",
        status: r.status as "Present" | "Absent" | "Medical Leave" | "On Duty" | "Holiday",
        mode: "Manual" as const,
        remarks: r.remarks || "Regular Session Attendance",
      };
    });

    const targetDateStr = new Date().toISOString().split("T")[0];
    const todayRecords = records.filter((r) => r.date === targetDateStr);
    const todayStatus = todayRecords.length > 0
      ? (todayRecords.some((r) => r.status === "Present") ? "Present" : "Absent font-bold")
      : "Pending";

    const profile = {
      studentId: student.id,
      rollNumber: student.rollNumber,
      name: student.name,
      avatarUrl: student.avatarUrl || "",
      program: "B.Tech",
      branch: student.department || "N/A",
      section: student.section || "A",
      academicYear: "3rd Year" as const,
      semester: student.semester || 5,
      overallAttendancePct,
      todayAttendanceStatus: todayStatus as any,
      presentClasses,
      absentClasses,
      leaveClasses,
      condonationStatus: overallAttendancePct >= 75 ? ("Eligible" as const) : ("Condonation Required" as const),
      currentStreak: Math.min(12, presentClasses),
      classesRequiredFor75: overallAttendancePct < 75 ? Math.ceil((0.75 * totalConducted - presentClasses) / 0.25) : 0,
      classesRequiredFor85: overallAttendancePct < 85 ? Math.ceil((0.85 * totalConducted - presentClasses) / 0.15) : 0,
      lowAttendanceCount: displayedSubjects.filter((s) => s.attendancePct < 75).length,
    };

    return res.json({
      profile,
      subjects: displayedSubjects,
      history: historyLogs,
      stats: {
        overallAttendancePct,
        presentClasses,
        absentClasses,
        totalConducted,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;

