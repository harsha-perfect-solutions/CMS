import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { AlertCircle, RefreshCw, CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Services & Types
import {
  FacultyTimetableService,
  recalculateSlotStatus,
  type FacultyTimetableResponse,
} from "@/services/FacultyTimetableService";

// Subcomponents imports
import { TimetableHeader } from "@/components/dashboard/timetable/timetable-header";
import { FilterPanel } from "@/components/dashboard/timetable/filter-panel";
import { TodaySchedule } from "@/components/dashboard/timetable/today-schedule";
import { WeeklyGrid } from "@/components/dashboard/timetable/weekly-grid";
import { MonthlyCalendar } from "@/components/dashboard/timetable/monthly-calendar";
import { UpcomingClasses } from "@/components/dashboard/timetable/upcoming-classes";
import { SubjectSummary } from "@/components/dashboard/timetable/subject-summary";
import { RoomAllocationTable } from "@/components/dashboard/timetable/room-allocation-table";
import { TeachingLoadCards } from "@/components/dashboard/timetable/teaching-load-cards";
import { FreePeriodCards } from "@/components/dashboard/timetable/free-period-cards";
import { ConflictPanel } from "@/components/dashboard/timetable/conflict-panel";
import { Legend } from "@/components/dashboard/timetable/legend";
import { SkeletonLoader } from "@/components/dashboard/timetable/skeleton-loader";

export const Route = createFileRoute("/faculty/timetable")({
  head: () => ({
    meta: [{ title: "Timetable — EduSuite Pro" }],
  }),
  component: FacultyTimetablePage,
});

function FacultyTimetablePage() {
  const [data, setData] = useState<FacultyTimetableResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSemester, setActiveSemester] = useState("all");
  const [activeWeek, setActiveWeek] = useState("Week 5 (Active)");
  const [activeYear, setActiveYear] = useState("2026-27");

  // Fetch authentic timetable from PostgreSQL via backend API
  const loadTimetable = useCallback(
    async (showSuccessToast = false) => {
      try {
        setLoading(true);
        setError(null);

        const result = await FacultyTimetableService.fetchMyTimetable({
          semester: activeSemester,
          week: activeWeek,
          academicYear: activeYear,
        });

        setData(result);

        if (showSuccessToast) {
          toast.success("Timetable synchronized with PostgreSQL", {
            description: `Loaded schedule for ${result.faculty?.name || "authenticated faculty"}.`,
          });
        }
      } catch (err: any) {
        console.error("Failed to load authenticated faculty timetable:", err);
        setError(err.message || "Unable to load timetable data.");
        toast.error("Timetable sync failed", {
          description: err.message || "Please retry connecting to server.",
        });
      } finally {
        setLoading(false);
      }
    },
    [activeSemester, activeWeek, activeYear]
  );

  useEffect(() => {
    loadTimetable(false);
  }, [loadTimetable]);

  // Real-time client-side status ticker: smooth transitions from Upcoming -> Ongoing -> Completed
  useEffect(() => {
    if (!data?.todaySchedule || data.todaySchedule.length === 0) return;

    const interval = setInterval(() => {
      setData((prev) => {
        if (!prev || !prev.todaySchedule) return prev;
        const updatedToday = prev.todaySchedule.map((slot) => {
          const newStatus = recalculateSlotStatus(slot.startTime, slot.endTime);
          return {
            ...slot,
            status: newStatus,
            isOngoing: newStatus === "Ongoing",
          };
        });
        return {
          ...prev,
          todaySchedule: updatedToday,
        };
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [data?.todaySchedule]);

  const handleRefresh = () => {
    loadTimetable(true);
  };

  const handleFilterChange = (filters: Record<string, string>) => {
    if (filters["sem"]) setActiveSemester(filters["sem"]);
    if (filters["week"]) setActiveWeek(filters["week"]);
    if (filters["ay"]) setActiveYear(filters["ay"]);
  };

  // 1. Error State
  if (error && !data) {
    return (
      <div className="space-y-6">
        <TimetableHeader
          academicYear={activeYear}
          semester={activeSemester}
          onRefresh={handleRefresh}
        />
        <div className="border border-destructive/40 bg-destructive/5 rounded-2xl p-10 text-center space-y-4">
          <div className="size-12 rounded-2xl bg-destructive/10 text-destructive grid place-items-center mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Unable to load timetable data.</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{error}</p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="rounded-xl cursor-pointer hover:bg-muted text-xs h-9 px-4"
          >
            <RefreshCw className="size-3.5 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const faculty = data?.faculty || null;
  const load = data?.teachingLoad || {
    weeklyClasses: 0,
    theoryHours: 0,
    labHours: 0,
    totalHours: 0,
    totalSubjects: 0,
    totalSections: 0,
  };

  return (
    <div className="space-y-6">
      {/* Printable Institutional Header (visible only when printing) */}
      <div className="hidden print:block mb-6 p-4 border border-black/40 rounded-lg text-black font-sans space-y-3">
        <div className="flex justify-between items-start border-b border-black/30 pb-3">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-black">
              EduSuite Pro ERP — Faculty Academic Timetable
            </h1>
            <p className="text-xs text-gray-700">Official Institutional Teaching Schedule</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Academic Year: {data?.academicYear || "2026-27"}</p>
            <p>Semester: {activeSemester === "all" ? "All Semesters" : `Semester ${activeSemester}`}</p>
            <p>Generated: {data?.currentDate || new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="font-bold">Faculty Name:</span> {faculty?.name || "N/A"}
          </div>
          <div>
            <span className="font-bold">Faculty ID:</span> {faculty?.rollNumber || "N/A"}
          </div>
          <div>
            <span className="font-bold">Department:</span> {faculty?.department || "N/A"}
          </div>
          <div>
            <span className="font-bold">Designation:</span> {faculty?.designation || "N/A"}
          </div>
        </div>
      </div>

      {/* 1. Header Toolbar */}
      <TimetableHeader
        academicYear={data?.academicYear || activeYear}
        semester={activeSemester === "all" ? "All Semesters" : `Semester ${activeSemester}`}
        faculty={faculty}
        onRefresh={handleRefresh}
      />

      {/* 2. Loading state vs Content */}
      {loading && !data ? (
        <SkeletonLoader />
      ) : (
        <div className="space-y-6">
          {/* Today's Schedule horizontal cards */}
          <TodaySchedule schedule={data?.todaySchedule || []} />

          {/* Load Summary Statistics Cards (calculated from PostgreSQL) */}
          <TeachingLoadCards load={load} />

          {/* Grid filter options */}
          <FilterPanel
            availableSemesters={data?.availableSemesters || [1, 3, 5, 7]}
            selectedSemester={activeSemester}
            selectedYear={activeYear}
            selectedWeek={activeWeek}
            onFilterChange={handleFilterChange}
          />

          {/* Empty state if faculty has no timetable assigned */}
          {data && data.weeklyGrid.length === 0 ? (
            <div className="border border-dashed rounded-2xl bg-card p-12 text-center space-y-3">
              <div className="size-12 rounded-2xl bg-muted/20 grid place-items-center mx-auto text-muted-foreground">
                <CalendarX2 className="size-6" />
              </div>
              <h3 className="font-bold text-base text-foreground">No timetable assigned for this period.</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                There are no active lecture or lab allocations assigned to your profile for the selected academic semester.
              </p>
            </div>
          ) : (
            /* Layout Grid split */
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column (Spans 2 on desktop: Weekly Grid, Monthly Calendar, Summary) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Weekly timetable table */}
                <WeeklyGrid slots={data?.weeklyGrid || []} />

                {/* Monthly calendar view */}
                <MonthlyCalendar events={data?.conflicts ? [] : []} />

                {/* Rooms & Labs Assigned */}
                <RoomAllocationTable allocations={data?.roomAllocations || []} />

                {/* Courses Summary details */}
                <SubjectSummary subjects={data?.subjectSummary || []} />
              </div>

              {/* Right Column (Sidebar helper widgets: Upcoming periods, Free spaces, conflict rad, legend) */}
              <div className="space-y-6 lg:col-span-1">
                <UpcomingClasses classes={data?.upcomingClasses || []} />
                <FreePeriodCards freePeriods={data?.freePeriods || []} />
                <ConflictPanel conflicts={data?.conflicts || []} />
                <Legend />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
