import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/lib/storage";
import { toLocalInput } from "@/lib/format";
import { PhotoUploader } from "./PhotoUploader";
import { AudioNoteRecorder, type DraftAudio } from "./AudioNoteRecorder";
import { toast } from "sonner";
import { UserCheck, UserPlus, Contact, History, FileText } from "lucide-react";

export function BookingForm({ open, onClose, onSaved, editing }: { open: boolean; onClose: () => void; onSaved: () => void; editing?: any }) {

  const [bookingDate, setBookingDate] = useState(toLocalInput());
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [matched, setMatched] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "checking" | "found" | "new">("idle");
  const [files, setFiles] = useState<File[]>([]);
  const [audios, setAudios] = useState<DraftAudio[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [existingAudios, setExistingAudios] = useState<any[]>([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (editing && open) {
      setBookingDate(toLocalInput(editing.booking_date));
      setNotes(editing.notes || "");
      if (editing.customers) {
        setPhone(editing.customers.phone || "");
        setMatched({ id: editing.customer_id, name: editing.customers.name, phone: editing.customers.phone || "" });
        setCustomerName(editing.customers.name);
        setLookupState("found");
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("customer_id", editing.customer_id).then(({ count }) => setBookingCount(count || 0));
      }
      
      // Fetch existing media
      const loadMedia = async () => {
        const [p, a] = await Promise.all([
          supabase.from("booking_photos").select("*").eq("booking_id", editing.id),
          supabase.from("audio_notes").select("*").eq("parent_type", "booking").eq("parent_id", editing.id)
        ]);
        setExistingPhotos(p.data || []);
        setExistingAudios(a.data || []);
      };
      loadMedia();
    } else if (open) {
      setBookingDate(toLocalInput());
      setPhone(""); setCustomerName(""); setNotes(""); setMatched(null); setLookupState("idle"); 
      setFiles([]); setAudios([]); setExistingPhotos([]); setExistingAudios([]); setBookingCount(0);
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
        setCustomerName(data.name);
        setLookupState("found"); 
        const { count } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("customer_id", data.id);
        setBookingCount(count || 0);
      }
      else { setMatched(null); setLookupState("new"); setBookingCount(0); }
    }, 400);
  }, [phone, editing]);

  const pickDeviceContact = async () => {
    try {
      // @ts-ignore
      if (!navigator.contacts || !navigator.contacts.select) {
        toast.error("Contact selection is only available on supported mobile browsers (Chrome/Safari on mobile)");
        return;
      }
      // @ts-ignore
      const props = ['name', 'tel'];
      // @ts-ignore
      const contacts = await navigator.contacts.select(props, { multiple: false });
      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        const rawPhone = contact.tel?.[0] || "";
        const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
        setPhone(cleanPhone);
        if (contact.name?.[0]) {
          setCustomerName(contact.name[0]);
        }
      }
    } catch (e) {
      console.error("Contact picker error", e);
      toast.error("Could not access contacts");
    }
  };

  const removeExistingPhoto = async (path: string) => {
    const photo = existingPhotos.find(p => p.storage_path === path);
    if (photo) {
      await supabase.from("booking_photos").delete().eq("id", photo.id);
      setExistingPhotos(existingPhotos.filter(p => p.id !== photo.id));
      toast.success("Photo removed");
    }
  };

  const removeExistingAudio = async (id: string) => {
    await supabase.from("audio_notes").delete().eq("id", id);
    setExistingAudios(existingAudios.filter(a => a.id !== id));
    toast.success("Voice note removed");
  };

  const save = async () => {
    if (!phone.trim()) { toast.error("Phone number required"); return; }
    setSaving(true);
    try {
      let customerId = matched?.id;
      if (!customerId) {
        const nameToSave = customerName.trim() || phone.trim();
        const { data, error } = await supabase.from("customers").insert({ name: nameToSave, phone: phone.trim() }).select("id").single();
        if (error) throw error;
        customerId = data.id;
      }

      let bookingId = editing?.id;
      const bookingPayload = { 
        customer_id: customerId, 
        booking_date: new Date(bookingDate).toISOString(),
        notes: notes.trim() || null
      };

      if (bookingId) {
        const { error } = await supabase.from("bookings").update(bookingPayload).eq("id", bookingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("bookings").insert(bookingPayload).select("id").single();
        if (error) throw error;
        bookingId = data.id;
      }

      // Save new photos
      for (const f of files) {
        const path = await uploadFile("bills", f, f.name);
        await supabase.from("booking_photos").insert({ booking_id: bookingId, storage_path: path });
      }

      // Save new audios
      for (const a of audios) {
        if (!a.blob) continue;
        const storagePath = await uploadFile("audio", a.blob, `note-${a.id}.webm`);
        await supabase.from("audio_notes").insert({ 
          parent_type: "booking", 
          parent_id: bookingId, 
          storage_path: storagePath,
          transcript: a.transcript || null
        });
      }

      toast.success(editing ? "Booking updated" : "Booking saved");
      onSaved(); onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-elevated border border-border my-4 animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-hero text-primary-foreground p-5 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-xl font-bold">{editing ? "Edit Booking" : "New Booking"}</h2>
          {editing && <div className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Editing Mode</div>}
        </div>
        <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Booking Date & Time</Label>
              <Input type="datetime-local" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="h-11 shadow-soft" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Phone Number</Label>
                {!editing && (
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    onClick={pickDeviceContact}
                    className="h-6 px-2 text-primary hover:bg-primary/5 gap-1.5 font-bold rounded-md transition-all active:scale-95"
                  >
                    <Contact className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Select Contact</span>
                  </Button>
                )}
              </div>
              <Input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="h-11 font-medium shadow-soft"
                disabled={!!editing}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Customer Name</Label>
              <Input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Auto-filled from contacts or database"
                className="h-11 shadow-soft"
                disabled={lookupState === "found"}
              />
            </div>

            {lookupState === "found" && (
              <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700 animate-in slide-in-from-top-2 duration-300 shadow-sm">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-bold">Existing Customer</p>
                  <p className="text-xs opacity-80">{matched?.name} — {bookingCount} bookings found</p>
                </div>
              </div>
            )}
            
            {lookupState === "checking" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                <span>Checking database...</span>
              </div>
            )}
            
            {lookupState === "new" && phone.length >= 10 && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-700 animate-in slide-in-from-top-2 duration-300 shadow-sm">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <div className="flex-1">
                  <p className="font-bold">New Customer</p>
                  <p className="text-xs opacity-80">This customer will be saved automatically</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <Label className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Booking Notes</Label>
            </div>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Add specific requirements or details for this booking..."
              className="resize-none shadow-soft min-h-[100px]"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Bill & Site Photos</Label>
              <PhotoUploader 
                files={files} 
                setFiles={setFiles} 
                existingFiles={existingPhotos.map(p => p.storage_path)} 
                onRemoveExisting={removeExistingPhoto}
                bucket="bills"
              />
            </div>

            <AudioNoteRecorder 
              items={audios} 
              setItems={setAudios} 
              existingItems={existingAudios.map(a => ({ id: a.id, storage_path: a.storage_path, transcript: a.transcript, blob: null }))}
              onRemoveExisting={removeExistingAudio}
            />
          </div>
        </div>
        
        <div className="p-4 border-t bg-muted/30 flex justify-end gap-3 rounded-b-2xl">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button 
            onClick={save} 
            disabled={saving}
            className="bg-gradient-primary text-primary-foreground shadow-brand min-w-[140px] font-bold"
          >
            {saving ? "Saving..." : (editing ? "Update Booking" : "Save Booking")}
          </Button>
        </div>
      </div>

    </div>
  );
}
