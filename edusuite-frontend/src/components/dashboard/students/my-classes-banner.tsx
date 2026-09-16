import { BookOpen, MapPin, Clock, Users, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface AssignedClass {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  department: string;
  semester: number;
  section: string;
  cleanSection: string;
  classCode: string;
  displayName: string;
  periodsPerWeek: number;
  roomNo: string;
  isLab: boolean;
  studentCount?: number;
}

interface MyClassesBannerProps {
  classes: AssignedClass[];
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
}

export function MyClassesBanner({
  classes,
  selectedClassId,
  onSelectClass,
}: MyClassesBannerProps) {
  if (classes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="size-3.5" />
          </span>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
            MY CLASSES
          </h2>
          <Badge variant="secondary" className="text-[0.65rem] font-bold px-2 py-0">
            {classes.length} Assigned {classes.length === 1 ? "Subject" : "Subjects"}
          </Badge>
        </div>

        {selectedClassId !== "ALL" && (
          <button
            type="button"
            onClick={() => onSelectClass("ALL")}
            className="text-[0.68rem] text-primary hover:underline font-bold cursor-pointer"
          >
            Show All Classes ({classes.length})
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {/* "All My Classes" option card */}
        <Card
          onClick={() => onSelectClass("ALL")}
          className={`border transition-all duration-200 cursor-pointer overflow-hidden py-0 shadow-sm hover:shadow-md ${
            selectedClassId === "ALL"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border/70 hover:border-border hover:bg-muted/30"
          }`}
        >
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[0.62rem] font-black uppercase tracking-wider text-muted-foreground">
                  Overview
                </span>
                <h3 className="font-extrabold text-xs text-foreground mt-0.5">
                  All My Classes
                </h3>
              </div>
              {selectedClassId === "ALL" && (
                <CheckCircle2 className="size-4 text-primary shrink-0" />
              )}
            </div>
            <p className="text-[0.65rem] text-muted-foreground flex items-center gap-1.5">
              <Users className="size-3 text-primary/70" /> Consolidated roster across all sections
            </p>
          </CardContent>
        </Card>

        {/* Assigned Class Cards */}
        {classes.map((cls) => {
          const isSelected = selectedClassId === cls.id || selectedClassId === cls.classCode;
          return (
            <Card
              key={cls.id}
              onClick={() => onSelectClass(cls.id)}
              className={`border transition-all duration-200 cursor-pointer overflow-hidden py-0 shadow-sm hover:shadow-md ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border/70 hover:border-border hover:bg-muted/30"
              }`}
            >
              <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[0.58rem] font-black tracking-wider bg-primary/10 text-primary font-mono uppercase">
                      {cls.classCode}
                    </span>
                    <h3 className="font-extrabold text-xs text-foreground mt-1 truncate" title={cls.courseName}>
                      {cls.courseName}
                    </h3>
                    <p className="text-[0.62rem] font-mono text-muted-foreground">
                      {cls.courseCode}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                  )}
                </div>

                <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-1 text-[0.63rem] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3 text-primary/60" />
                    {cls.periodsPerWeek} {cls.periodsPerWeek === 1 ? "period" : "periods"}/wk
                  </span>
                  <span className="flex items-center gap-1 truncate" title={cls.roomNo}>
                    <MapPin className="size-3 text-primary/60 shrink-0" />
                    {cls.roomNo}
                  </span>
                </div>

                {cls.studentCount !== undefined && cls.studentCount > 0 && (
                  <div className="pt-1 flex items-center gap-1 text-[0.6rem] font-bold text-primary">
                    <Users className="size-3" />
                    {cls.studentCount} enrolled students
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
