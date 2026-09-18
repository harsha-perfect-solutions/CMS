import React, { useState } from "react";
import { SubjectAttendanceItem } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface SubjectAttendanceProps {
  subjects: SubjectAttendanceItem[];
  onSelectSubject: (subject: SubjectAttendanceItem) => void;
}

export function SubjectAttendance({ subjects, onSelectSubject }: SubjectAttendanceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredSubjects = subjects.filter((sub) => {
    const matchesSearch =
      sub.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.facultyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage) || 1;
  const paginatedSubjects = filteredSubjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">

      {/* HEADER & FILTERS BAR */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#0b193c] dark:text-blue-400" /> Subject Attendance Register
          </h3>
          <p className="text-xs text-slate-500">Track subject attendance percentages, conduct logs & mandatory cutoffs</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* SEARCH */}
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search subject code or name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-8 text-xs rounded-xl"
            />
          </div>

          {/* STATUS FILTER */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {(["All", "Above 85%", "75-85%", "Below 75%"] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === st
                    ? "bg-white dark:bg-slate-900 text-[#0b193c] dark:text-blue-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SUBJECT ATTENDANCE TABLE */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                <th className="p-3.5">Subject Code</th>
                <th className="p-3.5">Subject Name</th>
                <th className="p-3.5">Faculty</th>
                <th className="p-3.5">Conducted</th>
                <th className="p-3.5">Present</th>
                <th className="p-3.5">Absent</th>
                <th className="p-3.5">Late</th>
                <th className="p-3.5">Attendance %</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Classes Needed (75%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedSubjects.length > 0 ? (
                paginatedSubjects.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => onSelectSubject(sub)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="p-3.5 font-mono font-bold text-[#0b193c] dark:text-blue-400">{sub.subjectCode}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white max-w-xs">{sub.subjectName}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        {sub.facultyAvatar ? (
                          <img src={sub.facultyAvatar} alt={sub.facultyName} className="h-6 w-6 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-[#0b193c]/10 text-[#0b193c] dark:text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {sub.facultyName ? sub.facultyName.charAt(0).toUpperCase() : "F"}
                          </div>
                        )}
                        <span className="truncate max-w-[140px]">{sub.facultyName}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200">{sub.conducted}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-600">{sub.present ?? sub.attended}</td>
                    <td className="p-3.5 font-mono font-bold text-red-500">{sub.absent}</td>
                    <td className="p-3.5 font-mono text-amber-600 font-semibold">{sub.late ?? 0}</td>
                    <td className="p-3.5 font-mono font-extrabold text-sm">
                      <span className={sub.attendancePct >= 85 ? "text-emerald-600" : sub.attendancePct >= 75 ? "text-amber-500" : "text-red-600"}>
                        {sub.attendancePct}%
                      </span>
                    </td>
                    <td className="p-3.5">
                      <Badge
                        className={
                          sub.status === "Above 85%"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : sub.status === "75-85%"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : "bg-red-500/10 text-red-600 border-red-500/20"
                        }
                      >
                        {sub.status === "Above 85%" ? "GOOD / ELIGIBLE" : sub.status === "75-85%" ? "WARNING" : "LOW ATTENDANCE"}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {sub.classesNeeded75 > 0 ? (
                        <span className="text-red-600 font-bold">{sub.classesNeeded75} Classes</span>
                      ) : (
                        <span className="text-emerald-600">Achieved ✓</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">
                    No attendance records available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {paginatedSubjects.length} of {filteredSubjects.length} subjects</span>

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
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
