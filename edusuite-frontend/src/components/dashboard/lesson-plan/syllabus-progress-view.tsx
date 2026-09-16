import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, CheckCircle2, Clock, Layers, Sparkles } from "lucide-react";

export interface SyllabusUnitItem {
  unitNumber: number;
  title: string;
  totalTopics: number;
  completedTopics: number;
  percentage: number;
  status: string;
}

export interface SyllabusCourseProgress {
  courseId: string;
  courseCode: string;
  courseName: string;
  sections: string[];
  totalPlans: number;
  completedPlans: number;
  coveragePct: number;
  units: SyllabusUnitItem[];
}

interface SyllabusProgressViewProps {
  progressList: SyllabusCourseProgress[];
}

export function SyllabusProgressView({ progressList }: SyllabusProgressViewProps) {
  if (progressList.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed rounded-3xl bg-card space-y-3">
        <BookOpen className="size-10 text-muted-foreground opacity-40 mx-auto" />
        <h4 className="text-sm font-bold text-foreground">No syllabus progress data available</h4>
        <p className="text-xs text-muted-foreground">
          Create lesson plans for your assigned courses to track unit-by-unit syllabus completion.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      {progressList.map((course) => (
        <Card key={course.courseId} className="border border-border/80 rounded-3xl shadow-card bg-card overflow-hidden">
          <CardContent className="p-5 space-y-4">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[0.68rem] font-bold text-primary px-2 py-0.5 rounded-lg bg-primary/10">
                    {course.courseCode}
                  </span>
                  <span className="text-[0.68rem] text-muted-foreground font-bold">
                    Sections: {course.sections.join(", ")}
                  </span>
                </div>
                <h3 className="font-extrabold text-sm text-foreground mt-1">{course.courseName}</h3>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="text-right">
                  <span className="text-xs font-black text-foreground">{course.completedPlans} / {course.totalPlans}</span>
                  <span className="text-[0.65rem] text-muted-foreground block font-medium">Topics Completed</span>
                </div>
                <div className="px-3 py-1.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-black text-sm">
                  {course.coveragePct}%
                </div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[0.68rem] font-bold text-muted-foreground">
                <span>Overall Syllabus Coverage</span>
                <span className="text-foreground">{course.coveragePct}% Completed</span>
              </div>
              <Progress value={course.coveragePct} className="h-2 bg-primary/10 [&>div]:bg-brand-gradient" />
            </div>

            {/* Units 1-5 Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2">
              {course.units.map((unit) => {
                const isComplete = unit.percentage === 100 && unit.totalTopics > 0;
                const isInProgress = unit.percentage > 0 && unit.percentage < 100;

                return (
                  <div
                    key={unit.unitNumber}
                    className={`p-3 rounded-2xl border transition-all ${
                      isComplete
                        ? "bg-emerald-500/[0.04] border-emerald-500/20"
                        : isInProgress
                        ? "bg-amber-500/[0.04] border-amber-500/20"
                        : "bg-muted/20 border-border/60"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-[0.65rem] font-bold text-muted-foreground">
                        Unit {unit.unitNumber}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[0.6rem] py-0 px-1.5 rounded-lg border font-bold ${
                          isComplete
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : isInProgress
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : "bg-muted text-muted-foreground border-transparent"
                        }`}
                      >
                        {unit.status}
                      </Badge>
                    </div>

                    <p className="font-bold text-foreground text-[0.72rem] line-clamp-1 truncate" title={unit.title}>
                      {unit.title}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[0.62rem] text-muted-foreground font-medium">
                      <span>{unit.completedTopics}/{unit.totalTopics} Topics</span>
                      <span className="font-bold text-foreground">{unit.percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
