import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/lib/storage";
import { toLocalInput } from "@/lib/format";
import { PhotoUploader } from "./PhotoUploader";
import { AudioNoteRecorder, type DraftAudio } from "./AudioNoteRecorder";
import { SaveOverlay } from "./SaveOverlay";
import { toast } from "sonner";
import { UserCheck, UserPlus } from "lucide-react";

export function BookingForm({ open, onClose, onSaved, editing }: { open: boolean; onClose: () => void; onSaved: () => void; editing?: any }) {
  const [busy, setBusy] = useState(false);
  const [bookingDate, setBookingDate] = useState(toLocalInput());
  const [phone, setPhone] = useState("");
  const [matched, setMatched] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "checking" | "found" | "new">("idle");
  const [files, setFiles] = useState<File[]>([]);
  const [audios, setAudios] = useState<DraftAudio[]>([]);
  const [bookingCount, setBookingCount] = useState(0);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (editing) {
      setBookingDate(toLocalInput(editing.booking_date));
      if (editing.customers) {
        setPhone(editing.customers.phone || "");
        setMatched({ id: editing.customer_id, name: editing.customers.name, phone: editing.customers.phone || "" });
        setLookupState("found");
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("customer_id", editing.customer_id).then(({ count }) => setBookingCount(count || 0));
      }
    } else {
      setBookingDate(toLocalInput());
      setPhone(""); setMatched(null); setLookupState("idle"); setFiles([]); setAudios([]);
    }
  }, [editing, open]);

  // Auto-lookup on phone change
  useEffect(() => {
    if (editing) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const p = phone.trim();
    if (!p) { setMatched(null); setLookupState("idle"); return; }
    setLookupState("checking");
    debounceRef.current = window.setTimeout(async () => {
      const { data } = await supabase.from("customers").select("id,name,phone").eq("phone", p).maybeSingle();
      if (data) { 
        setMatched({ id: data.id, name: data.name, phone: data.phone || p }); 
        setLookupState("found"); 
        const { count } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("customer_id", data.id);
        setBookingCount(count || 0);
      }
      else { setMatched(null); setLookupState("new"); setBookingCount(0); }
    }, 400);
  }, [phone, editing]);

  const save = async () => {
    if (!phone.trim()) { toast.error("Phone number required"); return; }
    setBusy(true);
    const start = Date.now();
    try {
      let customerId = matched?.id;
      if (!customerId) {
        // create with phone-only; name placeholder is the phone itself
        const { data, error } = await supabase.from("customers").insert({ name: phone.trim(), phone: phone.trim() }).select("id").single();
        if (error) throw error;
        customerId = data.id;
      }

      let bookingId = editing?.id;
      if (bookingId) {
        await supabase.from("bookings").update({ customer_id: customerId, booking_date: new Date(bookingDate).toISOString() }).eq("id", bookingId);
      } else {
        const { data, error } = await supabase.from("bookings").insert({ customer_id: customerId, booking_date: new Date(bookingDate).toISOString() }).select("id").single();
        if (error) throw error;
        bookingId = data.id;
      }

      for (const f of files) {
        const path = await uploadFile("bills", f, f.name);
        await supabase.from("booking_photos").insert({ booking_id: bookingId, storage_path: path });
      }
      for (const a of audios) {
        if (!a.blob) continue;
        const storagePath = await uploadFile("audio", a.blob, `note-${a.id}.webm`);
        await supabase.from("audio_notes").insert({ parent_type: "booking", parent_id: bookingId, storage_path: storagePath });
      }

      const elapsed = Date.now() - start;
      if (elapsed < 2000) await new Promise((r) => setTimeout(r, 2000 - elapsed));
      toast.success(editing ? "Booking updated" : "Booking saved");
      onSaved(); onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally { setBusy(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-elevated border border-border my-4">
        <div className="bg-gradient-hero text-primary-foreground p-5 rounded-t-2xl">
          <h2 className="text-xl font-bold">{editing ? "Edit Booking" : "New Booking"}</h2>
        </div>
        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <Label>Date & Time</Label>
            <Input type="datetime-local" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="mt-1" />
          </div>

          <div className="relative">
            <Label>Phone Number</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter customer phone"
                className="flex-1"
                disabled={!!editing}
              />
              {lookupState === "found" && bookingCount > 0 && (
                <div 
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0 shadow-sm animate-in zoom-in" 
                  title={`${bookingCount} previous bookings`}
                >
                  {bookingCount}
                </div>
              )}
            </div>
            {lookupState === "checking" && (
              <p className="text-xs text-muted-foreground mt-1">Checking…</p>
            )}
            {lookupState === "found" && matched && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-gradient-soft border border-border p-2 text-sm">
                <UserCheck className="w-4 h-4 text-primary" />
                <span>Existing customer: <strong>{matched.name}</strong></span>
              </div>
            )}
            {lookupState === "new" && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/40 border border-border p-2 text-sm">
                <UserPlus className="w-4 h-4 text-primary" />
                <span>New customer — will be saved with this phone</span>
              </div>
            )}
          </div>

          <div>
            <Label>Bill Photos</Label>
            <div className="mt-1"><PhotoUploader files={files} setFiles={setFiles} /></div>
          </div>

          <AudioNoteRecorder items={audios} setItems={setAudios} />
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} className="bg-gradient-primary text-primary-foreground shadow-brand">Save Booking</Button>
        </div>
      </div>
      <SaveOverlay open={busy} label="Saving Booking..." />
    </div>
  );
}
