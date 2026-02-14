import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Globe, Tag, Settings, LogOut, Users, Moon, Sun, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/websites", icon: Globe, label: "Kelola Website" },
  { to: "/admin/statuses", icon: Tag, label: "Kelola Status" },
  { to: "/admin/settings", icon: Settings, label: "Pengaturan" },
  { to: "/admin/account", icon: Users, label: "Kelola Akun" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const sidebar = (
    <>
      <div className="px-5 py-4 border-b border-border">
        <h1 className="text-base font-bold text-foreground tracking-tight">Admin Panel</h1>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{user?.email}</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              location.pathname === item.to
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-border space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground h-9"
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive h-9"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-card border-r border-border flex-col fixed inset-y-0 left-0 z-30">
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-card border-r border-border flex flex-col z-50">
            <div className="absolute right-2 top-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="flex-1 md:ml-60">
        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">Admin Panel</span>
        </div>
        <div className="p-4 md:p-6 overflow-auto min-h-screen bg-muted/30">{children}</div>
      </main>
    </div>
  );
}
