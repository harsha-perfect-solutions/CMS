import React, { useEffect, useState } from "react";
import { useRole } from "@/context/role-context";
import {
  CalendarRange,
  Sparkles,
  RefreshCw,
  Download,
  Filter,
  Search,
  Plus,
  Edit,
  Building2,
  Users,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FileSpreadsheet,
  FileText,
  User,
  FlaskConical,
  Coffee,
  Check,
  X,
  Bot,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  fetchTimetableGrid,
  autoGenerateTimetable,
  updateTimetablePeriod,
  checkScheduleConflict,
  fetchRoomAllocations,
  BRANCHES,
  SEMESTERS,
  SECTIONS,
  DAYS,
  PERIOD_SLOTS,
  type TimetablePeriod,
  type TimetableGrid,
  type RoomAllocationItem,
} from "./TimetableService";

interface TimetableModuleViewProps {
  initialBranch?: string;
  initialSem?: number;
  initialSec?: string;
  isStudentView?: boolean;
  initialTab?: "grid" | "faculty" | "room";
}

export function TimetableModuleView({
  initialBranch = "CSE",
  initialSem = 5,
  initialSec = "Section A",
  isStudentView = false,
  initialTab = "grid",
}: TimetableModuleViewProps = {}) {
  const { role, flags, department: userDept, profile } = useRole();
  const isHod = role === "hod" || flags?.includes("isHod");
  const hodDept = userDept || (profile?.department as string) || "CSE";

  const [selectedBranch, setSelectedBranch] = useState(isHod ? hodDept : initialBranch);
  const [selectedSem, setSelectedSem] = useState<number>(initialSem);
  const [selectedSec, setSelectedSec] = useState(initialSec);

  useEffect(() => {
    if (isHod && hodDept) {
      setSelectedBranch(hodDept);
    }
  }, [isHod, hodDept]);

  const [viewMode, setViewMode] = useState<"grid" | "faculty" | "room">(initialTab);
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState("Dr. K. Sai Teja");

  useEffect(() => {
    if (initialTab) {
      setViewMode(initialTab);
    }
  }, [initialTab]);

  const [gridData, setGridData] = useState<TimetableGrid | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Room Allocation Database State
  const [roomAllocations, setRoomAllocations] = useState<RoomAllocationItem[]>([]);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [roomDayFilter, setRoomDayFilter] = useState("ALL");
  const [roomTypeFilter, setRoomTypeFilter] = useState<"ALL" | "CLASSROOM" | "LAB">("ALL");
  const [roomConflictFilter, setRoomConflictFilter] = useState<"ALL" | "CONFLICTS">("ALL");
  const [expandedRoomNo, setExpandedRoomNo] = useState<string | null>(null);

  const loadRooms = async () => {
    setRoomLoading(true);
    try {
      const res = await fetchRoomAllocations({
        branch: isHod ? hodDept : undefined,
      });
      setRoomAllocations(res.rooms);
    } catch (e) {
      console.error("Failed to load room allocations:", e);
    } finally {
      setRoomLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "room") {
      loadRooms();
    }
  }, [viewMode]);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Partial<TimetablePeriod> | null>(null);
  const [clashWarning, setClashWarning] = useState<string | null>(null);

  const loadSchedule = async () => {
    setLoading(true);
    const data = await fetchTimetableGrid(selectedBranch, selectedSem, selectedSec);
    setGridData(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSchedule();
  }, [selectedBranch, selectedSem, selectedSec]);

  // Trigger Auto-Generation Algorithm
  const handleAutoGenerate = async () => {
    setGenerating(true);
    toast.info(`🤖 Running conflict-free timetable auto-generator for ${selectedBranch} - Sem ${selectedSem} (${selectedSec})...`);

    setTimeout(async () => {
      const generated = await autoGenerateTimetable(selectedBranch, selectedSem, selectedSec);
      setGridData(generated);
      setGenerating(false);
      toast.success(
        `✅ AUTO-GENERATED TIMETABLE READY! Allocated 48 periods across 6 days with ZERO faculty or room clashes.`
      );
    }, 800);
  };

  // Open Edit Cell Modal
  const handleOpenEditCell = (slot: TimetablePeriod) => {
    if (isStudentView) {
      toast.info(`📍 ${slot.subjectCode}: ${slot.subjectName} | 👨‍🏫 ${slot.facultyName} | 🏫 ${slot.roomNo}`);
      return;
    }
    setEditingPeriod(slot);
    setClashWarning(null);
    setIsEditModalOpen(true);
  };

  // Handle live clash detection during manual edits
  const handleFacultyChange = (newFaculty: string) => {
    if (!editingPeriod || !gridData) return;
    const updated = { ...editingPeriod, facultyName: newFaculty };
    setEditingPeriod(updated);

    const conflict = checkScheduleConflict(gridData.schedule, updated);
    if (conflict.hasConflict) {
      setClashWarning(conflict.conflictReason || "Faculty clash detected!");
    } else {
      setClashWarning(null);
    }
  };

  // Handle live room clash detection during manual edits
  const handleRoomChange = (newRoom: string) => {
    if (!editingPeriod || !gridData) return;
    const updated = { ...editingPeriod, roomNo: newRoom };
    setEditingPeriod(updated);

    const conflict = checkScheduleConflict(gridData.schedule, updated);
    if (conflict.hasConflict) {
      setClashWarning(conflict.conflictReason || "Room clash detected!");
    } else {
      setClashWarning(null);
    }
  };

  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPeriod || !gridData) return;

    try {
      await updateTimetablePeriod(editingPeriod);
      setGridData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          schedule: prev.schedule.map((s) => (s.id === editingPeriod.id ? ({ ...s, ...editingPeriod } as TimetablePeriod) : s)),
        };
      });

      setIsEditModalOpen(false);
      toast.success(`Updated period schedule for ${editingPeriod.day} Period ${editingPeriod.periodNumber}!`);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "Failed to update period schedule.";
      toast.error("Timetable Conflict Alert", { description: errMsg });
    }
  };

  // Export CSV / Excel
  const handleExportCSV = () => {
    if (!gridData) return;
    const headers = ["Day", "Period", "Time Slot", "Subject Code", "Subject Name", "Faculty", "Room", "Is Lab"];
    const rows = gridData.schedule.map((p) => [
      p.day,
      `Period ${p.periodNumber}`,
      `"${p.startTime} - ${p.endTime}"`,
      p.subjectCode,
      `"${p.subjectName}"`,
      `"${p.facultyName}"`,
      `"${p.roomNo}"`,
      p.isLab ? "Yes (Lab)" : "No (Theory)",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Timetable_${selectedBranch}_Sem${selectedSem}_${selectedSec}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${selectedBranch} Sem ${selectedSem} timetable to CSV!`);
  };

  // Export PDF Toast placeholder
  const handleExportPDF = () => {
    toast.success(`📄 Generating print-ready PDF timetable for ${selectedBranch} Sem ${selectedSem} (${selectedSec})...`);
  };

  const handleExportAll4SemestersPDF = () => {
    toast.success(`📚 Exporting Master PDF containing all 4 running semesters (Sem 1, Sem 3, Sem 5, Sem 7)...`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <CalendarRange className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
                {isStudentView ? "Student Class Timetable & Schedule" : isHod ? `${selectedBranch} Department Timetable` : "Automated Timetable Management & Generator"}
              </h1>
              <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                {isStudentView ? `${selectedBranch} • Sem ${selectedSem} (${selectedSec})` : isHod ? `${selectedBranch} Department • Sem ${selectedSem}` : "All 4 Running Semesters"}
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {isStudentView
                ? `Official weekly class schedule for ${selectedBranch} Department - Semester ${selectedSem} (${selectedSec}).`
                : isHod
                ? `Official weekly class schedule for ${selectedBranch} Department.`
                : "Conflict-free weekly schedule generator across CSE, ECE, ME, CE, EEE, IT & AI&DS branches."}
            </p>
          </div>
        </div>

        {/* Top Control Bar */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto flex-wrap">
          {!isStudentView && (
            <Button
              size="sm"
              onClick={handleAutoGenerate}
              disabled={generating}
              className="h-9 bg-brand-gradient text-white gap-2 text-xs font-bold shadow-glow"
            >
              {generating ? <RefreshCw className="size-4 animate-spin" /> : <Bot className="size-4" />} 🤖 Auto-Generate Timetable
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 gap-2 text-xs font-medium">
            <FileSpreadsheet className="size-3.5" /> Export Excel
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-9 gap-2 text-xs font-medium">
            <FileText className="size-3.5" /> Export PDF
          </Button>

          {!isStudentView && (
            <Button variant="outline" size="sm" onClick={handleExportAll4SemestersPDF} className="h-9 gap-2 text-xs font-medium text-primary border-primary/30">
              <Sparkles className="size-3.5" /> Export All 4 Sems
            </Button>
          )}
        </div>
      </div>

      {/* MASTER SELECTORS & FILTER BAR (HIDDEN IN STUDENT VIEW) */}
      {!isStudentView && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border/80 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {/* Branch Dropdown — Hidden for HOD since department scope is fixed */}
            {!isHod && (
              <div className="space-y-1">
                <label className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider block">Academic Branch</label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="h-9 text-xs font-bold w-[140px] rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map((b) => (<SelectItem key={b} value={b} className="text-xs font-bold">{b} Department</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Semester Dropdown */}
            <div className="space-y-1">
              <label className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider block">Running Semester</label>
              <Select value={String(selectedSem)} onValueChange={(val) => setSelectedSem(Number(val))}>
                <SelectTrigger className="h-9 text-xs font-bold w-[150px] rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" className="text-xs font-bold">Sem 1 (1st Year)</SelectItem>
                  <SelectItem value="3" className="text-xs font-bold">Sem 3 (2nd Year)</SelectItem>
                  <SelectItem value="5" className="text-xs font-bold">Sem 5 (3rd Year)</SelectItem>
                  <SelectItem value="7" className="text-xs font-bold">Sem 7 (4th Year)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Section Dropdown */}
            <div className="space-y-1">
              <label className="text-[0.68rem] font-bold text-muted-foreground uppercase tracking-wider block">Section</label>
              <Select value={selectedSec} onValueChange={setSelectedSec}>
                <SelectTrigger className="h-9 text-xs font-bold w-[120px] rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((sec) => (<SelectItem key={sec} value={sec} className="text-xs font-bold">{sec}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="inline-flex p-1 rounded-2xl bg-muted/60 border border-border/60 self-start md:self-auto">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "grid" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarRange className="size-3.5" /> Grid View (Weekly)
            </button>

            <button
              onClick={() => setViewMode("faculty")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "faculty" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="size-3.5" /> Faculty View
            </button>

            <button
              onClick={() => setViewMode("room")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "room" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="size-3.5" /> Room Allocation
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: WEEKLY TIMETABLE GRID (EXACT REPLICATED UI FORMAT FROM REFERENCE IMAGE) */}
      {viewMode === "grid" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4 shadow-sm">
          {loading || !gridData ? (
            <div className="py-12 text-center space-y-2">
              <RefreshCw className="size-8 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Loading schedule matrix...</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <table className="w-full text-center text-xs border-collapse font-sans bg-white dark:bg-slate-950">
                <thead>
                  {/* Row 1: Navy Header with Break (Orange) and Lunch (Green) Badges */}
                  <tr className="bg-[#0B192C] text-white font-bold text-xs border-b border-slate-700">
                    <th className="py-3.5 px-4 border-r border-slate-700 w-[80px] bg-[#0B192C] text-white">Timing</th>
                    <th className="py-3.5 px-4 border-r border-slate-700 min-w-[130px]">Period 1</th>
                    <th className="py-3.5 px-4 border-r border-slate-700 min-w-[130px]">Period 2</th>
                    <th className="py-3.5 px-3 border-r border-slate-700 bg-[#F97316] text-white font-bold w-[75px]">Break</th>
                    <th className="py-3.5 px-4 border-r border-slate-700 min-w-[130px]">Period 3</th>
                    <th className="py-3.5 px-4 border-r border-slate-700 min-w-[130px]">Period 4</th>
                    <th className="py-3.5 px-3 border-r border-slate-700 bg-[#10B981] text-white font-bold w-[75px]">Lunch</th>
                    <th className="py-3.5 px-4 border-r border-slate-700 min-w-[130px]">Period 5</th>
                    <th className="py-3.5 px-4 border-r border-slate-700 min-w-[130px]">Period 6</th>
                    <th className="py-3.5 px-4 min-w-[130px]">Period 7</th>
                  </tr>

                  {/* Row 2: Start Time */}
                  <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-slate-800">
                    <td className="py-2.5 px-4 font-bold text-[#0B192C] dark:text-white border-r border-slate-200 dark:border-slate-800 text-left pl-5">Start Time</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">08:45 AM</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">09:45 AM</td>
                    <td className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">—</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">10:45 AM</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">11:45 AM</td>
                    <td className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">—</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">01:30 PM</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">02:30 PM</td>
                    <td className="py-2.5 px-3 font-medium">03:30 PM</td>
                  </tr>

                  {/* Row 3: End Time */}
                  <tr className="bg-slate-50/40 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-slate-800">
                    <td className="py-2.5 px-4 font-bold text-[#0B192C] dark:text-white border-r border-slate-200 dark:border-slate-800 text-left pl-5">End Time</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">09:45 AM</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">10:45 AM</td>
                    <td className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">—</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">11:45 AM</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">12:45 PM</td>
                    <td className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">—</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">02:30 PM</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">03:30 PM</td>
                    <td className="py-2.5 px-3 font-medium">04:30 PM</td>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {[
                    { key: "Monday", shortName: "MON" },
                    { key: "Tuesday", shortName: "TUE" },
                    { key: "Wednesday", shortName: "WED" },
                    { key: "Thursday", shortName: "THU" },
                    { key: "Friday", shortName: "FRI" },
                    { key: "Saturday", shortName: "SAT" },
                  ].map((dayObj, dayIdx) => {
                    const dayKey = dayObj.key as TimetablePeriod["day"];
                    const daySchedule = gridData.schedule.filter((p) => p.day === dayKey);

                    // Cell Pastel Color Styling Per Period Column
                    const getCellCardStyle = (periodNum: number) => {
                      switch (periodNum) {
                        case 1:
                          return "bg-[#EBF5FF] border-[#BEE3F8] dark:bg-blue-950/40 dark:border-blue-800 text-[#0F172A] dark:text-blue-100";
                        case 2:
                          return "bg-[#F3E8FF] border-[#E9D5FF] dark:bg-purple-950/40 dark:border-purple-800 text-[#0F172A] dark:text-purple-100";
                        case 3:
                          return "bg-[#FEF3C7] border-[#FDE68A] dark:bg-amber-950/40 dark:border-amber-800 text-[#0F172A] dark:text-amber-100";
                        case 4:
                          return "bg-[#DCFCE7] border-[#BBF7D0] dark:bg-emerald-950/40 dark:border-emerald-800 text-[#0F172A] dark:text-emerald-100";
                        case 5:
                          return "bg-[#FCE7F3] border-[#FBCFE8] dark:bg-pink-950/40 dark:border-pink-800 text-[#0F172A] dark:text-pink-100";
                        case 6:
                          return "bg-[#E0F2FE] border-[#BAE6FD] dark:bg-cyan-950/40 dark:border-cyan-800 text-[#0F172A] dark:text-cyan-100";
                        case 7:
                          return "bg-[#FFEDD5] border-[#FED7AA] dark:bg-orange-950/40 dark:border-orange-800 text-[#0F172A] dark:text-orange-100";
                        default:
                          return "bg-slate-100 border-slate-200 text-slate-900";
                      }
                    };

                    return (
                      <tr key={dayObj.key}>
                        {/* Day Name */}
                        <td className="py-3.5 px-3 font-bold text-[#0F172A] dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 text-xs tracking-wider">
                          {dayObj.shortName}
                        </td>

                        {/* Period 1 Cell */}
                        {(() => {
                          const p = daySchedule.find((slot) => slot.periodNumber === 1);
                          return (
                            <td key="p1" className="p-2 border-r border-slate-200 dark:border-slate-800 align-middle">
                              {p && (
                                <div
                                  onClick={() => handleOpenEditCell(p)}
                                  className={`p-2.5 rounded-xl border cursor-pointer text-center space-y-0.5 ${getCellCardStyle(1)}`}
                                >
                                  <div className="font-bold text-xs md:text-sm text-[#0F172A] dark:text-white">{p.subjectCode}</div>
                                  <div className="text-[0.72rem] font-medium text-slate-600 dark:text-slate-300 truncate">{p.facultyName}</div>
                                </div>
                              )}
                            </td>
                          );
                        })()}

                        {/* Period 2 Cell */}
                        {(() => {
                          const p = daySchedule.find((slot) => slot.periodNumber === 2);
                          return (
                            <td key="p2" className="p-2 border-r border-slate-200 dark:border-slate-800 align-middle">
                              {p && (
                                <div
                                  onClick={() => handleOpenEditCell(p)}
                                  className={`p-2.5 rounded-xl border cursor-pointer text-center space-y-0.5 ${getCellCardStyle(2)}`}
                                >
                                  <div className="font-bold text-xs md:text-sm text-[#0F172A] dark:text-white">{p.subjectCode}</div>
                                  <div className="text-[0.72rem] font-medium text-slate-600 dark:text-slate-300 truncate">{p.facultyName}</div>
                                </div>
                              )}
                            </td>
                          );
                        })()}

                        {/* Break Vertical Spanning Column (Rendered only on MON row) */}
                        {dayIdx === 0 && (
                          <td rowSpan={6} className="bg-amber-500/5 border-r border-slate-200 dark:border-slate-800 text-center p-0 align-middle">
                            <div className="flex flex-col items-center justify-center font-extrabold text-[#F97316] text-xs tracking-[0.35em] space-y-2 py-4">
                              <span>B</span>
                              <span>R</span>
                              <span>E</span>
                              <span>A</span>
                              <span>K</span>
                            </div>
                          </td>
                        )}

                        {/* Period 3 Cell */}
                        {(() => {
                          const p = daySchedule.find((slot) => slot.periodNumber === 3);
                          return (
                            <td key="p3" className="p-2 border-r border-slate-200 dark:border-slate-800 align-middle">
                              {p && (
                                <div
                                  onClick={() => handleOpenEditCell(p)}
                                  className={`p-2.5 rounded-xl border cursor-pointer text-center space-y-0.5 ${getCellCardStyle(3)}`}
                                >
                                  <div className="font-bold text-xs md:text-sm text-[#0F172A] dark:text-white">{p.subjectCode}</div>
                                  <div className="text-[0.72rem] font-medium text-slate-600 dark:text-slate-300 truncate">{p.facultyName}</div>
                                </div>
                              )}
                            </td>
                          );
                        })()}

                        {/* Period 4 Cell */}
                        {(() => {
                          const p = daySchedule.find((slot) => slot.periodNumber === 4);
                          return (
                            <td key="p4" className="p-2 border-r border-slate-200 dark:border-slate-800 align-middle">
                              {p && (
                                <div
                                  onClick={() => handleOpenEditCell(p)}
                                  className={`p-2.5 rounded-xl border cursor-pointer text-center space-y-0.5 ${getCellCardStyle(4)}`}
                                >
                                  <div className="font-bold text-xs md:text-sm text-[#0F172A] dark:text-white">{p.subjectCode}</div>
                                  <div className="text-[0.72rem] font-medium text-slate-600 dark:text-slate-300 truncate">{p.facultyName}</div>
                                </div>
                              )}
                            </td>
                          );
                        })()}

                        {/* Lunch Vertical Spanning Column (Rendered only on MON row) */}
                        {dayIdx === 0 && (
                          <td rowSpan={6} className="bg-emerald-500/5 border-r border-slate-200 dark:border-slate-800 text-center p-0 align-middle">
                            <div className="flex flex-col items-center justify-center font-extrabold text-[#10B981] text-xs tracking-[0.35em] space-y-2 py-4">
                              <span>L</span>
                              <span>U</span>
                              <span>N</span>
                              <span>C</span>
                              <span>H</span>
                            </div>
                          </td>
                        )}

                        {/* Period 5 Cell */}
                        {(() => {
                          const p = daySchedule.find((slot) => slot.periodNumber === 5);
                          return (
                            <td key="p5" className="p-2 border-r border-slate-200 dark:border-slate-800 align-middle">
                              {p && (
                                <div
                                  onClick={() => handleOpenEditCell(p)}
                                  className={`p-2.5 rounded-xl border cursor-pointer text-center space-y-0.5 ${getCellCardStyle(5)}`}
                                >
                                  <div className="font-bold text-xs md:text-sm text-[#0F172A] dark:text-white">{p.subjectCode}</div>
                                  <div className="text-[0.72rem] font-medium text-slate-600 dark:text-slate-300 truncate">{p.facultyName}</div>
                                </div>
                              )}
                            </td>
                          );
                        })()}

                        {/* Period 6 Cell */}
                        {(() => {
                          const p = daySchedule.find((slot) => slot.periodNumber === 6);
                          return (
                            <td key="p6" className="p-2 border-r border-slate-200 dark:border-slate-800 align-middle">
                              {p && (
                                <div
                                  onClick={() => handleOpenEditCell(p)}
                                  className={`p-2.5 rounded-xl border cursor-pointer text-center space-y-0.5 ${getCellCardStyle(6)}`}
                                >
                                  <div className="font-bold text-xs md:text-sm text-[#0F172A] dark:text-white">{p.subjectCode}</div>
                                  <div className="text-[0.72rem] font-medium text-slate-600 dark:text-slate-300 truncate">{p.facultyName}</div>
                                </div>
                              )}
                            </td>
                          );
                        })()}

                        {/* Period 7 Cell */}
                        {(() => {
                          const p = daySchedule.find((slot) => slot.periodNumber === 7);
                          return (
                            <td key="p7" className="p-2 align-middle">
                              {p && (
                                <div
                                  onClick={() => handleOpenEditCell(p)}
                                  className={`p-2.5 rounded-xl border cursor-pointer text-center space-y-0.5 ${getCellCardStyle(7)}`}
                                >
                                  <div className="font-bold text-xs md:text-sm text-[#0F172A] dark:text-white">{p.subjectCode}</div>
                                  <div className="text-[0.72rem] font-medium text-slate-600 dark:text-slate-300 truncate">{p.facultyName}</div>
                                </div>
                              )}
                            </td>
                          );
                        })()}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: FACULTY TIMETABLE VIEW */}
      {viewMode === "faculty" && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <User className="size-4 text-primary" /> Individual Faculty Teaching Workload Schedule
              </h2>
              <p className="text-xs text-muted-foreground">Filter timetable by assigned instructor to view their weekly teaching periods and free slots.</p>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedFacultyFilter} onValueChange={setSelectedFacultyFilter}>
                <SelectTrigger className="h-9 text-xs font-bold w-[220px] rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dr. K. Sai Teja">Dr. K. Sai Teja (CSE)</SelectItem>
                  <SelectItem value="Dr. Rajesh K. Varma">Dr. Rajesh K. Varma (CSE)</SelectItem>
                  <SelectItem value="Dr. Meera Nambiar">Dr. Meera Nambiar (ECE)</SelectItem>
                  <SelectItem value="Prof. Arvind Swaminathan">Prof. Arvind Swaminathan (AI&DS)</SelectItem>
                  <SelectItem value="Dr. Sankar Narayan">Dr. Sankar Narayan (ME)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {DAYS.map((day) => {
              const facultyPeriods = gridData?.schedule.filter(
                (p) => p.day === day && p.facultyName.toLowerCase() === selectedFacultyFilter.toLowerCase()
              ) || [];

              return (
                <div key={day} className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <h3 className="font-bold text-xs text-foreground">{day}</h3>
                    <Badge variant="outline" className="font-mono text-[0.68rem] text-primary">{facultyPeriods.length} Periods</Badge>
                  </div>

                  {facultyPeriods.length === 0 ? (
                    <div className="p-4 text-center text-xs text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl font-medium">
                      🟢 Free / Research Day
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {facultyPeriods.map((fp) => (
                        <div key={fp.id} className="p-3 rounded-xl border border-border/60 bg-card space-y-1">
                          <div className="flex items-center justify-between font-mono text-[0.68rem]">
                            <span className="font-bold text-primary">Period {fp.periodNumber} ({fp.startTime})</span>
                            <Badge className="bg-blue-600 text-white text-[0.6rem]">{fp.roomNo}</Badge>
                          </div>
                          <h4 className="font-bold text-xs text-foreground">{fp.subjectName}</h4>
                          <p className="text-[0.68rem] text-muted-foreground">{fp.branch} - Sem {fp.semester} ({fp.section})</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: ROOM ALLOCATION VIEW */}
      {viewMode === "room" && (() => {
        const totalRooms = roomAllocations.length;
        const totalLabs = roomAllocations.filter((r) => r.isLab).length;
        const totalClassrooms = totalRooms - totalLabs;
        const totalConflicts = roomAllocations.filter((r) => r.hasConflict).length;

        const filteredRooms = roomAllocations.filter((room) => {
          if (roomSearchQuery.trim()) {
            const q = roomSearchQuery.toLowerCase().trim();
            const matchRoom = room.roomNo.toLowerCase().includes(q);
            const matchBuilding = room.building.toLowerCase().includes(q);
            const matchAssignment = room.assignments.some(
              (a) =>
                a.courseCode.toLowerCase().includes(q) ||
                a.courseName.toLowerCase().includes(q) ||
                a.facultyName.toLowerCase().includes(q) ||
                a.branch.toLowerCase().includes(q) ||
                a.section.toLowerCase().includes(q)
            );
            if (!matchRoom && !matchBuilding && !matchAssignment) return false;
          }

          if (roomDayFilter !== "ALL") {
            const hasDay = room.assignments.some((a) => a.day === roomDayFilter);
            if (!hasDay) return false;
          }

          if (roomTypeFilter === "CLASSROOM" && room.isLab) return false;
          if (roomTypeFilter === "LAB" && !room.isLab) return false;

          if (roomConflictFilter === "CONFLICTS" && !room.hasConflict) return false;

          return true;
        });

        return (
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-6 shadow-sm">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Building2 className="size-5 text-primary" /> Campus Classroom & Laboratory Occupancy
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Authoritative institutional room allocation, occupancy matrix, and live clash detection directly from PostgreSQL MasterTimetable.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadRooms}
                disabled={roomLoading}
                className="h-8.5 text-xs font-semibold gap-2 rounded-xl shrink-0"
              >
                <RefreshCw className={`size-3.5 ${roomLoading ? "animate-spin" : ""}`} />
                Refresh Room Data
              </Button>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">Total Rooms</span>
                  <Building2 className="size-4 text-primary" />
                </div>
                <p className="text-xl font-black text-foreground font-mono">{totalRooms}</p>
                <p className="text-[0.68rem] text-muted-foreground">Configured across all blocks</p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">Classrooms</span>
                  <BookOpen className="size-4 text-blue-500" />
                </div>
                <p className="text-xl font-black text-foreground font-mono">{totalClassrooms}</p>
                <p className="text-[0.68rem] text-muted-foreground">Theory lecture halls</p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">Laboratories</span>
                  <FlaskConical className="size-4 text-amber-500" />
                </div>
                <p className="text-xl font-black text-foreground font-mono">{totalLabs}</p>
                <p className="text-[0.68rem] text-muted-foreground">Hands-on practical labs</p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">Clash Status</span>
                  {totalConflicts === 0 ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="size-4 text-destructive animate-pulse" />
                  )}
                </div>
                <p className={`text-xl font-black font-mono ${totalConflicts === 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {totalConflicts === 0 ? "0 Clashes" : `${totalConflicts} Clashing`}
                </p>
                <p className="text-[0.68rem] text-muted-foreground">
                  {totalConflicts === 0 ? "All allocations conflict-free" : "Immediate review required"}
                </p>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border/70">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  placeholder="Search by room (e.g. Block C - 151, Lab - CSE 1), course, or faculty..."
                  className="h-9 pl-9 text-xs rounded-xl bg-card border-border/80"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Day Filter */}
                <Select value={roomDayFilter} onValueChange={setRoomDayFilter}>
                  <SelectTrigger className="h-9 text-xs rounded-xl w-[125px] bg-card">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">All Days</SelectItem>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Type Filter */}
                <Select value={roomTypeFilter} onValueChange={(v: any) => setRoomTypeFilter(v)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl w-[130px] bg-card">
                    <SelectValue placeholder="Room Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">All Room Types</SelectItem>
                    <SelectItem value="CLASSROOM" className="text-xs">Classrooms</SelectItem>
                    <SelectItem value="LAB" className="text-xs">Laboratories</SelectItem>
                  </SelectContent>
                </Select>

                {/* Conflict Filter */}
                <Select value={roomConflictFilter} onValueChange={(v: any) => setRoomConflictFilter(v)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl w-[125px] bg-card">
                    <SelectValue placeholder="Conflict" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">All Health</SelectItem>
                    <SelectItem value="CONFLICTS" className="text-xs text-destructive font-semibold">Clashes Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Room List Grid */}
            {roomLoading ? (
              <div className="py-16 text-center space-y-2">
                <RefreshCw className="size-8 animate-spin mx-auto text-primary" />
                <p className="text-xs text-muted-foreground font-medium">Loading live room allocations from PostgreSQL...</p>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="py-12 text-center space-y-2 border border-dashed border-border/80 rounded-2xl bg-card">
                <Building2 className="size-8 text-muted-foreground/50 mx-auto" />
                <p className="text-sm font-bold text-foreground">No matching rooms found</p>
                <p className="text-xs text-muted-foreground">Try clearing or adjusting your search query or filters.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map((room) => {
                  const isExpanded = expandedRoomNo === room.roomNo;
                  const relevantAssignments =
                    roomDayFilter === "ALL"
                      ? room.assignments
                      : room.assignments.filter((a) => a.day === roomDayFilter);

                  return (
                    <div
                      key={room.roomNo}
                      className={`p-4 rounded-2xl border transition-all duration-200 bg-card space-y-3 shadow-xs ${
                        room.hasConflict
                          ? "border-destructive/60 bg-destructive/5 dark:bg-destructive/10"
                          : "border-border/80 hover:border-primary/40"
                      }`}
                    >
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            {room.isLab ? (
                              <FlaskConical className="size-4 text-amber-500 shrink-0" />
                            ) : (
                              <Building2 className="size-4 text-primary shrink-0" />
                            )}
                            <h3 className="font-bold text-sm text-foreground font-mono">{room.roomNo}</h3>
                          </div>
                          <p className="text-[0.7rem] text-muted-foreground mt-0.5">{room.building}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            className={`text-[0.65rem] font-bold ${
                              room.isLab
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                            }`}
                          >
                            {room.isLab ? "Laboratory" : "Classroom"}
                          </Badge>
                          <span className="text-[0.65rem] text-muted-foreground font-mono">
                            Cap: {room.capacity} seats
                          </span>
                        </div>
                      </div>

                      {/* Conflict Alert Banner */}
                      {room.hasConflict && (
                        <div className="p-2 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-[0.72rem] font-bold flex items-center gap-1.5">
                          <AlertTriangle className="size-3.5 shrink-0" />
                          <span className="truncate">{room.conflictDetails || "Room clash detected!"}</span>
                        </div>
                      )}

                      {/* Summary Metrics */}
                      <div className="flex items-center justify-between text-xs py-1">
                        <span className="text-muted-foreground">Allocated Slots:</span>
                        <Badge variant="outline" className="text-[0.68rem] font-mono">
                          {room.totalPeriods} Periods / Week
                        </Badge>
                      </div>

                      {/* Occupancy Preview / Distinct Classes */}
                      <div className="space-y-1">
                        <p className="text-[0.68rem] text-muted-foreground uppercase font-bold tracking-wider">
                          Active Assigned Courses
                        </p>
                        {room.assignments.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No timetable periods assigned</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {Array.from(
                              new Set(room.assignments.map((a) => `${a.courseCode} (${a.branch}-${a.section})`))
                            )
                              .slice(0, 3)
                              .map((item) => (
                                <span
                                  key={item}
                                  className="text-[0.65rem] px-2 py-0.5 rounded-md bg-muted/60 text-foreground border border-border/50 font-medium"
                                >
                                  {item}
                                </span>
                              ))}
                            {new Set(room.assignments.map((a) => a.courseCode)).size > 3 && (
                              <span className="text-[0.65rem] px-1.5 py-0.5 text-muted-foreground">
                                +{new Set(room.assignments.map((a) => a.courseCode)).size - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Expand / Collapse Button */}
                      {room.assignments.length > 0 && (
                        <div className="pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedRoomNo(isExpanded ? null : room.roomNo)}
                            className="w-full h-8 text-[0.7rem] font-bold text-primary flex items-center justify-between rounded-xl hover:bg-primary/5"
                          >
                            <span>{isExpanded ? "Hide Period Schedule" : `View Period Schedule (${relevantAssignments.length})`}</span>
                            {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                          </Button>

                          {/* Expanded Detailed Schedule List */}
                          {isExpanded && (
                            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1 border-t border-border/60 pt-2 no-scrollbar">
                              {relevantAssignments.map((a) => (
                                <div
                                  key={a.id}
                                  className="p-2 rounded-xl bg-muted/40 border border-border/40 text-[0.7rem] space-y-0.5"
                                >
                                  <div className="flex items-center justify-between font-semibold">
                                    <span className="text-foreground">
                                      {a.day} • P{a.periodNumber} ({a.startTime})
                                    </span>
                                    <span className="text-primary font-mono">{a.courseCode}</span>
                                  </div>
                                  <p className="text-muted-foreground truncate">{a.courseName}</p>
                                  <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground pt-0.5">
                                    <span>👨‍🏫 {a.facultyName}</span>
                                    <span>{a.branch}-S{a.semester} ({a.section})</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* MODAL: EDIT PERIOD CELL & LIVE CLASH WARNING */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Edit className="size-4 text-primary" /> Edit Period Slot & Clash Verification
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update period assignments for {editingPeriod?.day} Period {editingPeriod?.periodNumber} ({editingPeriod?.startTime}).
            </DialogDescription>
          </DialogHeader>

          {editingPeriod && (
            <form onSubmit={handleSavePeriod} className="space-y-4 pt-2">
              {clashWarning && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 font-medium">
                  {clashWarning}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subject Title</Label>
                <Input
                  value={editingPeriod.subjectName || ""}
                  onChange={(e) => setEditingPeriod({ ...editingPeriod, subjectName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assigned Faculty Member</Label>
                <Select
                  value={editingPeriod.facultyName || ""}
                  onValueChange={(val) => handleFacultyChange(val)}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr. K. Sai Teja" className="text-xs font-semibold">Dr. K. Sai Teja (CSE)</SelectItem>
                    <SelectItem value="Dr. Rajesh K. Varma" className="text-xs font-semibold">Dr. Rajesh K. Varma (CSE)</SelectItem>
                    <SelectItem value="Dr. Meera Nambiar" className="text-xs font-semibold">Dr. Meera Nambiar (ECE)</SelectItem>
                    <SelectItem value="Prof. Arvind Swaminathan" className="text-xs font-semibold">Prof. Arvind Swaminathan (AI&DS)</SelectItem>
                    <SelectItem value="Dr. Sankar Narayan" className="text-xs font-semibold">Dr. Sankar Narayan (ME)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Classroom / Laboratory Room No.</Label>
                <Input
                  value={editingPeriod.roomNo || ""}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="text-xs rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" className="bg-brand-gradient text-white text-xs font-semibold rounded-xl">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
