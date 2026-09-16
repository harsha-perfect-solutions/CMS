import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { AdmissionModuleView } from "@/modules/admission";
import { useRole } from "@/context/role-context";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admission")({
  head: () => ({
    meta: [{ title: "Admission Management — EduSuite Pro" }],
  }),
  component: AdmissionPage,
});

function AdmissionPage() {
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
    const returnUrl = isHod ? "/hod/dashboard" : "/faculty/dashboard";
    const returnLabel = isHod ? "Return to HOD Dashboard" : "Return to Faculty Dashboard";
    const roleLabel = isFaculty ? "Faculty" : "HOD";

    return (
      <DashboardLayout>
        <div className="flex h-[70vh] items-center justify-center p-4">
          <div className="text-center max-w-md border border-destructive/20 bg-destructive/5 rounded-2xl p-6 shadow-xs">
            <ShieldAlert className="size-10 text-destructive mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground">403 — Unauthorized Access</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              The {roleLabel} role is not authorized to access the Admission Office module.
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
    <DashboardLayout>
      <AdmissionModuleView />
    </DashboardLayout>
  );
}
