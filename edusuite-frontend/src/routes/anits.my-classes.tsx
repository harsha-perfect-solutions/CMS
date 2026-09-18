import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useRole } from "@/context/role-context";
import api from "@/lib/api";
import { toast } from "sonner";
import { BookOpen, Users, GraduationCap, Search, Download, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/anits/my-classes")({
  head: () => ({
    meta: [{ title: "My Classes & Sections — ANITS" }],
  }),
  component: AnitsMyClassesPage,
});

function AnitsMyClassesPage() {
  const { role, department } = useRole();
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/api/faculty/students").catch(() => ({ data: { students: [] } })),
      api.get("/api/courses").catch(() => ({ data: [] })),
    ])
      .then(([studRes, courseRes]) => {
        setStudents(studRes.data?.students || []);
        setCourses(Array.isArray(courseRes.data) ? courseRes.data : []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
      s.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">My Classes &amp; Student Cohorts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ANITS enrolled students linked to your active MasterTimetable sections and courses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border/60 p-4">
          <span className="text-xs font-bold text-muted-foreground">Assigned Courses</span>
          <div className="text-2xl font-black text-foreground mt-2">{courses.slice(0, 4).length}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Active curriculum subjects</p>
        </Card>
        <Card className="rounded-2xl border-border/60 p-4">
          <span className="text-xs font-bold text-muted-foreground">Total Enrolled Students</span>
          <div className="text-2xl font-black text-foreground mt-2">{students.length}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Across all class sections</p>
        </Card>
        <Card className="rounded-2xl border-border/60 p-4">
          <span className="text-xs font-bold text-muted-foreground">Primary Department</span>
          <div className="text-2xl font-black text-primary mt-2">{department || "CSE"}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">ANITS Engineering Division</p>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/60 overflow-hidden shadow-xs">
        <CardHeader className="bg-muted/15 border-b border-border/40 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold">Class Roster Ledger</CardTitle>
            <CardDescription className="text-xs">PostgreSQL Student directory for assigned sections</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, roll no..."
              className="h-8 pl-8 text-xs rounded-xl"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="size-6 animate-spin text-primary mx-auto" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No students found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 text-muted-foreground font-semibold border-b border-border/40">
                  <tr>
                    <th className="px-6 py-3">Roll Number</th>
                    <th className="px-6 py-3">Student Name</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Semester &amp; Section</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {filteredStudents.slice(0, 25).map((s: any) => (
                    <tr key={s.id || s.rollNumber} className="hover:bg-muted/20">
                      <td className="px-6 py-3.5 font-mono font-bold text-foreground">{s.rollNumber}</td>
                      <td className="px-6 py-3.5 font-semibold text-foreground">{s.name}</td>
                      <td className="px-6 py-3.5 text-muted-foreground">{s.department}</td>
                      <td className="px-6 py-3.5 text-muted-foreground">
                        Sem {s.semester} &middot; {s.section || "A"}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          {s.status || "Active"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
