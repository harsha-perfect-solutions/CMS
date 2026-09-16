import { BookOpen, CheckCircle, FileText, Layers, Clock, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LessonPlanItem } from "@/data/faculty-mock-data";

export interface LessonPlanStats {
  totalPlans: number;
  completedPlans: number;
  activePlans: number;
  pendingLayouts: number;
  plannedUnits: number;
  averageCoverage: number;
}

interface StatisticsCardsProps {
  plans?: LessonPlanItem[];
  stats?: LessonPlanStats;
}

export function StatisticsCards({ plans = [], stats }: StatisticsCardsProps) {
  const total = stats ? stats.totalPlans : plans.length;
  const completed = stats ? stats.completedPlans : plans.filter((p) => p.status === "Completed").length;
  const active = stats ? stats.activePlans : plans.filter((p) => p.status === "Active" || (p.status as any) === "PLANNED" || (p.status as any) === "IN_PROGRESS").length;
  const pending = stats ? stats.pendingLayouts : plans.filter((p) => p.status === "Pending" || (p.status as any) === "DRAFT").length;
  const totalUnits = stats ? stats.plannedUnits : plans.reduce((sum, p) => sum + p.totalUnits, 0);
  const avgCompletion = stats ? stats.averageCoverage : total > 0
    ? Math.round(plans.reduce((sum, p) => sum + p.completionPercentage, 0) / total)
    : 0;

  const cards = [
    { label: "Total Lesson Plans", value: `${total} Plans`, icon: BookOpen, color: "bg-blue-500/10 text-blue-600 border-blue-500/10" },
    { label: "Completed", value: `${completed} Completed`, icon: CheckCircle, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/10" },
    { label: "Active Plans", value: `${active} Active`, icon: FileText, color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/10" },
    { label: "Draft / Pending", value: `${pending} Pending`, icon: Clock, color: "bg-amber-500/10 text-amber-600 border-amber-500/10" },
    { label: "Planned Units", value: `${totalUnits} Units`, icon: Layers, color: "bg-violet-500/10 text-violet-600 border-violet-500/10" },
    { label: "Average Syllabus Coverage", value: `${avgCompletion}%`, icon: ShieldCheck, color: "bg-teal-500/10 text-teal-600 border-teal-500/10" },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 text-xs">
      {cards.map((card, idx) => (
        <Card
          key={idx}
          className="border border-border/70 py-0 shadow-card hover:shadow-elevated transition-all duration-300 transform hover:-translate-y-1"
        >
          <CardContent className="flex flex-col items-center text-center p-4">
            <span className={`grid size-9 place-items-center rounded-xl border mb-2.5 ${card.color}`}>
              <card.icon className="size-4.5" />
            </span>
            <p className="font-extrabold text-muted-foreground uppercase tracking-wider text-[0.55rem]">
              {card.label}
            </p>
            <p className="mt-1 text-base font-black tracking-tight text-foreground">
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

