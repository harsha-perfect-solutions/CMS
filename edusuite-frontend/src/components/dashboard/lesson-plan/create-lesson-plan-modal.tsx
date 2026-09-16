import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Calendar, Clock, BookOpen, Layers } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface AssignedCourseOption {
  courseId: string;
  code: string;
  name: string;
  department: string;
  semester: number;
  sections: string[];
}

interface TimetableOption {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  section: string;
  day: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  room: string;
  label: string;
}

interface CreateLessonPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignedCourses: AssignedCourseOption[];
  onSuccess: () => void;
  facultyName?: string;
  editingPlan?: any | null;
}

export function CreateLessonPlanModal({
  open,
  onOpenChange,
  assignedCourses,
  onSuccess,
  facultyName = "Dr. Ravi Kumar",
  editingPlan,
}: CreateLessonPlanModalProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [unitNumber, setUnitNumber] = useState<number>(1);
  const [unitTitle, setUnitTitle] = useState<string>("Unit 1: Foundations");
  const [topic, setTopic] = useState<string>("");
  const [subtopic, setSubtopic] = useState<string>("");
  const [plannedDate, setPlannedDate] = useState<string>("");
  const [plannedStartTime, setPlannedStartTime] = useState<string>("09:00 AM");
  const [plannedEndTime, setPlannedEndTime] = useState<string>("10:00 AM");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [teachingMode, setTeachingMode] = useState<string>("Theory");
  const [teachingMethod, setTeachingMethod] = useState<string>("Lecture");
  const [objectives, setObjectives] = useState<string[]>([""]);
  const [plannedActivities, setPlannedActivities] = useState<string>("");
  const [requiredResources, setRequiredResources] = useState<string>("");
  const [assessmentMethod, setAssessmentMethod] = useState<string>("Oral Q&A");
  const [homeworkAssignment, setHomeworkAssignment] = useState<string>("");
  const [timetableSessionId, setTimetableSessionId] = useState<string>("");
  const [status, setStatus] = useState<string>("PLANNED");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available timetable slots
  const [timetableSlots, setTimetableSlots] = useState<TimetableOption[]>([]);

  useEffect(() => {
    if (open) {
      if (editingPlan) {
        setSelectedCourseId(editingPlan.courseId || "");
        setSelectedSection(editingPlan.section || "");
        setUnitNumber(editingPlan.unitNumber || 1);
        setUnitTitle(editingPlan.unitTitle || `Unit ${editingPlan.unitNumber || 1}`);
        setTopic(editingPlan.topic || "");
        setSubtopic(editingPlan.subtopic || "");
        setPlannedDate(editingPlan.plannedDate ? editingPlan.plannedDate.split("T")[0] : "");
        setPlannedStartTime(editingPlan.plannedStartTime || "09:00 AM");
        setPlannedEndTime(editingPlan.plannedEndTime || "10:00 AM");
        setDurationMinutes(editingPlan.durationMinutes || 60);
        setTeachingMode(editingPlan.teachingMode || "Theory");
        setTeachingMethod(editingPlan.teachingMethod || "Lecture");
        setObjectives(
          Array.isArray(editingPlan.learningObjectives) && editingPlan.learningObjectives.length > 0
            ? editingPlan.learningObjectives
            : [""]
        );
        setPlannedActivities(
          Array.isArray(editingPlan.plannedActivities)
            ? editingPlan.plannedActivities.join(", ")
            : editingPlan.plannedActivities || ""
        );
        setRequiredResources(editingPlan.requiredResources || "");
        setAssessmentMethod(editingPlan.assessmentMethod || "Oral Q&A");
        setHomeworkAssignment(editingPlan.homeworkAssignment || "");
        setTimetableSessionId(editingPlan.timetableSessionId || "");
        setStatus(editingPlan.status || "PLANNED");
      } else {
        // Set default course and section if available
        if (assignedCourses.length > 0) {
          const defaultCourse = assignedCourses[0];
          setSelectedCourseId(defaultCourse.courseId);
          setSelectedSection(defaultCourse.sections[0] || "A");
        }
        setUnitNumber(1);
        setUnitTitle("Unit 1: Foundations");
        setTopic("");
        setSubtopic("");
        setPlannedDate("");
        setPlannedStartTime("09:00 AM");
        setPlannedEndTime("10:00 AM");
        setDurationMinutes(60);
        setTeachingMode("Theory");
        setTeachingMethod("Lecture");
        setObjectives([""]);
        setPlannedActivities("");
        setRequiredResources("");
        setAssessmentMethod("Oral Q&A");
        setHomeworkAssignment("");
        setTimetableSessionId("");
        setStatus("PLANNED");
      }

      // Load timetables for linking
      api.get("/api/faculty/lesson-plans/timetables").then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setTimetableSlots(res.data);
        }
      });
    }
  }, [open, assignedCourses, editingPlan]);

  const activeCourse = assignedCourses.find((c) => c.courseId === selectedCourseId);
  const availableSections = activeCourse?.sections || ["A"];

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const c = assignedCourses.find((item) => item.courseId === courseId);
    if (c && c.sections.length > 0) {
      setSelectedSection(c.sections[0]);
    }
    if (c?.name.toLowerCase().includes("lab")) {
      setTeachingMode("Lab");
      setTeachingMethod("Laboratory");
    } else {
      setTeachingMode("Theory");
      setTeachingMethod("Lecture");
    }
  };

  const handleAddObjective = () => {
    setObjectives((prev) => [...prev, ""]);
  };

  const handleObjectiveChange = (index: number, val: string) => {
    setObjectives((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveObjective = (index: number) => {
    setObjectives((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (submitStatus: string) => {
    if (!selectedCourseId || !selectedSection || !topic.trim()) {
      toast.error("Please fill in course, section, and topic.");
      return;
    }

    try {
      setIsSubmitting(true);
      const cleanObjectives = objectives.filter((o) => o.trim().length > 0);

      const payload = {
        courseId: selectedCourseId,
        section: selectedSection,
        unitNumber,
        unitTitle: unitTitle || `Unit ${unitNumber}`,
        topic: topic.trim(),
        subtopic: subtopic.trim() || undefined,
        plannedDate: plannedDate || undefined,
        plannedStartTime,
        plannedEndTime,
        durationMinutes,
        teachingMode,
        teachingMethod,
        learningObjectives: cleanObjectives.length > 0 ? cleanObjectives : undefined,
        plannedActivities: plannedActivities.trim() ? [plannedActivities.trim()] : undefined,
        requiredResources: requiredResources.trim() || undefined,
        assessmentMethod: assessmentMethod.trim() || undefined,
        homeworkAssignment: homeworkAssignment.trim() || undefined,
        timetableSessionId: timetableSessionId || undefined,
        status: submitStatus,
      };

      let res;
      if (editingPlan?.id) {
        res = await api.put(`/api/faculty/lesson-plans/${editingPlan.id}`, payload);
      } else {
        res = await api.post("/api/faculty/lesson-plans", payload);
      }

      if ((res.status === 200 || res.status === 201) && res.data?.success) {
        toast.success(res.data.message || (editingPlan ? "Lesson plan updated!" : "Lesson plan created!"));
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error("Failed to save lesson plan", {
          description: res.data?.error || "Server validation error.",
        });
      }
    } catch (err: any) {
      toast.error("Submission failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 text-xs">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2 text-primary font-bold text-xs">
            <BookOpen className="size-4" />
            <span>Academic Planning & Syllabus Map</span>
          </div>
          <DialogTitle className="text-lg font-extrabold">
            {editingPlan ? "Edit Lesson Plan" : "Create New Lesson Plan"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {editingPlan
              ? "Update lesson plan details, timetable link, and learning objectives."
              : "Plan an individual teaching session for your assigned subject and section in PostgreSQL."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Faculty Read-only Identity */}
          <div className="bg-muted/40 p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[0.65rem] uppercase font-bold text-muted-foreground">Instructor / Faculty</p>
              <p className="font-bold text-foreground text-xs">{facultyName}</p>
            </div>
            <div>
              <p className="text-[0.65rem] uppercase font-bold text-muted-foreground">Academic Year</p>
              <p className="font-bold text-foreground text-xs">2026-27 (Sem 5)</p>
            </div>
          </div>

          {/* Subject & Section Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Assigned Subject *</Label>
              <Select value={selectedCourseId} onValueChange={handleCourseChange}>
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {assignedCourses.map((c) => (
                    <SelectItem key={c.courseId} value={c.courseId}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Assigned Section *</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {availableSections.map((sec) => (
                    <SelectItem key={sec} value={sec}>
                      Section {sec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Unit Number & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Unit Number *</Label>
              <Select
                value={String(unitNumber)}
                onValueChange={(val) => {
                  const num = Number(val);
                  setUnitNumber(num);
                  setUnitTitle(`Unit ${num}: Syllabus Module`);
                }}
              >
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((u) => (
                    <SelectItem key={u} value={String(u)}>
                      Unit {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">Unit / Module Title</Label>
              <Input
                value={unitTitle}
                onChange={(e) => setUnitTitle(e.target.value)}
                placeholder="e.g. Unit 2: Relational Model & SQL"
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </div>

          {/* Topic & Subtopic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Planned Topic *</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Relational Algebra & Joins"
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Subtopic / Key Concept</Label>
              <Input
                value={subtopic}
                onChange={(e) => setSubtopic(e.target.value)}
                placeholder="e.g. Theta join, Natural join, Outer joins"
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </div>

          {/* Teaching Mode & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Teaching Mode</Label>
              <Select value={teachingMode} onValueChange={setTeachingMode}>
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Theory">Theory</SelectItem>
                  <SelectItem value="Lab">Laboratory / Practical</SelectItem>
                  <SelectItem value="Integrated">Integrated Theory + Lab</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Teaching Method</Label>
              <Select value={teachingMethod} onValueChange={setTeachingMethod}>
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lecture">Lecture & Interactive Slides</SelectItem>
                  <SelectItem value="Problem Solving">Problem Solving & Boardwork</SelectItem>
                  <SelectItem value="Demonstration">Demonstration / Coding Lab</SelectItem>
                  <SelectItem value="Discussion">Discussion & Seminar</SelectItem>
                  <SelectItem value="Case Study">Case Study Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Planned Date, Time Slot, Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Planned Date</Label>
              <Input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Start Time</Label>
              <Input
                value={plannedStartTime}
                onChange={(e) => setPlannedStartTime(e.target.value)}
                placeholder="09:00 AM"
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Duration (Minutes)</Label>
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </div>

          {/* Timetable Session Link */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Link to Master Timetable Session (Optional)</Label>
            <Select value={timetableSessionId} onValueChange={setTimetableSessionId}>
              <SelectTrigger className="rounded-xl h-9 text-xs">
                <SelectValue placeholder="Select timetable session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">-- None (Unlinked) --</SelectItem>
                {timetableSlots
                  .filter((t) => t.courseId === selectedCourseId)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Learning Objectives */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold">Learning Objectives</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddObjective}
                className="h-7 text-xs gap-1 text-primary hover:text-primary font-semibold"
              >
                <Plus className="size-3" /> Add Objective
              </Button>
            </div>
            {objectives.map((obj, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={obj}
                  onChange={(e) => handleObjectiveChange(idx, e.target.value)}
                  placeholder={`Objective ${idx + 1}: e.g. Formulate relational algebra query`}
                  className="rounded-xl h-8 text-xs flex-1"
                />
                {objectives.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveObjective(idx)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Resources & Assessment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Required Resources / Reference</Label>
              <Input
                value={requiredResources}
                onChange={(e) => setRequiredResources(e.target.value)}
                placeholder="e.g. Navathe Ch. 8, Lecture Slides Deck 3"
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Assessment Method</Label>
              <Input
                value={assessmentMethod}
                onChange={(e) => setAssessmentMethod(e.target.value)}
                placeholder="e.g. Formative quiz, Spot problem evaluation"
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex flex-col sm:flex-row gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-xl text-xs h-9"
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSubmit("DRAFT")}
            disabled={isSubmitting}
            className="rounded-xl text-xs h-9"
          >
            {isSubmitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSubmit("PLANNED")}
            disabled={isSubmitting}
            className="rounded-xl bg-brand-gradient text-xs h-9 shadow-glow"
          >
            {isSubmitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
            Publish Lesson Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
