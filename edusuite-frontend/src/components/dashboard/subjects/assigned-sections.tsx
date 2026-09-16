import { Users, Layers, MapPin, ShieldAlert } from "lucide-react";
import { Panel } from "@/components/dashboard/panel";
import type { SectionDetail } from "@/data/faculty-mock-data";

interface AssignedSectionsProps {
  sections?: SectionDetail[];
}

export function AssignedSections({ sections = [] }: AssignedSectionsProps) {
  if (!sections || sections.length === 0) {
    return (
      <Panel
        title="Assigned Sections & Strengths"
        description="Registered class sections, strengths, and assigned advisor lines"
        className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
      >
        <p className="text-muted-foreground text-xs italic py-2">No section details registered.</p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Assigned Sections & Strengths"
      description="Registered class sections, strengths, and assigned advisor lines"
      className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
    >
      <div className="space-y-3.5">
        {sections.map((sec, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3.5 p-3.5 rounded-2xl border bg-muted/20 hover:bg-muted/40 transition-colors"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Layers className="size-5" />
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex justify-between items-center">
                <h5 className="font-extrabold text-sm text-foreground">Section {sec.sectionName}</h5>
                <span className="flex items-center gap-1 text-[0.65rem] font-bold text-muted-foreground">
                  <Users className="size-3.5 text-primary/60" /> {sec.studentsCount} Students
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.65rem] text-muted-foreground font-medium pt-1 border-t border-border/40">
                <span className="flex items-center gap-0.5"><MapPin className="size-3 text-primary/60" /> Classroom: {sec.classroom}</span>
                {sec.advisor && (
                  <span className="flex items-center gap-0.5"><ShieldAlert className="size-3 text-primary/60" /> Class Advisor: {sec.advisor}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
