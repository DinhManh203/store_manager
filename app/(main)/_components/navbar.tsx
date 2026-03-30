"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Search,
  Sun,
  UserCircle2,
} from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

type NavbarProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
};

const Navbar = ({ isSidebarOpen, onToggleSidebar }: NavbarProps) => {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === "dark";
  const authName =
    mounted && typeof window !== "undefined"
      ? window.localStorage.getItem("auth_username") || "Người dùng"
      : "Người dùng";
  const authRole =
    mounted && typeof window !== "undefined"
      ? window.localStorage.getItem("auth_role") || "Chưa xác định"
      : "Chưa xác định";

  const handleToggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const handleOpenProfile = () => {
    router.push("/profile");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Continue sign-out on client even if API call fails.
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("auth_token");
        window.localStorage.removeItem("auth_role");
        window.localStorage.removeItem("auth_username");
      }
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur transition-[left] duration-300",
        isSidebarOpen ? "md:left-72" : "md:left-0"
      )}
    >
      <div className="mx-auto flex h-16 items-center gap-3 px-4 md:h-18 md:px-6 lg:px-8">
        <Button
          variant="outline"
          size="icon"
          className="cursor-pointer"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Thu gọn thanh bên" : "Mở rộng thanh bên"}
        >
          {isSidebarOpen ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </Button>

        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Quản trị viên
          </p>
          <h2 className="truncate text-lg font-semibold">Tổng quan bảng điều khiển</h2>
        </div>

        <div className="hidden w-72 shrink-0 md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Tìm đơn hàng, sản phẩm, người dùng..." className="pl-8" />
          </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="cursor-pointer"
          onClick={handleToggleTheme}
          aria-label="Đổi giao diện sáng/tối"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <Button variant="outline" size="icon" aria-label="Thông báo">
          <Bell className="size-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hidden cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-left transition-colors hover:bg-muted md:flex"
              aria-label="Mở menu tài khoản"
            >
              <div className="size-7 rounded-full bg-primary/10" />
              <div className="leading-tight">
                <p className="text-xs font-medium">{authName}</p>
                <p className="text-[11px] text-muted-foreground">{authRole}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleOpenProfile} className="cursor-pointer">
              <UserCircle2 className="size-4" />
              Hồ sơ cá nhân
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={handleLogout}
              className="cursor-pointer"
            >
              <LogOut className="size-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2 md:hidden">
          <Link href="/" className="text-xs font-medium text-muted-foreground">
            Trang chủ
          </Link>
          <Link href="/settings" className="text-xs font-medium text-muted-foreground">
            Cài đặt
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
