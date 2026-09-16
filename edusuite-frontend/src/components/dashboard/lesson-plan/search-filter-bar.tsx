import { Search, Plus, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedStatus: string;
  onStatusChange: (val: string) => void;
  selectedSubject: string;
  onSubjectChange: (val: string) => void;
  uniqueSubjects: { id: string; code: string; name: string }[] | string[];
  onCreatePlan?: () => void;
  viewMode?: "grid" | "table";
  onViewModeChange?: (mode: "grid" | "table") => void;
}

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedSubject,
  onSubjectChange,
  uniqueSubjects,
  onCreatePlan,
  viewMode = "grid",
  onViewModeChange,
}: SearchFilterBarProps) {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-muted/40 p-4 rounded-2xl border text-xs">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search lesson plans by course name, code, unit, topic..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-background rounded-xl h-10 text-xs w-full"
        />
      </div>

      {/* Select Filters & Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Select value={selectedSubject} onValueChange={onSubjectChange}>
          <SelectTrigger className="w-full sm:w-[170px] rounded-xl h-10 bg-background text-xs">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Subjects</SelectItem>
            {uniqueSubjects.map((sub: any) => {
              const val = typeof sub === "string" ? sub : sub.id;
              const label = typeof sub === "string" ? sub : `${sub.code} - ${sub.name}`;
              return (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:w-[140px] rounded-xl h-10 bg-background text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PLANNED">Planned</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="POSTPONED">Postponed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* View mode toggle */}
        {onViewModeChange && (
          <div className="flex items-center border rounded-xl bg-background p-1 h-10">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table List View"
            >
              <List className="size-4" />
            </button>
          </div>
        )}

        {/* Create Lesson Plan Button */}
        {onCreatePlan && (
          <Button
            onClick={onCreatePlan}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer text-xs h-10 px-4 font-semibold shrink-0"
          >
            <Plus className="size-4 mr-1.5" /> Create Lesson Plan
          </Button>
        )}
      </div>
    </div>
  );
}
