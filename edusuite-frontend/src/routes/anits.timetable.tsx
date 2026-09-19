import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useRole } from "@/context/role-context";
import { TimetableModuleView } from "@/modules/timetable";
import { StudentTimetableModule } from "@/components/student-timetable";
import {
  FacultyTimetableService,
  type FacultyTimetableResponse,
} from "@/services/FacultyTimetableService";
import { TimetableHeader } from "@/components/dashboard/timetable/timetable-header";
import { TodaySchedule } from "@/components/dashboard/timetable/today-schedule";
import { WeeklyGrid } from "@/components/dashboard/timetable/weekly-grid";
import { UpcomingClasses } from "@/components/dashboard/timetable/upcoming-classes";
import { RoomAllocationTable } from "@/components/dashboard/timetable/room-allocation-table";
import { TeachingLoadCards } from "@/components/dashboard/timetable/teaching-load-cards";
import { FreePeriodCards } from "@/components/dashboard/timetable/free-period-cards";
import { Legend } from "@/components/dashboard/timetable/legend";
import { SkeletonLoader } from "@/components/dashboard/timetable/skeleton-loader";
import { toast } from "sonner";
import { AlertCircle, RefreshCw, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/anits/timetable")({
  head: () => ({
    meta: [{ title: "My Timetable — ANITS Faculty Portal" }],
  }),
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || undefined,
    };
  },
  component: AnitsTimetablePage,
});

function AnitsTimetablePage() {
  const searchParams = Route.useSearch();
  const initialTab =
    searchParams.tab === "rooms" || searchParams.tab === "room" ? "room" : "grid";
  const { role, department } = useRole();

  const normRole = (role || "").toLowerCase();
  const isAdmin = ["super_admin", "superadmin", "admin", "principal", "academic_dean"].includes(normRole);
  const isHod = normRole === "hod";
  const isFaculty = normRole === "faculty" || normRole === "staff";

  const [facultyData, setFacultyData] = useState<FacultyTimetableResponse | null>(null);
  const [facultyLoading, setFacultyLoading] = useState(isFaculty);
  const [facultyError, setFacultyError] = useState<string | null>(null);

  // Semester filter: "all" means no restriction
  const [selectedSemester, setSelectedSemester] = useState<string>("all");

  const loadFacultyTimetable = useCallback(async (semFilter?: string) => {
    try {
      setFacultyLoading(true);
      setFacultyError(null);
      const semParam =
        !semFilter || semFilter === "all" ? undefined : Number(semFilter);
      const res = await FacultyTimetableService.fetchMyTimetable({ semester: semParam });
      setFacultyData(res);
    } catch (err: any) {
      const msg = err.message || "Unable to load your timetable. Please try again.";
      setFacultyError(msg);
      toast.error("Timetable Load Failed", { description: msg });
    } finally {
      setFacultyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFaculty) loadFacultyTimetable(selectedSemester);
  }, [isFaculty, loadFacultyTimetable]);

  const handleSemesterChange = (value: string) => {
    setSelectedSemester(value);
    loadFacultyTimetable(value);
  };

  const handleRefresh = () => {
    toast.info("Refreshing timetable from PostgreSQL…");
    loadFacultyTimetable(selectedSemester);
  };

  // ── 1. ADMIN & HOD: Institutional Timetable Manager ──────────────────────
  if (isAdmin || isHod) {
    return (
      <div className="space-y-4">
        <div className="bg-card p-4 rounded-xl border border-border/60 shadow-xs flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isHod
                ? `${department || "Department"} Timetable Management`
                : "ANITS Master Timetable Management"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isHod
                ? "Department-scoped schedule allocation with clash & room conflict validation."
                : "Institution-wide timetable control, period clash detection, and room booking."}
            </p>
          </div>
        </div>
        <TimetableModuleView initialTab={initialTab} />
      </div>
    );
  }

  // ── 2. FACULTY: Personal Timetable View ──────────────────────────────────
  if (isFaculty) {
    if (facultyLoading) return <SkeletonLoader />;

    if (facultyError) {
      return (
        <div className="p-8 text-center bg-card rounded-2xl border border-destructive/30 space-y-4">
          <AlertCircle className="size-10 text-destructive mx-auto" />
          <h3 className="font-bold text-base text-foreground">Unable to Load Timetable</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">{facultyError}</p>
          <Button onClick={handleRefresh} className="rounded-xl text-xs font-semibold gap-2">
            <RefreshCw className="size-3.5" /> Try Again
          </Button>
        </div>
      );
    }

    const availableSemesters: number[] = facultyData?.availableSemesters || [];

    // Semester label for the header
    const headerSemester =
      selectedSemester === "all"
        ? availableSemesters.length > 0
          ? "All Semesters"
          : "—"
        : `Semester ${selectedSemester}`;

    // Zero-timetable state: authenticated faculty has no MasterTimetable assignments
    if (facultyData && facultyData.weeklyGrid.length === 0) {
      return (
        <div className="space-y-6">
          <TimetableHeader
            faculty={facultyData.faculty ?? null}
            academicYear={facultyData.academicYear || "—"}
            semester={headerSemester}
            onRefresh={handleRefresh}
          />
          <div className="p-12 text-center bg-card rounded-2xl border border-border/40 space-y-4">
            <BookOpen className="size-12 text-muted-foreground/40 mx-auto" />
            <h3 className="font-bold text-base text-foreground">No Timetable Assignments Found</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              No timetable assignments found for{" "}
              <strong>{facultyData.faculty?.name || "your account"}</strong> in academic year{" "}
              <strong>{facultyData.academicYear || "the current year"}</strong>.
              {selectedSemester !== "all" && ` (Filter: Semester ${selectedSemester})`}
            </p>
            {selectedSemester !== "all" && (
              <Button
                variant="outline"
                onClick={() => handleSemesterChange("all")}
                className="rounded-xl text-xs"
              >
                Show All Semesters
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* ── Header: dynamic faculty identity, academic year, semester ── */}
        <TimetableHeader
          faculty={facultyData?.faculty ?? null}
          academicYear={facultyData?.academicYear || "—"}
          semester={headerSemester}
          onRefresh={handleRefresh}
        />

        {/* ── Semester filter — only visible when faculty teaches multiple semesters ── */}
        {availableSemesters.length > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Semester Filter:
            </span>
            <Select value={selectedSemester} onValueChange={handleSemesterChange}>
              <SelectTrigger className="h-8 w-52 text-xs rounded-xl border-border/60">
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {availableSemesters.map((sem) => (
                  <SelectItem key={sem} value={String(sem)}>
                    Semester {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ── Teaching Load Cards (all values from PostgreSQL) ── */}
        {facultyData?.teachingLoad && <TeachingLoadCards load={facultyData.teachingLoad} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* ── Weekly Timetable Grid driven by MasterTimetable records ── */}
            <WeeklyGrid slots={facultyData?.weeklyGrid || []} />
          </div>
          <div className="space-y-6">
            {/* ── Today's Schedule: IST-based current date ── */}
            <TodaySchedule schedule={facultyData?.todaySchedule || []} />
            {/* ── Upcoming Classes: next 5 sessions across days ── */}
            <UpcomingClasses classes={facultyData?.upcomingClasses || []} />
            {/* ── Free Periods: slots with no MasterTimetable assignment ── */}
            <FreePeriodCards freePeriods={facultyData?.freePeriods || []} />
          </div>
        </div>

        <RoomAllocationTable allocations={facultyData?.roomAllocations || []} />
        <Legend />
      </div>
    );
  }

  // ── 3. STUDENT: Personal Weekly Class Schedule ────────────────────────────
  return (
    <div className="space-y-4">
      <div className="bg-card p-4 rounded-xl border border-border/60 shadow-xs">
        <h2 className="text-lg font-bold text-foreground">My Weekly Class Schedule</h2>
        <p className="text-xs text-muted-foreground">
          Authoritative class timetable retrieved directly from ANITS MasterTimetable for your enrolled branch and semester.
        </p>
      </div>
      <StudentTimetableModule />
    </div>
  );
}


