import type { ApiResponse } from "@/shared/types/api.types";
import type { Notification } from "../types/NotificationTypes";
import notificationsData from "../data/notifications.json";
import api from "@/lib/api";

export interface INotificationRepository {
  getNotifications(role: string, collegeId?: string): Promise<ApiResponse<Notification[]>>;
  markAsRead(id: string): Promise<ApiResponse<boolean>>;
  updateStatus(id: string, status: Notification["status"]): Promise<ApiResponse<boolean>>;
  createNotification(
    notification: Omit<Notification, "id" | "created_at" | "status" | "schema_version" | "delivery_status" | "updated_at">
  ): Promise<ApiResponse<Notification>>;
}

let dbNotifications: Notification[] = [...(notificationsData as any[])];

export class MockNotificationRepository implements INotificationRepository {
  async getNotifications(role: string, collegeId: string = "GMR"): Promise<ApiResponse<Notification[]>> {
    const normRole = role.replace(/_/g, "-");
    const list = dbNotifications.filter(
      (n) =>
        (n.target_role === role || n.target_role === normRole) &&
        n.college_id === collegeId &&
        n.status !== "deleted"
    );
    return { success: true, data: list };
  }

  async markAsRead(id: string): Promise<ApiResponse<boolean>> {
    return this.updateStatus(id, "read");
  }

  async updateStatus(id: string, status: Notification["status"]): Promise<ApiResponse<boolean>> {
    const match = dbNotifications.find((x) => x.id === id);
    if (match) {
      match.status = status;
      match.updated_at = new Date().toISOString();
      return { success: true, data: true };
    }
    return { success: false, data: false, error: "Notification not found" };
  }

  async createNotification(
    notification: Omit<Notification, "id" | "created_at" | "status" | "schema_version" | "delivery_status" | "updated_at">
  ): Promise<ApiResponse<Notification>> {
    const delivery: Record<string, boolean> = {};
    notification.channels.forEach((ch) => {
      delivery[ch] = true;
    });

    const now = new Date().toISOString();
    const newNotif: Notification = {
      ...notification,
      id: `NOTIF-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "unread",
      schema_version: "1.0",
      delivery_status: delivery,
      created_at: now,
      updated_at: now,
    };

    dbNotifications.unshift(newNotif);
    return { success: true, data: newNotif };
  }
}

export class ApiNotificationRepository implements INotificationRepository {
  private fallback = new MockNotificationRepository();

  async getNotifications(role: string, collegeId: string = "ANITS"): Promise<ApiResponse<Notification[]>> {
    try {
      const res = await api.get("/api/notifications");
      const list = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
      const mapped: Notification[] = list.map((n: any) => ({
        id: n.id,
        college_id: collegeId,
        title: n.title,
        message: n.message,
        template: "SYSTEM",
        type: n.type === "WARNING" ? "Warning" : "Information",
        priority: "Medium",
        module: "Academic",
        target_role: role,
        status: n.isRead ? "read" : "unread",
        delivery_status: { dashboard: true },
        channels: ["dashboard"],
        created_by: "System",
        created_at: n.createdAt,
        updated_at: n.createdAt,
        schema_version: "1.0",
        expires_at: null,
      }));
      return { success: true, data: mapped };
    } catch {
      return this.fallback.getNotifications(role, collegeId);
    }
  }

  async markAsRead(id: string): Promise<ApiResponse<boolean>> {
    try {
      await api.put(`/api/notifications/${id}/read`);
      return { success: true, data: true };
    } catch {
      return this.fallback.markAsRead(id);
    }
  }

  async updateStatus(id: string, status: Notification["status"]): Promise<ApiResponse<boolean>> {
    try {
      if (status === "read") {
        await api.put(`/api/notifications/${id}/read`);
      }
      return { success: true, data: true };
    } catch {
      return this.fallback.updateStatus(id, status);
    }
  }

  async createNotification(
    notification: Omit<Notification, "id" | "created_at" | "status" | "schema_version" | "delivery_status" | "updated_at">
  ): Promise<ApiResponse<Notification>> {
    return this.fallback.createNotification(notification);
  }
}

export const notificationRepository: INotificationRepository = new ApiNotificationRepository();

export default notificationRepository;
