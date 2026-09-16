import { Users, BookOpen, Layers, ShieldAlert, FileText, Percent, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface SummaryMetrics {
  totalClasses: number;
  totalSections: number;
  assignedStudents: number;
  attendanceAlerts: number;
  gradeAlerts: number;
  averageAttendance: number | null;
  averageGpa: number | null;
}

interface StatisticsCardsProps {
  summary?: SummaryMetrics;
}

export function StatisticsCards({ summary }: StatisticsCardsProps) {
  const s = summary || {
    totalClasses: 0,
    totalSections: 0,
    assignedStudents: 0,
    attendanceAlerts: 0,
    gradeAlerts: 0,
    averageAttendance: null,
    averageGpa: null,
  };

  const cards = [
    {
      label: "MY CLASSES",
      value: `${s.totalClasses} Classes`,
      icon: BookOpen,
      color: "bg-blue-500/10 text-blue-600 border-blue-500/15",
    },
    {
      label: "MY SECTIONS",
      value: `${s.totalSections} Sections`,
      icon: Layers,
      color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/15",
    },
    {
      label: "ASSIGNED STUDENTS",
      value: `${s.assignedStudents} Students`,
      icon: Users,
      color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/15",
    },
    {
      label: "ATTENDANCE ALERTS",
      value: `${s.attendanceAlerts} Students`,
      subtitle: s.attendanceAlerts > 0 ? "Below 75% threshold" : "All within threshold",
      icon: ShieldAlert,
      color: s.attendanceAlerts > 0 ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/15",
    },
    {
      label: "GRADE ALERTS",
      value: `${s.gradeAlerts} Students`,
      subtitle: s.gradeAlerts > 0 ? "Academic risk (<7.0)" : "Good standing",
      icon: FileText,
      color: s.gradeAlerts > 0 ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/15",
    },
    {
      label: "AVERAGE ATTENDANCE",
      value: s.averageAttendance !== null ? `${s.averageAttendance}%` : "Attendance data unavailable",
      icon: Percent,
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/15",
    },
    {
      label: "AVERAGE GPA",
      value: s.averageGpa !== null ? `${s.averageGpa} GPA` : "Performance data unavailable",
      icon: Award,
      color: "bg-violet-500/10 text-violet-600 border-violet-500/15",
    },
  ];

  return (
    <div className="grid gap-3.5 grid-cols-2 md:grid-cols-4 lg:grid-cols-7 text-xs">
      {cards.map((card, idx) => (
        <Card
          key={idx}
          className="border border-border/70 py-0 shadow-card hover:shadow-elevated transition-all duration-300 transform hover:-translate-y-1"
        >
          <CardContent className="flex flex-col items-center text-center p-3.5">
            <span className={`grid size-9 place-items-center rounded-xl border mb-2 ${card.color}`}>
              <card.icon className="size-4.5" />
            </span>
            <p className="font-black text-muted-foreground uppercase tracking-wider text-[0.56rem]">
              {card.label}
            </p>
            <p className="mt-1 text-sm font-black tracking-tight text-foreground line-clamp-1">
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
