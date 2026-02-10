import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
}

export default function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selected, setSelected] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

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
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, [dateFrom, dateTo]);

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

        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell></TableRow>
              ) : reports.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada laporan</TableCell></TableRow>
              ) : (
                reports.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell>{r.username}</TableCell>
                    <TableCell>{r.issue_date}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.issue_title}</TableCell>
                    <TableCell>{r.websites?.name || "-"}</TableCell>
                    <TableCell>
                      {r.statuses ? (
                        <Badge style={{ backgroundColor: r.statuses.color || undefined }} className="text-white">
                          {r.statuses.name}
                        </Badge>
                      ) : "-"}
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
