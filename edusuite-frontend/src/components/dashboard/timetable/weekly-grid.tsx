import React from "react";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FlaskConical, MapPin, Layers } from "lucide-react";
import type { WeeklySlot } from "@/services/FacultyTimetableService";

interface WeeklyGridProps {
  slots: WeeklySlot[];
}

const DAYS = [
  { key: "Monday", shortName: "MON" },
  { key: "Tuesday", shortName: "TUE" },
  { key: "Wednesday", shortName: "WED" },
  { key: "Thursday", shortName: "THU" },
  { key: "Friday", shortName: "FRI" },
  { key: "Saturday", shortName: "SAT" },
];

export function WeeklyGrid({ slots }: WeeklyGridProps) {
  // Pastel styling per period slot matching ANITS Master Timetable
  const getCellCardStyle = (periodNum: number, isLab: boolean) => {
    if (isLab) {
      return "bg-[#ECFDF5] border-[#A7F3D0] dark:bg-emerald-950/40 dark:border-emerald-800 text-[#065F46] dark:text-emerald-200";
    }
    switch (periodNum) {
      case 1:
        return "bg-[#EBF5FF] border-[#BEE3F8] dark:bg-blue-950/40 dark:border-blue-800 text-[#1E40AF] dark:text-blue-200";
      case 2:
        return "bg-[#F3E8FF] border-[#E9D5FF] dark:bg-purple-950/40 dark:border-purple-800 text-[#6B21A8] dark:text-purple-200";
      case 3:
        return "bg-[#FEF3C7] border-[#FDE68A] dark:bg-amber-950/40 dark:border-amber-800 text-[#92400E] dark:text-amber-200";
      case 4:
        return "bg-[#DCFCE7] border-[#BBF7D0] dark:bg-emerald-950/40 dark:border-emerald-800 text-[#166534] dark:text-emerald-200";
      case 5:
        return "bg-[#FCE7F3] border-[#FBCFE8] dark:bg-pink-950/40 dark:border-pink-800 text-[#9D174D] dark:text-pink-200";
      case 6:
        return "bg-[#E0F2FE] border-[#BAE6FD] dark:bg-cyan-950/40 dark:border-cyan-800 text-[#155E75] dark:text-cyan-200";
      case 7:
        return "bg-[#FFEDD5] border-[#FED7AA] dark:bg-orange-950/40 dark:border-orange-800 text-[#9A3412] dark:text-orange-200";
      default:
        return "bg-slate-50 border-slate-200 text-slate-900";
    }
  };

  const renderSlotCell = (dayKey: string, periodNum: number) => {
    const slot = slots.find(
      (s) =>
        s.day.toLowerCase() === dayKey.toLowerCase() &&
        s.periodNumber === periodNum
    );

    if (!slot) {
      return (
        <td
          key={`p${periodNum}`}
          className="p-1 sm:p-1.5 border-r border-slate-200 dark:border-slate-800 align-middle"
        >
          <div className="p-1.5 sm:p-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/20 text-center flex flex-col justify-center items-center min-h-[80px] overflow-hidden">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate">
              Free Period
            </span>
          </div>
        </td>
      );
    }

    const isLab = Boolean(slot.isLab || slot.type === "Lab");

    return (
      <td
        key={`p${periodNum}`}
        className="p-1 sm:p-1.5 border-r border-slate-200 dark:border-slate-800 align-middle"
      >
        <div
          className={`p-2 rounded-xl border transition-all text-left space-y-1 min-h-[80px] flex flex-col justify-between overflow-hidden ${getCellCardStyle(
            periodNum,
            isLab
          )}`}
        >
          <div>
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="font-mono font-bold text-[11px] sm:text-xs text-foreground tracking-tight truncate">
                {slot.code || "COURSE"}
              </span>
              <Badge
                variant="outline"
                className={`text-[8px] font-bold px-1 py-0 h-3.5 uppercase shrink-0 ${
                  isLab
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                }`}
              >
                {isLab ? "Lab" : "Theory"}
              </Badge>
            </div>

            <div
              className="text-[10px] sm:text-[11px] font-semibold leading-tight text-foreground line-clamp-2"
              title={slot.subject}
            >
              {slot.subject}
            </div>
          </div>

          <div className="pt-1 border-t border-current/15 flex items-center justify-between text-[9px] sm:text-[10px] font-medium opacity-90 gap-1">
            <span className="flex items-center gap-0.5 font-semibold truncate min-w-0">
              <Layers className="size-2.5 shrink-0" />
              <span className="truncate">{slot.section}</span>
            </span>
            <span className="flex items-center gap-0.5 shrink-0">
              <MapPin className="size-2.5 shrink-0" />
              <span className="truncate">{slot.room || "—"}</span>
            </span>
          </div>
        </div>
      </td>
    );
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 md:p-6 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="font-display font-bold text-base text-foreground">
            Weekly Timetable Grid
          </h3>
          <p className="text-xs text-muted-foreground">
            Authoritative weekly schedule synchronized with ANITS Master Timetable
          </p>
        </div>

        {/* Real Category Legend */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-[10px] font-semibold">
            <BookOpen className="size-3" /> Theory Lecture
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-semibold">
            <FlaskConical className="size-3" /> Laboratory Practice
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 text-[10px] font-semibold">
            Free Period
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <table className="w-full table-fixed text-center text-xs border-collapse font-sans bg-white dark:bg-slate-950 min-w-[640px] md:min-w-0">
          <thead>
            {/* Row 1: Navy Header with Break (Orange) and Lunch (Green) Badges */}
            <tr className="bg-[#0B192C] text-white font-bold text-xs border-b border-slate-700">
              <th className="py-3 px-2 border-r border-slate-700 w-[72px] sm:w-[80px] bg-[#0B192C] text-white shrink-0">
                Timing
              </th>
              <th className="py-3 px-1 sm:px-2 border-r border-slate-700">
                Period 1
              </th>
              <th className="py-3 px-1 sm:px-2 border-r border-slate-700">
                Period 2
              </th>
              <th className="py-3 px-1 border-r border-slate-700 bg-[#F97316] text-white font-bold w-[36px] sm:w-[42px] shrink-0 text-[11px]">
                Break
              </th>
              <th className="py-3 px-1 sm:px-2 border-r border-slate-700">
                Period 3
              </th>
              <th className="py-3 px-1 sm:px-2 border-r border-slate-700">
                Period 4
              </th>
              <th className="py-3 px-1 border-r border-slate-700 bg-[#10B981] text-white font-bold w-[36px] sm:w-[42px] shrink-0 text-[11px]">
                Lunch
              </th>
              <th className="py-3 px-1 sm:px-2 border-r border-slate-700">
                Period 5
              </th>
              <th className="py-3 px-1 sm:px-2 border-r border-slate-700">
                Period 6
              </th>
              <th className="py-3 px-1 sm:px-2">Period 7</th>
            </tr>

            {/* Row 2: Start Time */}
            <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-slate-800">
              <td className="py-2 px-2 font-bold text-[#0B192C] dark:text-white border-r border-slate-200 dark:border-slate-800 text-left pl-3 text-[11px] truncate">
                Start Time
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-medium font-mono text-[10px] sm:text-[11px] truncate">
                08:45 AM
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-medium font-mono text-[10px] sm:text-[11px] truncate">
                09:45 AM
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[10px]">
                —
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-medium font-mono text-[10px] sm:text-[11px] truncate">
                10:45 AM
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-medium font-mono text-[10px] sm:text-[11px] truncate">
                11:45 AM
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[10px]">
                —
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-medium font-mono text-[10px] sm:text-[11px] truncate">
                01:30 PM
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-medium font-mono text-[10px] sm:text-[11px] truncate">
                02:30 PM
              </td>
              <td className="py-2 px-1 font-medium font-mono text-[10px] sm:text-[11px] truncate">
                03:30 PM
              </td>
            </tr>

            {/* Row 3: End Time */}
            <tr className="bg-slate-50/40 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-slate-800">
              <td className="py-2 px-2 font-bold text-[#0B192C] dark:text-white border-r border-slate-200 dark:border-slate-800 text-left pl-3 text-[11px] truncate">
                End Time
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-medium font-mono text-[10px] sm:text-[11px] truncate">
                09:45 AM
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-medium font-mono text-[10px] sm:text-[11px] truncate">
                10:45 AM
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[10px]">
                —
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-medium font-mono text-[10px] sm:text-[11px] truncate">
                11:45 AM
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-medium font-mono text-[10px] sm:text-[11px] truncate">
                12:45 PM
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[10px]">
                —
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-medium font-mono text-[10px] sm:text-[11px] truncate">
                02:30 PM
              </td>
              <td className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 font-medium font-mono text-[10px] sm:text-[11px] truncate">
                03:30 PM
              </td>
              <td className="py-2 px-1 font-medium font-mono text-[10px] sm:text-[11px] truncate">
                04:30 PM
              </td>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {DAYS.map((dayObj, dayIdx) => (
              <tr key={dayObj.key}>
                {/* Day Header */}
                <td className="py-3 px-2 font-bold text-[#0F172A] dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 text-xs tracking-wider bg-slate-50/50 dark:bg-slate-900/30">
                  {dayObj.shortName}
                </td>

                {/* Period 1 */}
                {renderSlotCell(dayObj.key, 1)}

                {/* Period 2 */}
                {renderSlotCell(dayObj.key, 2)}

                {/* Short Break Column (spanned vertically for all 6 days on MON row) */}
                {dayIdx === 0 && (
                  <td
                    rowSpan={6}
                    className="w-[36px] sm:w-[42px] bg-[#FFF7ED] dark:bg-orange-950/20 text-[#C2410C] dark:text-orange-300 font-bold text-center border-r border-slate-200 dark:border-slate-800 select-none py-2 align-middle"
                  >
                    <span className="[writing-mode:vertical-lr] tracking-widest font-black text-[10px] sm:text-xs mx-auto block">
                      SHORT BREAK
                    </span>
                  </td>
                )}

                {/* Period 3 */}
                {renderSlotCell(dayObj.key, 3)}

                {/* Period 4 */}
                {renderSlotCell(dayObj.key, 4)}

                {/* Lunch Break Column (spanned vertically for all 6 days on MON row) */}
                {dayIdx === 0 && (
                  <td
                    rowSpan={6}
                    className="w-[36px] sm:w-[42px] bg-[#ECFDF5] dark:bg-emerald-950/20 text-[#047857] dark:text-emerald-300 font-bold text-center border-r border-slate-200 dark:border-slate-800 select-none py-2 align-middle"
                  >
                    <span className="[writing-mode:vertical-lr] tracking-widest font-black text-[10px] sm:text-xs mx-auto block">
                      LUNCH BREAK
                    </span>
                  </td>
                )}

                {/* Period 5 */}
                {renderSlotCell(dayObj.key, 5)}

                {/* Period 6 */}
                {renderSlotCell(dayObj.key, 6)}

                {/* Period 7 */}
                {renderSlotCell(dayObj.key, 7)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
