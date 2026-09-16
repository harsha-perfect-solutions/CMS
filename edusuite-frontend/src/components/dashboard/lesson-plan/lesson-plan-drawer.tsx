import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  BookOpen,
  Layers,
  FileText,
  HelpCircle,
  Lightbulb,
  Check,
} from "lucide-react";

interface LessonPlanDrawerProps {
  plan: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkComplete?: (plan: any) => void;
}

export function LessonPlanDrawer({ plan, open, onOpenChange, onMarkComplete }: LessonPlanDrawerProps) {
  if (!plan) return null;

  const code = plan.courseCode || plan.code || "SUB";
  const name = plan.courseName || plan.name || "Subject";
  const unit = plan.unitTitle || (plan.unitNumber ? `Unit ${plan.unitNumber}` : "Unit 1");
  const topic = plan.topic || name;
  const section = plan.section || (plan.assignedSections && plan.assignedSections[0]) || "A";
  const isCompleted = plan.status === "COMPLETED" || plan.status === "Completed";
  const isDraft = plan.status === "DRAFT" || plan.status === "Pending";

  const objectives: string[] = Array.isArray(plan.learningObjectives)
    ? plan.learningObjectives
    : typeof plan.learningObjectives === "string" && plan.learningObjectives.startsWith("[")
    ? JSON.parse(plan.learningObjectives)
    : plan.learningObjectives
    ? [plan.learningObjectives]
    : [];

  const activities: string[] = Array.isArray(plan.plannedActivities)
    ? plan.plannedActivities
    : typeof plan.plannedActivities === "string" && plan.plannedActivities.startsWith("[")
    ? JSON.parse(plan.plannedActivities)
    : plan.plannedActivities
    ? [plan.plannedActivities]
    : [];

  const actualActivitiesList: string[] = Array.isArray(plan.actualActivities)
    ? plan.actualActivities
    : typeof plan.actualActivities === "string" && plan.actualActivities.startsWith("[")
    ? JSON.parse(plan.actualActivities)
    : plan.actualActivities
    ? [plan.actualActivities]
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[620px] overflow-y-auto rounded-l-3xl p-6 text-xs">
        <SheetHeader className="border-b border-border pb-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono font-bold text-[0.68rem] text-primary">
              <span>{code}</span>
              <span>&middot;</span>
              <span>Section {section}</span>
              <span>&middot;</span>
              <span>{plan.teachingMode || "Theory"}</span>
            </div>
            <Badge
              variant="outline"
              className={`text-[0.62rem] py-0.5 px-2 rounded-xl font-bold border ${
                isCompleted
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : isDraft
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  : "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
              }`}
            >
              {isCompleted ? "Completed" : isDraft ? "Draft" : "Planned"}
            </Badge>
          </div>

          <SheetTitle className="font-display text-lg font-extrabold text-foreground leading-snug">
            {topic}
          </SheetTitle>

          <SheetDescription className="font-medium text-muted-foreground text-xs">
            {unit} &middot; {name}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="overview" className="w-full mt-5 space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-2xl">
            <TabsTrigger value="overview" className="rounded-xl text-xs py-1.5 font-bold">
              Overview & Objectives
            </TabsTrigger>
            <TabsTrigger value="evidence" className="rounded-xl text-xs py-1.5 font-bold">
              Teaching Notes & Evidence
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-4">
            {/* Timing & Schedule card */}
            <div className="bg-muted/30 p-4 rounded-2xl border space-y-2.5">
              <h5 className="font-extrabold text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                Session Schedule & Location
              </h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Calendar className="size-3.5 text-primary" />
                  <span>{plan.plannedDate || "Scheduled Date"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Clock className="size-3.5 text-primary" />
                  <span>{plan.plannedStartTime || "09:00 AM"} - {plan.plannedEndTime || "10:00 AM"} ({plan.durationMinutes || 60}m)</span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <MapPin className="size-3.5 text-primary" />
                  <span>Room: {plan.timetableSlot?.room || "LH-101"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Layers className="size-3.5 text-primary" />
                  <span>Method: {plan.teachingMethod || "Lecture"}</span>
                </div>
              </div>

              {/* Attendance Status */}
              <div className="pt-2 border-t flex items-center justify-between">
                <span className="text-[0.68rem] text-muted-foreground font-medium">Session Attendance:</span>
                {plan.attendanceSubmitted ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[0.62rem] font-bold">
                    <CheckCircle2 className="size-3 mr-1" /> Submitted
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[0.62rem] font-bold">
                    Pending
                  </Badge>
                )}
              </div>
            </div>

            {/* Subtopic */}
            {plan.subtopic && (
              <div className="space-y-1">
                <span className="text-[0.68rem] uppercase font-bold text-muted-foreground">Subtopic / Key Concepts</span>
                <p className="text-xs font-semibold text-foreground p-3 rounded-xl bg-card border">
                  {plan.subtopic}
                </p>
              </div>
            )}

            {/* Learning Objectives */}
            <div className="space-y-2">
              <span className="text-[0.7rem] uppercase font-extrabold text-muted-foreground flex items-center gap-1.5">
                <Lightbulb className="size-3.5 text-amber-500" /> Learning Objectives
              </span>
              {objectives.length > 0 ? (
                <div className="space-y-1.5">
                  {objectives.map((obj, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl border bg-card text-xs">
                      <span className="size-4.5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[0.65rem] shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="font-medium text-foreground">{obj}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic text-xs">No specific learning objectives defined.</p>
              )}
            </div>

            {/* Planned Activities */}
            {activities.length > 0 && (
              <div className="space-y-2">
                <span className="text-[0.7rem] uppercase font-extrabold text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="size-3.5 text-primary" /> Planned Teaching Activities
                </span>
                <div className="space-y-1">
                  {activities.map((act, i) => (
                    <p key={i} className="p-2.5 rounded-xl border bg-card text-xs text-foreground font-medium">
                      &bull; {act}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Resources & Assessment */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-2xl border bg-muted/20 space-y-1">
                <span className="text-[0.65rem] uppercase font-bold text-muted-foreground">Required Resources</span>
                <p className="font-semibold text-foreground text-xs">{plan.requiredResources || "Standard Textbook / Slides"}</p>
              </div>
              <div className="p-3 rounded-2xl border bg-muted/20 space-y-1">
                <span className="text-[0.65rem] uppercase font-bold text-muted-foreground">Assessment Method</span>
                <p className="font-semibold text-foreground text-xs">{plan.assessmentMethod || "Spot Problem Solving"}</p>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: EVIDENCE & TEACHING NOTES */}
          <TabsContent value="evidence" className="space-y-4">
            {isCompleted ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs">
                    <CheckCircle2 className="size-4" /> Lesson Completed
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Conducted on <strong>{plan.actualDate || plan.plannedDate}</strong> &middot; Duration:{" "}
                    <strong>{plan.actualDuration || plan.durationMinutes} minutes</strong>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[0.68rem] uppercase font-bold text-muted-foreground">Topics Actually Covered</span>
                  <p className="p-3 rounded-xl border bg-card text-xs font-semibold text-foreground">
                    {plan.topicsCovered || plan.topic}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[0.68rem] uppercase font-bold text-muted-foreground">Faculty Teaching Notes</span>
                  <p className="p-3 rounded-xl border bg-card text-xs font-medium text-foreground leading-relaxed">
                    {plan.teachingNotes || "No additional teaching notes recorded."}
                  </p>
                </div>

                {actualActivitiesList.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[0.68rem] uppercase font-bold text-muted-foreground">Activities Completed</span>
                    <div className="p-3 rounded-xl border bg-card space-y-1 text-xs text-foreground font-medium">
                      {actualActivitiesList.map((act, i) => (
                        <p key={i}>&bull; {act}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed rounded-3xl bg-card space-y-3">
                <Clock className="size-8 text-amber-500 mx-auto" />
                <h4 className="font-extrabold text-xs text-foreground">Lesson Not Completed Yet</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Once you conduct this session and take attendance, click below to record topics covered and teaching notes.
                </p>
                {onMarkComplete && (
                  <Button
                    onClick={() => onMarkComplete(plan)}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-bold"
                  >
                    <Check className="size-3.5 mr-1.5" /> Mark Completed Now
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
