import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Loader2, Calendar, Clock, BookOpen } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface PlanToComplete {
  id: string;
  courseCode: string;
  courseName: string;
  unitNumber: number;
  unitTitle: string;
  topic: string;
  section: string;
  plannedDate?: string;
  durationMinutes: number;
  plannedActivities?: string[];
}

interface MarkCompleteModalProps {
  plan: PlanToComplete | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MarkCompleteModal({ plan, open, onOpenChange, onSuccess }: MarkCompleteModalProps) {
  const [actualDate, setActualDate] = useState<string>("");
  const [actualDuration, setActualDuration] = useState<number>(60);
  const [topicsCovered, setTopicsCovered] = useState<string>("");
  const [teachingNotes, setTeachingNotes] = useState<string>("");
  const [actualActivities, setActualActivities] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (plan && open) {
      setActualDate(new Date().toISOString().split("T")[0]);
      setActualDuration(plan.durationMinutes || 60);
      setTopicsCovered(plan.topic);
      setTeachingNotes("Covered planned syllabus points with whiteboard derivations and student Q&A.");
      setActualActivities("Interactive presentation and step-by-step problem walkthrough");
    }
  }, [plan, open]);

  if (!plan) return null;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const res = await api.post(`/api/faculty/lesson-plans/${plan.id}/complete`, {
        actualDate,
        actualDuration: Number(actualDuration),
        topicsCovered: topicsCovered.trim() || plan.topic,
        teachingNotes: teachingNotes.trim() || undefined,
        actualActivities: actualActivities.trim() ? [actualActivities.trim()] : undefined,
      });

      if (res.status === 200 && res.data?.success) {
        toast.success(res.data.message || `Marked "${plan.topic}" as completed!`);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error("Failed to complete lesson", {
          description: res.data?.error || "Server error.",
        });
      }
    } catch (err: any) {
      toast.error("Network error while completing lesson");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6 text-xs">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
            <CheckCircle className="size-4" />
            <span>Academic Completion Verification</span>
          </div>
          <DialogTitle className="text-base font-extrabold">Mark Lesson as Completed</DialogTitle>
          <DialogDescription className="text-xs">
            Record actual teaching evidence, topics covered, and syllabus completion notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-3">
          {/* Plan context pill */}
          <div className="bg-muted/40 p-3 rounded-2xl border space-y-1">
            <div className="flex justify-between items-center font-bold text-[0.68rem] text-muted-foreground">
              <span>{plan.courseCode} &middot; Sec {plan.section}</span>
              <span>Unit {plan.unitNumber}</span>
            </div>
            <p className="font-extrabold text-foreground text-xs">{plan.topic}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Actual Date Conducted *</Label>
              <Input
                type="date"
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Actual Duration (Mins) *</Label>
              <Input
                type="number"
                value={actualDuration}
                onChange={(e) => setActualDuration(Number(e.target.value))}
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Topics Actually Covered *</Label>
            <Input
              value={topicsCovered}
              onChange={(e) => setTopicsCovered(e.target.value)}
              placeholder="e.g. Relational algebra operators and natural join examples"
              className="rounded-xl h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Teaching Activities Completed</Label>
            <Input
              value={actualActivities}
              onChange={(e) => setActualActivities(e.target.value)}
              placeholder="e.g. Whiteboard derivation and live query demonstration"
              className="rounded-xl h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Teaching Notes & Observations</Label>
            <Textarea
              value={teachingNotes}
              onChange={(e) => setTeachingNotes(e.target.value)}
              placeholder="e.g. Students understood the concepts well; will review problem #4 in tutorial."
              className="rounded-xl min-h-[60px] text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-xl text-xs h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 shadow-sm"
          >
            {isSubmitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <CheckCircle className="size-3.5 mr-1.5" />}
            Confirm Completion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
