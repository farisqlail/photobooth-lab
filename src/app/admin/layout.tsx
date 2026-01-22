import Link from "next/link";
import {
  BarChart3,
  Camera,
  Gauge,
  Home,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "../../components/ui/button";

const navItems = [
  { label: "Overview", icon: Gauge, href: "/admin" },
  { label: "Sessions", icon: Camera, href: "/admin" },
  { label: "Guests", icon: Users, href: "/admin" },
  { label: "Analytics", icon: BarChart3, href: "/admin" },
];

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-border bg-card px-4 py-6 md:flex">
          <div className="flex items-center gap-3 px-3 text-lg font-semibold text-foreground">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BarChart3 className="h-5 w-5" />
            </span>
            Booth Admin
          </div>
          <nav className="mt-8 flex flex-1 flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <Button variant="secondary" size="sm">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </aside>
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
            <div>
              <p className="text-sm text-muted-foreground">Dashboard</p>
              <h1 className="text-xl font-semibold text-foreground">Admin Hub</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/booth">
                  <Camera className="h-4 w-4" />
                  Booth
                </Link>
              </Button>
            </div>
          </header>
          <main className="flex-1 px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
