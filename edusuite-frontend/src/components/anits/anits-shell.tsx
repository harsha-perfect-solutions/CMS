import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnitsHeader, type AnitsUserProfile } from "./anits-header";
import { AnitsSidebar } from "./anits-sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export function AnitsShell({
  children,
  user,
}: {
  children: ReactNode;
  user: AnitsUserProfile | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const role = user?.anitsRole || "STUDENT";
  const portalLabel =
    role === "STUDENT"
      ? "Student Portal"
      : role === "FACULTY"
      ? "Faculty Portal"
      : role === "HOD"
      ? "HOD Portal"
      : "Administration";

  const getPageTitle = (path: string) => {
    if (path.includes("/dashboard")) return "Dashboard";
    if (path.includes("/timetable")) return role === "STUDENT" ? "My Timetable" : "Timetable";
    if (path.includes("/attendance")) return role === "STUDENT" ? "My Attendance" : "Attendance";
    if (path.includes("/profile")) return "Profile";
    if (path.includes("/reports")) return "Reports";
    if (path.includes("/my-classes")) return "My Classes";
    return "Portal";
  };

  const currentPage = getPageTitle(pathname);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* 1. Desktop Full-Height Dark Navy Sidebar */}
      <div
        className={cn(
          "hidden md:block shrink-0 sticky top-0 h-screen transition-all duration-200 z-30",
          desktopCollapsed ? "w-0 overflow-hidden" : "w-64"
        )}
      >
        <AnitsSidebar user={user} />
      </div>

      {/* 2. Mobile Drawer Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-[#0A1128] border-[#172242]">
          <AnitsSidebar user={user} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* 3. Main Content Container to the Right of the Sidebar */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* Top Header */}
        <AnitsHeader
          user={user}
          onToggleSidebar={() => {
            if (typeof window !== "undefined" && window.innerWidth < 768) {
              setMobileOpen(true);
            } else {
              setDesktopCollapsed(!desktopCollapsed);
            }
          }}
        />

        {/* EduSuite Pro Breadcrumb Header Bar */}
        <div className="border-b border-border/50 bg-background/80 px-4 md:px-6 py-2">
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/anits/dashboard" className="text-muted-foreground hover:text-foreground">
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/anits/dashboard" className="text-muted-foreground hover:text-foreground">
                    {portalLabel}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-foreground">
                  {currentPage}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Main Body Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/15 overflow-y-auto">
          <div className={cn("mx-auto w-full", pathname.includes("/timetable") ? "max-w-none" : "max-w-7xl")}>
            {children}
          </div>
        </main>

        {/* Institutional Footer matching Target UI */}
        <footer className="border-t border-border/40 py-3.5 px-4 md:px-6 text-center text-xs text-muted-foreground bg-card/40">
          <span>
            &copy; {new Date().getFullYear()} Anil Neerukonda Institute of Technology and Sciences (ANITS). All rights reserved. &middot; Attendance &amp; Timetable ERP
          </span>
        </footer>
      </div>
    </div>
  );
}
