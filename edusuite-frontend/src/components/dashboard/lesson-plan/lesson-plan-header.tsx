import { FileText, Printer, FileDown, RefreshCw, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LessonPlanHeaderProps {
  academicYear: string;
  semester: string;
  departmentName?: string;
  facultyName?: string;
  isRefreshing?: boolean;
  onRefresh: () => void;
  onPrint: () => void;
  onExportPdf: () => void;
}

export function LessonPlanHeader({
  academicYear,
  semester,
  departmentName,
  facultyName,
  isRefreshing = false,
  onRefresh,
  onPrint,
  onExportPdf,
}: LessonPlanHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4 text-xs">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Lesson Plan Management</h1>
          {departmentName && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <Building2 className="size-3" /> {departmentName}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1.5 font-medium">
          <FileText className="size-3.5" /> Academic Year {academicYear} &middot; {semester}
          {facultyName && (
            <>
              <span className="text-muted-foreground/50">&middot;</span>
              <span className="text-foreground/80 font-medium">Faculty: {facultyName}</span>
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          onClick={onRefresh}
          disabled={isRefreshing}
          variant="outline"
          className="rounded-xl cursor-pointer hover:bg-muted text-xs h-9"
        >
          <RefreshCw className={`size-3.5 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
        <Button
          onClick={onPrint}
          variant="outline"
          className="rounded-xl cursor-pointer hover:bg-muted text-xs h-9"
        >
          <Printer className="size-3.5 mr-2" /> Print
        </Button>
        <Button
          onClick={onExportPdf}
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer text-xs h-9"
        >
          <FileDown className="size-3.5 mr-2" /> Export PDF
        </Button>
      </div>
    </div>
  );
}
