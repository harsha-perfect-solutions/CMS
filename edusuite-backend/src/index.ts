import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment configurations
dotenv.config();

import { prisma } from "./db";

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parser
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve static uploads folder
import path from "path";
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// API health check
app.get("/api/health", (_req, res) => {
  return res.json({ status: "OK", timestamp: new Date() });
});

import { seedDatabase } from "./seeder";

// Database Seeder Utility Route (Secured for non-production/development use only)
app.post("/api/db/seed", async (_req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Database seeding is disabled in production environments." });
  }
  try {
    await seedDatabase();
    return res.json({ message: "Database seeded successfully!" });
  } catch (error: any) {
    console.error("Seeder error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Import modular routes from modules folder
import authRoutes from "./modules/auth/auth.routes";
import courseRoutes from "./modules/courses/courses.routes";
import examRoutes from "./modules/exams/exams.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import notificationRoutes from "./modules/notifications/notifications.routes";
import studentRoutes from "./modules/students/students.routes";
import employeeRoutes from "./modules/employees/employees.routes";
import superAdminRoutes from "./modules/super-admin/super-admin.routes";
import academicsRoutes from "./modules/academics/academics.routes";
import payrollRoutes from "./modules/payroll/payroll.routes";
import deanRoutes from "./modules/dean/dean.routes";
import approvalsRoutes from "./modules/approvals/approvals.routes";
import alumniAnalyticsRoutes from "./modules/alumni-analytics/alumni-analytics.routes";
import libraryRoutes from "./modules/library/library.routes";
import lmsRoutes from "./modules/lms/lms.routes";
import hodRoutes from "./modules/hod/hod.routes";
import resultsRoutes from "./modules/results/results.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import procurementRoutes from "./modules/procurement/procurement.routes";
import lessonPlansRoutes from "./modules/lesson-plans/lesson-plans.routes";
import leaveRoutes from "./modules/leave/leave.routes";
import anitsRoutes from "./modules/anits/anits.routes";

// Register routes
app.use("/api/anits", anitsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/faculty", employeeRoutes);
app.use("/api/dean/faculty", employeeRoutes);
app.use("/api/academics/faculty", employeeRoutes);
app.use("/api/faculty/lesson-plans", lessonPlansRoutes);
app.use("/api/academics/lesson-plans", lessonPlansRoutes);
app.use("/api/faculty/leave", leaveRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/academics", academicsRoutes);
app.use("/api/academic", academicsRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/dean", deanRoutes);
app.use("/api/approvals", approvalsRoutes);
app.use("/api/admin/alumni/analytics", alumniAnalyticsRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/lms", lmsRoutes);
app.use("/api/student/lms", lmsRoutes);
app.use("/api/hod", hodRoutes);
app.use("/api/results", resultsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/procurement", procurementRoutes);

// Boot server
app.listen(PORT, async () => {
  console.log(`EduSuite Backend API Server is listening on http://localhost:${PORT}`);
  
  // Auto-migrate department and sections for existing courses on boot
  try {
    const nullCourses = await prisma.course.findMany({
      where: {
        OR: [
          { department: null },
          { sections: null }
        ]
      }
    });

    if (nullCourses.length > 0) {
      console.log(`Migrating department and sections for ${nullCourses.length} courses...`);
      for (const c of nullCourses) {
        let dept = "CSE";
        if (c.code.startsWith("CS")) dept = "CSE";
        else if (c.code.startsWith("AM")) dept = "AI&ML";
        else if (c.code.startsWith("AD")) dept = "AI&DS";
        else if (c.code.startsWith("IT")) dept = "IT";
        else if (c.code.startsWith("EE")) dept = "EEE";
        else if (c.code.startsWith("EC")) dept = "ECE";
        else if (c.code.startsWith("CE")) dept = "CIVIL";
        else if (c.code.startsWith("ME")) dept = "MECHANICAL";

        await prisma.course.update({
          where: { id: c.id },
          data: {
            department: c.department || dept,
            sections: c.sections || "A,B,C,D"
          }
        });
      }
      console.log("Course migration complete.");
    }
  } catch (err) {
    console.error("Migration error on boot:", err);
  }
});

