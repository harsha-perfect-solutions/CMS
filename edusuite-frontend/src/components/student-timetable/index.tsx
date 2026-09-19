import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { TimetableModuleView } from "@/modules/timetable";
import { Skeleton } from "@/components/ui/skeleton";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StudentTimetableModule() {
  const [studentInfo, setStudentInfo] = useState<{
    branch: string;
    semester: number;
    section: string;
    studentName?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/students/my-timetable");
      if (res.data) {
        setStudentInfo({
          branch: res.data.branch || res.data.student?.department || "CSE",
          semester: res.data.semester || res.data.student?.semester || 5,
          section: res.data.section || res.data.student?.section || "Section A",
          studentName: res.data.student?.name,
        });
      }
    } catch (err: any) {
      console.error("Failed to load student timetable profile:", err);
      const errMsg = err.response?.data?.error || err.message || "Unable to load student timetable from PostgreSQL.";
      setError(errMsg);
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

  if (error && !studentInfo) {
    return (
      <div className="p-8 text-center bg-card rounded-2xl border border-destructive/30 space-y-4 max-w-lg mx-auto mt-8 shadow-xs">
        <AlertCircle className="size-10 text-destructive mx-auto" />
        <h3 className="font-bold text-base text-foreground">Unable to load timetable data</h3>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button onClick={fetchStudentSchedule} className="rounded-xl text-xs font-semibold gap-2">
          <RefreshCw className="size-3.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <TimetableModuleView
        isStudentView={true}
        initialBranch={studentInfo?.branch || "CSE"}
        initialSem={studentInfo?.semester || 5}
        initialSec={studentInfo?.section || "Section A"}
      />
    </div>
  );
}
