"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

const themeOptions = [
  {
    value: "light",
    title: "Sáng",
    description: "Giao diện sáng, phù hợp khi làm việc ban ngày",
    icon: Sun,
  },
  {
    value: "dark",
    title: "Tối",
    description: "Giảm mỏi mắt khi làm việc trong môi trường thiếu sáng",
    icon: Moon,
  },
  {
    value: "system",
    title: "Hệ thống",
    description: "Tự động theo cài đặt sáng/tối của thiết bị",
    icon: Laptop,
  },
] as const;

const themeLabelMap: Record<string, string> = {
  light: "Sáng",
  dark: "Tối",
  system: "Hệ thống",
};

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();

  const currentThemeLabel = mounted
    ? themeLabelMap[resolvedTheme ?? "system"] ?? "Hệ thống"
    : "Đang tải";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Tùy chọn</p>
        <h1 className="text-2xl font-semibold tracking-tight">Cài đặt giao diện</h1>
        <p className="text-sm text-muted-foreground">
          Tùy chỉnh giao diện và hành vi hiển thị của bảng điều khiển quản trị.
        </p>
      </div>

      <Card className="border border-border/70">
        <CardHeader className="border-b border-border/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Chế độ màu sắc</CardTitle>
              <CardDescription>Chuyển đổi giữa Sáng, Tối hoặc Hệ thống.</CardDescription>
            </div>
            <Badge variant="outline">Hiện tại: {currentThemeLabel}</Badge>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 pt-4 md:grid-cols-3">
          {themeOptions.map((option) => {
            const isActive = theme === option.value;
            const Icon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  "hover:bg-muted/60 cursor-pointer",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border/70 bg-background"
                )}
              >
                <div className="mb-3 inline-flex rounded-lg border border-border/70 p-2">
                  <Icon className="size-4" />
                </div>
                <p className="text-sm font-semibold">{option.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

