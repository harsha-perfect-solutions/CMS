import { History, Calendar, Clock, Users, BookOpen, Edit3 } from "lucide-react";
import { Panel } from "@/components/dashboard/panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface AttendanceHistorySessionItem {
  id: string;
  timetableId: string;
  date: string;
  periodNumber: number;
  period: number;
  subject: string;
  subjectCode: string;
  subjectName: string;
  section: string;
  time?: string;
  room?: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  submittedTime?: string;
}

interface AttendanceHistoryProps {
  history: AttendanceHistorySessionItem[];
  isLoading?: boolean;
  totalCount?: number;
  onEditSession?: (session: AttendanceHistorySessionItem) => void;
}

export function AttendanceHistory({ history = [], isLoading = false, totalCount, onEditSession }: AttendanceHistoryProps) {
  if (isLoading) {
    return (
      <Panel
        title="Attendance Submission History Log"
        description="Chronological log of verified class sessions submitted to PostgreSQL"
        className="border border-border bg-card rounded-2xl p-6 shadow-card text-xs text-center"
      >
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Loading session history...</p>
        </div>
      </Panel>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Panel
        title="Attendance Submission History Log"
        description="Chronological log of verified class sessions submitted to PostgreSQL"
        className="border border-border bg-card rounded-2xl p-6 shadow-card text-xs"
      >
        <div className="py-12 text-center border border-dashed rounded-2xl text-muted-foreground space-y-2">
          <History className="size-8 mx-auto text-muted-foreground/50" />
          <p className="font-semibold text-foreground">No attendance records available.</p>
          <p className="text-xs">You haven't submitted attendance for any sessions yet.</p>
        </div>
      </Panel>
    );
  }

  const count = totalCount !== undefined ? totalCount : history.length;
  const countLabel = totalCount !== undefined && totalCount > history.length
    ? `${count} sessions · Showing ${history.length}`
    : `${count} session${count !== 1 ? "s" : ""}`;

  return (
    <Panel
      title="Attendance Submission History Log"
      description={`Chronological log of verified class sessions submitted by you (${countLabel})`}
      className="border border-border bg-card rounded-2xl p-6 shadow-card text-xs"
    >
      <div className="overflow-x-auto max-w-full rounded-2xl border">
        <Table className="min-w-[700px] text-xs">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold">Subject</TableHead>
              <TableHead className="font-bold text-center">Section</TableHead>
              <TableHead className="font-bold text-center">Period</TableHead>
              <TableHead className="font-bold text-center text-emerald-600">Present</TableHead>
              <TableHead className="font-bold text-center text-rose-600">Absent</TableHead>
              <TableHead className="font-bold text-center text-amber-600">Late</TableHead>
              <TableHead className="font-bold text-center">Total</TableHead>
              <TableHead className="font-bold text-right">Attendance Rate</TableHead>
              <TableHead className="font-bold text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((item) => {
              const rate = item.total > 0 ? Math.round(((item.present + item.late) / item.total) * 100) : 0;
              return (
                <TableRow key={item.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono font-medium text-foreground whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-primary/70" />
                      {item.date}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-foreground">{item.subject}</div>
                    {item.room && <div className="text-[0.65rem] text-muted-foreground">Room: {item.room}</div>}
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    <Badge variant="outline" className="text-[0.65rem] font-bold">
                      {item.section}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-primary">
                    Period {item.periodNumber || item.period}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-emerald-600">
                    {item.present}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-rose-600">
                    {item.absent}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-amber-600">
                    {item.late}
                  </TableCell>
                  <TableCell className="text-center font-mono font-extrabold text-foreground">
                    {item.total}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    <Badge
                      variant="outline"
                      className={`text-[0.65rem] font-bold ${
                        rate >= 75
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                      }`}
                    >
                      {rate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {onEditSession ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditSession(item)}
                        className="h-6 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 rounded-md gap-1 cursor-pointer"
                      >
                        <Edit3 className="size-3" /> Edit
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-mono">Verified</span>
                    )}
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
