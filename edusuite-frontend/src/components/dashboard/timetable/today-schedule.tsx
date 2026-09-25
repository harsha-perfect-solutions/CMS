import { Clock, MapPin, Layers, BookOpen, FlaskConical, CheckCircle2, Radio, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import type { TimetableSlotItem } from "@/services/FacultyTimetableService";

interface TodayScheduleProps {
  schedule: TimetableSlotItem[];
}

export function TodaySchedule({ schedule }: TodayScheduleProps) {
  const getBadgeStyle = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "Ongoing":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-extrabold";
      default:
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 md:p-6 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              Today's Schedule
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] font-bold py-0.5 px-2 bg-primary/10 text-primary border-primary/20"
            >
              {schedule.length} {schedule.length === 1 ? "Class Scheduled" : "Classes Scheduled"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Personal teaching commitments and live attendance actions for today
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden bg-card">
        {schedule.map((slot, idx) => {
          const isOngoing = slot.status === "Ongoing";
          const isSubmitted = Boolean(
            slot.attendanceSubmitted || slot.attendanceStatus === "ATTENDANCE_SUBMITTED"
          );

          return (
            <div
              key={slot.id || idx}
              className={`p-4 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isOngoing
                  ? "bg-amber-500/5 border-l-4 border-l-amber-500"
                  : "hover:bg-muted/30"
              }`}
            >
              {/* Left Column: Timing & Status */}
              <div className="flex items-center gap-3 sm:gap-4 shrink-0 min-w-[200px]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="size-3.5 text-primary" /> {slot.time}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold py-0.5 px-2 rounded-lg border flex items-center gap-1 ${getBadgeStyle(
                        slot.status
                      )}`}
                    >
                      {isOngoing && <Radio className="size-2.5 animate-ping text-amber-600" />}
                      {slot.status === "Completed" && <CheckCircle2 className="size-2.5 text-emerald-600" />}
                      {slot.status.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground block">
                    Period {slot.periodNumber}
                  </span>
                </div>
              </div>

              {/* Middle Column: Course, Section, Room */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {slot.subjectCode || "COURSE"}
                  </span>
                  {slot.isLab ? (
                    <Badge
                      variant="outline"
                      className="text-[9px] font-bold py-0 px-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                    >
                      <FlaskConical className="size-2.5 mr-1" /> LAB
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[9px] font-bold py-0 px-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                    >
                      <BookOpen className="size-2.5 mr-1" /> THEORY
                    </Badge>
                  )}
                  <h4 className="font-bold text-sm text-foreground truncate" title={slot.subject}>
                    {slot.subject}
                  </h4>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                  <span className="flex items-center gap-1">
                    <Layers className="size-3.5 text-primary/70" />
                    <span>Section {slot.section}</span>
                  </span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5 text-primary/70" />
                    <span>{slot.room || "Room not assigned"}</span>
                  </span>
                </div>
              </div>

              {/* Right Column: Attendance Action */}
              <div className="shrink-0 flex items-center justify-start md:justify-end">
                {isSubmitted ? (
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="size-4" /> Attendance Submitted
                    </span>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs rounded-xl border-border/70 text-muted-foreground hover:text-foreground"
                    >
                      <Link
                        to="/anits/attendance"
                        search={{
                          timetableId: slot.timetableId || slot.id,
                          tab: "mark",
                        }}
                      >
                        View Register
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <Button
                    asChild
                    variant={isOngoing ? "default" : "outline"}
                    size="sm"
                    className={`h-9 px-4 rounded-xl text-xs font-bold cursor-pointer shadow-xs ${
                      isOngoing
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "border-primary/40 text-primary hover:bg-primary/10"
                    }`}
                  >
                    <Link
                      to="/anits/attendance"
                      search={{
                        timetableId: slot.timetableId || slot.id,
                        tab: "mark",
                      }}
                    >
                      Take Attendance
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {schedule.length === 0 && (
          <div className="p-8 text-center text-muted-foreground space-y-1">
            <p className="font-semibold text-xs text-foreground">No classes scheduled for today.</p>
            <p className="text-[11px]">Your personal timetable has no teaching sessions scheduled today.</p>
          </div>
        )}
      </div>
    </div>
  );
}
