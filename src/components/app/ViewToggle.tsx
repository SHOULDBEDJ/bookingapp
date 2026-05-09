import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";

export function ViewToggle({ value, onChange }: { value: "table" | "grid"; onChange: (v: "table" | "grid") => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-1">
      <Button size="sm" variant={value === "table" ? "default" : "ghost"} onClick={() => onChange("table")} className={value === "table" ? "bg-gradient-primary text-primary-foreground" : ""}>
        <List className="w-4 h-4" />
      </Button>
      <Button size="sm" variant={value === "grid" ? "default" : "ghost"} onClick={() => onChange("grid")} className={value === "grid" ? "bg-gradient-primary text-primary-foreground" : ""}>
        <LayoutGrid className="w-4 h-4" />
      </Button>
    </div>
  );
}
