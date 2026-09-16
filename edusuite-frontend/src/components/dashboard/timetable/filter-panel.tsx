import { useState, useEffect } from "react";
import { Filter } from "lucide-react";
import { Panel } from "@/components/dashboard/panel";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface FilterPanelProps {
  availableSemesters?: number[];
  selectedSemester?: string;
  selectedYear?: string;
  selectedWeek?: string;
  onFilterChange: (filters: Record<string, string>) => void;
}

export function FilterPanel({
  availableSemesters = [1, 3, 5, 7],
  selectedSemester = "all",
  selectedYear = "2026-27",
  selectedWeek = "Week 5 (Active)",
  onFilterChange,
}: FilterPanelProps) {
  const [ay, setAy] = useState(selectedYear);
  const [sem, setSem] = useState(selectedSemester);
  const [week, setWeek] = useState(selectedWeek);

  useEffect(() => {
    setAy(selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    setSem(selectedSemester);
  }, [selectedSemester]);

  useEffect(() => {
    setWeek(selectedWeek);
  }, [selectedWeek]);

  const handleApply = () => {
    onFilterChange({ ay, sem, week });
  };

  const semestersList = availableSemesters.length > 0 ? availableSemesters : [1, 3, 5, 7];

  return (
    <Panel
      title="Filter Calendar & Grid"
      description="Refine your personal timetable schedule matrix for other semesters or academic weeks"
      className="border border-border bg-card rounded-2xl p-5 shadow-card print:hidden"
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Academic Year */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Academic Year</Label>
            <Select value={ay} onValueChange={setAy}>
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-27">2026-27 (Current Active)</SelectItem>
                <SelectItem value="2025-26">2025-26</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Semester */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Semester</Label>
            <Select value={sem} onValueChange={setSem}>
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue placeholder="Select Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assigned Semesters</SelectItem>
                {semestersList.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    Semester {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Academic Week */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Academic Week</Label>
            <Select value={week} onValueChange={setWeek}>
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue placeholder="Academic Week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Week 4">Week 4</SelectItem>
                <SelectItem value="Week 5 (Active)">Week 5 (Current Active)</SelectItem>
                <SelectItem value="Week 6">Week 6</SelectItem>
                <SelectItem value="Week 7">Week 7</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <Button
            onClick={handleApply}
            className="rounded-xl bg-brand-gradient shadow-glow h-9 px-4 text-xs cursor-pointer flex items-center gap-1.5"
          >
            <Filter className="size-3.5" /> Apply Filters
          </Button>
        </div>
      </div>
    </Panel>
  );
}
