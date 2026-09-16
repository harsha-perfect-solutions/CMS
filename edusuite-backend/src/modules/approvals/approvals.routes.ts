import { Router, Response } from "express";
import { prisma } from "../../db";
import { authenticateToken, AuthenticatedRequest } from "../auth/auth.routes";
import { auditLog } from "../super-admin/super-admin.routes";
import {
  WORKFLOW_DEFINITIONS,
  isAuthorizedForStep,
  WorkflowStepDef,
} from "./workflowEngine";

const router = Router();

// Helper to mask bank accounts safely
function maskBankAccount(accNo: string): string {
  if (!accNo) return "HDFC-****-8812";
  const clean = accNo.replace(/\D/g, "");
  const last4 = clean.slice(-4) || "8812";
  return `HDFC-****-${last4}`;
}

// Helper to create notifications
async function sendNotification(userId: string | null | undefined, title: string, message: string) {
  if (!userId) return;
  try {
    const student = await prisma.student.findFirst({ where: { OR: [{ id: userId }, { rollNumber: userId }] } });
    if (student) {
      await prisma.notification.create({
        data: {
          studentId: student.id,
          title,
          message,
          type: "INFO",
          isRead: false,
        },
      });
    }
  } catch (err) {
    console.error("Notification creation error:", err);
  }
}

// ==========================================
// 1. GET PENDING APPROVAL STATS & COUNTS API
// ==========================================
router.get("/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.userRole === "student" || req.userRole === "parent") {
    return res.status(403).json({ error: "Forbidden. Students and Parents cannot access approval stats." });
  }

  try {
    const requests = await prisma.approvalRequest.findMany();

    const superAdminPending = requests.filter(
      (r) => (r.currentStage === "SUPER_ADMIN_PENDING" || r.status === "PENDING" || r.status === "FINANCE_REVIEWED") && r.status !== "REJECTED" && r.status !== "FINALIZED" && r.status !== "EXECUTED"
    );
    const hrPending = requests.filter((r) => r.currentStage === "SUBMITTED" || r.currentStage === "HR_VERIFICATION");
    const financePending = requests.filter((r) => r.currentStage === "FINANCE_REVIEW");

    const totalPendingAmount = superAdminPending.reduce((sum, r) => sum + (r.amount || 0), 0);

    return res.json({
      superAdminPendingCount: superAdminPending.length,
      hrPendingCount: hrPending.length,
      financePendingCount: financePending.length,
      totalPendingAmount,
      payrollCount: requests.filter((r) => r.requestType === "PAYROLL" || r.requestType === "PAYROLL_DISBURSEMENT").length,
      reimbursementCount: requests.filter((r) => r.requestType === "REIMBURSEMENT").length,
      bankChangeCount: requests.filter((r) => r.requestType === "BANK_CHANGE" || r.module === "BANK_ACCOUNT").length,
      attendanceCount: requests.filter((r) => r.module === "ATTENDANCE").length,
      leaveCount: requests.filter((r) => r.module === "LEAVE").length,
      examCount: requests.filter((r) => r.module === "EXAM").length,
      clearanceCount: requests.filter((r) => r.module === "CLEARANCE").length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. GET ALL APPROVAL REQUESTS (WITH FILTERS & RBAC SCOPE)
// ==========================================
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.userRole === "student" || req.userRole === "parent") {
    return res.status(403).json({ error: "Forbidden. Students and Parents cannot access institutional approval management." });
  }

  const { stage, type, module: moduleParam, status, department, search, workflowCode } = req.query;

  try {
    const where: any = {};

    if (stage) {
      if (stage === "SUPER_ADMIN_PENDING") {
        where.currentStage = "SUPER_ADMIN_PENDING";
      } else {
        where.currentStage = String(stage);
      }
    }

    if (type && type !== "All" && type !== "all") {
      where.requestType = String(type).toUpperCase().replace(/\s+/g, "_");
    }

    if (moduleParam && moduleParam !== "All" && moduleParam !== "all") {
      where.module = String(moduleParam).toUpperCase();
    }

    if (workflowCode && workflowCode !== "All") {
      where.workflowCode = String(workflowCode);
    }

    if (status && status !== "All" && status !== "all") {
      where.status = String(status);
    }

    if (department && department !== "All" && department !== "All Departments") {
      where.department = { contains: String(department), mode: "insensitive" };
    }

    if (search) {
      const q = String(search).toLowerCase();
      where.OR = [
        { requestNumber: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { requestedBy: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
      ];
    }

    const records = await prisma.approvalRequest.findMany({
      where,
      include: {
        payrollRecord: true,
        reimbursement: true,
        bankChangeRequest: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = records.map((r) => ({
      ...r,
      steps: r.stepsJson ? JSON.parse(r.stepsJson) : null,
      metadataObj: r.metadata ? JSON.parse(r.metadata) : null,
    }));

    return res.json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. CREATE APPROVAL REQUEST API (UNIVERSAL WORKFLOW SUBMISSION)
// ==========================================
router.post("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.userRole === "parent") {
    return res.status(403).json({ error: "Forbidden. Parents cannot initiate approval requests." });
  }

  const {
    workflowCode = "ATTENDANCE_MEDICAL_OVERRIDE",
    module: bodyModule,
    title,
    description,
    amount = 0,
    department,
    entityType,
    entityId,
    metadata,
    priority = "High",
  } = req.body;

  try {
    // 1. Prevent duplicate active approval requests for same entity + action
    if (entityType && entityId) {
      const activeExisting = await prisma.approvalRequest.findFirst({
        where: {
          entityType,
          entityId,
          status: { in: ["SUBMITTED", "PENDING", "HR_VERIFIED", "FINANCE_REVIEWED", "IN_REVIEW"] },
        },
      });
      if (activeExisting) {
        return res.status(409).json({
          error: `An active approval request (${activeExisting.requestNumber}) already exists for this entity item.`,
          existingId: activeExisting.id,
        });
      }
    }

    // 2. Resolve workflow definition
    const wfDef = WORKFLOW_DEFINITIONS[workflowCode] || {
      workflowCode: workflowCode || "GENERIC_WORKFLOW",
      module: bodyModule || "GENERAL",
      title: title || "Generic Approval Request",
      totalSteps: 3,
      steps: [
        { stepNumber: 1, requiredRole: req.userRole || "staff", label: "Request Submission", status: "APPROVED" },
        { stepNumber: 2, requiredRole: "hod", flagRequired: "isHod", label: "HOD Verification", status: "PENDING" },
        { stepNumber: 3, requiredRole: "super_admin", flagRequired: "isSystemAdmin", label: "Executive Approval", status: "PENDING" },
      ],
    };

    const count = await prisma.approvalRequest.count();
    const requestNumber = `REQ-2026-${1000 + count + 1}`;

    const initialSteps: WorkflowStepDef[] = wfDef.steps.map((s, idx) => {
      if (idx === 0) {
        return {
          ...s,
          status: "APPROVED",
          action: "SUBMITTED",
          comment: "Request initiated by user",
          actedAt: new Date().toISOString(),
          actorId: req.userId,
          actorName: req.userRole,
        };
      } else if (idx === 1) {
        return { ...s, status: "PENDING" };
      }
      return { ...s, status: "PENDING" };
    });

    const created = await prisma.approvalRequest.create({
      data: {
        requestNumber,
        requestType: wfDef.module || bodyModule || "GENERAL",
        module: wfDef.module || bodyModule || "GENERAL",
        workflowCode: wfDef.workflowCode,
        title: title || wfDef.title,
        description: description || `Approval request initiated for ${wfDef.title}`,
        amount: Number(amount) || 0,
        entityType: entityType || null,
        entityId: entityId || null,
        currentStep: 2,
        totalSteps: wfDef.totalSteps,
        stepsJson: JSON.stringify(initialSteps),
        metadata: metadata ? JSON.stringify(metadata) : null,
        requestedBy: req.userId || "User",
        requestedByRole: req.userRole || "staff",
        department: department || "General",
        currentStage: "SUBMITTED",
        status: "PENDING",
        priority,
      },
    });

    await auditLog(req, "APPROVAL_CREATED", wfDef.module || "Approval Engine", entityType || "ApprovalRequest", created.id);

    return res.status(201).json({
      ...created,
      steps: initialSteps,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. GET SINGLE APPROVAL REQUEST DETAIL API
// ==========================================
router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.userRole === "student" || req.userRole === "parent") {
    return res.status(403).json({ error: "Forbidden. Students/Parents cannot view approval details." });
  }

  const { id } = req.params;

  try {
    const request = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        payrollRecord: true,
        reimbursement: true,
        bankChangeRequest: true,
      },
    });

    if (!request) {
      return res.status(404).json({ error: "Approval request not found." });
    }

    const steps: WorkflowStepDef[] = request.stepsJson ? JSON.parse(request.stepsJson) : [];

    // Check authorization for current user on current step
    const currentStepDef = steps.find((s) => s.stepNumber === request.currentStep) || steps[1];
    const authCheck = currentStepDef
      ? await isAuthorizedForStep({ userId: req.userId || "", userRole: req.userRole || "" }, currentStepDef.requiredRole, request.department)
      : { authorized: false };

    return res.json({
      ...request,
      steps,
      isCallerAuthorizedForCurrentStep: authCheck.authorized,
      isDelegatedAuth: authCheck.isDelegated || false,
      maskedBankAccount: request.payrollRecord?.bankAccount || maskBankAccount(request.payrollRecord?.employeeId || ""),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. ACCEPT / APPROVE STEP API (WORKFLOW ADVANCEMENT & ATOMIC TRANSACTION EXECUTION)
// ==========================================
router.post(["/:id/accept", "/:id/approve"], authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { notes, comment } = req.body;
  const stepComment = comment || notes || "Step approved.";

  try {
    const request = await prisma.approvalRequest.findUnique({
      where: { id },
      include: { payrollRecord: true, reimbursement: true, bankChangeRequest: true },
    });

    if (!request) {
      return res.status(404).json({ error: "Approval request not found." });
    }

    if (request.status === "EXECUTED" || request.status === "LOCKED" || request.status === "SUPER_ADMIN_ACCEPTED") {
      return res.status(400).json({ error: "This approval request has already reached final execution and is locked." });
    }

    if (request.status === "REJECTED") {
      return res.status(400).json({ error: "Cannot approve a rejected request." });
    }

    // Parse steps sequence
    let steps: WorkflowStepDef[] = request.stepsJson ? JSON.parse(request.stepsJson) : [];
    const activeStepIndex = steps.findIndex((s) => s.stepNumber === request.currentStep);
    const activeStep = activeStepIndex >= 0 ? steps[activeStepIndex] : steps[1] || { stepNumber: 2, requiredRole: "super_admin", label: "Executive Sign-off", status: "PENDING" };

    // 1. Strict Server-Side Authorization Check
    const authCheck = await isAuthorizedForStep(
      { userId: req.userId || "", userRole: req.userRole || "" },
      activeStep.requiredRole,
      request.department
    );

    if (!authCheck.authorized) {
      return res.status(403).json({
        error: `Authorization denied. Your role '${req.userRole}' is not authorized to sign off Step ${request.currentStep} (${activeStep.label}), which requires '${activeStep.requiredRole}'.`,
      });
    }

    // 2. Prevent self-approval (requester cannot approve step 2+ unless super admin)
    const normRole = (req.userRole || "").toLowerCase().replace(/[- ]/g, "_");
    if (request.requestedBy === req.userId && normRole !== "super_admin" && request.currentStep > 1) {
      return res.status(403).json({ error: "Forbidden. Requesters cannot approve their own institutional requests." });
    }

    // Mark current step as approved
    steps[activeStepIndex] = {
      ...activeStep,
      status: "APPROVED",
      action: "APPROVED",
      comment: stepComment,
      actedAt: new Date().toISOString(),
      actorId: req.userId,
      actorName: `${req.userRole} (${req.userId})`,
    };

    const isFinalStep = request.currentStep >= request.totalSteps;

    if (!isFinalStep) {
      // Advance to next step
      const nextStepNum = request.currentStep + 1;
      const nextStepIndex = steps.findIndex((s) => s.stepNumber === nextStepNum);
      if (nextStepIndex >= 0) {
        steps[nextStepIndex].status = "PENDING";
      }

      const updatedReq = await prisma.approvalRequest.update({
        where: { id },
        data: {
          currentStep: nextStepNum,
          currentStage: `STEP_${nextStepNum}_PENDING`,
          status: "PENDING",
          stepsJson: JSON.stringify(steps),
          hrVerifiedBy: activeStep.requiredRole === "hr" ? req.userRole : request.hrVerifiedBy,
          hrVerifiedAt: activeStep.requiredRole === "hr" ? new Date() : request.hrVerifiedAt,
          financeReviewedBy: activeStep.requiredRole === "finance" ? req.userRole : request.financeReviewedBy,
          financeReviewedAt: activeStep.requiredRole === "finance" ? new Date() : request.financeReviewedAt,
        },
      });

      await auditLog(req, `APPROVAL_STEP_${request.currentStep}_PASSED`, request.module || "Approval Engine", "ApprovalRequest", id);
      return res.json({
        ...updatedReq,
        steps,
        message: `Step ${request.currentStep} approved. Request advanced to Step ${nextStepNum}.`,
      });
    }

    // ==========================================
    // 3. FINAL STEP ATOMIC TRANSACTIONAL EXECUTION
    // ==========================================
    const result = await prisma.$transaction(async (tx) => {
      // 3a. Lock ApprovalRequest as EXECUTED / SUPER_ADMIN_ACCEPTED
      const finalReq = await tx.approvalRequest.update({
        where: { id },
        data: {
          currentStage: "FINALIZED",
          status: "EXECUTED",
          currentStep: request.totalSteps,
          stepsJson: JSON.stringify(steps),
          superAdminDecisionBy: req.userId || "Super Admin",
          superAdminDecisionAt: new Date(),
          superAdminNotes: stepComment,
        },
      });

      // 3b. Module-specific execution & DB mutations
      const reqType = request.requestType || request.module;

      if ((reqType === "PAYROLL" || reqType === "PAYROLL_DISBURSEMENT") && request.payrollRecordId) {
        await tx.payrollRecord.update({
          where: { id: request.payrollRecordId },
          data: { status: "Paid" },
        });
      } else if (reqType === "REIMBURSEMENT" && request.reimbursementId) {
        await tx.reimbursement.update({
          where: { id: request.reimbursementId },
          data: {
            status: "Approved",
            approvalDate: new Date().toISOString().split("T")[0],
          },
        });
      } else if ((reqType === "BANK_CHANGE" || reqType === "BANK_ACCOUNT") && request.bankChangeRequestId) {
        const bankReq = await tx.bankChangeRequest.update({
          where: { id: request.bankChangeRequestId },
          data: { status: "Approved" },
        });

        await tx.bankDetails.upsert({
          where: { employeeId: bankReq.employeeId },
          update: {
            bankName: bankReq.requestedBankName,
            accountNumber: bankReq.requestedAccountNumber,
            ifscCode: bankReq.requestedIfscCode,
            branch: bankReq.requestedBranch || "Main Branch",
          },
          create: {
            employeeId: bankReq.employeeId,
            bankName: bankReq.requestedBankName,
            accountNumber: bankReq.requestedAccountNumber,
            ifscCode: bankReq.requestedIfscCode,
            branch: bankReq.requestedBranch || "Main Branch",
          },
        });
      } else if (reqType === "ATTENDANCE" && request.entityId) {
        await tx.attendanceRecord.update({
          where: { id: request.entityId },
          data: { status: "Present" },
        });
      } else if ((reqType === "LEAVE" || request.module === "LEAVE") && (request.entityId || request.facultyLeaveId)) {
        const leaveId = request.facultyLeaveId || request.entityId;
        if (leaveId) {
          const leave = await tx.facultyLeave.update({
            where: { id: leaveId },
            data: {
              status: "APPROVED",
              approvedBy: req.userId || "Approver",
              approvedAt: new Date(),
            },
          });
          const matchedBal = await tx.facultyLeaveBalance.findFirst({
            where: {
              facultyId: leave.facultyId,
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
                used: matchedBal.used + leave.days,
                pending: Math.max(0, matchedBal.pending - leave.days),
              },
            });
          }

        }
      }

      return finalReq;
    });

    await sendNotification(request.requestedBy, "Approval Request Executed", `Your request '${request.title}' (${request.requestNumber}) has completed all approval steps and was successfully executed.`);
    await auditLog(req, "APPROVAL_EXECUTED", request.module || "Approval Engine", request.entityType || "ApprovalRequest", id);

    return res.json({
      ...result,
      steps,
      message: "Final approval executed successfully. Record state updated and locked.",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. REJECT REQUEST API (ENFORCES REASON & STATE TRANSITION)
// ==========================================
router.post("/:id/reject", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { rejectionReason, comment } = req.body;
  const reason = rejectionReason || comment;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: "Rejection reason is mandatory when rejecting an approval request." });
  }

  try {
    const request = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: "Approval request not found." });

    if (request.status === "EXECUTED" || request.status === "LOCKED" || request.status === "SUPER_ADMIN_ACCEPTED") {
      return res.status(400).json({ error: "Cannot reject an already executed and locked request." });
    }

    let steps: WorkflowStepDef[] = request.stepsJson ? JSON.parse(request.stepsJson) : [];
    const activeStepIndex = steps.findIndex((s) => s.stepNumber === request.currentStep);
    if (activeStepIndex >= 0) {
      steps[activeStepIndex] = {
        ...steps[activeStepIndex],
        status: "REJECTED",
        action: "REJECTED",
        comment: reason.trim(),
        actedAt: new Date().toISOString(),
        actorId: req.userId,
        actorName: `${req.userRole} (${req.userId})`,
      };
    }

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        currentStage: "FINALIZED",
        status: "REJECTED",
        stepsJson: JSON.stringify(steps),
        superAdminDecisionBy: req.userId || "Approver",
        superAdminDecisionAt: new Date(),
        rejectionReason: reason.trim(),
      },
    });

    if (request.payrollRecordId) {
      await prisma.payrollRecord.update({
        where: { id: request.payrollRecordId },
        data: { status: "Pending Approval" },
      });
    } else if (request.reimbursementId) {
      await prisma.reimbursement.update({
        where: { id: request.reimbursementId },
        data: { status: "Rejected" },
      });
    } else if ((request.requestType === "LEAVE" || request.module === "LEAVE") && (request.entityId || request.facultyLeaveId)) {
      const leaveId = request.facultyLeaveId || request.entityId;
      if (leaveId) {
        const leave = await prisma.facultyLeave.update({
          where: { id: leaveId },
          data: {
            status: "REJECTED",
            rejectionReason: reason.trim(),
          },
        });
        const matchedBal = await prisma.facultyLeaveBalance.findFirst({
          where: {
            facultyId: leave.facultyId,
            academicYear: leave.academicYear,
            leaveType: {
              contains: leave.leaveType.replace(" Leave", "").trim(),
              mode: "insensitive",
            },
          },
        });
        if (matchedBal) {
          await prisma.facultyLeaveBalance.update({
            where: { id: matchedBal.id },
            data: {
              pending: Math.max(0, matchedBal.pending - leave.days),
            },
          });
        }

      }
    }

    await sendNotification(request.requestedBy, "Approval Request Rejected", `Your request '${request.title}' (${request.requestNumber}) was rejected. Reason: ${reason.trim()}`);
    await auditLog(req, "APPROVAL_REJECTED", request.module || "Approval Engine", "ApprovalRequest", id);

    return res.json({
      ...updated,
      steps,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. RETURN FOR REVIEW API (STEP STEP-BACK)
// ==========================================
router.post("/:id/return", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { notes, comment } = req.body;
  const returnReason = comment || notes || "Returned for review.";

  try {
    const request = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: "Approval request not found." });

    if (request.status === "EXECUTED" || request.status === "LOCKED") {
      return res.status(400).json({ error: "Cannot return an already executed and locked request." });
    }

    let steps: WorkflowStepDef[] = request.stepsJson ? JSON.parse(request.stepsJson) : [];
    const prevStepNum = Math.max(1, request.currentStep - 1);

    const activeStepIndex = steps.findIndex((s) => s.stepNumber === request.currentStep);
    if (activeStepIndex >= 0) {
      steps[activeStepIndex] = {
        ...steps[activeStepIndex],
        status: "RETURNED",
        action: "RETURNED",
        comment: returnReason,
        actedAt: new Date().toISOString(),
        actorId: req.userId,
      };
    }

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        currentStep: prevStepNum,
        currentStage: `STEP_${prevStepNum}_RETURNED`,
        status: "RETURNED_FOR_REVIEW",
        returnedToStage: `STEP_${prevStepNum}`,
        stepsJson: JSON.stringify(steps),
        superAdminNotes: returnReason,
      },
    });

    await sendNotification(request.requestedBy, "Approval Request Returned", `Your request '${request.title}' (${request.requestNumber}) was returned for review. Reason: ${returnReason}`);
    await auditLog(req, "APPROVAL_RETURNED", request.module || "Approval Engine", "ApprovalRequest", id);

    return res.json({
      ...updated,
      steps,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 8. HR & FINANCE COMPATIBILITY STAGE ENDPOINTS
// ==========================================
router.post("/:id/hr-verify", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;

  if (req.userRole === "student" || req.userRole === "parent") {
    return res.status(403).json({ error: "Forbidden. Students/Parents cannot perform HR verification." });
  }

  try {
    const request = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: "Approval request not found." });

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        currentStage: "FINANCE_REVIEW",
        status: "HR_VERIFIED",
        hrVerifiedBy: req.userId || "HR Manager",
        hrVerifiedAt: new Date(),
        hrNotes: notes || "Verified attendance & claims.",
      },
    });

    await auditLog(req, "HR_VERIFIED", request.module || "Approval Workflow", "ApprovalRequest", id);
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/:id/finance-review", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;

  if (req.userRole === "student" || req.userRole === "parent") {
    return res.status(403).json({ error: "Forbidden. Students/Parents cannot perform Finance review." });
  }

  try {
    const request = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: "Approval request not found." });

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        currentStage: "SUPER_ADMIN_PENDING",
        status: "FINANCE_REVIEWED",
        financeReviewedBy: req.userId || "Finance Dean",
        financeReviewedAt: new Date(),
        financeNotes: notes || "Reviewed salary ledger & statutory tax compliance.",
      },
    });

    await auditLog(req, "FINANCE_REVIEWED", request.module || "Approval Workflow", "ApprovalRequest", id);
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 9. SEED APPROVAL REQUESTS UTILITY API (FOR ALL 9 CATEGORIES)
// ==========================================
router.post("/seed", authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const categoriesSeed = [
      { code: "ATTENDANCE_MEDICAL_OVERRIDE", title: "Medical Attendance Waiver for Roll #22CS104", dept: "CSE", amount: 0 },
      { code: "FACULTY_LEAVE", title: "IEEE International Conference Casual Leave", dept: "ECE", amount: 15000 },
      { code: "GRADE_CORRECTION", title: "Mid-Term Data Structures Marks Revaluation", dept: "CSE", amount: 0 },
      { code: "DEPARTMENT_BUDGET", title: "AI&DS Robotics Lab Equipment Procurement", dept: "AI&DS", amount: 450000 },
      { code: "PAYROLL_DISBURSEMENT", title: "July 2026 Monthly Department Payroll", dept: "CSE", amount: 1250000 },
      { code: "REIMBURSEMENT", title: "Research Paper Publication Voucher Claim", dept: "IT", amount: 25000 },
      { code: "BANK_CHANGE", title: "Faculty HDFC Salary Account Update", dept: "EEE", amount: 0 },
      { code: "STUDENT_CLEARANCE", title: "Graduation No-Dues Identity Clearance", dept: "CIVIL", amount: 0 },
      { code: "SECURITY_RBAC_CHANGE", title: "Dean Role Permission Matrix Override", dept: "Administration", amount: 0 },
    ];

    let createdCount = 0;

    for (let i = 0; i < categoriesSeed.length; i++) {
      const item = categoriesSeed[i];
      const reqNum = `REQ-2026-${9000 + i}`;
      const existing = await prisma.approvalRequest.findUnique({ where: { requestNumber: reqNum } });
      if (!existing) {
        const wfDef = WORKFLOW_DEFINITIONS[item.code];
        const steps = wfDef ? wfDef.steps : [];

        await prisma.approvalRequest.create({
          data: {
            requestNumber: reqNum,
            requestType: wfDef?.module || "GENERAL",
            module: wfDef?.module || "GENERAL",
            workflowCode: item.code,
            title: item.title,
            description: `Seeded institutional workflow request for ${item.title}`,
            amount: item.amount,
            currentStep: 2,
            totalSteps: wfDef?.totalSteps || 3,
            stepsJson: JSON.stringify(steps),
            requestedBy: "Dr. Faculty Initiator",
            requestedByRole: "faculty",
            department: item.dept,
            currentStage: "SUBMITTED",
            status: "PENDING",
            priority: item.amount > 100000 ? "Critical" : "High",
          },
        });
        createdCount++;
      }
    }

    return res.json({ message: "Centralized approval requests seeded successfully!", count: createdCount });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
