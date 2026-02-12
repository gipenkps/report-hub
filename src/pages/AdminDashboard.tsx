import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Download, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
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

export default function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selected, setSelected] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchReports = async () => {
    setLoading(true);
    let query = supabase
      .from("reports")
      .select("*, websites(name), statuses(name, color)")
      .order("created_at", { ascending: false });

    if (dateFrom) query = query.gte("issue_date", format(dateFrom, "yyyy-MM-dd"));
    if (dateTo) query = query.lte("issue_date", format(dateTo, "yyyy-MM-dd"));

    const { data } = await query;
    setReports((data as unknown as Report[]) || []);
    setSelectedIds(new Set());
    setLoading(false);
  };

  useEffect(() => {
    supabase.from("statuses").select("id, name, color").then(({ data }) => {
      if (data) setStatuses(data);
    });
  }, []);

  useEffect(() => { fetchReports(); }, [dateFrom, dateTo]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === reports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reports.map(r => r.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("reports").delete().in("id", ids);
    if (error) {
      toast.error("Gagal menghapus: " + error.message);
    } else {
      toast.success(`${ids.length} laporan berhasil dihapus`);
      fetchReports();
    }
  };

  const deleteAll = async () => {
    if (reports.length === 0) return;
    const ids = reports.map(r => r.id);
    const { error } = await supabase.from("reports").delete().in("id", ids);
    if (error) {
      toast.error("Gagal menghapus: " + error.message);
    } else {
      toast.success("Semua laporan berhasil dihapus");
      fetchReports();
    }
  };

  const updateStatus = async (reportId: string, statusId: string) => {
    const { error } = await supabase.from("reports").update({ status_id: statusId }).eq("id", reportId);
    if (error) {
      toast.error("Gagal update status: " + error.message);
    } else {
      toast.success("Status berhasil diubah");
      fetchReports();
    }
  };

  const exportCSV = () => {
    const headers = ["ID", "Username", "WhatsApp", "Tanggal Kendala", "Kendala", "Website", "Isi Kendala", "Status", "Dibuat"];
    const rows = reports.map(r => [
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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Dashboard Laporan</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <DateFilter label="Dari" date={dateFrom} setDate={setDateFrom} />
            <DateFilter label="Sampai" date={dateTo} setDate={setDateTo} />
            <Button variant="outline" onClick={exportCSV} disabled={reports.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Bulk actions */}
        {(selectedIds.size > 0 || reports.length > 0) && (
          <div className="flex items-center gap-3 flex-wrap">
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={deleteSelected}>
                <Trash2 className="h-4 w-4 mr-1" /> Hapus Terpilih ({selectedIds.size})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={deleteAll} disabled={reports.length === 0} className="text-destructive border-destructive/30 hover:bg-destructive/10">
              <Trash2 className="h-4 w-4 mr-1" /> Hapus Semua
            </Button>
          </div>
        )}

        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={reports.length > 0 && selectedIds.size === reports.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kendala</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell></TableRow>
              ) : reports.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Belum ada laporan</TableCell></TableRow>
              ) : (
                reports.map(r => (
                  <TableRow key={r.id} className={cn(selectedIds.has(r.id) && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(r.id)}
                        onCheckedChange={() => toggleSelect(r.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell>{r.username}</TableCell>
                    <TableCell>{r.issue_date}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.issue_title}</TableCell>
                    <TableCell>{r.websites?.name || "-"}</TableCell>
                    <TableCell>
                      <Select value={r.status_id || ""} onValueChange={(val) => updateStatus(r.id, val)}>
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue>
                            {r.statuses ? (
                              <Badge style={{ backgroundColor: r.statuses.color || undefined }} className="text-white text-xs">
                                {r.statuses.name}
                              </Badge>
                            ) : "Pilih"}
                          </SelectValue>
                        </SelectTrigger>
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
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setSelected(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detail Laporan {selected?.id}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Detail label="Username" value={selected.username} />
              <Detail label="WhatsApp" value={selected.whatsapp} />
              <Detail label="Tanggal Kendala" value={selected.issue_date} />
              <Detail label="Kendala" value={selected.issue_title} />
              <Detail label="Website" value={selected.websites?.name || "-"} />
              <Detail label="Status" value={selected.statuses?.name || "-"} />
              <div>
                <span className="font-medium text-muted-foreground">Isi Kendala:</span>
                <p className="mt-1 whitespace-pre-wrap">{selected.issue_description}</p>
              </div>
              {selected.image_url && (
                <div>
                  <span className="font-medium text-muted-foreground">Gambar:</span>
                  <img src={selected.image_url} alt="Bukti" className="mt-2 rounded-lg max-h-64 object-contain" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-muted-foreground min-w-[130px]">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function DateFilter({ label, date, setDate }: { label: string; date: Date | undefined; setDate: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
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
