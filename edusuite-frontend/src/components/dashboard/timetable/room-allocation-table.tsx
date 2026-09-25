import { MapPin, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RoomAllocation } from "@/services/FacultyTimetableService";

interface RoomAllocationTableProps {
  allocations: RoomAllocation[];
}

export function RoomAllocationTable({ allocations }: RoomAllocationTableProps) {
  return (
    <div className="border border-border/70 bg-card rounded-2xl p-4 md:p-5 shadow-xs space-y-3">
      <div>
        <h4 className="font-display font-bold text-sm text-foreground">
          Assigned Venues & Room Allocations
        </h4>
        <p className="text-xs text-muted-foreground">
          Classrooms, auditoriums, and laboratories mapped to your teaching assignments in MasterTimetable
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/50">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-bold">Course / Subject</TableHead>
              <TableHead className="w-[120px] font-bold">Room Number</TableHead>
              <TableHead className="w-[140px] font-bold">Building</TableHead>
              <TableHead className="w-[90px] font-bold">Type</TableHead>
              <TableHead className="w-[100px] text-right font-bold">Capacity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((alloc, idx) => (
              <TableRow key={idx} className="hover:bg-muted/30">
                <TableCell className="font-semibold text-xs text-foreground">
                  {alloc.subject}{" "}
                  <span className="font-mono text-muted-foreground text-[0.68rem]">
                    ({alloc.code || "—"})
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3 text-primary/70" />
                    <span>{alloc.room || "Room not assigned"}</span>
                  </span>
                </TableCell>
                <TableCell className="text-xs font-medium text-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="size-3 text-primary/60" />
                    <span>{alloc.building || "Main Academic Block"}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[0.6rem] font-bold py-0.5 px-2 rounded-lg border ${
                      alloc.type === "Lab"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                    }`}
                  >
                    {alloc.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs font-medium text-right text-muted-foreground">
                  {alloc.capacity} Seats
                </TableCell>
              </TableRow>
            ))}
            {allocations.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                  No rooms or laboratories allocated.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
