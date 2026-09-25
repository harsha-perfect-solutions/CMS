import { Router, Response } from "express";
import { prisma } from "../../db";
import { authenticateToken, AuthenticatedRequest } from "../auth/auth.routes";
import { ExamNotificationService } from "./exam-notifications.service";

const router = Router();

// GET /api/notifications: Fetch role-scoped real-time notifications list for authenticated user
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized. Token missing user identity." });
    }

    // Resolve user context from real database records (never trust client query parameters)
    const userContext = await ExamNotificationService.resolveUserContext(authUserId);
    if (!userContext) {
      return res.status(404).json({ error: "User account not found." });
    }

    // Trigger real-time sync with database state (exam schedules, attendance records, venues, hall tickets)
    await ExamNotificationService.syncNotificationsForUser(userContext);

    // Build role-scoped query
    let whereClause: any;

    if (userContext.role === "student") {
      // Strictly personal: own studentId or userId
      whereClause = {
        OR: [
          { studentId: userContext.userId },
          { userId: userContext.userId },
        ],
      };
    } else if (userContext.role === "faculty") {
      // Strictly personal to faculty assignments
      whereClause = {
        OR: [
          { userId: userContext.userId },
        ],
      };
    } else if (userContext.role === "hod") {
      // Strictly scoped to HOD's department
      const dept = userContext.department || "CSE";
      whereClause = {
        OR: [
          { userId: userContext.userId },
          {
            AND: [
              { role: "hod" },
              { metadata: { contains: `"department":"${dept}"` } },
            ],
          },
        ],
      };
    } else {
      // Super Admin: institution-wide notifications + direct notifications
      whereClause = {
        OR: [
          { userId: userContext.userId },
          { role: { in: ["super_admin", "admin", "institution"] } },
        ],
      };
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.json({
      success: true,
      unreadCount,
      notifications,
      count: notifications.length,
    });
  } catch (error: any) {
    console.error("GET /api/notifications error:", error);
    return res.status(500).json({ error: error.message || "Failed to load notifications." });
  }
});

// GET /api/notifications/unread-count: Return live unread badge count
router.get("/unread-count", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const userContext = await ExamNotificationService.resolveUserContext(authUserId);
    if (!userContext) {
      return res.status(404).json({ error: "User not found." });
    }

    let whereClause: any = {
      OR: [
        { studentId: userContext.userId },
        { userId: userContext.userId },
      ],
      isRead: false,
    };

    if (userContext.role === "super_admin") {
      whereClause = {
        OR: [
          { userId: userContext.userId },
          { role: { in: ["super_admin", "admin", "institution"] } },
        ],
        isRead: false,
      };
    }

    const unreadCount = await prisma.notification.count({
      where: whereClause,
    });

    return res.json({ success: true, unreadCount });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/:id/read: Mark a notification as read for logged-in user
router.all("/:id/read", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.userId!;

    // Ensure the notification belongs to this user or role
    const n = await prisma.notification.findFirst({
      where: {
        id,
        OR: [
          { studentId: userId },
          { userId: userId },
          { role: { in: ["super_admin", "admin"] } },
        ],
      },
    });

    if (!n) {
      return res.status(404).json({ error: "Notification not found or access denied." });
    }

    const now = new Date();
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: now, updatedAt: now },
    });

    const userContext = await ExamNotificationService.resolveUserContext(userId);
    if (userContext) {
      await ExamNotificationService.logAudit(
        userContext,
        "READ_EXAM_NOTIFICATION",
        "EXAMINATIONS",
        "Notification",
        id
      );
    }

    return res.json({
      success: true,
      message: "Notification marked as read.",
      notification: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/read-all: Mark all notifications as read for logged-in user
router.all(["/read-all", "/mark-all-read"], authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const now = new Date();

    const result = await prisma.notification.updateMany({
      where: {
        OR: [
          { studentId: userId },
          { userId: userId },
        ],
        isRead: false,
      },
      data: { isRead: true, readAt: now, updatedAt: now },
    });

    const userContext = await ExamNotificationService.resolveUserContext(userId);
    if (userContext) {
      await ExamNotificationService.logAudit(
        userContext,
        "EXAM_NOTIFICATION_MARKED_ALL_READ",
        "EXAMINATIONS",
        "Notification",
        `count:${result.count}`
      );
    }

    return res.json({
      success: true,
      message: `Marked ${result.count} notifications as read.`,
      updatedCount: result.count,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/notifications/badge-count: Return dynamic role-based badge count for sidebar
router.get("/badge-count", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const userContext = await ExamNotificationService.resolveUserContext(authUserId);
    if (!userContext) {
      return res.status(404).json({ error: "User not found." });
    }

    const count = await ExamNotificationService.getSidebarBadgeCount(userContext);
    return res.json({ success: true, count, badgeCount: count });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/notifications/exam/meta-options: Dropdown options (departments, semesters, courses)
router.get("/exam/meta-options", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = await ExamNotificationService.resolveUserContext(req.userId!);
    if (!userContext) {
      return res.status(401).json({ error: "User account not found." });
    }
    const meta = await ExamNotificationService.getMetaOptions(userContext);
    return res.json({ success: true, ...meta });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/exam/stats: Live calculated dashboard statistics
router.get("/exam/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = await ExamNotificationService.resolveUserContext(req.userId!);
    if (!userContext) {
      return res.status(401).json({ error: "User account not found." });
    }

    const stats = await ExamNotificationService.getStats(userContext);
    return res.json({ success: true, ...stats });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/exam/preview-recipients: Recipient count preview
router.get("/exam/preview-recipients", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = await ExamNotificationService.resolveUserContext(req.userId!);
    if (!userContext) {
      return res.status(401).json({ error: "User account not found." });
    }

    const { department, semester, section, courseCode, scope, recipientType, academicYear } = req.query;
    const preview = await ExamNotificationService.previewRecipients(
      {
        department: department as string,
        semester: semester as string,
        section: section as string,
        courseCode: courseCode as string,
        scope: scope as string,
        recipientType: recipientType as string,
        academicYear: academicYear as string,
      },
      userContext
    );

    return res.json(preview);
  } catch (err: any) {
    const status = err.message.startsWith("403") ? 403 : err.message.startsWith("400") ? 400 : 500;
    return res.status(status).json({ error: err.message.replace(/^\d+:\s*/, "") });
  }
});

// POST /api/notifications/exam/draft: Save Draft (status = DRAFT, does not notify recipients)
router.post("/exam/draft", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = await ExamNotificationService.resolveUserContext(req.userId!);
    if (!userContext) {
      return res.status(401).json({ error: "User account not found." });
    }

    const result = await ExamNotificationService.saveDraft(req.body, userContext);
    return res.json(result);
  } catch (err: any) {
    console.error("POST /api/notifications/exam/draft error:", err);
    const status = err.message.startsWith("403") ? 403 : err.message.startsWith("400") ? 400 : 500;
    return res.status(status).json({ error: err.message.replace(/^\d+:\s*/, "") });
  }
});

// POST /api/notifications/exam/schedule: Schedule Exam Notification (status = SCHEDULED)
router.post("/exam/schedule", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = await ExamNotificationService.resolveUserContext(req.userId!);
    if (!userContext) {
      return res.status(401).json({ error: "User account not found." });
    }

    const result = await ExamNotificationService.scheduleNotification(req.body, userContext);
    return res.json(result);
  } catch (err: any) {
    console.error("POST /api/notifications/exam/schedule error:", err);
    const status = err.message.startsWith("403") ? 403 : err.message.startsWith("400") ? 400 : 500;
    return res.status(status).json({ error: err.message.replace(/^\d+:\s*/, "") });
  }
});

// POST /api/notifications/exam/publish: Publish Exam Notification
router.post("/exam/publish", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = await ExamNotificationService.resolveUserContext(req.userId!);
    if (!userContext) {
      return res.status(401).json({ error: "User account not found." });
    }

    const result = await ExamNotificationService.publishExamNotification(req.body, userContext);
    return res.json(result);
  } catch (err: any) {
    console.error("POST /api/notifications/exam/publish error:", err);
    const status = err.message.startsWith("403") ? 403 : err.message.startsWith("400") ? 400 : 500;
    return res.status(status).json({ error: err.message.replace(/^\d+:\s*/, "") });
  }
});

// GET /api/notifications/exam/history: Calculated Notification History
router.get("/exam/history", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = await ExamNotificationService.resolveUserContext(req.userId!);
    if (!userContext) {
      return res.status(401).json({ error: "User account not found." });
    }

    const history = await ExamNotificationService.getExamNotificationHistory(userContext);
    return res.json({ success: true, history, count: history.length });
  } catch (err: any) {
    console.error("GET /api/notifications/exam/history error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/exam/:batchId/cancel: Cancel/recall notification batch
router.post("/exam/:batchId/cancel", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = await ExamNotificationService.resolveUserContext(req.userId!);
    if (!userContext) {
      return res.status(401).json({ error: "User account not found." });
    }

    const reason = req.body?.reason;
    const result = await ExamNotificationService.cancelExamNotificationBatch(req.params.batchId, reason, userContext);
    return res.json(result);
  } catch (err: any) {
    const status = err.message.startsWith("403") ? 403 : err.message.startsWith("404") ? 404 : 500;
    return res.status(status).json({ error: err.message.replace(/^\d+:\s*/, "") });
  }
});

// POST /api/notifications/broadcast: Super Admin manual exam announcement broadcast with AuditLog
router.post("/broadcast", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserId = req.userId;
    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const userContext = await ExamNotificationService.resolveUserContext(authUserId);
    if (!userContext || (userContext.role !== "super_admin" && userContext.role !== "admin")) {
      return res.status(403).json({ error: "Access denied. Only Super Administrators can issue institution announcements." });
    }

    const { audience, subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: "Subject and message are required." });
    }

    const targetAudience = audience || "all_students";
    const result = await ExamNotificationService.broadcastAnnouncement(
      targetAudience,
      subject,
      message,
      userContext
    );

    return res.json({
      success: true,
      message: `Announcement broadcast successfully dispatched to ${result.count} recipient(s).`,
      notifiedCount: result.count,
    });
  } catch (error: any) {
    console.error("POST /api/notifications/broadcast error:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;

