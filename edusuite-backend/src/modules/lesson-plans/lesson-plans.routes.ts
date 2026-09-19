import { Router, Response } from "express";
import { prisma } from "../../db";
import { authenticateToken, AuthenticatedRequest } from "../auth/auth.routes";
import { auditLog } from "../super-admin/super-admin.routes";

const router = Router();

// Helper to resolve authenticated faculty
async function resolveAuthFaculty(req: AuthenticatedRequest) {
  const authUserId = req.userId;
  const authRole = (req.userRole || "").toLowerCase();

  if (!authUserId) return null;

  let faculty = await prisma.faculty.findUnique({
    where: { id: authUserId },
    include: {
      subjectAllocations: { include: { course: true } },
      timetables: { include: { course: true } },
    },
  });

  if (!faculty && (authRole === "super_admin" || authRole === "admin")) {
    faculty = await prisma.faculty.findFirst({
      where: { status: "Active" },
      orderBy: { name: "asc" },
      include: {
        subjectAllocations: { include: { course: true } },
        timetables: { include: { course: true } },
      },
    });
  }

  return faculty;
}

// ==========================================
// 1. GET ALL LESSON PLANS FOR AUTHENTICATED FACULTY
// ==========================================
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await resolveAuthFaculty(req);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    const todayDateStr = new Date().toISOString().split("T")[0];

    // Fetch all lesson plans owned by this faculty
    const plans = await prisma.lessonPlan.findMany({
      where: { facultyId: faculty.id },
      include: {
        course: true,
        timetableSession: true,
        lmsResource: true,
      },
      orderBy: [
        { unitNumber: "asc" },
        { plannedDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    // Extract assigned courses and sections
    const assignedMap = new Map<string, {
      courseId: string;
      code: string;
      name: string;
      department: string;
      semester: number;
      sections: string[];
    }>();

    // From SubjectAllocations
    for (const alloc of faculty.subjectAllocations) {
      const c = alloc.course;
      if (!c) continue;
      const cleanSec = (alloc.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase();
      if (!assignedMap.has(c.id)) {
        assignedMap.set(c.id, {
          courseId: c.id,
          code: c.code,
          name: c.name,
          department: alloc.department || faculty.department || "CSE",
          semester: Number(alloc.semester) || 5,
          sections: [cleanSec],
        });
      } else {
        const item = assignedMap.get(c.id)!;
        if (!item.sections.includes(cleanSec)) item.sections.push(cleanSec);
      }
    }

    // From Timetables
    for (const tt of faculty.timetables) {
      const c = tt.course;
      if (!c) continue;
      const cleanSec = (tt.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase();
      if (!assignedMap.has(c.id)) {
        assignedMap.set(c.id, {
          courseId: c.id,
          code: c.code,
          name: c.name,
          department: tt.branch || faculty.department || "CSE",
          semester: tt.semester || 5,
          sections: [cleanSec],
        });
      } else {
        const item = assignedMap.get(c.id)!;
        if (!item.sections.includes(cleanSec)) item.sections.push(cleanSec);
      }
    }

    const assignedCourses = Array.from(assignedMap.values());

    // Calculate dynamic 6 KPI Metrics
    const totalPlans = plans.length;
    const completedPlans = plans.filter((p) => p.status === "COMPLETED").length;
    const activePlans = plans.filter((p) => p.status === "PLANNED" || p.status === "IN_PROGRESS").length;
    const pendingLayouts = plans.filter((p) => p.status === "DRAFT" || p.status === "PENDING").length;
    const distinctUnits = new Set(plans.map((p) => `${p.courseId}-U${p.unitNumber}`));
    const plannedUnitsCount = distinctUnits.size;

    const averageCoverage = totalPlans > 0
      ? Math.round((completedPlans / totalPlans) * 100)
      : 0;

    const stats = {
      totalPlans,
      completedPlans,
      activePlans,
      pendingLayouts,
      plannedUnits: plannedUnitsCount,
      averageCoverage,
    };

    // Calculate Subject-wise Syllabus Progress
    const syllabusProgress = assignedCourses.map((c) => {
      const coursePlans = plans.filter((p) => p.courseId === c.courseId);
      const totalCoursePlans = coursePlans.length;
      const completedCoursePlans = coursePlans.filter((p) => p.status === "COMPLETED").length;
      const coveragePct = totalCoursePlans > 0
        ? Math.round((completedCoursePlans / totalCoursePlans) * 100)
        : 0;

      // Unit breakdown (1 to 5)
      const unitsBreakdown = [1, 2, 3, 4, 5].map((uNum) => {
        const uPlans = coursePlans.filter((p) => p.unitNumber === uNum);
        const uTotal = uPlans.length;
        const uComp = uPlans.filter((p) => p.status === "COMPLETED").length;
        const uPct = uTotal > 0 ? Math.round((uComp / uTotal) * 100) : 0;
        const uTitle = uPlans[0]?.unitTitle || `Unit ${uNum}`;
        return {
          unitNumber: uNum,
          title: uTitle,
          totalTopics: uTotal,
          completedTopics: uComp,
          percentage: uPct,
          status: uTotal === 0 ? "Not Started" : uPct === 100 ? "Completed" : uPct > 0 ? "In Progress" : "Planned",
        };
      });

      return {
        courseId: c.courseId,
        courseCode: c.code,
        courseName: c.name,
        sections: c.sections,
        totalPlans: totalCoursePlans,
        completedPlans: completedCoursePlans,
        coveragePct,
        units: unitsBreakdown,
      };
    });

    // Check attendance status for linked timetable sessions
    const ttIds = plans.map((p) => p.timetableSessionId).filter(Boolean) as string[];
    const attendanceRecords = ttIds.length > 0
      ? await prisma.attendanceRecord.findMany({
          where: { timetableId: { in: ttIds } },
          select: { timetableId: true, date: true, status: true },
        })
      : [];

    const attMap = new Set(attendanceRecords.map((a) => `${a.timetableId}-${a.date}`));

    // Enriched plans with attendance evidence
    const enrichedPlans = plans.map((p) => {
      const hasAtt = p.timetableSessionId && p.plannedDate
        ? attMap.has(`${p.timetableSessionId}-${p.plannedDate}`)
        : false;

      return {
        id: p.id,
        facultyId: p.facultyId,
        facultyName: faculty.name,
        courseId: p.courseId,
        courseCode: p.course?.code || "SUB",
        courseName: p.course?.name || "Subject",
        department: p.department,
        semester: p.semester,
        section: p.section,
        academicYear: p.academicYear,
        unitNumber: p.unitNumber,
        unitTitle: p.unitTitle,
        topic: p.topic,
        subtopic: p.subtopic || "",
        plannedDate: p.plannedDate,
        plannedStartTime: p.plannedStartTime,
        plannedEndTime: p.plannedEndTime,
        durationMinutes: p.durationMinutes,
        teachingMode: p.teachingMode,
        teachingMethod: p.teachingMethod,
        learningObjectives: p.learningObjectives ? safeJsonParse(p.learningObjectives) : [],
        plannedActivities: p.plannedActivities ? safeJsonParse(p.plannedActivities) : [],
        actualActivities: p.actualActivities ? safeJsonParse(p.actualActivities) : [],
        requiredResources: p.requiredResources || "",
        assessmentMethod: p.assessmentMethod || "",
        homeworkAssignment: p.homeworkAssignment || "",
        status: p.status,
        postponedReason: p.postponedReason || "",
        actualDate: p.actualDate,
        actualDuration: p.actualDuration,
        teachingNotes: p.teachingNotes || "",
        topicsCovered: p.topicsCovered || "",
        timetableSessionId: p.timetableSessionId,
        timetableSlot: p.timetableSession ? {
          id: p.timetableSession.id,
          day: p.timetableSession.day,
          period: p.timetableSession.periodNumber,
          time: `${p.timetableSession.startTime} - ${p.timetableSession.endTime}`,
          room: p.timetableSession.roomNo || "LH-101",
        } : null,
        attendanceSubmitted: hasAtt,
        lmsResourceId: p.lmsResourceId,
        lmsResourceTitle: p.lmsResource?.title || null,
        coveragePercentage: p.coveragePercentage,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    return res.json({
      success: true,
      faculty: {
        id: faculty.id,
        name: faculty.name,
        department: faculty.department,
      },
      department: faculty.department === "CSE" ? "Computer Science & Engineering" : (faculty.department || "Engineering"),
      academicYear: "2026-27",
      semester: "Semester 5",
      stats,
      plans: enrichedPlans,
      assignedCourses,
      syllabusProgress,
    });
  } catch (error: any) {
    console.error("Error in GET /api/faculty/lesson-plans:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. GET ASSIGNED COURSES & SECTIONS FOR MODAL DROPDOWNS
// ==========================================
router.get("/assigned-courses", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await resolveAuthFaculty(req);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    const assignedMap = new Map<string, {
      courseId: string;
      code: string;
      name: string;
      department: string;
      semester: number;
      sections: string[];
    }>();

    for (const alloc of faculty.subjectAllocations) {
      const c = alloc.course;
      if (!c) continue;
      const cleanSec = (alloc.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase();
      if (!assignedMap.has(c.id)) {
        assignedMap.set(c.id, {
          courseId: c.id,
          code: c.code,
          name: c.name,
          department: alloc.department || faculty.department || "CSE",
          semester: Number(alloc.semester) || 5,
          sections: [cleanSec],
        });
      } else {
        const item = assignedMap.get(c.id)!;
        if (!item.sections.includes(cleanSec)) item.sections.push(cleanSec);
      }
    }

    for (const tt of faculty.timetables) {
      const c = tt.course;
      if (!c) continue;
      const cleanSec = (tt.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase();
      if (!assignedMap.has(c.id)) {
        assignedMap.set(c.id, {
          courseId: c.id,
          code: c.code,
          name: c.name,
          department: c.department || faculty.department || "CSE",
          semester: 5,
          sections: [cleanSec],
        });
      } else {
        const item = assignedMap.get(c.id)!;
        if (!item.sections.includes(cleanSec)) item.sections.push(cleanSec);
      }
    }

    const courses = Array.from(assignedMap.values());
    return res.json({ success: true, courses });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. GET TIMETABLE SESSIONS FOR LINKAGE
// ==========================================
router.get("/timetables", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await resolveAuthFaculty(req);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    const timetables = await prisma.masterTimetable.findMany({
      where: { facultyId: faculty.id },
      include: { course: true },
      orderBy: [{ day: "asc" }, { periodNumber: "asc" }],
    });

    const formatted = timetables.map((t) => {
      const cleanSec = (t.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase();
      return {
        id: t.id,
        courseId: t.courseId,
        courseCode: t.course?.code || "SUB",
        courseName: t.course?.name || "Subject",
        section: cleanSec,
        day: t.day,
        periodNumber: t.periodNumber,
        startTime: t.startTime,
        endTime: t.endTime,
        room: t.roomNo || "LH-101",
        label: `${t.day} P${t.periodNumber} (${t.startTime} - ${t.endTime}) - ${t.course?.code} Sec ${cleanSec} [${t.roomNo || "LH-101"}]`,
      };
    });

    return res.json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. CREATE LESSON PLAN
// ==========================================
router.post("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await resolveAuthFaculty(req);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    const {
      courseId,
      section,
      unitNumber,
      unitTitle,
      topic,
      subtopic,
      plannedDate,
      plannedStartTime,
      plannedEndTime,
      durationMinutes,
      teachingMode,
      teachingMethod,
      learningObjectives,
      plannedActivities,
      requiredResources,
      assessmentMethod,
      homeworkAssignment,
      timetableSessionId,
      lmsResourceId,
      status = "PLANNED",
    } = req.body;

    if (!courseId || !topic || !section) {
      return res.status(400).json({ error: "courseId, section, and topic are required." });
    }

    // Security check: verify faculty actually teaches this course and section
    const cleanSec = section.replace(/^Section\s+/i, "").trim().toUpperCase();
    const isAllocated = faculty.subjectAllocations.some(
      (a) => a.courseId === courseId && (a.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase() === cleanSec
    );
    const isScheduled = faculty.timetables.some(
      (t) => t.courseId === courseId && (t.section || "A").replace(/^Section\s+/i, "").trim().toUpperCase() === cleanSec
    );

    if (!isAllocated && !isScheduled && (req.userRole || "").toLowerCase() !== "super_admin") {
      return res.status(403).json({
        error: "Access denied. You are not assigned to teach this course and section.",
      });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    // Create LessonPlan record in PostgreSQL
    const newPlan = await prisma.lessonPlan.create({
      data: {
        facultyId: faculty.id,
        courseId,
        department: faculty.department || "CSE",
        semester: course.semester || 5,
        section: cleanSec,
        academicYear: "2026-27",
        unitNumber: Number(unitNumber) || 1,
        unitTitle: unitTitle || `Unit ${unitNumber || 1}`,
        topic,
        subtopic: subtopic || null,
        plannedDate: plannedDate || null,
        plannedStartTime: plannedStartTime || null,
        plannedEndTime: plannedEndTime || null,
        durationMinutes: Number(durationMinutes) || 60,
        teachingMode: teachingMode || (course.name.toLowerCase().includes("lab") ? "Lab" : "Theory"),
        teachingMethod: teachingMethod || "Lecture",
        learningObjectives: Array.isArray(learningObjectives) ? JSON.stringify(learningObjectives) : learningObjectives || null,
        plannedActivities: Array.isArray(plannedActivities) ? JSON.stringify(plannedActivities) : plannedActivities || null,
        requiredResources: requiredResources || null,
        assessmentMethod: assessmentMethod || null,
        homeworkAssignment: homeworkAssignment || null,
        timetableSessionId: timetableSessionId || null,
        lmsResourceId: lmsResourceId || null,
        status: status || "PLANNED",
        coveragePercentage: status === "COMPLETED" ? 100 : 0,
      },
      include: {
        course: true,
        timetableSession: true,
      },
    });

    await auditLog(
      req,
      "LESSON_PLAN_CREATED",
      "LessonPlan",
      "LessonPlan",
      newPlan.id
    );

    return res.status(201).json({
      success: true,
      message: `Lesson plan created successfully for ${course.code}: ${topic}`,
      plan: newPlan,
    });
  } catch (error: any) {
    console.error("Error creating lesson plan:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. GET LESSON PLAN BY ID
// ==========================================
router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await resolveAuthFaculty(req);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    const { id } = req.params;
    const plan = await prisma.lessonPlan.findUnique({
      where: { id },
      include: {
        course: true,
        timetableSession: true,
        lmsResource: true,
      },
    });

    if (!plan) {
      return res.status(404).json({ error: "Lesson plan not found." });
    }

    // Security check: verify ownership
    if (plan.facultyId !== faculty.id && (req.userRole || "").toLowerCase() !== "super_admin") {
      return res.status(403).json({ error: "Access denied. You do not own this lesson plan." });
    }

    return res.json(plan);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. UPDATE LESSON PLAN
// ==========================================
router.put("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await resolveAuthFaculty(req);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    const { id } = req.params;
    const existing = await prisma.lessonPlan.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: "Lesson plan not found." });
    }

    if (existing.facultyId !== faculty.id && (req.userRole || "").toLowerCase() !== "super_admin") {
      return res.status(403).json({ error: "Access denied. You do not own this lesson plan." });
    }

    const {
      unitNumber,
      unitTitle,
      topic,
      subtopic,
      plannedDate,
      plannedStartTime,
      plannedEndTime,
      durationMinutes,
      teachingMode,
      teachingMethod,
      learningObjectives,
      plannedActivities,
      requiredResources,
      assessmentMethod,
      homeworkAssignment,
      timetableSessionId,
      status,
      postponedReason,
    } = req.body;

    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: {
        ...(unitNumber !== undefined && { unitNumber: Number(unitNumber) }),
        ...(unitTitle !== undefined && { unitTitle }),
        ...(topic !== undefined && { topic }),
        ...(subtopic !== undefined && { subtopic }),
        ...(plannedDate !== undefined && { plannedDate }),
        ...(plannedStartTime !== undefined && { plannedStartTime }),
        ...(plannedEndTime !== undefined && { plannedEndTime }),
        ...(durationMinutes !== undefined && { durationMinutes: Number(durationMinutes) }),
        ...(teachingMode !== undefined && { teachingMode }),
        ...(teachingMethod !== undefined && { teachingMethod }),
        ...(learningObjectives !== undefined && {
          learningObjectives: Array.isArray(learningObjectives) ? JSON.stringify(learningObjectives) : learningObjectives,
        }),
        ...(plannedActivities !== undefined && {
          plannedActivities: Array.isArray(plannedActivities) ? JSON.stringify(plannedActivities) : plannedActivities,
        }),
        ...(requiredResources !== undefined && { requiredResources }),
        ...(assessmentMethod !== undefined && { assessmentMethod }),
        ...(homeworkAssignment !== undefined && { homeworkAssignment }),
        ...(timetableSessionId !== undefined && { timetableSessionId }),
        ...(status !== undefined && { status }),
        ...(postponedReason !== undefined && { postponedReason }),
      },
      include: { course: true },
    });

    await auditLog(
      req,
      "LESSON_PLAN_UPDATED",
      "LessonPlan",
      "LessonPlan",
      id
    );

    return res.json({
      success: true,
      message: "Lesson plan updated successfully.",
      plan: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. MARK LESSON PLAN AS COMPLETED
// ==========================================
router.post("/:id/complete", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await resolveAuthFaculty(req);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    const { id } = req.params;
    const {
      actualDate = new Date().toISOString().split("T")[0],
      actualDuration = 60,
      topicsCovered,
      teachingNotes,
      actualActivities,
    } = req.body;

    const existing = await prisma.lessonPlan.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: "Lesson plan not found." });
    }

    if (existing.facultyId !== faculty.id && (req.userRole || "").toLowerCase() !== "super_admin") {
      return res.status(403).json({ error: "Access denied. You do not own this lesson plan." });
    }

    const completedPlan = await prisma.lessonPlan.update({
      where: { id },
      data: {
        status: "COMPLETED",
        actualDate,
        actualDuration: Number(actualDuration) || existing.durationMinutes || 60,
        topicsCovered: topicsCovered || existing.topic,
        teachingNotes: teachingNotes || null,
        actualActivities: Array.isArray(actualActivities) ? JSON.stringify(actualActivities) : actualActivities || existing.plannedActivities,
        coveragePercentage: 100,
      },
      include: { course: true },
    });

    await auditLog(
      req,
      "LESSON_PLAN_COMPLETED",
      "LessonPlan",
      "LessonPlan",
      id
    );

    return res.json({
      success: true,
      message: `Lesson "${completedPlan.topic}" marked as completed.`,
      plan: completedPlan,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 8. POSTPONE LESSON PLAN
// ==========================================
router.post("/:id/postpone", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await resolveAuthFaculty(req);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    const { id } = req.params;
    const { reason, rescheduledDate } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Postpone reason is required." });
    }

    const existing = await prisma.lessonPlan.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Lesson plan not found." });
    }

    if (existing.facultyId !== faculty.id && (req.userRole || "").toLowerCase() !== "super_admin") {
      return res.status(403).json({ error: "Access denied. You do not own this lesson plan." });
    }

    const postponed = await prisma.lessonPlan.update({
      where: { id },
      data: {
        status: "POSTPONED",
        postponedReason: reason,
        ...(rescheduledDate && { plannedDate: rescheduledDate }),
      },
    });

    await auditLog(
      req,
      "LESSON_PLAN_POSTPONED",
      "LessonPlan",
      "LessonPlan",
      id
    );

    return res.json({
      success: true,
      message: "Lesson plan has been postponed.",
      plan: postponed,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 9. DELETE LESSON PLAN (DRAFT / PLANNED ONLY)
// ==========================================
router.delete("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await resolveAuthFaculty(req);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    const { id } = req.params;
    const existing = await prisma.lessonPlan.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: "Lesson plan not found." });
    }

    if (existing.facultyId !== faculty.id && (req.userRole || "").toLowerCase() !== "super_admin") {
      return res.status(403).json({ error: "Access denied. You do not own this lesson plan." });
    }

    if (existing.status === "COMPLETED") {
      return res.status(400).json({ error: "Cannot delete an already completed lesson plan. It is part of the academic teaching audit." });
    }

    await prisma.lessonPlan.delete({ where: { id } });

    await auditLog(
      req,
      "LESSON_PLAN_DELETED",
      "LessonPlan",
      "LessonPlan",
      id
    );

    return res.json({
      success: true,
      message: "Lesson plan deleted successfully.",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

function safeJsonParse(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    return [str];
  }
}

export default router;
