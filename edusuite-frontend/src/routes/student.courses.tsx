import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  GraduationCap,
  BookOpen,
  Search,
  Download,
  FileText,
  CheckCircle2,
  Clock,
  Layers,
  Award,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import api from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/student/courses")({
  head: () => ({
    meta: [{ title: "Courses & Curriculum — EduSuite Pro" }],
  }),
  component: StudentCoursesPage,
});

interface Course {
  code: string;
  name: string;
  credits: number;
  type: "Core" | "Elective" | "Lab";
  faculty: string;
  progress: number;
  syllabusCount: number;
  schedule: string;
  description: string;
  units: { number: number; title: string; topics: string }[];
}

const MOCK_COURSES_DATA: Course[] = [
  {
    code: "CS401",
    name: "Advanced Distributed Systems",
    credits: 4,
    type: "Core",
    faculty: "Dr. Ramanathan K.",
    progress: 78,
    syllabusCount: 5,
    schedule: "Mon, Wed, Fri 09:00 AM",
    description: "Consensus algorithms (Raft, Paxos), vector clocks, distributed transactions, and fault tolerance in cloud-native systems.",
    units: [
      { number: 1, title: "Logical Clocks & Ordering", topics: "Lamport clocks, Vector clocks, Total order broadcast" },
      { number: 2, title: "Consensus Protocols", topics: "Paxos, Raft algorithm, Byzantine Fault Tolerance" },
      { number: 3, title: "Distributed Storage", topics: "Consistent Hashing, DynamoDB architecture, Replication" },
      { number: 4, title: "Distributed Transactions", topics: "Two-Phase Commit, Saga pattern, Isolation levels" },
    ],
  },
  {
    code: "CS402",
    name: "Deep Learning & Neural Networks",
    credits: 4,
    type: "Core",
    faculty: "Dr. Ananya Roy",
    progress: 85,
    syllabusCount: 5,
    schedule: "Tue, Thu 10:30 AM",
    description: "Backpropagation math, Convolutional Networks, Recurrent architectures, Transformers, and PyTorch optimization.",
    units: [
      { number: 1, title: "Neural Foundations", topics: "Perceptrons, Activation functions, Backprop calculus" },
      { number: 2, title: "Computer Vision & CNNs", topics: "Convolutions, ResNets, Object Detection, YOLO" },
      { number: 3, title: "Sequence Models", topics: "LSTMs, GRUs, Attention Mechanisms" },
      { number: 4, title: "Transformers & LLMs", topics: "Self-Attention, BERT, GPT, Fine-tuning with LoRA" },
    ],
  },
  {
    code: "CS403",
    name: "Compiler Design & Code Optimization",
    credits: 3,
    type: "Core",
    faculty: "Prof. S. Venkatesh",
    progress: 60,
    syllabusCount: 4,
    schedule: "Mon, Thu 02:00 PM",
    description: "Lexical analysis, LALR parsing, intermediate representation (LLVM IR), and register allocation.",
    units: [
      { number: 1, title: "Lexical & Syntax Analysis", topics: "Flex, Bison, Top-down & Bottom-up parsing" },
      { number: 2, title: "Semantic Analysis", topics: "Symbol tables, Type checking, Attribute grammars" },
      { number: 3, title: "Intermediate Representation", topics: "Three-address code, LLVM IR structure" },
    ],
  },
  {
    code: "CS404",
    name: "Cloud Native Microservices",
    credits: 3,
    type: "Elective",
    faculty: "Mr. Marcus Vance",
    progress: 90,
    syllabusCount: 4,
    schedule: "Fri 02:00 PM - 05:00 PM",
    description: "Containerization with Docker, Kubernetes cluster orchestration, Service Mesh (Istio), and Prometheus monitoring.",
    units: [
      { number: 1, title: "Docker & OCI Containers", topics: "Image building, Multi-stage builds, Container security" },
      { number: 2, title: "Kubernetes Orchestration", topics: "Deployments, Services, Ingress, Helm Charts" },
    ],
  },
];

function StudentCoursesPage() {
  const [activeTab, setActiveTab] = useState<"active" | "syllabus" | "regulations">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [coursesData, setCoursesData] = useState<any[]>([]);
  const [studentProfile, setStudentProfile] = useState<any>(null);

  const normalizeDept = (dept: string) => {
    if (dept === "AIML") return "AI&ML";
    if (dept === "AIDS") return "AI&DS";
    if (dept === "MECH") return "MECHANICAL";
    return dept;
  };

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const profileRes = await api.get("/api/auth/profile");
        if (profileRes.data) {
          setStudentProfile(profileRes.data);
          const deptVal = normalizeDept(profileRes.data.department || "CSE");
          const semVal = profileRes.data.semester || 4;

          const coursesRes = await api.get(`/api/exams/courses?department=${deptVal}&semester=${semVal}&status=Approved`);
          if (coursesRes.data && coursesRes.data.length > 0) {
            // Map backend courses list to the expected Course interface
            const mapped = coursesRes.data.map((c: any, index: number) => {
              const facultyName = Array.isArray(c.sections) && c.sections.length > 0
                ? c.sections.map((s: any) => `${s.section}: ${s.mentor_name}`).join(", ")
                : "Dr. Ravi Kumar";

              return {
                code: c.course_code,
                name: c.course_name,
                credits: c.credits,
                type: "Core",
                faculty: facultyName,
                progress: 60 + (index * 7) % 30, // Dynamic mock progress
                syllabusCount: 5,
                schedule: "Mon, Wed, Fri 09:00 AM",
                description: `Core subject offered this semester for B.Tech ${deptVal}.`,
                units: [
                  { number: 1, title: "Foundations & Core Principles", topics: "Introduction and fundamental algorithms" },
                  { number: 2, title: "System Architecture", topics: "Structural designs and configurations" },
                  { number: 3, title: "Operational Execution", topics: "Optimizations and processes" }
                ]
              };
            });
            setCoursesData(mapped);
          } else {
            // No approved subjects offered yet for this cohort
            setCoursesData([]);
          }
        }
      } catch (err) {
        console.error("Failed to load student courses dynamically", err);
        setCoursesData([]);
      }
    };
    fetchStudentData();
  }, []);

  const filteredCourses = coursesData.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.faculty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-md">
            <GraduationCap className="size-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Courses & Curriculum</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Semester {studentProfile?.semester || "IV"} • B.Tech {studentProfile?.department || "Computer Science & Engineering"}
            </p>
          </div>
        </div>

        {/* SEARCH BOX */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search courses or faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </div>
      </div>

      {/* KPI METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Semester Credits</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">24</span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Core Subjects</span>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">5</span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Electives</span>
          <span className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 block">2</span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Credits Earned</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">114 / 160</span>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {(["active", "syllabus", "regulations"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
              activeTab === tab
                ? "bg-[#091024] text-white shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
            }`}
          >
            {tab === "active" ? "Active Courses" : tab}
          </button>
        ))}
      </div>

      {/* TAB CONTENTS */}
      {activeTab === "active" && (
        filteredCourses.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px] shadow-2xs">
            <div className="size-12 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
              <BookOpen className="size-6 text-slate-400" />
            </div>
            <h3 className="font-display text-sm font-black text-slate-850 dark:text-slate-200">No Approved Offered Subjects</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed font-bold">
              There are no approved offered subjects for your branch & semester cohort yet. Please wait for the Exam Officer to verify and publish them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.code}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono font-bold text-indigo-600 text-[11px]">
                        {course.code}
                      </Badge>
                      <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-[10px]">
                        {course.type} • {course.credits} Credits
                      </Badge>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                      {course.name}
                    </h3>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      toast.success(`Downloading PDF Syllabus for ${course.code}...`);
                    }}
                    variant="outline"
                    className="h-8 rounded-xl text-xs border-slate-200 dark:border-slate-700"
                  >
                    <Download className="size-3.5 mr-1" /> Syllabus
                  </Button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {course.description}
                </p>

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Syllabus Completion</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Faculty: <strong className="text-slate-900 dark:text-white">{course.faculty}</strong></span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedCourse(course)}
                    className="h-7 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    View Details <ChevronRight className="size-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === "syllabus" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-base font-extrabold">Complete Academic Syllabus Repository</h2>
          <p className="text-xs text-slate-500">Download officially approved semester curriculum regulation docs.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {["CSE-R2023-Semester-4-Syllabus.pdf", "CSE-Core-Electives-Guide-2026.pdf"].map((file) => (
              <div key={file} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-indigo-600" />
                  <span className="text-xs font-bold">{file}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => toast.success(`Downloading ${file}...`)}
                  className="h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  <Download className="size-3.5 mr-1" /> Download
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "regulations" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <h2 className="text-base font-extrabold">Academic Credit Regulations R2023</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Students must complete 160 total credits across 8 semesters to qualify for B.Tech degree awarding. Minimum attendance criteria is 75% per subject.
          </p>
        </div>
      )}

      {/* COURSE DETAILS DIALOG */}
      <Dialog open={Boolean(selectedCourse)} onOpenChange={() => setSelectedCourse(null)}>
        {selectedCourse && (
          <DialogContent className="max-w-xl rounded-2xl p-6 bg-white dark:bg-slate-900">
            <DialogHeader className="border-b pb-3 border-slate-100 dark:border-slate-800">
              <DialogTitle className="text-base font-bold flex items-center justify-between">
                <span>{selectedCourse.code} — {selectedCourse.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Faculty: {selectedCourse.faculty} • {selectedCourse.credits} Credits ({selectedCourse.type})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-3 text-xs">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-1">Course Description</h4>
                <p className="text-slate-600 dark:text-slate-300">{selectedCourse.description}</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-2">Unit Breakdown</h4>
                <div className="space-y-2">
                  {selectedCourse.units.map((u) => (
                    <div key={u.number} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 block text-[11px]">Unit {u.number}: {u.title}</span>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">{u.topics}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
