import { prisma } from "../../db";
import { getMatchingDepartments, normalizeBranchCode } from "../../lib/department-utils";

export interface HodContext {
  userId: string;
  userRole: string;
  hodName: string;
  hodEmail: string;
  deptCode: string;
  deptName: string;
  matchingDepts: string[];
}

export class AnitsHodService {
  /**
   * Resolves and enforces the authenticated HOD's department scope.
   * Cross-department requests by non-Super Admins are strictly rejected with 403.
   */
  static async resolveHodContext(
    userId: string,
    userRole: string,
    userDepartment?: string | null,
    requestedDept?: string | null
  ): Promise<HodContext> {
    const roleNorm = (userRole || "").toLowerCase().replace(/[\s-]/g, "_");
    const isSuperAdmin =
      roleNorm === "super_admin" ||
      roleNorm === "superadmin" ||
      roleNorm === "admin" ||
      roleNorm === "principal" ||
      roleNorm === "academic_dean";

    let deptCode = "";
    let hodName = "Department HOD";
    let hodEmail = "";

    if (isSuperAdmin) {
      deptCode = requestedDept ? normalizeBranchCode(requestedDept) : "CSE";
      const admin = await prisma.admin.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      if (admin) {
        hodName = admin.name;
        hodEmail = admin.email;
      }
    } else {
      // Must be HOD
      let rawDept = userDepartment;
      const faculty = await prisma.faculty.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, department: true, role: true },
      });

      if (faculty) {
        hodName = faculty.name;
        hodEmail = faculty.email;
        if (faculty.department) rawDept = faculty.department;
      }

      if (!rawDept) {
        const err: any = new Error("Access denied: No department assigned to this HOD account.");
        err.statusCode = 403;
        throw err;
      }

      deptCode = normalizeBranchCode(rawDept);

      // SECURITY ENFORCEMENT: Block cross-department snooping
      if (requestedDept && typeof requestedDept === "string" && requestedDept.trim()) {
        const reqNorm = normalizeBranchCode(requestedDept);
        if (reqNorm !== deptCode) {
          const err: any = new Error(
            `Access denied: HOD is restricted strictly to their own department scope (${deptCode}).`
          );
          err.statusCode = 403;
          throw err;
        }
      }
    }

    const matchingDepts = getMatchingDepartments(deptCode);

    // Resolve official department full name from PostgreSQL
    const deptRecord = await prisma.department.findFirst({
      where: {
        OR: [
          { code: { equals: deptCode, mode: "insensitive" } },
          { name: { in: matchingDepts, mode: "insensitive" } },
        ],
      },
      select: { name: true },
    });

    const deptName = deptRecord?.name || matchingDepts[matchingDepts.length - 1] || `${deptCode} Department`;

    return {
      userId,
      userRole,
      hodName,
      hodEmail,
      deptCode,
      deptName,
      matchingDepts,
    };
  }

  /**
   * Generates the complete, PostgreSQL-driven HOD Dashboard payload.
   */
  static async getHodDashboardData(ctx: HodContext) {
    const now = new Date();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
    const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Kolkata" }).format(now);

    // Dynamic active academic year from MasterTimetable
    const latestTt = await prisma.masterTimetable.findFirst({
      where: { branch: { in: ctx.matchingDepts } },
      orderBy: { createdAt: "desc" },
      select: { academicYear: true },
    });
    const academicYear = latestTt?.academicYear || "2026-27";

    // 1. Core 4 KPI Card Metrics directly from PostgreSQL
    const [studentCount, facultyCount, timetableSlots, attendanceRecords] = await Promise.all([
      // Distinct Student count in department
      prisma.student.count({
        where: {
          department: { in: ctx.matchingDepts },
        },
      }),

      // Distinct Faculty count in department
      prisma.faculty.count({
        where: {
          department: { in: ctx.matchingDepts },
          status: { not: "Inactive" },
        },
      }),

      // Scheduled Timetable Slots for the department in this academic year
      prisma.masterTimetable.findMany({
        where: {
          branch: { in: ctx.matchingDepts },
          academicYear,
        },
        select: {
          id: true,
          branch: true,
          semester: true,
          section: true,
          day: true,
          periodNumber: true,
          startTime: true,
          endTime: true,
          roomNo: true,
          course: { select: { id: true, code: true, name: true } },
          faculty: { select: { id: true, name: true } },
        },
      }),

      // Attendance records for the department
      prisma.attendanceRecord.findMany({
        where: {
          timetable: {
            branch: { in: ctx.matchingDepts },
            academicYear,
          },
        },
        select: {
          id: true,
          userId: true,
          timetableId: true,
          date: true,
          status: true,
        },
      }),
    ]);

    // Distinct Class / Cohort count (department + semester + section)
    const distinctClassKeys = new Set(
      timetableSlots.map((s) => `${s.branch}-S${s.semester}-${s.section}`)
    );
    const activeClassesCount = distinctClassKeys.size;

    // Department Attendance Percentage
    const totalRecords = attendanceRecords.length;
    const presentRecords = attendanceRecords.filter((r) => r.status === "Present").length;
    const lateRecords = attendanceRecords.filter((r) => r.status === "Late").length;
    const absentRecords = attendanceRecords.filter((r) => r.status === "Absent").length;
    const departmentAttendancePct =
      totalRecords > 0
        ? Number((((presentRecords + lateRecords) / totalRecords) * 100).toFixed(1))
        : 0;

    // 2. Attendance Trend (Last 7 Days)
    const dateMap = new Map<string, { present: number; late: number; total: number }>();
    attendanceRecords.forEach((r) => {
      const d = r.date;
      if (!dateMap.has(d)) {
        dateMap.set(d, { present: 0, late: 0, total: 0 });
      }
      const item = dateMap.get(d)!;
      item.total++;
      if (r.status === "Present") item.present++;
      else if (r.status === "Late") item.late++;
    });

    const sortedDates = Array.from(dateMap.keys()).sort();
    const attendanceTrend = sortedDates.slice(-7).map((date) => {
      const item = dateMap.get(date)!;
      const rate = item.total > 0 ? Number((((item.present + item.late) / item.total) * 100).toFixed(1)) : 0;
      return {
        date,
        day: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
        attendanceRate: rate,
        rate,
        totalSessions: item.total,
        total: item.total,
      };
    });

    // 3. Class-wise Attendance Distribution ({Department})
    const classMap = new Map<string, { present: number; late: number; absent: number; total: number }>();
    // Map timetableId to section
    const ttSectionMap = new Map<string, string>();
    timetableSlots.forEach((t) => {
      ttSectionMap.set(t.id, `${ctx.deptCode}-${t.section.replace(/^section\s*/i, "")}`);
    });

    attendanceRecords.forEach((r) => {
      const sec = (r.timetableId ? ttSectionMap.get(r.timetableId) : null) || `${ctx.deptCode}-A`;
      if (!classMap.has(sec)) {
        classMap.set(sec, { present: 0, late: 0, absent: 0, total: 0 });
      }
      const c = classMap.get(sec)!;
      c.total++;
      if (r.status === "Present") c.present++;
      else if (r.status === "Late") c.late++;
      else if (r.status === "Absent") c.absent++;
    });

    const classWiseAttendance = Array.from(classMap.entries()).map(([section, counts]) => ({
      section,
      present: counts.present,
      late: counts.late,
      absent: counts.absent,
      total: counts.total,
      rate: counts.total > 0 ? Number((((counts.present + counts.late) / counts.total) * 100).toFixed(1)) : 0,
    }));

    // 4. Today's Classes for Department
    const todaySlots = timetableSlots.filter((s) => s.day.toLowerCase() === dayName.toLowerCase());
    const todaySubmittedTtIds = new Set(
      attendanceRecords.filter((r) => r.date === today).map((r) => r.timetableId)
    );

    // Current time calculation for slot status
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentMinutes = currentHour * 60 + currentMin;

    const parseMinutes = (timeStr?: string | null) => {
      if (!timeStr) return null;
      const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!m) return null;
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const ampm = m[3]?.toUpperCase();
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h * 60 + min;
    };

    const todayClasses = todaySlots.map((slot) => {
      const startMin = parseMinutes(slot.startTime);
      const endMin = parseMinutes(slot.endTime);
      let status: "Completed" | "Ongoing" | "Upcoming" = "Upcoming";

      if (startMin !== null && endMin !== null) {
        if (currentMinutes > endMin) status = "Completed";
        else if (currentMinutes >= startMin && currentMinutes <= endMin) status = "Ongoing";
        else status = "Upcoming";
      }

      const isSubmitted = todaySubmittedTtIds.has(slot.id);

      return {
        id: slot.id,
        time: slot.startTime && slot.endTime ? `${slot.startTime} - ${slot.endTime}` : `Period ${slot.periodNumber}`,
        periodNumber: slot.periodNumber,
        semester: slot.semester,
        section: slot.section,
        courseCode: slot.course?.code || "N/A",
        courseName: slot.course?.name || "Assigned Lecture",
        subjectCode: slot.course?.code || "N/A",
        subjectName: slot.course?.name || "Assigned Lecture",
        facultyName: slot.faculty?.name || "Faculty Member",
        room: slot.roomNo || "Room 101",
        roomNo: slot.roomNo || "Room 101",
        status,
        attendanceStatus: isSubmitted ? "Attendance Submitted" : "Attendance Pending",
      };
    });

    // 5. Faculty Attendance Today (department faculty scheduled periods and submission)
    const deptFaculties = await prisma.faculty.findMany({
      where: {
        department: { in: ctx.matchingDepts },
        status: { not: "Inactive" },
      },
      select: { id: true, name: true, rollNumber: true, email: true },
      orderBy: { name: "asc" },
    });

    const facultyAttendanceToday = deptFaculties.map((fac) => {
      const facTodaySlots = todaySlots.filter((s) => s.faculty?.name === fac.name);
      const conductedCount = facTodaySlots.filter((s) => todaySubmittedTtIds.has(s.id)).length;
      return {
        facultyId: fac.id,
        facultyName: fac.name,
        rollNumber: fac.rollNumber,
        scheduledPeriods: facTodaySlots.length,
        periodsToday: facTodaySlots.length,
        conductedPeriods: conductedCount,
        pendingPeriods: Math.max(0, facTodaySlots.length - conductedCount),
        attendanceStatus:
          facTodaySlots.length === 0
            ? "No Classes Today"
            : conductedCount === facTodaySlots.length
            ? "All Submitted"
            : conductedCount > 0
            ? "Partially Submitted"
            : "Pending",
        status:
          facTodaySlots.length === 0
            ? "No Classes Today"
            : conductedCount === facTodaySlots.length
            ? "Present"
            : "Pending",
      };
    });

    // 6. Department Alerts (Students below 75% cutoff and pending sessions)
    const studentAttendanceAgg = new Map<string, { present: number; late: number; total: number }>();
    attendanceRecords.forEach((r) => {
      if (!studentAttendanceAgg.has(r.userId)) {
        studentAttendanceAgg.set(r.userId, { present: 0, late: 0, total: 0 });
      }
      const s = studentAttendanceAgg.get(r.userId)!;
      s.total++;
      if (r.status === "Present") s.present++;
      else if (r.status === "Late") s.late++;
    });

    let shortageStudentsCount = 0;
    studentAttendanceAgg.forEach((val) => {
      if (val.total > 0) {
        const pct = ((val.present + val.late) / val.total) * 100;
        if (pct < 75.0) shortageStudentsCount++;
      }
    });

    const pendingTodaySessionsCount = todaySlots.filter((s) => !todaySubmittedTtIds.has(s.id)).length;

    return {
      hodIdentity: {
        name: ctx.hodName,
        email: ctx.hodEmail,
        role: "HOD",
        departmentCode: ctx.deptCode,
        departmentName: ctx.deptName,
      },
      today: {
        date: today,
        day: dayName,
        academicYear,
      },
      metrics: {
        departmentStudents: studentCount,
        departmentFaculty: facultyCount,
        activeClasses: activeClassesCount,
        departmentAttendance: departmentAttendancePct,
        totalAttendanceRecords: totalRecords,
        presentRecords,
        lateRecords,
        absentRecords,
      },
      attendanceTrend,
      attendanceTrendDetails: {
        hasTrendData: attendanceTrend.length > 0,
        trend: attendanceTrend,
      },
      classWiseAttendance,
      todayClasses,
      facultyAttendanceToday,
      alerts: {
        studentsBelowThreshold: shortageStudentsCount,
        shortageStudentsCount,
        pendingAttendanceSessions: pendingTodaySessionsCount,
        pendingAttendanceClassesCount: pendingTodaySessionsCount,
        pendingSessionsCount: pendingTodaySessionsCount,
      },
    };
  }

  /**
   * Returns the department-scoped attendance ledger with pagination and filters.
   */
  static async getHodAttendanceLedger(
    ctx: HodContext,
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      semester?: string;
      section?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 25));
    const skip = (page - 1) * pageSize;

    const where: any = {
      timetable: {
        branch: { in: ctx.matchingDepts },
      },
    };

    if (params.status && params.status !== "All") {
      where.status = params.status;
    }

    if (params.semester && params.semester !== "All") {
      where.timetable.semester = Number(params.semester);
    }

    if (params.section && params.section !== "All") {
      where.timetable.section = { contains: params.section, mode: "insensitive" };
    }

    if (params.dateFrom || params.dateTo) {
      where.date = {
        ...(params.dateFrom ? { gte: params.dateFrom } : {}),
        ...(params.dateTo ? { lte: params.dateTo } : {}),
      };
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { rollNumber: { contains: q, mode: "insensitive" } } },
        { course: { code: { contains: q, mode: "insensitive" } } },
        { course: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [total, records, allStatusCounts] = await Promise.all([
      prisma.attendanceRecord.count({ where }),
      prisma.attendanceRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, rollNumber: true, department: true, section: true, semester: true } },
          timetable: { select: { id: true, branch: true, section: true, semester: true, periodNumber: true, roomNo: true } },
          course: { select: { id: true, code: true, name: true } },
          faculty: { select: { id: true, name: true } },
        },
      }),
      // Count without status filter for summary cards
      prisma.attendanceRecord.groupBy({
        by: ["status"],
        where: {
          timetable: { branch: { in: ctx.matchingDepts } },
          ...(params.dateFrom || params.dateTo ? { date: where.date } : {}),
        },
        _count: true,
      }),
    ]);

    let present = 0;
    let absent = 0;
    let late = 0;
    let totalAll = 0;
    allStatusCounts.forEach((s) => {
      totalAll += s._count;
      if (s.status === "Present") present += s._count;
      else if (s.status === "Absent") absent += s._count;
      else if (s.status === "Late") late += s._count;
    });

    const attendanceRate = totalAll > 0 ? Number((((present + late) / totalAll) * 100).toFixed(1)) : 0;

    return {
      data: records.map((r) => ({
        id: r.id,
        date: r.date,
        rollNumber: r.user?.rollNumber || "N/A",
        studentName: r.user?.name || "Student",
        department: r.user?.department || r.timetable?.branch || ctx.deptCode,
        semester: r.timetable?.semester || r.user?.semester || 1,
        section: r.timetable?.section || r.user?.section || "A",
        courseCode: r.course?.code || "N/A",
        courseName: r.course?.name || "Subject Lecture",
        facultyName: r.faculty?.name || "Faculty Member",
        periodNumber: r.periodNumber || r.timetable?.periodNumber || 1,
        roomNo: r.timetable?.roomNo || "Room 101",
        status: r.status,
      })),
      statistics: {
        total: totalAll,
        present,
        absent,
        late,
        attendanceRate: attendanceRate.toString(),
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Faculty Conduction Audit for the HOD's department.
   */
  static async getHodFacultyConduction(ctx: HodContext) {
    const latestTt = await prisma.masterTimetable.findFirst({
      where: { branch: { in: ctx.matchingDepts } },
      orderBy: { createdAt: "desc" },
      select: { academicYear: true },
    });
    const academicYear = latestTt?.academicYear || "2026-27";

    const faculties = await prisma.faculty.findMany({
      where: {
        department: { in: ctx.matchingDepts },
        status: { not: "Inactive" },
      },
      select: { id: true, name: true, rollNumber: true, email: true },
      orderBy: { name: "asc" },
    });

    const [timetables, attRecords] = await Promise.all([
      prisma.masterTimetable.findMany({
        where: {
          branch: { in: ctx.matchingDepts },
          academicYear,
        },
        select: { id: true, facultyId: true, faculty: { select: { name: true } } },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          timetable: { branch: { in: ctx.matchingDepts }, academicYear },
        },
        select: { timetableId: true, date: true, facultyId: true, faculty: { select: { name: true } } },
      }),
    ]);

    const result = faculties.map((fac) => {
      const facTimetables = timetables.filter(
        (t) => t.facultyId === fac.id || t.faculty?.name === fac.name
      );
      const facTtIds = new Set(facTimetables.map((t) => t.id));

      const facSubmissions = attRecords.filter(
        (r) => r.facultyId === fac.id || r.faculty?.name === fac.name || (r.timetableId ? facTtIds.has(r.timetableId) : false)
      );

      // Session conduction identified by distinct timetableId + date
      const conductedKeys = new Set(
        facSubmissions
          .filter((r) => r.timetableId)
          .map((r) => `${r.timetableId}-${r.date}`)
      );
      const conductedSessions = conductedKeys.size;
      const scheduledClasses = facTimetables.length;
      const pendingClasses = Math.max(0, scheduledClasses - conductedSessions);
      const conductionRate =
        scheduledClasses > 0 ? Number(((conductedSessions / scheduledClasses) * 100).toFixed(1)) : 0;

      return {
        facultyId: fac.id,
        name: fac.name,
        rollNumber: fac.rollNumber,
        department: ctx.deptCode,
        scheduledClasses,
        completedSessions: conductedSessions,
        pendingSessions: pendingClasses,
        conductionRate,
        status: conductionRate >= 80 ? "Optimal" : conductionRate >= 50 ? "Moderate" : "Action Required",
      };
    });

    const totalSched = result.reduce((acc, f) => acc + f.scheduledClasses, 0);
    const totalComp = result.reduce((acc, f) => acc + f.completedSessions, 0);

    return {
      data: result,
      summary: {
        totalFaculty: faculties.length,
        totalScheduledClasses: totalSched,
        totalCompletedSessions: totalComp,
        overallConductionRate: totalSched > 0 ? Number(((totalComp / totalSched) * 100).toFixed(1)) : 0,
      },
    };
  }

  /**
   * Student Attendance Performance & Shortage Audit for HOD's department.
   */
  static async getHodStudentAttendance(
    ctx: HodContext,
    params: {
      page?: number;
      pageSize?: number;
      semester?: string;
      section?: string;
      search?: string;
      threshold?: number;
    }
  ) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 25));
    const skip = (page - 1) * pageSize;
    const threshold = Number(params.threshold) || 75.0;

    const studentWhere: any = {
      department: { in: ctx.matchingDepts },
    };

    if (params.semester && params.semester !== "All") {
      studentWhere.semester = Number(params.semester);
    }
    if (params.section && params.section !== "All") {
      studentWhere.section = { contains: params.section, mode: "insensitive" };
    }
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      studentWhere.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { rollNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    const [totalStudents, students, allAttRecords] = await Promise.all([
      prisma.student.count({ where: studentWhere }),
      prisma.student.findMany({
        where: studentWhere,
        skip,
        take: pageSize,
        orderBy: { rollNumber: "asc" },
        select: {
          id: true,
          rollNumber: true,
          name: true,
          email: true,
          department: true,
          semester: true,
          section: true,
          status: true,
        },
      }),
      // Query attendance records for students in this department
      prisma.attendanceRecord.findMany({
        where: {
          user: { department: { in: ctx.matchingDepts } },
        },
        select: { userId: true, status: true },
      }),
    ]);

    // Aggregate attendance per student
    const attMap = new Map<string, { present: number; late: number; absent: number; total: number }>();
    allAttRecords.forEach((r) => {
      if (!attMap.has(r.userId)) {
        attMap.set(r.userId, { present: 0, late: 0, absent: 0, total: 0 });
      }
      const a = attMap.get(r.userId)!;
      a.total++;
      if (r.status === "Present") a.present++;
      else if (r.status === "Late") a.late++;
      else if (r.status === "Absent") a.absent++;
    });

    const rows = students.map((s) => {
      const att = attMap.get(s.id) || { present: 0, late: 0, absent: 0, total: 0 };
      const attended = att.present + att.late;
      const rate = att.total > 0 ? Number(((attended / att.total) * 100).toFixed(1)) : 0;
      const isEligible = rate >= threshold;

      return {
        id: s.id,
        rollNumber: s.rollNumber,
        name: s.name,
        email: s.email,
        department: s.department || ctx.deptCode,
        semester: s.semester || 1,
        section: s.section || "A",
        totalSessions: att.total,
        present: att.present,
        late: att.late,
        absent: att.absent,
        attendanceRate: rate,
        eligibility: isEligible ? "Eligible" : "Attendance Shortage",
      };
    });

    // Compute institution metrics for summary
    let belowThresholdCount = 0;
    let eligibleCount = 0;
    let sumRate = 0;
    let activeStudentCount = 0;

    attMap.forEach((v) => {
      if (v.total > 0) {
        const rate = ((v.present + v.late) / v.total) * 100;
        sumRate += rate;
        activeStudentCount++;
        if (rate < threshold) belowThresholdCount++;
        else eligibleCount++;
      }
    });

    const averageAttendance = activeStudentCount > 0 ? Number((sumRate / activeStudentCount).toFixed(1)) : 0;

    return {
      data: rows,
      summary: {
        totalStudents,
        studentsBelowThreshold: belowThresholdCount,
        eligibleStudents: eligibleCount,
        averageAttendance,
        threshold,
      },
      pagination: {
        page,
        pageSize,
        total: totalStudents,
        totalPages: Math.ceil(totalStudents / pageSize) || 1,
      },
    };
  }

  /**
   * Detailed Attendance profile for a specific department student.
   */
  static async getHodStudentDetails(ctx: HodContext, studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        rollNumber: true,
        name: true,
        email: true,
        department: true,
        semester: true,
        section: true,
        year: true,
        status: true,
      },
    });

    if (!student) {
      const err: any = new Error("Student not found.");
      err.statusCode = 404;
      throw err;
    }

    // Security: Student must belong to HOD's department
    const studentDeptNorm = normalizeBranchCode(student.department || undefined);
    if (studentDeptNorm !== ctx.deptCode) {
      const err: any = new Error(
        `Access denied: Student ${student.rollNumber} does not belong to your department (${ctx.deptCode}).`
      );
      err.statusCode = 403;
      throw err;
    }

    const records = await prisma.attendanceRecord.findMany({
      where: { userId: studentId },
      include: {
        course: { select: { id: true, code: true, name: true } },
        faculty: { select: { id: true, name: true } },
        timetable: { select: { id: true, periodNumber: true, roomNo: true } },
      },
      orderBy: { date: "desc" },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === "Present").length;
    const late = records.filter((r) => r.status === "Late").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const rate = total > 0 ? Number((((present + late) / total) * 100).toFixed(1)) : 0;

    // Subject-wise Breakdown
    const subjectMap = new Map<string, { code: string; name: string; present: number; late: number; absent: number; total: number }>();
    records.forEach((r) => {
      const code = r.course?.code || "GEN";
      if (!subjectMap.has(code)) {
        subjectMap.set(code, {
          code,
          name: r.course?.name || "General Course",
          present: 0,
          late: 0,
          absent: 0,
          total: 0,
        });
      }
      const s = subjectMap.get(code)!;
      s.total++;
      if (r.status === "Present") s.present++;
      else if (r.status === "Late") s.late++;
      else if (r.status === "Absent") s.absent++;
    });

    const subjectBreakdown = Array.from(subjectMap.values()).map((s) => ({
      courseCode: s.code,
      courseName: s.name,
      totalSessions: s.total,
      present: s.present,
      late: s.late,
      absent: s.absent,
      rate: s.total > 0 ? Number((((s.present + s.late) / s.total) * 100).toFixed(1)) : 0,
    }));

    return {
      student,
      summary: {
        totalSessions: total,
        present,
        late,
        absent,
        attendanceRate: rate,
        eligibility: rate >= 75.0 ? "Eligible" : "Attendance Shortage",
      },
      subjectBreakdown,
      history: records.slice(0, 50).map((r) => ({
        id: r.id,
        date: r.date,
        courseCode: r.course?.code || "N/A",
        courseName: r.course?.name || "Subject Lecture",
        facultyName: r.faculty?.name || "Faculty Member",
        periodNumber: r.periodNumber || r.timetable?.periodNumber || 1,
        roomNo: r.timetable?.roomNo || "Room 101",
        status: r.status,
      })),
    };
  }

  /**
   * Filter-aware CSV export strictly scoped to the authenticated HOD's department.
   */
  static async exportHodAttendanceCSV(
    ctx: HodContext,
    params: {
      status?: string;
      semester?: string;
      section?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    }
  ) {
    const where: any = {
      timetable: {
        branch: { in: ctx.matchingDepts },
      },
    };

    if (params.status && params.status !== "All") {
      where.status = params.status;
    }
    if (params.semester && params.semester !== "All") {
      where.timetable.semester = Number(params.semester);
    }
    if (params.section && params.section !== "All") {
      where.timetable.section = { contains: params.section, mode: "insensitive" };
    }
    if (params.dateFrom || params.dateTo) {
      where.date = {
        ...(params.dateFrom ? { gte: params.dateFrom } : {}),
        ...(params.dateTo ? { lte: params.dateTo } : {}),
      };
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        user: { select: { rollNumber: true, name: true, department: true } },
        course: { select: { code: true, name: true } },
        faculty: { select: { name: true } },
        timetable: { select: { section: true, semester: true, periodNumber: true, roomNo: true } },
      },
    });

    const nowIso = new Date().toISOString();
    const filterInfo = `Department=${ctx.deptCode} | Semester=${params.semester || "All"} | Section=${params.section || "All"} | Status=${params.status || "All"}`;

    const headers = [
      `# ANIL NEERUKONDA INSTITUTE OF TECHNOLOGY AND SCIENCES (ANITS)`,
      `# DEPARTMENT ATTENDANCE LEDGER: ${ctx.deptName} (${ctx.deptCode})`,
      `# GENERATED AT: ${nowIso}`,
      `# GENERATED BY: ${ctx.hodName} (HOD · ${ctx.deptCode})`,
      `# APPLIED FILTERS: ${filterInfo}`,
      `"Date","Roll Number","Student Name","Department","Semester","Section","Course Code","Course Name","Faculty","Period","Room","Status"`,
    ];

    const rows = records.map((r) => {
      const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      return [
        escape(r.date),
        escape(r.user?.rollNumber || "N/A"),
        escape(r.user?.name || "Student"),
        escape(ctx.deptCode),
        escape(r.timetable?.semester || 1),
        escape(r.timetable?.section || "A"),
        escape(r.course?.code || "N/A"),
        escape(r.course?.name || "N/A"),
        escape(r.faculty?.name || "N/A"),
        escape(`Period ${r.timetable?.periodNumber || r.periodNumber || 1}`),
        escape(r.timetable?.roomNo || "Room 101"),
        escape(r.status),
      ].join(",");
    });

    return [...headers, ...rows].join("\r\n");
  }

  /**
   * Search scoped strictly to HOD's department.
   */
  static async searchHodDepartment(ctx: HodContext, query: string) {
    const q = (query || "").trim();
    if (q.length < 2) {
      return { students: [], faculty: [], departments: [] };
    }

    const [students, faculties] = await Promise.all([
      prisma.student.findMany({
        where: {
          department: { in: ctx.matchingDepts },
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { rollNumber: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, rollNumber: true, name: true, department: true, semester: true, section: true },
        take: 10,
      }),
      prisma.faculty.findMany({
        where: {
          department: { in: ctx.matchingDepts },
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { rollNumber: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, rollNumber: true, department: true, role: true },
        take: 10,
      }),
    ]);

    return {
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        rollNumber: s.rollNumber,
        department: s.department || ctx.deptCode,
        details: `Sem ${s.semester || 1} · Sec ${s.section || "A"}`,
      })),
      faculty: faculties.map((f) => ({
        id: f.id,
        name: f.name,
        rollNumber: f.rollNumber,
        department: f.department || ctx.deptCode,
        details: f.role || "Faculty",
      })),
      departments: [
        {
          id: ctx.deptCode,
          code: ctx.deptCode,
          name: ctx.deptName,
        },
      ],
    };
  }
}
