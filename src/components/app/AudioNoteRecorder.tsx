import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Trash2, Plus, Volume2, Clock } from "lucide-react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { publicUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { fmtDateTime } from "@/lib/format";

export type DraftAudio = { 
  id: string; 
  blob: Blob | null; 
  transcript: string; 
  storage_path?: string;
  recorded_at?: string;
};

interface AudioNoteRecorderProps {
  items: DraftAudio[];
  setItems: (v: DraftAudio[]) => void;
  existingItems?: DraftAudio[];
  onRemoveExisting?: (id: string) => void;
}

export function AudioNoteRecorder({ items, setItems, existingItems = [], onRemoveExisting }: AudioNoteRecorderProps) {
  const rec = useAudioRecorder();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    if (rec.blob && activeIdx !== null) {
      const next = items.slice();
      next[activeIdx] = { 
        ...next[activeIdx], 
        blob: rec.blob,
        recorded_at: new Date().toISOString()
      };
      setItems(next);
      rec.reset();
      setActiveIdx(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.blob]);

  const addNew = () => setItems([...items, { id: crypto.randomUUID(), blob: null, transcript: "" }]);
  const startFor = async (idx: number) => { setActiveIdx(idx); await rec.start(); };
  const stop = () => rec.stop();
  const remove = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold uppercase tracking-tight text-muted-foreground">Voice Notes</span>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addNew} className="h-8 border-primary/20 hover:bg-primary/5 shadow-soft">
          <Plus className="w-4 h-4 mr-1" />Add note
        </Button>
      </div>

      <div className="space-y-2">
        {/* Existing Items */}
        {existingItems.map((it) => (
          <div key={it.id} className="rounded-xl border border-primary/20 p-3 bg-primary/5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded-full uppercase">Saved Note</span>
                {it.recorded_at && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {fmtDateTime(it.recorded_at)}
                  </span>
                )}
              </div>
              {onRemoveExisting && (
                <Button type="button" size="sm" variant="ghost" onClick={() => onRemoveExisting(it.id)} className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
            {it.storage_path && (
              <audio controls src={publicUrl("audio", it.storage_path)} className="w-full h-8" />
            )}
            {it.transcript && <p className="mt-2 text-xs text-muted-foreground italic">"{it.transcript}"</p>}
          </div>
        ))}

        {/* New Items */}
        {items.map((it, idx) => (
          <div key={it.id} className="rounded-xl border border-border p-3 bg-gradient-card shadow-sm transition-all hover:border-primary/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-600 px-1.5 py-0.5 bg-emerald-50 rounded-full uppercase">New Note</span>
                {it.recorded_at && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {fmtDateTime(it.recorded_at)}
                  </span>
                )}
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => remove(idx)} className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {activeIdx === idx && rec.recording ? (
                <Button type="button" size="sm" variant="destructive" onClick={stop} className="animate-pulse shadow-brand">
                  <Square className="w-4 h-4 mr-1" />Stop
                </Button>
              ) : (
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => startFor(idx)} 
                  className={cn("bg-gradient-primary text-primary-foreground shadow-soft transition-all", it.blob && "bg-muted text-muted-foreground")}
                >
                  <Mic className="w-4 h-4 mr-1" />{it.blob ? "Re-record" : "Record"}
                </Button>
              )}
              {it.blob && <audio controls src={URL.createObjectURL(it.blob)} className="h-8 flex-1 min-w-0" />}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && existingItems.length === 0 && (
        <div className="text-center py-6 border border-dashed border-border rounded-xl bg-muted/20">
          <p className="text-xs text-muted-foreground">No voice notes recorded</p>
        </div>
      )}
    </div>
  );
}
