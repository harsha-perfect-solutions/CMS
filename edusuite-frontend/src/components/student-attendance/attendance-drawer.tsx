import React, { useState } from "react";
import { SubjectAttendanceItem } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X,
  User,
  Mail,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  BarChart2,
  Calculator,
  MessageSquare,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

interface AttendanceDrawerProps {
  subject: SubjectAttendanceItem | null;
  onClose: () => void;
}

export function AttendanceDrawer({ subject, onClose }: AttendanceDrawerProps) {
  const [targetPct, setTargetPct] = useState<number>(75);

  if (!subject) return null;

  // Calculate required classes formula: (targetPct * conducted - 100 * attended) / (100 - targetPct)
  const calculateClassesNeeded = (target: number) => {
    if (subject.attendancePct >= target) return 0;
    const conducted = subject.conducted;
    const attended = subject.attended;
    const numerator = target * conducted - 100 * attended;
    const denominator = 100 - target;
    if (denominator <= 0) return 0;
    const result = Math.ceil(numerator / denominator);
    return Math.max(result, 0);
  };

  const calculatedNeeded = calculateClassesNeeded(targetPct);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl overflow-y-auto flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
        
        {/* HEADER */}
        <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur z-10 p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 font-mono font-bold text-sm">
              {subject.subjectCode}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{subject.subjectName}</h3>
              <p className="text-xs text-slate-500">{subject.credits} Credits &middot; Semester {subject.semester}</p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* CONTENT BODY */}
        <div className="p-6 space-y-6 flex-1 text-xs">
          
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Attendance</span>
              <strong className={`text-xl font-extrabold font-display ${subject.attendancePct >= 85 ? "text-emerald-600" : subject.attendancePct >= 75 ? "text-amber-500" : "text-red-600"}`}>
                {subject.attendancePct}%
              </strong>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Attended / Total</span>
              <strong className="text-xl font-extrabold text-slate-900 dark:text-white font-display">
                {subject.attended}/{subject.conducted}
              </strong>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Classes Missed</span>
              <strong className="text-xl font-extrabold text-red-500 font-display">
                {subject.classesMissed} Days
              </strong>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Medical Leaves</span>
              <strong className="text-xl font-extrabold text-purple-600 font-display">
                {subject.medicalLeaves} ML
              </strong>
            </div>
          </div>

          {/* REQUIRED CLASSES CALCULATOR SLIDER */}
          <div className="p-5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="h-4 w-4 text-blue-600" /> Required Classes Calculator
              </h4>
              <Badge className="bg-blue-600 text-white font-mono text-[10px]">Target: {targetPct}%</Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Select Target Percentage:</span>
                <span className="font-bold text-blue-600">{targetPct}%</span>
              </div>
              <input
                type="range"
                min="65"
                max="95"
                step="1"
                value={targetPct}
                onChange={(e) => setTargetPct(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>65% (Min Condonation)</span>
                <span>75% (Mandatory)</span>
                <span>85% (Distinction)</span>
                <span>95% (Top Honors)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs">
              <span className="text-slate-700 dark:text-slate-300 font-medium">Classes needed to reach <strong>{targetPct}%</strong>:</span>
              <strong className={`text-base font-extrabold font-mono ${calculatedNeeded > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {calculatedNeeded > 0 ? `${calculatedNeeded} Consecutive Classes` : "Goal Achieved ✓"}
              </strong>
            </div>
          </div>

          {/* FACULTY DETAILS & REMARKS */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" /> Faculty In-Charge & Remarks
            </h4>
            <div className="flex items-center gap-4">
              {subject.facultyAvatar ? (
                <img src={subject.facultyAvatar} alt={subject.facultyName} className="h-12 w-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-600 flex items-center justify-center font-bold text-base shrink-0">
                  {subject.facultyName ? subject.facultyName.charAt(0).toUpperCase() : "F"}
                </div>
              )}
              <div className="space-y-0.5">
                <h5 className="text-sm font-bold text-slate-900 dark:text-white">{subject.facultyName}</h5>
                <p className="text-xs text-slate-500">{subject.facultyDesignation}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-mono pt-0.5">
                  <Mail className="h-3.5 w-3.5" /> {subject.facultyEmail}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block text-[11px]">Faculty Remark:</strong>
                <p className="italic text-[11px]">"{subject.facultyRemarks}"</p>
              </div>
            </div>
          </div>

          {/* ATTENDANCE TREND GRAPH */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-purple-600" /> Attendance Trend Graph
            </h4>
            {subject.hasTrendData && subject.monthlyTrend && subject.monthlyTrend.length >= 2 ? (
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subject.monthlyTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderRadius: "12px", color: "#fff", fontSize: "12px" }} />
                    <Bar dataKey="pct" fill="#2563EB" radius={[6, 6, 0, 0]} name="Attendance %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                <TrendingUp className="h-6 w-6 text-slate-300 dark:text-slate-600 mb-1" />
                <span className="font-semibold text-slate-600 dark:text-slate-400">Insufficient historical data</span>
                <span className="text-[10px] text-slate-400">At least two distinct monthly periods required to plot trend.</span>
              </div>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <Button onClick={onClose} size="sm" className="rounded-xl bg-blue-600 text-white px-5 font-bold">
            Close Details
          </Button>
        </div>

      </div>
    </div>
  );
}
