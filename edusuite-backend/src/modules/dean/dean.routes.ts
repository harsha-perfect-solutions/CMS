import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../db";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "edusuite_super_secret_key_change_me_in_production";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

// Authentication & Token Verification Middleware
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. Token missing." });
  }


  try {
    const verified = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    req.userId = verified.id;
    req.userRole = verified.role;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token." });
  }
}

// Department condition builder for Faculty table queries
function buildFacultyDepartmentCondition(department?: string): any {
  if (!department || department === "all" || department === "All" || department === "All Departments") {
    return {};
  }

  const deptUpper = department.toUpperCase().trim();
  let codePrefix = "";
  let fullnames: string[] = [];

  if (deptUpper === "CSE" || deptUpper === "CS") {
    codePrefix = "CS";
    fullnames = ["Computer Science", "Computer Science & Engineering", "CSE", "CS"];
  } else if (deptUpper === "ECE" || deptUpper === "EC") {
    codePrefix = "EC";
    fullnames = ["Electronics", "Electronics & Communication Engineering", "ECE", "EC"];
  } else if (deptUpper === "EEE" || deptUpper === "EE") {
    codePrefix = "EE";
    fullnames = ["Electrical", "Electrical & Electronics Engineering", "EEE", "EE"];
  } else if (deptUpper === "ME" || deptUpper === "MECHANICAL") {
    codePrefix = "ME";
    fullnames = ["Mechanical", "Mechanical Engineering", "ME", "MECHANICAL"];
  } else if (deptUpper === "CIVIL" || deptUpper === "CE" || deptUpper === "CIVIL ENGINEERING") {
    codePrefix = "CE";
    fullnames = ["Civil", "Civil Engineering", "CIVIL", "CE"];
  } else if (deptUpper.includes("AI&ML") || deptUpper.includes("AIML")) {
    codePrefix = "AM";
    fullnames = ["Artificial Intelligence & Machine Learning", "AI&ML", "AIML", "AM"];
  } else if (deptUpper.includes("AI&DS") || deptUpper.includes("AIDS")) {
    codePrefix = "AD";
    fullnames = ["Artificial Intelligence & Data Science", "AI&DS", "AIDS", "AD"];
  } else if (deptUpper === "IT") {
    codePrefix = "IT";
    fullnames = ["Information Technology", "IT"];
  } else if (deptUpper === "MBA") {
    codePrefix = "MBA";
    fullnames = ["Master of Business Administration", "MBA"];
  } else {
    codePrefix = deptUpper.slice(0, 2);
    fullnames = [department];
  }

  const orConditions: any[] = [];

  // Match department column with known names/aliases
  for (const name of fullnames) {
    orConditions.push({ department: { equals: name, mode: "insensitive" } });
    orConditions.push({ department: { contains: name, mode: "insensitive" } });
  }

  // Match rollNumber with branch code (e.g. FAC-CS-1, HOD-CSE, FAC-CSE)
  if (codePrefix) {
    orConditions.push({ rollNumber: { contains: `-${codePrefix}-`, mode: "insensitive" } });
    orConditions.push({ rollNumber: { contains: `-${codePrefix}`, mode: "insensitive" } });
    orConditions.push({ rollNumber: { contains: `${codePrefix}-`, mode: "insensitive" } });
    orConditions.push({ rollNumber: { contains: deptUpper, mode: "insensitive" } });
  }

  // For CSE, also include faculty with null department as CSE is the primary default branch
  if (deptUpper === "CSE" || deptUpper === "CS") {
    orConditions.push({ department: null });
  }

  return { OR: orConditions };
}

// Department condition builder for SubjectAllocation table queries
function buildSubjectAllocationDepartmentCondition(department?: string): any {
  if (!department || department === "all" || department === "All" || department === "All Departments") {
    return {};
  }

  const deptUpper = department.toUpperCase().trim();
  let codePrefix = "";
  let aliases = [department];

  if (deptUpper === "CSE" || deptUpper === "CS") {
    codePrefix = "CS";
    aliases = ["CSE", "CS", "Computer Science & Engineering", "Computer Science"];
  } else if (deptUpper === "ECE" || deptUpper === "EC") {
    codePrefix = "EC";
    aliases = ["ECE", "EC", "Electronics & Communication Engineering"];
  } else if (deptUpper === "EEE" || deptUpper === "EE") {
    codePrefix = "EE";
    aliases = ["EEE", "EE", "Electrical & Electronics Engineering"];
  } else if (deptUpper === "ME" || deptUpper === "MECHANICAL") {
    codePrefix = "ME";
    aliases = ["ME", "MECHANICAL", "Mechanical Engineering"];
  } else if (deptUpper === "CIVIL" || deptUpper === "CE") {
    codePrefix = "CE";
    aliases = ["Civil", "CIVIL", "CE", "Civil Engineering"];
  }

  const orConditions: any[] = [];
  for (const a of aliases) {
    orConditions.push({ department: { equals: a, mode: "insensitive" } });
    orConditions.push({ department: { contains: a, mode: "insensitive" } });
  }

  if (codePrefix) {
    orConditions.push({
      course: {
        code: { startsWith: codePrefix, mode: "insensitive" }
      }
    });
  }

  return { OR: orConditions };
}

// Response Mapper: transforms DB records into the structure expected by frontend
function mapAllocationResponse(alloc: any) {
  const isLab = alloc.course?.category === "Lab";
  const semStr = alloc.semester ? String(alloc.semester).trim() : "Semester 1";
  const semester = semStr.toLowerCase().startsWith("semester") ? semStr : `Semester ${semStr}`;
  const dept = alloc.department || alloc.faculty?.department || "CSE";

  return {
    id: alloc.id,
    facultyId: alloc.facultyId,
    facultyName: alloc.faculty?.name || "Unassigned Faculty",
    empId: alloc.faculty?.rollNumber || "N/A",
    subjectId: alloc.courseId,
    courseId: alloc.courseId,
    subjectName: alloc.course?.name || "Unknown Subject",
    subjectCode: alloc.course?.code || "N/A",
    department: dept,
    semester,
    section: alloc.section || "A",
    academicYear: alloc.academicYear || "2025-26",
    credits: alloc.course?.credits ?? (isLab ? 2 : 3),
    weeklyHours: alloc.weeklyHours ?? (isLab ? 4 : 3),
    type: isLab ? ("Lab" as const) : ("Theory" as const),
    status: (alloc.status as "Active" | "Pending" | "Draft") || "Active",
    createdAt: alloc.createdAt ? new Date(alloc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: alloc.updatedAt ? new Date(alloc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/dean/subject-allocations
// Fetch all subject allocations with joined faculty and course data
// ─────────────────────────────────────────────────────────────────────────────
router.get("/subject-allocations", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const department = req.query.department as string;
    const semester = req.query.semester as string;
    const section = req.query.section as string;
    const status = req.query.status as string;
    const type = req.query.type as string;
    const search = (req.query.search as string || "").toLowerCase();

    const andConditions: any[] = [];

    const deptCondition = buildSubjectAllocationDepartmentCondition(department);
    if (deptCondition.OR) {
      andConditions.push(deptCondition);
    }

    if (semester && semester !== "all" && semester !== "All") {
      const cleanSem = semester.replace(/^Semester\s*/i, "").trim();
      andConditions.push({
        semester: {
          contains: cleanSem || semester,
          mode: "insensitive",
        }
      });
    }

    if (section && section !== "all" && section !== "All") {
      const cleanSec = section.replace(/^Sec\s*/i, "").trim();
      andConditions.push({ section: { equals: cleanSec, mode: "insensitive" } });
    }

    if (status && status !== "all" && status !== "All") {
      andConditions.push({ status: { equals: status, mode: "insensitive" } });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const allocations = await prisma.subjectAllocation.findMany({
      where,
      include: {
        faculty: true,
        course: true,
      },
      orderBy: { createdAt: "desc" },
    });

    let mapped = allocations.map(mapAllocationResponse);

    if (type && type !== "all" && type !== "All") {
      mapped = mapped.filter((a) => a.type.toLowerCase() === type.toLowerCase());
    }

    if (search) {
      mapped = mapped.filter(
        (a) =>
          (a.facultyName && a.facultyName.toLowerCase().includes(search)) ||
          (a.subjectName && a.subjectName.toLowerCase().includes(search)) ||
          (a.subjectCode && a.subjectCode.toLowerCase().includes(search)) ||
          (a.department && a.department.toLowerCase().includes(search)) ||
          (a.section && a.section.toLowerCase().includes(search)) ||
          (a.semester && a.semester.toLowerCase().includes(search))
      );
    }

    res.json(mapped);
  } catch (error: any) {
    console.error("[Dean API] GET /subject-allocations error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /api/dean/subject-allocations
// Create a new faculty-to-course allocation with validation
// ─────────────────────────────────────────────────────────────────────────────
router.post("/subject-allocations", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      courseId,
      subjectId,
      facultyId,
      department,
      semester,
      section,
      academicYear,
      weeklyHours,
      status,
    } = req.body;

    const targetCourseId = courseId || subjectId;

    if (!targetCourseId) {
      return res.status(400).json({ error: "Missing required field: courseId / subjectId." });
    }
    if (!facultyId) {
      return res.status(400).json({ error: "Missing required field: facultyId." });
    }
    if (!semester) {
      return res.status(400).json({ error: "Missing required field: semester." });
    }
    if (!section) {
      return res.status(400).json({ error: "Missing required field: section." });
    }

    // 1. Verify Faculty exists
    let faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
    if (!faculty) {
      faculty = await prisma.faculty.findUnique({ where: { rollNumber: facultyId } });
    }
    if (!faculty) {
      return res.status(404).json({ error: `Faculty with ID '${facultyId}' not found.` });
    }

    // 2. Verify Course exists
    let course = await prisma.course.findUnique({ where: { id: targetCourseId } });
    if (!course) {
      course = await prisma.course.findUnique({ where: { code: targetCourseId } });
    }
    if (!course) {
      return res.status(404).json({ error: `Course / Subject with ID '${targetCourseId}' not found.` });
    }

    const normSemester = String(semester).startsWith("Semester") ? String(semester) : `Semester ${semester}`;
    const normSection = String(section).replace(/^Sec\s*/i, "").trim();
    const normAcademicYear = academicYear || "2025-26";
    const targetDepartment = department || faculty.department || "CSE";

    // 3. Validate weeklyHours
    const defaultHours = course.category === "Lab" ? 4 : 3;
    const parsedHours = weeklyHours !== undefined && weeklyHours !== null ? parseInt(weeklyHours, 10) : defaultHours;
    if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 40) {
      return res.status(400).json({ error: "weeklyHours must be a valid integer between 1 and 40." });
    }

    // 4. Validate status
    const validStatuses = ["Active", "Pending", "Draft", "Approved", "Completed"];
    const targetStatus = status && validStatuses.includes(status) ? status : "Active";

    // 5. Check duplicate allocation constraint (courseId + semester + section + academicYear)
    const existingCourseAlloc = await prisma.subjectAllocation.findUnique({
      where: {
        courseId_semester_section_academicYear: {
          courseId: course.id,
          semester: normSemester,
          section: normSection,
          academicYear: normAcademicYear,
        },
      },
      include: { faculty: true, course: true },
    });

    if (existingCourseAlloc) {
      return res.status(409).json({
        error: `Course '${course.code} - ${course.name}' is already assigned to ${existingCourseAlloc.faculty.name} for ${normSemester} / Section ${normSection} (${normAcademicYear}).`,
      });
    }

    // 6. Check if faculty already has the exact same allocation in the same semester & section
    const existingFacultyAlloc = await prisma.subjectAllocation.findFirst({
      where: {
        facultyId: faculty.id,
        courseId: course.id,
        semester: normSemester,
        section: normSection,
        academicYear: normAcademicYear,
      },
      include: { faculty: true, course: true },
    });

    if (existingFacultyAlloc) {
      return res.status(409).json({
        error: `Faculty '${faculty.name}' is already assigned to ${course.code} for ${normSemester} / Section ${normSection}.`,
      });
    }

    // 7. Create SubjectAllocation row in database
    const created = await prisma.subjectAllocation.create({
      data: {
        facultyId: faculty.id,
        courseId: course.id,
        department: targetDepartment,
        semester: normSemester,
        section: normSection,
        academicYear: normAcademicYear,
        weeklyHours: parsedHours,
        status: targetStatus,
      },
      include: {
        faculty: true,
        course: true,
      },
    });

    return res.status(201).json(mapAllocationResponse(created));
  } catch (error: any) {
    console.error("[Dean API] POST /subject-allocations error:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "An allocation already exists for this course, semester, section, and academic year." });
    }
    return res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. PUT /api/dean/subject-allocations/:id
// Update an existing allocation status or details
// ─────────────────────────────────────────────────────────────────────────────
router.put("/subject-allocations/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      facultyId,
      courseId,
      subjectId,
      department,
      semester,
      section,
      academicYear,
      weeklyHours,
      status,
    } = req.body;

    const existing = await prisma.subjectAllocation.findUnique({
      where: { id },
      include: { faculty: true, course: true },
    });

    if (!existing) {
      return res.status(404).json({ error: `Subject allocation with ID '${id}' not found.` });
    }

    const updateData: any = {};

    if (status !== undefined) {
      const validStatuses = ["Active", "Pending", "Draft", "Approved", "Completed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status '${status}'. Must be one of: ${validStatuses.join(", ")}` });
      }
      updateData.status = status;
    }

    if (weeklyHours !== undefined && weeklyHours !== null) {
      const parsedHours = parseInt(weeklyHours, 10);
      if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 40) {
        return res.status(400).json({ error: "weeklyHours must be an integer between 1 and 40." });
      }
      updateData.weeklyHours = parsedHours;
    }

    if (facultyId) {
      let faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
      if (!faculty) faculty = await prisma.faculty.findUnique({ where: { rollNumber: facultyId } });
      if (!faculty) return res.status(404).json({ error: `Faculty '${facultyId}' not found.` });
      updateData.facultyId = faculty.id;
    }

    const targetCourseId = courseId || subjectId;
    if (targetCourseId) {
      let course = await prisma.course.findUnique({ where: { id: targetCourseId } });
      if (!course) course = await prisma.course.findUnique({ where: { code: targetCourseId } });
      if (!course) return res.status(404).json({ error: `Course '${targetCourseId}' not found.` });
      updateData.courseId = course.id;
    }

    if (department) updateData.department = department;
    if (semester) updateData.semester = String(semester).startsWith("Semester") ? String(semester) : `Semester ${semester}`;
    if (section) updateData.section = String(section).replace(/^Sec\s*/i, "").trim();
    if (academicYear) updateData.academicYear = academicYear;

    // Check unique conflict if composite key components changed
    const checkCourseId = updateData.courseId || existing.courseId;
    const checkSemester = updateData.semester || existing.semester;
    const checkSection = updateData.section || existing.section;
    const checkAcademicYear = updateData.academicYear || existing.academicYear;

    if (
      checkCourseId !== existing.courseId ||
      checkSemester !== existing.semester ||
      checkSection !== existing.section ||
      checkAcademicYear !== existing.academicYear
    ) {
      const conflict = await prisma.subjectAllocation.findUnique({
        where: {
          courseId_semester_section_academicYear: {
            courseId: checkCourseId,
            semester: checkSemester,
            section: checkSection,
            academicYear: checkAcademicYear,
          },
        },
      });

      if (conflict && conflict.id !== id) {
        return res.status(409).json({
          error: "An allocation with this course, semester, section, and academic year already exists.",
        });
      }
    }

    const updated = await prisma.subjectAllocation.update({
      where: { id },
      data: updateData,
      include: {
        faculty: true,
        course: true,
      },
    });

    return res.json(mapAllocationResponse(updated));
  } catch (error: any) {
    console.error("[Dean API] PUT /subject-allocations error:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Conflict: unique constraint violation on courseId + semester + section + academicYear." });
    }
    return res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. DELETE /api/dean/subject-allocations/:id
// Remove an existing subject allocation
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/subject-allocations/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.subjectAllocation.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: `Subject allocation with ID '${id}' not found.` });
    }

    await prisma.subjectAllocation.delete({ where: { id } });

    return res.json({ success: true, message: "Subject allocation deleted successfully.", id });
  } catch (error: any) {
    console.error("[Dean API] DELETE /subject-allocations error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET /api/dean/faculty
// Query faculty members for subject allocation assignment
// ─────────────────────────────────────────────────────────────────────────────
router.get("/faculty", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const department = req.query.department as string;
    const where = buildFacultyDepartmentCondition(department);

    const faculties = await prisma.faculty.findMany({
      where,
      orderBy: { name: "asc" },
    });

    const mapped = faculties.map((f) => {
      const isHod = f.role === "hod" || f.rollNumber.startsWith("HOD-") || (f.name && f.name.includes("(HOD)"));
      const dept = f.department || (department && department !== "all" ? department : "CSE");
      return {
        id: f.id,
        empId: f.rollNumber,
        fullName: f.name,
        designation: isHod ? "Professor & HOD" : "Associate Professor",
        department: dept,
        specialization: `${dept} Domain Expert`,
        weeklyCapacity: isHod ? 14 : 20,
      };
    });

    res.json(mapped);
  } catch (error: any) {
    console.error("[Dean API] GET /faculty error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. GET /api/dean/subjects
// Query active course catalog mapped for subject allocation
// ─────────────────────────────────────────────────────────────────────────────
router.get("/subjects", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const department = req.query.department as string;
    const semesterStr = req.query.semester as string;
    const search = (req.query.search as string || "").toLowerCase();

    const where: any = {};

    if (department && department !== "all" && department !== "All" && department !== "All Departments") {
      let codePrefix = "";
      const deptUpper = department.toUpperCase().trim();
      if (deptUpper === "CSE" || deptUpper === "CS") codePrefix = "CS";
      else if (deptUpper === "AI&ML" || deptUpper === "AIML") codePrefix = "AM";
      else if (deptUpper === "AI&DS" || deptUpper === "AIDS") codePrefix = "AD";
      else if (deptUpper === "IT") codePrefix = "IT";
      else if (deptUpper === "EEE" || deptUpper === "EE") codePrefix = "EE";
      else if (deptUpper === "ECE" || deptUpper === "EC") codePrefix = "EC";
      else if (deptUpper === "CIVIL" || deptUpper === "CE" || deptUpper === "CIVIL ENGINEERING") codePrefix = "CE";
      else if (deptUpper === "MECHANICAL" || deptUpper === "ME" || deptUpper === "MECHANICAL ENGINEERING") codePrefix = "ME";

      if (codePrefix) {
        where.code = { startsWith: codePrefix, mode: "insensitive" };
      }
    }

    if (semesterStr && semesterStr !== "all" && semesterStr !== "All" && semesterStr !== "All Semesters") {
      const match = semesterStr.match(/\d+/);
      if (match) {
        where.semester = parseInt(match[0], 10);
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: { code: "asc" },
    });

    const mapped = courses.map((c) => {
      let deptName = "CSE";
      const upper = c.code.toUpperCase();
      if (upper.startsWith("CS")) deptName = "CSE";
      else if (upper.startsWith("AM")) deptName = "AI&ML";
      else if (upper.startsWith("AD")) deptName = "AI&DS";
      else if (upper.startsWith("IT")) deptName = "IT";
      else if (upper.startsWith("EE")) deptName = "EEE";
      else if (upper.startsWith("EC")) deptName = "ECE";
      else if (upper.startsWith("CE")) deptName = "Civil";
      else if (upper.startsWith("ME")) deptName = "ME";

      const isLab = c.category === "Lab";

      return {
        id: c.id,
        code: c.code,
        name: c.name,
        department: deptName,
        semester: `Semester ${c.semester}`,
        credits: c.credits,
        weeklyHours: isLab ? 4 : 3,
        type: isLab ? ("Lab" as const) : ("Theory" as const),
      };
    });

    res.json(mapped);
  } catch (error: any) {
    console.error("[Dean API] GET /subjects error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. GET /api/dean/faculty-workload
// Dynamic workload calculation per faculty member
// ─────────────────────────────────────────────────────────────────────────────
router.get("/faculty-workload", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const department = req.query.department as string;
    const where = buildFacultyDepartmentCondition(department);

    const facultyList = await prisma.faculty.findMany({
      where,
      include: {
        subjectAllocations: {
          include: {
            course: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const workloads = facultyList.map((f) => {
      const isHod = f.role === "hod" || f.rollNumber.startsWith("HOD-") || (f.name && f.name.includes("(HOD)"));
      const weeklyCapacity = isHod ? 14 : 20;
      const dept = f.department || (department && department !== "all" ? department : "CSE");

      const allocs = f.subjectAllocations || [];
      const weeklyTeachingHours = allocs.reduce((sum, a) => sum + (a.weeklyHours || (a.course?.category === "Lab" ? 4 : 3)), 0);
      const theorySubjects = allocs.filter((a) => a.course?.category !== "Lab").length;
      const labSubjects = allocs.filter((a) => a.course?.category === "Lab").length;
      const assignedSemesters = Array.from(new Set(allocs.map((a) => a.semester).filter(Boolean)));
      const assignedSections = Array.from(new Set(allocs.map((a) => a.section).filter(Boolean)));
      const remainingCapacity = Math.max(0, weeklyCapacity - weeklyTeachingHours);

      const utilization = weeklyCapacity > 0 ? weeklyTeachingHours / weeklyCapacity : 0;
      let status: "Underloaded" | "Normal" | "Near Capacity" | "Overloaded" = "Underloaded";
      if (utilization >= 1.0) status = "Overloaded";
      else if (utilization >= 0.75) status = "Near Capacity";
      else if (utilization >= 0.4) status = "Normal";

      return {
        facultyId: f.id,
        facultyName: f.name,
        empId: f.rollNumber,
        designation: isHod ? "Professor & HOD" : "Associate Professor",
        department: dept,
        totalSubjects: allocs.length,
        theorySubjects,
        labSubjects,
        weeklyTeachingHours,
        weeklyCapacity,
        remainingCapacity,
        assignedSemesters,
        assignedSections,
        status,
      };
    });

    res.json(workloads);
  } catch (error: any) {
    console.error("[Dean API] GET /faculty-workload error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
