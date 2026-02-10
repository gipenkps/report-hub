import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Upload, Send, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const formSchema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi").max(100),
  whatsapp: z.string().trim().min(1, "Nomor WA wajib diisi").regex(/^[0-9+\-\s]{8,20}$/, "Format nomor WA tidak valid"),
  issue_date: z.date({ required_error: "Tanggal kendala wajib dipilih" }),
  issue_title: z.string().trim().min(1, "Judul kendala wajib diisi").max(200),
  website_id: z.string().min(1, "Nama website wajib dipilih"),
  issue_description: z.string().trim().min(1, "Isi kendala wajib diisi").max(2000),
  status_id: z.string().min(1, "Status wajib dipilih"),
});

type FormValues = z.infer<typeof formSchema>;

interface Website { id: string; name: string; }
interface Status { id: string; name: string; color: string | null; }
interface SiteSettings { site_title: string | null; logo_url: string | null; background_url: string | null; }

export default function Index() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", whatsapp: "", issue_title: "", issue_description: "" },
  });

  useEffect(() => {
    const fetchData = async () => {
      const [w, s, st] = await Promise.all([
        supabase.from("websites").select("id, name"),
        supabase.from("statuses").select("id, name, color"),
        supabase.from("site_settings").select("site_title, logo_url, background_url").maybeSingle(),
      ]);
      if (w.data) setWebsites(w.data);
      if (s.data) setStatuses(s.data);
      if (st.data) setSettings(st.data);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (settings?.site_title) document.title = settings.site_title;
  }, [settings]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 5MB");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      let image_url: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("reports").upload(path, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("reports").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }

      const { error } = await supabase.from("reports").insert({
        username: values.username,
        whatsapp: values.whatsapp,
        issue_date: format(values.issue_date, "yyyy-MM-dd"),
        issue_title: values.issue_title,
        website_id: values.website_id,
        issue_description: values.issue_description,
        status_id: values.status_id,
        image_url,
      });

      if (error) throw error;
      toast.success("Laporan berhasil dikirim!");
      form.reset();
      setImageFile(null);
      setImagePreview(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengirim laporan";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={settings?.background_url ? { backgroundImage: `url(${settings.background_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      <Card className="w-full max-w-2xl shadow-xl border-0 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-3 pb-2">
          {settings?.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="h-14 w-auto mx-auto object-contain" />
          )}
          <CardTitle className="text-2xl font-bold tracking-tight flex items-center justify-center gap-2">
            <AlertCircle className="h-6 w-6 text-primary" />
            {settings?.site_title || "Laporkan Masalah"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Silakan isi form di bawah untuk melaporkan kendala Anda</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username *</FormLabel>
                    <FormControl><Input placeholder="Masukkan username" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="whatsapp" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor WhatsApp *</FormLabel>
                    <FormControl><Input placeholder="08xxxxxxxxxx" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="issue_date" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Tanggal Kendala *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yyyy") : "Pilih tanggal"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="website_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Website *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Pilih website" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {websites.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="issue_title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kendala (Judul) *</FormLabel>
                  <FormControl><Input placeholder="Judul singkat kendala" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="issue_description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Isi Kendala *</FormLabel>
                  <FormControl><Textarea placeholder="Jelaskan kendala Anda secara detail..." rows={4} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="status_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div>
                <label className="text-sm font-medium mb-2 block">Upload Gambar</label>
                <div className="border-2 border-dashed border-input rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => document.getElementById("image-upload")?.click()}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto rounded-md object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="h-8 w-8" />
                      <span className="text-sm">Klik untuk upload gambar (max 5MB)</span>
                    </div>
                  )}
                  <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </div>
              </div>

              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={submitting}>
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Mengirim..." : "Kirim Laporan"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
