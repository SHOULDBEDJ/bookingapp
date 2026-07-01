import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/storage";
import { fmtDateTime } from "@/lib/format";
import { PhotoLightbox } from "./PhotoLightbox";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, StopCircle, RefreshCw, Send, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

export function BookingDetail({ booking, open, onClose }: { booking: any; open: boolean; onClose: () => void }) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [audios, setAudios] = useState<any[]>([]);
  const [zoom, setZoom] = useState<string | null>(null);
  
  // Location session state
  const [locationSession, setLocationSession] = useState<any>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (!open || !booking) return;
    (async () => {
      const [p, a] = await Promise.all([
        supabase.from("booking_photos").select("*").eq("booking_id", booking.id),
        supabase.from("audio_notes").select("*").eq("parent_type", "booking").eq("parent_id", booking.id),
      ]);
      setPhotos(p.data || []); setAudios(a.data || []);
      
      // Load from local storage so it survives reloads
      const cached = localStorage.getItem(`location_session_${booking.id}`);
      if (cached) {
        try { setLocationSession(JSON.parse(cached)); } catch(e) {}
      } else {
        setLocationSession(null); 
      }
    })();

    // Subscribe to realtime location updates for this booking
    const channel = supabase.channel(`location-${booking.id}`, {
      config: { broadcast: { self: true } }
    });

    channel.on('broadcast', { event: 'location_update' }, (payload: any) => {
      setLocationSession((prev: any) => {
        const newState = {
          ...prev,
          status: 'active',
          last_lat: payload.payload.lat,
          last_lng: payload.payload.lng,
          last_updated_at: new Date().toISOString()
        };
        localStorage.setItem(`location_session_${booking.id}`, JSON.stringify(newState));
        return newState;
      });
    });

    channel.on('broadcast', { event: 'location_stopped' }, () => {
      setLocationSession((prev: any) => {
        const newState = { ...prev, status: 'ended' };
        localStorage.setItem(`location_session_${booking.id}`, JSON.stringify(newState));
        return newState;
      });
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Send a ping to ask if the customer is currently tracking
        channel.send({
          type: 'broadcast',
          event: 'ping_request',
          payload: {}
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, booking]);

  const requestLiveLocation = async () => {
    try {
      setIsRequesting(true);
      
      // We use booking.id as the token for stateless sharing
      const shareToken = booking.id;
      
      const newState = { status: 'pending', token: shareToken };
      setLocationSession(newState);
      localStorage.setItem(`location_session_${booking.id}`, JSON.stringify(newState));
      toast.success("Location request sent!");
      
      const shareUrl = `${window.location.origin}/share-location/${shareToken}`;
      const message = `Hello, please share your location for your booking using this link: ${shareUrl}`;
      let phoneStr = booking.customers?.phone?.replace(/\D/g, '') || '';
      if (phoneStr.length === 10) {
        phoneStr = `91${phoneStr}`;
      }
      const waUrl = `https://wa.me/${phoneStr}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      
    } catch (e: any) {
      toast.error(e.message || "Failed to request location");
    } finally {
      setIsRequesting(false);
    }
  };

  const stopTracking = async () => {
    if (!locationSession) return;
    try {
      const channel = supabase.channel(`location-${booking.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'location_stopped',
        payload: {}
      });
      
      setLocationSession((prev: any) => {
        const newState = { ...prev, status: 'ended' };
        localStorage.setItem(`location_session_${booking.id}`, JSON.stringify(newState));
        return newState;
      });
      toast.success("Tracking stopped successfully");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const refreshLocation = async () => {
    toast.success("Listening for live updates...");
    const channel = supabase.channel(`location-${booking.id}`);
    channel.send({
      type: 'broadcast',
      event: 'ping_request',
      payload: {}
    });
  };

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
              <div className="flex flex-col gap-2">
                {booking.customers?.phone && (
                  <Button asChild className="bg-gradient-primary text-primary-foreground shadow-brand rounded-full">
                    <a href={`tel:${booking.customers.phone}`} aria-label="Call customer">
                      <Phone className="w-4 h-4 mr-1" />Call
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Live Location Section */}
          <div className="rounded-xl p-4 bg-card border border-border shadow-soft">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Live Location Tracking
            </h3>
            
            {!locationSession && (
              <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg border border-dashed border-border/60">
                <p className="text-sm text-muted-foreground mb-3 text-center">Track your customer's location securely.</p>
                <Button onClick={requestLiveLocation} disabled={isRequesting} className="shadow-brand bg-gradient-primary">
                  {isRequesting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                  Request Location via WhatsApp
                </Button>
              </div>
            )}
            
            {locationSession && locationSession.status === 'pending' && (
              <div className="flex flex-col gap-3 p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <Clock className="w-4 h-4" />
                  <p className="text-sm font-medium">Waiting for customer to share location...</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={refreshLocation}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Refresh Status
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                    const shareUrl = `${window.location.origin}/share-location/${locationSession.token}`;
                    const message = `Hello, please share your location for your booking using this link: ${shareUrl}`;
                    let phoneStr = booking.customers?.phone?.replace(/\D/g, '') || '';
                    if (phoneStr.length === 10) {
                      phoneStr = `91${phoneStr}`;
                    }
                    const waUrl = `https://wa.me/${phoneStr}?text=${encodeURIComponent(message)}`;
                    window.open(waUrl, '_blank');
                  }}>
                    <Send className="w-3 h-3 mr-1" /> Resend Link
                  </Button>
                </div>
              </div>
            )}
            
            {locationSession && locationSession.status === 'active' && locationSession.last_lat && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <p className="text-sm font-medium">Location Tracking Active</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {locationSession.last_updated_at ? Math.round((Date.now() - new Date(locationSession.last_updated_at).getTime()) / 60000) : 0} mins ago
                  </p>
                </div>
                
                <div className="h-[250px] w-full rounded-lg overflow-hidden border border-border">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${locationSession.last_lng - 0.005},${locationSession.last_lat - 0.005},${locationSession.last_lng + 0.005},${locationSession.last_lat + 0.005}&layer=mapnik&marker=${locationSession.last_lat},${locationSession.last_lng}`} 
                    style={{ border: 0 }}>
                  </iframe>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={refreshLocation}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1" onClick={stopTracking}>
                    <StopCircle className="w-4 h-4 mr-2" /> Stop Tracking
                  </Button>
                </div>
              </div>
            )}
            
            {locationSession && locationSession.status === 'ended' && (
              <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <StopCircle className="w-4 h-4" />
                  <p className="text-sm font-medium">Tracking ended.</p>
                </div>
                <Button variant="outline" size="sm" onClick={requestLiveLocation} disabled={isRequesting}>
                  Request New Location
                </Button>
              </div>
            )}
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
