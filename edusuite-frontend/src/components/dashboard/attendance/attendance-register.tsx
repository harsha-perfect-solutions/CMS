import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/dashboard/panel";

export interface RegisterStudentItem {
  id?: string;
  rollNumber: string;
  name: string;
  department?: string;
  semester?: number;
  section?: string;
  totalClasses?: number;
  attendedClasses?: number;
  percentage?: number;
  status?: string;
}

interface AttendanceRegisterProps {
  students?: RegisterStudentItem[];
  subject?: string;
  section?: string;
}

export function AttendanceRegister({ students = [], subject, section }: AttendanceRegisterProps) {
  if (!students || students.length === 0) {
    return (
      <Panel
        title={`Student Attendance Register ${subject && subject !== "ALL" ? `— ${subject}` : ""}`}
        description="Consolidated student attendance percentage and academic roster"
        className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
      >
        <div className="p-8 text-center border border-dashed rounded-2xl text-muted-foreground">
          No students currently found for this section or subject filter.
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title={`Student Attendance Register ${subject && subject !== "ALL" ? `— ${subject}` : ""} ${
        section && section !== "ALL" ? `(${section})` : ""
      }`}
      description="Consolidated student attendance percentages, session counts, and eligibility indicators"
      className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
    >
      <div className="overflow-x-auto max-w-full rounded-2xl border">
        <Table className="min-w-[700px] text-xs">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-bold">Roll Number</TableHead>
              <TableHead className="font-bold">Student Name</TableHead>
              <TableHead className="font-bold">Section</TableHead>
              <TableHead className="text-center font-bold">Total Classes</TableHead>
              <TableHead className="text-center font-bold">Attended</TableHead>
              <TableHead className="text-center font-bold">Attendance %</TableHead>
              <TableHead className="text-right font-bold">Eligibility</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((stud) => {
              const hasRecords = (stud.totalClasses ?? 0) > 0;
              const pct = stud.percentage ?? (hasRecords ? Math.round(((stud.attendedClasses || 0) / (stud.totalClasses || 1)) * 100) : 0);
              const isShortage = hasRecords && pct < 75;

              return (
                <TableRow key={stud.rollNumber} className="hover:bg-muted/20">
                  <TableCell className="font-mono font-bold text-foreground">
                    {stud.rollNumber}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {stud.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-medium">
                    {stud.section || "A"}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {stud.totalClasses ?? 0}
                  </TableCell>
                  <TableCell className="text-center font-mono font-semibold text-foreground">
                    {stud.attendedClasses ?? 0}
                  </TableCell>
                  <TableCell className="text-center font-mono font-extrabold">
                    <span className={!hasRecords ? "text-muted-foreground" : isShortage ? "text-rose-600" : "text-emerald-600"}>
                      {!hasRecords ? "N/A" : `${pct}%`}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={`text-[0.62rem] font-bold ${
                        !hasRecords
                          ? "bg-muted/30 text-muted-foreground border-border/50"
                          : isShortage
                          ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      }`}
                    >
                      {!hasRecords ? "No History" : isShortage ? "Shortage Warning" : "Eligible"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Panel>
  );
}
