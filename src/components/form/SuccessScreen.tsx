import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  settings: { background_url: string | null } | null;
  onReset: () => void;
  btnColor: string;
}

export default function SuccessScreen({ settings, onReset, btnColor }: Props) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={settings?.background_url ? { backgroundImage: `url(${settings.background_url})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundColor: "#f3f4f6" }}
    >
      <div className="w-full max-w-md text-center space-y-6 bg-white rounded-2xl shadow-xl p-8 border">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Laporan Terkirim!</h2>
          <p className="text-muted-foreground">Terima kasih, laporan Anda telah berhasil dikirim dan akan segera ditindaklanjuti.</p>
        </div>
        <Button onClick={onReset} className="w-full" style={{ backgroundColor: btnColor }}>
          Kirim Laporan Baru
        </Button>
      </div>
    </div>
  );
}
