import { useState, useMemo } from "react";
import { Check, X, Clock, MapPin, Search, CheckSquare, RefreshCw, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export interface AttendanceStudentItem {
  id: string;
  rollNumber: string;
  name: string;
  department?: string;
  semester?: number;
  section?: string;
  avatarUrl?: string;
  status?: "Present" | "Absent" | "Late";
  percentage?: number;
}

interface AttendanceFormProps {
  slot: {
    id: string;
    timetableId?: string;
    subject: string;
    subjectCode?: string;
    subjectName?: string;
    section: string;
    time: string;
    room?: string;
    facultyName?: string;
    date?: string;
    periodNumber?: number;
  };
  students: AttendanceStudentItem[];
  onSubmit: (records: { studentId: string; status: "Present" | "Absent" | "Late" }[]) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

type ChoiceStatus = "Present" | "Absent" | "Late";

export function AttendanceForm({ slot, students, onSubmit, onCancel, isSubmitting = false }: AttendanceFormProps) {
  const [search, setSearch] = useState("");

  // Initialize choices from student.status or default "Present"
  const [choices, setChoices] = useState<Record<string, ChoiceStatus>>(() => {
    const init: Record<string, ChoiceStatus> = {};
    students.forEach((s) => {
      init[s.id] = s.status || "Present";
    });
    return init;
  });

  const handleChoiceChange = (studentId: string, choice: ChoiceStatus) => {
    setChoices((prev) => ({ ...prev, [studentId]: choice }));
  };

  const handleMarkAll = (choice: ChoiceStatus) => {
    const updated: Record<string, ChoiceStatus> = {};
    students.forEach((s) => {
      updated[s.id] = choice;
    });
    setChoices(updated);
    toast.success(`Marked all students as ${choice}`);
  };

  const handleReset = () => {
    const updated: Record<string, ChoiceStatus> = {};
    students.forEach((s) => {
      updated[s.id] = "Present";
    });
    setChoices(updated);
    toast.info("Selections reset to Present.");
  };

  const handleSubmitForm = () => {
    const records = students.map((s) => ({
      studentId: s.id,
      status: choices[s.id] || "Present",
    }));
    onSubmit(records);
  };

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)
    );
  }, [students, search]);

  const totalCount = students.length;
  const presentCount = Object.values(choices).filter((v) => v === "Present").length;
  const lateCount = Object.values(choices).filter((v) => v === "Late").length;
  const absentCount = Object.values(choices).filter((v) => v === "Absent").length;
  const effectivePresent = presentCount + lateCount;
  const ratio = totalCount > 0 ? Math.round((effectivePresent / totalCount) * 100) : 100;

  return (
    <div className="bg-card border rounded-3xl p-5 shadow-card space-y-6 text-xs animate-in fade-in-50 duration-200">
      {/* Header bar with slot properties */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border pb-4 gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl size-9 p-0 hover:bg-muted shrink-0 cursor-pointer"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-foreground leading-tight">
                {slot.subject}
              </h3>
              <span className="font-mono text-[0.65rem] px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-bold">
                Period {slot.periodNumber || 1}
              </span>
            </div>
            <p className="text-[0.68rem] text-muted-foreground mt-0.5 font-medium flex items-center gap-2 flex-wrap">
              <span>Section: <strong className="text-foreground">{slot.section}</strong></span>
              <span>&middot;</span>
              <span className="flex items-center gap-1"><Clock className="size-3 text-primary" /> {slot.time}</span>
              {slot.room && (
                <>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1"><MapPin className="size-3 text-primary" /> {slot.room}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Live Present counts ratio */}
        <div className="flex items-center gap-3 bg-muted/40 px-4 py-2 rounded-2xl border text-[0.68rem] font-bold">
          <div className="flex items-center gap-1">
            <Check className="size-3.5 text-emerald-500" />
            <span>Present: <strong className="text-emerald-600">{presentCount}</strong></span>
          </div>
          {lateCount > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="size-3.5 text-amber-500" />
              <span>Late: <strong className="text-amber-600">{lateCount}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <X className="size-3.5 text-rose-500" />
            <span>Absent: <strong className="text-rose-600">{absentCount}</strong></span>
          </div>
          <div className="text-primary border-l border-border/60 pl-2">
            Ratio: {ratio}%
          </div>
        </div>
      </div>

      {/* Bulk action buttons & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 p-3 rounded-2xl border">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search student by name or roll..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 rounded-xl text-xs bg-background"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            onClick={() => handleMarkAll("Present")}
            variant="outline"
            disabled={isSubmitting}
            className="rounded-xl cursor-pointer hover:bg-muted text-[0.62rem] h-8 px-2.5 font-bold text-emerald-600 border-emerald-500/20"
          >
            <CheckSquare className="size-3.5 mr-1" /> Mark All Present
          </Button>
          <Button
            onClick={() => handleMarkAll("Absent")}
            variant="outline"
            disabled={isSubmitting}
            className="rounded-xl cursor-pointer hover:bg-muted text-[0.62rem] h-8 px-2.5 font-bold text-rose-600 border-rose-500/20"
          >
            <X className="size-3.5 mr-1" /> Mark All Absent
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={isSubmitting}
            className="rounded-xl cursor-pointer hover:bg-muted text-[0.62rem] h-8 px-2.5 font-semibold"
          >
            <RefreshCw className="size-3.5 mr-1 text-primary" /> Reset
          </Button>
        </div>
      </div>

      {/* Student rows deck */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-2xl text-muted-foreground text-xs">
            No students found matching "{search}".
          </div>
        ) : (
          filteredStudents.map((stud) => {
            const currentChoice = choices[stud.id] || "Present";
            const isAbsent = currentChoice === "Absent";
            const isLate = currentChoice === "Late";

            return (
              <div
                key={stud.id}
                className={`flex flex-col sm:flex-row items-center justify-between p-3 rounded-2xl border transition-all duration-200 gap-3 ${
                  isAbsent
                    ? "border-rose-500/30 bg-rose-500/5"
                    : isLate
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "bg-card hover:bg-muted/20"
                }`}
              >
                {/* Profile Block */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Avatar className="size-9 rounded-xl shrink-0 border border-border">
                    <AvatarImage src={stud.avatarUrl} />
                    <AvatarFallback className="rounded-xl font-bold bg-primary/10 text-primary text-[0.68rem]">
                      {stud.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h5 className="font-extrabold text-[0.75rem] text-foreground leading-snug truncate">
                      {stud.name}
                    </h5>
                    <p className="font-mono text-[0.62rem] text-muted-foreground mt-0.5 font-bold">
                      {stud.rollNumber} &middot; Section: {stud.section || slot.section}
                    </p>
                  </div>
                </div>

                {/* Status Radio Choice Selectors */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  {[
                    { value: "Present" as const, label: "Present", color: "peer-checked:bg-emerald-600 peer-checked:text-white border-emerald-500/20 text-emerald-600" },
                    { value: "Late" as const, label: "Late", color: "peer-checked:bg-amber-500 peer-checked:text-white border-amber-500/20 text-amber-600" },
                    { value: "Absent" as const, label: "Absent", color: "peer-checked:bg-rose-600 peer-checked:text-white border-rose-500/20 text-rose-600" },
                  ].map((opt) => (
                    <label key={opt.value} className="relative cursor-pointer shrink-0">
                      <input
                        type="radio"
                        name={`attend-${stud.id}`}
                        value={opt.value}
                        checked={currentChoice === opt.value}
                        disabled={isSubmitting}
                        onChange={() => handleChoiceChange(stud.id, opt.value)}
                        className="sr-only peer"
                      />
                      <div
                        className={`px-3 py-1 rounded-xl border text-[0.65rem] font-extrabold transition-all duration-200 hover:bg-muted text-center min-w-[58px] select-none ${opt.color}`}
                      >
                        {opt.label}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Submittal Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-border/40">
        <p className="text-[0.65rem] text-muted-foreground">
          Showing <strong className="text-foreground">{filteredStudents.length}</strong> of {totalCount} enrolled students
        </p>

        <div className="flex items-center gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={isSubmitting}
            className="rounded-xl cursor-pointer hover:bg-muted text-xs h-9 px-4 font-semibold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitForm}
            disabled={isSubmitting}
            className="rounded-xl bg-brand-gradient shadow-glow cursor-pointer text-xs h-9 px-5 font-bold min-w-[150px] flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Check className="size-3.5" /> Submit Attendance
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
