import { BookOpen, Download, Youtube } from "lucide-react";
import { Panel } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { BookReference } from "@/data/faculty-mock-data";

interface ReferenceBooksProps {
  books?: BookReference[];
}

export function ReferenceBooks({ books = [] }: ReferenceBooksProps) {
  const handleDownload = (title: string) => {
    toast.success(`Downloading resources for: ${title}`, {
      description: "Secure copy download initiated.",
    });
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case "Textbook":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "NPTEL":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default:
        return "bg-violet-500/10 text-violet-600 border-violet-500/20";
    }
  };

  if (!books || books.length === 0) {
    return (
      <Panel
        title="Books & Reference Materials"
        description="Official syllabus references, NPTEL modules, and video links"
        className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
      >
        <p className="text-muted-foreground text-xs italic py-2">No reference books registered.</p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Books & Reference Materials"
      description="Official syllabus references, NPTEL modules, and video links"
      className="border border-border bg-card rounded-2xl p-5 shadow-card text-xs"
    >
      <div className="space-y-3.5">
        {books.map((book, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3.5 p-3.5 rounded-2xl border bg-muted/20 hover:bg-muted/40 transition-colors"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              {book.type === "NPTEL" ? <Youtube className="size-5" /> : <BookOpen className="size-5" />}
            </span>
            
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex justify-between items-start gap-2">
                <h5 className="font-bold text-foreground leading-snug">{book.title}</h5>
                <Badge variant="outline" className={`py-0 px-2 rounded-xl text-[0.58rem] font-bold ${getBadgeStyle(book.type)}`}>
                  {book.type}
                </Badge>
              </div>
              <p className="text-[0.65rem] text-muted-foreground font-medium">
                {book.author} &middot; {book.edition}
              </p>
              
              <div className="pt-2">
                <Button
                  onClick={() => handleDownload(book.title)}
                  variant="link"
                  className="h-auto p-0 text-[0.65rem] font-extrabold text-primary flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="size-3.5" /> Download Materials
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
