import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUploader } from "./PhotoUploader";
import { AudioNoteRecorder, type DraftAudio } from "./AudioNoteRecorder";
import { uploadFile } from "@/lib/storage";
import { toLocalInput, fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Wallet, CreditCard, Banknote, Contact, UserSearch } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: any;
}

export function ExpenseForm({ open, onClose, onSaved, editing }: ExpenseFormProps) {
  const [types, setTypes] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  
  const [date, setDate] = useState(toLocalInput());
  const [typeId, setTypeId] = useState<string>("");
  const [bookingId, setBookingId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "PHONE PE">("CASH");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [audios, setAudios] = useState<DraftAudio[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [existingAudios, setExistingAudios] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [filteringContact, setFilteringContact] = useState<{ name: string; phone: string } | null>(null);

  const loadDependencies = async () => {
    const [t, b] = await Promise.all([
      supabase.from("expense_types").select("*").order("name"),
      supabase.from("bookings").select("id, booking_date, customers(name)").order("booking_date", { ascending: false }).limit(100),
    ]);
    setTypes(t.data || []);
    setBookings(b.data || []);
  };

  useEffect(() => {
    if (open) {
      loadDependencies();
      if (editing) {
        setDate(toLocalInput(editing.expense_date));
        setTypeId(editing.expense_type_id || "");
        setBookingId(editing.booking_id || "");
        setAmount(String(editing.amount));
        
        // Extract payment method from notes if it exists in [METHOD] format
        const existingNotes = editing.notes || "";
        if (existingNotes.startsWith("[PHONE PE]")) {
          setPaymentMethod("PHONE PE");
          setNotes(existingNotes.replace("[PHONE PE]", "").trim());
        } else if (existingNotes.startsWith("[CASH]")) {
          setPaymentMethod("CASH");
          setNotes(existingNotes.replace("[CASH]", "").trim());
        } else {
          setPaymentMethod("CASH");
          setNotes(existingNotes);
        }

        // Fetch existing media
        const loadMedia = async () => {
          const [p, a] = await Promise.all([
            supabase.from("expense_photos").select("*").eq("expense_id", editing.id),
            supabase.from("audio_notes").select("*").eq("parent_type", "expense").eq("parent_id", editing.id)
          ]);
          setExistingPhotos(p.data || []);
          setExistingAudios(a.data || []);
        };
        loadMedia();
      } else {
        setDate(toLocalInput());
        setTypeId("");
        setBookingId("");
        setAmount("");
        setPaymentMethod("CASH");
        setNotes("");
        setFiles([]);
        setAudios([]);
        setExistingPhotos([]);
        setExistingAudios([]);
        setFilteringContact(null);
      }
    }
  }, [editing, open]);

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
        const name = contact.name?.[0] || "Unknown";
        
        setFilteringContact({ name, phone: cleanPhone });
        toast.info(`Filtering bookings for ${name}`);
      }
    } catch (e) {
      console.error("Contact picker error", e);
      toast.error("Could not access contacts");
    }
  };

  const filteredBookings = filteringContact 
    ? bookings.filter(b => b.customers?.phone?.includes(filteringContact.phone))
    : bookings;

  const removeExistingPhoto = async (path: string) => {
    const photo = existingPhotos.find(p => p.storage_path === path);
    if (photo) {
      await supabase.from("expense_photos").delete().eq("id", photo.id);
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
    if (!amount) { toast.error("Please enter an amount"); return; }
    if (!typeId) { toast.error("Please select an expense type"); return; }

    setSaving(true);
    try {
      const finalNotes = `[${paymentMethod}] ${notes}`.trim();
      const payload = { 
        expense_date: new Date(date).toISOString(), 
        expense_type_id: typeId || null, 
        booking_id: bookingId || null, 
        amount: Number(amount) || 0,
        notes: finalNotes
      };
      
      let id = editing?.id;
      if (id) {
        const { error } = await supabase.from("expenses").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("expenses").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      for (const f of files) {
        const path = await uploadFile("expense-photos", f, f.name);
        await supabase.from("expense_photos").insert({ expense_id: id, storage_path: path });
      }

      for (const a of audios) {
        if (a.blob) {
          const path = await uploadFile("audio", a.blob, `note-${a.id}.webm`);
          await supabase.from("audio_notes").insert({ 
            parent_type: "expense", 
            parent_id: id, 
            storage_path: path, 
            transcript: a.transcript 
          });
        }
      }

      toast.success(editing ? "Expense updated" : "Expense saved");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit" : "New"} Expense</DialogTitle>
          <DialogDescription>Record or update business expense details</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Expense Type</Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH")}
                className={cn(
                  "relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 group",
                  paymentMethod === "CASH" 
                    ? "border-emerald-500 bg-emerald-50/50 shadow-md scale-[1.02]" 
                    : "border-border bg-card hover:border-emerald-200 hover:bg-emerald-50/30"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors",
                  paymentMethod === "CASH" ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200"
                )}>
                  <Banknote className="w-6 h-6" />
                </div>
                <span className={cn("font-bold", paymentMethod === "CASH" ? "text-emerald-700" : "text-muted-foreground")}>CASH</span>
                {paymentMethod === "CASH" && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("PHONE PE")}
                className={cn(
                  "relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 group",
                  paymentMethod === "PHONE PE" 
                    ? "border-indigo-500 bg-indigo-50/50 shadow-md scale-[1.02]" 
                    : "border-border bg-card hover:border-indigo-200 hover:bg-indigo-50/30"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors",
                  paymentMethod === "PHONE PE" ? "bg-indigo-500 text-white" : "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200"
                )}>
                  <CreditCard className="w-6 h-6" />
                </div>
                <span className={cn("font-bold", paymentMethod === "PHONE PE" ? "text-indigo-700" : "text-muted-foreground")}>PHONE PE</span>
                {paymentMethod === "PHONE PE" && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                <Input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  className="pl-7 text-lg font-bold"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Linked Booking (Optional)</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={pickDeviceContact}
                  className="h-6 px-2 text-primary hover:bg-primary/5 gap-1 font-bold text-[10px]"
                >
                  <Contact className="w-3 h-3" /> Select Contact
                </Button>
              </div>
              <Select value={bookingId} onValueChange={setBookingId}>
                <SelectTrigger>
                  <SelectValue placeholder={filteringContact ? `Bookings for ${filteringContact.name}` : "None"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {filteredBookings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.customers?.name} — {fmtDateTime(b.booking_date)}
                    </SelectItem>
                  ))}
                  {filteredBookings.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground text-center">No bookings found for this contact</div>
                  )}
                </SelectContent>
              </Select>
              {filteringContact && (
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-primary flex items-center gap-1">
                    <UserSearch className="w-3 h-3" /> Filtered by: {filteringContact.name}
                  </p>
                  <button onClick={() => setFilteringContact(null)} className="text-[10px] text-muted-foreground hover:text-foreground">Clear filter</button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Add details about this expense..."
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Photos / Bills</Label>
              <PhotoUploader 
                files={files} 
                setFiles={setFiles} 
                existingFiles={existingPhotos.map(p => p.storage_path)} 
                onRemoveExisting={removeExistingPhoto}
                bucket="expense-photos"
              />
            </div>
            
            <AudioNoteRecorder 
              items={audios} 
              setItems={setAudios} 
              existingItems={existingAudios.map(a => ({ id: a.id, storage_path: a.storage_path, transcript: a.transcript, recorded_at: a.created_at, blob: null }))}
              onRemoveExisting={removeExistingAudio}
            />
          </div>

          <Button 
            onClick={save} 
            disabled={saving}
            className="w-full h-12 bg-gradient-primary text-primary-foreground text-lg font-bold shadow-brand hover:opacity-90 transition-opacity"
          >
            {saving ? "Saving..." : (editing ? "Update Expense" : "Save Expense")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
