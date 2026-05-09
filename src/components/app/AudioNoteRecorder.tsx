import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Trash2, Plus } from "lucide-react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";

export type DraftAudio = { id: string; blob: Blob | null; transcript: string };

export function AudioNoteRecorder({ items, setItems }: { items: DraftAudio[]; setItems: (v: DraftAudio[]) => void }) {
  const rec = useAudioRecorder();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    if (rec.blob && activeIdx !== null) {
      const next = items.slice();
      next[activeIdx] = { ...next[activeIdx], blob: rec.blob };
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
        <span className="text-sm font-medium">Voice Notes</span>
        <Button type="button" size="sm" variant="outline" onClick={addNew}><Plus className="w-4 h-4 mr-1" />Add note</Button>
      </div>
      {items.map((it, idx) => (
        <div key={it.id} className="rounded-lg border border-border p-3 bg-gradient-soft">
          <div className="flex items-center gap-2">
            {activeIdx === idx && rec.recording ? (
              <Button type="button" size="sm" variant="destructive" onClick={stop}><Square className="w-4 h-4 mr-1" />Stop</Button>
            ) : (
              <Button type="button" size="sm" onClick={() => startFor(idx)} className="bg-gradient-primary text-primary-foreground shadow-soft"><Mic className="w-4 h-4 mr-1" />Record</Button>
            )}
            {it.blob && <audio controls src={URL.createObjectURL(it.blob)} className="h-8 flex-1 min-w-0" />}
            <Button type="button" size="sm" variant="ghost" onClick={() => remove(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-muted-foreground">No voice notes yet.</p>}
    </div>
  );
}
