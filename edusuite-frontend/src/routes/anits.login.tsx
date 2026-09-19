import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Calendar,
  ClipboardCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole } from "@/context/role-context";
import api from "@/lib/api";

export const Route = createFileRoute("/anits/login")({
  head: () => ({
    meta: [
      { title: "ANITS Attendance & Timetable Management — Login" },
      {
        name: "description",
        content: "Dedicated login for Anil Neerukonda Institute of Technology and Sciences (ANITS) Attendance & Timetable Management portal.",
      },
    ],
  }),
  component: AnitsLoginPage,
});

function AnitsLoginPage() {
  const { setRole, setDepartment } = useRole();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!identifier.trim() || !password) {
      setErrorMsg("Please enter your Username / ID and Password.");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);
    const toastId = toast.loading("Verifying ANITS credentials...");

    try {
      const response = await api.post("/api/anits/auth/login", {
        rollNumber: identifier.trim(),
        email: identifier.trim(),
        username: identifier.trim(),
        password,
      });

      if (response.status !== 200 || !response.data) {
        toast.dismiss(toastId);
        const err = response.data?.error || "Invalid username/ID or password.";
        setErrorMsg(err);
        toast.error(err);
        setIsSubmitting(false);
        return;
      }

      const { token, user } = response.data;

      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("cms_token", token);
      }
      if (user) {
        localStorage.setItem("cms_user", JSON.stringify(user));
        if (user.role) setRole(user.role);
        if (user.department) setDepartment(user.department as any);
      }

      toast.dismiss(toastId);
      toast.success(`Welcome to ANITS Portal, ${user.name || "User"}!`);

      navigate({ to: "/anits/dashboard" as any });
    } catch (err: any) {
      toast.dismiss(toastId);
      const errText =
        err?.response?.data?.error ||
        err?.message ||
        "Unable to connect to ANITS authentication server. Please try again.";
      setErrorMsg(errText);
      toast.error(errText);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-background">
      {/* LEFT: BRANDING HERO PANEL */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-12 bg-gradient-to-br from-[#0A1128] via-[#101F42] to-[#1E3A8A] text-white border-r border-border/20">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-lg">
              ANITS
            </div>
            <div>
              <p className="font-extrabold text-sm tracking-wider uppercase text-white/90">
                Anil Neerukonda Educational Society
              </p>
              <p className="text-xs text-white/60 font-medium">UGC Autonomous &middot; NAAC 'A+' Accredited</p>
            </div>
          </div>

          <div className="mt-20 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-primary-foreground backdrop-blur-sm border border-white/10 mb-6">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              Dedicated Production Portal
            </span>
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight text-white">
              Anil Neerukonda Institute of Technology and Sciences
            </h1>
            <h2 className="text-xl xl:text-2xl font-bold text-primary-foreground/90 mt-4">
              Attendance &amp; Timetable Management
            </h2>
            <p className="text-white/75 text-sm mt-4 leading-relaxed max-w-md">
              Authoritative, single-source-of-truth portal for Master Timetable scheduling, real-time faculty attendance marking, and verified student attendance tracking.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <Calendar className="size-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Master Timetable</h4>
                  <p className="text-[11px] text-white/65 mt-0.5">Automated conflict &amp; room clash detection</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <ClipboardCheck className="size-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Real-Time Attendance</h4>
                  <p className="text-[11px] text-white/65 mt-0.5">Instant synchronization from faculty to student</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-white/50 border-t border-white/10 pt-6">
          <span>Sangivalasa, Bheemunipatnam Mandal, Visakhapatnam - 531162</span>
          <span>AY 2026-27</span>
        </div>
      </div>

      {/* RIGHT: LOGIN FORM */}
      <div className="col-span-12 lg:col-span-6 xl:col-span-5 flex flex-col justify-center px-6 sm:px-12 md:px-16 py-12">
        <div className="mx-auto w-full max-w-md space-y-8">
          {/* Mobile Institution Header */}
          <div className="lg:hidden text-center space-y-2">
            <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-xl shadow-md">
              ANITS
            </div>
            <h2 className="text-xl font-extrabold text-foreground">
              Anil Neerukonda Institute of Technology and Sciences
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              Attendance &amp; Timetable Management
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              Portal Sign In
            </h2>
            <p className="text-xs text-muted-foreground">
              Enter your credentials to access your authorized timetable and attendance tools.
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* USERNAME / FACULTY ID / STUDENT ID */}
            <div className="space-y-1.5">
              <Label htmlFor="anits-id" className="text-xs font-bold text-foreground">
                Username / Faculty ID / Student ID
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="anits-id"
                  type="text"
                  placeholder="e.g. 22CS101, FAC-CSE-01, or email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={isSubmitting}
                  className="pl-9 h-11 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="anits-password" className="text-xs font-bold text-foreground">
                  Password
                </Label>
                <Link
                  to="/anits/forgot-password"
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="anits-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="pl-9 pr-9 h-11 text-xs rounded-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-lg font-semibold text-xs uppercase tracking-wider mt-2 shadow-xs bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer"
            >
              {isSubmitting ? (
                "Authenticating..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  LOGIN <ArrowRight className="size-4" />
                </span>
              )}
            </Button>
          </form>

          {/* SECURITY NOTE */}
          <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5 text-[11px] text-muted-foreground flex items-center gap-2.5">
            <ShieldCheck className="size-4 text-primary shrink-0" />
            <span>
              Role &amp; departmental scope are verified by the backend server. Multi-factor session tokens protect all academic transactions.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
