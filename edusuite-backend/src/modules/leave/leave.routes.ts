import { Router, Response } from "express";
import { prisma } from "../../db";
import { authenticateToken, AuthenticatedRequest } from "../auth/auth.routes";
import { auditLog } from "../super-admin/super-admin.routes";
import { WorkflowStepDef } from "../approvals/workflowEngine";

const router = Router();

// ==========================================
// HELPERS
// ==========================================

async function resolveAuthFaculty(req: AuthenticatedRequest) {
  if (!req.userId) return null;
  const faculty = await prisma.faculty.findFirst({
    where: {
      OR: [
        { id: req.userId },
        { email: req.userEmail || "" },
        { rollNumber: req.userEmail || "" },
      ],
    },
    include: {
      timetables: {
        include: {
          course: true,
        },
      },
    },
  });
  return faculty;
}

const DEFAULT_LEAVE_QUOTAS = [
  { leaveType: "Casual Leave", entitlement: 12.0, color: "bg-blue-500" },
  { leaveType: "Sick Leave", entitlement: 15.0, color: "bg-emerald-500" },
  { leaveType: "Earned Leave", entitlement: 10.0, color: "bg-violet-500" },
  { leaveType: "Duty Leave", entitlement: 5.0, color: "bg-amber-500" },
];

async function getOrInitBalances(facultyId: string, academicYear: string = "2026-27") {
  let balances = await prisma.facultyLeaveBalance.findMany({
    where: { facultyId, academicYear },
    orderBy: { leaveType: "asc" },
  });

  if (balances.length === 0) {
    for (const quota of DEFAULT_LEAVE_QUOTAS) {
      await prisma.facultyLeaveBalance.create({
        data: {
          facultyId,
          academicYear,
          leaveType: quota.leaveType,
          entitlement: quota.entitlement,
          used: 0.0,
          pending: 0.0,
          color: quota.color,
        },
      });
    }
    balances = await prisma.facultyLeaveBalance.findMany({
      where: { facultyId, academicYear },
      orderBy: { leaveType: "asc" },
    });
  }

  return balances;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function checkTimetableConflicts(facultyId: string, startDateStr: string, endDateStr: string) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  const timetables = await prisma.masterTimetable.findMany({
    where: { facultyId },
    include: { course: true },
  });

  const conflicts: Array<{
    date: string;
    day: string;
    courseCode: string;
    courseName: string;
    section: string;
    time: string;
    room: string;
    periodNumber: number;
  }> = [];

  const curr = new Date(start);
  while (curr <= end) {
    const dayIndex = curr.getDay();
    const dayName = DAY_NAMES[dayIndex];
    const dateStr = curr.toISOString().split("T")[0];

    const matchingSlots = timetables.filter((tt) => tt.day?.toLowerCase() === dayName.toLowerCase());
    for (const slot of matchingSlots) {
      conflicts.push({
        date: dateStr,
        day: dayName,
        courseCode: slot.course?.code || "SUB",
        courseName: slot.course?.name || "Subject",
        section: slot.section || "A",
        time: `${slot.startTime} - ${slot.endTime}`,
        room: slot.roomNo || "Room",
        periodNumber: slot.periodNumber || 1,
      });
    }
    curr.setDate(curr.getDate() + 1);
  }

  return conflicts;
}

// ==========================================
// 1. GET WORKSPACE (BALANCES, STATS, REQUESTS, TIMELINE)
// ==========================================
router.get("/workspace", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await resolveAuthFaculty(req);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    const academicYear = "2026-27";
    const deptName =
      faculty.department === "CSE"
        ? "Computer Science & Engineering"
        : faculty.department === "ECE"
        ? "Electronics & Communication Engineering"
        : faculty.department || "Computer Science & Engineering";

    // 1. Balances
    const balances = await getOrInitBalances(faculty.id, academicYear);

    // 2. Faculty Leave requests
    const leaveRecords = await prisma.facultyLeave.findMany({
      where: { facultyId: faculty.id },
      include: {
        approvalRequests: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Enrich requests with ApprovalRequest workflow details
    const requests = leaveRecords.map((l) => {
      const appReq = l.approvalRequests && l.approvalRequests[0];
      let approvalSteps: any[] = [];
      let approverName = "HOD Office";

      if (appReq && appReq.stepsJson) {
        try {
          approvalSteps = JSON.parse(appReq.stepsJson);
          const currentStep = approvalSteps.find((s: any) => s.stepNumber === appReq.currentStep) || approvalSteps[1];
          if (currentStep) {
            approverName = currentStep.actorName || currentStep.assignedApprover || (currentStep.requiredRole === "hod" ? "Dr. Rajesh Sharma (HOD)" : "HR Manager");
          }
        } catch {}
      }

      let conflictsParsed = [];
      if (l.timetableConflicts) {
        try {
          conflictsParsed = JSON.parse(l.timetableConflicts);
        } catch {}
      }

      return {
        id: l.requestNumber,
        dbId: l.id,
        leaveType: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
        days: l.days,
        isHalfDay: l.isHalfDay,
        halfDaySession: l.halfDaySession,
        reason: l.reason,
        emergencyContact: l.emergencyContact || "+91 9876543210",
        remarks: l.additionalNotes || "",
        attachmentName: l.attachmentName,
        status: l.status,
        rejectionReason: l.rejectionReason || appReq?.rejectionReason,
        appliedOn: l.createdAt.toISOString().split("T")[0],
        approver: approverName,
        approvalSteps,
        timetableConflicts: conflictsParsed,
      };
    });

    // 3. Compute Summary KPI Cards
    const casual = balances.find((b) => b.leaveType.includes("Casual")) || { entitlement: 12, used: 0, pending: 0 };
    const sick = balances.find((b) => b.leaveType.includes("Sick")) || { entitlement: 15, used: 0, pending: 0 };
    const earned = balances.find((b) => b.leaveType.includes("Earned")) || { entitlement: 10, used: 0, pending: 0 };
    const duty = balances.find((b) => b.leaveType.includes("Duty")) || { entitlement: 5, used: 0, pending: 0 };

    const pendingRequests = requests.filter(
      (r) => r.status === "PENDING" || r.status === "SUBMITTED" || r.status === "HOD_REVIEW"
    );

    const todayStr = new Date().toISOString().split("T")[0];
    const upcomingApproved = requests.find(
      (r) => r.status === "APPROVED" && r.startDate >= todayStr
    );

    const stats = {
      casualText: `${casual.entitlement - casual.used} / ${casual.entitlement} Days`,
      casualRemaining: casual.entitlement - casual.used,
      casualUsed: casual.used,
      casualTotal: casual.entitlement,

      sickText: `${sick.entitlement - sick.used} / ${sick.entitlement} Days`,
      sickRemaining: sick.entitlement - sick.used,
      sickUsed: sick.used,
      sickTotal: sick.entitlement,

      earnedText: `${earned.entitlement - earned.used} / ${earned.entitlement} Days`,
      earnedRemaining: earned.entitlement - earned.used,
      earnedUsed: earned.used,
      earnedTotal: earned.entitlement,

      dutyText: `${duty.entitlement - duty.used} Remaining`,
      dutyRemaining: duty.entitlement - duty.used,
      dutyUsed: duty.used,
      dutyTotal: duty.entitlement,

      pendingText: `${pendingRequests.length} Request${pendingRequests.length !== 1 ? "s" : ""}`,
      pendingCount: pendingRequests.length,

      upcomingText: upcomingApproved
        ? `${upcomingApproved.startDate} to ${upcomingApproved.endDate}`
        : "No upcoming leaves",
      upcomingApproved: upcomingApproved || null,
    };

    // 4. Formatted Leave Quota Balances for UI Progress Bars
    const quotaBalances = balances.map((b) => {
      const remaining = Math.max(0, b.entitlement - b.used);
      const percent = b.entitlement > 0 ? Math.min(100, Math.round((b.used / b.entitlement) * 100)) : 0;
      return {
        leaveType: b.leaveType,
        remaining,
        used: b.used,
        pending: b.pending,
        total: b.entitlement,
        percent,
        color: b.color || "bg-blue-500",
      };
    });

    // 5. Active Timeline Request (Most recent pending or latest request)
    const activeTimelineRequest = pendingRequests[0] || requests[0] || null;

    return res.json({
      success: true,
      faculty: {
        id: faculty.id,
        name: faculty.name,
        email: faculty.email,
        rollNumber: faculty.rollNumber,
        department: faculty.department,
      },
      department: deptName,
      academicYear,
      stats,
      balances: quotaBalances,
      requests,
      activeTimelineRequest,
    });
  } catch (error: any) {
    console.error("Error in GET /api/faculty/leave/workspace:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. CHECK TIMETABLE CONFLICTS API
// ==========================================
router.get("/check-conflicts", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await resolveAuthFaculty(req);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required." });
    }

    const conflicts = await checkTimetableConflicts(faculty.id, String(startDate), String(endDate));
    return res.json({ success: true, conflicts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. APPLY FOR LEAVE API
// ==========================================
router.post("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await resolveAuthFaculty(req);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    const {
      leaveType,
      startDate,
      endDate,
      isHalfDay = false,
      halfDaySession,
      reason,
      emergencyContact,
      additionalNotes,
      attachmentName,
    } = req.body;

    // 1. Validation
    if (!leaveType || !startDate || !endDate || !reason?.trim()) {
      return res.status(422).json({ error: "Leave type, start date, end date, and reason are required." });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(422).json({ error: "Invalid start or end date format." });
    }

    if (start > end) {
      return res.status(422).json({ error: "Start date cannot be after end date." });
    }

    const calculatedDays = isHalfDay
      ? 0.5
      : Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

    // 2. Check Overlapping Active Leave
    const overlapping = await prisma.facultyLeave.findFirst({
      where: {
        facultyId: faculty.id,
        status: { notIn: ["REJECTED", "CANCELLED", "WITHDRAWN"] },
        AND: [
          { startDate: { lte: endDate } },
          { endDate: { gte: startDate } },
        ],
      },
    });

    if (overlapping) {
      return res.status(409).json({
        error: `You already have an active leave request (${overlapping.requestNumber}) overlapping these dates (${overlapping.startDate} to ${overlapping.endDate}).`,
      });
    }

    // 3. Check Leave Balance
    const academicYear = "2026-27";
    const balances = await getOrInitBalances(faculty.id, academicYear);
    const normLeaveType = leaveType.toLowerCase();
    const balance = balances.find((b) => b.leaveType.toLowerCase().includes(normLeaveType) || normLeaveType.includes(b.leaveType.toLowerCase()));

    if (balance) {
      const available = Math.max(0, balance.entitlement - balance.used - balance.pending);
      if (calculatedDays > available) {
        return res.status(422).json({
          error: `Insufficient ${balance.leaveType} balance. Available: ${available} days, Requested: ${calculatedDays} day(s).`,
        });
      }
    }

    // 4. Timetable conflicts inspection
    const conflicts = await checkTimetableConflicts(faculty.id, startDate, endDate);

    // 5. Database Atomic Transaction
    const result = await prisma.$transaction(async (tx) => {
      const totalLeaves = await tx.facultyLeave.count();
      const requestNumber = `LV-2026-${String(totalLeaves + 1).padStart(3, "0")}`;

      // 5a. Create FacultyLeave record
      const leave = await tx.facultyLeave.create({
        data: {
          requestNumber,
          facultyId: faculty.id,
          academicYear,
          department: faculty.department || "CSE",
          leaveType,
          startDate,
          endDate,
          days: calculatedDays,
          isHalfDay: !!isHalfDay,
          halfDaySession: halfDaySession || null,
          reason: reason.trim(),
          emergencyContact: emergencyContact?.trim() || "+91 9876543210",
          additionalNotes: additionalNotes?.trim() || null,
          attachmentName: attachmentName || null,
          status: "HOD_REVIEW",
          timetableConflicts: conflicts.length > 0 ? JSON.stringify(conflicts) : null,
        },
      });

      // 5b. Update pending balance
      if (balance) {
        await tx.facultyLeaveBalance.update({
          where: { id: balance.id },
          data: {
            pending: { increment: calculatedDays },
          },
        });
      }

      // 5c. Create ApprovalRequest record linked to FACULTY_LEAVE workflow
      const initialSteps: WorkflowStepDef[] = [
        {
          stepNumber: 1,
          requiredRole: "faculty",
          label: "Faculty Leave Application",
          status: "APPROVED",
          action: "SUBMITTED",
          comment: "Application submitted by faculty member.",
          actedAt: new Date().toISOString(),
          actorId: faculty.id,
          actorName: faculty.name,
        },
        {
          stepNumber: 2,
          requiredRole: "hod",
          flagRequired: "isHod",
          label: "HOD Review & Substitute Check",
          assignedApprover: "Dr. Rajesh Sharma (HOD)",
          status: "PENDING",
        },
        {
          stepNumber: 3,
          requiredRole: "hr",
          flagRequired: "isHRManager",
          label: "HR Leave Balance Verification",
          assignedApprover: "HR Manager",
          status: "PENDING",
        },
      ];

      await tx.approvalRequest.create({
        data: {
          requestNumber,
          requestType: "LEAVE",
          module: "LEAVE",
          workflowCode: "FACULTY_LEAVE",
          title: `Faculty ${leaveType} Request (${calculatedDays} Days)`,
          description: reason.trim(),
          entityType: "FacultyLeave",
          entityId: leave.id,
          facultyLeaveId: leave.id,
          currentStep: 2,
          totalSteps: 3,
          stepsJson: JSON.stringify(initialSteps),
          metadata: JSON.stringify({
            leaveType,
            startDate,
            endDate,
            days: calculatedDays,
            conflictsCount: conflicts.length,
          }),
          requestedBy: faculty.name,
          requestedByRole: "faculty",
          department: faculty.department || "CSE",
          currentStage: "HOD_REVIEW",
          status: "PENDING",
          priority: conflicts.length > 0 ? "High" : "Normal",
        },
      });

      return leave;
    });

    await auditLog(req, "LEAVE_REQUEST_CREATED", "Leave Management", "FacultyLeave", result.id);

    return res.status(201).json({
      success: true,
      message: `Leave request ${result.requestNumber} submitted successfully!`,
      leave: result,
      timetableConflicts: conflicts,
    });
  } catch (error: any) {
    console.error("Error in POST /api/faculty/leave:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. GET SINGLE LEAVE DETAILS API
// ==========================================
router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await resolveAuthFaculty(req);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    const { id } = req.params;
    const leave = await prisma.facultyLeave.findFirst({
      where: {
        OR: [{ id }, { requestNumber: id }],
      },
      include: {
        approvalRequests: true,
      },
    });

    if (!leave) {
      return res.status(404).json({ error: "Leave request not found." });
    }

    if (leave.facultyId !== faculty.id && req.userRole !== "super_admin" && req.userRole !== "hod") {
      return res.status(403).json({ error: "Forbidden. You are not authorized to view another faculty member's leave." });
    }

    return res.json({ success: true, leave });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. WITHDRAW / CANCEL LEAVE REQUEST API
// ==========================================
router.post("/:id/withdraw", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await resolveAuthFaculty(req);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    const { id } = req.params;
    const leave = await prisma.facultyLeave.findFirst({
      where: {
        OR: [{ id }, { requestNumber: id }],
      },
    });

    if (!leave) {
      return res.status(404).json({ error: "Leave request not found." });
    }

    if (leave.facultyId !== faculty.id) {
      return res.status(403).json({ error: "Forbidden. You cannot withdraw another faculty's leave request." });
    }

    if (leave.status === "APPROVED" || leave.status === "REJECTED" || leave.status === "WITHDRAWN" || leave.status === "CANCELLED") {
      return res.status(400).json({
        error: `Cannot withdraw request with status '${leave.status}'. Only pending requests can be withdrawn.`,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.facultyLeave.update({
        where: { id: leave.id },
        data: { status: "WITHDRAWN" },
      });

      // Release pending days
      const matchedBal = await tx.facultyLeaveBalance.findFirst({
        where: {
          facultyId: faculty.id,
          academicYear: leave.academicYear,
          leaveType: {
            contains: leave.leaveType.replace(" Leave", "").trim(),
            mode: "insensitive",
          },
        },
      });

      if (matchedBal) {
        await tx.facultyLeaveBalance.update({
          where: { id: matchedBal.id },
          data: {
            pending: Math.max(0, matchedBal.pending - leave.days),
          },
        });
      }


      // Update approval request
      await tx.approvalRequest.updateMany({
        where: { entityId: leave.id },
        data: {
          status: "CANCELLED",
          currentStage: "WITHDRAWN",
        },
      });
    });

    await auditLog(req, "LEAVE_REQUEST_WITHDRAWN", "Leave Management", "FacultyLeave", leave.id);

    return res.json({
      success: true,
      message: `Leave request ${leave.requestNumber} has been withdrawn.`,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. GET BALANCES ONLY API
// ==========================================
router.get("/balances", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await resolveAuthFaculty(req);
    if (!faculty) {
      return res.status(403).json({ error: "Access denied. Faculty profile not found." });
    }

    const balances = await getOrInitBalances(faculty.id, "2026-27");
    return res.json(balances);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
