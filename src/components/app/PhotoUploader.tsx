import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { publicUrl } from "@/lib/storage";

interface PhotoUploaderProps {
  files: File[];
  setFiles: (f: File[]) => void;
  existingFiles?: string[];
  onRemoveExisting?: (path: string) => void;
  bucket?: string;
}

export function PhotoUploader({ files, setFiles, existingFiles = [], onRemoveExisting, bucket = "bills" }: PhotoUploaderProps) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => camRef.current?.click()} className="shadow-soft hover:bg-primary/5 border-border">
          <Camera className="w-4 h-4 mr-2" />Camera
        </Button>
        <Button type="button" variant="outline" onClick={() => galRef.current?.click()} className="shadow-soft hover:bg-primary/5 border-border">
          <ImageIcon className="w-4 h-4 mr-2" />Gallery
        </Button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFiles([...files, ...Array.from(e.target.files || [])])} />
        <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles([...files, ...Array.from(e.target.files || [])])} />
      </div>
      
      {(files.length > 0 || existingFiles.length > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
          {/* Existing Files */}
          {existingFiles.map((path, i) => (
            <div key={`existing-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-primary/20 group shadow-sm">
              <img src={path.startsWith('http') ? path : publicUrl(bucket, path)} alt="" className="w-full h-full object-cover" />
              {onRemoveExisting && (
                <button 
                  type="button" 
                  onClick={() => onRemoveExisting(path)} 
                  className="absolute top-1 right-1 bg-destructive/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-lg backdrop-blur-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-[8px] text-white py-0.5 text-center">Saved</div>
            </div>
          ))}

          {/* New Files */}
          {files.map((f, i) => (
            <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-border group shadow-sm">
              <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
              <button 
                type="button" 
                onClick={() => setFiles(files.filter((_, j) => j !== i))} 
                className="absolute top-1 right-1 bg-destructive/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-lg backdrop-blur-sm"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-emerald-500/80 text-[8px] text-white py-0.5 text-center">New</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
