import { CalendarClock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FreePeriod } from "@/services/FacultyTimetableService";

interface FreePeriodCardsProps {
  freePeriods: FreePeriod[];
}

export function FreePeriodCards({ freePeriods }: FreePeriodCardsProps) {
  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 md:p-6 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" />
              Free Periods &amp; Open Availability
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] font-bold py-0.5 px-2 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-border"
            >
              {freePeriods.length} Available Slots
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Non-teaching periods derived from slots with no MasterTimetable assignment
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {freePeriods.slice(0, 12).map((slot, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-border/70 bg-card text-foreground hover:bg-muted/30 transition-all shadow-2xs"
            >
              <CalendarClock className="size-3.5 shrink-0 text-primary/70" />
              <div className="min-w-0">
                <p className="font-bold text-xs truncate">{slot.day}</p>
                <p className="text-[10.5px] text-muted-foreground font-mono truncate">{slot.timeSlot}</p>
              </div>
            </div>
          ))}
          {freePeriods.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-6 col-span-full">
              No free slots available. Teaching load is fully allocated across all periods.
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-muted/40 text-xs text-muted-foreground font-medium">
          <Sparkles className="size-3.5 text-primary/70 shrink-0" />
          <span>Authoritatively calculated from institutional period schedule minus authenticated faculty allocations.</span>
        </div>
      </div>
    </div>
  );
}
