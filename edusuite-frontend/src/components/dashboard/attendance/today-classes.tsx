import { Clock, Users, MapPin, ClipboardList, CheckCircle2, Edit3, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface TodayClassItem {
  id: string;
  timetableId?: string;
  periodNumber: number;
  time: string;
  subject: string;
  subjectCode?: string;
  subjectName?: string;
  section: string;
  rawSection?: string;
  classCode?: string;
  branch?: string;
  semester?: number;
  room?: string;
  isLab?: boolean;
  status: "Completed" | "Pending" | "Ongoing" | "Upcoming" | string;
  attendanceSubmitted?: boolean;
  submittedStats?: {
    present: number;
    absent: number;
    late: number;
    total: number;
  } | null;
}

interface TodayClassesProps {
  classes: TodayClassItem[];
  onTakeAttendance: (slot: TodayClassItem) => void;
  onViewRegister: (slot: TodayClassItem) => void;
}

export function TodayClasses({ classes, onTakeAttendance, onViewRegister }: TodayClassesProps) {
  const getBadgeStyle = (status: string, isSubmitted: boolean) => {
    if (isSubmitted || status === "Completed") {
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold";
    }
    if (status === "Ongoing") {
      return "bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse font-bold";
    }
    return "bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold";
  };

  if (classes.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed rounded-3xl bg-card space-y-3">
        <p className="text-sm font-bold text-foreground">No classes scheduled for you today.</p>
        <p className="text-xs text-muted-foreground">
          You do not have any teaching sessions assigned in the active timetable for today.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {classes.map((cls, idx) => {
        const isSubmitted = Boolean(cls.attendanceSubmitted || cls.status === "Completed");

        return (
          <Card
            key={cls.id || idx}
            className={`border py-0 shadow-card hover:shadow-elevated transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group ${
              isSubmitted ? "border-emerald-500/30 bg-emerald-500/[0.02]" : "border-border/70 bg-card"
            }`}
          >
            <div className="absolute right-0 top-0 h-16 w-16 bg-muted/10 blur-xl" />
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="flex justify-between items-start">
                <span className="font-mono text-muted-foreground text-[0.68rem] font-bold">
                  Period {cls.periodNumber || idx + 1}
                </span>
                <Badge
                  variant="outline"
                  className={`py-0.5 px-2 rounded-xl text-[0.62rem] border ${getBadgeStyle(
                    cls.status,
                    isSubmitted
                  )}`}
                >
                  {isSubmitted ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-emerald-600" /> Submitted
                    </span>
                  ) : (
                    "Pending"
                  )}
                </Badge>
              </div>

              <div>
                <h4 className="font-extrabold text-sm leading-snug group-hover:text-primary transition-colors truncate">
                  {cls.subject}
                </h4>
                <p className="text-[0.68rem] text-muted-foreground mt-0.5 font-bold">
                  Section: <span className="text-foreground">{cls.section}</span> &middot; Classroom:{" "}
                  <span className="text-foreground">{cls.room || "LH-301"}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-border/40 space-y-2 text-[0.68rem] text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary/60" /> {cls.time}
                </span>

                {isSubmitted && cls.submittedStats ? (
                  <div className="flex items-center gap-2 font-bold text-[0.65rem] text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-lg">
                    <span>{cls.submittedStats.present} Present</span>
                    <span>&middot;</span>
                    <span className="text-rose-600">{cls.submittedStats.absent} Absent</span>
                    {cls.submittedStats.late > 0 && (
                      <>
                        <span>&middot;</span>
                        <span className="text-amber-600">{cls.submittedStats.late} Late</span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5 text-primary/60" /> Attendance Pending Submittal
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => onViewRegister(cls)}
                  variant="outline"
                  className="flex-1 rounded-xl cursor-pointer hover:bg-muted text-[0.65rem] h-8 font-semibold flex items-center justify-center gap-1"
                >
                  <Eye className="size-3.5" /> Register
                </Button>
                <Button
                  onClick={() => onTakeAttendance(cls)}
                  className={`flex-1 rounded-xl text-[0.68rem] h-8 font-bold flex items-center justify-center gap-1 cursor-pointer ${
                    isSubmitted
                      ? "bg-muted hover:bg-muted/80 text-foreground border border-border"
                      : "bg-brand-gradient shadow-glow text-white"
                  }`}
                >
                  {isSubmitted ? (
                    <>
                      <Edit3 className="size-3.5" /> Edit Marks
                    </>
                  ) : (
                    <>
                      <ClipboardList className="size-3.5" /> Take Attendance
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
