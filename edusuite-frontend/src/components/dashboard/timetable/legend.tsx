import { BookOpen, FlaskConical, Coffee, Clock } from "lucide-react";

export function Legend() {
  const legendItems = [
    {
      label: "Theory Lecture",
      icon: BookOpen,
      color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    },
    {
      label: "Laboratory Practice",
      icon: FlaskConical,
      color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    },
    {
      label: "Short Break (15 Mins)",
      icon: Coffee,
      color: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
    },
    {
      label: "Lunch Break (45 Mins)",
      icon: Coffee,
      color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    },
    {
      label: "Free Period (Unassigned)",
      icon: Clock,
      color: "bg-muted text-muted-foreground border-border/40",
    },
  ];

  return (
    <div className="border border-border/70 bg-card rounded-2xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Timetable Legend
        </h4>
        <span className="text-[0.68rem] text-muted-foreground">
          Canonical ANITS Master Timetable Schema
        </span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {legendItems.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 py-1 px-2.5 rounded-xl border font-semibold text-[0.68rem] ${item.color}`}
          >
            <item.icon className="size-3" />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
