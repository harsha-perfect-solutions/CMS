import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useRole } from "@/context/role-context";
import { TimetableModuleView } from "@/modules/timetable";
import { StudentTimetableModule } from "@/components/student-timetable";
import {
  FacultyTimetableService,
  type FacultyTimetableResponse,
} from "@/services/FacultyTimetableService";
import { TimetableHeader } from "@/components/dashboard/timetable/timetable-header";
import { FilterPanel } from "@/components/dashboard/timetable/filter-panel";
import { TodaySchedule } from "@/components/dashboard/timetable/today-schedule";
import { WeeklyGrid } from "@/components/dashboard/timetable/weekly-grid";
import { UpcomingClasses } from "@/components/dashboard/timetable/upcoming-classes";
import { RoomAllocationTable } from "@/components/dashboard/timetable/room-allocation-table";
import { TeachingLoadCards } from "@/components/dashboard/timetable/teaching-load-cards";
import { FreePeriodCards } from "@/components/dashboard/timetable/free-period-cards";
import { ConflictPanel } from "@/components/dashboard/timetable/conflict-panel";
import { Legend } from "@/components/dashboard/timetable/legend";
import { SkeletonLoader } from "@/components/dashboard/timetable/skeleton-loader";
import { toast } from "sonner";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/anits/timetable")({
  head: () => ({
    meta: [{ title: "Timetable Management — ANITS" }],
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
  const initialTab = searchParams.tab === "rooms" || searchParams.tab === "room" ? "room" : "grid";
  const { role, department } = useRole();

  // Determine user persona
  const normRole = (role || "").toLowerCase();
  const isAdmin = ["super_admin", "superadmin", "admin", "principal", "academic_dean"].includes(normRole);
  const isHod = normRole === "hod";
  const isFaculty = normRole === "faculty" || normRole === "staff";
  const isStudent = normRole === "student";

  // Faculty state
  const [facultyData, setFacultyData] = useState<FacultyTimetableResponse | null>(null);
  const [facultyLoading, setFacultyLoading] = useState(isFaculty);
  const [facultyError, setFacultyError] = useState<string | null>(null);

  const loadFacultyTimetable = async () => {
    try {
      setFacultyLoading(true);
      setFacultyError(null);
      const res = await FacultyTimetableService.fetchMyTimetable();
      setFacultyData(res);
    } catch (err: any) {
      setFacultyError(err.message || "Failed to load faculty timetable from PostgreSQL.");
    } finally {
      setFacultyLoading(false);
    }
  };

  useEffect(() => {
    if (isFaculty) {
      loadFacultyTimetable();
    }
  }, [isFaculty]);

  // 1. ADMIN & HOD: MasterTimetable Manager
  if (isAdmin || isHod) {
    return (
      <div className="space-y-4">
        <div className="bg-card p-4 rounded-xl border border-border/60 shadow-xs flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isHod ? `${department || "Department"} Timetable Management` : "ANITS Master Timetable Management"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isHod
                ? "Department-scoped schedule allocation with instant clash & room conflict validation."
                : "Institution-wide timetable control, period clash detection, and room booking."}
            </p>
          </div>
        </div>
        <TimetableModuleView initialTab={initialTab} />
      </div>
    );
  }

  // 2. FACULTY: Personal Timetable View
  if (isFaculty) {
    if (facultyLoading) {
      return <SkeletonLoader />;
    }

    if (facultyError) {
      return (
        <div className="p-8 text-center bg-card rounded-2xl border border-destructive/30 space-y-4">
          <AlertCircle className="size-10 text-destructive mx-auto" />
          <h3 className="font-bold text-base text-foreground">Failed to Load Timetable</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">{facultyError}</p>
          <Button onClick={loadFacultyTimetable} className="rounded-xl text-xs font-semibold gap-2">
            <RefreshCw className="size-3.5" /> Try Again
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <TimetableHeader
          faculty={facultyData?.faculty || null}
          academicYear={facultyData?.academicYear || "2026-27"}
          academicWeek={facultyData?.academicWeek || "Week 5"}
          currentDate={facultyData?.currentDate || ""}
          onRefresh={loadFacultyTimetable}
          isRefreshing={facultyLoading}
        />

        {facultyData?.teachingLoad && <TeachingLoadCards load={facultyData.teachingLoad} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <WeeklyGrid
              slots={facultyData?.weeklyGrid || []}
              activeSemester="all"
              onSlotClick={() => {}}
            />
          </div>
          <div className="space-y-6">
            <TodaySchedule schedule={facultyData?.todaySchedule || []} />
            <UpcomingClasses classes={facultyData?.upcomingClasses || []} />
            <FreePeriodCards freePeriods={facultyData?.freePeriods || []} />
          </div>
        </div>

        <RoomAllocationTable allocations={facultyData?.roomAllocations || []} />
        <Legend />
      </div>
    );
  }

  // 3. STUDENT: Personal Weekly Class Schedule
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
