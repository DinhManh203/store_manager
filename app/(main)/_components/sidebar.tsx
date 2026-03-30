"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, ShieldCheck, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navigationItems = [
  { label: "Bảng điều khiển", href: "/", icon: LayoutDashboard },
  { label: "Quản lý kho", href: "/storage", icon: Store },
  { label: "Cài đặt", href: "/settings", icon: Settings },
];

type SidebarProps = {
  isOpen: boolean;
};

const Sidebar = ({ isOpen }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border/70 bg-card/80 px-4 py-5 backdrop-blur transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="mb-8 flex items-center justify-between px-1">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Bảng quản trị
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Vận hành kho</h1>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <ShieldCheck className="size-3.5" />
          Bảo mật
        </Badge>
      </div>

      <nav className="space-y-1.5">
        {navigationItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-border/70 bg-muted/40 p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Hôm nay
        </p>
        <p className="mt-1 text-sm font-medium">12 yêu cầu chờ duyệt</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Yêu cầu tồn kho và mua hàng đang cần quản trị viên xem xét.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
