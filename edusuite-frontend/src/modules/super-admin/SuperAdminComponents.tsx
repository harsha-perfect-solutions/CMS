import React, { memo } from "react";
import {
  ShieldCheck,
  Bell,
  Users,
  UserCog,
  Building2,
  IndianRupee,
  Activity,
  Plus,
  RefreshCw,
  Download,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Database,
  Brain,
  Shield,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Lock,
  Server,
  Terminal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  LockKeyhole,
  Siren,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

import {
  useSuperAdmin,
  type SortField,
} from "./useSuperAdmin";
import type { SuperAdminUser, DepartmentItem, AuditLogItem, RolePermissionMatrixItem } from "./SuperAdminService";

const ROLES = [
  "All Roles",
  "super_admin",
  "admin",
  "principal",
  "dean",
  "hod",
  "faculty",
  "student",
  "finance",
  "hr",
];

const STATUSES = ["All Statuses", "Active", "Inactive", "Suspended"];

export function SuperAdminModuleView() {
  const {
    activeTab,
    setActiveTab,
    stats,
    users,
    departments,
    auditLogs,
    rolePermissions,
    delegationRules,
    retentionMetrics,
    anomalies,
    search,
    setSearch,
    selectedRole,
    setSelectedRole,
    selectedDepartmentFilter,
    setSelectedDepartmentFilter,
    selectedStatusFilter,
    setSelectedStatusFilter,
    sortField,
    sortOrder,
    handleSort,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    filteredUsers,
    sortedUsers,
    paginatedUsers,
    selectedUserIds,
    handleSelectAllOnPage,
    handleSelectUser,
    loading,
    backupLoading,
    broadcastLoading,
    mitigateLoading,
    isAddUserOpen,
    setIsAddUserOpen,
    isEditUserOpen,
    setIsEditUserOpen,
    isViewUserOpen,
    setIsViewUserOpen,
    isAddDeptOpen,
    setIsAddDeptOpen,
    isBackupModalOpen,
    setIsBackupModalOpen,
    isBroadcastModalOpen,
    setIsBroadcastModalOpen,
    isMitigateModalOpen,
    setIsMitigateModalOpen,
    isAnomalyDetailsOpen,
    setIsAnomalyDetailsOpen,
    isAddDelegationOpen,
    setIsAddDelegationOpen,
    isEditDelegationOpen,
    setIsEditDelegationOpen,
    selectedUser,
    selectedAnomaly,
    selectedDelegationRule,
    userFormData,
    setUserFormData,
    deptFormData,
    setDeptFormData,
    broadcastFormData,
    setBroadcastFormData,
    delegationFormData,
    setDelegationFormData,
    loadData,
    handleOpenAddUser,
    handleOpenEditUser,
    handleOpenViewUser,
    handleAddUserSubmit,
    handleEditUserSubmit,
    handleDeleteUser,
    handleBulkDelete,
    handleBulkUpdateStatus,
    handleOpenAddDept,
    handleAddDeptSubmit,
    handleDeleteDeptSubmit,
    handleTogglePermission,
    handleOpenBackupModal,
    handleConfirmBackup,
    handleOpenBroadcastModal,
    handleBroadcastSubmit,
    handleOpenMitigate,
    handleMitigateSubmit,
    handleOpenAnomalyDetails,
    handleOpenAddDelegation,
    handleOpenEditDelegation,
    handleAddDelegationSubmit,
    handleEditDelegationSubmit,
    handleDeleteDelegationRuleSubmit,
    handleExportCSV,
  } = useSuperAdmin();

  // All department options for filter
  const departmentOptions = [
    "All Departments",
    ...Array.from(new Set(departments.map((d) => d.name))),
  ];

  const allOnPageSelected =
    paginatedUsers.length > 0 &&
    paginatedUsers.every((u) => selectedUserIds.includes(u.id));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
                Super Admin Cockpit & Controller
              </h1>
              <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                System Superuser
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Global platform administration, institutional metrics, user RBAC, and database backups.
            </p>
          </div>
        </div>

        {/* Action Buttons - Top Right Corner */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 gap-2 text-xs font-medium border-border hover:bg-accent"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-2 text-xs font-medium border-border hover:bg-accent"
          >
            <Download className="size-3.5" /> Export Roster
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenBackupModal}
            disabled={backupLoading}
            className="h-9 gap-2 text-xs font-medium border-primary/40 text-primary hover:bg-primary/10"
          >
            <Database className={`size-3.5 ${backupLoading ? "animate-spin" : ""}`} />
            {backupLoading ? "Backing up..." : "Trigger Backup"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => (window.location.href = "/super-admin/exam-notifications")}
            className="h-9 gap-2 text-xs font-semibold border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
          >
            <Bell className="size-3.5" /> Exam Notifications
          </Button>

          <Button
            size="sm"
            onClick={handleOpenBroadcastModal}
            className="h-9 bg-rose-600 hover:bg-rose-700 text-white gap-2 font-bold text-xs shadow-md animate-pulse"
          >
            <Siren className="size-4" /> Emergency Broadcast
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAddUser}
            className="h-9 bg-brand-gradient text-white gap-2 font-semibold text-xs shadow-glow hover:opacity-95"
          >
            <Plus className="size-4" /> Register Global User
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
            <span>Total Enrolled Students</span>
            <Users className="size-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-mono text-primary">
            {stats.totalStudents.toLocaleString("en-IN")}
          </p>
          <p className="text-[0.68rem] text-muted-foreground">Across all departments</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
            <span>Total Staff & Faculty</span>
            <UserCog className="size-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-blue-600">
            {stats.totalStaff.toLocaleString("en-IN")}
          </p>
          <p className="text-[0.68rem] text-muted-foreground">Active faculty & admins</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
            <span>Active Departments</span>
            <Building2 className="size-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600">
            {departments.length}
          </p>
          <p className="text-[0.68rem] text-emerald-600 font-medium">NBA / NAAC Accredited</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
            <span>Institutional Revenue</span>
            <IndianRupee className="size-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-purple-600">{stats.totalRevenue}</p>
          <p className="text-[0.68rem] text-muted-foreground">Fiscal year collections</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border/60 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "overview"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Overview & System Health
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "users"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          User Management ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("departments")}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "departments"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Departments ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab("rbac")}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "rbac"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Role & Permission Matrix
        </button>
        <button
          onClick={() => setActiveTab("delegation")}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "delegation"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Operational Delegation Matrix ({delegationRules.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "audit"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Audit Logs ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "ai"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          AI Anomaly Engine
        </button>
      </div>

      {/* TAB 1: OVERVIEW & SYSTEM HEALTH */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* System Health Card */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Activity className="size-5 text-emerald-500" /> Infrastructure Node Cluster Monitor
                </h3>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono text-xs">
                  All Systems Operational
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs flex justify-between items-center font-mono">
                  <span className="text-muted-foreground font-sans">API Latency:</span>
                  <span className="font-bold text-emerald-600">{stats.apiLatency}</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs flex justify-between items-center font-mono">
                  <span className="text-muted-foreground font-sans">SSL Certificate:</span>
                  <span className="font-bold text-emerald-600">Active</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs flex justify-between items-center font-mono">
                  <span className="text-muted-foreground font-sans">24h Error Rate:</span>
                  <span className="font-bold text-foreground">{stats.errorRate}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {stats.systemHealth.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-card border border-border/60 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-foreground flex items-center gap-2">
                      <Server className="size-4 text-primary" /> {item.label}
                    </span>
                    <Badge variant="secondary" className="font-mono text-[0.68rem]">
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Action Shortcuts Panel */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-sm">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Terminal className="size-5 text-primary" /> Super Admin Operations
              </h3>

              <div className="space-y-2.5">
                <Button
                  onClick={handleOpenAddUser}
                  className="w-full justify-start text-xs font-semibold gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 h-10"
                >
                  <Plus className="size-4" /> Register New Global User
                </Button>

                <Button
                  onClick={handleOpenBackupModal}
                  disabled={backupLoading}
                  className="w-full justify-start text-xs font-semibold gap-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 h-10"
                >
                  <Database className="size-4" /> Trigger Database Backup
                </Button>

                <Button
                  onClick={() => setActiveTab("rbac")}
                  className="w-full justify-start text-xs font-semibold gap-2 bg-muted text-foreground hover:bg-muted/80 border border-border h-10"
                >
                  <LockKeyhole className="size-4 text-amber-500" /> Manage Role Privileges
                </Button>

                <Button
                  onClick={() => setActiveTab("audit")}
                  className="w-full justify-start text-xs font-semibold gap-2 bg-muted text-foreground hover:bg-muted/80 border border-border h-10"
                >
                  <FileSpreadsheet className="size-4" /> View Audit Trail Logs
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border/80 shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, ID, department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-9 w-[140px] text-xs" aria-label="Role Filter">
                  <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedDepartmentFilter}
                onValueChange={setSelectedDepartmentFilter}
              >
                <SelectTrigger className="h-9 w-[160px] text-xs" aria-label="Department Filter">
                  <Building2 className="size-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((d) => (
                    <SelectItem key={d} value={d} className="text-xs">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger className="h-9 w-[130px] text-xs" aria-label="Status Filter">
                  <SlidersHorizontal className="size-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Operations Bar */}
          {selectedUserIds.length > 0 && (
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-3 text-xs font-semibold">
              <span className="text-primary flex items-center gap-1.5">
                <CheckCircle className="size-4" /> {selectedUserIds.length} users selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkUpdateStatus("Active")}
                  className="h-8 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                >
                  Set Active
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkUpdateStatus("Suspended")}
                  className="h-8 text-xs bg-amber-500/10 text-amber-600 border-amber-500/20"
                >
                  Suspend
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  className="h-8 text-xs gap-1.5"
                >
                  <Trash2 className="size-3.5" /> Delete Selected
                </Button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <UserCog className="size-4 text-primary" /> System Accounts Roster
                <Badge variant="secondary" className="font-mono text-xs">
                  {sortedUsers.length} Users Found
                </Badge>
              </h3>
            </div>

            {paginatedUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground space-y-2">
                <UserCog className="size-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-semibold">No users matching your filters.</p>
                <p className="text-xs text-muted-foreground">Try adjusting your search term or dropdown filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[0.68rem]">
                    <tr>
                      <th className="py-3 px-3 w-8">
                        <Checkbox
                          checked={allOnPageSelected}
                          onCheckedChange={(val) => handleSelectAllOnPage(!!val)}
                          aria-label="Select all on page"
                        />
                      </th>
                      <th
                        className="py-3 px-3 cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("id")}
                      >
                        <div className="flex items-center gap-1">
                          <span>User ID</span>
                          {sortField === "id" ? (
                            sortOrder === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                          ) : (
                            <ArrowUpDown className="size-3 text-muted-foreground/60" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Full Name & Email</span>
                          {sortField === "name" ? (
                            sortOrder === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                          ) : (
                            <ArrowUpDown className="size-3 text-muted-foreground/60" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("role")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Role</span>
                          {sortField === "role" ? (
                            sortOrder === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                          ) : (
                            <ArrowUpDown className="size-3 text-muted-foreground/60" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("department")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Department</span>
                          {sortField === "department" ? (
                            sortOrder === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                          ) : (
                            <ArrowUpDown className="size-3 text-muted-foreground/60" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Status</span>
                          {sortField === "status" ? (
                            sortOrder === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                          ) : (
                            <ArrowUpDown className="size-3 text-muted-foreground/60" />
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-3">Last Login</th>
                      <th className="py-3 px-3 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paginatedUsers.map((u) => {
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <tr
                          key={u.id}
                          className={`transition-colors ${
                            isSelected ? "bg-primary/5" : "hover:bg-muted/20"
                          }`}
                        >
                          <td className="py-3 px-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(val) => handleSelectUser(u.id, !!val)}
                              aria-label={`Select ${u.name}`}
                            />
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-foreground">{u.id}</td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-foreground">{u.name}</div>
                            <div className="text-[0.68rem] text-muted-foreground font-mono">{u.email}</div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              variant="outline"
                              className="font-mono text-[0.68rem] text-primary border-primary/30 uppercase"
                            >
                              {u.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 font-medium text-foreground">{u.department}</td>
                          <td className="py-3 px-3">
                            <Badge
                              className={
                                u.status === "Active"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[0.68rem]"
                                  : u.status === "Suspended"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[0.68rem]"
                                  : "bg-muted text-muted-foreground text-[0.68rem]"
                              }
                            >
                              {u.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 font-mono text-muted-foreground">{u.lastLogin}</td>
                          <td className="py-3 px-3 text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenViewUser(u)}
                                className="size-7 text-muted-foreground hover:text-foreground"
                                title="View User Dossier"
                              >
                                <Eye className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEditUser(u)}
                                className="size-7 text-muted-foreground hover:text-primary"
                                title="Edit User"
                              >
                                <Edit className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser(u)}
                                className="size-7 text-muted-foreground hover:text-red-600"
                                title="Delete User"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Rows per page:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => setPageSize(Number(val))}
                >
                  <SelectTrigger className="h-8 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5" className="text-xs">
                      5
                    </SelectItem>
                    <SelectItem value="10" className="text-xs">
                      10
                    </SelectItem>
                    <SelectItem value="25" className="text-xs">
                      25
                    </SelectItem>
                  </SelectContent>
                </Select>
                <span>
                  Showing {sortedUsers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                  {Math.min(currentPage * pageSize, sortedUsers.length)} of {sortedUsers.length} entries
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 text-xs gap-1"
                >
                  <ChevronLeft className="size-3.5" /> Previous
                </Button>
                <span className="font-semibold text-foreground px-2 font-mono">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-8 text-xs gap-1"
                >
                  Next <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Building2 className="size-5 text-emerald-500" /> Academic & Administrative Departments
            </h3>
            <Button
              size="sm"
              onClick={handleOpenAddDept}
              className="h-9 bg-primary text-primary-foreground gap-2 font-semibold text-xs"
            >
              <Plus className="size-4" /> Add Department
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="p-5 rounded-2xl border border-border/80 bg-card space-y-3 shadow-sm hover:border-primary/40 transition-all relative group"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {dept.code}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                      {dept.accreditation}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteDeptSubmit(dept.id, dept.name)}
                      className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                      title="Delete Department"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-base text-foreground">{dept.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    HOD: <span className="font-semibold text-primary">{dept.hodName}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs font-mono">
                  <div className="p-2 rounded-xl bg-muted/40 text-center">
                    <div className="text-[0.68rem] text-muted-foreground font-sans">Students</div>
                    <div className="font-bold text-foreground text-sm">{dept.studentsCount}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-muted/40 text-center">
                    <div className="text-[0.68rem] text-muted-foreground font-sans">Faculty</div>
                    <div className="font-bold text-foreground text-sm">{dept.facultyCount}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ROLE & PERMISSION MATRIX (RBAC) */}
      {activeTab === "rbac" && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <LockKeyhole className="size-5 text-amber-500" /> Role-Based Access Control (RBAC) Matrix
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure module privilege flags dynamically across institution user personas.
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-xs text-amber-600 border-amber-500/30">
              Live Enforcement
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[0.68rem]">
                <tr>
                  <th className="py-3 px-3">Role Persona</th>
                  <th className="py-3 px-3 text-center">System Admin</th>
                  <th className="py-3 px-3 text-center">Principal</th>
                  <th className="py-3 px-3 text-center">Academic Dean</th>
                  <th className="py-3 px-3 text-center">HOD</th>
                  <th className="py-3 px-3 text-center">Faculty</th>
                  <th className="py-3 px-3 text-center">Finance</th>
                  <th className="py-3 px-3 text-center">User Mgmt</th>
                  <th className="py-3 px-3 text-center">Export Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rolePermissions.map((item) => (
                  <tr key={item.role} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-3 font-bold text-foreground">
                      <div>{item.label}</div>
                      <div className="text-[0.68rem] text-muted-foreground font-mono uppercase">{item.role}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Switch
                        checked={item.isSystemAdmin}
                        onCheckedChange={() => handleTogglePermission(item.role, "isSystemAdmin", item.isSystemAdmin)}
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Switch
                        checked={item.isPrincipal}
                        onCheckedChange={() => handleTogglePermission(item.role, "isPrincipal", item.isPrincipal)}
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Switch
                        checked={item.isDean}
                        onCheckedChange={() => handleTogglePermission(item.role, "isDean", item.isDean)}
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Switch
                        checked={item.isHod}
                        onCheckedChange={() => handleTogglePermission(item.role, "isHod", item.isHod)}
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Switch
                        checked={item.isFaculty}
                        onCheckedChange={() => handleTogglePermission(item.role, "isFaculty", item.isFaculty)}
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Switch
                        checked={item.isFinance}
                        onCheckedChange={() => handleTogglePermission(item.role, "isFinance", item.isFinance)}
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Switch
                        checked={item.canManageUsers}
                        onCheckedChange={() => handleTogglePermission(item.role, "canManageUsers", item.canManageUsers)}
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Switch
                        checked={item.canExportData}
                        onCheckedChange={() => handleTogglePermission(item.role, "canExportData", item.canExportData)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === "audit" && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-primary" /> Admin Audit Trail
            </h3>
            <Badge variant="secondary" className="font-mono text-xs">
              {auditLogs.length} Log Entries
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[0.68rem]">
                <tr>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Actor</th>
                  <th className="py-3 px-3">Action Performed</th>
                  <th className="py-3 px-3">Module</th>
                  <th className="py-3 px-3">IP Address</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-3 font-mono text-muted-foreground">{log.timestamp}</td>
                    <td className="py-3 px-3 font-semibold text-foreground">{log.actor}</td>
                    <td className="py-3 px-3 font-medium text-foreground">{log.action}</td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="font-mono text-[0.68rem]">
                        {log.module}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{log.ipAddress}</td>
                    <td className="py-3 px-3">
                      <Badge
                        className={
                          log.status === "Success"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[0.68rem]"
                            : "bg-red-500/10 text-red-600 border-red-500/20 text-[0.68rem]"
                        }
                      >
                        {log.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: AI ANOMALY ENGINE */}
      {activeTab === "ai" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-sm">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Brain className="size-5 text-purple-500" /> Student Retention & Dropout Risk Analytics
            </h3>

            <div className="space-y-4">
              {retentionMetrics.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Calculating student retention metrics...
                </div>
              ) : (
                retentionMetrics.map((item, idx) => {
                  const progressVal = item.riskLevel === "high" ? 78 : item.riskLevel === "medium" ? 42 : 15;
                  return (
                    <div key={idx} className="space-y-1.5 p-2 rounded-xl bg-muted/20 border border-border/40">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{item.departmentName} ({item.departmentCode})</span>
                        <span
                          className={
                            item.riskLevel === "high"
                              ? "text-red-500 font-bold"
                              : item.riskLevel === "medium"
                              ? "text-amber-500 font-bold"
                              : "text-emerald-500 font-bold"
                          }
                        >
                          {item.dropoutRisk}
                        </span>
                      </div>
                      <Progress value={progressVal} className="h-2" />
                      <div className="flex justify-between text-[0.68rem] text-muted-foreground font-mono">
                        <span>Cohort: {item.studentCount} students</span>
                        <span>Retention: {item.retentionRate}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-sm">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Shield className="size-5 text-amber-500" /> Security Anomaly Engine
            </h3>

            <div className="space-y-3 text-xs">
              {anomalies.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No active security anomaly alerts.
                </div>
              ) : (
                anomalies.map((anom) => (
                  <div
                    key={anom.id}
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      anom.status === "MITIGATED"
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : anom.severity === "CRITICAL"
                        ? "bg-red-500/10 border-red-500/20"
                        : "bg-amber-500/10 border-amber-500/20"
                    }`}
                  >
                    <div className="font-bold text-foreground flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        {anom.severity === "CRITICAL" ? (
                          <Lock className="size-4 text-red-500" />
                        ) : (
                          <AlertTriangle className="size-4 text-amber-500" />
                        )}
                        {anom.title}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {anom.status !== "MITIGATED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenMitigate(anom)}
                            className="h-6 text-[0.65rem] px-2.5 bg-background font-semibold"
                          >
                            Mitigate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenAnomalyDetails(anom)}
                          className="h-6 text-[0.65rem] px-2"
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                    <p className="text-muted-foreground">{anom.description}</p>
                    <div className="flex items-center justify-between text-[0.68rem] text-muted-foreground font-mono pt-1 border-t border-border/40">
                      <span>Source: {anom.source}</span>
                      <Badge
                        variant="outline"
                        className={
                          anom.status === "MITIGATED"
                            ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/40 text-[0.65rem]"
                            : "text-[0.65rem]"
                        }
                      >
                        {anom.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: OPERATIONAL DELEGATION MATRIX */}
      {activeTab === "delegation" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <UserCog className="size-5 text-primary" /> Institutional Operational Delegation Governance
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Super Admin configures system rules, controls access, monitors health, and delegates operational execution to Principals, Deans, HODs, Faculty, Finance, and HR.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
                  {delegationRules.length} Active Domains
                </Badge>
                <Button
                  size="sm"
                  onClick={handleOpenAddDelegation}
                  className="h-8 bg-primary text-primary-foreground text-xs font-semibold gap-1.5"
                >
                  <Plus className="size-3.5" /> Create Delegation Rule
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {delegationRules.map((rule) => (
                <div key={rule.id} className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-3 shadow-xs relative group">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-xs text-primary">{rule.id}</Badge>
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                        ✅ {rule.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditDelegation(rule)}
                        className="size-7 text-muted-foreground hover:text-primary"
                        title="Edit Delegation Rule"
                      >
                        <Edit className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDelegationRuleSubmit(rule.id)}
                        className="size-7 text-muted-foreground hover:text-destructive"
                        title="Delete Delegation Rule"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-foreground">{rule.moduleName}</h4>
                    <p className="text-xs text-primary font-semibold mt-0.5">Delegated Role: {rule.delegatedRole}</p>
                    <p className="text-xs text-muted-foreground font-mono">{rule.assignedPerson}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border/60 text-xs space-y-1">
                    <span className="font-bold text-muted-foreground uppercase text-[0.65rem] block">Delegated Scope & Authority</span>
                    <p className="text-foreground font-medium">{rule.scope}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rule.permissions.map((perm) => (
                      <Badge key={perm} variant="secondary" className="text-[0.68rem] font-mono">
                        🔒 {perm}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 1: ADD GLOBAL USER MODAL */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="size-5 text-primary" /> Register Global User Account
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create a new user profile with role-based access privileges.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddUserSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Full Name *</Label>
                <Input
                  required
                  placeholder="e.g. Dr. K. Sai Teja"
                  value={userFormData.name || ""}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address *</Label>
                <Input
                  type="email"
                  required
                  placeholder="e.g. user@college.com"
                  value={userFormData.email || ""}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assigned Role</Label>
                <Select
                  value={userFormData.role || "faculty"}
                  onValueChange={(val: any) => setUserFormData({ ...userFormData, role: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.filter((r) => r !== "All Roles").map((r) => (
                      <SelectItem key={r} value={r} className="text-xs uppercase">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department</Label>
                <Input
                  placeholder="e.g. Computer Science"
                  value={userFormData.department || ""}
                  onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddUserOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-brand-gradient text-white text-xs font-semibold">
                Register User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: EDIT USER MODAL */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Edit className="size-5 text-primary" /> Edit User Profile ({selectedUser?.id})
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditUserSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Full Name</Label>
                <Input
                  required
                  value={userFormData.name || ""}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input
                  type="email"
                  required
                  value={userFormData.email || ""}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Role</Label>
                <Select
                  value={userFormData.role || "faculty"}
                  onValueChange={(val: any) => setUserFormData({ ...userFormData, role: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.filter((r) => r !== "All Roles").map((r) => (
                      <SelectItem key={r} value={r} className="text-xs uppercase">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department</Label>
                <Input
                  value={userFormData.department || ""}
                  onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={userFormData.status || "Active"}
                  onValueChange={(val: any) => setUserFormData({ ...userFormData, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.filter((s) => s !== "All Statuses").map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditUserOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-brand-gradient text-white text-xs font-semibold">
                Save User Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: VIEW USER DOSSIER MODAL */}
      <Dialog open={isViewUserOpen} onOpenChange={setIsViewUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserCog className="size-5 text-primary" /> User Dossier & Role Matrix
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 pt-1 text-xs">
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {selectedUser.id}
                  </Badge>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {selectedUser.status}
                  </Badge>
                </div>
                <h2 className="text-base font-bold text-foreground">{selectedUser.name}</h2>
                <p className="text-xs text-primary font-mono">{selectedUser.email}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60">
                  <span className="text-muted-foreground">System Role:</span>
                  <Badge variant="outline" className="font-mono text-xs uppercase text-primary">
                    {selectedUser.role}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60">
                  <span className="text-muted-foreground">Department:</span>
                  <span className="font-semibold text-foreground">{selectedUser.department}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60 font-mono">
                  <span className="text-muted-foreground font-sans">Last Login Timestamp:</span>
                  <span className="text-foreground">{selectedUser.lastLogin}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60 font-mono">
                  <span className="text-muted-foreground font-sans">Account Created Date:</span>
                  <span className="text-foreground">{selectedUser.createdAt}</span>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsViewUserOpen(false)}
                  className="w-full text-xs"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: ADD DEPARTMENT MODAL */}
      <Dialog open={isAddDeptOpen} onOpenChange={setIsAddDeptOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="size-5 text-emerald-500" /> Create Academic Department
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new institutional department or division.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddDeptSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department Name *</Label>
                <Input
                  required
                  placeholder="e.g. Civil Engineering"
                  value={deptFormData.name || ""}
                  onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department Code *</Label>
                <Input
                  required
                  placeholder="e.g. CE"
                  value={deptFormData.code || ""}
                  onChange={(e) => setDeptFormData({ ...deptFormData, code: e.target.value.toUpperCase() })}
                  className="h-9 text-xs uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">HOD Name</Label>
                <Input
                  placeholder="e.g. Dr. A. V. Rao"
                  value={deptFormData.hodName || ""}
                  onChange={(e) => setDeptFormData({ ...deptFormData, hodName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Accreditation</Label>
                <Input
                  placeholder="e.g. NBA Accredited"
                  value={deptFormData.accreditation || ""}
                  onChange={(e) => setDeptFormData({ ...deptFormData, accreditation: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDeptOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                Create Department
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: DATABASE BACKUP CONFIRMATION MODAL */}
      <Dialog open={isBackupModalOpen} onOpenChange={setIsBackupModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-primary">
              <Database className="size-5" /> Trigger System Database Backup?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              This is a privileged operation. A full transactional database snapshot will be generated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="size-4 text-amber-500" /> Operational Notice
              </div>
              <p className="text-[0.72rem] leading-normal">
                Generating a backup snapshot will not disrupt live database connections. Existing data will remain unaffected. An immutable log entry will be recorded in the System Audit Trail.
              </p>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40 font-mono text-[0.7rem]">
              <span className="text-muted-foreground font-sans">Target Storage Node:</span>
              <span className="font-bold text-foreground">PostgreSQL Cluster Node 01</span>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBackupModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBackup}
              disabled={backupLoading}
              className="bg-primary text-primary-foreground text-xs font-semibold gap-2"
            >
              <Database className={`size-3.5 ${backupLoading ? "animate-spin" : ""}`} />
              {backupLoading ? "Generating Snapshot..." : "Confirm & Trigger Backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 6: EMERGENCY BROADCAST MODAL */}
      <Dialog open={isBroadcastModalOpen} onOpenChange={setIsBroadcastModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
              <Siren className="size-5 animate-pulse" /> Emergency & Safety Broadcast Dispatcher
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Send immediate high-priority emergency notifications to institutional users.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBroadcastSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Broadcast Title *</Label>
              <Input
                required
                placeholder="e.g. Severe Weather Campus Closure Notice"
                value={broadcastFormData.title}
                onChange={(e) => setBroadcastFormData({ ...broadcastFormData, title: e.target.value })}
                className="h-9 text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Audience</Label>
                <Select
                  value={broadcastFormData.audience}
                  onValueChange={(val) => setBroadcastFormData({ ...broadcastFormData, audience: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Users" className="text-xs">All Institutional Users (~5,800)</SelectItem>
                    <SelectItem value="Students" className="text-xs">Students Only (~5,200)</SelectItem>
                    <SelectItem value="Faculty" className="text-xs">Faculty & Staff (~600)</SelectItem>
                    <SelectItem value="Administrators" className="text-xs">Administrators & HODs (~50)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority Level</Label>
                <Select
                  value={broadcastFormData.priority}
                  onValueChange={(val) => setBroadcastFormData({ ...broadcastFormData, priority: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Emergency" className="text-xs text-rose-600 font-bold">Emergency (Red Alert)</SelectItem>
                    <SelectItem value="High" className="text-xs text-amber-600 font-semibold">High Priority</SelectItem>
                    <SelectItem value="Standard" className="text-xs">Standard Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Broadcast Message Content *</Label>
              <textarea
                required
                rows={4}
                placeholder="Type the detailed emergency broadcast text here..."
                value={broadcastFormData.message}
                onChange={(e) => setBroadcastFormData({ ...broadcastFormData, message: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs flex justify-between items-center font-mono">
              <span className="font-sans text-muted-foreground">Estimated Recipients:</span>
              <span className="font-bold text-rose-600">
                {broadcastFormData.audience === "All Users" ? "5,869 Accounts" : broadcastFormData.audience === "Students" ? "5,246 Students" : "623 Faculty & Staff"}
              </span>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBroadcastModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={broadcastLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-2"
              >
                <Siren className={`size-4 ${broadcastLoading ? "animate-spin" : ""}`} />
                {broadcastLoading ? "Dispatching Broadcast..." : "Dispatch Broadcast Now"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 7: ANOMALY MITIGATION MODAL */}
      <Dialog open={isMitigateModalOpen} onOpenChange={setIsMitigateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-amber-600">
              <AlertTriangle className="size-5" /> Mitigate Security Anomaly ({selectedAnomaly?.id})
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select and apply automated mitigation rules to resolve security surge alerts.
            </DialogDescription>
          </DialogHeader>

          {selectedAnomaly && (
            <div className="space-y-4 pt-1 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                <div className="font-bold text-foreground">{selectedAnomaly.title}</div>
                <p className="text-muted-foreground">{selectedAnomaly.description}</p>
                <div className="text-[0.68rem] text-primary font-mono pt-1">
                  Target IP / Node: {selectedAnomaly.details.ip} ({selectedAnomaly.details.gatewayNode || selectedAnomaly.source})
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Select Mitigation Action</Label>
                <div className="space-y-2">
                  <Button
                    onClick={() => handleMitigateSubmit("Rate Limiting & Traffic Throttling")}
                    disabled={mitigateLoading}
                    className="w-full justify-start text-xs bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-500/30 h-9"
                  >
                    1. Apply Rate Limiting & Throttling
                  </Button>
                  <Button
                    onClick={() => handleMitigateSubmit("IP Quarantine & Firewall Block")}
                    disabled={mitigateLoading}
                    className="w-full justify-start text-xs bg-red-500/10 text-red-700 hover:bg-red-500/20 border border-red-500/30 h-9"
                  >
                    2. Quarantine IP & Block Traffic
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-border">
                <Button variant="outline" onClick={() => setIsMitigateModalOpen(false)} className="w-full text-xs">
                  Cancel
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG 8: ANOMALY DETAILS MODAL */}
      <Dialog open={isAnomalyDetailsOpen} onOpenChange={setIsAnomalyDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Shield className="size-5 text-primary" /> Security Anomaly Telemetry & Logs
            </DialogTitle>
          </DialogHeader>

          {selectedAnomaly && (
            <div className="space-y-3 pt-1 text-xs">
              <div className="p-3.5 rounded-xl bg-card border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs">{selectedAnomaly.id}</Badge>
                  <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">
                    {selectedAnomaly.severity}
                  </Badge>
                </div>
                <h3 className="font-bold text-sm text-foreground">{selectedAnomaly.title}</h3>
                <p className="text-muted-foreground">{selectedAnomaly.description}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60 font-mono">
                  <span className="text-muted-foreground font-sans">Source IP:</span>
                  <span className="text-foreground font-bold">{selectedAnomaly.details.ip}</span>
                </div>

                {selectedAnomaly.details.attempts && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60 font-mono">
                    <span className="text-muted-foreground font-sans">Failed Password Attempts:</span>
                    <span className="text-red-500 font-bold">{selectedAnomaly.details.attempts}</span>
                  </div>
                )}

                {selectedAnomaly.details.affectedAccount && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60 font-mono">
                    <span className="text-muted-foreground font-sans">Targeted Account:</span>
                    <span className="text-primary font-bold">{selectedAnomaly.details.affectedAccount}</span>
                  </div>
                )}

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60 font-mono">
                  <span className="text-muted-foreground font-sans">Timestamp:</span>
                  <span className="text-foreground">{new Date(selectedAnomaly.timestamp).toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60 font-mono">
                  <span className="text-muted-foreground font-sans">Alert Status:</span>
                  <Badge variant="outline" className="font-mono text-xs text-emerald-600">
                    {selectedAnomaly.status}
                  </Badge>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-border">
                <Button variant="outline" onClick={() => setIsAnomalyDetailsOpen(false)} className="w-full text-xs">
                  Close Telemetry
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG 9: ADD / EDIT OPERATIONAL DELEGATION RULE MODAL */}
      <Dialog
        open={isAddDelegationOpen || isEditDelegationOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDelegationOpen(false);
            setIsEditDelegationOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserCog className="size-5 text-primary" />
              {isEditDelegationOpen ? "Edit Operational Delegation Rule" : "Create Operational Delegation Rule"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure domain delegation rules and authority scopes.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={isEditDelegationOpen ? handleEditDelegationSubmit : handleAddDelegationSubmit}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Module / Operational Domain *</Label>
              <Input
                required
                placeholder="e.g. Examination & Grading Governance"
                value={delegationFormData.moduleName || ""}
                onChange={(e) => setDelegationFormData({ ...delegationFormData, moduleName: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Delegated Role *</Label>
                <Select
                  value={delegationFormData.delegatedRole || "HOD"}
                  onValueChange={(val: any) => setDelegationFormData({ ...delegationFormData, delegatedRole: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Principal" className="text-xs">Principal</SelectItem>
                    <SelectItem value="Dean" className="text-xs">Dean</SelectItem>
                    <SelectItem value="HOD" className="text-xs">HOD</SelectItem>
                    <SelectItem value="Faculty" className="text-xs">Faculty</SelectItem>
                    <SelectItem value="Finance Manager" className="text-xs">Finance Manager</SelectItem>
                    <SelectItem value="HR Manager" className="text-xs">HR Manager</SelectItem>
                    <SelectItem value="Exam Controller" className="text-xs">Exam Controller</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assigned Person *</Label>
                <Input
                  required
                  placeholder="e.g. Dr. S. K. Gupta"
                  value={delegationFormData.assignedPerson || ""}
                  onChange={(e) => setDelegationFormData({ ...delegationFormData, assignedPerson: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Delegated Scope & Authority *</Label>
              <textarea
                required
                rows={3}
                placeholder="Describe the scope, permissions, and limitations..."
                value={delegationFormData.scope || ""}
                onChange={(e) => setDelegationFormData({ ...delegationFormData, scope: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDelegationOpen(false);
                  setIsEditDelegationOpen(false);
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground text-xs font-semibold">
                {isEditDelegationOpen ? "Save Delegation Rule" : "Create Delegation Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

