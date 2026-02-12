import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function AdminAccount() {
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [creating, setCreating] = useState(false);

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

  const handleChangePassword = async () => {
    if (newPass.length < 6) { toast.error("Password minimal 6 karakter"); return; }
    if (newPass !== confirmPass) { toast.error("Password tidak cocok"); return; }
    setChangingPass(true);
    const result = await callEdge({ action: "change_password", new_password: newPass });
    if (result.error) toast.error(result.error);
    else { toast.success("Password berhasil diubah"); setNewPass(""); setConfirmPass(""); }
    setChangingPass(false);
  };

  const handleCreateAdmin = async () => {
    if (!newEmail || !newAdminPass) { toast.error("Email dan password wajib diisi"); return; }
    setCreating(true);
    const result = await callEdge({ action: "create_admin", email: newEmail, password: newAdminPass });
    if (result.error) toast.error(result.error);
    else { toast.success("Admin baru berhasil dibuat"); setNewEmail(""); setNewAdminPass(""); }
    setCreating(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold">Kelola Akun</h1>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><KeyRound className="h-5 w-5" /> Ganti Password</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Password Baru</Label>
              <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Minimal 6 karakter" />
            </div>
            <div>
              <Label>Konfirmasi Password</Label>
              <Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Ulangi password baru" />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPass}>
              {changingPass ? "Menyimpan..." : "Simpan Password"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><UserPlus className="h-5 w-5" /> Buat Admin Baru</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@admin.com" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} placeholder="Minimal 6 karakter" />
            </div>
            <Button onClick={handleCreateAdmin} disabled={creating}>
              {creating ? "Membuat..." : "Buat Admin"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
