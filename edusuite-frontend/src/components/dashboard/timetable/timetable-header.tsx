import { Printer, Download, RefreshCw, Calendar, UserCheck, Building2, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    toast.success("Preparing timetable print view...", {
      description: `Printing timetable for ${faculty?.name || "Faculty"}.`,
    });
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleDownload = () => {
    if (onDownloadPdf) {
      onDownloadPdf();
      return;
    }
    toast.success("Generating print-ready PDF...", {
      description: `Use Save as PDF for ${faculty?.name || "Faculty"}.`,
    });
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-3">
      {/* ── Breadcrumb: Home > Faculty Portal > My Timetable ── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground print:hidden">
        <span className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer">
          <Home className="size-3.5" />
          <span>Home</span>
        </span>
        <ChevronRight className="size-3 text-muted-foreground/60" />
        <span className="hover:text-foreground transition-colors">Faculty Portal</span>
        <ChevronRight className="size-3 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">My Timetable</span>
      </nav>

      {/* ── Main Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
              My Timetable
            </h1>
            <Badge variant="outline" className="text-[0.7rem] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border-primary/25">
              <UserCheck className="size-3 mr-1" /> Personal Timetable
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">
            Personal faculty teaching schedule
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-2 font-medium">
            <span className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-md text-foreground text-[0.72rem] font-semibold border border-border/40">
              <Calendar className="size-3 text-primary/70" /> Academic Year: {academicYear}
            </span>
            <span>&middot;</span>
            <span className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-md text-foreground text-[0.72rem] font-semibold border border-border/40">
              Faculty: {faculty ? `${faculty.name}${faculty.rollNumber ? ` (${faculty.rollNumber})` : ""}` : "Authenticated Faculty"}
            </span>
            <span>&middot;</span>
            <span className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-md text-foreground text-[0.72rem] font-semibold border border-border/40">
              <Building2 className="size-3 text-primary/70" /> Department: {faculty?.department || "CSE"}
            </span>
            {semester && semester !== "—" && (
              <>
                <span>&middot;</span>
                <span className="text-[0.72rem]">Semester: {semester}</span>
              </>
            )}
            <span>&middot;</span>
            <span className="text-[0.72rem]">{currentDate}</span>
          </div>
        </div>

        {/* ── Actions: Refresh, Print, Download PDF ── */}
        <div className="flex items-center gap-2 shrink-0 print:hidden self-start md:self-auto">
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            className="rounded-xl cursor-pointer hover:bg-muted text-xs h-9 gap-1.5"
            title="Refresh timetable from PostgreSQL"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="rounded-xl cursor-pointer hover:bg-muted text-xs h-9 gap-1.5"
            title="Print personal timetable"
          >
            <Printer className="size-3.5" /> Print
          </Button>
          <Button
            onClick={handleDownload}
            size="sm"
            className="rounded-xl bg-brand-gradient shadow-glow cursor-pointer text-xs h-9 text-white font-bold gap-1.5"
            title="Download personal timetable PDF"
          >
            <Download className="size-3.5" /> Download PDF
          </Button>
        </div>
      </div>

      {/* ── Print-only Institutional Banner ── */}
      <div className="hidden print:block text-center border-b border-black pb-3 mb-4 space-y-1">
        <h2 className="text-lg font-black uppercase tracking-wider text-black">
          Anil Neerukonda Institute of Technology and Sciences (ANITS)
        </h2>
        <p className="text-xs font-semibold text-black">
          Faculty Teaching Schedule &middot; Academic Year {academicYear}
        </p>
        <p className="text-[0.7rem] text-black">
          Faculty: <strong>{faculty?.name || "Faculty"}</strong> ({faculty?.rollNumber || "FAC"}) &middot; Department of {faculty?.department || "CSE"} &middot; {semester}
        </p>
      </div>
    </div>
  );
}
