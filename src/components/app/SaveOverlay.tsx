import { Loader2 } from "lucide-react";

export function SaveOverlay({ open, label = "Saving..." }: { open: boolean; label?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-gradient-card rounded-2xl shadow-elevated px-10 py-8 flex flex-col items-center gap-4 border border-border">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center shadow-brand">
            <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
          </div>
        </div>
        <p className="font-semibold text-foreground">{label}</p>
      </div>
    </div>
  );
}
