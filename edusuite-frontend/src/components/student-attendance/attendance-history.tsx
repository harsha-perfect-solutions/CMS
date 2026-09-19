import React, { useState, useMemo } from "react";
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
  RotateCcw,
  Download,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";

interface AttendanceHistoryProps {
  logs: AttendanceHistoryRecord[];
  rollNumber?: string;
}

export function AttendanceHistory({ logs, rollNumber }: AttendanceHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [subjectFilter, setSubjectFilter] = useState<string>("All");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [viewType, setViewType] = useState<"table" | "timeline">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  const availableSubjects = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((l) => {
      if (l.subjectCode && !map.has(l.subjectCode)) {
        map.set(l.subjectCode, l.subjectName || l.subjectCode);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const s = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        log.date.toLowerCase().includes(s) ||
        (log.subjectCode && log.subjectCode.toLowerCase().includes(s)) ||
        (log.subjectName && log.subjectName.toLowerCase().includes(s)) ||
        (log.facultyName && log.facultyName.toLowerCase().includes(s)) ||
        (log.section && log.section.toLowerCase().includes(s)) ||
        (log.room && log.room.toLowerCase().includes(s));

      const matchesStatus = statusFilter === "All" || log.status === statusFilter;
      const matchesSubject = subjectFilter === "All" || log.subjectCode === subjectFilter;
      const matchesDateFrom = !dateFrom || log.date >= dateFrom;
      const matchesDateTo = !dateTo || log.date <= dateTo;

      return matchesSearch && matchesStatus && matchesSubject && matchesDateFrom && matchesDateTo;
    });
  }, [logs, searchTerm, statusFilter, subjectFilter, dateFrom, dateTo]);

  // Compact metrics derived strictly from the filtered history dataset
  const metrics = useMemo(() => {
    const total = filteredLogs.length;
    const present = filteredLogs.filter((l) => l.status === "Present").length;
    const late = filteredLogs.filter((l) => l.status === "Late").length;
    const absent = filteredLogs.filter((l) => l.status === "Absent").length;
    const attended = present + late;
    const percentage = total > 0 ? Number(((attended / total) * 100).toFixed(1)) : 0;
    return { total, present, late, absent, attended, percentage };
  }, [filteredLogs]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setSubjectFilter("All");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const handleExportFilteredCSV = () => {
    const csvHeader = "Date,Period,Course Code,Course Name,Faculty,Section,Room,Status,Remarks";
    const csvRows = filteredLogs.map((l) =>
      `"${l.date}","${l.period || `Period ${l.periodNumber || 1}`}","${l.subjectCode || ""}","${(l.subjectName || "").replace(/"/g, '""')}","${(l.facultyName || "").replace(/"/g, '""')}","${l.section || "A"}","${l.room || "Room not assigned"}","${l.status}","${(l.remarks || "").replace(/"/g, '""')}"`
    );
    const csvContent = [csvHeader, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ANITS_Attendance_${rollNumber || "Student"}_History_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters = Boolean(
    searchTerm || statusFilter !== "All" || subjectFilter !== "All" || dateFrom || dateTo
  );

  return (
    <div className="space-y-6">
      {/* COMPACT FILTERED SUMMARY METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card p-4 rounded-2xl border border-border/60 shadow-xs flex items-center gap-3">
          <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <CalendarCheck className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Records</p>
            <p className="text-xl font-black text-foreground">{metrics.total}</p>
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/60 shadow-xs flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Present</p>
            <p className="text-xl font-black text-emerald-600">{metrics.present}</p>
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/60 shadow-xs flex items-center gap-3">
          <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Late</p>
            <p className="text-xl font-black text-amber-600">{metrics.late}</p>
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/60 shadow-xs flex items-center gap-3">
          <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Absent</p>
            <p className="text-xl font-black text-rose-600">{metrics.absent}</p>
          </div>
        </div>
      </div>

      {/* TOOLBAR & FILTERS */}
      <div className="p-5 rounded-2xl border border-border/60 bg-card shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Personal Attendance History Ledger
            </h3>
            <p className="text-xs text-muted-foreground">
              Verified classroom check-ins from PostgreSQL &middot; Showing {filteredLogs.length} of {logs.length} sessions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportFilteredCSV}
              className="h-8 rounded-xl text-xs font-semibold gap-1.5"
            >
              <Download className="size-3.5" /> Export Filtered CSV
            </Button>

            {/* VIEW SWITCHER */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
              <button
                onClick={() => setViewType("table")}
                title="Table view"
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewType === "table"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewType("timeline")}
                title="Timeline view"
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewType === "timeline"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* SEARCH */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search code, subject, faculty..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-8 text-xs rounded-xl"
            />
          </div>

          {/* SUBJECT FILTER */}
          <select
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by Subject"
            className="h-8 text-xs px-2.5 rounded-xl border border-border bg-card text-foreground font-medium"
          >
            <option value="All">All Subjects ({availableSubjects.length})</option>
            {availableSubjects.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>

          {/* STATUS FILTER */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by Status"
            className="h-8 text-xs px-2.5 rounded-xl border border-border bg-card text-foreground font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Absent">Absent</option>
          </select>

          {/* DATE FROM */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground font-medium">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter From Date"
              className="h-8 text-xs px-2 rounded-xl border border-border bg-card text-foreground"
            />
          </div>

          {/* DATE TO */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground font-medium">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter To Date"
              className="h-8 text-xs px-2 rounded-xl border border-border bg-card text-foreground"
            />
          </div>

          {/* PAGE SIZE SELECTOR */}
          <select
            value={String(itemsPerPage)}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            aria-label="Items per page"
            className="h-8 text-xs px-2.5 rounded-xl border border-border bg-card text-foreground font-medium ml-auto"
          >
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>

          {/* RESET BUTTON */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground px-2"
            >
              <RotateCcw className="size-3" /> Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* RENDER TABLE OR TIMELINE */}
      {viewType === "table" ? (
        <div className="rounded-2xl border border-border/60 bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Period</th>
                  <th className="p-3.5">Course Code</th>
                  <th className="p-3.5">Course Name</th>
                  <th className="p-3.5">Faculty</th>
                  <th className="p-3.5">Section</th>
                  <th className="p-3.5">Room</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-mono text-foreground font-semibold whitespace-nowrap">{log.date}</td>
                      <td className="p-3.5 font-mono font-bold text-primary whitespace-nowrap">{log.period}</td>
                      <td className="p-3.5 font-mono text-foreground font-bold whitespace-nowrap">{log.subjectCode}</td>
                      <td className="p-3.5 font-semibold text-foreground max-w-xs">{log.subjectName}</td>
                      <td className="p-3.5 text-muted-foreground whitespace-nowrap">{log.facultyName}</td>
                      <td className="p-3.5 font-mono text-muted-foreground whitespace-nowrap">{log.section || "A"}</td>
                      <td className="p-3.5 font-mono text-muted-foreground whitespace-nowrap">{log.room || "Room not assigned"}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        <Badge
                          className={
                            log.status === "Present"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : log.status === "Late"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                : log.status === "Absent"
                                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                                  : "bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                          }
                        >
                          {log.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-muted-foreground max-w-xs truncate">{log.remarks}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-muted-foreground font-medium space-y-1">
                      <p className="text-sm font-semibold text-foreground">No attendance history available yet.</p>
                      <p className="text-xs text-muted-foreground">
                        Attendance records will appear here after your faculty submits class attendance.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Showing {paginatedLogs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–
              {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} records
            </span>

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
              <span className="font-semibold text-foreground">Page {currentPage} of {totalPages}</span>
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
        <div className="p-6 rounded-2xl border border-border/60 bg-card space-y-6 shadow-xs">
          {paginatedLogs.length > 0 ? (
            paginatedLogs.map((log) => (
              <div key={log.id} className="flex gap-4 items-start border-l-2 border-primary/30 pl-4 relative py-1">
                <div
                  className={`absolute -left-[9px] top-2 size-4 rounded-full border-2 border-background ${
                    log.status === "Present"
                      ? "bg-emerald-500"
                      : log.status === "Late"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }`}
                />
                <div className="flex-1 space-y-1 bg-muted/30 p-3.5 rounded-xl border border-border/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-xs text-foreground">
                      {log.subjectName} ({log.subjectCode})
                    </span>
                    <Badge
                      className={
                        log.status === "Present"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : log.status === "Late"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                      }
                    >
                      {log.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    <span>Date: {log.date}</span>
                    <span>Period: {log.period}</span>
                    <span>Faculty: {log.facultyName}</span>
                    <span>Section: {log.section || "A"}</span>
                    <span>Room: {log.room || "Room not assigned"}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground space-y-1">
              <p className="text-sm font-semibold text-foreground">No attendance history available yet.</p>
              <p className="text-xs text-muted-foreground">
                Attendance records will appear here after your faculty submits class attendance.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
