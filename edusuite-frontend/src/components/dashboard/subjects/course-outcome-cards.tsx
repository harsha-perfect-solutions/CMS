import { ClipboardList } from "lucide-react";
import { Panel } from "@/components/dashboard/panel";
import { Badge } from "@/components/ui/badge";
import type { CourseOutcome } from "@/data/faculty-mock-data";

interface CourseOutcomeCardsProps {
  outcomes?: CourseOutcome[];
}

export function CourseOutcomeCards({ outcomes = [] }: CourseOutcomeCardsProps) {
  const getMappingColor = (status: string) => {
    switch (status) {
      case "High":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "Medium":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default:
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    }
  };

  if (!outcomes || outcomes.length === 0) {
    return (
      <Panel
        title="Course Outcomes (CO)"
        description="NBA-mapped syllabus guidelines and cognitive levels"
        className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
      >
        <p className="text-muted-foreground text-xs italic py-2">No Course Outcomes registered.</p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Course Outcomes (CO)"
      description="NBA-mapped syllabus guidelines and cognitive levels"
      className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
    >
      <div className="space-y-3">
        {outcomes.map((item, idx) => (
          <div
            key={idx}
            className="flex gap-3 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary font-bold font-mono text-[0.7rem]">
              {item.co}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-[0.62rem] text-muted-foreground uppercase tracking-wider">Target Domain</span>
                <Badge variant="outline" className={`py-0 px-2 rounded-xl text-[0.58rem] font-bold ${getMappingColor(item.mappingStatus)}`}>
                  {item.mappingStatus} Mapping
                </Badge>
              </div>
              <p className="font-bold text-foreground leading-normal">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
