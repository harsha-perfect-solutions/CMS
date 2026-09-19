import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  Plus,
  Printer,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Users,
  Bell,
  Clock,
  Activity,
} from "lucide-react";
import { Panel } from "@/components/dashboard/panel";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFinanceDeanDashboardData } from "@/lib/deansService";
import { fetchPayrollStats } from "@/modules/payroll/PayrollService";

export const Route = createFileRoute("/staff/finance-dean/expenses")({
  head: () => ({
    meta: [{ title: "Institutional Expense Ledger — Finance Dean" }],
  }),
  component: SubPageComponent,
});

function SubPageComponent() {
  const data = useMemo(() => getFinanceDeanDashboardData(), []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const s = await fetchPayrollStats();
        setStats(s);
      } catch {}
    }
    load();
  }, []);

  const facultyPayrollStr = stats
    ? `₹${(stats.totalNetSalary / 100000).toFixed(2)} Lakhs`
    : "₹1.13 Cr";

  const rawItems = useMemo(() => {
    return data.expenseLedger.map(e => ({ id: e.id, category: e.category, amount: e.amount, date: e.date, status: e.status }));
  }, [data]);

  const filteredItems = useMemo(() => {
    return rawItems.filter((item: Record<string, any>) => {
      const matchSearch = Object.values(item).some((val) =>
        String(val).toLowerCase().includes(search.toLowerCase())
      );
      const matchStatus =
        statusFilter === "all" ||
        (item.status && String(item.status).toLowerCase().includes(statusFilter.toLowerCase()));
      return matchSearch && matchStatus;
    });
  }, [rawItems, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  return (
    <div className="space-y-6">
      {/* PAGE TITLE BAR */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[0.65rem] uppercase text-primary border-primary/30">
              Finance
            </Badge>
            <span className="text-xs text-muted-foreground">• Dedicated Module Page</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Institutional Expense Ledger</h1>
          <p className="text-sm text-muted-foreground">Official higher education ERP management ledger and verified domain records.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 cursor-pointer">
            <Download className="size-3.5" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 cursor-pointer">
            <Printer className="size-3.5" /> Print
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
            <Plus className="size-3.5" /> Add New Record
          </Button>
        </div>
      </div>

      {/* DOMAIN SPECIFIC KPI CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Monthly Expenses" value="₹1.58 Cr" icon={Building2} tone="info" />
        <KpiCard label="Faculty Payroll" value={facultyPayrollStr} icon={Users} tone="success" />
        <KpiCard label="CapEx Upgrade" value="₹45.0 Lakhs" icon={ShieldCheck} tone="purple" />
        <KpiCard label="Status" value="Paid" icon={CheckCircle2} tone="warning" />
      </div>

      {/* FILTERABLE MAIN TABLE */}
      <Panel title="Institutional Expense Ledger Ledger" description="Official domain records & ERP status.">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records</SelectItem>
                  <SelectItem value="active">Active / Verified</SelectItem>
                  <SelectItem value="pending">Pending / Open</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3">Expense Voucher ID</th><th className="p-3">Expense Category</th><th className="p-3">Amount Paid</th><th className="p-3">Payment Date</th><th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground text-xs">
                      No matching records found in this view.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item: Record<string, any>, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      {Object.values(item).map((val: any, cIdx: number) => (
                        <td key={cIdx} className="p-3 font-mono text-foreground">
                          {String(val).toLowerCase().includes("active") || String(val).toLowerCase().includes("resolved") || String(val).toLowerCase().includes("verified") || String(val).toLowerCase().includes("published") || String(val).toLowerCase().includes("approved") || String(val).toLowerCase().includes("excellent") ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 font-mono text-[0.65rem]">{String(val)}</Badge>
                          ) : String(val).toLowerCase().includes("pending") || String(val).toLowerCase().includes("in progress") || String(val).toLowerCase().includes("open") || String(val).toLowerCase().includes("under review") ? (
                            <Badge className="bg-amber-500/10 text-amber-600 font-mono text-[0.65rem]">{String(val)}</Badge>
                          ) : (
                            String(val)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION BAR */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
            <span className="text-xs text-muted-foreground font-mono">
              Showing {filteredItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} entries
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 cursor-pointer"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  size="sm"
                  className="h-7 w-7 p-0 text-xs font-mono cursor-pointer"
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 cursor-pointer"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      {/* SECONDARY CONTENT PANEL */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent Domain Updates" description="Live synchronization activity.">
          <div className="space-y-3">
            <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-emerald-500" />
                <span className="font-bold">Module Audit Clearance</span>
              </div>
              <span className="text-muted-foreground font-mono">10 mins ago</span>
            </div>
            <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <span className="font-bold">ERP Synchronization Log</span>
              </div>
              <span className="text-muted-foreground font-mono">1 hour ago</span>
            </div>
          </div>
        </Panel>

        <Panel title="Module Notifications" description="System notifications and alerts.">
          <div className="space-y-3">
            <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-amber-500" />
                <span className="font-bold">Pending Approval Deadline</span>
              </div>
              <Badge variant="outline" className="font-mono text-[0.65rem]">High Priority</Badge>
            </div>
            <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-500" />
                <span className="font-bold">Compliance Status Valid</span>
              </div>
              <Badge variant="outline" className="font-mono text-[0.65rem]">Verified</Badge>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
