import { createFileRoute, Outlet, useRouterState, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnitsShell } from "@/components/anits/anits-shell";
import type { AnitsUserProfile } from "@/components/anits/anits-header";
import api from "@/lib/api";

export const Route = createFileRoute("/anits")({
  head: () => ({
    meta: [{ title: "ANITS — Attendance & Timetable Management" }],
  }),
  component: AnitsLayout,
});

function AnitsLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [user, setUser] = useState<AnitsUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // If this is the standalone login or forgot-password page, render directly
  const isAuthPage = pathname === "/anits/login" || pathname === "/anits/forgot-password";

  useEffect(() => {
    if (isAuthPage) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token") || localStorage.getItem("cms_token");
    if (!token) {
      navigate({ to: "/anits/login" as any });
      return;
    }

    // Try reading cached user first
    const cachedUser = localStorage.getItem("cms_user");
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        let anitsRole = parsed.anitsRole;
        if (!anitsRole) {
          const r = (parsed.role || "").toLowerCase();
          if (["super_admin", "superadmin", "admin", "principal", "academic_dean"].includes(r)) {
            anitsRole = "ANITS_ADMIN";
          } else if (r === "hod") {
            anitsRole = "HOD";
          } else if (r === "faculty" || r === "staff") {
            anitsRole = "FACULTY";
          } else if (r === "student") {
            anitsRole = "STUDENT";
          }
        }
        setUser({ ...parsed, anitsRole });
      } catch (e) {}
    }

    // Fetch fresh profile from backend
    api
      .get("/api/auth/profile")
      .then((res) => {
        if (res.data) {
          let anitsRole = res.data.anitsRole;
          if (!anitsRole) {
            const r = (res.data.role || "").toLowerCase();
            if (["super_admin", "superadmin", "admin", "principal", "academic_dean"].includes(r)) {
              anitsRole = "ANITS_ADMIN";
            } else if (r === "hod") {
              anitsRole = "HOD";
            } else if (r === "faculty" || r === "staff") {
              anitsRole = "FACULTY";
            } else if (r === "student") {
              anitsRole = "STUDENT";
            }
          }
          const updated = { ...res.data, anitsRole };
          setUser(updated);
          localStorage.setItem("cms_user", JSON.stringify(updated));
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [pathname, isAuthPage]);

  if (isAuthPage) {
    return <Outlet />;
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Verifying ANITS authorization...</p>
        </div>
      </div>
    );
  }

  // Enforce ANITS role authorization
  if (!user || !user.anitsRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full p-6 rounded-2xl border border-destructive/30 bg-destructive/5 text-center space-y-4">
          <ShieldAlert className="size-12 text-destructive mx-auto" />
          <h3 className="font-extrabold text-base text-foreground">Access Denied to ANITS Portal</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your account is not authorized to access the ANITS Attendance &amp; Timetable Management application. Only verified ANITS Administrators, HODs, Faculty, and Students may enter this portal.
          </p>
          <div className="pt-2">
            <Button asChild className="rounded-xl text-xs font-semibold">
              <Link to="/anits/login">
                <LogIn className="size-4 mr-2" /> Sign In with Authorized Account
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnitsShell user={user}>
      <Outlet />
    </AnitsShell>
  );
}
