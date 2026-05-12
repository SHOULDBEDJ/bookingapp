import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, Calendar as CalendarIcon, X } from "lucide-react";
import { BookingDetail } from "@/components/app/BookingDetail";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { fmtDateTime } from "@/lib/format";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/_authed/customers")({ component: Page });

function Page() {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [rows, setRows] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const [del, setDel] = useState<any>(null);
  const [historyCustomer, setHistoryCustomer] = useState<any>(null);

  const load = async () => {
    let query = supabase
      .from("customers")
      .select("*, bookings(id, booking_date, notes, customers(name, phone))")
      .order("created_at", { ascending: false });

    if (from || to) {
      // Filter customers by booking date range
      // Using !inner to filter parents based on child existence
      let subQuery = "*, bookings!inner(id, booking_date, notes, customers(name, phone))";
      query = supabase.from("customers").select(subQuery);

      if (from) {
        const d = new Date(from);
        d.setHours(0, 0, 0, 0);
        query = query.gte("bookings.booking_date", d.toISOString());
      }
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        query = query.lte("bookings.booking_date", d.toISOString());
      }
      
      query = query.order("created_at", { ascending: false });
    }

    const { data } = await query;
    let arr = data || [];
    if (q.trim()) arr = arr.filter((c: any) => (c.phone || "").includes(q.trim()));
    setRows(arr);
  };
  useEffect(() => { load(); }, [q, from, to]);

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
      
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <Input 
          type="tel" 
          inputMode="tel" 
          placeholder="Search by phone number" 
          value={q} 
          onChange={(e) => setQ(e.target.value)} 
          className="max-w-sm" 
        />

        <div className="flex flex-wrap gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[160px] justify-start text-left font-normal bg-card shadow-soft border-border",
                  !from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {from ? format(from, "LLL dd, y") : <span>From Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={from}
                onSelect={setFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[160px] justify-start text-left font-normal bg-card shadow-soft border-border",
                  !to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {to ? format(to, "LLL dd, y") : <span>To Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={to}
                onSelect={setTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {(q || from || to) && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setQ(""); setFrom(undefined); setTo(undefined); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 bg-gradient-card shadow-soft hover:shadow-brand transition-shadow border-border">
              <p className="font-bold text-lg truncate">{r.name || r.phone || "—"}</p>
              {r.name && r.name !== r.phone && <p className="text-xs text-muted-foreground">{r.phone}</p>}
              <p className="text-xs mt-1 font-medium text-primary/80">{r.bookings?.length || 0} booking(s)</p>
              <div className="flex gap-1 mt-3 pt-3 border-t">
                <Button size="sm" variant="ghost" onClick={() => setHistoryCustomer(r)} className="text-primary font-semibold gap-1 hover:bg-primary/5">
                  <Eye className="w-4 h-4" />
                  View History
                </Button>
                <div className="flex-1" />
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
          <DialogHeader>
            <DialogTitle>Edit phone</DialogTitle>
            <DialogDescription>Update the customer's phone number</DialogDescription>
          </DialogHeader>
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
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this customer and all history?</AlertDialogTitle>
            <AlertDialogDescription>
              the booking and the customer will be deleted from booking and customer history module
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={doDelete} 
              className="bg-destructive text-destructive-foreground font-bold"
            >
              yes I want to delete the customer and booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!historyCustomer} onOpenChange={(o) => !o && setHistoryCustomer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 bg-gradient-hero text-primary-foreground">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Booking History: {historyCustomer?.name || historyCustomer?.phone}
            </DialogTitle>
            <DialogDescription className="text-sm opacity-90 text-primary-foreground">
              {historyCustomer?.bookings?.length || 0} total bookings recorded
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-muted/30">
            {historyCustomer?.bookings?.map((b: any, idx: number) => (
              <Card key={b.id} className="p-4 bg-card border-border shadow-soft hover:shadow-brand transition-all cursor-pointer group" onClick={() => setDetail({ ...b, customers: historyCustomer })}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      #{historyCustomer.bookings.length - idx}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{fmtDateTime(b.booking_date)}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        Date Recorded: {new Date(b.booking_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details <Eye className="ml-1 w-3 h-3" />
                  </Button>
                </div>
                {b.notes && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border text-sm italic text-muted-foreground">
                    "{b.notes}"
                  </div>
                )}
                <div className="mt-3 pt-3 border-t flex gap-2">
                   <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                     {b.booking_date ? 'Completed' : 'Pending'}
                   </div>
                </div>
              </Card>
            ))}
            {(!historyCustomer?.bookings || historyCustomer.bookings.length === 0) && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No booking history found for this customer.</p>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t bg-card flex justify-end">
            <Button variant="outline" onClick={() => setHistoryCustomer(null)}>Close History</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
