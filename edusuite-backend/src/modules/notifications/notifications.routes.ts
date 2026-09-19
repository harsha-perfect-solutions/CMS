import { Router, Response } from "express";
import { prisma } from "../../db";
import { authenticateToken, AuthenticatedRequest } from "../auth/auth.routes";

const router = Router();

// GET /api/notifications: Fetch notifications list for logged-in user
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const notifications = await prisma.notification.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(notifications);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/:id/read: Mark a notification as read
router.put("/:id/read", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.userId!;

    // Ensure the notification belongs to this user
    const n = await prisma.notification.findFirst({
      where: { id, studentId: userId },
    });

    if (!n) {
      return res.status(404).json({ error: "Notification not found." });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.json({ message: "Notification marked as read.", notification: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/read-all: Mark all notifications as read for logged-in user
router.all(["/read-all", "/mark-all-read"], authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const result = await prisma.notification.updateMany({
      where: { studentId: userId, isRead: false },
      data: { isRead: true },
    });

    return res.json({ success: true, message: `Marked ${result.count} notifications as read.`, updatedCount: result.count });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
