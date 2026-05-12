import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookingForm } from "@/components/app/BookingForm";
import { BookingDetail } from "@/components/app/BookingDetail";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/booking")({ component: BookingPage });

function BookingPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [delTarget, setDelTarget] = useState<any>(null);

  const load = async () => {
    const { data } = await supabase.from("bookings").select("*, customers(id,name,phone)").order("booking_date", { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { load(); }, []);

  const onDelete = async () => {
    if (!delTarget) return;
    try {
      const customerId = delTarget.customers?.id;
      // Delete booking first
      await supabase.from("bookings").delete().eq("id", delTarget.id);
      
      // If there's a customer, delete them too
      if (customerId) {
        await supabase.from("customers").delete().eq("id", customerId);
      }
      
      toast.success("Booking and customer deleted permanently");
      setDelTarget(null); load();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  return (
    <div>
      <PageHeader title="Bookings" subtitle="Manage all your bookings"
        actions={<>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-card text-foreground hover:bg-card/90 shadow-soft"><Plus className="w-4 h-4 mr-1" />New Booking</Button>
        </>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 bg-gradient-card border-border shadow-soft hover:shadow-brand transition-shadow">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{r.customers?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{r.customers?.phone}</p>
                  <p className="text-xs mt-1">{fmtDateTime(r.booking_date)}</p>
                </div>
              </div>
              {r.notes && <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">{r.notes}</p>}
              <div className="flex gap-1 mt-3 pt-3 border-t">
                <Button size="sm" variant="ghost" onClick={() => setDetail(r)}><Eye className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setDelTarget(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
          {rows.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No bookings yet.</p>}
      </div>

      <BookingForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} editing={editing} />
      <BookingDetail booking={detail} open={!!detail} onClose={() => setDetail(null)} />
      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this booking and customer?</AlertDialogTitle>
            <AlertDialogDescription>
              the booking and the customer will be deleted from booking and customer history module
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={onDelete} 
              className="bg-destructive text-destructive-foreground font-bold"
            >
              yes I want to delete the customer and booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
