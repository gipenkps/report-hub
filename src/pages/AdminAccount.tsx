import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { KeyRound, UserPlus, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function AdminAccount() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  const [newEmail, setNewEmail] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [creating, setCreating] = useState(false);

  const [changePassDialog, setChangePassDialog] = useState<AdminUser | null>(null);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  const callEdge = async (body: Record<string, string>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-management`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      }
    );
    return res.json();
  };

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    const result = await callEdge({ action: "list_admins" });
    if (result.admins) setAdmins(result.admins);
    else if (result.error) toast.error(result.error);
    setLoadingAdmins(false);
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleCreateAdmin = async () => {
    if (!newEmail || !newAdminPass) { toast.error("Email dan password wajib diisi"); return; }
    if (newAdminPass.length < 6) { toast.error("Password minimal 6 karakter"); return; }
    setCreating(true);
    const result = await callEdge({ action: "create_admin", email: newEmail, password: newAdminPass });
    if (result.error) toast.error(result.error);
    else { toast.success("Admin baru berhasil dibuat"); setNewEmail(""); setNewAdminPass(""); fetchAdmins(); }
    setCreating(false);
  };

  const handleChangePassword = async () => {
    if (!changePassDialog) return;
    if (newPass.length < 6) { toast.error("Password minimal 6 karakter"); return; }
    if (newPass !== confirmPass) { toast.error("Password tidak cocok"); return; }
    setChangingPass(true);
    const result = await callEdge({ action: "change_password", new_password: newPass, user_id: changePassDialog.id });
    if (result.error) toast.error(result.error);
    else { toast.success("Password berhasil diubah"); setChangePassDialog(null); setNewPass(""); setConfirmPass(""); }
    setChangingPass(false);
  };

  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (!confirm(`Hapus admin ${admin.email}?`)) return;
    const result = await callEdge({ action: "delete_admin", user_id: admin.id });
    if (result.error) toast.error(result.error);
    else { toast.success("Admin berhasil dihapus"); fetchAdmins(); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-2xl font-bold tracking-tight">Kelola Akun Admin</h1>

        {/* Create Admin */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" /> Buat Admin Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@admin.com" className="h-9" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Password</Label>
                <Input type="password" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} placeholder="Min. 6 karakter" className="h-9" />
              </div>
              <div className="flex items-end">
                <Button onClick={handleCreateAdmin} disabled={creating} size="sm" className="h-9">
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> {creating ? "Membuat..." : "Buat"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin List */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Daftar Admin</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Email</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead>Login Terakhir</TableHead>
                  <TableHead className="w-28">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAdmins ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
                ) : admins.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Tidak ada admin</TableCell></TableRow>
                ) : admins.map(admin => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {admin.created_at ? format(new Date(admin.created_at), "dd/MM/yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {admin.last_sign_in_at ? format(new Date(admin.last_sign_in_at), "dd/MM/yyyy HH:mm") : "Belum pernah"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Ganti Password"
                          onClick={() => { setChangePassDialog(admin); setNewPass(""); setConfirmPass(""); }}>
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Hapus Admin"
                          onClick={() => handleDeleteAdmin(admin)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={!!changePassDialog} onOpenChange={() => setChangePassDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ganti Password - {changePassDialog?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Password Baru</Label>
              <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min. 6 karakter" />
            </div>
            <div className="space-y-1">
              <Label>Konfirmasi Password</Label>
              <Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Ulangi password" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleChangePassword} disabled={changingPass}>
              {changingPass ? "Menyimpan..." : "Simpan Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
