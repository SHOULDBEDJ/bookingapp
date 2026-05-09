import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Users, Wallet, Images } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { BookingForm } from "@/components/app/BookingForm";
import { ExpenseForm } from "@/components/app/ExpenseForm";

export const Route = createFileRoute("/_authed/dashboard")({ component: Dashboard });

function Dashboard() {
  const [counts, setCounts] = useState({ bookings: 0, customers: 0, expenses: 0, albums: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [bookingFormOpen, setBookingFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);

  const load = async () => {
    const [b, c, e, a, list] = await Promise.all([
      supabase.from("bookings").select("id", { count: "exact", head: true }),
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("expenses").select("id", { count: "exact", head: true }),
      supabase.from("albums").select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("id, booking_date, customers(name, phone)").order("booking_date", { ascending: false }).limit(10),
    ]);
    setCounts({ bookings: b.count || 0, customers: c.count || 0, expenses: e.count || 0, albums: a.count || 0 });
    setRecent(list.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const kpis = [
    { label: "Total Bookings", value: counts.bookings, icon: CalendarDays },
    { label: "Total Customers", value: counts.customers, icon: Users },
    { label: "Total Expenses", value: counts.expenses, icon: Wallet },
    { label: "Gallery Albums", value: counts.albums, icon: Images },
  ];

  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        subtitle="Overview at a glance" 
        actions={
          <Button onClick={() => setBookingFormOpen(true)} className="bg-card text-foreground hover:bg-card/90 shadow-soft">
            <Plus className="w-4 h-4 mr-1" />
            New Booking
          </Button>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpis.map((k) => (
          <Card key={k.label} className="bg-gradient-card border-border shadow-soft hover:shadow-brand transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold text-gradient">{k.value}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-soft">
                <k.icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider px-1">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button 
            onClick={() => setBookingFormOpen(true)} 
            className="h-auto py-6 bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-brand flex flex-col items-center gap-2 rounded-2xl border-none transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-1">
              <Plus className="w-7 h-7" />
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">New Booking</p>
              <p className="text-xs opacity-80 font-normal">Create a new customer booking</p>
            </div>
          </Button>
          
          <Button 
            variant="outline"
            className="h-auto py-6 bg-card border-border hover:bg-muted/50 shadow-soft flex flex-col items-center gap-2 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => setExpenseFormOpen(true)}
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
              <Wallet className="w-7 h-7" />
            </div>
            <div className="text-center">
              <p className="font-bold text-lg text-foreground">Add Expense</p>
              <p className="text-xs text-muted-foreground font-normal">Record a business expense</p>
            </div>
          </Button>
        </div>
      </div>

      <Card className="shadow-soft border-border">
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-semibold mb-4">Recent Bookings</h3>
          <div className="space-y-2">
            {recent.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
            {recent.map((b) => (
              <div key={b.id} className="rounded-xl border border-border p-3 bg-gradient-soft flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{b.customers?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{b.customers?.phone || "no phone"}</p>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(b.booking_date)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <BookingForm open={bookingFormOpen} onClose={() => setBookingFormOpen(false)} onSaved={load} />
      <ExpenseForm open={expenseFormOpen} onClose={() => setExpenseFormOpen(false)} onSaved={load} />
    </div>
  );
}

