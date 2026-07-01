import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { PartyPopper, ShieldAlert, Clock, CheckCircle2, StopCircle, Navigation, MapPin } from "lucide-react";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/share-location/$token")({
  component: ShareLocationPage,
});

function ShareLocationPage() {
  const { token } = Route.useParams();
  const [session, setSession] = useState<any>(null);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  
  // Track last known coordinates so we can immediately reply to pings
  const lastCoords = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadSession();
  }, [token]);

  const loadSession = async () => {
    try {
      setLoading(true);
      
      // With stateless real-time, the token is simply the booking.id
      setSession({ status: 'pending', duration_type: 'current_only' });

      // Fetch booking details directly
      const { data: book } = await supabase
        .from("bookings")
        .select("*, customers(name, phone)")
        .eq("id", token)
        .single();
        
      if (book) setBooking(book);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const startSharing = async (durationMinutes: number) => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    try {
      // Setup Realtime Channel
      const channel = supabase.channel(`location-${token}`, {
        config: { broadcast: { self: true } }
      });
      
      channel.on('broadcast', { event: 'ping_request' }, async () => {
        if (lastCoords.current) {
          await channel.send({
            type: 'broadcast',
            event: 'location_update',
            payload: lastCoords.current
          });
        }
      });
      
      channel.on('broadcast', { event: 'location_stopped' }, () => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        setSharing(false);
        setSession((prev: any) => ({ ...prev, status: "ended", channel: null }));
        toast.success("Sharing stopped by admin");
      });
      
      channel.subscribe();

      // Request permission and get first location
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          let duration_type = 'current_only';
          let expires_at = null;
          
          if (durationMinutes === 15) {
            duration_type = '15m';
            expires_at = new Date(Date.now() + 15 * 60000).toISOString();
          } else if (durationMinutes === 60) {
            duration_type = '1h';
            expires_at = new Date(Date.now() + 60 * 60000).toISOString();
          } else if (durationMinutes === -1) {
            duration_type = 'indefinite';
            expires_at = null;
          }

          // Broadcast initial location
          lastCoords.current = { lat: latitude, lng: longitude };
          await channel.send({
            type: 'broadcast',
            event: 'location_update',
            payload: lastCoords.current
          });

          setSharing(true);
          setSession((prev: any) => ({ ...prev, status: "active", expires_at, duration_type, channel }));
          toast.success("Location sharing started");

          // Start watching if duration is not 0 (meaning > 0 or -1)
          if (durationMinutes !== 0) {
            const id = navigator.geolocation.watchPosition(
              async (pos) => {
                lastCoords.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                await channel.send({
                  type: 'broadcast',
                  event: 'location_update',
                  payload: lastCoords.current
                });
              },
              (err) => console.error(err),
              { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
            );
            setWatchId(id);
          }
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            toast.error("Please allow location permissions to share your location.");
          } else {
            toast.error("Unable to get your location.");
          }
        },
        { enableHighAccuracy: true }
      );
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const stopSharing = async () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    
    if (session?.channel) {
      await session.channel.send({
        type: 'broadcast',
        event: 'location_stopped',
        payload: {}
      });
      supabase.removeChannel(session.channel);
    }

    setSharing(false);
    setSession((prev: any) => ({ ...prev, status: "ended", channel: null }));
    toast.success("Location sharing stopped");
  };

  // Auto-stop if expired
  useEffect(() => {
    if (sharing && session?.expires_at) {
      const msLeft = new Date(session.expires_at).getTime() - Date.now();
      if (msLeft <= 0) {
        stopSharing();
      } else {
        const timeout = setTimeout(() => {
          stopSharing();
        }, msLeft);
        return () => clearTimeout(timeout);
      }
    }
  }, [sharing, session?.expires_at]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Link Expired</h1>
        <p className="text-muted-foreground">{error || "This location sharing link is no longer valid."}</p>
      </div>
    );
  }

  if (session.status === "ended") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <StopCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Sharing Ended</h1>
        <p className="text-muted-foreground">Location sharing for this booking has been ended.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex flex-col items-center pt-10">
      <div className="w-full max-w-md space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <PartyPopper className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold leading-tight">Thank You For Choosing Shiva Shaktii Shamiyana</h1>
          <p className="text-muted-foreground text-sm px-2">
            please share the location to know where to deliver the items
          </p>
        </div>

        {booking && (
          <Card className="p-4 bg-card shadow-soft border-border">
            <h2 className="font-semibold text-sm text-muted-foreground mb-2 uppercase tracking-wider">Booking Details</h2>
            <p className="font-bold">{booking.customers?.name || "Customer"}</p>
            <p className="text-sm text-muted-foreground mt-1">{fmtDateTime(booking.booking_date)}</p>
          </Card>
        )}

        {!sharing ? (
          <Card className="p-5 border-border shadow-soft bg-gradient-card">
            <div className="space-y-4">
              <Button 
                onClick={() => startSharing(-1)} 
                className="w-full h-14 text-lg font-semibold bg-gradient-primary text-primary-foreground shadow-brand"
              >
                Confirm Booking
              </Button>
              <p className="text-center text-xs text-muted-foreground font-medium">
                *the location will be disabled after clicking "Confirm Booking"
              </p>
            </div>
          </Card>
        ) : (
          <Card className="p-6 border-primary/50 shadow-brand text-center relative overflow-hidden bg-card">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-400 animate-pulse"></div>
            
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Thanks for sharing!</h2>
            <p className="text-base font-medium text-foreground mb-6">
              Contact: 7019901151, 9590374559 After Sharing Location To Deliver The Items
            </p>
            
            <p className="text-center text-base font-semibold text-destructive mt-6 pt-4 border-t border-border">
              You can close this window at any time to stop sharing.
            </p>
          </Card>
        )}

      </div>
    </div>
  );
}
