'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  BarChart3,
  Camera,
  Gauge,
  Home,
  Settings,
  Users,
  Image as ImageIcon,
  LogOut,
  Ticket,
} from "lucide-react";
import { Button } from "../../components/ui/button";

const navItems = [
  { label: "Overview", icon: Gauge, href: "/admin", roles: ['superadmin'] },
  { label: "Templates", icon: ImageIcon, href: "/admin/templates", roles: ['superadmin'] },
  { label: "Vouchers", icon: Ticket, href: "/admin/vouchers", roles: ['superadmin', 'operator'] },
  { label: "Users", icon: Users, href: "/admin/users", roles: ['superadmin'] },
  { label: "Settings", icon: Settings, href: "/admin/settings", roles: ['superadmin'] },
];

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createSupabaseBrowserClient();
  const [role, setRole] = useState<'superadmin' | 'operator' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
           router.replace('/admin/login');
           return;
        }

        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        const userRole = adminUser?.role || 'operator';
        setRole(userRole);

        // Basic route protection
        // If user is operator and tries to access non-operator pages, redirect to vouchers
        if (userRole === 'operator' && !pathname.startsWith('/admin/vouchers')) {
           router.replace('/admin/vouchers');
        }

      } catch (error) {
        console.error("Error fetching role", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, [supabase, router, pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  };

  if (loading) {
     return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const filteredNavItems = navItems.filter(item => role && item.roles.includes(role));

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
            {filteredNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                   pathname === item.href 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto px-3 py-2">
              <p className="text-xs text-muted-foreground mb-2">
                Logged in as: <span className="font-semibold capitalize">{role}</span>
              </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </aside>
        <main className="flex-1 overflow-y-auto bg-muted/10 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
