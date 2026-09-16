import { Clock, Layers, Calendar, CheckCircle2, Eye, Edit3, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface AnyLessonPlan {
  id: string;
  courseId?: string;
  courseCode?: string;
  courseName?: string;
  code?: string;
  name?: string;
  unitNumber?: number;
  unitTitle?: string;
  topic?: string;
  subtopic?: string;
  section?: string;
  assignedSections?: string[];
  plannedDate?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  durationMinutes?: number;
  weeklyHours?: number;
  teachingMode?: string;
  teachingMethod?: string;
  status: string;
  coveragePercentage?: number;
  completionPercentage?: number;
  totalUnits?: number;
  semester?: string | number;
  academicYear?: string;
  attendanceSubmitted?: boolean;
}

interface LessonPlanCardProps {
  plan: AnyLessonPlan;
  onClick?: () => void;
  onView?: (plan: AnyLessonPlan) => void;
  onEdit?: (plan: AnyLessonPlan) => void;
  onMarkComplete?: (plan: AnyLessonPlan) => void;
}

export function LessonPlanCard({ plan, onClick, onView, onEdit, onMarkComplete }: LessonPlanCardProps) {
  const code = plan.courseCode || plan.code || "SUB";
  const name = plan.courseName || plan.name || "Course Subject";
  const unit = plan.unitTitle || (plan.unitNumber ? `Unit ${plan.unitNumber}` : "Unit 1");
  const topic = plan.topic || name;
  const section = plan.section || (plan.assignedSections && plan.assignedSections[0]) || "A";
  const date = plan.plannedDate || "Scheduled";
  const duration = plan.durationMinutes || (plan.weeklyHours ? plan.weeklyHours * 60 : 60);
  const mode = plan.teachingMode || "Theory";
  const status = plan.status || "PLANNED";
  const isCompleted = status === "COMPLETED" || status === "Completed";
  const isDraft = status === "DRAFT" || status === "Pending";

  const getBadgeStyle = () => {
    if (isCompleted) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold";
    if (isDraft) return "bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold";
    if (status === "POSTPONED") return "bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold";
    return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 font-bold";
  };

  const getTypeStyle = () => {
    if (mode.toLowerCase().includes("lab")) return "bg-purple-500/10 text-purple-600 border-purple-500/20 font-bold";
    return "bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold";
  };

  return (
    <Card
      className={`border py-0 shadow-card hover:shadow-elevated transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group rounded-3xl ${
        isCompleted ? "border-emerald-500/30 bg-emerald-500/[0.02]" : "border-border/80 bg-card"
      }`}
    >
      <div className="absolute right-0 top-0 h-16 w-16 bg-muted/10 blur-xl" />
      <CardContent className="p-5 space-y-4 text-xs">
        {/* Header row */}
        <div className="flex justify-between items-start">
          <span className="font-mono text-muted-foreground text-[0.68rem] font-bold">
            {code} &middot; Sec {section}
          </span>
          <div className="flex gap-1.5 shrink-0">
            <Badge variant="outline" className={`py-0.5 px-2 rounded-xl text-[0.6rem] border ${getTypeStyle()}`}>
              {mode}
            </Badge>
            <Badge variant="outline" className={`py-0.5 px-2 rounded-xl text-[0.6rem] border ${getBadgeStyle()}`}>
              {isCompleted ? "Completed" : isDraft ? "Draft" : status === "POSTPONED" ? "Postponed" : "Planned"}
            </Badge>
          </div>
        </div>

        {/* Title and Unit */}
        <div>
          <span className="font-mono text-[0.65rem] text-primary font-bold block">{unit}</span>
          <h4
            onClick={onClick || (() => onView && onView(plan))}
            className="font-extrabold text-sm leading-snug group-hover:text-primary transition-colors cursor-pointer truncate mt-0.5"
            title={topic}
          >
            {topic}
          </h4>
          <p className="text-[0.68rem] text-muted-foreground mt-0.5 font-bold truncate">
            {name}
          </p>
        </div>

        {/* Timing and Section details */}
        <div className="pt-2 border-t border-border/50 flex flex-wrap justify-between items-center text-[0.65rem] text-muted-foreground font-medium gap-1">
          <span className="flex items-center gap-1">
            <Calendar className="size-3 text-primary/70" /> {date}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3 text-primary/70" /> {duration} Mins
          </span>
        </div>

        {/* Action buttons */}
        <div className="pt-3 border-t border-border/60 flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => (onView ? onView(plan) : onClick && onClick())}
            className="flex-1 rounded-xl text-[0.7rem] h-8 font-semibold"
          >
            <Eye className="size-3 mr-1" /> View
          </Button>

          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(plan)}
              className="rounded-xl text-[0.7rem] h-8 px-2.5"
              title="Edit Lesson Plan"
            >
              <Edit3 className="size-3" />
            </Button>
          )}

          {!isCompleted && onMarkComplete && (
            <Button
              size="sm"
              onClick={() => onMarkComplete(plan)}
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[0.7rem] h-8 font-bold shadow-sm"
            >
              <Check className="size-3 mr-1" /> Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
