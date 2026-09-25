import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bus,
  RefreshCw,
  Download,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Navigation,
  Sliders,
  BarChart3,
  Activity,
  Calendar,
  Clock,
  UserCheck,
  ShieldCheck,
  Zap,
  BellRing,
  Bell,
  PieChart,
  ShieldAlert,
  Search,
  Filter,
  FileSpreadsheet,
  FileCheck,
  Gauge,
  Fuel,
  Wrench,
  Eye,
  Loader2,
  TrendingUp,
  PhoneCall,
  Flame,
  Lock,
  Printer,
  X,
  History,
  Sparkles,
  Award,
  TrendingDown,
  BrainCircuit,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  fetchBusRoutes,
  fetchTransportPasses,
  INITIAL_ENHANCED_ROUTES,
  INITIAL_ENHANCED_PASSES,
  DEFAULT_TRANSPORT_CONFIG,
  INITIAL_VEHICLE_COMPLIANCE,
  DEFAULT_FLEET_HEALTH,
  DEFAULT_ANALYTICS,
  DEFAULT_POLICY_GOVERNANCE,
  INITIAL_ALERTS,
  INITIAL_ACTIVITIES,
  DEFAULT_STAFF_SUMMARY,
  type EnhancedBusRoute,
  type EnhancedTransportPass,
  type TransportConfig,
  type VehicleComplianceItem,
  type FleetHealthCompliance,
  type ExecutiveTransportAnalyticsData,
  type PolicyGovernanceData,
  type TransportAlert,
  type TransportActivityLog,
  type TransportStaffSummary,
} from "./TransportService";

export function TransportModuleView() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPathname = (pathname: string): "routes" | "passes" | "health" | "analytics" | "governance" => {
    if (pathname.includes("/passengers") || pathname.includes("/fees") || pathname.includes("/passes")) return "passes";
    if (pathname.includes("/health") || pathname.includes("/compliance")) return "health";
    if (pathname.includes("/analytics") || pathname.includes("/reports")) return "analytics";
    if (pathname.includes("/governance") || pathname.includes("/settings") || pathname.includes("/notifications")) return "governance";
    return "routes";
  };

  const activeTab = getTabFromPathname(location.pathname);

  const handleTabChange = (tab: "routes" | "passes" | "health" | "analytics" | "governance") => {
    const routeMap = {
      routes: "/transport/routes",
      passes: "/transport/passengers",
      health: "/transport/health",
      analytics: "/transport/analytics",
      governance: "/transport/governance",
    };
    navigate({ to: routeMap[tab] });
  };

  const TRANSPORT_ROUTES_STORAGE_KEY = "EDUSUITE_TRANSPORT_ROUTES_V1";
  const TRANSPORT_PASSES_STORAGE_KEY = "EDUSUITE_TRANSPORT_PASSES_V1";

  const getSavedRoutes = (): EnhancedBusRoute[] => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(TRANSPORT_ROUTES_STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_ENHANCED_ROUTES;
  };

  const getSavedPasses = (): EnhancedTransportPass[] => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(TRANSPORT_PASSES_STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_ENHANCED_PASSES;
  };

  const [routes, setRoutes] = useState<EnhancedBusRoute[]>(getSavedRoutes);
  const [passes, setPasses] = useState<EnhancedTransportPass[]>(getSavedPasses);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(TRANSPORT_ROUTES_STORAGE_KEY, JSON.stringify(routes));
      }
    } catch (e) {}
  }, [routes]);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(TRANSPORT_PASSES_STORAGE_KEY, JSON.stringify(passes));
      }
    } catch (e) {}
  }, [passes]);

  const loadData = async () => {
    setLoading(true);
    try {
      const rawRoutes = localStorage.getItem(TRANSPORT_ROUTES_STORAGE_KEY);
      const rawPasses = localStorage.getItem(TRANSPORT_PASSES_STORAGE_KEY);
      if (rawRoutes) setRoutes(JSON.parse(rawRoutes));
      else setRoutes(INITIAL_ENHANCED_ROUTES);

      if (rawPasses) setPasses(JSON.parse(rawPasses));
      else setPasses(INITIAL_ENHANCED_PASSES);
    } catch (e) {}
    setLoading(false);
    toast.success("Transport data restored from saved records");
  };

  useEffect(() => {
    loadData();
  }, []);

  const [loading, setLoading] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportExporting, setReportExporting] = useState<string | null>(null);

  // Tab 1 Filters
  const [routeSearch, setRouteSearch] = useState("");
  const [routeCategoryFilter, setRouteCategoryFilter] = useState("All");
  const [routeStatusFilter, setRouteStatusFilter] = useState("All");

  // Tab 2 Filters
  const [passSearch, setPassSearch] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterUserType, setFilterUserType] = useState("All");
  const [filterRoute, setFilterRoute] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterAcademicYear, setFilterAcademicYear] = useState("All");

  // Tab 3 Filters
  const [complianceList] = useState<VehicleComplianceItem[]>(INITIAL_VEHICLE_COMPLIANCE);
  const [complianceFilterVehicle, setComplianceFilterVehicle] = useState("All");
  const [complianceFilterStatus, setComplianceFilterStatus] = useState("All");
  const [complianceFilterExpiry, setComplianceFilterExpiry] = useState("All");

  // Modals for "View Details"
  const [selectedRoute, setSelectedRoute] = useState<EnhancedBusRoute | null>(null);
  const [selectedPass, setSelectedPass] = useState<EnhancedTransportPass | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleComplianceItem | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<{ title: string; category: string; docNo: string; expiry: string; status: string } | null>(null);

  // Quick Action Dialogs State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configSubTab, setConfigSubTab] = useState<"general" | "fees" | "vehicles" | "drivers" | "students" | "gps" | "notifications">("general");
  const [configForm, setConfigForm] = useState<TransportConfig>(DEFAULT_TRANSPORT_CONFIG);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>("Monthly Fleet Report");
  const [reportVehicleFilter, setReportVehicleFilter] = useState("All");
  const [reportRouteFilter, setReportRouteFilter] = useState("All");
  const [reportDriverFilter, setReportDriverFilter] = useState("All");
  const [reportDeptFilter, setReportDeptFilter] = useState("All");
  const [reportDateRange, setReportDateRange] = useState("August 2026");

  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditForm, setAuditForm] = useState({
    auditTitle: "Q3 RTO Fitness & Safety Fleet Inspection",
    auditDate: "2026-08-25",
    auditTime: "09:30",
    auditType: "RTO Fitness & Safety Audit",
    auditor: "State RTO Inspection Cell & Campus Fleet Committee",
    vehicleCategory: "All Fleet",
    priority: "High",
    remarks: "Comprehensive bi-annual RTO compliance, emission, and GPS telematics audit.",
  });

  const [isComplianceOpen, setIsComplianceOpen] = useState(false);

  // Telemetry & Governance State
  const [fleetHealth] = useState<FleetHealthCompliance>(DEFAULT_FLEET_HEALTH);
  const [analytics] = useState<ExecutiveTransportAnalyticsData>(DEFAULT_ANALYTICS);
  const [policyGovernance] = useState<PolicyGovernanceData>(DEFAULT_POLICY_GOVERNANCE);
  const [alerts, setAlerts] = useState<TransportAlert[]>(INITIAL_ALERTS);
  const [activities, setActivities] = useState<TransportActivityLog[]>(INITIAL_ACTIVITIES);

  const addActivityLog = (action: string, category: string) => {
    const newLog: TransportActivityLog = {
      id: `ACT-${Date.now()}`,
      date: new Date().toISOString().replace("T", " ").substring(0, 16),
      user: "Super Admin (Executive)",
      action,
      category,
    };
    setActivities((prev) => [newLog, ...prev]);
  };

  // Filtered Lists
  const filteredRoutes = routes.filter((r) => {
    const matchesSearch =
      r.routeNo.toLowerCase().includes(routeSearch.toLowerCase()) ||
      r.routeName.toLowerCase().includes(routeSearch.toLowerCase()) ||
      r.busRegNo.toLowerCase().includes(routeSearch.toLowerCase()) ||
      r.driverName.toLowerCase().includes(routeSearch.toLowerCase()) ||
      r.routeCode.toLowerCase().includes(routeSearch.toLowerCase());
    const matchesCategory = routeCategoryFilter === "All" || r.routeCategory === routeCategoryFilter;
    const matchesStatus = routeStatusFilter === "All" || r.status === routeStatusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredPasses = passes.filter((p) => {
    const matchesSearch =
      p.studentName.toLowerCase().includes(passSearch.toLowerCase()) ||
      p.rollNo.toLowerCase().includes(passSearch.toLowerCase()) ||
      p.passId.toLowerCase().includes(passSearch.toLowerCase());
    const matchesDept = filterDept === "All" || p.department === filterDept;
    const matchesUser = filterUserType === "All" || p.userType === filterUserType;
    const matchesRoute = filterRoute === "All" || p.routeNo === filterRoute;
    const matchesStatus = filterStatus === "All" || p.passStatus === filterStatus;
    const matchesYear = filterAcademicYear === "All" || p.academicYear === filterAcademicYear;

    return matchesSearch && matchesDept && matchesUser && matchesRoute && matchesStatus && matchesYear;
  });

  const filteredCompliance = complianceList.filter((item) => {
    const matchesVehicle = complianceFilterVehicle === "All" || item.vehicleNo === complianceFilterVehicle;
    const matchesStatus =
      complianceFilterStatus === "All" ||
      item.vehicleHealth === complianceFilterStatus ||
      item.insuranceStatus === complianceFilterStatus;
    const matchesExpiry =
      complianceFilterExpiry === "All" ||
      (complianceFilterExpiry === "Expiring Soon" && (item.insuranceStatus === "Expiring Soon" || item.permitStatus === "Expiring Soon")) ||
      (complianceFilterExpiry === "Expired" && (item.pollutionCertificate === "Expired" || item.fitnessCertificate === "Expired"));

    return matchesVehicle && matchesStatus && matchesExpiry;
  });

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfigOpen(false);
    addActivityLog("Updated Transport Policy & Governance Configuration", "Configuration");
    toast.success("Transport Policy & Governance Configuration updated!");
  };

  const handleResetConfig = () => {
    setConfigForm(DEFAULT_TRANSPORT_CONFIG);
    toast.info("Transport Configuration reset to default policy values.");
  };

  const handleExportRoutesCSV = () => {
    const headers = ["Route Code", "Route No", "Route Name", "Category", "Bus Reg No", "Driver", "Capacity", "Pass Holders", "Students", "Faculty", "Waiting List", "Occupancy %", "Distance (km)", "Travel Time", "On-Time %", "GPS Status", "Vehicle Health", "Status"];
    const rows = filteredRoutes.map((r) => [r.routeCode, r.routeNo, `"${r.routeName}"`, `"${r.routeCategory}"`, r.busRegNo, `"${r.driverName}"`, r.capacity, r.passHoldersCount, r.studentCount, r.facultyCount, r.waitingList, `${r.occupancyPercentage}%`, r.distanceKm, `"${r.estimatedTravelTime}"`, `${r.onTimePerformancePct}%`, `"${r.gpsStatus}"`, r.vehicleHealth, r.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Route_Analytics_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addActivityLog("Exported Route Directory to CSV", "Export");
    toast.success("Exported route directory to CSV!");
  };

  const handleExportPassesCSV = () => {
    const headers = ["Pass ID", "Name", "Roll / Employee ID", "User Type", "Department", "Year", "Route", "Pickup Stop", "Drop Point", "Pass Type", "Annual Fee", "Payment Status", "Expiry Date", "Renewal Status", "Status"];
    const rows = filteredPasses.map((p) => [p.passId, `"${p.studentName}"`, p.rollNo, p.userType, p.department, `"${p.year}"`, p.routeNo, `"${p.pickupStop}"`, `"${p.dropPoint}"`, `"${p.passType}"`, p.annualFee, p.paymentStatus, p.expiryDate, `"${p.renewalStatus}"`, p.passStatus]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Transport_Pass_Directory_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addActivityLog("Exported Pass Holders Directory to CSV", "Export");
    toast.success("Exported pass holders directory to CSV!");
  };

  const handleDownloadTransportReport = () => {
    setDownloadingReport(true);
    setTimeout(() => {
      const textContent = `INSTITUTIONAL TRANSPORT GOVERNANCE REPORT\nGenerated: ${new Date().toISOString()}\n\n1. FLEET SUMMARY\nTotal Active Routes: ${routes.length}\nFleet Occupancy: ${analytics.averageOccupancyPct}%\nActive Buses: 24 Buses (100% Operational)\nTotal Transport Revenue: ${analytics.transportRevenue}\nMonthly Fuel Cost: ${analytics.monthlyFuelCost}\nMonthly Maintenance Cost: ${analytics.monthlyMaintenanceCost}\n\n2. VEHICLE HEALTH & COMPLIANCE SUMMARY\nOverall Fleet Health Score: ${fleetHealth.vehicleHealthScore}/100\nInsurance Expiry Status: ${fleetHealth.insuranceExpiry}\nPermit Status: ${fleetHealth.permitStatus}\nPollution Certificate: ${fleetHealth.pollutionCertificate}\nFitness Clearance: ${fleetHealth.fitnessCertificate}\nGPS Tracking: ${fleetHealth.gpsStatus}\n\n3. ROUTE UTILIZATION LEDGER\n${routes.map(r => `${r.routeCode} (${r.routeNo}): ${r.routeName} | Bus: ${r.busRegNo} | Driver: ${r.driverName} | Occupancy: ${r.occupancyPercentage}%`).join("\n")}\n`;

      const blob = new Blob([textContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Institutional_Transport_Governance_Report_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadingReport(false);
      addActivityLog("Downloaded Institutional Transport Governance Report", "Reports");
      toast.success("Institutional Transport Governance Report compiled & downloaded!");
    }, 500);
  };

  const handleScheduleAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuditOpen(false);
    addActivityLog(`Scheduled Fleet Audit: ${auditForm.auditTitle} for ${auditForm.auditDate}`, "Audit");

    const newAlert: TransportAlert = {
      id: `ALT-${Date.now()}`,
      severity: "medium",
      title: `Fleet Audit Scheduled: ${auditForm.auditTitle}`,
      description: `Scheduled for ${auditForm.auditDate} at ${auditForm.auditTime}. Auditor: ${auditForm.auditor}`,
      timestamp: "Just now",
    };
    setAlerts((prev) => [newAlert, ...prev]);

    toast.success(`Fleet Audit scheduled successfully for ${auditForm.auditDate}!`);
  };

  const handleExportReport = (format: "PDF" | "Excel" | "CSV") => {
    setReportExporting(format);
    setTimeout(() => {
      const mime = format === "PDF" ? "application/pdf" : format === "Excel" ? "application/vnd.ms-excel" : "text/csv";
      const ext = format.toLowerCase();
      const content = `FLEET REPORT - ${selectedReportType.toUpperCase()}\nDate: ${new Date().toISOString()}\nFilters: Vehicle=${reportVehicleFilter}, Route=${reportRouteFilter}, Driver=${reportDriverFilter}, Dept=${reportDeptFilter}, DateRange=${reportDateRange}\n\nReport Summary Data:\nTotal Fleet Occupancy: 92.4%\nTotal Fuel Cost: ₹4.25 Lakhs\nTotal Maintenance Cost: ₹1.15 Lakhs\nDriver Safety Score: 98/100\n`;

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Fleet_${selectedReportType.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.${ext}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setReportExporting(null);
      addActivityLog(`Exported ${selectedReportType} (${format})`, "Reports");
      toast.success(`${selectedReportType} exported to ${format} successfully!`);
    }, 400);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Bus className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
                Super Admin Transport & Fleet Governance Console
              </h1>
              <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                Institutional Monitoring & Compliance
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Institutional governance console for fleet telemetry, route optimization, driver compliance, passenger rosters, and financial transport reports.
            </p>
          </div>
        </div>

        {/* Executive Action Bar */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto flex-wrap">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-9 gap-2 text-xs font-medium">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadTransportReport} disabled={downloadingReport} className="h-9 gap-2 text-xs font-medium">
            {downloadingReport ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} Export Governance Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRoutes([]);
              setPasses([]);
              try {
                localStorage.setItem(TRANSPORT_ROUTES_STORAGE_KEY, JSON.stringify([]));
                localStorage.setItem(TRANSPORT_PASSES_STORAGE_KEY, JSON.stringify([]));
              } catch (e) {}
              toast.success("Demo mock data cleared! Displaying only your created data.");
            }}
            className="h-9 text-xs font-medium text-amber-700 border-amber-200 hover:bg-amber-50 cursor-pointer"
          >
            Clear Demo Data
          </Button>
          <Button size="sm" onClick={() => setIsConfigOpen(true)} className="h-9 bg-brand-gradient text-white gap-2 text-xs font-semibold shadow-glow">
            <Sliders className="size-4" /> Policy Configuration
          </Button>
        </div>
      </div>

      {/* EXECUTIVE TABS SWITCHER (5 TABS) */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/60 border border-border/80 overflow-x-auto">
        <button
          onClick={() => handleTabChange("routes")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === "routes" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
          }`}
        >
          1. Fleet Overview & Route Analytics ({routes.length})
        </button>
        <button
          onClick={() => handleTabChange("passes")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === "passes" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
          }`}
        >
          2. Transport Pass Holders Directory ({passes.length})
        </button>
        <button
          onClick={() => handleTabChange("health")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === "health" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
          }`}
        >
          3. Fleet Health & Vehicle Compliance
        </button>
        <button
          onClick={() => handleTabChange("analytics")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === "analytics" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
          }`}
        >
          4. Transport Executive Analytics
        </button>
        <button
          onClick={() => handleTabChange("governance")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === "governance" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
          }`}
        >
          5. Transport Policy & Governance
        </button>
      </div>

      {/* TAB 1: FLEET OVERVIEW & ROUTE ANALYTICS */}
      {activeTab === "routes" && (
        <div className="space-y-4">
          {/* TAB 1 SUMMARY CARDS (8 CARDS) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
            <div className="p-3 rounded-xl bg-card border border-border/80 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-muted-foreground uppercase block truncate">Total Routes</span>
              <span className="text-lg font-bold font-mono text-primary">18 Routes</span>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border/80 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-muted-foreground uppercase block truncate">Fleet Size</span>
              <span className="text-lg font-bold font-mono text-foreground">24 Buses</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-emerald-700 uppercase block truncate">Active Routes</span>
              <span className="text-lg font-bold font-mono text-emerald-700">18 Active</span>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-muted-foreground uppercase block truncate">Inactive Routes</span>
              <span className="text-lg font-bold font-mono text-muted-foreground">0 Inactive</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-blue-700 uppercase block truncate">In Service</span>
              <span className="text-lg font-bold font-mono text-blue-700">22 Buses</span>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-purple-700 uppercase block truncate">Avg Occupancy</span>
              <span className="text-lg font-bold font-mono text-purple-700">{analytics.averageOccupancyPct}%</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-emerald-700 uppercase block truncate">GPS Online</span>
              <span className="text-lg font-bold font-mono text-emerald-700">24 / 24</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-amber-700 uppercase block truncate">Route Utilization</span>
              <span className="text-lg font-bold font-mono text-amber-700">{analytics.routeUtilization}%</span>
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Search className="size-4 text-primary" /> Filter Route Directory Telemetry
              </h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleExportRoutesCSV} className="h-8 text-xs gap-1.5 font-semibold">
                  <Download className="size-3.5" /> Export Routes CSV
                </Button>
                <span className="text-xs font-mono text-muted-foreground">{filteredRoutes.length} Routes Displayed</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="relative col-span-1 sm:col-span-1">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search code, route name, bus reg, driver..."
                  value={routeSearch}
                  onChange={(e) => setRouteSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <Select value={routeCategoryFilter} onValueChange={setRouteCategoryFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  <SelectItem value="City Express">City Express</SelectItem>
                  <SelectItem value="Suburban Feeder">Suburban Feeder</SelectItem>
                  <SelectItem value="Metro Link">Metro Link</SelectItem>
                </SelectContent>
              </Select>

              <Select value={routeStatusFilter} onValueChange={setRouteStatusFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Route Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ROUTE CARDS GRID WITH COMPLETE TELEMETRY */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredRoutes.map((r) => (
              <div key={r.id} className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-primary">{r.routeCode}</span>
                      <Badge variant="outline" className="text-[0.6rem] font-mono">{r.routeCategory}</Badge>
                    </div>
                    <h3 className="font-bold text-sm text-foreground leading-snug mt-0.5">{r.routeName}</h3>
                  </div>
                  <Badge className={r.status === "Active" ? "bg-emerald-500/10 text-emerald-600 shrink-0" : "bg-amber-500/10 text-amber-600 shrink-0"}>
                    {r.status}
                  </Badge>
                </div>

                {/* Progress bar for occupancy */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Occupancy & Pass Distribution</span>
                    <span className="font-mono text-primary">{r.passHoldersCount} / {r.capacity} ({r.occupancyPercentage}%)</span>
                  </div>
                  <Progress value={r.occupancyPercentage} className="h-2 bg-muted" />
                  <div className="flex justify-between text-[0.68rem] text-muted-foreground">
                    <span>Students: {r.studentCount} | Staff: {r.facultyCount}</span>
                    <span className={r.waitingList > 0 ? "text-amber-600 font-bold" : ""}>Waitlist: {r.waitingList}</span>
                  </div>
                </div>

                {/* Grid metrics */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-[0.65rem] text-muted-foreground uppercase block font-semibold">Distance</span>
                    <span className="font-mono font-bold text-foreground">{r.distanceKm} km</span>
                  </div>
                  <div className="p-2 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-[0.65rem] text-muted-foreground uppercase block font-semibold">Travel Time</span>
                    <span className="font-mono font-bold text-foreground">{r.estimatedTravelTime}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-[0.65rem] text-muted-foreground uppercase block font-semibold">On-Time %</span>
                    <span className="font-mono font-bold text-emerald-600">{r.onTimePerformancePct}%</span>
                  </div>
                </div>

                {/* Detailed Telemetry */}
                <div className="space-y-1.5 text-xs border-t border-border/60 pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assigned Vehicle:</span>
                    <span className="font-mono font-bold text-foreground">{r.busRegNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Driver:</span>
                    <span className="font-semibold text-foreground">{r.driverName} ({r.driverPhone})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fuel Mileage / Trips:</span>
                    <span className="font-mono text-emerald-600 font-semibold">{r.fuelEfficiencyKmpl} Kmpl ({r.dailyTrips} Trips/day)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GPS Uptime / Health:</span>
                    <span className="font-mono text-emerald-600 font-semibold">{r.gpsStatus} ({r.vehicleHealth})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Safety Rating:</span>
                    <span className="font-bold text-primary">{r.safetyRating} ({r.complaintCount} Complaints)</span>
                  </div>

                  <div className="pt-2 flex justify-between items-center border-t border-border/40">
                    <span className="text-[0.65rem] text-muted-foreground font-mono">Next Maint: {r.nextMaintenanceDue}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedRoute(r)}
                      className="h-7 text-[0.7rem] font-semibold gap-1"
                    >
                      <Eye className="size-3 text-primary" /> View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TRANSPORT PASS HOLDERS DIRECTORY */}
      {activeTab === "passes" && (
        <div className="space-y-4">
          {/* SUMMARY CARDS (8 CARDS) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
            <div className="p-3 rounded-xl bg-card border border-border/80 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-muted-foreground uppercase block truncate">Active Passes</span>
              <span className="text-lg font-bold font-mono text-primary">1,120</span>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border/80 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-muted-foreground uppercase block truncate">Student Passes</span>
              <span className="text-lg font-bold font-mono text-foreground">1,040</span>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border/80 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-muted-foreground uppercase block truncate">Faculty Passes</span>
              <span className="text-lg font-bold font-mono text-foreground">80</span>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-red-700 uppercase block truncate">Expired Passes</span>
              <span className="text-lg font-bold font-mono text-red-700">12</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-amber-700 uppercase block truncate">Renewal Due</span>
              <span className="text-lg font-bold font-mono text-amber-700">4</span>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-muted-foreground uppercase block truncate">Blocked Passes</span>
              <span className="text-lg font-bold font-mono text-muted-foreground">0</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-blue-700 uppercase block truncate">Pending Apps</span>
              <span className="text-lg font-bold font-mono text-blue-700">18</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm space-y-1">
              <span className="text-[0.62rem] font-semibold text-emerald-700 uppercase block truncate">Revenue Gen.</span>
              <span className="text-lg font-bold font-mono text-emerald-700">₹3.58 Cr</span>
            </div>
          </div>

          {/* ADVANCED FILTERS BAR */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Filter className="size-4 text-primary" /> Advanced Filters - Transport Pass Holders Roster
              </h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleExportPassesCSV} className="h-8 text-xs gap-1.5 font-semibold">
                  <Download className="size-3.5" /> Export Directory CSV
                </Button>
                <span className="text-xs font-mono text-muted-foreground">{filteredPasses.length} Pass Holders Found</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5">
              <div className="relative col-span-1 sm:col-span-2">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search student/faculty name, roll no, pass ID..."
                  value={passSearch}
                  onChange={(e) => setPassSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Departments</SelectItem>
                  <SelectItem value="CSE">CSE</SelectItem>
                  <SelectItem value="ECE">ECE</SelectItem>
                  <SelectItem value="Mechanical">Mechanical</SelectItem>
                  <SelectItem value="Civil">Civil</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterUserType} onValueChange={setFilterUserType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="User Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All User Types</SelectItem>
                  <SelectItem value="Student">Student</SelectItem>
                  <SelectItem value="Faculty">Faculty</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterRoute} onValueChange={setFilterRoute}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Route" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Routes</SelectItem>
                  <SelectItem value="Route 1">Route 1</SelectItem>
                  <SelectItem value="Route 2">Route 2</SelectItem>
                  <SelectItem value="Route 3">Route 3</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pass Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Renewal Due">Renewal Due</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* PASS DIRECTORY TABLE */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[0.68rem]">
                  <tr>
                    <th className="py-3 px-3">Pass Number</th>
                    <th className="py-3 px-3">Student / Faculty Name</th>
                    <th className="py-3 px-3">Roll / Employee ID</th>
                    <th className="py-3 px-3">User Type & Dept</th>
                    <th className="py-3 px-3">Assigned Route</th>
                    <th className="py-3 px-3">Pickup / Drop Point</th>
                    <th className="py-3 px-3">Pass Type & Fee</th>
                    <th className="py-3 px-3">Validity & Renewal</th>
                    <th className="py-3 px-3">Current Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPasses.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-foreground">{p.passId}</td>
                      <td className="py-3 px-3 font-semibold text-foreground">{p.studentName}</td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">{p.rollNo}</td>
                      <td className="py-3 px-3">{p.userType} ({p.department})</td>
                      <td className="py-3 px-3 font-mono text-primary font-bold">{p.routeNo}</td>
                      <td className="py-3 px-3 text-muted-foreground font-medium">{p.pickupStop} ──&gt; {p.dropPoint}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold block">{p.passType}</span>
                        <span className="font-mono text-emerald-600 font-bold">₹{p.annualFee.toLocaleString()} ({p.paymentStatus})</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">
                        <span>{p.expiryDate}</span>
                        <span className="block text-[0.65rem] text-primary">{p.renewalStatus}</span>
                      </td>
                      <td className="py-3 px-3">
                        <Badge className={p.passStatus === "Active" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}>{p.passStatus}</Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedPass(p)} className="h-7 text-[0.7rem] font-semibold gap-1">
                          <Eye className="size-3 text-primary" /> View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FLEET HEALTH & VEHICLE COMPLIANCE */}
      {activeTab === "health" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-500" /> Vehicle Compliance & Maintenance Audit Roster
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Comprehensive institutional audit of insurance, fitness, permits, pollution, tyre health, and emergency equipment.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsComplianceOpen(true)} className="h-8 text-xs font-semibold gap-1.5">
                  <Eye className="size-3.5 text-primary" /> Compliance Console
                </Button>
              </div>
            </div>

            {/* FILTERS */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <Label className="text-[0.65rem] font-semibold uppercase text-muted-foreground">Filter Vehicle</Label>
                <Select value={complianceFilterVehicle} onValueChange={setComplianceFilterVehicle}>
                  <SelectTrigger className="h-8 text-xs bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Vehicles</SelectItem>
                    {complianceList.map((v) => (
                      <SelectItem key={v.id} value={v.vehicleNo}>{v.vehicleNo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[0.65rem] font-semibold uppercase text-muted-foreground">Filter Vehicle Health</Label>
                <Select value={complianceFilterStatus} onValueChange={setComplianceFilterStatus}>
                  <SelectTrigger className="h-8 text-xs bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Health Statuses</SelectItem>
                    <SelectItem value="Healthy">Healthy (Green)</SelectItem>
                    <SelectItem value="Warning">Warning (Amber)</SelectItem>
                    <SelectItem value="Critical">Critical (Red)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[0.65rem] font-semibold uppercase text-muted-foreground">Filter Compliance Expiry</Label>
                <Select value={complianceFilterExpiry} onValueChange={setComplianceFilterExpiry}>
                  <SelectTrigger className="h-8 text-xs bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Expiry Dates</SelectItem>
                    <SelectItem value="Expiring Soon">Expiring Soon (30 Days)</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* VEHICLES COMPLIANCE LEDGER */}
            <div className="overflow-x-auto border border-border/80 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase text-[0.68rem]">
                  <tr>
                    <th className="py-3 px-3">Vehicle Info</th>
                    <th className="py-3 px-3">Type & Driver</th>
                    <th className="py-3 px-3">Insurance & Permit</th>
                    <th className="py-3 px-3">Fitness & Pollution</th>
                    <th className="py-3 px-3">GPS & CCTV Uptime</th>
                    <th className="py-3 px-3">Safety & Service</th>
                    <th className="py-3 px-3">Health & Score</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredCompliance.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="py-3 px-3 font-mono font-bold text-foreground">
                        {c.vehicleNo}
                        <span className="text-[0.62rem] text-muted-foreground block font-normal">{c.manufacturer} {c.model} ({c.purchaseYear})</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold block text-foreground">{c.vehicleType}</span>
                        <span className="text-[0.65rem] text-muted-foreground block">Driver: {c.assignedDriver}</span>
                      </td>
                      <td className="py-3 px-3">
                        <Badge className={c.insuranceStatus === "Compliant" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}>Insurance: {c.insuranceStatus}</Badge>
                        <span className="text-[0.62rem] text-muted-foreground block font-mono">Permit: {c.permitStatus}</span>
                      </td>
                      <td className="py-3 px-3">
                        <Badge className={c.fitnessCertificate === "Compliant" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}>Fitness: {c.fitnessCertificate}</Badge>
                        <span className="text-[0.62rem] text-muted-foreground block font-mono">Pollution: {c.pollutionCertificate}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-600 font-semibold">
                        <span>{c.gpsStatus}</span>
                        <span className="text-[0.62rem] text-muted-foreground block">CCTV: {c.cctvStatus}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold block">Last Serviced: {c.lastServiceDate}</span>
                        <span className="text-[0.65rem] text-muted-foreground font-mono block">Cost: {c.maintenanceCost}</span>
                      </td>
                      <td className="py-3 px-3">
                        <Badge className={c.vehicleHealth === "Healthy" ? "bg-emerald-500/10 text-emerald-600" : c.vehicleHealth === "Warning" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"}>
                          {c.vehicleHealth} ({c.overallComplianceScore}%)
                        </Badge>
                        <span className="text-[0.65rem] font-mono text-primary block">Safety: {c.safetyScore}%</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedVehicle(c)} className="h-7 text-[0.7rem] font-semibold gap-1">
                          <Eye className="size-3 text-primary" /> View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRANSPORT EXECUTIVE ANALYTICS SUMMARY */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* HEADER BAR */}
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" /> Transport Executive Analytics & AI Intelligence
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time operational, financial, passenger, driver, safety, and AI predictive insights.</p>
            </div>
            <Button size="sm" onClick={handleDownloadTransportReport} disabled={downloadingReport} className="h-9 bg-brand-gradient text-white gap-2 text-xs font-semibold shadow-glow">
              {downloadingReport ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} Export Executive Report
            </Button>
          </div>

          {/* AI INSIGHTS WIDGET */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                <BrainCircuit className="size-4 text-primary" /> Institutional AI Transport Intelligence & Recommendations
              </h4>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[0.65rem]">5 Active Insights</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 text-xs">
              {analytics.aiInsights.map((insight, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-card border border-border/80 space-y-1 shadow-2xs">
                  <span className="text-[0.62rem] font-bold font-mono text-primary block uppercase">AI Alert #{idx + 1}</span>
                  <p className="text-xs text-foreground font-medium leading-snug">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 6 ANALYTICS SECTIONS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* SECTION 1: OPERATIONAL ANALYTICS */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-sm">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
                <Gauge className="size-4 text-primary" /> Operational Telemetry Analytics
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Daily Trips Executed:</span>
                  <span className="font-mono font-bold text-foreground">{analytics.dailyTrips} Trips / Day</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Monthly Trips Executed:</span>
                  <span className="font-mono font-bold text-primary">{analytics.monthlyTrips} Trips</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Average Fleet Occupancy:</span>
                  <span className="font-mono font-bold text-emerald-600">{analytics.averageOccupancyPct}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Route Utilization Index:</span>
                  <span className="font-mono font-bold text-amber-600">{analytics.routeUtilization}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Peak Travel Hours:</span>
                  <span className="font-mono font-semibold text-foreground text-[0.7rem]">{analytics.peakTravelHours}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Average Trip Delay:</span>
                  <span className="font-mono font-bold text-emerald-600">{analytics.averageDelay}</span>
                </div>
              </div>
            </div>

            {/* SECTION 2: FINANCIAL ANALYTICS */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-sm">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
                <PieChart className="size-4 text-emerald-600" /> Financial Telemetry Analytics
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Monthly Transport Revenue:</span>
                  <span className="font-mono font-bold text-emerald-600">{analytics.monthlyRevenue}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Monthly Fuel Cost:</span>
                  <span className="font-mono font-bold text-amber-600">{analytics.monthlyFuelCost}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Monthly Maintenance Cost:</span>
                  <span className="font-mono font-bold text-blue-600">{analytics.monthlyMaintenanceCost}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Pending Student Dues:</span>
                  <span className="font-mono font-bold text-red-600">{analytics.pendingFees}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">YoY Revenue Trend:</span>
                  <span className="font-bold text-emerald-600">{analytics.revenueTrend}</span>
                </div>
              </div>
            </div>

            {/* SECTION 3: FLEET ANALYTICS */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-sm">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
                <Bus className="size-4 text-blue-600" /> Fleet Availability Analytics
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Vehicles Active in Service:</span>
                  <span className="font-mono font-bold text-emerald-600">{analytics.vehiclesInService} Buses</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Vehicles Under Maintenance:</span>
                  <span className="font-mono font-bold text-amber-600">{analytics.vehiclesUnderMaintenance} Buses</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Idle Fleet Vehicles:</span>
                  <span className="font-mono font-bold text-foreground">{analytics.idleVehicles} Buses</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Fleet Availability Rate:</span>
                  <span className="font-mono font-bold text-primary">{analytics.fleetAvailabilityPct}%</span>
                </div>
              </div>
            </div>

            {/* SECTION 4: PASSENGER ANALYTICS */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-sm">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
                <Users className="size-4 text-purple-600" /> Passenger Usage Analytics
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Student Pass Holders Share:</span>
                  <span className="font-mono font-bold text-primary">{analytics.studentUsagePct}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Faculty Pass Holders Share:</span>
                  <span className="font-mono font-bold text-emerald-600">{analytics.facultyUsagePct}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Top Dept Usage (CSE):</span>
                  <span className="font-bold text-foreground">38% Share (426 Passes)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Highest Occupancy Route:</span>
                  <span className="font-bold text-emerald-600">Route 2 LB Nagar (100%)</span>
                </div>
              </div>
            </div>

            {/* SECTION 5: DRIVER ANALYTICS */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-sm">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
                <UserCheck className="size-4 text-emerald-500" /> Driver Performance Telemetry
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Driver Duty Attendance Rate:</span>
                  <span className="font-mono font-bold text-emerald-600">{analytics.driverAttendancePct}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Average Driver Performance Score:</span>
                  <span className="font-mono font-bold text-primary">{analytics.driverPerformanceScore}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Zero Incident Safety Index:</span>
                  <span className="font-mono font-bold text-emerald-600">{analytics.safetyRatingPct}%</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">License Expiry Alerts:</span>
                  <span className="font-mono font-bold text-amber-600">{analytics.licenseExpiryAlertsCount} Alert (35 Days)</span>
                </div>
              </div>
            </div>

            {/* SECTION 6: SAFETY ANALYTICS */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-sm">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
                <ShieldAlert className="size-4 text-red-500" /> Safety & Incident Analytics
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Vehicle Breakdowns Logged:</span>
                  <span className="font-mono font-bold text-emerald-600">{analytics.vehicleBreakdownsCount} Incidents</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Speed Violations Recorded:</span>
                  <span className="font-mono font-bold text-emerald-600">{analytics.speedViolationsCount} Violations</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Panic Button Emergency Alerts:</span>
                  <span className="font-mono font-bold text-emerald-600">{analytics.emergencyAlertsCount} Alerts</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">GPS Offline Telematics Units:</span>
                  <span className="font-mono font-bold text-emerald-600">{analytics.gpsOfflineCount} Units</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Security Incidents Logged:</span>
                  <span className="font-mono font-bold text-emerald-600">{analytics.securityIncidentsCount} Incidents</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW TAB (TAB 5): TRANSPORT POLICY & GOVERNANCE */}
      {activeTab === "governance" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> Institutional Policy, Compliance & Audit Governance
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Institutional policies, government compliance metrics, fleet inspection audits, and master document repository.</p>
            </div>
            <Button size="sm" onClick={() => setIsConfigOpen(true)} className="h-9 bg-brand-gradient text-white gap-2 text-xs font-semibold shadow-glow">
              <Sliders className="size-3.5" /> Edit Governance Policies
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* POLICIES OVERVIEW CARD */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-sm">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
                <FileText className="size-4 text-primary" /> Active Transport Institutional Policies
              </h4>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-bold text-foreground block">Fee Policy:</span>
                  <p className="text-muted-foreground leading-snug">{policyGovernance.feePolicy}</p>
                </div>
                <div>
                  <span className="font-bold text-foreground block">Driver Eligibility & Safety Policy:</span>
                  <p className="text-muted-foreground leading-snug">{policyGovernance.driverPolicy}</p>
                </div>
                <div>
                  <span className="font-bold text-foreground block">Student & Pass Eligibility Rules:</span>
                  <p className="text-muted-foreground leading-snug">{policyGovernance.studentEligibility}</p>
                </div>
                <div>
                  <span className="font-bold text-foreground block">Vehicle Replacement Policy:</span>
                  <p className="text-muted-foreground leading-snug">{policyGovernance.vehicleReplacementPolicy}</p>
                </div>
                <div>
                  <span className="font-bold text-foreground block">Emergency Transport Protocol:</span>
                  <p className="text-muted-foreground leading-snug">{policyGovernance.emergencyTransportPolicy}</p>
                </div>
              </div>
            </div>

            {/* COMPLIANCE & AUDIT OVERVIEW CARD */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-sm">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
                <CheckSquare className="size-4 text-emerald-600" /> Compliance Status & Audit Telemetry
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Government RTO Compliance:</span>
                  <span className="font-mono font-bold text-emerald-600">{policyGovernance.governmentCompliancePct}% Certified</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Insurance Policy Coverage:</span>
                  <span className="font-mono font-bold text-emerald-600">{policyGovernance.insuranceCompliancePct}% Active</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Safety Equipment Compliance:</span>
                  <span className="font-mono font-bold text-emerald-600">{policyGovernance.safetyCompliancePct}% Verified</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Pollution Standards Compliance:</span>
                  <span className="font-mono font-bold text-emerald-600">{policyGovernance.pollutionCompliancePct}% Certified</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Last Fleet Audit Date:</span>
                  <span className="font-mono font-bold text-foreground">{policyGovernance.lastFleetAudit}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Next Scheduled Audit:</span>
                  <span className="font-mono font-bold text-amber-600">{policyGovernance.nextScheduledAudit}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Audit Grade & Status:</span>
                  <span className="font-bold text-emerald-600">{policyGovernance.auditStatus}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground font-medium">Institutional Compliance Score:</span>
                  <span className="font-mono font-bold text-primary text-sm">{policyGovernance.complianceScore} / 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* DOCUMENTS REPOSITORY CARD */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <FileCheck className="size-4 text-blue-600" /> Institutional Transport Master Document Repository
              </h4>
              <Badge variant="outline" className="text-[0.65rem] font-mono">{policyGovernance.documents.length} Master Docs</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[0.68rem]">
                  <tr>
                    <th className="py-2.5 px-3">Document Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Document Number</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {policyGovernance.documents.map((doc, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="py-2.5 px-3 font-semibold text-foreground">{doc.title}</td>
                      <td className="py-2.5 px-3"><Badge variant="outline" className="font-mono text-[0.65rem]">{doc.category}</Badge></td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">{doc.docNo}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">{doc.expiry}</td>
                      <td className="py-2.5 px-3">
                        <Badge className={doc.status === "Active" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}>{doc.status}</Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedDoc(doc)} className="h-7 text-[0.7rem] font-semibold gap-1">
                          <Eye className="size-3 text-primary" /> View Document
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTIONS & ALERTS & ACTIVITIES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* EXECUTIVE QUICK ACTIONS CARD */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Zap className="size-4 text-primary" /> Executive Quick Actions
            </h3>
            <span className="text-[0.65rem] font-mono text-muted-foreground">6 Active Tools</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              onClick={() => setIsConfigOpen(true)}
              className="justify-start gap-2.5 h-10 text-xs font-semibold hover:bg-primary/5 transition-all"
            >
              <Sliders className="size-4 text-primary shrink-0" /> Transport Policy & Governance Configuration
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsReportsOpen(true)}
              className="justify-start gap-2.5 h-10 text-xs font-semibold hover:bg-emerald-500/5 transition-all text-emerald-700 border-emerald-500/30"
            >
              <BarChart3 className="size-4 text-emerald-600 shrink-0" /> View Comprehensive Fleet Reports
            </Button>

            <Button
              variant="outline"
              onClick={handleDownloadTransportReport}
              disabled={downloadingReport}
              className="justify-start gap-2.5 h-10 text-xs font-semibold hover:bg-blue-500/5 transition-all text-blue-700 border-blue-500/30"
            >
              {downloadingReport ? <Loader2 className="size-4 animate-spin text-blue-600 shrink-0" /> : <FileText className="size-4 text-blue-600 shrink-0" />}
              Download Transport & Route Ledger
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsAuditOpen(true)}
              className="justify-start gap-2.5 h-10 text-xs font-semibold hover:bg-purple-500/5 transition-all text-purple-700 border-purple-500/30"
            >
              <ShieldCheck className="size-4 text-purple-600 shrink-0" /> Schedule Institutional Fleet Audit
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsComplianceOpen(true)}
              className="justify-start gap-2.5 h-10 text-xs font-semibold hover:bg-amber-500/5 transition-all text-amber-800 border-amber-500/30"
            >
              <Wrench className="size-4 text-amber-600 shrink-0" /> View Fleet Health & Vehicle Compliance
            </Button>

            <Button
              variant="outline"
              onClick={() => setActiveTab("analytics")}
              className="justify-start gap-2.5 h-10 text-xs font-semibold hover:bg-primary/5 transition-all"
            >
              <PieChart className="size-4 text-emerald-600 shrink-0" /> View Executive Analytics Summary
            </Button>
          </div>
        </div>

        {/* GOVERNANCE ALERTS CARD */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <BellRing className="size-4 text-amber-500" /> Active Governance Alerts
            </h3>
            <Badge className="bg-amber-500/10 text-amber-600 text-[0.65rem]">{alerts.length} Active</Badge>
          </div>

          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
            {alerts.map((alt) => (
              <div key={alt.id} className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    {alt.severity === "high" ? (
                      <span className="inline-block size-2 rounded-full bg-red-600 shrink-0" />
                    ) : alt.severity === "medium" ? (
                      <span className="inline-block size-2 rounded-full bg-amber-500 shrink-0" />
                    ) : (
                      <span className="inline-block size-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                    {alt.title}
                  </span>
                  <Badge className={alt.severity === "high" ? "bg-red-500/10 text-red-600 text-[0.6rem]" : alt.severity === "medium" ? "bg-amber-500/10 text-amber-600 text-[0.6rem]" : "bg-blue-500/10 text-blue-600 text-[0.6rem]"}>
                    {alt.severity.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-[0.72rem] text-muted-foreground leading-snug">{alt.description}</p>
                <span className="text-[0.62rem] text-muted-foreground font-mono block text-right">{alt.timestamp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT ACTIVITIES TIMELINE */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Clock className="size-4 text-primary" /> Audit Trail & Recent Activities
            </h3>
            <Badge variant="outline" className="text-[0.65rem] font-mono">{activities.length} Logs</Badge>
          </div>

          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
            {activities.map((act) => (
              <div key={act.id} className="p-2.5 rounded-xl bg-muted/30 border border-border/60 space-y-0.5">
                <div className="flex justify-between text-[0.68rem] text-muted-foreground">
                  <span className="font-mono">{act.date}</span>
                  <Badge variant="secondary" className="text-[0.6rem] px-1.5 py-0">{act.category}</Badge>
                </div>
                <p className="text-xs font-semibold text-foreground">{act.action}</p>
                <p className="text-[0.68rem] text-muted-foreground">By: {act.user}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* VIEW DETAILS MODAL: ROUTE TELEMETRY */}
      <Dialog open={selectedRoute !== null} onOpenChange={() => setSelectedRoute(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Bus className="size-4 text-primary" /> Route Telemetry & Performance Ledger
            </DialogTitle>
            <DialogDescription className="text-xs">
              Read-only executive monitoring view for {selectedRoute?.routeNo} ({selectedRoute?.routeCode}).
            </DialogDescription>
          </DialogHeader>

          {selectedRoute && (
            <div className="space-y-2 text-xs pt-1">
              <div className="p-3 rounded-xl bg-muted/40 space-y-1.5">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Route Name:</span>
                  <span className="font-semibold text-foreground text-[0.7rem]">{selectedRoute.routeName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Assigned Bus / Driver:</span>
                  <span className="font-mono font-bold text-foreground">{selectedRoute.busRegNo} ({selectedRoute.driverName})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Passenger Breakdown:</span>
                  <span className="font-mono font-semibold text-primary">{selectedRoute.studentCount} Students | {selectedRoute.facultyCount} Staff</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">On-Time Rate / Delay:</span>
                  <span className="font-mono font-bold text-emerald-600">{selectedRoute.onTimePerformancePct}% (Avg {selectedRoute.avgDelay})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">GPS Tracking Signal:</span>
                  <span className="font-mono font-bold text-emerald-600">{selectedRoute.gpsStatus}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Safety Rating / Complaints:</span>
                  <span className="font-bold text-foreground">{selectedRoute.safetyRating} ({selectedRoute.complaintCount} Complaints)</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setSelectedRoute(null)} className="text-xs">
              Close Telemetry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS MODAL: PASS HOLDER */}
      <Dialog open={selectedPass !== null} onOpenChange={() => setSelectedPass(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="size-4 text-primary" /> Transport Pass Holder Record
            </DialogTitle>
            <DialogDescription className="text-xs">
              Read-only pass details for {selectedPass?.studentName} ({selectedPass?.rollNo}).
            </DialogDescription>
          </DialogHeader>

          {selectedPass && (
            <div className="space-y-2 text-xs pt-1">
              <div className="p-3 rounded-xl bg-muted/40 space-y-1.5">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Pass Number:</span>
                  <span className="font-mono font-bold text-foreground">{selectedPass.passId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">User Type & Dept:</span>
                  <span className="font-semibold text-foreground">{selectedPass.userType} - {selectedPass.department} ({selectedPass.year})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Assigned Route & Stop:</span>
                  <span className="font-mono font-bold text-primary">{selectedPass.routeNo} ({selectedPass.pickupStop})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Pass Type & Fee:</span>
                  <span className="font-bold text-emerald-600">{selectedPass.passType} - ₹{selectedPass.annualFee.toLocaleString()} ({selectedPass.paymentStatus})</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Validity & Status:</span>
                  <span className="font-mono font-bold text-foreground">{selectedPass.expiryDate} ({selectedPass.passStatus})</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setSelectedPass(null)} className="text-xs">
              Close Pass Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS MODAL: VEHICLE COMPLIANCE */}
      <Dialog open={selectedVehicle !== null} onOpenChange={() => setSelectedVehicle(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Wrench className="size-4 text-amber-600" /> Vehicle Maintenance & Compliance Record
            </DialogTitle>
            <DialogDescription className="text-xs">
              Read-only vehicle compliance and safety telemetry for {selectedVehicle?.vehicleNo}.
            </DialogDescription>
          </DialogHeader>

          {selectedVehicle && (
            <div className="space-y-2 text-xs pt-1">
              <div className="p-3 rounded-xl bg-muted/40 space-y-1.5">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Vehicle Reg No:</span>
                  <span className="font-mono font-bold text-foreground">{selectedVehicle.vehicleNo}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Type & Model:</span>
                  <span className="font-semibold text-foreground">{selectedVehicle.manufacturer} {selectedVehicle.model} ({selectedVehicle.purchaseYear})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Insurance & Permit:</span>
                  <span className="font-mono font-bold text-emerald-600">{selectedVehicle.insuranceStatus} / {selectedVehicle.permitStatus}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Tyre & Battery Health:</span>
                  <span className="font-mono font-semibold text-foreground">{selectedVehicle.tyreHealth} | {selectedVehicle.batteryHealth}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Overall Health Score:</span>
                  <span className="font-mono font-bold text-primary text-sm">{selectedVehicle.overallComplianceScore}% (Safety: {selectedVehicle.safetyScore}%)</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setSelectedVehicle(null)} className="text-xs">
              Close Vehicle Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW DOCUMENT MODAL */}
      <Dialog open={selectedDoc !== null} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileCheck className="size-4 text-blue-600" /> Master Institutional Governance Document
            </DialogTitle>
            <DialogDescription className="text-xs">
              Official university transport document repository viewer.
            </DialogDescription>
          </DialogHeader>

          {selectedDoc && (
            <div className="space-y-2 text-xs pt-1">
              <div className="p-3 rounded-xl bg-muted/40 space-y-1.5">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Document Title:</span>
                  <span className="font-semibold text-foreground">{selectedDoc.title}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-mono font-bold text-primary">{selectedDoc.category}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Document No:</span>
                  <span className="font-mono font-bold text-foreground">{selectedDoc.docNo}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Expiry Date:</span>
                  <span className="font-mono font-bold text-foreground">{selectedDoc.expiry} ({selectedDoc.status})</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="default"
              onClick={() => {
                toast.success(`Downloaded ${selectedDoc?.title}`);
                setSelectedDoc(null);
              }}
              className="text-xs font-semibold gap-1"
            >
              <Download className="size-3.5" /> Download Document
            </Button>
            <Button variant="outline" onClick={() => setSelectedDoc(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QUICK ACTION MODALS (RETAINED & FULLY FUNCTIONAL) */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sliders className="size-5 text-primary" /> Transport Policy & Governance Configuration
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure general transport settings, fee rules, vehicle/driver policies, student transport rules, GPS tracking, and notifications.
            </DialogDescription>
          </DialogHeader>

          {/* Config Tabs Switcher */}
          <div className="flex items-center gap-1.5 border-b border-border pb-2 pt-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setConfigSubTab("general")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${configSubTab === "general" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              1. General Settings
            </button>
            <button
              type="button"
              onClick={() => setConfigSubTab("fees")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${configSubTab === "fees" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              2. Transport Fees
            </button>
            <button
              type="button"
              onClick={() => setConfigSubTab("vehicles")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${configSubTab === "vehicles" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              3. Vehicle Policies
            </button>
            <button
              type="button"
              onClick={() => setConfigSubTab("drivers")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${configSubTab === "drivers" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              4. Driver Policies
            </button>
            <button
              type="button"
              onClick={() => setConfigSubTab("students")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${configSubTab === "students" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              5. Student Policies
            </button>
            <button
              type="button"
              onClick={() => setConfigSubTab("gps")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${configSubTab === "gps" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              6. GPS & Tracking
            </button>
            <button
              type="button"
              onClick={() => setConfigSubTab("notifications")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${configSubTab === "notifications" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              7. Notifications
            </button>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
            {/* SUBTAB 1: GENERAL SETTINGS */}
            {configSubTab === "general" && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">General Transport Operational Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Transport Academic Year</Label>
                    <Input value={configForm.academicYear || "2026 - 2027"} onChange={(e) => setConfigForm({ ...configForm, academicYear: e.target.value })} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Transport Working Days</Label>
                    <Input value={configForm.workingDays || "Mon - Sat (6 Days / Week)"} onChange={(e) => setConfigForm({ ...configForm, workingDays: e.target.value })} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs font-semibold">Holiday Transport Schedule</Label>
                    <Textarea rows={2} value={configForm.holidaySchedule || ""} onChange={(e) => setConfigForm({ ...configForm, holidaySchedule: e.target.value })} className="text-xs" />
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 2: TRANSPORT FEE SETTINGS */}
            {configSubTab === "fees" && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Transport Fee Structure & Policies</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Single Zone Fee (Annual ₹)</Label>
                    <Input type="number" value={configForm.feeStructure.singleZone} onChange={(e) => setConfigForm({ ...configForm, feeStructure: { ...configForm.feeStructure, singleZone: Number(e.target.value) } })} className="h-9 text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Double Zone Fee (Annual ₹)</Label>
                    <Input type="number" value={configForm.feeStructure.doubleZone} onChange={(e) => setConfigForm({ ...configForm, feeStructure: { ...configForm.feeStructure, doubleZone: Number(e.target.value) } })} className="h-9 text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Full Zone Fee (Annual ₹)</Label>
                    <Input type="number" value={configForm.feeStructure.fullZone} onChange={(e) => setConfigForm({ ...configForm, feeStructure: { ...configForm.feeStructure, fullZone: Number(e.target.value) } })} className="h-9 text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Faculty Annual Fee (Annual ₹)</Label>
                    <Input type="number" value={configForm.feeStructure.staffAnnualFee} onChange={(e) => setConfigForm({ ...configForm, feeStructure: { ...configForm.feeStructure, staffAnnualFee: Number(e.target.value) } })} className="h-9 text-xs font-mono" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs font-semibold">Installment Rules</Label>
                    <Input value={configForm.feeStructure.installmentRules || ""} onChange={(e) => setConfigForm({ ...configForm, feeStructure: { ...configForm.feeStructure, installmentRules: e.target.value } })} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs font-semibold">Refund Policy</Label>
                    <Textarea rows={2} value={configForm.feeStructure.refundPolicy || ""} onChange={(e) => setConfigForm({ ...configForm, feeStructure: { ...configForm.feeStructure, refundPolicy: e.target.value } })} className="text-xs" />
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 3: VEHICLE POLICIES */}
            {configSubTab === "vehicles" && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Vehicle Maintenance & Fleet Standards</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Standard Seating Capacity</Label>
                    <Input type="number" value={configForm.seatingCapacity || 50} onChange={(e) => setConfigForm({ ...configForm, seatingCapacity: Number(e.target.value) })} className="h-9 text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Fuel Consumption Target (Kmpl)</Label>
                    <Input value={configForm.fuelConsumptionStandards} onChange={(e) => setConfigForm({ ...configForm, fuelConsumptionStandards: e.target.value })} className="h-9 text-xs font-mono" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs font-semibold">Preventive Maintenance Policy</Label>
                    <Textarea rows={2} value={configForm.preventiveMaintenancePolicy || ""} onChange={(e) => setConfigForm({ ...configForm, preventiveMaintenancePolicy: e.target.value })} className="text-xs" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs font-semibold">Vehicle Replacement Policy</Label>
                    <Input value={configForm.vehicleReplacementPolicy || ""} onChange={(e) => setConfigForm({ ...configForm, vehicleReplacementPolicy: e.target.value })} className="h-9 text-xs" />
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 4: DRIVER POLICIES */}
            {configSubTab === "drivers" && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Driver Eligibility & Health Regulations</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs font-semibold">Driver Eligibility Rules</Label>
                    <Input value={configForm.driverEligibility || ""} onChange={(e) => setConfigForm({ ...configForm, driverEligibility: e.target.value })} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">License Verification Frequency</Label>
                    <Input value={configForm.licenseVerification || ""} onChange={(e) => setConfigForm({ ...configForm, licenseVerification: e.target.value })} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Max Daily Working Hours</Label>
                    <Input type="number" value={configForm.maxWorkingHours || 8} onChange={(e) => setConfigForm({ ...configForm, maxWorkingHours: Number(e.target.value) })} className="h-9 text-xs font-mono" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs font-semibold">Health & Breathalyzer Check Schedule</Label>
                    <Input value={configForm.healthCheckSchedule || ""} onChange={(e) => setConfigForm({ ...configForm, healthCheckSchedule: e.target.value })} className="h-9 text-xs" />
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 5: STUDENT POLICIES */}
            {configSubTab === "students" && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Student & Pass Discipline Rules</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Boarding Point Rules</Label>
                    <Input value={configForm.boardingRules || ""} onChange={(e) => setConfigForm({ ...configForm, boardingRules: e.target.value })} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Lost Pass Policy</Label>
                    <Input value={configForm.lostPassPolicy || ""} onChange={(e) => setConfigForm({ ...configForm, lostPassPolicy: e.target.value })} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs font-semibold">Bus Discipline Rules</Label>
                    <Textarea rows={2} value={configForm.disciplineRules || ""} onChange={(e) => setConfigForm({ ...configForm, disciplineRules: e.target.value })} className="text-xs" />
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 6: GPS & TRACKING */}
            {configSubTab === "gps" && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">AIS-140 GPS & Telematics Provider Settings</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">GPS Provider</Label>
                    <Input value={configForm.gpsProvider || ""} onChange={(e) => setConfigForm({ ...configForm, gpsProvider: e.target.value })} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Speed Alert Limit (km/h)</Label>
                    <Input type="number" value={configForm.speedAlertLimitKmvh || 55} onChange={(e) => setConfigForm({ ...configForm, speedAlertLimitKmvh: Number(e.target.value) })} className="h-9 text-xs font-mono" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs font-semibold">SOS & Panic Button Tracking Integration</Label>
                    <Input value={configForm.sosTracking || ""} onChange={(e) => setConfigForm({ ...configForm, sosTracking: e.target.value })} className="h-9 text-xs" />
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 7: NOTIFICATIONS */}
            {configSubTab === "notifications" && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Notification & Delay Alert Rules</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Route Delay Alert Threshold (Mins)</Label>
                    <Input type="number" value={configForm.routeDelayAlertMin || 10} onChange={(e) => setConfigForm({ ...configForm, routeDelayAlertMin: Number(e.target.value) })} className="h-9 text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Pass Expiry Warning (Days Prior)</Label>
                    <Input type="number" value={configForm.passExpiryNotificationDays || 15} onChange={(e) => setConfigForm({ ...configForm, passExpiryNotificationDays: Number(e.target.value) })} className="h-9 text-xs font-mono" />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)} className="text-xs gap-1">
                  <Eye className="size-3.5 text-primary" /> Preview Changes
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)} className="text-xs gap-1">
                  <History className="size-3.5 text-muted-foreground" /> Config History
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={handleResetConfig} className="text-xs">
                  Reset
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsConfigOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-brand-gradient text-white text-xs font-semibold gap-1.5">
                  <CheckCircle2 className="size-3.5" /> Save Configuration
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// ============================================================================
// 1. TRANSPORT DASHBOARD OVERVIEW VIEW (For /transport/dashboard)
// ============================================================================
export function TransportDashboardView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRouteFilter, setSelectedRouteFilter] = useState("All Routes");

  const fleetData = [
    {
      id: "BUS-01",
      routeLine: "Route 1",
      routeDetail: "Rajam to Vizianagaram",
      busNumber: "TS-09-UB-1001",
      driverName: "Satish Kumar",
      driverPhone: "9848011221",
      currentArea: "Garividi / Cheepurupalli Junction",
      occupancy: "48 / 50",
      telemetryStatus: "BROADCASTING LIVE",
    },
    {
      id: "BUS-02",
      routeLine: "Route 2",
      routeDetail: "Rajam to Palakonda",
      busNumber: "TS-09-UB-1002",
      driverName: "Mohammad Rafiq",
      driverPhone: "9848022332",
      currentArea: "Palakonda RTC Bus Complex",
      occupancy: "42 / 50",
      telemetryStatus: "BROADCASTING LIVE",
    },
    {
      id: "BUS-03",
      routeLine: "Route 3",
      routeDetail: "Rajam to Srikakulam (via Ranasthalam Road, NH16)",
      busNumber: "TS-09-UB-1003",
      driverName: "Ramesh Yadav",
      driverPhone: "9848033443",
      currentArea: "Ranasthalam Junction, NH16",
      occupancy: "46 / 50",
      telemetryStatus: "BROADCASTING LIVE",
    },
    {
      id: "BUS-04",
      routeLine: "Route 4",
      routeDetail: "Rajam to Visakhapatnam (Vizag Express)",
      busNumber: "TS-09-UB-1004",
      driverName: "K. Appala Naidu",
      driverPhone: "9848044554",
      currentArea: "Anakapalle Toll Plaza",
      occupancy: "38 / 50",
      telemetryStatus: "BROADCASTING LIVE",
    },
  ];

  const filteredFleet = fleetData.filter((bus) => {
    const matchesSearch =
      !searchQuery.trim() ||
      bus.routeLine.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bus.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bus.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bus.currentArea.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRoute =
      selectedRouteFilter === "All Routes" || bus.routeLine === selectedRouteFilter;

    return matchesSearch && matchesRoute;
  });

  return (
    <div className="space-y-6 animate-fade-in-soft max-w-7xl mx-auto p-4 md:p-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 font-medium mb-1">
            <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
              Dashboard
            </Link>{" "}
            / <span className="text-slate-900 font-bold">Transport</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Transport Management Workspace 🚌
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Real-time campus fleet overview, student pass verification, route analytics, and live GPS map tracking.
          </p>
        </div>

        <Button
          onClick={() => toast.success("Opening Live GPS Tracking Map Workspace...")}
          className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold text-xs rounded-2xl h-11 px-5 shadow-sm shrink-0 cursor-pointer flex items-center gap-2"
        >
          <Navigation className="size-4" /> Launch Live GPS Tracking Map &rarr;
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[0.72rem] font-semibold text-slate-400 block">Active Fleet Buses</span>
            <div className="text-2xl font-black text-slate-900">14 Buses</div>
            <span className="text-[0.68rem] font-medium text-slate-400 block">12 On Route &bull; 2 Standby</span>
          </div>
          <div className="size-11 rounded-2xl bg-blue-50 text-[#2563eb] grid place-items-center shrink-0">
            <Bus className="size-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[0.72rem] font-semibold text-slate-400 block">Verified Student Commuters</span>
            <div className="text-2xl font-black text-slate-900">1,248</div>
            <span className="text-[0.68rem] font-medium text-slate-400 block">Active Pass Credentials</span>
          </div>
          <div className="size-11 rounded-2xl bg-blue-50 text-[#2563eb] grid place-items-center shrink-0">
            <Users className="size-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[0.72rem] font-semibold text-slate-400 block">Transit Lines / Routes</span>
            <div className="text-2xl font-black text-slate-900">4 Lines</div>
            <span className="text-[0.68rem] font-medium text-slate-400 block truncate max-w-[140px]">Vizag, Palakonda, Srikakulam, Vizianagaram</span>
          </div>
          <div className="size-11 rounded-2xl bg-blue-50 text-[#2563eb] grid place-items-center shrink-0">
            <Navigation className="size-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[0.72rem] font-semibold text-slate-400 block">On-Duty Driver Fleet</span>
            <div className="text-2xl font-black text-slate-900">14 Drivers</div>
            <span className="text-[0.68rem] font-medium text-slate-400 block">100% GPS Telemetry Enabled</span>
          </div>
          <div className="size-11 rounded-2xl bg-blue-50 text-[#2563eb] grid place-items-center shrink-0">
            <UserCheck className="size-5" />
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-[#0f172a] text-white p-7 shadow-md border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="font-mono text-[0.7rem] font-bold text-emerald-400 tracking-wider uppercase">
                100% Dynamic Telemetry Engine
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
              Sequential Real-Time GPS Transport Tracking
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Verify student transit pass credentials, select commuting lines, activate mobile GPS, and track driver fleet pings live along turn-by-turn road geometry.
            </p>
          </div>

          <Button
            onClick={() => toast.success("Connecting to Live GPS Telemetry Stream...")}
            className="bg-[#10b981] hover:bg-[#059669] text-slate-950 font-extrabold text-xs rounded-2xl h-12 px-6 shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer transition-all flex items-center gap-2"
          >
            Open Live Tracking Map Workspace <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              🚌 Active Campus Fleet Status & Roster
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live operational status, driver contact info, and capacity metrics across all transit lines.
            </p>
          </div>

          <button
            type="button"
            onClick={() => toast.info("Opening full map telemetry workspace")}
            className="text-xs font-bold text-[#2563eb] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            View Full Map & Telemetry &rarr;
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bus, route, or driver..."
              className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs focus-visible:ring-[#2563eb]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <span className="text-xs font-semibold text-slate-400 shrink-0">Filter:</span>
            {["All Routes", "Route 1", "Route 2", "Route 3", "Route 4"].map((route) => (
              <button
                key={route}
                type="button"
                onClick={() => setSelectedRouteFilter(route)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedRouteFilter === route
                    ? "bg-[#2563eb] text-white font-bold shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {route}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[0.68rem]">
              <tr>
                <th className="p-4">Route Line</th>
                <th className="p-4">Bus Number</th>
                <th className="p-4">Assigned Driver</th>
                <th className="p-4">Current Live Area</th>
                <th className="p-4">Occupancy</th>
                <th className="p-4">Telemetry Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFleet.map((bus) => (
                <tr key={bus.id} className="hover:bg-slate-50/70 transition-all">
                  <td className="p-4">
                    <div className="font-extrabold text-slate-900">{bus.routeLine}</div>
                    <div className="text-[0.7rem] text-slate-500">{bus.routeDetail}</div>
                  </td>
                  <td className="p-4 font-extrabold text-[#2563eb] font-mono">
                    {bus.busNumber}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{bus.driverName}</div>
                    <div className="text-[0.7rem] text-slate-500 flex items-center gap-1">
                      <Phone className="size-3 text-slate-400" /> {bus.driverPhone}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                      <MapPin className="size-3.5 text-rose-500 shrink-0" />
                      <span>{bus.currentArea}</span>
                    </div>
                  </td>
                  <td className="p-4 font-extrabold text-slate-900">{bus.occupancy}</td>
                  <td className="p-4">
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold text-[0.65rem] px-2.5 py-0.5">
                      {bus.telemetryStatus}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => toast.success(`Tracking live pings for ${bus.busNumber}...`)}
                      className="bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold rounded-xl h-9 px-3.5 cursor-pointer shadow-2xs"
                    >
                      Track Bus &rarr;
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. TRANSPORT VERIFICATION & ROUTE SELECTION VIEW (For /transport/buses)
// ============================================================================
export interface RouteItem {
  id: string;
  name: string;
  regNumber: string;
  path: string;
  driver: string;
  driverPhone?: string;
  price: string;
  isPopular?: boolean;
}

const DEFAULT_ROUTES: RouteItem[] = [
  {
    id: "route-1",
    name: "Route 1",
    regNumber: "TS 09 UB 1001",
    path: "Rajam to Vizianagaram",
    driver: "Satish Kumar",
    driverPhone: "9848011221",
    price: "₹2,200 / Month",
  },
  {
    id: "route-2",
    name: "Route 2",
    regNumber: "TS 09 UB 1002",
    path: "Rajam to Palakonda",
    driver: "Mohammad Rafiq",
    driverPhone: "9848022332",
    price: "₹1,500 / Month",
  },
  {
    id: "route-3",
    name: "Route 3",
    regNumber: "TS 09 UB 1003",
    path: "Rajam to Srikakulam (via Ranasthalam Road, NH16)",
    driver: "Ramesh Yadav",
    driverPhone: "9848033443",
    price: "₹1,800 / Month",
  },
  {
    id: "route-4",
    name: "Route 4",
    regNumber: "TS 09 UB 1004",
    path: "Rajam to Visakhapatnam (Vizag Express)",
    driver: "K. Appala Naidu",
    driverPhone: "9848044554",
    price: "₹3,500 / Month",
  },
];

export function TransportVerificationView() {
  const navigate = useNavigate();

  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [verifiedStudent, setVerifiedStudent] = useState<{
    name: string;
    rollNo: string;
    dept: string;
    passStatus: string;
    validTill: string;
  } | null>(null);

  const [selectedRouteId, setSelectedRouteId] = useState<string>("route-2");
  const [routes, setRoutes] = useState<RouteItem[]>(DEFAULT_ROUTES);

  const [studentGpsActive, setStudentGpsActive] = useState(false);
  const [driverBroadcastActive, setDriverBroadcastActive] = useState(false);

  const [isAddRouteOpen, setIsAddRouteOpen] = useState(false);
  const [newRouteData, setNewRouteData] = useState({
    name: "",
    regNumber: "",
    path: "",
    driver: "",
    price: "",
  });

  const handleSelectQuickTag = (name: string, rollNo: string) => {
    setStudentName(name);
    setStudentId(rollNo);
    setVerifiedStudent({
      name,
      rollNo,
      dept: name.includes("Meka") ? "Computer Science (CSE)" : "Electronics (ECE)",
      passStatus: "VERIFIED ACTIVE PASS",
      validTill: "DEC 2026",
    });
    toast.success(`Verified transit pass for ${name} (${rollNo})`);
  };

  const handleVerifyPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() && !studentId.trim()) {
      toast.error("Please enter Student Name or Roll Number");
      return;
    }
    const name = studentName.trim() || "Meka Tarun";
    const roll = studentId.trim() || "CSE26001";
    setVerifiedStudent({
      name,
      rollNo: roll,
      dept: "Engineering Department",
      passStatus: "VERIFIED ACTIVE PASS",
      validTill: "DEC 2026",
    });
    toast.success(`Active transit pass verified for ${name}!`);
  };

  const handleAddRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteData.name || !newRouteData.path) {
      toast.error("Please fill in the route name and path details");
      return;
    }

    const newId = `route-${routes.length + 1}`;
    const newRoute: RouteItem = {
      id: newId,
      name: newRouteData.name,
      regNumber: newRouteData.regNumber || `TS 09 UB 100${routes.length + 1}`,
      path: newRouteData.path,
      driver: newRouteData.driver || "Unassigned Driver",
      price: newRouteData.price ? `₹${newRouteData.price} / Month` : "₹2,000 / Month",
    };

    setRoutes([...routes, newRoute]);
    setSelectedRouteId(newId);
    setIsAddRouteOpen(false);
    setNewRouteData({ name: "", regNumber: "", path: "", driver: "", price: "" });
    toast.success(`Added new route "${newRoute.name}" (${newRoute.path})`);
  };

  const handleEnableGpsButton = () => {
    if (!studentGpsActive || !driverBroadcastActive) {
      setStudentGpsActive(true);
      setDriverBroadcastActive(true);
      toast.success("Activated Student GPS & Driver Broadcast Telemetry!");
    } else {
      toast.success("Launching Live GPS Map Workspace...");
    }
  };

  const isBothGpsActive = studentGpsActive && driverBroadcastActive;

  return (
    <div className="space-y-6 animate-fade-in-soft max-w-7xl mx-auto p-2 sm:p-4 md:p-6 pb-24 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
            <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">Transport</span>
          </nav>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Transport Verification & Route Selection 🚌
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            Verify student credentials, select transit line, and activate live GPS before launching the real-time map page.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate({ to: "/dashboard" })}
          className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-full h-10 px-5 shadow-2xs shrink-0 cursor-pointer self-start sm:self-auto flex items-center gap-2"
        >
          <ArrowLeft className="size-4" /> Back to Dashboard
        </Button>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-start gap-3.5">
          <div className="size-9 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-black text-sm grid place-items-center shrink-0">
            1
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Step 1: Student Pass Verification Portal
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Search student credentials to verify active transit pass and unlock route map.
            </p>
          </div>
        </div>

        <form onSubmit={handleVerifyPass} className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 min-w-0">
            <div className="relative w-full sm:w-64 md:w-72">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Student Name (e.g. Meka Tarun)"
                className="pl-11 h-12 rounded-full bg-slate-50/90 border-slate-200 text-xs text-slate-800 focus-visible:ring-indigo-500 shadow-2xs"
              />
            </div>

            <div className="relative w-full sm:w-64 md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Student ID / Roll Number (e.g. CSE26001)"
                className="pl-11 h-12 rounded-full bg-slate-50/90 border-slate-200 text-xs text-slate-800 focus-visible:ring-indigo-500 shadow-2xs"
              />
            </div>

            <Button
              type="submit"
              className="bg-[#4f46e5] hover:bg-indigo-700 text-white font-extrabold text-xs rounded-full h-12 px-7 cursor-pointer shadow-md transition-all shrink-0 w-full sm:w-auto"
            >
              Verify Pass
            </Button>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center shrink-0 pt-2 lg:pt-0">
            <button
              type="button"
              onClick={() => handleSelectQuickTag("Meka Tarun", "22CSE045")}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-full px-4 py-2 transition-all cursor-pointer shadow-2xs"
            >
              Meka Tarun
            </button>
            <button
              type="button"
              onClick={() => handleSelectQuickTag("Yelamanchili Akhil", "22ECE012")}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-full px-4 py-2 transition-all cursor-pointer shadow-2xs"
            >
              Yelamanchili Akhil
            </button>
          </div>
        </form>

        {verifiedStudent && (
          <div className="mt-3 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-soft">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-emerald-500 text-white grid place-items-center shrink-0 font-bold">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900">
                    {verifiedStudent.name} ({verifiedStudent.rollNo})
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[0.65rem] font-black px-2 py-0.5 rounded-md uppercase">
                    {verifiedStudent.passStatus}
                  </Badge>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5">
                  {verifiedStudent.dept} &bull; Valid Through {verifiedStudent.validTill} &bull; Allocated Route Unlocked
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => toast.info("Printing Digital Transport Pass...")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-9 px-4 cursor-pointer shrink-0"
            >
              <CreditCard className="size-3.5 mr-1.5" /> Download Pass PDF
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Select Transit Route
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pick your daily commuting line from GMRIT Campus.
            </p>
          </div>

          <Button
            onClick={() => setIsAddRouteOpen(true)}
            className="bg-[#00a884] hover:bg-[#008f70] text-white font-extrabold text-xs rounded-full h-10 px-5 cursor-pointer shadow-sm flex items-center gap-1.5 transition-all shrink-0 self-start sm:self-auto"
          >
            <Plus className="size-4" /> Add Custom Route
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routes.map((route) => {
            const isSelected = route.id === selectedRouteId;
            return (
              <div
                key={route.id}
                onClick={() => {
                  setSelectedRouteId(route.id);
                  toast.success(`Selected ${route.name}: ${route.path}`);
                }}
                className={`rounded-2xl p-5 transition-all cursor-pointer space-y-3 relative ${
                  isSelected
                    ? "bg-[#f0f3ff] border-2 border-[#6366f1] shadow-sm"
                    : "bg-[#f8fafc] border border-slate-200/80 hover:border-indigo-300 hover:bg-slate-100/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-extrabold text-sm ${
                      isSelected ? "text-[#4f46e5]" : "text-slate-900"
                    }`}
                  >
                    {route.name}
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-slate-400 tracking-wider">
                    {route.regNumber}
                  </span>
                </div>

                <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                  {route.path}
                </h3>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-slate-500">
                    Driver: {route.driver}
                  </span>
                  <span className="font-extrabold text-xs text-[#00a884]">
                    {route.price}
                  </span>
                </div>

                {isSelected && (
                  <div className="absolute right-3.5 bottom-3.5 size-2 rounded-full bg-[#6366f1] shadow-2xs" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#0b132b] rounded-3xl p-5 sm:px-7 border border-slate-800 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 transition-all">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-extrabold text-xs sm:text-sm text-slate-200 tracking-wide shrink-0">
            GPS Activation Status:
          </span>

          <button
            type="button"
            onClick={() => {
              const nextState = !studentGpsActive;
              setStudentGpsActive(nextState);
              toast.info(nextState ? "Student GPS Permission Granted" : "Student GPS Disabled");
            }}
            className={`font-semibold text-xs rounded-full px-3.5 py-1.5 transition-all cursor-pointer flex items-center gap-1.5 border ${
              studentGpsActive
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : "bg-slate-800/90 text-slate-400 hover:text-slate-200 border-slate-700/80"
            }`}
          >
            {studentGpsActive ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                <span>Student GPS Active</span>
              </>
            ) : (
              <>
                <X className="size-3.5 text-slate-400" />
                <span>Student GPS Off</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              const nextState = !driverBroadcastActive;
              setDriverBroadcastActive(nextState);
              toast.info(nextState ? "Driver Broadcast Signal Active" : "Driver Broadcast Disabled");
            }}
            className={`font-semibold text-xs rounded-full px-3.5 py-1.5 transition-all cursor-pointer flex items-center gap-1.5 border ${
              driverBroadcastActive
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : "bg-slate-800/90 text-slate-400 hover:text-slate-200 border-slate-700/80"
            }`}
          >
            {driverBroadcastActive ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                <span>Driver Broadcast Active</span>
              </>
            ) : (
              <>
                <X className="size-3.5 text-slate-400" />
                <span>Driver Broadcast Off</span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleEnableGpsButton}
          className={`font-extrabold text-xs sm:text-sm rounded-full h-12 px-7 cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 ${
            isBothGpsActive
              ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
              : "bg-gradient-to-r from-[#6366f1] via-[#4f46e5] to-[#4338ca] hover:from-indigo-600 hover:to-indigo-700 text-white shadow-indigo-500/25"
          }`}
        >
          {isBothGpsActive ? (
            <>
              <span>Open Live GPS Map Workspace</span>
              <Navigation className="size-4" />
            </>
          ) : (
            <>
              <Lock className="size-4 text-amber-300" />
              <span>Enable Both GPS Permissions Above to Open Map &rarr;</span>
            </>
          )}
        </button>
      </div>

      <Dialog open={isAddRouteOpen} onOpenChange={setIsAddRouteOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Bus className="size-5 text-emerald-600" /> Add Custom Transit Route
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a new campus transport line with assigned driver and monthly fee tariff.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddRouteSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Route Name</label>
              <Input
                required
                value={newRouteData.name}
                onChange={(e) => setNewRouteData({ ...newRouteData, name: e.target.value })}
                placeholder="e.g. Route 5"
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Route Path / Coverage</label>
              <Input
                required
                value={newRouteData.path}
                onChange={(e) => setNewRouteData({ ...newRouteData, path: e.target.value })}
                placeholder="e.g. Rajam to Bobbili (via Salur Junction)"
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Bus Vehicle Number</label>
                <Input
                  value={newRouteData.regNumber}
                  onChange={(e) => setNewRouteData({ ...newRouteData, regNumber: e.target.value })}
                  placeholder="e.g. TS 09 UB 1005"
                  className="h-10 text-xs rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Assigned Driver</label>
                <Input
                  value={newRouteData.driver}
                  onChange={(e) => setNewRouteData({ ...newRouteData, driver: e.target.value })}
                  placeholder="e.g. P. Satish"
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Monthly Fare Amount (₹)</label>
              <Input
                type="number"
                value={newRouteData.price}
                onChange={(e) => setNewRouteData({ ...newRouteData, price: e.target.value })}
                placeholder="e.g. 2000"
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddRouteOpen(false)}
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#00a884] hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl cursor-pointer"
              >
                Create Route
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// 3. TRANSPORT FEES MANAGEMENT & STUDENT ACCOUNTS VIEW (For /transport/fees)
// ============================================================================
export function TransportFeesManagementView() {
  const [passengerSearch, setPassengerSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<{
    name: string;
    rollNo: string;
  } | null>(null);

  const [sourcePlace, setSourcePlace] = useState("Rajam Bypass");
  const [destinationPlace, setDestinationPlace] = useState("College Campus");
  const [distanceKm, setDistanceKm] = useState("15");
  const [timeMins, setTimeMins] = useState("30");
  const [yearlyFee, setYearlyFee] = useState("18000");

  const [ledgerItems, setLedgerItems] = useState([
    {
      id: "ALLOC-01",
      passenger: "Meka Tarun (22CSE045)",
      routeLine: "Route 2: Rajam Bypass to Campus",
      fareAmount: "₹18,000 / Year",
      status: "Paid",
      date: "Aug 01, 2026",
    },
    {
      id: "ALLOC-02",
      passenger: "Yelamanchili Akhil (22ECE012)",
      routeLine: "Route 3: Ranasthalam to Campus",
      fareAmount: "₹9,000 / Sem",
      status: "Paid",
      date: "Aug 03, 2026",
    },
    {
      id: "ALLOC-03",
      passenger: "Student Demo (CS100001)",
      routeLine: "Route 1: Vizianagaram to Campus",
      fareAmount: "₹22,000 / Year",
      status: "Pending",
      date: "Aug 05, 2026",
    },
  ]);

  const handleAllocateAndCollect = () => {
    const student = selectedStudent ? selectedStudent.name : passengerSearch.trim() || "Meka Tarun";
    const newItem = {
      id: `ALLOC-0${ledgerItems.length + 1}`,
      passenger: `${student} (${selectedStudent?.rollNo || "22CSE045"})`,
      routeLine: `${sourcePlace} to ${destinationPlace}`,
      fareAmount: `₹${Number(yearlyFee || 18000).toLocaleString("en-IN")} / Year`,
      status: "Paid",
      date: "Aug 05, 2026",
    };

    setLedgerItems([newItem, ...ledgerItems]);
    toast.success(`Allocated route & collected fee of ₹${yearlyFee} for ${student}!`);
  };

  return (
    <div className="space-y-6 animate-fade-in-soft max-w-7xl mx-auto p-4 md:p-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Fees Management & Student Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Enterprise-grade billing panel with automated late calculators, dynamic route fare allocation, and real-time ledger.
          </p>
        </div>

        <Button
          onClick={handleAllocateAndCollect}
          className="bg-[#4f46e5] hover:bg-indigo-700 text-white font-extrabold text-xs rounded-full h-11 px-6 shadow-md cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <Plus className="size-4" /> Collect Fee
        </Button>
      </div>

      <div className="border-b border-slate-200/80">
        <span className="inline-block font-extrabold text-xs sm:text-sm text-[#2563eb] pb-2.5 border-b-2 border-[#2563eb] cursor-pointer">
          Transport Route Fees Allocation
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <User className="size-4 text-indigo-600" />
            <h2 className="text-sm font-extrabold text-slate-900">
              1. Select Passenger
            </h2>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-semibold">
              Search Student Roll / Name
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                value={passengerSearch}
                onChange={(e) => setPassengerSearch(e.target.value)}
                placeholder="Type student name or roll number..."
                className="pl-10 h-12 rounded-full bg-slate-50/80 border-slate-200 text-xs text-slate-800 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <span className="text-[0.68rem] font-bold text-slate-400 uppercase tracking-wider">Quick Passenger Picks</span>
            <div className="space-y-1">
              {[
                { name: "Meka Tarun", rollNo: "22CSE045" },
                { name: "Yelamanchili Akhil", rollNo: "22ECE012" },
                { name: "Student Demo", rollNo: "CS100001" },
              ].map((p) => (
                <button
                  key={p.rollNo}
                  type="button"
                  onClick={() => {
                    setSelectedStudent(p);
                    setPassengerSearch(`${p.name} (${p.rollNo})`);
                    toast.info(`Selected passenger: ${p.name}`);
                  }}
                  className="w-full text-left bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 p-2.5 rounded-2xl text-xs font-semibold transition-colors flex justify-between items-center"
                >
                  <span>{p.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">{p.rollNo}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-100/90 shadow-2xs space-y-6 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="size-4 text-indigo-600" />
            <h2 className="text-sm font-extrabold text-slate-900">
              2. Route & Fare Allocation Parameters
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#f8fafc] rounded-2xl p-4 border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[0.68rem] font-extrabold text-[#2563eb] tracking-wider uppercase">
                  STARTING PLACE (SOURCE)
                </span>
                <MapPin className="size-3.5 text-[#2563eb]" />
              </div>
              <Input
                value={sourcePlace}
                onChange={(e) => setSourcePlace(e.target.value)}
                placeholder="e.g. Rajam Bypass"
                className="h-11 rounded-2xl bg-white border-slate-200/80 text-xs font-semibold text-slate-900 px-4"
              />
            </div>

            <div className="bg-[#f8fafc] rounded-2xl p-4 border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[0.68rem] font-extrabold text-[#2563eb] tracking-wider uppercase">
                  DESTINATION PLACE
                </span>
                <MapPin className="size-3.5 text-[#2563eb]" />
              </div>
              <Input
                value={destinationPlace}
                onChange={(e) => setDestinationPlace(e.target.value)}
                placeholder="College Campus"
                className="h-11 rounded-2xl bg-white border-slate-200/80 text-xs font-semibold text-slate-900 px-4"
              />
            </div>

            <div className="bg-[#f8fafc] rounded-2xl p-4 border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[0.68rem] font-extrabold text-[#2563eb] tracking-wider uppercase">
                  TRANSIT DISTANCE & TIME
                </span>
                <Activity className="size-3.5 text-[#2563eb]" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[0.6rem] text-slate-400 font-medium block mb-1">Distance (km)</span>
                  <Input
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    className="h-10 rounded-2xl bg-white border-slate-200/80 text-xs font-bold text-center text-slate-900"
                  />
                </div>
                <div>
                  <span className="text-[0.6rem] text-slate-400 font-medium block mb-1">Time (mins)</span>
                  <Input
                    value={timeMins}
                    onChange={(e) => setTimeMins(e.target.value)}
                    className="h-10 rounded-2xl bg-white border-slate-200/80 text-xs font-bold text-center text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#f8fafc] rounded-2xl p-4 border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[0.68rem] font-extrabold text-[#2563eb] tracking-wider uppercase">
                  YEARLY TRANSPORT FEE
                </span>
                <DollarSign className="size-3.5 text-[#2563eb]" />
              </div>
              <Input
                value={yearlyFee}
                onChange={(e) => setYearlyFee(e.target.value)}
                className="h-11 rounded-2xl bg-white border-slate-200/80 text-sm font-extrabold text-slate-900 px-4"
              />
              <span className="text-[0.68rem] font-extrabold text-slate-400 block pt-0.5">
                ₹ {Number(yearlyFee || 18000).toLocaleString("en-IN")} / Year
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              onClick={handleAllocateAndCollect}
              className="bg-gradient-to-r from-[#818cf8] via-[#6366f1] to-[#4f46e5] hover:from-indigo-500 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-full h-12 px-8 cursor-pointer shadow-lg shadow-indigo-500/25 transition-all"
            >
              Allocate Route & Collect Fee
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-100/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-extrabold text-slate-900">
            Active Transport Allocations & Billing Ledger
          </h3>

          <Badge className="bg-blue-50 text-[#2563eb] border border-blue-200 font-bold text-xs px-3 py-1 rounded-full">
            Transport Line Active
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase text-[0.65rem] border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">PASSENGER / ROLL</th>
                <th className="py-3.5 px-4">ROUTE LINE & COVERAGE</th>
                <th className="py-3.5 px-4">FARE TARIFF</th>
                <th className="py-3.5 px-4">PAYMENT STATUS</th>
                <th className="py-3.5 px-4">DATE</th>
                <th className="py-3.5 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgerItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4 font-extrabold text-slate-900">
                    {item.passenger}
                  </td>
                  <td className="py-4 px-4 font-semibold text-slate-700">
                    {item.routeLine}
                  </td>
                  <td className="py-4 px-4 font-extrabold text-[#00a884]">
                    {item.fareAmount}
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      className={
                        item.status === "Paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[0.65rem] px-2.5 py-0.5"
                          : "bg-amber-50 text-amber-700 border-amber-200 font-bold text-[0.65rem] px-2.5 py-0.5"
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-slate-400 font-medium font-mono">
                    {item.date}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toast.success(`Receipt printed for ${item.passenger}`)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    >
                      <Printer className="size-3.5 mr-1" /> Print Receipt
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. TRANSPORT NOTIFICATIONS & ALERTS VIEW (For /transport/notifications)
// ============================================================================
export function TransportNotificationsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  const infoCount = notificationsList.filter((n) => n.type === "Info").length;
  const alertCount = notificationsList.filter((n) => n.type === "Alert").length;
  const completedCount = notificationsList.filter((n) => n.status === "Completed").length;

  const filteredNotifs = notificationsList.filter((n) => {
    const matchesSearch =
      !searchQuery.trim() ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === "All Types" || n.type === typeFilter;
    const matchesStatus = statusFilter === "All Status" || n.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in-soft max-w-7xl mx-auto p-4 md:p-6 pb-20">
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
          <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">Notifications</span>
        </nav>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Notifications
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Stay on top of every alert across the campus.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-[#00a3ff] text-white grid place-items-center shrink-0 shadow-md shadow-sky-500/20 font-bold">
            <Info className="size-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{infoCount}</div>
            <div className="text-xs font-semibold text-slate-400">Info this week</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-[#9333ea] text-white grid place-items-center shrink-0 shadow-md shadow-purple-500/20 font-bold">
            <AlertTriangle className="size-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{alertCount}</div>
            <div className="text-xs font-semibold text-slate-400">Alerts this week</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-[#4f46e5] text-white grid place-items-center shrink-0 shadow-md shadow-indigo-500/20 font-bold">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{completedCount}</div>
            <div className="text-xs font-semibold text-slate-400">Completed this week</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="pl-10 h-12 rounded-full bg-slate-50/80 border-slate-200 text-xs text-slate-800 focus-visible:ring-indigo-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-12 rounded-full bg-white border border-slate-200 px-4 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs focus-visible:ring-indigo-500"
          >
            <option value="All Types">All Types</option>
            <option value="Info">Info</option>
            <option value="Alert">Alert</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-12 rounded-full bg-white border border-slate-200 px-4 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs focus-visible:ring-indigo-500"
          >
            <option value="All Status">All Status</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-2xs space-y-6">
        <h3 className="text-base font-extrabold text-slate-900">
          All Notifications
        </h3>

        {filteredNotifs.length === 0 ? (
          <div className="py-16 text-center space-y-3 flex flex-col items-center justify-center">
            <div className="size-16 rounded-full bg-slate-100 text-slate-300 grid place-items-center">
              <Bell className="size-8 stroke-[1.5]" />
            </div>
            <p className="text-xs text-slate-400 font-medium max-w-sm">
              No notifications yet. They will appear here when events occur.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifs.map((notif) => (
              <div
                key={notif.id}
                className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex items-start justify-between gap-4 hover:bg-indigo-50/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">{notif.title}</span>
                    <Badge
                      className={
                        notif.type === "Alert"
                          ? "bg-purple-100 text-purple-700 border-purple-200 text-[0.65rem] font-bold"
                          : "bg-sky-100 text-sky-700 border-sky-200 text-[0.65rem] font-bold"
                      }
                    >
                      {notif.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">{notif.description}</p>
                </div>

                <span className="text-[0.7rem] text-slate-400 font-medium shrink-0">
                  {notif.timestamp}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 5. SETTINGS & PROFILE DETAILS VIEW (For /transport/settings and /settings)
// ============================================================================
export function TransportSettingsView() {
  const [profileData, setProfileData] = useState({
    name: "Transport Manager Demo",
    roleCode: "TRANSPORT-MANAGER · COMPUTER SCIENCE",
    email: "transport@college.com",
    phone: "9876543210",
    joinedDate: "19/05/2026",
    employeeId: "#999999",
    bio: "",
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ ...profileData });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileData({ ...editFormData });
    setIsEditModalOpen(false);
    toast.success("Updated Settings & Profile Details successfully!");
  };

  return (
    <div className="space-y-6 animate-fade-in-soft max-w-7xl mx-auto p-4 md:p-6 pb-20">
      {/* Top Breadcrumb & Header MATCHING USER PIC 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
            <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">Settings</span>
          </nav>

          <span className="text-[#4f46e5] font-extrabold text-[0.68rem] tracking-wider uppercase block">
            TRANSPORT MANAGER SETTINGS
          </span>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage your campus profile and settings
          </p>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Settings & Profile Details
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your dynamic system identities, editable profile details, social handles, and preferences.
          </p>
        </div>

        {/* Top Right Edit Button MATCHING USER PIC 2 */}
        <Button
          onClick={() => {
            setEditFormData({ ...profileData });
            setIsEditModalOpen(true);
          }}
          className="bg-[#4f46e5] hover:bg-indigo-700 text-white font-extrabold text-xs rounded-full h-10 px-5 shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Edit3 className="size-4" /> Edit Profile Details
        </Button>
      </div>

      {/* TOP ROW CARDS: PROFILE AVATAR CARD + BIOGRAPHY & MANDATE MATCHING PIC 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* TOP LEFT CARD: PROFILE AVATAR CARD */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100/90 shadow-2xs text-center flex flex-col items-center justify-center space-y-3 min-h-[220px]">
          {/* Avatar Square */}
          <div className="size-24 rounded-3xl bg-gradient-to-tr from-[#6366f1] via-[#4f46e5] to-[#7c3aed] text-white font-black text-2xl grid place-items-center shadow-lg shadow-indigo-500/20">
            TM
          </div>

          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-snug">
              {profileData.name}
            </h3>
            <p className="text-[0.65rem] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
              {profileData.roleCode}
            </p>
          </div>
        </div>

        {/* TOP RIGHT CARD: BIOGRAPHY & MANDATE MATCHING PIC 2 */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-100/90 shadow-2xs space-y-3 min-h-[160px] flex flex-col justify-start">
          <h3 className="text-[0.68rem] font-extrabold text-slate-400 tracking-wider uppercase">
            BIOGRAPHY & MANDATE
          </h3>

          <p className="text-xs text-slate-400 font-medium italic pt-2">
            {profileData.bio || "No bio provided yet. Add one to let people know who you are!"}
          </p>
        </div>
      </div>

      {/* BOTTOM ROW CARDS: SOCIAL HANDLES + ACCOUNT METADATA MATCHING PIC 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* BOTTOM LEFT CARD: SOCIAL HANDLES */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100/90 shadow-2xs space-y-4">
          <h3 className="text-[0.68rem] font-extrabold text-slate-400 tracking-wider uppercase">
            SOCIAL HANDLES
          </h3>

          <div className="space-y-3 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2.5">
              <Github className="size-4 text-slate-400 shrink-0" />
              <span className="italic">Not linked</span>
            </div>

            <div className="flex items-center gap-2.5">
              <Linkedin className="size-4 text-slate-400 shrink-0" />
              <span className="italic">Not linked</span>
            </div>

            <div className="flex items-center gap-2.5">
              <Twitter className="size-4 text-slate-400 shrink-0" />
              <span className="italic">Not linked</span>
            </div>

            <div className="flex items-center gap-2.5">
              <Globe className="size-4 text-slate-400 shrink-0" />
              <span className="italic">Not linked</span>
            </div>
          </div>
        </div>

        {/* BOTTOM RIGHT CARD: ACCOUNT METADATA MATCHING PIC 2 */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-100/90 shadow-2xs space-y-4">
          <h3 className="text-[0.68rem] font-extrabold text-slate-400 tracking-wider uppercase">
            ACCOUNT METADATA
          </h3>

          {/* 2X2 METADATA GRID MATCHING PIC 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: EMAIL ADDRESS */}
            <div className="bg-[#f8fafc] rounded-2xl p-4 border border-slate-100/80 space-y-1">
              <span className="text-[0.62rem] font-extrabold text-slate-400 tracking-wider uppercase block">
                EMAIL ADDRESS
              </span>
              <span className="text-xs font-bold text-slate-900 block">
                {profileData.email}
              </span>
            </div>

            {/* Box 2: CONTACT NUMBER */}
            <div className="bg-[#f8fafc] rounded-2xl p-4 border border-slate-100/80 space-y-1">
              <span className="text-[0.62rem] font-extrabold text-slate-400 tracking-wider uppercase block">
                CONTACT NUMBER
              </span>
              <span className="text-xs font-bold text-slate-900 block">
                {profileData.phone}
              </span>
            </div>

            {/* Box 3: JOINED ON */}
            <div className="bg-[#f8fafc] rounded-2xl p-4 border border-slate-100/80 space-y-1">
              <span className="text-[0.62rem] font-extrabold text-slate-400 tracking-wider uppercase block">
                JOINED ON
              </span>
              <span className="text-xs font-bold text-slate-900 block">
                {profileData.joinedDate}
              </span>
            </div>

            {/* Box 4: EMPLOYEE ID */}
            <div className="bg-[#f8fafc] rounded-2xl p-4 border border-slate-100/80 space-y-1">
              <span className="text-[0.62rem] font-extrabold text-slate-400 tracking-wider uppercase block">
                EMPLOYEE ID
              </span>
              <span className="text-xs font-bold text-slate-900 block">
                {profileData.employeeId}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Edit3 className="size-5 text-indigo-600" /> Edit Profile Details
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update your personal details and campus profile metadata.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Full Name</label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Email Address</label>
                <Input
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Contact Phone</label>
                <Input
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Biography / Mandate</label>
              <Input
                value={editFormData.bio}
                onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                placeholder="Write a brief bio..."
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#4f46e5] hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl cursor-pointer"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}