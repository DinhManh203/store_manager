"use client";

import Link from "next/link";
import { Bell, ChevronLeft, ChevronRight, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

type NavbarProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
};

const Navbar = ({ isSidebarOpen, onToggleSidebar }: NavbarProps) => {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === "dark";

  const handleToggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
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
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isSidebarOpen ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </Button>

        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Administrator
          </p>
          <h2 className="truncate text-lg font-semibold">Dashboard Overview</h2>
        </div>

        <div className="hidden w-72 shrink-0 md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search order, product, user..." className="pl-8" />
          </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="cursor-pointer"
          onClick={handleToggleTheme}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <Button variant="outline" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>

        <div className="hidden items-center gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 md:flex">
          <div className="size-7 rounded-full bg-primary/10" />
          <div className="leading-tight">
            <p className="text-xs font-medium">Admin</p>
            <p className="text-[11px] text-muted-foreground">Super User</p>
          </div>
        </div>

        <Badge variant="outline" className="hidden md:inline-flex">
          Q1 Reports
        </Badge>

        <div className="flex items-center gap-2 md:hidden">
          <Link href="/" className="text-xs font-medium text-muted-foreground">
            Home
          </Link>
          <Link href="/settings" className="text-xs font-medium text-muted-foreground">
            Settings
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
