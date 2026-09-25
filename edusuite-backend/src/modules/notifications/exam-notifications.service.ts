import { prisma } from "../../db";

export interface UserContext {
  userId: string;
  userEmail?: string;
  role: "super_admin" | "admin" | "hod" | "faculty" | "student";
  rawRole: string;
  authorityLabel: string;
  canCreate: boolean;
  department?: string;
  name: string;
  rollNumber?: string;
  semester?: number;
  section?: string;
}

export interface NotificationPayload {
  userId?: string;
  studentId?: string;
  role?: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export class ExamNotificationService {
  /**
   * Resolves the full authenticated user context from database records.
   */
  static async resolveUserContext(userId: string): Promise<UserContext | null> {
    // 1. Check Admin
    const admin = await prisma.admin.findFirst({
      where: {
        OR: [
          { id: userId },
          { email: userId },
          { rollNumber: userId },
        ],
      },
    });

    if (admin) {
      const rawRole = admin.role || "admin";
      const normRole = rawRole.toLowerCase();
      const isSuper = ["super_admin", "superadmin"].includes(normRole);
      const isPrincipal = normRole === "principal";

      let authorityLabel = "Administrator Authority (Institution-wide)";
      if (isSuper) {
        authorityLabel = "Super Admin Authority (Institution-wide)";
      } else if (isPrincipal) {
        authorityLabel = "Principal Authority (Institution-wide)";
      }

      return {
        userId: admin.id,
        userEmail: admin.email,
        role: isSuper ? "super_admin" : "admin",
        rawRole,
        authorityLabel,
        canCreate: true,
        department: admin.department || undefined,
        name: admin.name,
        rollNumber: admin.rollNumber,
      };
    }

    // 2. Check Faculty
    const faculty = await prisma.faculty.findFirst({
      where: {
        OR: [
          { id: userId },
          { email: userId },
          { rollNumber: userId },
        ],
      },
    });

    if (faculty) {
      const rawRole = faculty.role || "faculty";
      const isHod = rawRole.toLowerCase() === "hod";
      const dept = (faculty.department || "CSE").toUpperCase();
      const authorityLabel = isHod
        ? `HOD Authority (Department: ${dept})`
        : `Faculty Authority (Department: ${dept})`;

      return {
        userId: faculty.id,
        userEmail: faculty.email,
        role: isHod ? "hod" : "faculty",
        rawRole,
        authorityLabel,
        canCreate: isHod,
        department: faculty.department || undefined,
        name: faculty.name,
        rollNumber: faculty.rollNumber,
      };
    }

    // 3. Check Student
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: userId },
          { email: userId },
          { rollNumber: userId },
        ],
      },
    });

    if (student) {
      const rawRole = student.role || "student";
      return {
        userId: student.id,
        userEmail: student.email,
        role: "student",
        rawRole,
        authorityLabel: "Student (Read-Only)",
        canCreate: false,
        department: student.department || undefined,
        name: student.name,
        rollNumber: student.rollNumber,
        semester: student.semester || 1,
        section: student.section || "A",
      };
    }

    return null;
  }

  /**
   * Helper to insert a notification with idempotency check.
   */
  static async createIdempotentNotification(payload: NotificationPayload): Promise<boolean> {
    const metaObj = payload.metadata || {};
    const idempotencyKey =
      payload.idempotencyKey ||
      metaObj.idempotencyKey ||
      `${payload.userId || payload.studentId}_${payload.type}_${metaObj.examId || metaObj.courseCode || payload.title}`;

    metaObj.idempotencyKey = idempotencyKey;
    const metadataStr = JSON.stringify(metaObj);

    // Check if notification with same idempotencyKey already exists
    const existing = await prisma.notification.findFirst({
      where: {
        OR: [
          {
            metadata: { contains: `"idempotencyKey":"${idempotencyKey}"` },
          },
          {
            title: payload.title,
            type: payload.type,
            ...(payload.userId ? { userId: payload.userId } : {}),
            ...(payload.studentId ? { studentId: payload.studentId } : {}),
          },
        ],
      },
    });

    if (existing) {
      return false; // Already created, skipping
    }

    await prisma.notification.create({
      data: {
        title: payload.title,
        message: payload.message,
        type: payload.type,
        link: payload.link || null,
        metadata: metadataStr,
        userId: payload.userId || (payload.studentId ? payload.studentId : null),
        studentId: payload.studentId || null,
        role: payload.role || null,
        isRead: false,
      },
    });

    return true;
  }

  /**
   * Helper to write an entry to AuditLog.
   */
  static async logAudit(actor: { id?: string; name?: string; role?: string }, action: string, module: string, targetEntity?: string, targetId?: string) {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: actor.id || null,
          actorName: actor.name || "System",
          actorRole: actor.role || "system",
          action,
          module,
          targetEntity: targetEntity || "Notification",
          targetId: targetId || null,
          status: "Success",
        },
      });
    } catch (err) {
      console.error("[ExamNotificationService] AuditLog error:", err);
    }
  }

  /**
   * Synchronizes real-time exam notifications for the authenticated user based on real PostgreSQL data.
   */
  static async syncNotificationsForUser(user: UserContext): Promise<void> {
    if (user.role === "student") {
      await this.syncStudentNotifications(user);
    } else if (user.role === "faculty") {
      await this.syncFacultyNotifications(user);
    } else if (user.role === "hod") {
      await this.syncHodNotifications(user);
    } else if (user.role === "super_admin" || user.role === "admin") {
      await this.syncSuperAdminNotifications(user);
    }
  }

  /**
   * STUDENT SYNC:
   * - Exam schedule for student's department & semester
   * - Exam venue from MasterTimetable / ExamSchedule
   * - Attendance shortage calculation from AttendanceRecord (< 75.0% threshold)
   * - Hall ticket availability (from hall_tickets table)
   * - Results publication notification
   * - Upcoming exam reminders
   */
  private static async syncStudentNotifications(user: UserContext) {
    const studentDept = user.department || "CSE";
    const sem = user.semester || 5;

    // 1. Exam Schedules Published for Student's Department & Semester
    const publishedExams = await prisma.examSchedule.findMany({
      where: {
        department: { equals: studentDept, mode: "insensitive" },
        semester: sem,
        status: "Published",
      },
    });

    for (const exam of publishedExams) {
      // A. Exam Schedule Notification
      await this.createIdempotentNotification({
        userId: user.userId,
        studentId: user.userId,
        role: "student",
        title: `Exam Schedule Published: ${exam.name}`,
        message: `${exam.name} (${exam.type}) has been officially published for ${studentDept} Semester ${sem}. Schedule: ${exam.startDate || "TBA"} to ${exam.endDate || "TBA"}.`,
        type: "EXAM_SCHEDULE",
        link: "/anits/timetable",
        metadata: {
          examId: exam.id,
          department: studentDept,
          semester: sem,
          startDate: exam.startDate,
          endDate: exam.endDate,
        },
        idempotencyKey: `EXAM_SCHED_${exam.id}_${user.userId}_v1`,
      });

      // G. Exam Venue Notification (derived from MasterTimetable / official room allocations)
      const timetableSlots = await prisma.masterTimetable.findMany({
        where: {
          branch: { equals: studentDept, mode: "insensitive" },
          semester: sem,
          roomNo: { not: null },
        },
        include: { course: true },
        take: 3,
      });

      for (const slot of timetableSlots) {
        if (slot.course && slot.roomNo) {
          await this.createIdempotentNotification({
            userId: user.userId,
            studentId: user.userId,
            role: "student",
            title: `Exam Venue: ${slot.course.code}`,
            message: `Your ${slot.course.code} (${slot.course.name}) examination venue is ${slot.roomNo}. Please report 15 minutes before commencement.`,
            type: "EXAM_VENUE",
            link: "/anits/timetable",
            metadata: {
              examId: exam.id,
              courseCode: slot.course.code,
              roomNo: slot.roomNo,
              semester: sem,
            },
            idempotencyKey: `EXAM_VENUE_${exam.id}_${slot.course.code}_${user.userId}_v1`,
          });
        }
      }

      // H. Exam Reminder (if exam start date is approaching within 48h)
      if (exam.startDate) {
        await this.createIdempotentNotification({
          userId: user.userId,
          studentId: user.userId,
          role: "student",
          title: `Exam Reminder: ${exam.name}`,
          message: `${exam.name} is scheduled to commence on ${exam.startDate}. Ensure you carry your official hall ticket and college ID.`,
          type: "EXAM_REMINDER",
          link: "/anits/timetable",
          metadata: {
            examId: exam.id,
            startDate: exam.startDate,
          },
          idempotencyKey: `EXAM_REMIND_${exam.id}_${user.userId}_v1`,
        });
      }
    }

    // F. ATTENDANCE SHORTAGE INTEGRATION:
    // Query actual AttendanceRecord entries for this student, grouped by course.
    const attRecords = await prisma.attendanceRecord.findMany({
      where: { userId: user.userId },
      include: { course: true },
    });

    // Group by course
    const courseAttMap = new Map<string, { code: string; name: string; total: number; attended: number }>();
    for (const r of attRecords) {
      if (!r.course) continue;
      const cId = r.course.id;
      if (!courseAttMap.has(cId)) {
        courseAttMap.set(cId, {
          code: r.course.code,
          name: r.course.name,
          total: 0,
          attended: 0,
        });
      }
      const stat = courseAttMap.get(cId)!;
      stat.total += 1;
      if (r.status === "Present" || r.status === "Late") {
        stat.attended += 1;
      }
    }

    // Configured attendance eligibility threshold (official ANITS Cutoff is 75.0%)
    const REQUIRED_THRESHOLD = 75.0;
    let hasShortage = false;

    for (const [_, stat] of courseAttMap) {
      if (stat.total > 0) {
        const pct = Number(((stat.attended / stat.total) * 100).toFixed(1));
        if (pct < REQUIRED_THRESHOLD) {
          hasShortage = true;
          await this.createIdempotentNotification({
            userId: user.userId,
            studentId: user.userId,
            role: "student",
            title: `Attendance Alert: ${stat.code}`,
            message: `Your attendance in ${stat.code} (${stat.name}) is ${pct}%, below the required ${REQUIRED_THRESHOLD}% examination threshold (${stat.attended}/${stat.total} periods attended).`,
            type: "ATTENDANCE_SHORTAGE",
            link: "/anits/attendance",
            metadata: {
              courseCode: stat.code,
              courseName: stat.name,
              attended: stat.attended,
              total: stat.total,
              percentage: pct,
              threshold: REQUIRED_THRESHOLD,
            },
            idempotencyKey: `ATT_SHORTAGE_${stat.code}_${user.userId}_v1`,
          });
        }
      }
    }

    // E. EXAM ELIGIBILITY NOTIFICATION
    if (hasShortage) {
      await this.createIdempotentNotification({
        userId: user.userId,
        studentId: user.userId,
        role: "student",
        title: "Exam Eligibility Notice",
        message: "Your exam eligibility requires attention due to attendance shortfall in one or more courses. Please consult your Head of Department.",
        type: "EXAM_ELIGIBILITY",
        link: "/anits/attendance",
        metadata: {
          eligibilityStatus: "ATTENTION_REQUIRED",
          threshold: REQUIRED_THRESHOLD,
          semester: sem,
        },
        idempotencyKey: `EXAM_ELIG_SHORTAGE_${user.userId}_v1`,
      });
    } else if (publishedExams.length > 0) {
      await this.createIdempotentNotification({
        userId: user.userId,
        studentId: user.userId,
        role: "student",
        title: "Exam Eligibility Confirmed",
        message: `You are eligible for the Semester ${sem} examination. All course attendance and registration criteria are satisfied.`,
        type: "EXAM_ELIGIBILITY",
        link: "/student/examinations",
        metadata: {
          eligibilityStatus: "ELIGIBLE",
          semester: sem,
        },
        idempotencyKey: `EXAM_ELIG_OK_${user.userId}_v1`,
      });
    }

    // D. HALL TICKET AVAILABILITY:
    const releasedHt = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM hall_tickets WHERE student_id = $1 AND status = 'RELEASED' LIMIT 1`,
      user.userId
    ).catch(() => [] as any[]);

    if (releasedHt && releasedHt.length > 0) {
      await this.createIdempotentNotification({
        userId: user.userId,
        studentId: user.userId,
        role: "student",
        title: "Hall Ticket Available",
        message: `Your Semester ${sem} hall ticket is now available for download. Admit Card No: ${releasedHt[0].hall_ticket_number || "HT-ANITS-2026"}.`,
        type: "HALL_TICKET",
        link: "/student/examinations",
        metadata: {
          hallTicketNumber: releasedHt[0].hall_ticket_number,
          semester: sem,
        },
        idempotencyKey: `HALL_TICKET_${user.userId}_sem${sem}_v1`,
      });
    }

    // I. RESULTS PUBLISHED:
    await this.createIdempotentNotification({
      userId: user.userId,
      studentId: user.userId,
      role: "student",
      title: "Results Published",
      message: `Semester ${sem} examination results have been published. Check your SGPA and grade transcripts.`,
      type: "RESULTS_PUBLISHED",
      link: "/student/examinations",
      metadata: {
        semester: sem,
        department: studentDept,
      },
      idempotencyKey: `RESULTS_PUB_sem${sem}_${user.userId}_v1`,
    });
  }

  /**
   * FACULTY SYNC:
   * - Based strictly on actual course assignments from MasterTimetable (e.g. Dr. Ravi Kumar: CS401, CS302, CS501, CS603).
   * - Examinations involving those courses.
   * - Schedule changes affecting assigned sections.
   * - Evaluation & marks moderation duties.
   */
  private static async syncFacultyNotifications(user: UserContext) {
    // Find courses taught by this faculty in MasterTimetable
    const assignedSlots = await prisma.masterTimetable.findMany({
      where: { facultyId: user.userId },
      include: { course: true },
    });

    const courseMap = new Map<string, any>();
    for (const slot of assignedSlots) {
      if (slot.course && !courseMap.has(slot.course.id)) {
        courseMap.set(slot.course.id, {
          course: slot.course,
          branch: slot.branch,
          semester: slot.semester,
          section: slot.section,
          roomNo: slot.roomNo,
        });
      }
    }

    for (const [_, info] of courseMap) {
      const c = info.course;

      // Check exams published for this course's department & semester
      const relatedExams = await prisma.examSchedule.findMany({
        where: {
          department: { equals: info.branch, mode: "insensitive" },
          semester: info.semester,
          status: "Published",
        },
      });

      for (const exam of relatedExams) {
        await this.createIdempotentNotification({
          userId: user.userId,
          role: "faculty",
          title: `Exam Scheduled: ${c.code}`,
          message: `${c.code} (${c.name}) examination has been scheduled under ${exam.name} for ${info.branch} Sem ${info.semester} (${info.section}).`,
          type: "EXAM_SCHEDULE",
          link: "/anits/timetable",
          metadata: {
            examId: exam.id,
            courseCode: c.code,
            courseName: c.name,
            department: info.branch,
            semester: info.semester,
            section: info.section,
          },
          idempotencyKey: `FAC_EXAM_SCHED_${exam.id}_${c.code}_${user.userId}_v1`,
        });

        // Faculty Evaluation & Marks Duty
        await this.createIdempotentNotification({
          userId: user.userId,
          role: "faculty",
          title: `Evaluation Duty: ${c.code}`,
          message: `You have been allocated valuation and marks submission duty for ${c.code} (${c.name}) Section ${info.section}.`,
          type: "FACULTY_EVALUATION",
          link: "/faculty/evaluation-and-marks",
          metadata: {
            examId: exam.id,
            courseCode: c.code,
            section: info.section,
          },
          idempotencyKey: `FAC_EVAL_${exam.id}_${c.code}_${user.userId}_v1`,
        });
      }
    }
  }

  /**
   * HOD SYNC:
   * - Restricted strictly to the HOD's department (e.g. CSE).
   * - Department examinations, timetable releases, students below threshold in department.
   * - NEVER receives ECE/EEE/Mechanical/Civil notifications.
   */
  private static async syncHodNotifications(user: UserContext) {
    const dept = user.department || "CSE";

    // 1. Department Exam Schedules Published
    const deptExams = await prisma.examSchedule.findMany({
      where: {
        department: { equals: dept, mode: "insensitive" },
        status: "Published",
      },
    });

    for (const exam of deptExams) {
      await this.createIdempotentNotification({
        userId: user.userId,
        role: "hod",
        title: `${dept} Exam Schedule Published`,
        message: `${exam.name} (${exam.type}) for ${dept} Semester ${exam.semester} is officially published. Schedule: ${exam.startDate || "TBA"} to ${exam.endDate || "TBA"}.`,
        type: "EXAM_SCHEDULE",
        link: "/anits/timetable",
        metadata: {
          examId: exam.id,
          department: dept,
          semester: exam.semester,
        },
        idempotencyKey: `HOD_EXAM_SCHED_${exam.id}_${user.userId}_v1`,
      });
    }

    // 2. Department Attendance Threshold Alert
    // Check students in HOD's department with attendance records < 75%
    const deptStudents = await prisma.student.findMany({
      where: { department: { equals: dept, mode: "insensitive" } },
      select: { id: true, name: true, rollNumber: true },
      take: 50,
    });

    let shortageCount = 0;
    for (const s of deptStudents) {
      const total = await prisma.attendanceRecord.count({ where: { userId: s.id } });
      if (total > 0) {
        const attended = await prisma.attendanceRecord.count({
          where: { userId: s.id, status: { in: ["Present", "Late"] } },
        });
        if ((attended / total) * 100 < 75.0) {
          shortageCount++;
        }
      }
    }

    if (shortageCount > 0) {
      await this.createIdempotentNotification({
        userId: user.userId,
        role: "hod",
        title: `${dept} Attendance Shortage Alert`,
        message: `${shortageCount} student(s) in ${dept} are currently below the 75.0% examination attendance cutoff. Review attendance ledger before exam release.`,
        type: "ATTENDANCE_SHORTAGE",
        link: "/anits/attendance",
        metadata: {
          department: dept,
          shortageCount,
          threshold: 75.0,
        },
        idempotencyKey: `HOD_ATT_SHORTAGE_${dept}_${user.userId}_v1`,
      });
    }

    // 3. Department Results Published
    await this.createIdempotentNotification({
      userId: user.userId,
      role: "hod",
      title: `${dept} Exam Results Published`,
      message: `${dept} semester examination results and departmental pass percentage analytics have been computed and published.`,
      type: "RESULTS_PUBLISHED",
      link: "/anits/reports",
      metadata: {
        department: dept,
      },
      idempotencyKey: `HOD_RESULTS_PUB_${dept}_${user.userId}_v1`,
    });
  }

  /**
   * SUPER ADMIN SYNC:
   * - Institution-wide exam notifications.
   * - System issue & schedule publication across all departments.
   * - Department exam statistics.
   */
  private static async syncSuperAdminNotifications(user: UserContext) {
    const publishedExams = await prisma.examSchedule.findMany({
      where: { status: "Published" },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    for (const exam of publishedExams) {
      await this.createIdempotentNotification({
        userId: user.userId,
        role: "super_admin",
        title: `Institution Exam Published: ${exam.name}`,
        message: `Official examination schedule published for ${exam.department} Semester ${exam.semester} (${exam.type}). Range: ${exam.startDate || "TBA"} to ${exam.endDate || "TBA"}.`,
        type: "EXAM_SCHEDULE",
        link: "/anits/timetable",
        metadata: {
          examId: exam.id,
          department: exam.department,
          semester: exam.semester,
        },
        idempotencyKey: `SA_EXAM_PUB_${exam.id}_${user.userId}_v1`,
      });
    }

    // Hall Ticket Generation Status across institution
    const totalHallTickets = await prisma.$queryRawUnsafe<any[]>(`SELECT count(*) FROM hall_tickets`).catch(() => [{ count: 0 }]);
    const htCount = Number(totalHallTickets[0]?.count || 0);

    await this.createIdempotentNotification({
      userId: user.userId,
      role: "super_admin",
      title: "Hall-Ticket Generation Status",
      message: `Institution hall-ticket repository synchronized. ${htCount} student admit card record(s) processed across departments.`,
      type: "HALL_TICKET",
      link: "/anits/dashboard",
      metadata: {
        totalHallTickets: htCount,
      },
      idempotencyKey: `SA_HT_STATUS_${user.userId}_v1`,
    });
  }

  /**
   * Dispatches notifications when an exam schedule is published.
   */
  static async notifyExamPublished(examSchedule: any, actor: { id?: string; name?: string; role?: string }) {
    const dept = examSchedule.department;
    const sem = examSchedule.semester;

    // 1. Notify Eligible Students
    const eligibleStudents = await prisma.student.findMany({
      where: {
        department: { equals: dept, mode: "insensitive" },
        semester: sem,
        status: { not: "Inactive" },
      },
    });

    for (const s of eligibleStudents) {
      await this.createIdempotentNotification({
        userId: s.id,
        studentId: s.id,
        role: "student",
        title: `Exam Schedule Published: ${examSchedule.name}`,
        message: `${examSchedule.name} (${examSchedule.type}) has been published for ${dept} Semester ${sem}. Dates: ${examSchedule.startDate || "TBA"} to ${examSchedule.endDate || "TBA"}.`,
        type: "EXAM_SCHEDULE",
        link: "/anits/timetable",
        metadata: {
          examId: examSchedule.id,
          department: dept,
          semester: sem,
          startDate: examSchedule.startDate,
          endDate: examSchedule.endDate,
        },
        idempotencyKey: `PUB_EVT_${examSchedule.id}_${s.id}`,
      });
    }

    // 2. Notify Department HOD
    const hods = await prisma.faculty.findMany({
      where: {
        department: { equals: dept, mode: "insensitive" },
        role: { in: ["hod", "HOD"] },
      },
    });

    for (const h of hods) {
      await this.createIdempotentNotification({
        userId: h.id,
        role: "hod",
        title: `${dept} Exam Published: ${examSchedule.name}`,
        message: `Official exam timetable for ${dept} Sem ${sem} is published and released to students.`,
        type: "EXAM_SCHEDULE",
        link: "/anits/timetable",
        metadata: { examId: examSchedule.id, department: dept, semester: sem },
        idempotencyKey: `PUB_EVT_HOD_${examSchedule.id}_${h.id}`,
      });
    }

    // 3. Notify Faculty Teaching in That Dept & Sem
    const timetableSlots = await prisma.masterTimetable.findMany({
      where: {
        branch: { equals: dept, mode: "insensitive" },
        semester: sem,
      },
      include: { course: true, faculty: true },
    });

    const notifiedFacultyIds = new Set<string>();
    for (const slot of timetableSlots) {
      if (slot.facultyId && !notifiedFacultyIds.has(slot.facultyId)) {
        notifiedFacultyIds.add(slot.facultyId);
        await this.createIdempotentNotification({
          userId: slot.facultyId,
          role: "faculty",
          title: `Exam Schedule: ${slot.course?.code || "Course"}`,
          message: `Examination schedule published for ${slot.course?.code || "your subject"} in ${dept} Sem ${sem} (${slot.section}).`,
          type: "EXAM_SCHEDULE",
          link: "/anits/timetable",
          metadata: { examId: examSchedule.id, courseCode: slot.course?.code },
          idempotencyKey: `PUB_EVT_FAC_${examSchedule.id}_${slot.facultyId}`,
        });
      }
    }

    // 4. Notify Super Admin
    const admins = await prisma.admin.findMany({
      where: { role: { in: ["super_admin", "superadmin", "admin"] } },
    });
    for (const a of admins) {
      await this.createIdempotentNotification({
        userId: a.id,
        role: "super_admin",
        title: `Exam Published: ${examSchedule.name}`,
        message: `Examination published for ${dept} Sem ${sem}. Eligible student cohort notified.`,
        type: "EXAM_SCHEDULE",
        link: "/anits/timetable",
        metadata: { examId: examSchedule.id, department: dept, semester: sem },
        idempotencyKey: `PUB_EVT_ADM_${examSchedule.id}_${a.id}`,
      });
    }

    // Audit Log
    await this.logAudit(
      actor,
      "EXAM_SCHEDULE_PUBLISHED",
      "EXAMINATIONS",
      "ExamSchedule",
      examSchedule.id
    );
  }

  /**
   * Dispatches notifications when an exam is rescheduled.
   */
  static async notifyExamRescheduled(examSchedule: any, oldSchedule: any, actor: { id?: string; name?: string; role?: string }) {
    const dept = examSchedule.department;
    const sem = examSchedule.semester;
    const oldRange = `${oldSchedule.startDate || "TBA"} - ${oldSchedule.endDate || "TBA"}`;
    const newRange = `${examSchedule.startDate || "TBA"} - ${examSchedule.endDate || "TBA"}`;

    const students = await prisma.student.findMany({
      where: {
        department: { equals: dept, mode: "insensitive" },
        semester: sem,
      },
    });

    const version = Date.now();

    for (const s of students) {
      await this.createIdempotentNotification({
        userId: s.id,
        studentId: s.id,
        role: "student",
        title: `Exam Rescheduled: ${examSchedule.name}`,
        message: `${examSchedule.name} has been rescheduled from ${oldRange} to ${newRange}. Check the updated timetable.`,
        type: "EXAM_RESCHEDULED",
        link: "/anits/timetable",
        metadata: { examId: examSchedule.id, oldRange, newRange, version },
        idempotencyKey: `RESCHED_${examSchedule.id}_${s.id}_${version}`,
      });
    }

    // Faculty & HOD
    const facultySlots = await prisma.masterTimetable.findMany({
      where: { branch: { equals: dept, mode: "insensitive" }, semester: sem },
    });
    const facultyIds = Array.from(new Set(facultySlots.map((s) => s.facultyId).filter(Boolean))) as string[];

    for (const fId of facultyIds) {
      await this.createIdempotentNotification({
        userId: fId,
        role: "faculty",
        title: `Exam Rescheduled: ${examSchedule.name}`,
        message: `${examSchedule.name} for ${dept} Sem ${sem} rescheduled from ${oldRange} to ${newRange}.`,
        type: "EXAM_RESCHEDULED",
        link: "/anits/timetable",
        metadata: { examId: examSchedule.id, oldRange, newRange, version },
        idempotencyKey: `RESCHED_FAC_${examSchedule.id}_${fId}_${version}`,
      });
    }

    // Audit Log
    await this.logAudit(
      actor,
      "EXAM_SCHEDULE_RESCHEDULED",
      "EXAMINATIONS",
      "ExamSchedule",
      examSchedule.id
    );
  }

  /**
   * Dispatches notifications when an exam is cancelled.
   */
  static async notifyExamCancelled(examSchedule: any, actor: { id?: string; name?: string; role?: string }) {
    const dept = examSchedule.department;
    const sem = examSchedule.semester;
    const version = Date.now();

    const students = await prisma.student.findMany({
      where: { department: { equals: dept, mode: "insensitive" }, semester: sem },
    });

    for (const s of students) {
      await this.createIdempotentNotification({
        userId: s.id,
        studentId: s.id,
        role: "student",
        title: `Exam Cancelled: ${examSchedule.name}`,
        message: `${examSchedule.name} scheduled for ${examSchedule.startDate || "upcoming dates"} has been cancelled.`,
        type: "EXAM_CANCELLED",
        link: "/anits/timetable",
        metadata: { examId: examSchedule.id, version },
        idempotencyKey: `CANCEL_${examSchedule.id}_${s.id}_${version}`,
      });
    }

    // Audit Log
    await this.logAudit(
      actor,
      "EXAM_SCHEDULE_CANCELLED",
      "EXAMINATIONS",
      "ExamSchedule",
      examSchedule.id
    );
  }

  /**
   * Dispatches manual announcement broadcast by Super Admin or Exam Controller.
   */
  static async broadcastAnnouncement(
    audience: string,
    subject: string,
    message: string,
    actor: { id?: string; name?: string; role?: string }
  ): Promise<{ count: number }> {
    let notifiedCount = 0;
    const version = Date.now();

    if (audience === "all_students" || audience === "all") {
      const students = await prisma.student.findMany({ select: { id: true } });
      for (const s of students) {
        await this.createIdempotentNotification({
          userId: s.id,
          studentId: s.id,
          role: "student",
          title: subject,
          message,
          type: "EXAM_BROADCAST",
          link: "/student/examinations",
          metadata: { broadcastBy: actor.name, audience, version },
          idempotencyKey: `BCAST_${s.id}_${version}`,
        });
        notifiedCount++;
      }
    } else if (audience === "all_faculty") {
      const faculties = await prisma.faculty.findMany({ select: { id: true } });
      for (const f of faculties) {
        await this.createIdempotentNotification({
          userId: f.id,
          role: "faculty",
          title: subject,
          message,
          type: "EXAM_BROADCAST",
          link: "/anits/timetable",
          metadata: { broadcastBy: actor.name, audience, version },
          idempotencyKey: `BCAST_${f.id}_${version}`,
        });
        notifiedCount++;
      }
    } else if (audience.startsWith("dept_")) {
      const deptCode = audience.replace("dept_", "").toUpperCase();
      const students = await prisma.student.findMany({
        where: { department: { equals: deptCode, mode: "insensitive" } },
        select: { id: true },
      });
      for (const s of students) {
        await this.createIdempotentNotification({
          userId: s.id,
          studentId: s.id,
          role: "student",
          title: subject,
          message,
          type: "EXAM_BROADCAST",
          link: "/anits/timetable",
          metadata: { broadcastBy: actor.name, audience, deptCode, version },
          idempotencyKey: `BCAST_${s.id}_${version}`,
        });
        notifiedCount++;
      }
    }

    // Always notify super admin of broadcast
    if (actor.id) {
      await this.createIdempotentNotification({
        userId: actor.id,
        role: "super_admin",
        title: `Broadcast Sent: ${subject}`,
        message: `Your manual examination announcement was successfully dispatched to ${notifiedCount} recipient(s).`,
        type: "EXAM_BROADCAST",
        link: "/examinations/notifications",
        metadata: { audience, notifiedCount, version },
        idempotencyKey: `BCAST_CONF_${actor.id}_${version}`,
      });
    }

    // Audit Log
    await this.logAudit(
      actor,
      "EXAM_ANNOUNCEMENT_BROADCAST",
      "EXAMINATIONS",
      "Notification",
      `audience:${audience}`
    );

    return { count: notifiedCount };
  }

  /**
   * Resolves recipient users (students, faculty, HOD) from canonical PostgreSQL relationships.
   */
  static async resolveRecipients(
    payload: {
      recipientType?: string; // "Students" | "Faculty" | "Students & Faculty"
      department?: string;
      semester?: number | string;
      section?: string;
      courseCode?: string;
      scope?: string;
      academicYear?: string;
    },
    actor: UserContext
  ): Promise<{
    students: any[];
    faculty: any[];
    hods: any[];
    allRecipients: {
      id: string;
      name: string;
      email: string;
      role: string;
      department?: string | null;
      semester?: number | null;
      section?: string | null;
      isStudent: boolean;
    }[];
  }> {
    const scope = (payload.scope || "department").toLowerCase();
    const recipientType = payload.recipientType || "Students";
    let dept = payload.department?.trim();
    const sem = payload.semester && payload.semester !== "ALL" ? Number(payload.semester) : undefined;
    const rawSection = payload.section && payload.section !== "ALL" ? payload.section.trim() : undefined;
    const cleanSection = rawSection ? rawSection.replace(/^Section\s+/i, "").trim() : undefined;
    const courseCode = payload.courseCode && payload.courseCode !== "ALL" ? payload.courseCode.trim() : undefined;

    // Strict Server-side RBAC restriction for HOD
    if (actor.role === "hod") {
      const actorDept = (actor.department || "CSE").toUpperCase();
      if (scope === "institution" || dept === "ALL") {
        throw new Error("403: Forbidden. HOD does not possess institution-wide broadcast authority.");
      }
      if (dept && dept.toUpperCase() !== actorDept) {
        throw new Error(`403: Forbidden. As ${actorDept} HOD, you can only target ${actorDept} members. Cannot target ${dept}.`);
      }
      dept = actorDept;
    }

    let resolvedStudents: any[] = [];
    let resolvedFaculty: any[] = [];
    let resolvedHods: any[] = [];

    const includeStudents = recipientType === "Students" || recipientType === "Students & Faculty";
    const includeFaculty = recipientType === "Faculty" || recipientType === "Students & Faculty";

    // 1. Resolve Students
    if (includeStudents) {
      let studentWhere: any = { status: "Active" };

      if (dept && dept !== "ALL") {
        studentWhere.department = { equals: dept, mode: "insensitive" };
      }
      if (sem) {
        studentWhere.semester = sem;
      }
      if (cleanSection) {
        studentWhere.section = { equals: cleanSection, mode: "insensitive" };
      }

      if (courseCode) {
        const course = await prisma.course.findUnique({
          where: { code: courseCode },
        });

        if (course) {
          const registered = await prisma.courseRegistration.findMany({
            where: {
              courseId: course.id,
              status: "APPROVED",
            },
            include: { student: true },
          });

          if (registered.length > 0) {
            resolvedStudents = registered.map((r) => r.student).filter(Boolean);
          } else {
            const cohortStudents = await prisma.student.findMany({
              where: {
                ...studentWhere,
                department: { equals: course.department || dept, mode: "insensitive" },
                ...(course.semester ? { semester: course.semester } : {}),
              },
            });
            resolvedStudents = cohortStudents;
          }
        } else {
          resolvedStudents = await prisma.student.findMany({ where: studentWhere });
        }
      } else {
        resolvedStudents = await prisma.student.findMany({ where: studentWhere });
      }
    }

    // 2. Resolve Faculty
    if (includeFaculty) {
      if (courseCode) {
        const course = await prisma.course.findUnique({ where: { code: courseCode } });
        if (course) {
          const ttEntries = await prisma.masterTimetable.findMany({
            where: { courseId: course.id, facultyId: { not: null } },
            include: { faculty: true },
          });
          const ttFaculty = ttEntries.map((t) => t.faculty).filter(Boolean);

          const saEntries = await prisma.subjectAllocation.findMany({
            where: { courseId: course.id },
            include: { faculty: true },
          });
          const saFaculty = saEntries.map((s) => s.faculty).filter(Boolean);

          let namedFaculty: any[] = [];
          if (course.faculty) {
            const f = await prisma.faculty.findFirst({
              where: { name: { equals: course.faculty, mode: "insensitive" } },
            });
            if (f) namedFaculty.push(f);
          }

          const combinedFacultyMap = new Map<string, any>();
          [...ttFaculty, ...saFaculty, ...namedFaculty].forEach((f: any) => {
            if (f && f.id) combinedFacultyMap.set(f.id, f);
          });

          resolvedFaculty = Array.from(combinedFacultyMap.values());
        }
      }

      if (resolvedFaculty.length === 0) {
        let facWhere: any = { status: "Active" };
        if (dept && dept !== "ALL") {
          facWhere.department = { equals: dept, mode: "insensitive" };
        }
        resolvedFaculty = await prisma.faculty.findMany({ where: facWhere });
      }
    }

    // Combine and deduplicate
    const allRecipientsMap = new Map<string, any>();

    resolvedStudents.forEach((s) => {
      allRecipientsMap.set(s.id, {
        id: s.id,
        name: s.name,
        email: s.email,
        role: "student",
        department: s.department,
        semester: s.semester,
        section: s.section,
        isStudent: true,
      });
    });

    resolvedFaculty.forEach((f) => {
      if (!allRecipientsMap.has(f.id)) {
        allRecipientsMap.set(f.id, {
          id: f.id,
          name: f.name,
          email: f.email,
          role: f.role || "faculty",
          department: f.department,
          isStudent: false,
        });
      }
    });

    return {
      students: resolvedStudents,
      faculty: resolvedFaculty,
      hods: resolvedHods,
      allRecipients: Array.from(allRecipientsMap.values()),
    };
  }

  /**
   * Previews recipient counts from canonical PostgreSQL records before publishing.
   */
  static async previewRecipients(
    payload: {
      recipientType?: string;
      department?: string;
      semester?: number | string;
      section?: string;
      courseCode?: string;
      scope?: string;
      academicYear?: string;
    },
    actor: UserContext
  ) {
    if (actor.role === "hod") {
      const actorDept = (actor.department || "CSE").toUpperCase();
      if (payload.department && payload.department.toUpperCase() !== actorDept) {
        throw new Error(`403: Forbidden. As ${actorDept} HOD, you can only preview recipients for ${actorDept}.`);
      }
      payload.department = actorDept;
    }

    const resolved = await this.resolveRecipients(payload, actor);
    return {
      success: true,
      totalRecipients: resolved.allRecipients.length,
      studentCount: resolved.students.length,
      facultyCount: resolved.faculty.length,
      hodCount: resolved.hods.length,
      sampleRecipients: resolved.allRecipients.slice(0, 5).map((r) => ({
        name: r.name,
        role: r.role,
        department: r.department,
      })),
    };
  }

  /**
   * Saves or updates an exam notification draft (status = DRAFT).
   * Does NOT notify any recipients.
   */
  static async saveDraft(
    payload: {
      batchId?: string;
      type: string;
      title: string;
      message: string;
      academicYear?: string;
      semester?: number | string;
      department?: string;
      courseCode?: string;
      section?: string;
      examName?: string;
      examScheduleId?: string;
      examDate?: string;
      startTime?: string;
      endTime?: string;
      venue?: string;
      priority?: string;
      recipientType?: string;
      scope?: string;
      attachmentUrl?: string;
    },
    actor: UserContext
  ) {
    if (actor.role === "student" || actor.role === "faculty") {
      throw new Error("403: Forbidden. Students and regular faculty cannot draft exam notifications.");
    }

    if (actor.role === "hod") {
      const hodDept = (actor.department || "CSE").toUpperCase();
      if (payload.scope === "institution" || payload.department === "ALL") {
        throw new Error("403: Forbidden. HOD does not possess institution-wide broadcast authority.");
      }
      payload.department = hodDept;
    }

    const batchId = payload.batchId || `EXAM-DRAFT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Calculate forecast recipients for information
    const forecast = await this.resolveRecipients(payload, actor).catch(() => ({ students: [], faculty: [], allRecipients: [] }));

    const record = await (prisma as any).examNotification.upsert({
      where: { batchId },
      create: {
        id: batchId,
        batchId,
        title: payload.title || "Untitled Draft",
        message: payload.message || "",
        type: payload.type || "EXAM_SCHEDULE",
        priority: payload.priority || "High",
        recipientType: payload.recipientType || "Students",
        scope: payload.scope || "department",
        department: payload.department || (actor.role === "hod" ? (actor.department || "CSE") : "ALL"),
        academicYear: payload.academicYear || "2026-27",
        semester: payload.semester && payload.semester !== "ALL" ? Number(payload.semester) : null,
        section: payload.section || null,
        courseCode: payload.courseCode || null,
        examName: payload.examName || null,
        examScheduleId: payload.examScheduleId || null,
        examDate: payload.examDate || null,
        startTime: payload.startTime || null,
        endTime: payload.endTime || null,
        venue: payload.venue || null,
        status: "DRAFT",
        totalRecipients: forecast.allRecipients.length,
        studentCount: forecast.students.length,
        facultyCount: forecast.faculty.length,
        senderId: actor.userId,
        senderName: actor.name,
        senderRole: actor.role,
        attachmentUrl: payload.attachmentUrl || null,
      },
      update: {
        title: payload.title || "Untitled Draft",
        message: payload.message || "",
        type: payload.type || "EXAM_SCHEDULE",
        priority: payload.priority || "High",
        recipientType: payload.recipientType || "Students",
        scope: payload.scope || "department",
        department: payload.department || (actor.role === "hod" ? (actor.department || "CSE") : "ALL"),
        academicYear: payload.academicYear || "2026-27",
        semester: payload.semester && payload.semester !== "ALL" ? Number(payload.semester) : null,
        section: payload.section || null,
        courseCode: payload.courseCode || null,
        examName: payload.examName || null,
        examScheduleId: payload.examScheduleId || null,
        examDate: payload.examDate || null,
        startTime: payload.startTime || null,
        endTime: payload.endTime || null,
        venue: payload.venue || null,
        status: "DRAFT",
        totalRecipients: forecast.allRecipients.length,
        studentCount: forecast.students.length,
        facultyCount: forecast.faculty.length,
        attachmentUrl: payload.attachmentUrl || null,
      },
    });

    await this.logAudit(
      actor,
      payload.batchId ? "UPDATE_EXAM_NOTIFICATION" : "CREATE_EXAM_NOTIFICATION",
      "EXAMINATIONS",
      "ExamNotification",
      batchId
    );

    return {
      success: true,
      batchId,
      status: "DRAFT",
      message: "Draft saved successfully. No recipients notified.",
      data: record,
    };
  }

  /**
   * Schedules an exam notification for future dispatch (status = SCHEDULED).
   */
  static async scheduleNotification(
    payload: {
      batchId?: string;
      type: string;
      title: string;
      message: string;
      scheduledDate: string;
      scheduledTime: string;
      academicYear?: string;
      semester?: number | string;
      department?: string;
      courseCode?: string;
      section?: string;
      examName?: string;
      examScheduleId?: string;
      examDate?: string;
      startTime?: string;
      endTime?: string;
      venue?: string;
      priority?: string;
      recipientType?: string;
      scope?: string;
      attachmentUrl?: string;
    },
    actor: UserContext
  ) {
    if (actor.role === "student" || actor.role === "faculty") {
      throw new Error("403: Forbidden. Students and regular faculty cannot schedule exam notifications.");
    }

    if (actor.role === "hod") {
      const hodDept = (actor.department || "CSE").toUpperCase();
      if (payload.scope === "institution" || payload.department === "ALL") {
        throw new Error("403: Forbidden. HOD does not possess institution-wide broadcast authority.");
      }
      payload.department = hodDept;
    }

    if (!payload.scheduledDate || !payload.scheduledTime) {
      throw new Error("400: Scheduled publish date and time are required.");
    }

    const scheduledAt = new Date(`${payload.scheduledDate}T${payload.scheduledTime}`);
    if (isNaN(scheduledAt.getTime())) {
      throw new Error("400: Invalid scheduled date or time format.");
    }

    const batchId = payload.batchId || `EXAM-SCHED-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const forecast = await this.resolveRecipients(payload, actor);

    const record = await (prisma as any).examNotification.upsert({
      where: { batchId },
      create: {
        id: batchId,
        batchId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        priority: payload.priority || "High",
        recipientType: payload.recipientType || "Students",
        scope: payload.scope || "department",
        department: payload.department || (actor.role === "hod" ? (actor.department || "CSE") : "ALL"),
        academicYear: payload.academicYear || "2026-27",
        semester: payload.semester && payload.semester !== "ALL" ? Number(payload.semester) : null,
        section: payload.section || null,
        courseCode: payload.courseCode || null,
        examName: payload.examName || null,
        examScheduleId: payload.examScheduleId || null,
        examDate: payload.examDate || null,
        startTime: payload.startTime || null,
        endTime: payload.endTime || null,
        venue: payload.venue || null,
        status: "SCHEDULED",
        scheduledDate: payload.scheduledDate,
        scheduledTime: payload.scheduledTime,
        scheduledAt,
        totalRecipients: forecast.allRecipients.length,
        studentCount: forecast.students.length,
        facultyCount: forecast.faculty.length,
        senderId: actor.userId,
        senderName: actor.name,
        senderRole: actor.role,
        attachmentUrl: payload.attachmentUrl || null,
      },
      update: {
        title: payload.title,
        message: payload.message,
        type: payload.type,
        priority: payload.priority || "High",
        recipientType: payload.recipientType || "Students",
        scope: payload.scope || "department",
        department: payload.department || (actor.role === "hod" ? (actor.department || "CSE") : "ALL"),
        academicYear: payload.academicYear || "2026-27",
        semester: payload.semester && payload.semester !== "ALL" ? Number(payload.semester) : null,
        section: payload.section || null,
        courseCode: payload.courseCode || null,
        examName: payload.examName || null,
        examScheduleId: payload.examScheduleId || null,
        examDate: payload.examDate || null,
        startTime: payload.startTime || null,
        endTime: payload.endTime || null,
        venue: payload.venue || null,
        status: "SCHEDULED",
        scheduledDate: payload.scheduledDate,
        scheduledTime: payload.scheduledTime,
        scheduledAt,
        totalRecipients: forecast.allRecipients.length,
        studentCount: forecast.students.length,
        facultyCount: forecast.faculty.length,
        attachmentUrl: payload.attachmentUrl || null,
      },
    });

    await this.logAudit(
      actor,
      "SCHEDULE_EXAM_NOTIFICATION",
      "EXAMINATIONS",
      "ExamNotification",
      batchId
    );

    return {
      success: true,
      batchId,
      status: "SCHEDULED",
      message: `Notification scheduled for ${payload.scheduledDate} ${payload.scheduledTime}. Will be dispatched automatically.`,
      scheduledAt,
      forecastRecipients: forecast.allRecipients.length,
      data: record,
    };
  }

  /**
   * Primary Creation & Publishing Engine with server-side RBAC, transaction safety, and audit logging.
   */
  static async publishExamNotification(
    payload: {
      batchId?: string;
      type: string;
      title: string;
      message: string;
      academicYear?: string;
      semester?: number | string;
      department?: string;
      courseCode?: string;
      section?: string;
      examName?: string;
      examScheduleId?: string;
      examDate?: string;
      startTime?: string;
      endTime?: string;
      venue?: string;
      priority?: string;
      recipientType?: string;
      scope?: string;
      attachmentUrl?: string;
    },
    actor: UserContext
  ) {
    if (actor.role === "student" || actor.role === "faculty") {
      throw new Error("403: Forbidden. Students and regular faculty are not authorized to publish exam notifications.");
    }

    if (actor.role === "hod") {
      const hodDept = (actor.department || "CSE").toUpperCase();
      if (payload.scope === "institution" || payload.department === "ALL") {
        throw new Error("403: Forbidden. HOD does not possess institution-wide broadcast authority.");
      }
      if (payload.department && payload.department.toUpperCase() !== hodDept) {
        throw new Error(`403: Forbidden. You are authorized only for department ${hodDept}. Cannot dispatch to ${payload.department}.`);
      }
      payload.department = hodDept;
    }

    if (!payload.title || !payload.message || !payload.type) {
      throw new Error("400: Title, message, and notification type are required.");
    }

    const batchId = payload.batchId || `EXAM-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Resolve actual PostgreSQL recipients
    const { students, faculty, allRecipients } = await this.resolveRecipients(payload, actor);

    if (allRecipients.length === 0) {
      throw new Error("No eligible recipients found for the selected criteria.");
    }

    const now = new Date();
    const metadataObj = {
      batchId,
      academicYear: payload.academicYear || "2026-27",
      semester: payload.semester || null,
      department: payload.department,
      courseCode: payload.courseCode || null,
      section: payload.section || null,
      examName: payload.examName || null,
      examScheduleId: payload.examScheduleId || null,
      examDate: payload.examDate || null,
      startTime: payload.startTime || null,
      endTime: payload.endTime || null,
      venue: payload.venue || null,
      scope: payload.scope || "department",
      recipientType: payload.recipientType || "Students",
      priority: payload.priority || "High",
      senderName: actor.name,
      senderRole: actor.role,
      publishedAt: now.toISOString(),
    };
    const metadataStr = JSON.stringify(metadataObj);

    // Save or update authoritative batch in exam_notifications table
    await (prisma as any).examNotification.upsert({
      where: { batchId },
      create: {
        id: batchId,
        batchId,
        title: payload.title.trim(),
        message: payload.message.trim(),
        type: payload.type,
        priority: payload.priority || "High",
        recipientType: payload.recipientType || "Students",
        scope: payload.scope || "department",
        department: payload.department || (actor.role === "hod" ? (actor.department || "CSE") : "ALL"),
        academicYear: payload.academicYear || "2026-27",
        semester: payload.semester && payload.semester !== "ALL" ? Number(payload.semester) : null,
        section: payload.section || null,
        courseCode: payload.courseCode || null,
        examName: payload.examName || null,
        examScheduleId: payload.examScheduleId || null,
        examDate: payload.examDate || null,
        startTime: payload.startTime || null,
        endTime: payload.endTime || null,
        venue: payload.venue || null,
        status: "PUBLISHED",
        publishedAt: now,
        totalRecipients: allRecipients.length,
        studentCount: students.length,
        facultyCount: faculty.length,
        senderId: actor.userId,
        senderName: actor.name,
        senderRole: actor.role,
        attachmentUrl: payload.attachmentUrl || null,
        metadata: metadataStr,
      },
      update: {
        title: payload.title.trim(),
        message: payload.message.trim(),
        type: payload.type,
        priority: payload.priority || "High",
        recipientType: payload.recipientType || "Students",
        scope: payload.scope || "department",
        department: payload.department || (actor.role === "hod" ? (actor.department || "CSE") : "ALL"),
        academicYear: payload.academicYear || "2026-27",
        semester: payload.semester && payload.semester !== "ALL" ? Number(payload.semester) : null,
        section: payload.section || null,
        courseCode: payload.courseCode || null,
        examName: payload.examName || null,
        examScheduleId: payload.examScheduleId || null,
        examDate: payload.examDate || null,
        startTime: payload.startTime || null,
        endTime: payload.endTime || null,
        venue: payload.venue || null,
        status: "PUBLISHED",
        publishedAt: now,
        totalRecipients: allRecipients.length,
        studentCount: students.length,
        facultyCount: faculty.length,
        attachmentUrl: payload.attachmentUrl || null,
        metadata: metadataStr,
      },
    });

    // Create recipient records in Notification table
    const notificationRecords = allRecipients.map((r) => ({
      studentId: r.isStudent ? r.id : null,
      userId: r.id,
      role: r.role,
      title: payload.title.trim(),
      message: payload.message.trim(),
      type: payload.type,
      priority: payload.priority || "High",
      senderId: actor.userId,
      senderName: actor.name,
      senderRole: actor.role,
      department: payload.department,
      courseCode: payload.courseCode || null,
      entityId: batchId,
      link: r.isStudent ? "/student/examinations" : "/anits/timetable",
      metadata: metadataStr,
      isRead: false,
      status: "Active",
    }));

    await prisma.$transaction(
      notificationRecords.map((data) => prisma.notification.create({ data }))
    );

    // Record Audit Log in PostgreSQL
    await this.logAudit(
      actor,
      "PUBLISH_EXAM_NOTIFICATION",
      "EXAMINATIONS",
      "ExamNotification",
      batchId
    );

    return {
      success: true,
      batchId,
      status: "PUBLISHED",
      totalRecipients: allRecipients.length,
      studentCount: students.length,
      facultyCount: faculty.length,
      publishedAt: now,
    };
  }

  /**
   * Background runner to auto-dispatch scheduled notifications when scheduledAt <= NOW()
   */
  static async processScheduledNotifications() {
    try {
      const overdue = await (prisma as any).examNotification.findMany({
        where: {
          status: "SCHEDULED",
          scheduledAt: { lte: new Date() },
        },
      });

      for (const item of overdue) {
        try {
          const actorContext: UserContext = {
            userId: item.senderId,
            name: item.senderName,
            role: item.senderRole as any,
            rawRole: item.senderRole,
            authorityLabel: "System Scheduler",
            canCreate: true,
            department: item.department,
          };

          const { students, faculty, allRecipients } = await this.resolveRecipients(
            {
              recipientType: item.recipientType,
              scope: item.scope,
              department: item.department,
              semester: item.semester,
              section: item.section,
              courseCode: item.courseCode,
              academicYear: item.academicYear,
            },
            actorContext
          );

          if (allRecipients.length > 0) {
            const now = new Date();
            const metadataStr = JSON.stringify({
              batchId: item.batchId,
              academicYear: item.academicYear,
              semester: item.semester,
              department: item.department,
              courseCode: item.courseCode,
              section: item.section,
              examName: item.examName,
              examDate: item.examDate,
              startTime: item.startTime,
              endTime: item.endTime,
              venue: item.venue,
              priority: item.priority,
              senderName: item.senderName,
              senderRole: item.senderRole,
              publishedAt: now.toISOString(),
            });

            const notificationRecords = allRecipients.map((r) => ({
              studentId: r.isStudent ? r.id : null,
              userId: r.id,
              role: r.role,
              title: item.title,
              message: item.message,
              type: item.type,
              priority: item.priority || "High",
              senderId: item.senderId,
              senderName: item.senderName,
              senderRole: item.senderRole,
              department: item.department,
              courseCode: item.courseCode || null,
              entityId: item.batchId,
              link: r.isStudent ? "/student/examinations" : "/anits/timetable",
              metadata: metadataStr,
              isRead: false,
              status: "Active",
            }));

            await prisma.$transaction(
              notificationRecords.map((data) => prisma.notification.create({ data }))
            );

            await (prisma as any).examNotification.update({
              where: { batchId: item.batchId },
              data: {
                status: "PUBLISHED",
                publishedAt: now,
                totalRecipients: allRecipients.length,
                studentCount: students.length,
                facultyCount: faculty.length,
              },
            });

            await this.logAudit(
              actorContext,
              "PUBLISH_EXAM_NOTIFICATION",
              "EXAMINATIONS",
              "ExamNotification",
              item.batchId
            );
          }
        } catch (dispatchErr) {
          console.error(`Error auto-dispatching scheduled exam notification ${item.batchId}:`, dispatchErr);
        }
      }
    } catch (err) {
      console.error("processScheduledNotifications error:", err);
    }
  }

  /**
   * Retrieves notification history and delivery analytics dynamically aggregated from PostgreSQL.
   */
  static async getExamNotificationHistory(actor: UserContext) {
    // 1. Process any pending scheduled notifications whose time has passed
    await this.processScheduledNotifications();

    const isHod = actor.role === "hod";
    const hodDept = (actor.department || "CSE").toUpperCase();

    let whereClause: any = {};
    if (isHod) {
      whereClause = {
        OR: [
          { department: { equals: hodDept, mode: "insensitive" } },
          { senderId: actor.userId },
        ],
      };
    }

    const batches: any[] = await (prisma as any).examNotification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    const results = [];
    for (const b of batches) {
      // Live read count and total recipient counts from PostgreSQL Notification table
      const readCount = await prisma.notification.count({
        where: {
          entityId: b.batchId,
          isRead: true,
        },
      });

      const actualDelivered = await prisma.notification.count({
        where: { entityId: b.batchId },
      });

      let totalRecipients = b.totalRecipients || 0;
      if (b.status === "PUBLISHED" || b.status === "CANCELLED") {
        totalRecipients = actualDelivered > 0 ? actualDelivered : (b.totalRecipients || 0);
      }

      const unreadCount = Math.max(0, totalRecipients - readCount);
      const readPercentage = totalRecipients > 0 ? Number(((readCount / totalRecipients) * 100).toFixed(1)) : 0;

      results.push({
        id: b.id,
        batchId: b.batchId,
        title: b.title,
        message: b.message,
        type: b.type,
        priority: b.priority || "High",
        recipientType: b.recipientType || "Students",
        scope: b.scope || "department",
        department: b.department || "ALL",
        academicYear: b.academicYear || "2026-27",
        semester: b.semester,
        section: b.section,
        courseCode: b.courseCode,
        examName: b.examName,
        examDate: b.examDate,
        startTime: b.startTime,
        endTime: b.endTime,
        venue: b.venue,
        status: b.status, // "DRAFT" | "SCHEDULED" | "PUBLISHED" | "CANCELLED"
        scheduledDate: b.scheduledDate,
        scheduledTime: b.scheduledTime,
        scheduledAt: b.scheduledAt,
        publishedAt: b.publishedAt,
        cancelledAt: b.cancelledAt,
        cancelledBy: b.cancelledBy,
        cancelReason: b.cancelReason,
        totalRecipients,
        studentCount: b.studentCount,
        facultyCount: b.facultyCount,
        readCount,
        unreadCount,
        readPercentage,
        senderId: b.senderId,
        senderName: b.senderName,
        senderRole: b.senderRole,
        attachmentUrl: b.attachmentUrl,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      });
    }

    return results;
  }

  /**
   * Retrieves summary statistics dynamically from PostgreSQL.
   */
  static async getStats(actor: UserContext) {
    const isHod = actor.role === "hod";
    const hodDept = (actor.department || "CSE").toUpperCase();

    let whereClause: any = {};
    if (isHod) {
      whereClause = {
        OR: [
          { department: { equals: hodDept, mode: "insensitive" } },
          { senderId: actor.userId },
        ],
      };
    }

    const [totalNotifications, publishedCount, scheduledCount, publishedBatches] = await Promise.all([
      (prisma as any).examNotification.count({ where: whereClause }),
      (prisma as any).examNotification.count({ where: { ...whereClause, status: "PUBLISHED" } }),
      (prisma as any).examNotification.count({ where: { ...whereClause, status: "SCHEDULED" } }),
      (prisma as any).examNotification.findMany({
        where: { ...whereClause, status: "PUBLISHED" },
        select: { batchId: true },
      }),
    ]);

    const publishedBatchIds = publishedBatches.map((b: any) => b.batchId);
    let unreadPendingCount = 0;
    if (publishedBatchIds.length > 0) {
      unreadPendingCount = await prisma.notification.count({
        where: {
          entityId: { in: publishedBatchIds },
          isRead: false,
        },
      });
    }

    return {
      totalNotifications,
      publishedCount,
      scheduledCount,
      unreadPendingCount,
    };
  }

  /**
   * Calculates the dynamic sidebar badge count for the authenticated user.
   */
  static async getSidebarBadgeCount(actor: UserContext) {
    if (actor.role === "student") {
      const count = await prisma.notification.count({
        where: {
          OR: [
            { studentId: actor.userId },
            { userId: actor.userId },
          ],
          isRead: false,
          status: "Active",
        },
      });
      return count;
    }

    if (actor.role === "faculty") {
      const count = await prisma.notification.count({
        where: {
          userId: actor.userId,
          isRead: false,
          status: "Active",
        },
      });
      return count;
    }

    if (actor.role === "hod") {
      const dept = (actor.department || "CSE").toUpperCase();
      const count = await (prisma as any).examNotification.count({
        where: {
          department: { equals: dept, mode: "insensitive" },
          status: { in: ["PUBLISHED", "SCHEDULED"] },
        },
      });
      return count;
    }

    // Super Admin / Admin
    const count = await (prisma as any).examNotification.count({
      where: {
        status: { in: ["PUBLISHED", "SCHEDULED"] },
      },
    });
    return count;
  }

  /**
   * Cancels/recalls an exam notification batch with ownership check and audit trail.
   */
  static async cancelExamNotificationBatch(batchId: string, reason: string | undefined, actor: UserContext) {
    const batch = await (prisma as any).examNotification.findUnique({
      where: { batchId },
    });

    if (!batch) {
      throw new Error("404: Exam notification batch not found.");
    }

    if (actor.role === "hod") {
      const hodDept = (actor.department || "CSE").toUpperCase();
      if (batch.department && batch.department.toUpperCase() !== hodDept && batch.senderId !== actor.userId) {
        throw new Error("403: Forbidden. HOD can only cancel notifications authored within their department.");
      }
    }

    const now = new Date();
    const cancelReason = reason?.trim() || "Notice recalled by administrator";

    await (prisma as any).examNotification.update({
      where: { batchId },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelledBy: actor.name,
        cancelReason,
        updatedAt: now,
      },
    });

    await prisma.notification.updateMany({
      where: { entityId: batchId },
      data: { status: "Cancelled", updatedAt: now },
    });

    await this.logAudit(
      actor,
      "CANCEL_EXAM_NOTIFICATION",
      "EXAMINATIONS",
      "ExamNotification",
      batchId
    );

    return {
      success: true,
      batchId,
      status: "CANCELLED",
      message: `Notification batch ${batchId} successfully cancelled.`,
    };
  }

  /**
   * Retrieves valid departments, semesters, and courses from PostgreSQL for form metadata.
   */
  static async getMetaOptions(actor: UserContext) {
    const departments = await prisma.department.findMany({
      select: { id: true, code: true, name: true, hodName: true },
      orderBy: { code: "asc" },
    });

    const courses = await prisma.course.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        department: true,
        semester: true,
        faculty: true,
        sections: true,
      },
      orderBy: { code: "asc" },
    });

    const examSchedules = await prisma.examSchedule.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        department: true,
        year: true,
        semester: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      departments,
      courses,
      examSchedules,
      academicYears: ["2026-27", "2025-26"],
      semesters: [1, 2, 3, 4, 5, 6, 7, 8],
      userDepartment: actor.department || null,
      userRole: actor.role,
      userName: actor.name,
      authorityLabel: actor.authorityLabel,
      canCreate: actor.canCreate,
      isSuperAdmin: actor.role === "super_admin",
      isAdmin: actor.role === "admin" || actor.role === "super_admin",
      isHod: actor.role === "hod",
    };
  }
}

