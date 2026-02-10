import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Status { id: string; name: string; color: string | null; created_at: string; }

export default function AdminStatuses() {
  const [items, setItems] = useState<Status[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Status | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6b7280");

  const fetch = async () => {
    const { data } = await supabase.from("statuses").select("*").order("created_at");
    setItems(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editItem) {
      const { error } = await supabase.from("statuses").update({ name: name.trim(), color }).eq("id", editItem.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Status diperbarui");
    } else {
      const { error } = await supabase.from("statuses").insert({ name: name.trim(), color });
      if (error) { toast.error(error.message); return; }
      toast.success("Status ditambahkan");
    }
    setOpen(false); setEditItem(null); setName(""); setColor("#6b7280"); fetch();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("statuses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status dihapus"); fetch();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Kelola Status</h1>
          <Button onClick={() => { setEditItem(null); setName(""); setColor("#6b7280"); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Tambah Status
          </Button>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Status</TableHead>
                <TableHead>Warna</TableHead>
                <TableHead className="w-24">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Belum ada status</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge style={{ backgroundColor: item.color || undefined }} className="text-white">{item.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: item.color || "#6b7280" }} />
                      <span className="text-xs text-muted-foreground">{item.color}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditItem(item); setName(item.name); setColor(item.color || "#6b7280"); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Edit Status" : "Tambah Status"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Status</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Masukkan nama status" />
            </div>
            <div className="space-y-2">
              <Label>Warna</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={color} onChange={e => setColor(e.target.value)} className="w-32" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>{editItem ? "Simpan" : "Tambah"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
