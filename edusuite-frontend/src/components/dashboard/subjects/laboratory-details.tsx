import { Shield, MapPin, Cpu, BookOpen, Download } from "lucide-react";
import { Panel } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { LabDetail } from "@/data/faculty-mock-data";

interface LaboratoryDetailsProps {
  labDetails: LabDetail;
}

export function LaboratoryDetails({ labDetails }: LaboratoryDetailsProps) {
  if (!labDetails) return null;

  const handleDownloadManual = () => {
    toast.success(`Downloading Laboratory Manual: ${labDetails.manualLink || "Lab_Manual.pdf"}`, {
      description: "Experiment setup guides included.",
    });
  };

  const labVenue = labDetails.labNumber || "Lab-2 (Computing Center)";
  const equipmentCount = labDetails.equipmentCount || 60;

  return (
    <Panel
      title="Laboratory Setup Details"
      description="Venue logs, active equipment lists, and experiment guides"
      className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
    >
      <div className="space-y-4">
        {/* Core lab grid info */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/40 text-center font-medium">
          <div>
            <p className="text-[0.6rem] uppercase font-extrabold tracking-wider text-muted-foreground">Lab Venue</p>
            <p className="text-sm font-extrabold mt-1 text-foreground flex items-center justify-center gap-1">
              <MapPin className="size-3.5 text-primary" /> {labVenue}
            </p>
          </div>
          <div>
            <p className="text-[0.6rem] uppercase font-extrabold tracking-wider text-muted-foreground">Equipment Strength</p>
            <p className="text-sm font-extrabold mt-1 text-foreground flex items-center justify-center gap-1">
              <Cpu className="size-3.5 text-primary" /> {equipmentCount} Systems
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl border bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Shield className="size-4.5" />
            </span>
            <div>
              <h6 className="font-bold">{labDetails.labName} Experiment Manual</h6>
              <p className="text-[0.6rem] text-muted-foreground mt-0.5">{labDetails.weeklyLabHours} Hrs/Week Practice load</p>
            </div>
          </div>
          <Button
            onClick={handleDownloadManual}
            variant="outline"
            className="rounded-xl cursor-pointer hover:bg-muted text-xs h-9 px-3 shrink-0 flex items-center gap-1"
          >
            <Download className="size-3.5" /> PDF
          </Button>
        </div>
      </div>
    </Panel>
  );
}
