import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Mail, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

export const Route = createFileRoute("/anits/forgot-password")({
  head: () => ({
    meta: [{ title: "Forgot Password — ANITS Portal" }],
  }),
  component: AnitsForgotPasswordPage,
});

function AnitsForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Processing password recovery request...");

    try {
      await api.post("/api/auth/forgot-password", {
        email: identifier.trim(),
        username: identifier.trim(),
      });

      toast.dismiss(toastId);
      setIsSent(true);
      toast.success("Password reset instructions dispatched.");
    } catch (err: any) {
      toast.dismiss(toastId);
      // Safe non-revealing response
      setIsSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
      <div className="w-full max-w-md space-y-6 bg-card border border-border/60 p-8 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-sm">
            ANITS
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-foreground">
              Anil Neerukonda Institute of Technology and Sciences
            </h3>
            <p className="text-[11px] text-muted-foreground font-medium">Password Recovery</p>
          </div>
        </div>

        {isSent ? (
          <div className="space-y-4 text-center py-4">
            <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-6" />
            </div>
            <h4 className="font-bold text-base text-foreground">Instructions Sent</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If an authorized ANITS account is associated with{" "}
              <span className="font-semibold text-foreground">{identifier}</span>, password reset instructions have been dispatched to the registered email address.
            </p>
            <Button asChild className="w-full h-10 rounded-xl text-xs font-semibold mt-2">
              <Link to="/anits/login">Return to ANITS Login</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Reset your password
              </h2>
              <p className="text-xs text-muted-foreground">
                Enter your registered ANITS email address or faculty/student roll number.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="recovery-id" className="text-xs font-bold">
                  Email or ID Number
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="recovery-id"
                    type="text"
                    placeholder="e.g. 22CS101 or faculty@anits.edu.in"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={isSubmitting}
                    className="pl-9 h-11 text-xs rounded-xl"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                {isSubmitting ? "Sending Instructions..." : "Send Reset Link"}
              </Button>
            </form>

            <div className="text-center pt-2">
              <Link
                to="/anits/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> Back to ANITS Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
