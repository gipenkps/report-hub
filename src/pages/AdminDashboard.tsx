import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Download, Eye, Trash2, Search, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Report {
  id: string;
  username: string;
  whatsapp: string;
  issue_date: string;
  issue_title: string;
  issue_description: string;
  image_url: string | null;
  created_at: string;
  websites: { name: string } | null;
  statuses: { name: string; color: string | null } | null;
  status_id: string | null;
}

interface Status {
  id: string;
  name: string;
  color: string | null;
}

function parseImageUrls(image_url: string | null): string[] {
  if (!image_url) return [];
  try {
    const parsed = JSON.parse(image_url);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // legacy single URL
  }
  return [image_url];
}

export default function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selected, setSelected] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterWebsite, setFilterWebsite] = useState<string>("all");
  const [websites, setWebsites] = useState<{ id: string; name: string }[]>([]);
  const [previewImages, setPreviewImages] = useState<string[] | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    let query = supabase
      .from("reports")
      .select("*, websites(name), statuses(name, color)")
      .order("created_at", { ascending: false });

    if (dateFrom) query = query.gte("issue_date", format(dateFrom, "yyyy-MM-dd"));
    if (dateTo) query = query.lte("issue_date", format(dateTo, "yyyy-MM-dd"));
    if (filterStatus && filterStatus !== "all") query = query.eq("status_id", filterStatus);
    if (filterWebsite && filterWebsite !== "all") query = query.eq("website_id", filterWebsite);

    const { data } = await query;
    setReports((data as unknown as Report[]) || []);
    setSelectedIds(new Set());
    setLoading(false);
  };

  useEffect(() => {
    Promise.all([
      supabase.from("statuses").select("id, name, color"),
      supabase.from("websites").select("id, name"),
    ]).then(([s, w]) => {
      if (s.data) setStatuses(s.data);
      if (w.data) setWebsites(w.data);
    });
  }, []);

  useEffect(() => { fetchReports(); }, [dateFrom, dateTo, filterStatus, filterWebsite]);

  const filtered = reports.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.id.toLowerCase().includes(q) ||
      r.username.toLowerCase().includes(q) ||
      r.whatsapp.includes(q) ||
      r.issue_title.toLowerCase().includes(q) ||
      r.issue_description.toLowerCase().includes(q) ||
      (r.websites?.name || "").toLowerCase().includes(q);
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(r => r.id)));
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("reports").delete().in("id", ids);
    if (error) toast.error("Gagal menghapus: " + error.message);
    else { toast.success(`${ids.length} laporan dihapus`); fetchReports(); }
  };

  const deleteAll = async () => {
    if (filtered.length === 0) return;
    const ids = filtered.map(r => r.id);
    const { error } = await supabase.from("reports").delete().in("id", ids);
    if (error) toast.error("Gagal menghapus: " + error.message);
    else { toast.success("Semua laporan dihapus"); fetchReports(); }
  };

  const updateStatus = async (reportId: string, statusId: string) => {
    const { error } = await supabase.from("reports").update({ status_id: statusId }).eq("id", reportId);
    if (error) toast.error("Gagal update status");
    else { toast.success("Status diubah"); fetchReports(); }
  };

  const exportCSV = () => {
    const headers = ["ID", "Username", "WhatsApp", "Tanggal", "Kendala", "Website", "Deskripsi", "Status", "Dibuat"];
    const rows = filtered.map(r => [
      r.id, r.username, r.whatsapp, r.issue_date, r.issue_title,
      r.websites?.name || "", r.issue_description, r.statuses?.name || "", r.created_at,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Laporan</h1>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari ID, username, kendala..." className="pl-9 h-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <DateFilter label="Dari" date={dateFrom} setDate={setDateFrom} />
          <DateFilter label="Sampai" date={dateTo} setDate={setDateTo} />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterWebsite} onValueChange={setFilterWebsite}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Website" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Website</SelectItem>
              {websites.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
            <span className="text-sm font-medium">{selectedIds.size} dipilih</span>
            <Button variant="destructive" size="sm" onClick={deleteSelected}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Terpilih
            </Button>
            <Button variant="outline" size="sm" onClick={deleteAll} className="text-destructive border-destructive/30 hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Semua
            </Button>
          </div>
        )}

        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10">
                  <Checkbox checked={filtered.length > 0 && selectedIds.size === filtered.length} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kendala</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Memuat data...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Tidak ada laporan ditemukan</TableCell></TableRow>
              ) : (
                filtered.map(r => {
                  const imgs = parseImageUrls(r.image_url);
                  return (
                    <TableRow key={r.id} className={cn(selectedIds.has(r.id) && "bg-primary/5")}>
                      <TableCell><Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.id}</TableCell>
                      <TableCell className="font-medium">{r.username}</TableCell>
                      <TableCell className="text-sm">{r.issue_date}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">{r.issue_title}</TableCell>
                      <TableCell className="text-sm">{r.websites?.name || "-"}</TableCell>
                      <TableCell>
                        {imgs.length > 0 ? (
                          <button onClick={() => setPreviewImages(imgs)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                            <ImageIcon className="h-3.5 w-3.5" /> {imgs.length}
                          </button>
                        ) : <span className="text-xs text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Select value={r.status_id || ""} onValueChange={(val) => updateStatus(r.id, val)}>
                          <SelectTrigger className="h-7 w-[120px] text-xs">
                            <SelectValue>
                              {r.statuses ? (
                                <Badge style={{ backgroundColor: r.statuses.color || undefined }} className="text-white text-[10px] px-1.5 py-0">
                                  {r.statuses.name}
                                </Badge>
                              ) : "Pilih"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || "#6b7280" }} />
                                  {s.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(r)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <div className="text-xs text-muted-foreground">{filtered.length} laporan ditampilkan</div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detail Laporan</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Detail label="ID" value={selected.id} />
              <Detail label="Username" value={selected.username} />
              <Detail label="WhatsApp" value={selected.whatsapp} />
              <Detail label="Tanggal" value={selected.issue_date} />
              <Detail label="Kendala" value={selected.issue_title} />
              <Detail label="Website" value={selected.websites?.name || "-"} />
              <Detail label="Status" value={selected.statuses?.name || "-"} />
              <div>
                <span className="font-medium text-muted-foreground">Deskripsi:</span>
                <p className="mt-1 whitespace-pre-wrap bg-muted/30 rounded-md p-3">{selected.issue_description}</p>
              </div>
              {parseImageUrls(selected.image_url).length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">Gambar:</span>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {parseImageUrls(selected.image_url).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Bukti ${i + 1}`} className="h-24 w-24 rounded-lg object-cover border hover:opacity-80 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImages} onOpenChange={() => setPreviewImages(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>File Lampiran</DialogTitle></DialogHeader>
          <div className="flex gap-3 flex-wrap">
            {previewImages?.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt={`File ${i + 1}`} className="max-h-60 rounded-lg object-contain border hover:opacity-80 transition-opacity" />
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-muted-foreground min-w-[100px]">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function DateFilter({ label, date, setDate }: { label: string; date: Date | undefined; setDate: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("w-[130px] h-9 justify-start text-left font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          {date ? format(date, "dd/MM/yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}
