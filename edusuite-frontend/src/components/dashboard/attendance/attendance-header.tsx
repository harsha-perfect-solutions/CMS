import { CalendarRange, CalendarDays } from "lucide-react";

interface AttendanceHeaderProps {
  academicYear: string;
  semester: string;
  currentDate: string;
}
export function AttendanceHeader({ academicYear, semester, currentDate }: AttendanceHeaderProps) {
  const cleanSemester = semester ? semester.replace(/^Semester\s*/i, "") : "5";

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4 text-xs">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Attendance Management</h1>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
          <CalendarRange className="size-3.5" /> Academic Year {academicYear} &middot; Semester {cleanSemester}
        </p>
      </div>

      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border bg-muted/30 font-medium text-muted-foreground self-start md:self-auto">
        <CalendarDays className="size-4 text-primary shrink-0" />
        <span>Today: {currentDate}</span>
      </div>
    </div>
  );
}
