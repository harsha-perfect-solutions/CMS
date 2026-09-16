import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, MapPin, CheckCircle2, UserCheck, Eye, Check } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export interface EnrichedLessonPlan {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  department: string;
  semester: number;
  section: string;
  academicYear: string;
  unitNumber: number;
  unitTitle: string;
  topic: string;
  subtopic?: string;
  plannedDate?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  durationMinutes: number;
  teachingMode: string;
  teachingMethod: string;
  status: string;
  attendanceSubmitted?: boolean;
  timetableSlot?: {
    id: string;
    day: string;
    period: number;
    time: string;
    room: string;
  } | null;
}

interface TodayUpcomingLessonsProps {
  plans: EnrichedLessonPlan[];
  onViewPlan: (plan: EnrichedLessonPlan) => void;
  onMarkComplete: (plan: EnrichedLessonPlan) => void;
}

export function TodayUpcomingLessons({ plans, onViewPlan, onMarkComplete }: TodayUpcomingLessonsProps) {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split("T")[0];

  const todayPlans = plans.filter((p) => p.plannedDate === todayStr);
  const upcomingPlans = plans.filter((p) => p.plannedDate && p.plannedDate > todayStr && p.status !== "COMPLETED");

  return (
    <div className="space-y-6 text-xs">
      {/* 1. Today's Scheduled Lessons */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-primary" />
          <h3 className="font-extrabold text-sm text-foreground">Today's Scheduled Teaching Sessions</h3>
          <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[0.68rem] font-bold">
            {todayPlans.length} Sessions
          </span>
        </div>

        {todayPlans.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-3xl bg-card text-muted-foreground">
            No lesson plans specifically scheduled for today. Check upcoming sessions or plan a class.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {todayPlans.map((plan) => {
              const isCompleted = plan.status === "COMPLETED";

              return (
                <Card
                  key={plan.id}
                  className={`border py-0 shadow-card rounded-3xl transition-all ${
                    isCompleted ? "border-emerald-500/30 bg-emerald-500/[0.02]" : "border-border/80 bg-card"
                  }`}
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-muted-foreground text-[0.68rem] font-bold">
                        {plan.courseCode} &middot; Sec {plan.section}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[0.62rem] py-0.5 px-2 rounded-xl border font-bold ${
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          }`}
                        >
                          {plan.status}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-foreground leading-snug truncate">
                        {plan.topic}
                      </h4>
                      <p className="text-[0.68rem] text-muted-foreground font-medium mt-0.5">
                        {plan.unitTitle} &middot; {plan.courseName}
                      </p>
                    </div>

                    <div className="space-y-1 text-[0.68rem] text-muted-foreground font-medium pt-2 border-t">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3 text-primary/70" />
                        <span>{plan.plannedStartTime || "09:00 AM"} - {plan.plannedEndTime || "10:00 AM"} ({plan.durationMinutes} mins)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3 text-primary/70" />
                        <span>Room: {plan.timetableSlot?.room || "LH-101"}</span>
                      </div>
                    </div>

                    {/* Attendance Evidence Tag */}
                    <div className="pt-1">
                      {plan.attendanceSubmitted ? (
                        <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                          <CheckCircle2 className="size-3" /> Attendance Submitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                          <Clock className="size-3" /> Attendance Pending
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewPlan(plan)}
                        className="flex-1 rounded-xl text-xs h-8"
                      >
                        <Eye className="size-3 mr-1" /> View
                      </Button>

                      {!isCompleted && (
                        <Button
                          size="sm"
                          onClick={() => onMarkComplete(plan)}
                          className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                        >
                          <Check className="size-3 mr-1" /> Complete
                        </Button>
                      )}

                      {!plan.attendanceSubmitted && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate({ to: "/faculty/attendance" as any })}
                          className="rounded-xl text-xs h-8"
                          title="Take class attendance"
                        >
                          <UserCheck className="size-3 mr-1" /> Take Att.
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Upcoming Scheduled Lessons */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-indigo-600" />
          <h3 className="font-extrabold text-sm text-foreground">Upcoming Teaching Sessions</h3>
          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 text-[0.68rem] font-bold">
            {upcomingPlans.length} Upcoming
          </span>
        </div>

        {upcomingPlans.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-3xl bg-card text-muted-foreground">
            No upcoming sessions planned yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingPlans.map((plan) => (
              <Card key={plan.id} className="border border-border/80 py-0 shadow-card rounded-3xl bg-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-muted-foreground text-[0.68rem] font-bold">
                      {plan.courseCode} &middot; Sec {plan.section}
                    </span>
                    <Badge variant="outline" className="text-[0.6rem] py-0.5 px-2 rounded-xl bg-indigo-500/10 text-indigo-600 border-indigo-500/20 font-bold">
                      {plan.plannedDate}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-foreground leading-snug truncate">
                      {plan.topic}
                    </h4>
                    <p className="text-[0.68rem] text-muted-foreground font-medium mt-0.5">
                      {plan.unitTitle}
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-[0.65rem] text-muted-foreground font-medium pt-2 border-t">
                    <span>{plan.plannedStartTime || "09:00 AM"} &middot; {plan.durationMinutes} mins</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewPlan(plan)}
                      className="h-7 text-xs text-primary font-bold hover:text-primary"
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
