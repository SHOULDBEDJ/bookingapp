import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Pencil, Camera, Image as ImgIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadFile, publicUrl } from "@/lib/storage";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authed/gallery")({ component: GalleryPage });

function GalleryPage() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [open, setOpen] = useState<any>(null);
  const [del, setDel] = useState<any>(null);

  const load = async () => { const { data } = await supabase.from("albums").select("*, album_media(storage_path, media_type)").order("created_at", { ascending: false }); setAlbums(data || []); };
  useEffect(() => { load(); }, []);
  const create = async () => { if (!name.trim()) return; await supabase.from("albums").insert({ name: name.trim() }); setName(""); load(); toast.success("Album created"); };
  const rename = async (a: any) => { const n = prompt("Rename album", a.name); if (n) { await supabase.from("albums").update({ name: n }).eq("id", a.id); load(); } };
  const doDelete = async () => { await supabase.from("albums").delete().eq("id", del.id); setDel(null); load(); };

  return (
    <div>
      <PageHeader title="Gallery" subtitle="Albums of photos & videos" />
      <div className="flex gap-2 mb-4"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New album name..." className="max-w-sm" /><Button onClick={create} className="bg-gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" />Create</Button></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {albums.map((a) => {
          const cover = a.album_media?.find((m: any) => m.media_type === "image")?.storage_path;
          return (
            <Card key={a.id} className="overflow-hidden bg-gradient-card shadow-brand cursor-pointer group">
              <div onClick={() => setOpen(a)} className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                {cover ? <img src={publicUrl("gallery", cover)} className="w-full h-full object-cover group-hover:scale-105 transition" alt="" /> : <ImgIcon className="w-10 h-10 text-muted-foreground" />}
              </div>
              <div className="p-3 flex justify-between items-center">
                <div className="min-w-0"><p className="font-semibold truncate">{a.name}</p><p className="text-xs text-muted-foreground">{a.album_media?.length || 0} items</p></div>
                <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => rename(a)}><Pencil className="w-4 h-4" /></Button><Button size="sm" variant="ghost" onClick={() => setDel(a)}><Trash2 className="w-4 h-4 text-destructive" /></Button></div>
              </div>
            </Card>
          );
        })}
        {albums.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No albums yet.</p>}
      </div>

      {open && <AlbumView album={open} onClose={() => { setOpen(null); load(); }} />}
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete album?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AlbumView({ album, onClose }: { album: any; onClose: () => void }) {
  const [media, setMedia] = useState<any[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const load = async () => { const { data } = await supabase.from("album_media").select("*").eq("album_id", album.id).order("created_at"); setMedia(data || []); };
  useEffect(() => { load(); }, [album.id]);

  const onFiles = async (list: FileList | null) => {
    const arr = list ? Array.from(list) : [];
    if (!arr.length) return;
    setProgress({ done: 0, total: arr.length });
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      const path = await uploadFile("gallery", f, f.name);
      await supabase.from("album_media").insert({ album_id: album.id, storage_path: path, media_type: f.type.startsWith("video") ? "video" : "image" });
      setProgress({ done: i + 1, total: arr.length });
    }
    setProgress(null); load(); toast.success("Uploaded");
  };

  const removeMedia = async (m: any) => { await supabase.from("album_media").delete().eq("id", m.id); load(); };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{album.name}</DialogTitle></DialogHeader>
        <div className="flex gap-2 mb-3">
          <Button variant="outline" onClick={() => camRef.current?.click()}><Camera className="w-4 h-4 mr-1" />Camera</Button>
          <Button variant="outline" onClick={() => galRef.current?.click()}><ImgIcon className="w-4 h-4 mr-1" />Gallery/Device</Button>
          <input ref={camRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => onFiles(e.target.files)} />
          <input ref={galRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        </div>
        {progress && (
          <div className="mb-3 p-3 rounded-lg bg-muted">
            <p className="text-sm mb-1">Uploading {progress.done} of {progress.total}</p>
            <Progress value={(progress.done / progress.total) * 100} />
          </div>
        )}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {media.map((m, i) => (
            <div key={m.id} className="relative aspect-square rounded-lg overflow-hidden border group cursor-pointer" onClick={() => setViewer(i)}>
              {m.media_type === "video" ? <video src={publicUrl("gallery", m.storage_path)} className="w-full h-full object-cover" /> : <img src={publicUrl("gallery", m.storage_path)} className="w-full h-full object-cover" alt="" />}
              <button onClick={(e) => { e.stopPropagation(); removeMedia(m); }} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
        {viewer !== null && (
          <Carousel media={media} index={viewer} setIndex={setViewer} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Carousel({ media, index, setIndex }: { media: any[]; index: number; setIndex: (n: number | null) => void }) {
  const m = media[index];
  if (!m) return null;
  return (
    <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center" onClick={() => setIndex(null)}>
      <Button size="icon" variant="secondary" className="absolute left-3 top-1/2 -translate-y-1/2 z-10" onClick={(e) => { e.stopPropagation(); setIndex((index - 1 + media.length) % media.length); }}><ChevronLeft /></Button>
      <Button size="icon" variant="secondary" className="absolute right-3 top-1/2 -translate-y-1/2 z-10" onClick={(e) => { e.stopPropagation(); setIndex((index + 1) % media.length); }}><ChevronRight /></Button>
      <Button size="icon" variant="secondary" className="absolute top-3 right-3 z-10" onClick={() => setIndex(null)}><X /></Button>
      <div className="w-full h-full flex items-center justify-center p-8" onClick={(e) => e.stopPropagation()}>
        {m.media_type === "video" ? <video src={publicUrl("gallery", m.storage_path)} controls className="max-w-full max-h-full" /> : <img src={publicUrl("gallery", m.storage_path)} className="max-w-full max-h-full object-contain" alt="" />}
      </div>
    </div>
  );
}
