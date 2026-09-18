import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from "recharts";
import { Panel } from "@/components/dashboard/panel";
import { BarChart3, AlertTriangle, UserX, CheckCircle, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AttendanceAnalyticsProps {
  distributionData?: { name: string; value: number; count?: number }[];
  trendData?: { day: string; attendance: number; date?: string }[];
  subjectWise?: { code: string; name: string; total: number; attended: number; percentage: number }[];
  lowAttendanceStudents?: {
    studentId: string;
    name: string;
    rollNumber: string;
    section: string;
    subject: string;
    attendancePct: number;
    threshold: number;
    status: string;
  }[];
  repeatedAbsences?: {
    studentId: string;
    name: string;
    rollNumber: string;
    section: string;
    subject: string;
    consecutiveAbsences: number;
    attendancePct: number;
  }[];
  hasData?: boolean;
  totalRecords?: number;
  isLoading?: boolean;
}

export function AttendanceAnalytics({
  distributionData = [],
  trendData = [],
  subjectWise = [],
  lowAttendanceStudents = [],
  repeatedAbsences = [],
  hasData = true,
  totalRecords = 0,
  isLoading = false,
}: AttendanceAnalyticsProps) {
  const COLORS = ["#10b981", "#f43f5e", "#f59e0b", "#3b82f6"];

  if (isLoading) {
    return (
      <Panel
        title="Attendance Analytics Dashboard"
        description="Pedagogy reports on submittal ratios and student status shares"
        className="border border-border bg-card rounded-2xl p-8 shadow-card text-xs text-center"
      >
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Loading attendance analytics from PostgreSQL...</p>
        </div>
      </Panel>
    );
  }

  if (!hasData || totalRecords === 0) {
    return (
      <Panel
        title="Attendance Analytics Dashboard"
        description="Pedagogy reports on submittal ratios and student status shares"
        className="border border-border bg-card rounded-2xl p-8 shadow-card text-xs text-center"
      >
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <BarChart3 className="h-10 w-10 text-muted-foreground opacity-40" />
          <h4 className="text-sm font-semibold text-foreground">Insufficient historical data</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            No attendance records have been submitted for your classes yet. Analytics will automatically compute once classes are marked.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Attendance Analytics Dashboard"
        description="Real-time pedagogical metrics calculated directly from PostgreSQL AttendanceRecords"
        className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
      >
        <div className="grid gap-6 md:grid-cols-2">
          {/* Trend Area Chart */}
          <div className="space-y-2">
            <h5 className="font-extrabold text-[0.7rem] text-muted-foreground uppercase tracking-wider">
              Weekly / Daily Attendance Trend (%)
            </h5>
            <div className="h-44 w-full">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorAttend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      style={{ fontSize: "10px", fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      style={{ fontSize: "10px", fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="attendance"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorAttend)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  Insufficient trend data
                </div>
              )}
            </div>
          </div>

          {/* Status Distribution Bar Chart */}
          <div className="space-y-2">
            <h5 className="font-extrabold text-[0.7rem] text-muted-foreground uppercase tracking-wider">
              Attendance Status Share (%)
            </h5>
            <div className="h-44 w-full">
              {distributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData}>
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      style={{ fontSize: "10px", fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      style={{ fontSize: "10px", fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  Insufficient distribution data
                </div>
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* Subject-Wise Breakdown */}
      {subjectWise.length > 0 && (
        <Panel
          title="Subject-Wise Attendance Breakdown"
          description="Consolidated attendance rates across all courses taught by you"
          className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjectWise.map((sub) => (
              <div key={sub.code} className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[0.65rem] font-bold text-primary">{sub.code}</span>
                    <h6 className="font-bold text-xs text-foreground truncate max-w-[180px]">{sub.name}</h6>
                  </div>
                  <span className="font-bold text-sm text-foreground">{sub.percentage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sub.percentage >= 75 ? "bg-emerald-500" : "bg-rose-500"}`}
                    style={{ width: `${Math.min(100, sub.percentage)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[0.62rem] text-muted-foreground font-medium">
                  <span>Attended: {sub.attended}</span>
                  <span>Total Classes: {sub.total}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Low Attendance Students (< 75%) */}
      <Panel
        title="Low Attendance Students Alert (< 75% Threshold)"
        description="Students identified as at-risk of attendance condonation in your classes"
        className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
      >
        {lowAttendanceStudents.length === 0 ? (
          <div className="p-6 text-center border border-dashed rounded-xl text-muted-foreground space-y-1">
            <CheckCircle className="size-5 text-emerald-500 mx-auto" />
            <p className="font-semibold text-foreground">No students below 75% threshold</p>
            <p className="text-[0.68rem]">All enrolled students are currently meeting the attendance compliance threshold.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-bold">Roll Number</TableHead>
                  <TableHead className="font-bold">Student Name</TableHead>
                  <TableHead className="font-bold">Subject</TableHead>
                  <TableHead className="font-bold text-center">Attendance %</TableHead>
                  <TableHead className="font-bold text-center">Threshold</TableHead>
                  <TableHead className="font-bold text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowAttendanceStudents.map((st) => (
                  <TableRow key={st.studentId} className="hover:bg-muted/20">
                    <TableCell className="font-mono font-bold text-foreground">{st.rollNumber}</TableCell>
                    <TableCell className="font-semibold text-foreground">{st.name}</TableCell>
                    <TableCell className="text-muted-foreground">{st.subject}</TableCell>
                    <TableCell className="text-center font-mono font-bold text-rose-600">{st.attendancePct}%</TableCell>
                    <TableCell className="text-center font-mono text-muted-foreground">75%</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[0.62rem] font-bold">
                        <AlertTriangle className="size-3 mr-1 inline" /> Shortage Alert
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      {/* Repeated Absences */}
      {repeatedAbsences.length > 0 && (
        <Panel
          title="Repeated Absences Tracker"
          description="Students with multiple recorded absences across your lecture sessions"
          className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {repeatedAbsences.map((st) => (
              <div key={st.studentId} className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[0.65rem] font-bold text-amber-700 dark:text-amber-400">{st.rollNumber}</span>
                  <Badge variant="outline" className="text-[0.6rem] bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold">
                    {st.consecutiveAbsences} Absences
                  </Badge>
                </div>
                <h6 className="font-bold text-xs text-foreground truncate">{st.name}</h6>
                <p className="text-[0.62rem] text-muted-foreground">Subject: {st.subject}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
