import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useRole } from "@/context/role-context";
import api from "@/lib/api";
import { toast } from "sonner";
import { User, Lock, ShieldCheck, KeyRound, Building, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/anits/profile")({
  head: () => ({
    meta: [{ title: "User Profile & Security — ANITS" }],
  }),
  component: AnitsProfilePage,
});

function AnitsProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    api.get("/api/auth/profile").then((res) => {
      if (res.data) setProfile(res.data);
    });
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Please enter current and new password.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setIsUpdating(true);
    const toastId = toast.loading("Updating password in PostgreSQL...");

    try {
      const res = await api.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });

      if (res.status === 200) {
        toast.dismiss(toastId);
        toast.success("Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.error || "Failed to update password.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-xs">
        <h2 className="text-xl font-bold text-foreground">User Profile &amp; Security Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          ANITS authenticated user identity details and account password credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="rounded-2xl border-border/60 shadow-xs">
          <CardHeader className="p-5 border-b border-border/40 bg-muted/15">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="size-4 text-primary" /> Identity Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div>
              <span className="text-muted-foreground font-semibold">Full Name</span>
              <p className="text-foreground font-bold text-sm mt-0.5">{profile?.name || "ANITS Member"}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold">Email Address</span>
              <p className="text-foreground font-semibold mt-0.5 flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground" /> {profile?.email || "N/A"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground font-semibold">Roll / ID Number</span>
                <p className="text-foreground font-mono font-bold mt-0.5">{profile?.rollNumber || "N/A"}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">Department</span>
                <p className="text-foreground font-bold mt-0.5">{profile?.department || "General"}</p>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold">Authorized Role</span>
              <div className="mt-1">
                <Badge variant="secondary" className="text-xs font-bold uppercase tracking-wider py-0.5 px-2">
                  {profile?.role || "STUDENT"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="rounded-2xl border-border/60 shadow-xs">
          <CardHeader className="p-5 border-b border-border/40 bg-muted/15">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <KeyRound className="size-4 text-primary" /> Update Password
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Current Password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isUpdating}
                className="w-full h-9 rounded-xl text-xs font-bold uppercase tracking-wider mt-2"
              >
                {isUpdating ? "Updating..." : "Save Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
