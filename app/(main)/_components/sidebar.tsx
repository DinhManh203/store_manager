"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  Settings,
  Store,
  Truck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigationItems = [
  { label: "Bảng điều khiển", href: "/", icon: LayoutDashboard },
  { label: "Quản lý kho", href: "/storage", icon: Store },
  { label: "Quản lý chi nhánh", href: "/branches", icon: Building2 },
  { label: "Nhà cung cấp", href: "/suppliers", icon: Truck },
  { label: "Cài đặt", href: "/settings", icon: Settings },
];

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const startTopHeaderLoading = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(new Event("app:top-header-loading-start"));
  };

  const closeSidebarOnMobile = () => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.matchMedia("(max-width: 767px)").matches) {
      onClose();
    }
  };

  useEffect(() => {
    navigationItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="cursor-pointer md:hidden"
          onClick={onClose}
          aria-label="Đóng thanh bên"
        >
          <X className="size-5" />
        </Button>
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
              prefetch
              onMouseEnter={() => router.prefetch(item.href)}
              onFocus={() => router.prefetch(item.href)}
              onClick={() => {
                startTopHeaderLoading();
                closeSidebarOnMobile();
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors will-change-[background-color,color]",
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
