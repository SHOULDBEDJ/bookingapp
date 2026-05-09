import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { BookingDetail } from "@/components/app/BookingDetail";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/customers")({ component: Page });

function Page() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const [del, setDel] = useState<any>(null);

  const load = async () => {
    const { data } = await supabase.from("customers").select("*, bookings(id, booking_date, notes, customers(name, phone))").order("created_at", { ascending: false });
    let arr = data || [];
    if (q.trim()) arr = arr.filter((c: any) => (c.phone || "").includes(q.trim()));
    setRows(arr);
  };
  useEffect(() => { load(); }, [q]);

  const saveEdit = async () => {
    await supabase.from("customers").update({ phone: edit.phone, name: edit.phone }).eq("id", edit.id);
    toast.success("Updated"); setEdit(null); load();
  };
  const doDelete = async () => {
    await supabase.from("customers").delete().eq("id", del.id);
    toast.success("Deleted"); setDel(null); load();
  };

  return (
    <div>
      <PageHeader title="Customer History" subtitle="All customers by phone" />
      <div className="mb-4"><Input type="tel" inputMode="tel" placeholder="Search by phone number" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" /></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 bg-gradient-card shadow-soft hover:shadow-brand transition-shadow border-border">
              <p className="font-semibold">{r.phone || "—"}</p>
              <p className="text-xs mt-1">{r.bookings?.length || 0} booking(s)</p>
              <div className="flex gap-1 mt-3 pt-3 border-t">
                <Button size="sm" variant="ghost" onClick={() => r.bookings?.[0] && setDetail({ ...r.bookings[0], customers: r })}><Eye className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEdit(r)}><Pencil className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setDel(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
          {rows.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No customers.</p>}
      </div>

      <BookingDetail booking={detail} open={!!detail} onClose={() => setDetail(null)} />
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit phone</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div><Label>Phone</Label><Input type="tel" value={edit.phone || ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
              <Button onClick={saveEdit} className="bg-gradient-primary text-primary-foreground w-full shadow-brand">Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete customer?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
