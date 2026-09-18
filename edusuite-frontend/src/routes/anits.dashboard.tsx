import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Calendar,
  ClipboardCheck,
  Users,
  GraduationCap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  BookOpen,
  MapPin,
  Building2,
  Layers,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import api from "@/lib/api";

export const Route = createFileRoute("/anits/dashboard")({
  head: () => ({
    meta: [{ title: "ANITS Dashboard — Attendance & Timetable Management" }],
  }),
  component: AnitsDashboardPage,
});

function AnitsDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboard = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const res = await api.get("/api/anits/dashboard");
      if (res.data) {
        setData(res.data);
        if (showToast) toast.success("ANITS Dashboard refreshed with live PostgreSQL data.");
      }
    } catch (err: any) {
      toast.error("Failed to load dashboard metrics from PostgreSQL.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted/60 rounded-xl animate-pulse" />
          <div className="h-9 w-24 bg-muted/60 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted/50 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-muted/40 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const role = data?.anitsRole || "STUDENT";
  const m = data?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider py-0.5">
              {role.replace("_", " ")}
            </Badge>
            <span className="text-xs text-muted-foreground">&middot;</span>
            <span className="text-xs font-semibold text-muted-foreground">{data?.day}, {data?.date}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-foreground mt-1">
            {role === "ANITS_ADMIN" && "Institution Attendance & Timetable Overview"}
            {role === "HOD" && `${data?.department} Department Timetable & Attendance`}
            {role === "FACULTY" && `Welcome, ${data?.faculty?.name || "Professor"}`}
            {role === "STUDENT" && `Welcome, ${data?.student?.name || "Student"}`}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time synchronization with ANITS MasterTimetable and PostgreSQL AttendanceRecord ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboard(true)}
            disabled={isRefreshing}
            className="h-9 rounded-xl text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {role === "FACULTY" && (
            <Button asChild size="sm" className="h-9 rounded-xl text-xs font-bold gap-1.5 shadow-sm">
              <Link to="/anits/attendance">
                <ClipboardCheck className="size-4" /> Take Attendance
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ANITS ADMIN DASHBOARD METRICS */}
      {/* ========================================================================= */}
      {role === "ANITS_ADMIN" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Today's Classes</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                    <Calendar className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.todayClassesTotal ?? 0}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Scheduled across all departments</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Attendance Submitted</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.attendanceSubmittedCount ?? 0}</div>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">Submitted in PostgreSQL</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Attendance Pending</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <Clock className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.attendancePendingCount ?? 0}</div>
                <p className="text-[11px] text-amber-600 font-semibold mt-1">Awaiting faculty marking</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Active Faculty &amp; Students</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                    <Users className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">
                  {m.totalFaculty ?? 0} / {m.totalStudents ?? 0}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Registered ANITS members</p>
              </CardContent>
            </Card>
          </div>

          {/* Today's Schedule Sample Table */}
          <Card className="rounded-2xl border-border/60 shadow-xs overflow-hidden">
            <CardHeader className="bg-muted/15 border-b border-border/40 py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Today's Institution Timetable Sessions</CardTitle>
                <CardDescription className="text-xs">MasterTimetable allocations for {data?.day}</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl text-xs">
                <Link to="/anits/timetable">View Master Timetable &rarr;</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/30 text-muted-foreground font-semibold border-b border-border/40">
                    <tr>
                      <th className="px-6 py-3">Dept &amp; Sec</th>
                      <th className="px-6 py-3">Period &amp; Time</th>
                      <th className="px-6 py-3">Subject</th>
                      <th className="px-6 py-3">Faculty</th>
                      <th className="px-6 py-3">Room</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {data?.todaySchedule?.map((s: any) => (
                      <tr key={s.id} className="hover:bg-muted/20">
                        <td className="px-6 py-3.5 font-bold text-foreground">
                          {s.branch} - Sem {s.semester} ({s.section})
                        </td>
                        <td className="px-6 py-3.5 text-muted-foreground">
                          P{s.periodNumber} &middot; {s.time}
                        </td>
                        <td className="px-6 py-3.5 font-semibold text-foreground">{s.subject}</td>
                        <td className="px-6 py-3.5 text-muted-foreground">{s.faculty}</td>
                        <td className="px-6 py-3.5 text-muted-foreground">{s.roomNo}</td>
                        <td className="px-6 py-3.5">
                          {s.isConducted ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                              Submitted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                              Pending
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. HOD DASHBOARD METRICS */}
      {/* ========================================================================= */}
      {role === "HOD" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Department Classes Today</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                    <Calendar className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.todayClassesCount ?? 0}</div>
                <p className="text-[11px] text-muted-foreground mt-1">{data?.department} slots scheduled</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Department Attendance</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <TrendingUp className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.departmentAttendancePercentage ?? 0}%</div>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">Average semester rate</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Attendance Pending</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <Clock className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.attendancePendingCount ?? 0}</div>
                <p className="text-[11px] text-amber-600 font-semibold mt-1">Today's unsubmitted slots</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Shortage Students (&lt;75%)</span>
                  <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                    <AlertTriangle className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-destructive mt-2">{m.studentsBelow75Percent ?? 0}</div>
                <p className="text-[11px] text-destructive font-semibold mt-1">Require condonation review</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3">
            <Button asChild className="rounded-xl text-xs font-bold gap-1.5 shadow-sm">
              <Link to="/anits/timetable">
                <Calendar className="size-4" /> View Department Timetable
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl text-xs font-bold gap-1.5">
              <Link to="/anits/attendance">
                <ClipboardCheck className="size-4" /> Department Attendance Controls
              </Link>
            </Button>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. FACULTY DASHBOARD METRICS */}
      {/* ========================================================================= */}
      {role === "FACULTY" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Today's Assigned Classes</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                    <Calendar className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.todayClassesCount ?? 0}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Assigned on {data?.day}</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Attendance Pending</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <Clock className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.attendancePendingCount ?? 0}</div>
                <p className="text-[11px] text-amber-600 font-semibold mt-1">Requires roster submission</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Classes Completed</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.classesCompletedToday ?? 0}</div>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">Marked in PostgreSQL</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Weekly Teaching Load</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                    <BookOpen className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.totalAssignedWeekly ?? 0}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Total periods per week</p>
              </CardContent>
            </Card>
          </div>

          {/* Faculty Today Classes Action Card */}
          <Card className="rounded-2xl border-border/60 shadow-xs overflow-hidden">
            <CardHeader className="bg-muted/15 border-b border-border/40 py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Today's Teaching Schedule &amp; Attendance</CardTitle>
                <CardDescription className="text-xs">Directly linked to ANITS MasterTimetable</CardDescription>
              </div>
              <Button asChild size="sm" className="rounded-xl text-xs font-bold gap-1.5 shadow-sm">
                <Link to="/anits/attendance">
                  <ClipboardCheck className="size-4" /> Take Attendance
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data?.todayClasses?.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No classes scheduled for you today ({data?.day}).
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {data?.todayClasses?.map((c: any) => (
                    <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-foreground">{c.subjectCode} - {c.subjectName}</span>
                          {c.isLab && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">Lab</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Period {c.periodNumber} &middot; {c.time} &middot; {c.branch} Sem {c.semester} ({c.section}) &middot; Room {c.roomNo}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={
                            c.attendanceStatus === "Attendance Submitted"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs py-1"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs py-1"
                          }
                        >
                          {c.attendanceStatus}
                        </Badge>
                        <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold">
                          <Link to="/anits/attendance" search={{ timetableId: c.id } as any}>
                            Mark Attendance &rarr;
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. STUDENT DASHBOARD METRICS */}
      {/* ========================================================================= */}
      {role === "STUDENT" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Overall Attendance</span>
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <TrendingUp className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.overallPercentage ?? 0}%</div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Required ANITS threshold: <span className="font-bold text-foreground">75%</span>
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Total Classes Conducted</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                    <BookOpen className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">{m.totalConducted ?? 0}</div>
                <p className="text-[11px] text-muted-foreground mt-1">PostgreSQL AttendanceRecord ledger</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Present / Late / Absent</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <ClipboardCheck className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground mt-2">
                  {m.presentCount ?? 0} <span className="text-sm font-normal text-muted-foreground">/</span> {m.lateCount ?? 0} <span className="text-sm font-normal text-muted-foreground">/</span> {m.absentCount ?? 0}
                </div>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">Attended: {(m.presentCount ?? 0) + (m.lateCount ?? 0)} sessions</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Shortage Alerts</span>
                  <div className={`p-2 rounded-xl ${(m.lowAttendanceCount ?? 0) > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                    <AlertTriangle className="size-4" />
                  </div>
                </div>
                <div className={`text-2xl font-black mt-2 ${(m.lowAttendanceCount ?? 0) > 0 ? "text-destructive" : "text-foreground"}`}>
                  {m.lowAttendanceCount ?? 0}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {(m.lowAttendanceCount ?? 0) > 0 ? "Subjects below 75% threshold" : "All subjects eligible"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-xl text-xs font-bold gap-1.5 shadow-sm">
              <Link to="/anits/attendance">
                <ClipboardCheck className="size-4" /> Open Full Attendance Ledger
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl text-xs font-bold gap-1.5">
              <Link to="/anits/timetable">
                <Calendar className="size-4" /> My Class Timetable
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
