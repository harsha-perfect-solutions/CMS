import { Search, Grid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { AssignedClass } from "./my-classes-banner";

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  assignedClasses: AssignedClass[];
  selectedClassId: string;
  onClassChange: (val: string) => void;
  selectedThreshold: string;
  onThresholdChange: (val: string) => void;
  selectedStatus: string;
  onStatusChange: (val: string) => void;
  selectedMentoring: string;
  onMentoringChange: (val: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export function SearchFilterBar({
  searchQuery = "",
  onSearchChange,
  assignedClasses = [],
  selectedClassId = "ALL",
  onClassChange,
  selectedThreshold = "ALL",
  onThresholdChange,
  selectedStatus = "ALL",
  onStatusChange,
  selectedMentoring = "ALL",
  onMentoringChange,
  viewMode = "grid",
  onViewModeChange,
}: SearchFilterBarProps) {
  const classesList = assignedClasses || [];

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 bg-muted/40 p-4 rounded-2xl border text-xs">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search my students by name, roll number, or email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-background rounded-xl h-10 text-xs"
        />
      </div>

      {/* Select Filters and Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Class / Section Selector */}
        <Select value={selectedClassId} onValueChange={onClassChange}>
          <SelectTrigger className="w-[190px] rounded-xl h-10 bg-background text-xs truncate">
            <SelectValue placeholder="My Classes" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="ALL">All My Classes</SelectItem>
            {classesList.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Threshold Filter */}
        <Select value={selectedThreshold} onValueChange={onThresholdChange}>
          <SelectTrigger className="w-[145px] rounded-xl h-10 bg-background text-xs">
            <SelectValue placeholder="Threshold" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Thresholds</SelectItem>
            <SelectItem value="Shortage">Attendance Shortage (&lt;75%)</SelectItem>
            <SelectItem value="AtRisk">Academic Risk (&lt;7.0)</SelectItem>
            <SelectItem value="Normal">Normal Standing</SelectItem>
          </SelectContent>
        </Select>

        {/* Student Status Filter */}
        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[120px] rounded-xl h-10 bg-background text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* Advisory / Mentoring Filter */}
        <Select value={selectedMentoring} onValueChange={onMentoringChange}>
          <SelectTrigger className="w-[125px] rounded-xl h-10 bg-background text-xs">
            <SelectValue placeholder="Advisory" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Students</SelectItem>
            <SelectItem value="Mentees">Mentees Only</SelectItem>
          </SelectContent>
        </Select>

        {/* View Mode Toggle */}
        <div className="flex border rounded-xl bg-background overflow-hidden p-0.5 shrink-0 ml-auto sm:ml-0">
          <Button
            onClick={() => onViewModeChange("grid")}
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            className="size-8 rounded-lg p-0 hover:bg-muted cursor-pointer flex justify-center items-center"
            title="Grid View"
          >
            <Grid className="size-4 text-muted-foreground" />
          </Button>
          <Button
            onClick={() => onViewModeChange("list")}
            variant={viewMode === "list" ? "secondary" : "ghost"}
            className="size-8 rounded-lg p-0 hover:bg-muted cursor-pointer flex justify-center items-center"
            title="List View"
          >
            <List className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
}
