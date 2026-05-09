import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, X } from "lucide-react";

export function PhotoUploader({ files, setFiles }: { files: File[]; setFiles: (f: File[]) => void }) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => camRef.current?.click()}><Camera className="w-4 h-4 mr-2" />Camera</Button>
        <Button type="button" variant="outline" onClick={() => galRef.current?.click()}><ImageIcon className="w-4 h-4 mr-2" />Gallery</Button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFiles([...files, ...Array.from(e.target.files || [])])} />
        <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles([...files, ...Array.from(e.target.files || [])])} />
      </div>
      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
              <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
