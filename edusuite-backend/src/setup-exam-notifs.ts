import { prisma } from "./db";

async function main() {
  console.log("Checking and initializing exam_notifications table in PostgreSQL...");

  // 1. Create table if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS exam_notifications (
      id VARCHAR(255) PRIMARY KEY,
      batch_id VARCHAR(255) UNIQUE NOT NULL,
      title VARCHAR(500) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(100) NOT NULL,
      priority VARCHAR(50) DEFAULT 'High',
      recipient_type VARCHAR(50) DEFAULT 'Students',
      scope VARCHAR(50) DEFAULT 'department',
      department VARCHAR(100) DEFAULT 'ALL',
      academic_year VARCHAR(50) DEFAULT '2026-27',
      semester INT,
      section VARCHAR(50),
      course_code VARCHAR(100),
      exam_name VARCHAR(255),
      exam_schedule_id VARCHAR(255),
      exam_date VARCHAR(100),
      start_time VARCHAR(100),
      end_time VARCHAR(100),
      venue VARCHAR(255),
      status VARCHAR(50) DEFAULT 'DRAFT',
      scheduled_date VARCHAR(50),
      scheduled_time VARCHAR(50),
      scheduled_at TIMESTAMP,
      published_at TIMESTAMP,
      cancelled_at TIMESTAMP,
      cancelled_by VARCHAR(255),
      cancel_reason TEXT,
      total_recipients INT DEFAULT 0,
      student_count INT DEFAULT 0,
      faculty_count INT DEFAULT 0,
      sender_id VARCHAR(255) NOT NULL,
      sender_name VARCHAR(255) NOT NULL,
      sender_role VARCHAR(100) NOT NULL,
      attachment_url TEXT,
      metadata TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_exam_notifs_batch ON exam_notifications(batch_id);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_exam_notifs_dept ON exam_notifications(department);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_exam_notifs_status ON exam_notifications(status);`);

  console.log("exam_notifications table and indexes ready.");

  // 2. Check existing batches in Notification table and sync them into exam_notifications
  const existingBatches: any[] = await prisma.$queryRawUnsafe(`
    SELECT 
      "entityId" as "batchId",
      MAX("title") as "title",
      MAX("message") as "message",
      MAX("type") as "type",
      MAX("priority") as "priority",
      MAX("senderName") as "senderName",
      MAX("senderRole") as "senderRole",
      MAX("senderId") as "senderId",
      MAX("department") as "department",
      MAX("courseCode") as "courseCode",
      MAX("metadata") as "metadata",
      MAX("status") as "status",
      MIN("createdAt") as "createdAt",
      COUNT(*)::int as "totalRecipients"
    FROM "Notification"
    WHERE "entityId" IS NOT NULL AND "entityId" LIKE 'EXAM-%'
    GROUP BY "entityId"
  `);

  console.log(`Found ${existingBatches.length} existing batches in Notification table.`);

  for (const b of existingBatches) {
    const existing = await (prisma as any).examNotification.findUnique({
      where: { batchId: b.batchId },
    });

    if (!existing) {
      let meta: any = {};
      try {
        if (b.metadata) meta = JSON.parse(b.metadata);
      } catch {}

      // Count actual recipients excluding sender confirmation
      const recCount = await prisma.notification.count({
        where: {
          entityId: b.batchId,
          role: { in: ["student", "faculty", "hod"] },
        },
      });

      const sCount = await prisma.notification.count({
        where: { entityId: b.batchId, role: "student" },
      });

      const fCount = await prisma.notification.count({
        where: { entityId: b.batchId, role: { in: ["faculty", "hod"] } },
      });

      await (prisma as any).examNotification.create({
        data: {
          id: b.batchId,
          batchId: b.batchId,
          title: b.title.replace(/^Dispatched:\s*/i, ""),
          message: b.message,
          type: b.type,
          priority: b.priority || "High",
          recipientType: "Students & Faculty",
          scope: meta.scope || "department",
          department: b.department || meta.department || "CSE",
          academicYear: meta.academicYear || "2026-27",
          semester: meta.semester ? Number(meta.semester) : 5,
          section: meta.section || "ALL",
          courseCode: b.courseCode || meta.courseCode || null,
          examName: meta.examName || b.title,
          examDate: meta.examDate || "2026-10-15",
          startTime: meta.examTime ? meta.examTime.split("-")[0]?.trim() : "10:00 AM",
          endTime: meta.examTime ? meta.examTime.split("-")[1]?.trim() : "01:00 PM",
          venue: meta.venue || "Block A - Hall 301",
          status: b.status === "Cancelled" ? "CANCELLED" : "PUBLISHED",
          publishedAt: b.createdAt,
          cancelledAt: b.status === "Cancelled" ? b.createdAt : null,
          cancelledBy: b.status === "Cancelled" ? b.senderName : null,
          cancelReason: b.status === "Cancelled" ? "Notice recalled by administrator" : null,
          totalRecipients: recCount || b.totalRecipients,
          studentCount: sCount,
          facultyCount: fCount,
          senderId: b.senderId || "admin-system",
          senderName: b.senderName || "Rajesh Sharma (Admin)",
          senderRole: b.senderRole || "admin",
          metadata: b.metadata,
        },
      });
      console.log(`Migrated historical batch ${b.batchId} into exam_notifications.`);
    }
  }

  console.log("Migration complete!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
