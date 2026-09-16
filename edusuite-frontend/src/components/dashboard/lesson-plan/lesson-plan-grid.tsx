import { useState } from "react";
import { LessonPlanCard, type AnyLessonPlan } from "./lesson-plan-card";
import { EmptyState } from "./empty-state";
import { LayoutGrid, List, Eye, Edit3, Check, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface LessonPlanGridProps {
  plans: AnyLessonPlan[];
  onSelectPlan?: (plan: AnyLessonPlan) => void;
  onView?: (plan: AnyLessonPlan) => void;
  onEdit?: (plan: AnyLessonPlan) => void;
  onMarkComplete?: (plan: AnyLessonPlan) => void;
  onCreatePlan?: () => void;
}

export function LessonPlanGrid({
  plans,
  onSelectPlan,
  onView,
  onEdit,
  onMarkComplete,
  onCreatePlan,
}: LessonPlanGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const handleView = (plan: AnyLessonPlan) => {
    if (onView) onView(plan);
    else if (onSelectPlan) onSelectPlan(plan);
  };

  if (plans.length === 0) {
    return <EmptyState onCreatePlan={onCreatePlan} />;
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle Bar */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground font-semibold">
          Showing <strong className="text-foreground">{plans.length}</strong> lesson plans
        </span>

        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className={`h-7 px-2.5 rounded-lg text-xs font-bold ${viewMode === "grid" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"}`}
          >
            <LayoutGrid className="size-3.5 mr-1" /> Cards
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className={`h-7 px-2.5 rounded-lg text-xs font-bold ${viewMode === "table" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"}`}
          >
            <List className="size-3.5 mr-1" /> Table
          </Button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <LessonPlanCard
              key={p.id}
              plan={p}
              onClick={() => handleView(p)}
              onView={() => handleView(p)}
              onEdit={onEdit ? () => onEdit(p) : undefined}
              onMarkComplete={onMarkComplete ? () => onMarkComplete(p) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border bg-card shadow-card">
          <Table className="min-w-[850px] text-xs">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-bold">Subject</TableHead>
                <TableHead className="font-bold">Code</TableHead>
                <TableHead className="font-bold">Unit</TableHead>
                <TableHead className="font-bold">Topic</TableHead>
                <TableHead className="text-center font-bold">Sec</TableHead>
                <TableHead className="font-bold">Date & Time</TableHead>
                <TableHead className="text-center font-bold">Duration</TableHead>
                <TableHead className="text-center font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => {
                const isCompleted = plan.status === "COMPLETED" || plan.status === "Completed";
                const isDraft = plan.status === "DRAFT" || plan.status === "Pending";

                return (
                  <TableRow key={plan.id} className="hover:bg-muted/20">
                    <TableCell className="font-semibold text-foreground max-w-[160px] truncate">
                      {plan.courseName || plan.name || "Subject"}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground font-bold">
                      {plan.courseCode || plan.code}
                    </TableCell>
                    <TableCell className="font-medium text-muted-foreground whitespace-nowrap">
                      {plan.unitTitle || (plan.unitNumber ? `Unit ${plan.unitNumber}` : "Unit 1")}
                    </TableCell>
                    <TableCell className="font-bold text-foreground max-w-[200px] truncate" title={plan.topic}>
                      {plan.topic}
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {plan.section || "A"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground font-medium">
                      {plan.plannedDate || "Scheduled"}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {plan.durationMinutes || 60}m
                    </TableCell>
                    <TableCell className="text-center">
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
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(plan)}
                          className="h-7 px-2 text-xs font-bold text-primary hover:text-primary"
                        >
                          <Eye className="size-3 mr-1" /> View
                        </Button>

                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(plan)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Edit3 className="size-3" />
                          </Button>
                        )}

                        {!isCompleted && onMarkComplete && (
                          <Button
                            size="sm"
                            onClick={() => onMarkComplete(plan)}
                            className="h-7 px-2 text-[0.68rem] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                          >
                            <Check className="size-3 mr-0.5" /> Done
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
