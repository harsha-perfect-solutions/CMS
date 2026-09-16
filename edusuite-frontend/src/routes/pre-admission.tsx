import { createFileRoute, Link } from "@tanstack/react-router";
import {
  GraduationCap,
  LayoutDashboard,
  LogIn,
  PhoneCall,
  Mail,
  Globe,
  Building2,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { PreAdmissionCandidatePortal } from "@/modules/admission/PreAdmissionModule";
import { useRole } from "@/context/role-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brand } from "@/config/branding";

export const Route = createFileRoute("/pre-admission")({
  head: () => ({
    meta: [
      { title: "Candidate Pre-Admission Portal — EduSuite Pro" },
      {
        name: "description",
        content:
          "Autonomous College Candidate Online Application, Status Tracker & Document Auditor 2026-27.",
      },
    ],
  }),
  component: PreAdmissionPage,
});

function PreAdmissionPage() {
  const { role, flags } = useRole();
  const isFaculty = role === "faculty" || role === "staff";
  const isHod = role === "hod" || flags.includes("isHod");
  const hasAdmissionPrivilege =
    role === "super-admin" ||
    role === "super_admin" ||
    role === "admin" ||
    flags.includes("isSystemAdmin") ||
    flags.includes("isAdmissionOfficer") ||
    flags.includes("isPrincipal") ||
    flags.includes("isVicePrincipal") ||
    flags.includes("isDean");

  if ((isFaculty || isHod) && !hasAdmissionPrivilege) {
    const returnUrl = isFaculty ? "/faculty/dashboard" : "/hod/dashboard";
    const returnLabel = isFaculty ? "Return to Faculty Dashboard" : "Return to HOD Dashboard";
    const roleLabel = isFaculty ? "Faculty" : "HOD";

    return (
      <DashboardLayout>
        <div className="flex h-[70vh] items-center justify-center p-4">
          <div className="text-center max-w-md border border-destructive/20 bg-destructive/5 rounded-2xl p-6 shadow-xs">
            <ShieldAlert className="size-10 text-destructive mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground">403 — Unauthorized Access</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              The {roleLabel} role is not authorized to access the Pre-Admission Portal.
            </p>
            <Button asChild className="rounded-xl">
              <Link to={returnUrl as any}>{returnLabel}</Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <PreAdmissionPortalLayout>
      <PreAdmissionCandidatePortal />
    </PreAdmissionPortalLayout>
  );
}

function PreAdmissionPortalLayout({ children }: { children: React.ReactNode }) {
  const { role } = useRole();
  const isAuthenticated = typeof window !== "undefined" && !!localStorage.getItem("token");

  const dashboardRoute =
    role === "super-admin" || role === "super_admin"
      ? "/super-admin"
      : role === "student"
      ? "/student/dashboard"
      : role === "faculty"
      ? "/faculty/dashboard"
      : "/dashboard";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* PUBLIC CANDIDATE PORTAL HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-xs">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Candidate Portal Brand Identity */}
          <div className="flex items-center gap-3">
            <Link to="/pre-admission" className="flex items-center gap-2.5 group">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow transition-transform group-hover:scale-105">
                <GraduationCap className="size-5" />
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-black text-base tracking-tight text-foreground">
                    {brand.name}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[0.6rem] font-bold px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-500/20"
                  >
                    Admissions Cell
                  </Badge>
                </div>
                <span className="text-[0.65rem] text-muted-foreground font-medium">
                  Candidate Pre-Admission Portal 2026-27
                </span>
              </div>
            </Link>
          </div>

          {/* Right: Dynamic Action Button */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button
                asChild
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 rounded-xl gap-2 shadow-glow transition-all"
              >
                <Link to={dashboardRoute as any}>
                  <LayoutDashboard className="size-4" /> Back to Dashboard
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="font-semibold text-xs h-9 px-4 rounded-xl gap-2 border-border/80 hover:bg-accent"
              >
                <Link to="/login">
                  <LogIn className="size-4 text-primary" /> Staff / Student Login
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CANDIDATE PORTAL CONTENT VIEWPORT */}
      <main className="flex-1 w-full py-6">
        {children}
      </main>

      {/* PUBLIC CANDIDATE PORTAL FOOTER */}
      <footer className="border-t border-border/80 bg-muted/30 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <span className="font-semibold text-foreground">
              Autonomous Institute of Technology & Research
            </span>
            <span>&middot; Admissions & Convener Office</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[0.72rem]">
            <span className="flex items-center gap-1">
              <PhoneCall className="size-3.5 text-blue-600" /> Helpline: +91 1800-425-9999
            </span>
            <span className="flex items-center gap-1">
              <Mail className="size-3.5 text-emerald-600" /> Email: admissions@edusuitepro.com
            </span>
          </div>

          <p className="text-[0.68rem] text-center md:text-right font-mono">
            &copy; 2026 EduSuite Pro Autonomous College ERP &middot; All Rights Reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
