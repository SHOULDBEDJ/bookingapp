import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, X } from "lucide-react";
import { toast } from "sonner";

export function PhotoLightbox({ url, open, onClose }: { url: string | null; open: boolean; onClose: () => void }) {
  if (!url) return null;
  const filename = url.split("/").pop() || "photo.jpg";

  const download = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      toast.success("Saved to device");
    } catch { toast.error("Could not download"); }
  };

  const share = async () => {
    try {
      if ((navigator as any).share) {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: blob.type });
        if ((navigator as any).canShare?.({ files: [file] })) {
          await (navigator as any).share({ files: [file] });
        } else {
          await (navigator as any).share({ url });
        }
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl bg-black/95 border-0 p-0 [&>button]:hidden">
        <div className="relative">
          <img src={url} alt="" className="w-full max-h-[85vh] object-contain" />
          <div className="absolute top-2 right-2 flex gap-2">
            <Button size="icon" variant="secondary" onClick={download}><Download className="w-4 h-4" /></Button>
            <Button size="icon" variant="secondary" onClick={share}><Share2 className="w-4 h-4" /></Button>
            <Button size="icon" variant="secondary" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
