import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Upload, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  const [submitted, setSubmitted] = useState(false);

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
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengirim laporan";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 bg-muted/30"
        style={settings?.background_url ? { backgroundImage: `url(${settings.background_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <div className="w-full max-w-md text-center space-y-6 bg-card/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-border/50">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Laporan Terkirim!</h2>
            <p className="text-muted-foreground">Terima kasih, laporan Anda telah berhasil dikirim dan akan segera ditindaklanjuti.</p>
          </div>
          <Button onClick={() => setSubmitted(false)} className="w-full">
            Kirim Laporan Baru
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-muted/30"
      style={settings?.background_url ? { backgroundImage: `url(${settings.background_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      <div className="w-full max-w-2xl bg-card/95 backdrop-blur-sm rounded-2xl shadow-xl border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="bg-primary/5 border-b border-border/50 px-6 py-5 md:px-8 md:py-6">
          <div className="flex items-center gap-3">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-10 w-auto object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                {settings?.site_title || "Laporkan Masalah"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Isi form di bawah untuk melaporkan kendala Anda</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-6 md:px-8 md:py-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Row 1: Username & WA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Username <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="Masukkan username" className="h-10" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="whatsapp" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Nomor WhatsApp <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="08xxxxxxxxxx" className="h-10" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Row 2: Tanggal & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="issue_date" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-sm font-medium">Tanggal Kendala <span className="text-destructive">*</span></FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full h-10 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
                    <FormLabel className="text-sm font-medium">Nama Website <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Pilih website" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {websites.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Kendala */}
              <FormField control={form.control} name="issue_title" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Kendala <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="Judul singkat kendala yang dialami" className="h-10" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Isi Kendala */}
              <FormField control={form.control} name="issue_description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Isi Kendala <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Jelaskan kendala Anda secara detail..."
                      rows={4}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Status */}
              <FormField control={form.control} name="status_id" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Status <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Pilih status" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statuses.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color || "#6b7280" }} />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Upload Gambar */}
              <div>
                <label className="text-sm font-medium mb-2 block">Upload Gambar <span className="text-xs text-muted-foreground font-normal">(opsional)</span></label>
                <div
                  className="border-2 border-dashed border-input rounded-xl p-5 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/30"
                  onClick={() => document.getElementById("image-upload")?.click()}
                >
                  {imagePreview ? (
                    <div className="space-y-2">
                      <img src={imagePreview} alt="Preview" className="max-h-36 mx-auto rounded-lg object-contain" />
                      <p className="text-xs text-muted-foreground">Klik untuk mengganti gambar</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Klik untuk upload gambar</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, JPEG (max 5MB)</p>
                      </div>
                    </div>
                  )}
                  <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </div>
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full h-11 text-base font-semibold rounded-xl" disabled={submitting}>
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Mengirim..." : "Kirim Laporan"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
