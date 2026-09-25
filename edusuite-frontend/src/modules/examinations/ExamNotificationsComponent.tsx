import React, { useState } from "react";
import {
  Bell,
  Mail,
  Smartphone,
  Send,
  History,
  CheckCircle2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import api from "@/lib/api";

export function ExamNotificationsComponent() {
  const [isSending, setIsSending] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [form, setForm] = useState({
    audience: "all_students",
    channels: { email: true, sms: false, inApp: true },
    subject: "",
    message: "",
  });

  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await api.get("/api/notifications");
      const list = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
      // Filter notifications that are broadcasts or announcements
      const broadcasts = list.filter((n: any) => 
        n.type === "EXAM_BROADCAST" || n.type === "EXAM_ANNOUNCEMENT" || n.metadata?.broadcastBy
      );
      setHistoryList(broadcasts.length > 0 ? broadcasts : list.slice(0, 10));
    } catch (err) {
      console.error("Failed to load broadcast history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  React.useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.channels.email && !form.channels.sms && !form.channels.inApp) {
      return toast.error("Please select at least one communication channel.");
    }
    
    setIsSending(true);
    try {
      const res = await api.post("/api/notifications/broadcast", {
        audience: form.audience,
        subject: form.subject,
        message: form.message,
      });
      toast.success(res.data?.message || "Broadcast successfully dispatched to the selected audience.");
      setForm({ ...form, subject: "", message: "" });
      fetchHistory();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to dispatch broadcast.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 shrink-0">
            <Bell className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
                Broadcast & Notifications
              </h1>
              <Badge variant="outline" className="font-mono text-xs text-cyan-600 border-cyan-500/30">
                Communication
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Dispatch critical exam updates via Email, SMS, and In-App alerts.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList className="bg-card border border-border h-11 p-1">
          <TabsTrigger value="compose" className="text-xs font-semibold px-6">Compose Message</TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-semibold px-6">Broadcast History</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-0">
          <form onSubmit={handleSend} className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Target Audience</Label>
                <Select value={form.audience} onValueChange={(v) => setForm({...form, audience: v})}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_students">All Students</SelectItem>
                    <SelectItem value="all_faculty">All Faculty & Invigilators</SelectItem>
                    <SelectItem value="dept_cse">CSE Department Students</SelectItem>
                    <SelectItem value="sem_6">Semester 6 Students</SelectItem>
                    <SelectItem value="defaulters">Fee Defaulters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Communication Channels</Label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${form.channels.email ? "bg-blue-500/10 border-blue-500/30 text-blue-700" : "bg-card border-border hover:bg-muted/50"}`}>
                    <input type="checkbox" className="sr-only" checked={form.channels.email} onChange={(e) => setForm({...form, channels: {...form.channels, email: e.target.checked}})} />
                    <Mail className="size-4" /> <span className="text-xs font-semibold">Email</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${form.channels.sms ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700" : "bg-card border-border hover:bg-muted/50"}`}>
                    <input type="checkbox" className="sr-only" checked={form.channels.sms} onChange={(e) => setForm({...form, channels: {...form.channels, sms: e.target.checked}})} />
                    <Smartphone className="size-4" /> <span className="text-xs font-semibold">SMS</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${form.channels.inApp ? "bg-purple-500/10 border-purple-500/30 text-purple-700" : "bg-card border-border hover:bg-muted/50"}`}>
                    <input type="checkbox" className="sr-only" checked={form.channels.inApp} onChange={(e) => setForm({...form, channels: {...form.channels, inApp: e.target.checked}})} />
                    <Bell className="size-4" /> <span className="text-xs font-semibold">In-App</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Subject / Title</Label>
              <Input required placeholder="e.g. Important: End Semester Examination Guidelines" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} className="h-9 text-sm" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Message Content</Label>
              <Textarea required placeholder="Type your broadcast message here..." value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} className="min-h-[150px] text-sm resize-none" />
              <p className="text-[0.65rem] text-muted-foreground flex items-center gap-1">
                <Users className="size-3" /> Note: This message will be sent to approx. 450 recipients.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSending} className="h-10 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold gap-2 px-6 shadow-glow">
                <Send className={`size-4 ${isSending ? "animate-pulse" : ""}`} /> 
                {isSending ? "Dispatching..." : "Dispatch Broadcast"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <div className="rounded-2xl border border-border/80 bg-card p-0 shadow-sm overflow-hidden">
            {isLoadingHistory ? (
              <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                Loading broadcast history...
              </div>
            ) : historyList.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No broadcast messages dispatched yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[0.68rem]">
                  <tr>
                    <th className="py-3 px-4">Date Sent</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Audience</th>
                    <th className="py-3 px-4">Type / Channel</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {historyList.map((h) => (
                    <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground font-medium">
                        {new Date(h.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">{h.title}</td>
                      <td className="py-3 px-4 capitalize">
                        {h.metadata?.audience?.replace("_", " ") || h.role || "Institution"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                        {h.type}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 font-mono">
                          <CheckCircle2 className="size-3" /> Dispatched
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
