import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Website { id: string; name: string; created_at: string; }

export default function AdminWebsites() {
  const [items, setItems] = useState<Website[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Website | null>(null);
  const [name, setName] = useState("");

  const fetch = async () => {
    const { data } = await supabase.from("websites").select("*").order("created_at");
    setItems(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editItem) {
      const { error } = await supabase.from("websites").update({ name: name.trim() }).eq("id", editItem.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Website diperbarui");
    } else {
      const { error } = await supabase.from("websites").insert({ name: name.trim() });
      if (error) { toast.error(error.message); return; }
      toast.success("Website ditambahkan");
    }
    setOpen(false); setEditItem(null); setName(""); fetch();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("websites").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Website dihapus"); fetch();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Kelola Website</h1>
          <Button onClick={() => { setEditItem(null); setName(""); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Tambah Website
          </Button>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Website</TableHead>
                <TableHead className="w-24">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">Belum ada website</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditItem(item); setName(item.name); setOpen(true); }}>
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
          <DialogHeader><DialogTitle>{editItem ? "Edit Website" : "Tambah Website"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Website</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Masukkan nama website" />
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
