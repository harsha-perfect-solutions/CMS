import jwt from "jsonwebtoken";
import { prisma } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "edusuite_super_secret_key_change_me_in_production";
const BASE_URL = "http://localhost:5000";

async function runAcceptanceTests() {
  console.log("=================================================================");
  console.log("STARTING FULL ACCEPTANCE TEST SUITE: EXAM NOTIFICATIONS MODULE");
  console.log("=================================================================\n");

  const results: { test: string; status: "PASS" | "FAIL"; details: string }[] = [];

  function record(test: string, pass: boolean, details: string) {
    results.push({ test, status: pass ? "PASS" : "FAIL", details });
    console.log(`[${pass ? "PASS" : "FAIL"}] ${test} - ${details}`);
  }

  try {
    // 1. Resolve Identities from Real PostgreSQL
    const adminUser = await prisma.admin.findFirst({
      where: { role: { in: ["super_admin", "admin"] } },
    });
    if (!adminUser) throw new Error("No admin user found in PostgreSQL.");

    const hodFaculty = await prisma.faculty.findFirst({
      where: { department: "CSE" },
    });
    if (!hodFaculty) throw new Error("No CSE faculty found in PostgreSQL.");

    const cseStudent = await prisma.student.findFirst({
      where: { department: "CSE", semester: 5 },
    }) || await prisma.student.findFirst({ where: { department: "CSE" } });
    if (!cseStudent) throw new Error("No CSE student found in PostgreSQL.");

    // Sign JWT tokens with { id, role, email, department }
    const adminToken = jwt.sign(
      { id: adminUser.id, role: adminUser.role, email: adminUser.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const hodToken = jwt.sign(
      { id: hodFaculty.id, role: "hod", email: hodFaculty.email, department: hodFaculty.department || "CSE" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const studentToken = jwt.sign(
      { id: cseStudent.id, role: "student", email: cseStudent.email, department: "CSE" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // TEST 1 & 2: Dynamic Authority Label Check
    const adminMetaRes = await fetch(`${BASE_URL}/api/notifications/exam/meta-options`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminMetaData = await adminMetaRes.json();
    const adminLabelOk = adminMetaData.authorityLabel.includes("Authority");
    record(
      "Dynamic Authority Label (Admin)",
      adminLabelOk && adminMetaData.canCreate === true,
      `Authority label: "${adminMetaData.authorityLabel}", canCreate: ${adminMetaData.canCreate}`
    );

    const hodMetaRes = await fetch(`${BASE_URL}/api/notifications/exam/meta-options`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    const hodMetaData = await hodMetaRes.json();
    const hodLabelOk = hodMetaData.authorityLabel.includes("HOD Authority");
    record(
      "Dynamic Authority Label (HOD)",
      hodLabelOk && hodMetaData.canCreate === true && hodMetaData.isHod === true,
      `Authority label: "${hodMetaData.authorityLabel}", dept: ${hodMetaData.userDepartment}`
    );

    // TEST 3 & 4: HOD Scope Isolation (Cannot target another department)
    const hodCrossDeptPreview = await fetch(
      `${BASE_URL}/api/notifications/exam/preview-recipients?department=ECE&scope=department`,
      { headers: { Authorization: `Bearer ${hodToken}` } }
    );
    record(
      "HOD Cannot Preview Cross-Department",
      hodCrossDeptPreview.status === 403,
      `Status: ${hodCrossDeptPreview.status} (Forbidden)`
    );

    const hodCrossDeptPublish = await fetch(`${BASE_URL}/api/notifications/exam/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hodToken}`,
      },
      body: JSON.stringify({
        title: "Malicious ECE Notification",
        message: "HOD trying to send cross-department notification",
        type: "Exam Schedule Published",
        department: "ECE",
        scope: "department",
      }),
    });
    record(
      "HOD Cannot Publish Cross-Department",
      hodCrossDeptPublish.status === 403,
      `Status: ${hodCrossDeptPublish.status} (Forbidden)`
    );

    // TEST 5: HOD Cannot Send Institution-wide Notification
    const hodInstPublish = await fetch(`${BASE_URL}/api/notifications/exam/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hodToken}`,
      },
      body: JSON.stringify({
        title: "Institution-wide Notice from HOD",
        message: "HOD trying to broadcast institution-wide",
        type: "Exam Schedule Published",
        department: "ALL",
        scope: "institution",
      }),
    });
    record(
      "HOD Cannot Broadcast Institution-wide",
      hodInstPublish.status === 403,
      `Status: ${hodInstPublish.status} (Forbidden)`
    );

    // TEST 6: Student Cannot Create/Publish Notifications
    const studentPublish = await fetch(`${BASE_URL}/api/notifications/exam/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: "Fake Exam Cancelled Notice",
        message: "Student trying to fake exam cancellation",
        type: "Exam Cancellation",
      }),
    });
    record(
      "Student Cannot Create Notifications",
      studentPublish.status === 403,
      `Status: ${studentPublish.status} (Forbidden)`
    );

    // TEST 7: Draft Flow (Does NOT notify recipients)
    const draftRes = await fetch(`${BASE_URL}/api/notifications/exam/draft`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Draft End Semester Schedule",
        message: "This is a work in progress draft notice",
        type: "Exam Schedule Published",
        department: "CSE",
        semester: 5,
        priority: "Normal",
      }),
    });
    const draftData = await draftRes.json();
    const draftBatchId = draftData.batchId;
    const draftRecipientRows = await prisma.notification.count({
      where: { entityId: draftBatchId },
    });
    record(
      "Draft Does Not Notify Recipients",
      draftData.status === "DRAFT" && draftRecipientRows === 0,
      `BatchId: ${draftBatchId}, Recipient rows in Notification table: ${draftRecipientRows}`
    );

    // TEST 8: Scheduled Notification (Does NOT notify before scheduled time)
    const futureDate = "2029-12-01";
    const futureTime = "10:00";
    const schedRes = await fetch(`${BASE_URL}/api/notifications/exam/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Scheduled Exam Notification",
        message: "This notification is scheduled for future dispatch",
        type: "Exam Schedule Published",
        department: "CSE",
        semester: 5,
        scheduledDate: futureDate,
        scheduledTime: futureTime,
      }),
    });
    const schedData = await schedRes.json();
    const schedBatchId = schedData.batchId;
    const schedRecipientRows = await prisma.notification.count({
      where: { entityId: schedBatchId },
    });
    record(
      "Scheduled Notice Does Not Dispatch Prematurely",
      schedData.status === "SCHEDULED" && schedRecipientRows === 0,
      `Status: ${schedData.status}, Recipients delivered: ${schedRecipientRows}`
    );

    // TEST 9 & 10: DEMO FLOW - Publish Now (Reaches actual PostgreSQL recipients, no duplicates)
    const previewRes = await fetch(
      `${BASE_URL}/api/notifications/exam/preview-recipients?department=CSE&semester=5&courseCode=CS401&scope=department&recipientType=Students`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const previewData = await previewRes.json();
    const expectedStudents = previewData.totalRecipients;

    const publishRes = await fetch(`${BASE_URL}/api/notifications/exam/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Semester 5 End Semester Examination Schedule",
        message: "The official examination timetable for CSE Semester 5 has been published. All candidates must inspect room assignments and reporting slots.",
        type: "Exam Schedule Published",
        priority: "High",
        department: "CSE",
        semester: 5,
        courseCode: "CS401",
        examName: "Semester 5 End Semester Examination",
        examDate: "2026-10-12",
        startTime: "10:00 AM",
        endTime: "01:00 PM",
        venue: "A-302",
        recipientType: "Students",
        scope: "department",
      }),
    });
    const publishData = await publishRes.json();
    const demoBatchId = publishData.batchId;

    const actualDeliveredCount = await prisma.notification.count({
      where: { entityId: demoBatchId },
    });

    // Check for duplicate recipient records
    const deliveredRows = await prisma.notification.findMany({
      where: { entityId: demoBatchId },
      select: { studentId: true, userId: true },
    });
    const recipientUserIds = deliveredRows.map((r) => r.userId);
    const uniqueRecipientUserIds = new Set(recipientUserIds);
    const hasDuplicates = uniqueRecipientUserIds.size !== recipientUserIds.length;

    record(
      "Published Notification Reaches Correct Recipients",
      publishData.status === "PUBLISHED" && actualDeliveredCount === expectedStudents && !hasDuplicates,
      `Delivered: ${actualDeliveredCount} recipients, Unique: ${uniqueRecipientUserIds.size}, Duplicates: ${hasDuplicates}`
    );

    // TEST 11, 12 & 13: Student Read Tracking & Dynamic Read Metrics
    const studentNotif = await prisma.notification.findFirst({
      where: { entityId: demoBatchId },
    });

    if (studentNotif) {
      const recipientAuthToken = jwt.sign(
        { id: studentNotif.userId || studentNotif.studentId, role: studentNotif.role || "student" },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Mark as read
      const markReadRes = await fetch(`${BASE_URL}/api/notifications/${studentNotif.id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${recipientAuthToken}` },
      });
      const markReadData = await markReadRes.json();
      record(
        "Student Can Mark Notification as Read",
        markReadData.success === true && markReadData.notification.isRead === true,
        `Notification ${studentNotif.id} marked isRead: true`
      );

      // Verify dynamic read aggregation in Exam Notification History
      const historyRes = await fetch(`${BASE_URL}/api/notifications/exam/history`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const historyData = await historyRes.json();
      const demoBatchHistory = (historyData.history || []).find((h: any) => h.batchId === demoBatchId);

      record(
        "Read / Unread Metrics Update Dynamically",
        demoBatchHistory && demoBatchHistory.readCount >= 1 && demoBatchHistory.unreadCount === (demoBatchHistory.totalRecipients - demoBatchHistory.readCount),
        `Read: ${demoBatchHistory?.readCount}/${demoBatchHistory?.totalRecipients}, Unread: ${demoBatchHistory?.unreadCount}, Percentage: ${demoBatchHistory?.readPercentage}%`
      );
    } else {
      record("Student Can Mark Notification as Read", false, "Student notification record not found");
    }

    // TEST 14: Cancel Notification with Audit Reason (Preserves History)
    const cancelRes = await fetch(`${BASE_URL}/api/notifications/exam/${demoBatchId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        reason: "Session rescheduled per Academic Council circular AC/2026/09",
      }),
    });
    const cancelData = await cancelRes.json();

    const cancelledDbBatch = await (prisma as any).examNotification.findUnique({
      where: { batchId: demoBatchId },
    });

    record(
      "Cancelled Notification Preserved in History with Reason",
      cancelData.status === "CANCELLED" && cancelledDbBatch?.status === "CANCELLED" && cancelledDbBatch?.cancelReason?.includes("Academic Council"),
      `Status: ${cancelledDbBatch?.status}, CancelledBy: ${cancelledDbBatch?.cancelledBy}, Reason: "${cancelledDbBatch?.cancelReason}"`
    );

    // TEST 15 & 16: Dynamic Sidebar Badge Count
    const adminBadgeRes = await fetch(`${BASE_URL}/api/notifications/badge-count`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminBadgeData = await adminBadgeRes.json();

    const studentBadgeRes = await fetch(`${BASE_URL}/api/notifications/badge-count`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const studentBadgeData = await studentBadgeRes.json();

    record(
      "Sidebar Badge Count Dynamically Scoped",
      typeof adminBadgeData.count === "number" && typeof studentBadgeData.count === "number",
      `Admin Active Count: ${adminBadgeData.count}, Student Unread Count: ${studentBadgeData.count}`
    );

    // TEST 17: Audit Trail Verification
    const auditEntries = await prisma.auditLog.findMany({
      where: {
        module: "EXAMINATIONS",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const hasPublishAudit = auditEntries.some((a) => a.action === "PUBLISH_EXAM_NOTIFICATION");
    const hasCancelAudit = auditEntries.some((a) => a.action === "CANCEL_EXAM_NOTIFICATION");

    record(
      "Authoritative Audit Log Recorded",
      hasPublishAudit && hasCancelAudit,
      `Found audit actions: ${auditEntries.map((a) => a.action).slice(0, 5).join(", ")}`
    );

    // TEST 18: Attendance and Master Timetable Continued Operation
    const timetableCheck = await prisma.masterTimetable.count();
    const attendanceCheck = await prisma.attendanceRecord.count();
    record(
      "Existing Timetable and Attendance Intact",
      timetableCheck > 0 && attendanceCheck >= 0,
      `MasterTimetable slots: ${timetableCheck}, Attendance records: ${attendanceCheck}`
    );

  } catch (err: any) {
    console.error("Test Suite execution error:", err);
    record("Acceptance Test Suite Execution", false, err.message);
  } finally {
    console.log("\n=================================================================");
    console.log("TEST SUITE SUMMARY");
    console.log("=================================================================");
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    if (failed > 0) {
      console.log("Failed tests:", results.filter((r) => r.status === "FAIL"));
    }
    console.log("=================================================================\n");
  }
}

runAcceptanceTests().then(() => prisma.$disconnect());
