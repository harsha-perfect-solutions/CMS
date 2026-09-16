import { Clock, MapPin, Layers, BookOpen, FlaskConical, CheckCircle2, Radio, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import type { TimetableSlotItem } from "@/services/FacultyTimetableService";

interface TodayScheduleProps {
  schedule: TimetableSlotItem[];
  onMarkAttendance?: (slot: TimetableSlotItem) => void;
}

export function TodaySchedule({ schedule, onMarkAttendance }: TodayScheduleProps) {
  const getBadgeStyle = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "Ongoing":
        return "bg-amber-500/15 text-amber-600 border-amber-500/30 animate-pulse font-extrabold";
      default:
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Today's Schedule Cards
        </h3>
        <span className="text-[0.7rem] text-muted-foreground font-mono">
          {schedule.length} {schedule.length === 1 ? "Class" : "Classes"} Scheduled
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {schedule.map((slot, idx) => {
          const isOngoing = slot.status === "Ongoing";

          return (
            <Card
              key={slot.id || idx}
              className={`border transition-all duration-300 relative overflow-hidden text-xs py-0 ${
                isOngoing
                  ? "border-amber-500/60 bg-amber-500/5 shadow-elevated ring-1 ring-amber-500/30"
                  : "border-border/70 shadow-card hover:shadow-elevated bg-card"
              }`}
            >
              {isOngoing && (
                <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-amber-400 to-amber-600" />
              )}
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-muted-foreground text-[0.68rem] font-bold flex items-center gap-1.5">
                    <Clock className="size-3.5 text-primary/70" /> {slot.time}
                  </span>
                  <Badge
                    variant="outline"
                    className={`py-0.5 px-2 rounded-xl text-[0.62rem] font-bold border flex items-center gap-1 ${getBadgeStyle(
                      slot.status
                    )}`}
                  >
                    {isOngoing && <Radio className="size-2.5 animate-ping text-amber-600" />}
                    {slot.status === "Completed" && <CheckCircle2 className="size-2.5 text-emerald-600" />}
                    {slot.status.toUpperCase()}
                  </Badge>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    {slot.isLab ? (
                      <span className="inline-flex items-center gap-1 text-[0.6rem] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold">
                        <FlaskConical className="size-3" /> LAB
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[0.6rem] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold">
                        <BookOpen className="size-3" /> THEORY
                      </span>
                    )}
                    {slot.subjectCode && (
                      <span className="text-[0.65rem] font-mono text-muted-foreground font-semibold">
                        {slot.subjectCode}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm leading-snug truncate" title={slot.subject}>
                    {slot.subject}
                  </h4>
                  <p className="text-[0.68rem] text-muted-foreground mt-1 font-medium flex items-center gap-1">
                    <Layers className="size-3 text-primary/60" /> Section:{" "}
                    <span className="font-semibold text-foreground">{slot.section}</span>
                  </p>
                </div>

                <div className="pt-2.5 border-t border-border/50 flex justify-between items-center text-[0.68rem] text-muted-foreground font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3 text-primary/70" /> Room {slot.room}
                  </span>
                  <span className="font-mono text-[0.65rem]">Period {slot.periodNumber}</span>
                </div>

                {/* Real interactive module actions */}
                <div className="pt-2 border-t border-border/40 flex items-center gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 rounded-lg text-[0.65rem] font-bold cursor-pointer flex-1"
                  >
                    <Link to="/faculty/attendance" search={{ semester: slot.semester, section: slot.rawSection, period: slot.periodNumber }}>
                      Mark Attendance
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 rounded-lg text-[0.65rem] font-bold cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <Link to="/faculty/students">Open Class</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {schedule.length === 0 && (
          <div className="col-span-full border border-dashed rounded-2xl bg-card p-8 text-center text-muted-foreground space-y-1.5">
            <p className="font-semibold text-sm text-foreground">No classes scheduled for today.</p>
            <p className="text-xs">Your personal academic timetable has no assigned lecture or lab sessions today.</p>
          </div>
        )}
      </div>
    </div>
  );
}
