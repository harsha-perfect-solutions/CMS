import { Clock, BookOpen, Layers, Award, Activity, CheckSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { TeachingLoad } from "@/services/FacultyTimetableService";

interface TeachingLoadCardsProps {
  load: TeachingLoad;
}

export function TeachingLoadCards({ load }: TeachingLoadCardsProps) {
  const cards = [
    {
      label: "Weekly Classes",
      value: `${load.weeklyClasses} Periods`,
      icon: Activity,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      label: "Theory Hours",
      value: `${load.theoryHours} Hours`,
      icon: Clock,
      color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    },
    {
      label: "Lab Hours",
      value: `${load.labHours} Hours`,
      icon: Award,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Total Load",
      value: `${load.totalHours} Hrs/Wk`,
      icon: CheckSquare,
      color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    },
    {
      label: "Total Subjects",
      value: `${load.totalSubjects} Subjects`,
      icon: BookOpen,
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      label: "Total Sections",
      value: `${load.totalSections} Sections`,
      icon: Layers,
      color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    },
  ];

  return (
    <div className="grid gap-3.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 text-xs">
      {cards.map((card, idx) => (
        <Card
          key={idx}
          className="border border-border/70 py-0 shadow-xs hover:shadow-sm transition-all duration-200 bg-card rounded-2xl"
        >
          <CardContent className="flex flex-col items-center text-center p-3.5">
            <span className={`grid size-8 place-items-center rounded-xl border mb-2 ${card.color}`}>
              <card.icon className="size-4" />
            </span>
            <p className="font-bold text-muted-foreground uppercase tracking-wider text-[0.62rem]">
              {card.label}
            </p>
            <p className="mt-0.5 text-base font-black tracking-tight text-foreground font-mono">
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
