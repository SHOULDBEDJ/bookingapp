import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Pencil, Trash2, Settings as SettingsIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { publicUrl } from "@/lib/storage";
import { fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import { ExpenseForm } from "@/components/app/ExpenseForm";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authed/expense")({ component: ExpensePage });

function ExpensePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [del, setDel] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  const load = async () => {
    const [e, t, b] = await Promise.all([
      supabase.from("expenses").select("*, expense_types(name), bookings(id, booking_date, customers(name))").order("expense_date", { ascending: false }),
      supabase.from("expense_types").select("*").order("name"),
      supabase.from("bookings").select("id, booking_date, customers(name)").order("booking_date", { ascending: false }).limit(200),
    ]);
    setRows(e.data || []); setTypes(t.data || []); setBookings(b.data || []);
  };
  useEffect(() => { load(); }, []);

  const doDelete = async () => { await supabase.from("expenses").delete().eq("id", del.id); toast.success("Deleted"); setDel(null); load(); };

  return (
    <div>
      <PageHeader title="Expenses" actions={<>
        <Button onClick={() => setTypesOpen(true)} className="bg-card text-foreground hover:bg-card/90 shadow-soft"><SettingsIcon className="w-4 h-4 mr-1" />Manage Types</Button>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-card text-foreground hover:bg-card/90 shadow-soft"><Plus className="w-4 h-4 mr-1" />New Expense</Button>
      </>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 bg-gradient-card shadow-soft hover:shadow-brand transition-shadow border-border">
              <div className="flex justify-between"><p className="font-semibold">{r.expense_types?.name || "—"}</p><p className="font-bold text-gradient">₹{r.amount}</p></div>
              <p className="text-xs text-muted-foreground">{fmtDateTime(r.expense_date)}</p>
              {r.bookings && <p className="text-xs mt-1">↪ {r.bookings.customers?.name}</p>}
              <div className="flex gap-1 mt-3 pt-3 border-t">
                <Button size="sm" variant="ghost" onClick={() => setDetail(r)}><Eye className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setDel(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
          {rows.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No expenses.</p>}
      </div>

      {/* Form dialog */}
      <ExpenseForm 
        open={formOpen} 
        onClose={() => { setFormOpen(false); setEditing(null); }} 
        onSaved={load} 
        editing={editing} 
      />

      {/* Types manager */}
      <ExpenseTypesManager open={typesOpen} onClose={() => { setTypesOpen(false); load(); }} />

      {/* Detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expense detail</DialogTitle>
            <DialogDescription>Detailed view of this expense record</DialogDescription>
          </DialogHeader>
          {detail && <ExpenseDetail expense={detail} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the expense record.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
}

function ExpenseDetail({ expense }: { expense: any }) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [audios, setAudios] = useState<any[]>([]);
  useEffect(() => { (async () => {
    const [p, a] = await Promise.all([
      supabase.from("expense_photos").select("*").eq("expense_id", expense.id),
      supabase.from("audio_notes").select("*").eq("parent_type", "expense").eq("parent_id", expense.id),
    ]);
    setPhotos(p.data || []); setAudios(a.data || []);
  })(); }, [expense.id]);
  return (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto">
      <div className="rounded-lg p-3 bg-gradient-card border"><p className="text-sm">Type: <strong>{expense.expense_types?.name || "—"}</strong></p>
        <p className="text-sm">Amount: <strong>₹{expense.amount}</strong></p>
        <p className="text-sm">Date: {fmtDateTime(expense.expense_date)}</p>
      </div>
      {photos.length > 0 && <div className="grid grid-cols-3 gap-2">{photos.map((p) => <img key={p.id} src={publicUrl("expense-photos", p.storage_path)} className="aspect-square object-cover rounded-lg border" alt="" />)}</div>}
      {audios.map((a) => <div key={a.id} className="rounded-lg p-2 border bg-muted/20">{a.storage_path && <audio controls src={publicUrl("audio", a.storage_path)} className="w-full h-8 mb-1" />}{a.transcript && <p className="text-sm">{a.transcript}</p>}</div>)}
    </div>
  );
}

function ExpenseTypesManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");

  const load = async () => { const { data } = await supabase.from("expense_types").select("*").order("name"); setItems(data || []); };
  useEffect(() => { if (open) load(); }, [open]);
  const add = async () => {
    if (!name.trim()) return;

    try {
      const { error } = await supabase.from("expense_types").insert({ name: name.trim() });
      if (error) throw error;
      setName(""); load(); toast.success("Added");
    } catch (err: any) { toast.error(err.message); }
  };
  const update = async (id: string, n: string) => { await supabase.from("expense_types").update({ name: n }).eq("id", id); load(); };
  const del = async (id: string) => { await supabase.from("expense_types").delete().eq("id", id); load(); };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Expense Types</DialogTitle>
          <DialogDescription>Add or remove expense categories</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New type name..." /><Button onClick={add} className="bg-gradient-primary text-primary-foreground">Add</Button></div>
        <div className="space-y-2 max-h-80 overflow-y-auto">{items.map((t) => (
          <div key={t.id} className="flex gap-2 items-center"><Input defaultValue={t.name} onBlur={(e) => e.target.value !== t.name && update(t.id, e.target.value)} /><Button size="sm" variant="ghost" onClick={() => del(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></div>
        ))}</div>

      </DialogContent>
    </Dialog>
  );
}
