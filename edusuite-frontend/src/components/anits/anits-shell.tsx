import { useState, type ReactNode } from "react";
import { AnitsHeader, type AnitsUserProfile } from "./anits-header";
import { AnitsSidebar } from "./anits-sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export function AnitsShell({
  children,
  user,
}: {
  children: ReactNode;
  user: AnitsUserProfile | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      {/* Top Header */}
      <div className="flex items-center">
        {/* Mobile Sidebar Hamburger Toggle */}
        <div className="md:hidden pl-3 pt-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 rounded-lg border border-border/40">
                <Menu className="size-5" />
                <span className="sr-only">Toggle ANITS Navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-card">
              <AnitsSidebar user={user} />
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex-1">
          <AnitsHeader user={user} />
        </div>
      </div>

      {/* Body: Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <AnitsSidebar user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/15">
          <div className="mx-auto max-w-7xl space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 px-4 py-3 text-center text-xs text-muted-foreground bg-card/40">
        <span>
          &copy; {new Date().getFullYear()} Anil Neerukonda Institute of Technology and Sciences (ANITS). All rights reserved. &middot; Attendance &amp; Timetable ERP
        </span>
      </footer>
    </div>
  );
}
