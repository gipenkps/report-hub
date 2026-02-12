import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Upload, Send, User, Phone, AlertTriangle, Globe, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import SuccessScreen from "@/components/form/SuccessScreen";

const formSchema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi").max(100),
  whatsapp: z.string().trim().min(1, "Nomor WA wajib diisi").regex(/^[0-9+\-\s]{8,20}$/, "Format nomor WA tidak valid"),
  issue_date: z.date({ required_error: "Tanggal kendala wajib dipilih" }),
  issue_title: z.string().trim().min(1, "Judul kendala wajib diisi").max(200),
  website_id: z.string().min(1, "Nama website wajib dipilih"),
  issue_description: z.string().trim().min(1, "Isi kendala wajib diisi").max(2000),
});

type FormValues = z.infer<typeof formSchema>;

interface Website { id: string; name: string; }
interface SiteSettings {
  site_title: string | null;
  logo_url: string | null;
  background_url: string | null;
  button_color: string | null;
  border_color: string | null;
}

export default function Index() {
  const [websites, setWebsites] = useState<Website[]>([]);
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
      const [w, st] = await Promise.all([
        supabase.from("websites").select("id, name"),
        supabase.from("site_settings").select("site_title, logo_url, background_url, button_color, border_color").maybeSingle(),
      ]);
      if (w.data) setWebsites(w.data);
      if (st.data) setSettings(st.data as SiteSettings);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (settings?.site_title) document.title = settings.site_title;
  }, [settings]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error("Ukuran file maksimal 5MB"); return; }
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

      const { data: diprosesStatus } = await supabase
        .from("statuses").select("id").eq("name", "Diproses").maybeSingle();

      const { error } = await supabase.from("reports").insert({
        username: values.username,
        whatsapp: values.whatsapp,
        issue_date: format(values.issue_date, "yyyy-MM-dd"),
        issue_title: values.issue_title,
        website_id: values.website_id,
        issue_description: values.issue_description,
        status_id: diprosesStatus?.id || null,
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

  const btnColor = settings?.button_color || "#f59e0b";
  const brdColor = settings?.border_color || "#d1d5db";

  if (submitted) {
    return <SuccessScreen settings={settings} onReset={() => setSubmitted(false)} btnColor={btnColor} />;
  }

  const iconBox = "flex items-center justify-center w-10 h-10 rounded-l-md bg-muted/60 border-r shrink-0";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start p-4 md:p-8"
      style={settings?.background_url ? { backgroundImage: `url(${settings.background_url})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundColor: "#f3f4f6" }}
    >
      {/* Logo */}
      {settings?.logo_url && (
        <img src={settings.logo_url} alt="Logo" className="h-16 md:h-20 w-auto object-contain mb-4 mt-4 drop-shadow-lg" />
      )}

      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden" style={{ borderColor: brdColor, borderWidth: 2 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b" style={{ borderColor: brdColor }}>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">{settings?.site_title || "Laporkan Masalah"}</span>
          </div>
        </div>

        {/* Form */}
        <div className="px-5 py-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              {/* Row 1: Username & WA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField control={form.control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${brdColor}` }}>
                        <div className={iconBox}><User className="h-4 w-4 text-muted-foreground" /></div>
                        <Input placeholder="Username" className="border-0 shadow-none rounded-none h-10 focus-visible:ring-0" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="whatsapp" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${brdColor}` }}>
                        <div className={iconBox}><Phone className="h-4 w-4 text-muted-foreground" /></div>
                        <Input placeholder="Nomor WA aktif (cth: 0812364896)" className="border-0 shadow-none rounded-none h-10 focus-visible:ring-0" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Tanggal Kendala */}
              <FormField control={form.control} name="issue_date" render={({ field }) => (
                <FormItem>
                  <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${brdColor}` }}>
                    <div className={iconBox}><CalendarIcon className="h-4 w-4 text-muted-foreground" /></div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="ghost" className={cn("w-full h-10 justify-start rounded-none font-normal hover:bg-transparent", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yyyy") : "Tanggal Kendala"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Kendala */}
              <FormField control={form.control} name="issue_title" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${brdColor}` }}>
                      <div className={iconBox}><AlertTriangle className="h-4 w-4 text-muted-foreground" /></div>
                      <Input placeholder="Kendala" className="border-0 shadow-none rounded-none h-10 focus-visible:ring-0" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Pilih Situs */}
              <FormField control={form.control} name="website_id" render={({ field }) => (
                <FormItem>
                  <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${brdColor}` }}>
                    <div className={iconBox}><Globe className="h-4 w-4 text-muted-foreground" /></div>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-0 shadow-none rounded-none h-10 focus:ring-0">
                          <SelectValue placeholder="Pilih Situs" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {websites.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Isi Kendala */}
              <FormField control={form.control} name="issue_description" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${brdColor}` }}>
                      <div className="flex items-start justify-center w-10 pt-3 bg-muted/60 border-r shrink-0">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Textarea placeholder="Jelaskan kendala Anda secara detail..." rows={5} className="border-0 shadow-none rounded-none resize-none focus-visible:ring-0" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Upload Gambar */}
              <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${brdColor}` }}>
                <Button type="button" variant="ghost" className="rounded-none h-10 text-sm font-normal px-4 border-r" style={{ borderColor: brdColor }}
                  onClick={() => document.getElementById("image-upload")?.click()}>
                  Choose File
                </Button>
                <div className="flex-1 flex items-center px-3 text-sm text-muted-foreground truncate">
                  {imageFile ? imageFile.name : "No file chosen"}
                </div>
                <div className="flex items-center justify-center w-10 bg-muted/60 border-l" style={{ borderColor: brdColor }}>
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </div>
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="max-h-28 rounded-md object-contain" />
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-bold rounded-lg"
                style={{ backgroundColor: btnColor, borderColor: btnColor }}
                disabled={submitting}
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Mengirim..." : "Kirim"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
