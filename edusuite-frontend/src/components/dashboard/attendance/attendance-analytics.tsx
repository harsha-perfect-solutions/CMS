import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from "recharts";
import { Panel } from "@/components/dashboard/panel";
import { BarChart3 } from "lucide-react";

interface AttendanceAnalyticsProps {
  distributionData?: { name: string; value: number }[];
  trendData?: { day: string; attendance: number }[];
  hasData?: boolean;
  totalRecords?: number;
  isLoading?: boolean;
}

export function AttendanceAnalytics({
  distributionData,
  trendData,
  hasData = true,
  totalRecords = 0,
  isLoading = false,
}: AttendanceAnalyticsProps) {
  const defaultTrend = [
    { day: "Mon", attendance: 92 },
    { day: "Tue", attendance: 94 },
    { day: "Wed", attendance: 88 },
    { day: "Thu", attendance: 91 },
    { day: "Fri", attendance: 89 },
    { day: "Sat", attendance: 95 },
  ];

  const defaultDistribution = [
    { name: "Present", value: 89 },
    { name: "Absent", value: 6 },
    { name: "Late", value: 3 },
    { name: "On Duty", value: 2 },
  ];

  const activeTrend = trendData && trendData.length > 0 ? trendData : defaultTrend;
  const activeDistribution = distributionData && distributionData.length > 0 ? distributionData : defaultDistribution;
  const COLORS = ["#10b981", "#f43f5e", "#f59e0b", "#3b82f6"];

  if (isLoading) {
    return (
      <Panel
        title="Attendance Analytics Dashboard"
        description="Pedagogy reports on weekly submittal ratios and student status shares"
        className="border border-border bg-card rounded-2xl p-8 shadow-card text-xs text-center"
      >
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Loading attendance analytics from database...</p>
        </div>
      </Panel>
    );
  }

  if (hasData === false && totalRecords === 0) {
    return (
      <Panel
        title="Attendance Analytics Dashboard"
        description="Pedagogy reports on weekly submittal ratios and student status shares"
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
    <Panel
      title="Attendance Analytics Dashboard"
      description="Pedagogy reports on weekly submittal ratios and student status shares"
      className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Trend Area Chart */}
        <div className="space-y-2">
          <h5 className="font-extrabold text-[0.7rem] text-muted-foreground uppercase tracking-wider">Weekly Attendance Trend (%)</h5>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeTrend}>
                <defs>
                  <linearGradient id="colorAttend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[70, 100]} tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Area type="monotone" dataKey="attendance" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAttend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Bar Chart */}
        <div className="space-y-2">
          <h5 className="font-extrabold text-[0.7rem] text-muted-foreground uppercase tracking-wider">Attendance Status Share (%)</h5>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeDistribution}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {activeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Panel>
  );
}
