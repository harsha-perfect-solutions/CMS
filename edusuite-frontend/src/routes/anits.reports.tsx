import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useRole } from "@/context/role-context";
import { FileBarChart, Download, FileSpreadsheet, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/anits/reports")({
  head: () => ({
    meta: [{ title: "Attendance & Timetable Reports — ANITS" }],
  }),
  component: AnitsReportsPage,
});

function AnitsReportsPage() {
  const { role, department } = useRole();
  const [downloading, setDownloading] = useState<string | null>(null);

  const normRole = (role || "").toLowerCase();
  const isFaculty = normRole === "faculty" || normRole === "staff";
  const isStudent = normRole === "student";
  const isHod = normRole === "hod";
  const isAdmin = ["super_admin", "superadmin", "admin", "principal", "academic_dean"].includes(normRole);

  const handleDownload = async (type: string, url: string, filename: string) => {
    setDownloading(type);
    const toastId = toast.loading(`Generating ${filename}...`);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("cms_token");
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.dismiss(toastId);
      toast.success(`${filename} successfully downloaded.`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to generate report export.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card p-5 rounded-xl border border-border/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Attendance &amp; Timetable Reports</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Role-governed reports generated directly from ANITS PostgreSQL databases.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* STUDENT REPORT */}
        {isStudent && (
          <Card className="rounded-xl border-border/60 shadow-xs">
            <CardHeader className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <FileSpreadsheet className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Personal Attendance Ledger</CardTitle>
                  <CardDescription className="text-xs">Complete session history for enrolled semester</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0 space-y-3">
              <p className="text-xs text-muted-foreground">
                Exports your individual session dates, subject codes, faculty names, periods, room numbers, and verified status.
              </p>
              <Button
                onClick={() =>
                  handleDownload(
                    "student_att",
                    "http://localhost:5000/api/attendance/export",
                    "ANITS_My_Attendance_Ledger.csv"
                  )
                }
                disabled={downloading === "student_att"}
                className="w-full rounded-lg text-xs font-semibold gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="size-4" /> Download CSV Ledger
              </Button>
            </CardContent>
          </Card>
        )}

        {/* FACULTY REPORT */}
        {(isFaculty || isHod) && (
          <Card className="rounded-xl border-border/60 shadow-xs">
            <CardHeader className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                  <FileSpreadsheet className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Teaching Session Register</CardTitle>
                  <CardDescription className="text-xs">Historical sessions conducted by you</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0 space-y-3">
              <p className="text-xs text-muted-foreground">
                Exports all timetable sessions marked by your faculty account with section details and student attendance totals.
              </p>
              <Button
                onClick={() =>
                  handleDownload(
                    "faculty_att",
                    "http://localhost:5000/api/attendance/faculty/export",
                    "ANITS_Faculty_Attendance_Register.csv"
                  )
                }
                disabled={downloading === "faculty_att"}
                className="w-full rounded-lg text-xs font-semibold gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="size-4" /> Download Teaching Register
              </Button>
            </CardContent>
          </Card>
        )}

        {/* HOD & ADMIN REPORT */}
        {(isHod || isAdmin) && (
          <Card className="rounded-xl border-border/60 shadow-xs">
            <CardHeader className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                  <FileSpreadsheet className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">
                    {isHod ? `${department || "Dept"} Attendance Summary` : "Institutional Attendance Summary"}
                  </CardTitle>
                  <CardDescription className="text-xs">Department-level statistics &amp; condonation metrics</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0 space-y-3">
              <p className="text-xs text-muted-foreground">
                Authoritative compliance report for AICTE/NBA audits and internal examination eligibility records.
              </p>
              <Button
                onClick={() =>
                  handleDownload(
                    "dept_att",
                    "http://localhost:5000/api/attendance/faculty/export",
                    `ANITS_${department || "Institutional"}_Summary_Report.csv`
                  )
                }
                disabled={downloading === "dept_att"}
                variant="outline"
                className="w-full rounded-lg text-xs font-semibold gap-2 border-border/70"
              >
                <Download className="size-4" /> Export Department Summary
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
