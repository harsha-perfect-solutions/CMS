import { Clock, MapPin, Layers, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UpcomingClassItem } from "@/services/FacultyTimetableService";

interface UpcomingClassesProps {
  classes: UpcomingClassItem[];
}

export function UpcomingClasses({ classes }: UpcomingClassesProps) {
  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 md:p-6 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              Upcoming Classes
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] font-bold py-0.5 px-2 bg-primary/10 text-primary border-primary/20"
            >
              Next {classes.length} Sessions
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Next scheduled teaching sessions across the academic week
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden bg-card">
        {classes.map((cls, idx) => (
          <div
            key={idx}
            className="p-3.5 sm:p-4 hover:bg-muted/30 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-xs">
                <Clock className="size-4" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <h5 className="font-bold text-xs sm:text-sm text-foreground truncate">
                  {cls.subject}
                </h5>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground font-medium">
                  <span className="font-bold text-primary">{cls.day}</span>
                  <span>&middot;</span>
                  <span>{cls.time}</span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <Layers className="size-3 text-primary/60" /> {cls.section}
                  </span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3 text-primary/60" /> {cls.room}
                  </span>
                </div>
              </div>
            </div>

            <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-0 rounded-lg font-bold py-1 px-2.5 text-xs shrink-0 self-start sm:self-center">
              {cls.countdown}
            </Badge>
          </div>
        ))}

        {classes.length === 0 && (
          <div className="p-8 text-center text-muted-foreground space-y-1">
            <p className="text-xs font-medium text-foreground">No upcoming classes.</p>
            <p className="text-[11px]">All scheduled teaching sessions have concluded for this cycle.</p>
          </div>
        )}
      </div>
    </div>
  );
}
