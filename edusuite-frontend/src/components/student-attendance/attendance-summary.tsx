import React from "react";
import {
  StudentAttendanceProfile,
  TodayScheduleItem,
  SubjectAttendanceItem,
} from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Flame,
  Award,
  Calendar,
  FileText,
  Sparkles,
  TrendingUp,
  Download,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  BellRing,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

interface AttendanceSummaryProps {
  profile: StudentAttendanceProfile;
  schedule: TodayScheduleItem[];
  subjects: SubjectAttendanceItem[];
  onOpenLeaveModal: () => void;
  onSelectTab: (tab: any) => void;
}

export function AttendanceSummary({
  profile,
  schedule,
  subjects,
  onOpenLeaveModal,
  onSelectTab,
}: AttendanceSummaryProps) {

  // Calculate Gauge Color
  const gaugeColor =
    profile.overallAttendancePct >= 85
      ? "#10B981" // Green Above 85%
      : profile.overallAttendancePct >= 75
        ? "#F59E0B" // Yellow 75-85%
        : "#EF4444"; // Red Below 75%

  const ringChartData = [
    { name: "Attended", value: profile.overallAttendancePct, fill: gaugeColor },
    { name: "Gap", value: 100 - profile.overallAttendancePct, fill: "#E2E8F0" },
  ];

  const lowAttendanceList = subjects.filter((s) => s.attendancePct < 75);

  return (
    <div className="space-y-6">

      {/* 1. TOP CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

        {/* Card 1: Overall Attendance % */}
        <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overall Attendance</span>
            <CalendarCheck className="h-4 w-4 text-[#0b193c] dark:text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-[#0b193c] dark:text-blue-400 font-display pt-1">
            {profile.overallAttendancePct}%
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">
            Target: 75%
          </Badge>
        </div>

        {/* Card 2: Present Days */}
        <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Present</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-[#0b193c] dark:text-blue-400 font-display pt-1">
            {profile.presentClasses ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">Sessions Attended</span>
        </div>

        {/* Card 3: Absent Days */}
        <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Absent</span>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 font-display pt-1">
            {profile.absentClasses ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">Sessions Missed</span>
        </div>

        {/* Card 4: Late Entries */}
        <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Late</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-display pt-1">
            {profile.lateClasses ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">Late Arrivals</span>
        </div>

        {/* Card 5: Classes Conducted */}
        <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Conducted</span>
            <BookOpen className="h-4 w-4 text-[#0b193c] dark:text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-[#0b193c] dark:text-blue-400 font-display pt-1">
            {profile.totalConducted ?? ((profile.presentClasses || 0) + (profile.absentClasses || 0) + (profile.lateClasses || 0))}
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">Total Periods</span>
        </div>

        {/* Card 6: Attendance Eligibility */}
        <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Status</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-600 font-display pt-1">
            {profile.condonationStatus || (profile.overallAttendancePct >= 75 ? "Eligible" : "Shortage")}
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">
            {profile.overallAttendancePct >= 75 ? "GOOD / ELIGIBLE" : "LOW ATTENDANCE"}
          </Badge>
        </div>

      </div>

      {/* ADDITIONAL KPI ROW: CLASSES REQUIRED & LOW ATTENDANCE SUBJECTS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Classes Required for 75%</span>
          <div className="text-xl font-extrabold text-[#0b193c] dark:text-blue-400 font-display">
            {profile.classesRequiredFor75 > 0 ? `${profile.classesRequiredFor75} Classes` : "0 Classes"}
          </div>
          <span className="text-[10px] text-slate-400 block">
            {profile.classesRequiredFor75 > 0 ? "Needed to satisfy minimum requirement" : "Already achieved mandatory 75%"}
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Classes Required for 85%</span>
          <div className="text-xl font-extrabold text-[#0b193c] dark:text-blue-400 font-display">
            {profile.classesRequiredFor85 > 0 ? `${profile.classesRequiredFor85} Classes` : "0 Classes"}
          </div>
          <span className="text-[10px] text-slate-400 block">
            {profile.classesRequiredFor85 > 0 ? "Needed to achieve distinction criteria" : "Already achieved distinction 85%"}
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Low Attendance Subjects</span>
          <div className="text-xl font-extrabold text-[#0b193c] dark:text-blue-400 font-display">
            {profile.lowAttendanceCount} {profile.lowAttendanceCount === 1 ? "Subject" : "Subjects"}
          </div>
          <span className="text-[10px] text-[#0b193c] dark:text-blue-400 font-semibold block truncate">
            {lowAttendanceList.length > 0
              ? `${lowAttendanceList.map((s) => s.subjectCode).join(", ")} below 75%`
              : "All subjects satisfy 75% threshold"}
          </span>
        </div>
      </div>

      {/* EMPTY STATE IF NO SESSIONS CONDUCTED */}
      {(profile.totalConducted === 0 || ((profile.presentClasses ?? 0) === 0 && (profile.absentClasses ?? 0) === 0 && (profile.lateClasses ?? 0) === 0)) && (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center space-y-2">
          <CalendarCheck className="h-8 w-8 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">No attendance records available yet.</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">Your classroom attendance records will appear here as soon as faculty members submit session registers.</p>
        </div>
      )}

      {/* 3. MAIN WIDGETS GRID (RING CHART, TODAY'S SCHEDULE, ATTENDANCE ALERTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN (2 SPANS): RING CHART & TODAY'S SCHEDULE */}
        <div className="lg:col-span-2 space-y-6">

          {/* ATTENDANCE RING CHART WIDGET */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#0b193c] dark:text-blue-400" /> Overall Attendance Ring Gauge
                </h4>
                <p className="text-xs text-slate-500">Color legend: Green (&gt;85%), Yellow (75-85%), Red (&lt;75%)</p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 font-mono text-[10px]">
                {profile.overallAttendancePct >= 85 ? "Above 85%" : profile.overallAttendancePct >= 75 ? "75-85%" : "Below 75%"}
              </Badge>
            </div>

            <div className="h-48 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ringChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    startAngle={180}
                    endAngle={0}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {ringChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderRadius: "12px", color: "#fff", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-24 inset-x-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-display">{profile.overallAttendancePct}%</span>
                <span className="text-[10px] text-slate-400 font-mono uppercase">Cumulative %</span>
              </div>
            </div>
          </div>

          {/* TODAY'S SCHEDULE TIMETABLE */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" /> Today's Class Schedule & Check-ins
                </h4>
                <p className="text-xs text-slate-500">Live timetable period check-in status</p>
              </div>
              <Button onClick={() => onSelectTab("history")} variant="ghost" size="sm" className="text-xs text-[#0b193c] dark:text-blue-400 hover:underline gap-1">
                Full Log <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="space-y-2.5">
              {schedule.length > 0 ? (
                schedule.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#0b193c]/10 text-[#0b193c] dark:text-blue-400 font-mono font-bold text-xs">
                        {item.period}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {item.subjectCode} &middot; {item.subjectName}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">{item.timing} &middot; {item.room} &middot; {item.facultyName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          item.status === "Present"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : item.status === "Absent"
                              ? "bg-red-500/10 text-red-600"
                              : "bg-amber-500/10 text-amber-600"
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  No classes scheduled for today.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (1 SPAN): ATTENDANCE ALERTS & REMARKS */}
        <div className="space-y-6">

          {/* ATTENDANCE ALERTS CARD */}
          <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/20 dark:from-amber-950/30 dark:via-slate-900 dark:to-amber-950/20 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <BellRing className="h-4 w-4 text-amber-600 animate-bounce" /> Attendance Alerts & Shortages
              </span>
              <Badge className={lowAttendanceList.length > 0 ? "bg-amber-600 text-white text-[10px]" : "bg-emerald-600 text-white text-[10px]"}>
                {lowAttendanceList.length > 0 ? "Action Required" : "Satisfactory"}
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              {lowAttendanceList.length > 0 ? (
                lowAttendanceList.map((sub) => (
                  <div key={sub.id} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="font-bold text-slate-900 dark:text-white">{sub.subjectCode} - {sub.subjectName}</strong>
                      <span className="font-mono text-red-600 font-bold">{sub.attendancePct}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Threshold: 75%</span>
                      <Badge className="bg-red-500/10 text-red-600 text-[10px]">Below Required Attendance</Badge>
                    </div>
                    {sub.classesNeeded75 > 0 && (
                      <p className="text-[11px] text-amber-800 dark:text-amber-300">
                        Attend next <strong>{sub.classesNeeded75} consecutive classes</strong> to clear shortage cutoff.
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-center space-y-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
                  <strong className="font-bold text-emerald-800 dark:text-emerald-300 text-xs block">Good Standing</strong>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">All registered courses meet the mandatory 75% institutional attendance requirement.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
