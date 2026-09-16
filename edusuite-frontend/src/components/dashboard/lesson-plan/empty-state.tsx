import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreatePlan?: () => void;
  message?: string;
  subMessage?: string;
}

export function EmptyState({
  onCreatePlan,
  message = "No lesson plans available",
  subMessage = "No lesson plans have been created for your assigned subjects yet.",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-3xl bg-card space-y-4">
      <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <FileText className="size-6" />
      </div>
      <div>
        <h3 className="text-sm font-extrabold text-foreground">{message}</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-normal max-w-sm">
          {subMessage}
        </p>
      </div>
      {onCreatePlan && (
        <Button
          onClick={onCreatePlan}
          className="rounded-xl bg-brand-gradient shadow-glow text-xs h-9 font-bold"
        >
          <Plus className="size-3.5 mr-1.5" /> Create Lesson Plan
        </Button>
      )}
    </div>
  );
}

