import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/storage";
import { fmtDateTime } from "@/lib/format";
import { PhotoLightbox } from "./PhotoLightbox";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

export function BookingDetail({ booking, open, onClose }: { booking: any; open: boolean; onClose: () => void }) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [audios, setAudios] = useState<any[]>([]);
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !booking) return;
    (async () => {
      const [p, a] = await Promise.all([
        supabase.from("booking_photos").select("*").eq("booking_id", booking.id),
        supabase.from("audio_notes").select("*").eq("parent_type", "booking").eq("parent_id", booking.id),
      ]);
      setPhotos(p.data || []); setAudios(a.data || []);
    })();
  }, [open, booking]);

  if (!booking) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
          <DialogDescription>Full details of the customer booking</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-xl p-4 bg-gradient-card border border-border shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="text-lg font-bold truncate">{booking.customers?.name || "—"}</p>
                <p className="text-sm text-muted-foreground">{booking.customers?.phone || "No phone"}</p>
                <p className="text-sm mt-2"><span className="text-muted-foreground">Date:</span> {fmtDateTime(booking.booking_date)}</p>
              </div>
              {booking.customers?.phone && (
                <Button asChild className="bg-gradient-primary text-primary-foreground shadow-brand rounded-full">
                  <a href={`tel:${booking.customers.phone}`} aria-label="Call customer">
                    <Phone className="w-4 h-4 mr-1" />Call
                  </a>
                </Button>
              )}
            </div>
          </div>
          {photos.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Bill Photos ({photos.length})</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((p) => {
                  const url = publicUrl("bills", p.storage_path);
                  return <button key={p.id} onClick={() => setZoom(url)} className="aspect-square rounded-lg overflow-hidden border border-border"><img src={url} alt="" className="w-full h-full object-cover" /></button>;
                })}
              </div>
            </div>
          )}
          {audios.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Audio Notes ({audios.length})</p>
              <div className="space-y-2">
                {audios.map((a) => (
                  <div key={a.id} className="rounded-lg p-3 border border-border bg-gradient-soft">
                    {a.storage_path && <audio controls src={publicUrl("audio", a.storage_path)} className="w-full h-8" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <PhotoLightbox url={zoom} open={!!zoom} onClose={() => setZoom(null)} />
      </DialogContent>
    </Dialog>
  );
}
