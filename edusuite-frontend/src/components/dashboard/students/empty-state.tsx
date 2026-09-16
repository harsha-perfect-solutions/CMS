import { UserMinus } from "lucide-react";

interface EmptyStateProps {
  message?: string;
  description?: string;
}

export function EmptyState({
  message = "No students are currently assigned to your classes.",
  description = "No student records match your teaching assignment or active search/filter criteria.",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-3xl bg-card space-y-3 text-xs">
      <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <UserMinus className="size-6" />
      </div>
      <div>
        <h3 className="text-sm font-extrabold text-foreground">{message}</h3>
        <p className="text-[0.7rem] text-muted-foreground mt-1 leading-normal max-w-sm">
          {description}
        </p>
      </div>
    </div>
  );
}
