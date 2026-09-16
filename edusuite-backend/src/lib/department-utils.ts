/**
 * Canonical Department and Branch Normalization Utility for ANITS
 * Ensures consistent resolution between MasterTimetable (branch: ME, CSE, etc.)
 * and Student/Faculty models (department: MECHANICAL, CSE, etc.).
 */

export function getMatchingDepartments(branchOrDept?: string): string[] {
  if (!branchOrDept) return [];
  const raw = branchOrDept.trim();
  const upper = raw.toUpperCase();

  if (upper === "ME" || upper === "MECHANICAL" || upper.includes("MECHANICAL")) {
    return ["ME", "MECHANICAL", "Mechanical Engineering", "Mechanical"];
  }
  if (upper === "CSE" || upper === "CS" || upper.includes("COMPUTER")) {
    return ["CSE", "CS", "Computer Science & Engineering", "Computer Science"];
  }
  if (upper === "ECE" || upper === "EC" || upper.includes("ELECTRONICS")) {
    return ["ECE", "EC", "Electronics & Communication Engineering", "Electronics"];
  }
  if (upper === "EEE" || upper === "EE" || upper.includes("ELECTRICAL")) {
    return ["EEE", "EE", "Electrical & Electronics Engineering", "Electrical"];
  }
  if (upper === "CIVIL" || upper === "CE" || upper.includes("CIVIL")) {
    return ["CIVIL", "CE", "Civil Engineering", "Civil"];
  }
  if (upper === "IT" || upper.includes("INFORMATION")) {
    return ["IT", "Information Technology"];
  }
  if (upper.includes("AI&DS") || upper.includes("AIDS") || upper.includes("DATA SCIENCE")) {
    return ["AI&DS", "AIDS", "Artificial Intelligence & Data Science"];
  }
  if (upper.includes("AI&ML") || upper.includes("AIML") || upper.includes("MACHINE LEARNING")) {
    return ["AI&ML", "AIML", "Artificial Intelligence & Machine Learning"];
  }

  return [raw, upper];
}

export function normalizeBranchCode(deptOrBranch?: string): string {
  if (!deptOrBranch) return "CSE";
  const upper = deptOrBranch.trim().toUpperCase();

  if (upper === "ME" || upper === "MECHANICAL" || upper.includes("MECHANICAL")) {
    return "ME";
  }
  if (upper === "CSE" || upper === "CS" || upper.includes("COMPUTER")) {
    return "CSE";
  }
  if (upper === "ECE" || upper === "EC" || upper.includes("ELECTRONICS")) {
    return "ECE";
  }
  if (upper === "EEE" || upper === "EE" || upper.includes("ELECTRICAL")) {
    return "EEE";
  }
  if (upper === "CIVIL" || upper === "CE" || upper.includes("CIVIL")) {
    return "CIVIL";
  }
  if (upper === "IT" || upper.includes("INFORMATION")) {
    return "IT";
  }
  if (upper.includes("AI&DS") || upper.includes("AIDS") || upper.includes("DATA SCIENCE")) {
    return "AI&DS";
  }
  if (upper.includes("AI&ML") || upper.includes("AIML") || upper.includes("MACHINE LEARNING")) {
    return "AI&ML";
  }

  return upper;
}

export function formatSectionDisplay(rawSection?: string): { clean: string; full: string } {
  if (!rawSection) return { clean: "A", full: "Section A" };
  const trimmed = rawSection.trim();
  const clean = trimmed.replace(/^section\s*/i, "").trim() || "A";
  const full = clean.length === 1 ? `Section ${clean.toUpperCase()}` : trimmed;
  return { clean: clean.toUpperCase(), full };
}
