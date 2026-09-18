import React, { useState } from "react";
import { AttendanceHistoryRecord } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Clock,
  Search,
  List,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

interface AttendanceHistoryProps {
  logs: AttendanceHistoryRecord[];
}

export function AttendanceHistory({ logs }: AttendanceHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [modeFilter, setModeFilter] = useState<string>("All");
  const [viewType, setViewType] = useState<"table" | "timeline">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.facultyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || log.status === statusFilter;
    const matchesMode = modeFilter === "All" || log.mode === modeFilter;
    return matchesSearch && matchesStatus && matchesMode;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">

      {/* TOOLBAR & FILTERS */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#0b193c] dark:text-blue-400" /> Attendance History & Check-in Ledger
          </h3>
          <p className="text-xs text-slate-500">Full audit log of classroom check-in timestamps & status</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* SEARCH */}
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search date or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs rounded-xl"
            />
          </div>

          {/* STATUS FILTER */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 text-xs px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Late">Late</option>
            <option value="Medical Leave">Medical Leave</option>
            <option value="On Duty">On Duty</option>
          </select>

          {/* VIEW SWITCHER */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewType("timeline")}
              className={`p-1.5 rounded-lg text-xs font-semibold ${
                viewType === "timeline"
                  ? "bg-white dark:bg-slate-900 text-[#0b193c] dark:text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* RENDER TABLE OR TIMELINE */}
      {viewType === "table" ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Day</th>
                  <th className="p-3.5">Period</th>
                  <th className="p-3.5">Subject</th>
                  <th className="p-3.5">Faculty</th>
                  <th className="p-3.5">Room</th>
                  <th className="p-3.5">Time</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300 font-semibold">{log.date}</td>
                      <td className="p-3.5 text-slate-500">{log.day}</td>
                      <td className="p-3.5 font-mono font-bold text-[#0b193c] dark:text-blue-400">{log.period}</td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white max-w-xs">
                        <div>{log.subjectName}</div>
                        <span className="text-[10px] text-slate-400 font-mono font-normal">{log.subjectCode}</span>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">{log.facultyName}</td>
                      <td className="p-3.5 font-mono text-slate-500">{log.room}</td>
                      <td className="p-3.5 font-mono text-emerald-600 font-bold">{log.timeSlot}</td>
                      <td className="p-3.5">
                        <Badge
                          className={
                            log.status === "Present"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : log.status === "Late"
                                ? "bg-amber-500/10 text-amber-600"
                                : log.status === "Absent"
                                  ? "bg-red-500/10 text-red-600"
                                  : "bg-purple-500/10 text-purple-600"
                          }
                        >
                          {log.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-slate-500 max-w-xs truncate">{log.remarks}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">
                      No attendance records available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {paginatedLogs.length} of {filteredLogs.length} logs</span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="h-7 w-7 p-0 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Page {currentPage} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="h-7 w-7 p-0 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* TIMELINE VIEW */
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6 shadow-sm">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Chronological Class Timeline View</h4>
          {paginatedLogs.length > 0 ? (
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-6 pl-6">
              {paginatedLogs.map((log) => (
                <div key={log.id} className="relative group">
                  <div
                    className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                      log.status === "Present"
                        ? "bg-emerald-500"
                        : log.status === "Late"
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                  />
                  <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[#0b193c] dark:text-blue-400 font-bold">{log.date} &middot; {log.timeSlot}</span>
                      <Badge
                        className={
                          log.status === "Present"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : log.status === "Late"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-red-500/10 text-red-600"
                        }
                      >
                        {log.status}
                      </Badge>
                    </div>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">{log.subjectCode} - {log.subjectName}</h5>
                    <p className="text-xs text-slate-500">Faculty: {log.facultyName} &middot; Room: {log.room}</p>
                    <p className="text-[11px] text-slate-600 italic">"{log.remarks}"</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 font-medium">
              No attendance records available yet.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
