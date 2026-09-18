import { Search, RefreshCw, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedSubject: string;
  onSubjectChange: (val: string) => void;
  selectedSection: string;
  onSectionChange: (val: string) => void;
  uniqueSubjects?: string[];
  uniqueSections?: string[];
  subjectsList?: string[];
  sectionsList?: string[];
  onRefresh: () => void;
  onExport?: () => void;
}

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  selectedSubject,
  onSubjectChange,
  selectedSection,
  onSectionChange,
  uniqueSubjects,
  uniqueSections,
  subjectsList,
  sectionsList,
  onRefresh,
  onExport,
}: SearchFilterBarProps) {
  const handleExport = async () => {
    if (onExport) {
      onExport();
      return;
    }
    try {
      toast.info("Generating attendance export from PostgreSQL...");
      const res = await api.get("/api/attendance/faculty/export");
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const headers = ["Date", "Subject", "CourseCode", "Section", "Period", "Student", "RollNumber", "Status"];
        const csvRows = [headers.join(",")];
        for (const row of res.data) {
          csvRows.push([
            `"${row.Date || ""}"`,
            `"${(row.Subject || "").replace(/"/g, '""')}"`,
            `"${row.CourseCode || ""}"`,
            `"${row.Section || ""}"`,
            row.Period || 1,
            `"${(row.Student || "").replace(/"/g, '""')}"`,
            `"${row.RollNumber || ""}"`,
            `"${row.Status || ""}"`,
          ].join(","));
        }
        const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `faculty_attendance_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Attendance export downloaded successfully.");
      } else {
        toast.warning("No attendance records found to export.");
      }
    } catch (err: any) {
      toast.error("Failed to export attendance records.");
    }
  };

  const rawSubjects = uniqueSubjects || subjectsList || [];
  const rawSections = uniqueSections || sectionsList || [];
  const subjects = Array.from(new Set(rawSubjects.filter(Boolean)));
  const sections = Array.from(new Set(rawSections.filter(Boolean)));

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 bg-muted/40 p-4 rounded-2xl border text-xs">
      {/* Search Input */}
      <div className="relative w-full sm:flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search student by name or roll number..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-background rounded-xl h-10 text-xs"
        />
      </div>

      {/* Select Filters and Action buttons */}
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <Select value={selectedSubject} onValueChange={onSubjectChange}>
          <SelectTrigger className="w-full sm:w-[130px] rounded-xl h-10 bg-background text-xs">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Subjects</SelectItem>
            {subjects.map((sub) => (
              <SelectItem key={sub} value={sub}>
                {sub}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSection} onValueChange={onSectionChange}>
          <SelectTrigger className="w-full sm:w-[110px] rounded-xl h-10 bg-background text-xs">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sections</SelectItem>
            {sections.map((sec) => (
              <SelectItem key={sec} value={sec}>
                {sec}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          className="rounded-xl h-10 w-10 shrink-0"
          title="Refresh Data"
        >
          <RefreshCw className="size-4 text-muted-foreground" />
        </Button>

        <Button
          variant="outline"
          onClick={handleExport}
          className="rounded-xl h-10 text-xs font-bold gap-1.5 shrink-0"
        >
          <FileSpreadsheet className="size-4 text-emerald-600" />
          Export
        </Button>
      </div>
    </div>
  );
}
