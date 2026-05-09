import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Users, Wallet, Images } from "lucide-react";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authed/dashboard")({ component: Dashboard });

function Dashboard() {
  const [counts, setCounts] = useState({ bookings: 0, customers: 0, expenses: 0, albums: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [b, c, e, a, list] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("expenses").select("id", { count: "exact", head: true }),
        supabase.from("albums").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id, booking_date, customers(name, phone)").order("booking_date", { ascending: false }).limit(10),
      ]);
      setCounts({ bookings: b.count || 0, customers: c.count || 0, expenses: e.count || 0, albums: a.count || 0 });
      setRecent(list.data || []);
    })();
  }, []);

  const kpis = [
    { label: "Total Bookings", value: counts.bookings, icon: CalendarDays },
    { label: "Total Customers", value: counts.customers, icon: Users },
    { label: "Total Expenses", value: counts.expenses, icon: Wallet },
    { label: "Gallery Albums", value: counts.albums, icon: Images },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview at a glance" />
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
    </div>
  );
}
