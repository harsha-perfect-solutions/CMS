import { Users, FileSpreadsheet, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StudentHeaderProps {
  academicYear?: string;
  semester?: string;
  isRefreshing?: boolean;
  onRefresh: () => void;
  onExport?: () => void;
}

export function StudentHeader({
  academicYear = "2026-27",
  semester = "Semester 5",
  isRefreshing = false,
  onRefresh,
  onExport,
}: StudentHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4 text-xs">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">My Classes &amp; Students</h1>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
          <Users className="size-3.5 text-primary" /> View and manage students enrolled in your assigned classes. &middot; Academic Year {academicYear} &middot; {semester}
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          onClick={onRefresh}
          variant="outline"
          disabled={isRefreshing}
          className="rounded-xl cursor-pointer hover:bg-muted text-xs h-9"
        >
          <RefreshCw className={`size-3.5 mr-2 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
        <Button
          onClick={onExport}
          className="rounded-xl bg-brand-gradient shadow-glow cursor-pointer text-xs h-9 font-bold"
        >
          <FileSpreadsheet className="size-3.5 mr-2" /> Export Roster
        </Button>
      </div>
    </div>
  );
}
