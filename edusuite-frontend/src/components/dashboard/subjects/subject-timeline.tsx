import { Sparkles, Calendar, CheckCircle } from "lucide-react";
import { Panel } from "@/components/dashboard/panel";
import type { TimelineEvent } from "@/data/faculty-mock-data";

interface SubjectTimelineProps {
  timeline?: TimelineEvent[];
}

export function SubjectTimeline({ timeline = [] }: SubjectTimelineProps) {
  const getIconColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-500 text-white";
      default:
        return "bg-blue-500 text-white";
    }
  };

  if (!timeline || timeline.length === 0) {
    return (
      <Panel
        title="Syllabus & Course Milestones"
        description="Chronological record of semester evaluations and syllabus benchmarks"
        className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
      >
        <p className="text-muted-foreground text-xs italic py-2">No timeline events scheduled.</p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Syllabus & Course Milestones"
      description="Chronological record of semester evaluations and syllabus benchmarks"
      className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
    >
      <div className="relative border-l-2 border-border/60 pl-5 ml-3.5 space-y-5 py-1">
        {timeline.map((act, idx) => {
          const isDone = act.status === "Completed";
          return (
            <div key={idx} className="relative group">
              {/* Timeline Icon Node */}
              <div className={`absolute -left-[29px] top-0.5 grid size-6 place-items-center rounded-full border-2 border-white shadow-sm transition-transform duration-300 group-hover:scale-110 ${getIconColor(act.status)}`}>
                {isDone ? <CheckCircle className="size-3.5 shrink-0" /> : <Calendar className="size-3.5 shrink-0" />}
              </div>
              
              <div>
                <h5 className="font-bold text-foreground leading-snug">
                  {act.event}
                </h5>
                <div className="flex items-center gap-1.5 mt-0.5 text-[0.65rem] text-muted-foreground">
                  <span>{act.date}</span>
                  <span>&middot;</span>
                  <span className="font-semibold text-primary">{act.status}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
