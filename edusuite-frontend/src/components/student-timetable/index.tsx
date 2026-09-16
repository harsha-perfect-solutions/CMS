import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { TimetableModuleView } from "@/modules/timetable";
import { Skeleton } from "@/components/ui/skeleton";

export function StudentTimetableModule() {
  const [studentInfo, setStudentInfo] = useState<{
    branch: string;
    semester: number;
    section: string;
    studentName?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudentSchedule = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/students/my-timetable");
      if (res.data) {
        setStudentInfo({
          branch: res.data.branch || "CSE",
          semester: res.data.semester || 1,
          section: res.data.section || "Section A",
          studentName: res.data.student?.name,
        });
      }
    } catch (err: any) {
      console.error("Failed to load student timetable profile:", err);
      // Fallback defaults if student not logged in or backend unavailable
      setStudentInfo({
        branch: "CSE",
        semester: 1,
        section: "Section A",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentSchedule();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <TimetableModuleView
        isStudentView={true}
        initialBranch={studentInfo?.branch || "CSE"}
        initialSem={studentInfo?.semester || 1}
        initialSec={studentInfo?.section || "Section A"}
      />
    </div>
  );
}
