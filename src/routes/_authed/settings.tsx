import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Download, Upload, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authed/settings")({ component: SettingsPage });

const TABLES = ["customers", "bookings", "booking_photos", "audio_notes", "expense_types", "expenses", "expense_photos", "albums", "album_media"];
const BUCKETS = ["bills", "expense-photos", "audio", "gallery"];

function SettingsPage() {
  const [includeMedia, setIncludeMedia] = useState(true);
  const [confirmAction, setConfirmAction] = useState<null | "bookings" | "expenses" | "all">(null);

  const backup = async () => {
    const out: any = { exported_at: new Date().toISOString(), tables: {} };
    for (const t of TABLES) {
      const { data } = await supabase.from(t as any).select("*");
      out.tables[t] = data || [];
    }
    if (includeMedia) {
      out.media = {};
      for (const b of BUCKETS) {
        const { data } = await supabase.storage.from(b).list("", { limit: 10000 });
        out.media[b] = (data || []).map((x) => x.name);
      }
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `shamiyana-backup-${Date.now()}.json`; a.click();
    toast.success("Backup downloaded");
  };

  const restore = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      for (const t of TABLES) {
        const rows = data.tables?.[t] || [];
        if (rows.length) await supabase.from(t as any).upsert(rows);
      }
      toast.success("Restore complete");
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteScope = async (scope: "bookings" | "expenses" | "all") => {
    try {
      if (scope === "bookings" || scope === "all") {
        await supabase.from("audio_notes").delete().eq("parent_type", "booking");
        await supabase.from("booking_photos").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("bookings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (includeMedia) {
          const { data } = await supabase.storage.from("bills").list("", { limit: 10000 });
          if (data?.length) await supabase.storage.from("bills").remove(data.map((x) => x.name));
        }
      }
      if (scope === "expenses" || scope === "all") {
        await supabase.from("audio_notes").delete().eq("parent_type", "expense");
        await supabase.from("expense_photos").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("expenses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (includeMedia) {
          const { data } = await supabase.storage.from("expense-photos").list("", { limit: 10000 });
          if (data?.length) await supabase.storage.from("expense-photos").remove(data.map((x) => x.name));
        }
      }
      if (scope === "all") {
        await supabase.from("album_media").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("albums").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("expense_types").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (includeMedia) {
          for (const b of ["audio", "gallery"]) {
            const { data } = await supabase.storage.from(b).list("", { limit: 10000 });
            if (data?.length) await supabase.storage.from(b).remove(data.map((x) => x.name));
          }
        }
      }
      toast.success("Deleted");
    } catch (e: any) { toast.error(e.message); }
    setConfirmAction(null);
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Backup, restore & data management" />
      <div className="space-y-4">
        <Card><CardContent className="p-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Download className="w-4 h-4" />Backup & Restore</h3>
          <div className="flex items-center gap-2"><Switch id="im" checked={includeMedia} onCheckedChange={setIncludeMedia} /><Label htmlFor="im">Include media filenames in backup / delete media files</Label></div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={backup} className="bg-gradient-primary text-primary-foreground"><Download className="w-4 h-4 mr-1" />Backup Data</Button>
            <label className="inline-flex"><input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} /><span><Button asChild variant="outline"><span><Upload className="w-4 h-4 mr-1" />Restore Data</span></Button></span></label>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-5 space-y-3">
          <h3 className="font-semibold text-destructive flex items-center gap-2"><Trash2 className="w-4 h-4" />Danger Zone</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" onClick={() => setConfirmAction("bookings")}>Delete Bookings</Button>
            <Button variant="destructive" onClick={() => setConfirmAction("expenses")}>Delete Expenses</Button>
            <Button variant="destructive" onClick={() => setConfirmAction("all")}>Delete All Data</Button>
          </div>
        </CardContent></Card>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This permanently deletes the selected data{includeMedia ? " and the associated media files" : ""}. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => confirmAction && deleteScope(confirmAction)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
