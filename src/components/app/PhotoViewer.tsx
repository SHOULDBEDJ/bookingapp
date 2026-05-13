import { X, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PhotoViewerProps {
  url: string;
  open: boolean;
  onClose: () => void;
  title?: string;
}

export function PhotoViewer({ url, open, onClose, title }: PhotoViewerProps) {
  if (!open) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `bill-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Downloading photo...");
    } catch (err) {
      toast.error("Failed to download photo");
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], "bill.jpg", { type: blob.type });
        
        await navigator.share({
          files: [file],
          title: title || "Expense Bill",
        });
      } else {
        // Fallback: Copy link
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard (Share not supported)");
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error("Failed to share photo");
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Header */}
      <div 
        className="w-full p-4 flex items-center justify-between bg-black/40 text-white z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col overflow-hidden">
          <span className="font-bold text-lg truncate">{title || "Photo Viewer"}</span>
        </div>
        <button 
          type="button" 
          onClick={(e) => { e.stopPropagation(); onClose(); }} 
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Image Area */}
      <div className="flex-1 w-full flex items-center justify-center p-4 min-h-0">
        <img 
          src={url} 
          alt={title || "Full size bill"} 
          className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Footer Actions */}
      <div 
        className="w-full p-8 pb-12 flex justify-center gap-12 bg-black/40 text-white z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          className="flex flex-col items-center gap-2 group transition-transform active:scale-95"
        >
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all border border-white/5 shadow-lg">
            <Download className="w-7 h-7" />
          </div>
          <span className="text-xs font-bold tracking-wide uppercase opacity-80 group-hover:opacity-100">Save</span>
        </button>

        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); handleShare(); }}
          className="flex flex-col items-center gap-2 group transition-transform active:scale-95"
        >
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all border border-white/5 shadow-lg">
            <Share2 className="w-7 h-7" />
          </div>
          <span className="text-xs font-bold tracking-wide uppercase opacity-80 group-hover:opacity-100">Share</span>
        </button>
      </div>
    </div>
  );
}
