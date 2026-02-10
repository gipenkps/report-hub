import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Save } from "lucide-react";
import { toast } from "sonner";

interface Settings {
  id: string;
  site_title: string | null;
  favicon_url: string | null;
  background_url: string | null;
  logo_url: string | null;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [siteTitle, setSiteTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    const { data } = await supabase.from("site_settings").select("*").maybeSingle();
    if (data) {
      setSettings(data);
      setSiteTitle(data.site_title || "");
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const uploadFile = async (file: File, field: "favicon_url" | "background_url" | "logo_url") => {
    if (!settings) return;
    const ext = file.name.split(".").pop();
    const path = `${field}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
    if (uploadError) { toast.error(uploadError.message); return; }
    const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
    const { error } = await supabase.from("site_settings").update({ [field]: urlData.publicUrl }).eq("id", settings.id);
    if (error) { toast.error(error.message); return; }
    toast.success("File berhasil diupload");
    fetchSettings();
  };

  const handleSaveTitle = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({ site_title: siteTitle }).eq("id", settings.id);
    if (error) toast.error(error.message);
    else toast.success("Judul berhasil disimpan");
    setSaving(false);
  };

  const FileUploadField = ({ label, field, currentUrl }: { label: string; field: "favicon_url" | "background_url" | "logo_url"; currentUrl: string | null }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      {currentUrl && <img src={currentUrl} alt={label} className="h-16 w-auto rounded-md object-contain border p-1" />}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => document.getElementById(`upload-${field}`)?.click()}>
          <Upload className="h-4 w-4 mr-2" /> Upload
        </Button>
        <input id={`upload-${field}`} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, field); }} />
      </div>
    </div>
  );

  if (!settings) return <AdminLayout><p className="text-muted-foreground">Memuat pengaturan...</p></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold">Pengaturan SEO & Tampilan</h1>

        <Card>
          <CardHeader><CardTitle className="text-lg">Judul Website</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={siteTitle} onChange={e => setSiteTitle(e.target.value)} placeholder="Judul website" />
            <Button onClick={handleSaveTitle} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> Simpan Judul
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Upload Gambar</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <FileUploadField label="Favicon" field="favicon_url" currentUrl={settings.favicon_url} />
            <FileUploadField label="Logo" field="logo_url" currentUrl={settings.logo_url} />
            <FileUploadField label="Background" field="background_url" currentUrl={settings.background_url} />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
