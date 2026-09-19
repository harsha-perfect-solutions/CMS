import { Printer, Download, RefreshCw, Calendar, UserCheck, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { FacultyProfileHeader } from "@/services/FacultyTimetableService";

interface TimetableHeaderProps {
  academicYear: string;
  semester: string | number;
  faculty?: FacultyProfileHeader | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onDownloadPdf?: () => void;
}

export function TimetableHeader({
  academicYear,
  semester,
  faculty,
  onRefresh,
  onDownloadPdf,
}: TimetableHeaderProps) {
  const currentDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const handlePrint = () => {
    toast.success("Preparing timetable print layout...", {
      description: `Printing timetable for ${faculty?.name || "Faculty"}.`,
    });
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleDownload = () => {
    if (onDownloadPdf) {
      onDownloadPdf();
      return;
    }
    toast.success("Downloading Timetable PDF...", {
      description: `Preparing print layout for ${faculty?.name || "Faculty"}.`,
    });
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Timetable Management</h1>
          {faculty && (
            <span className="inline-flex items-center gap-1 text-[0.7rem] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
              <UserCheck className="size-3" /> Personal Timetable
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 mt-1 font-medium">
          <Calendar className="size-3.5" />
          <span>Academic Year {academicYear}</span>
          <span>&middot;</span>
          <span>Semester {semester}</span>
          <span>&middot;</span>
          <span>{currentDate}</span>
          {faculty && (
            <>
              <span>&middot;</span>
              <span className="font-bold text-foreground flex items-center gap-1">
                <Building2 className="size-3 text-primary/70" /> {faculty.name} ({faculty.rollNumber}) &middot; {faculty.department} &middot; {faculty.designation}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 print:hidden">
        <Button
          onClick={onRefresh}
          variant="outline"
          className="rounded-xl cursor-pointer hover:bg-muted text-xs h-9"
          title="Refresh timetable from server"
        >
          <RefreshCw className="size-3.5 mr-2" /> Refresh
        </Button>
        <Button
          onClick={handlePrint}
          variant="outline"
          className="rounded-xl cursor-pointer hover:bg-muted text-xs h-9"
          title="Print personal timetable"
        >
          <Printer className="size-3.5 mr-2" /> Print
        </Button>
        <Button
          onClick={handleDownload}
          className="rounded-xl bg-brand-gradient shadow-glow cursor-pointer text-xs h-9"
          title="Download personal timetable PDF"
        >
          <Download className="size-3.5 mr-2" /> Download PDF
        </Button>
      </div>
    </div>
  );
}
