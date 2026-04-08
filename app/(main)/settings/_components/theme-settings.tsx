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

export default function ThemeSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();

  const currentThemeLabel = mounted
    ? themeLabelMap[resolvedTheme ?? "system"] ?? "Hệ thống"
    : "Đang tải";

  return (
    <Card className="border border-border/70 shadow-sm">
      <CardHeader className="border-b border-border/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Chế độ màu sắc</CardTitle>
            <CardDescription>Chuyển đổi giữa Sáng, Tối hoặc Hệ thống.</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit">
            Hiện tại: {currentThemeLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-3">
        {themeOptions.map((option) => {
          const isActive = theme === option.value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={cn(
                "cursor-pointer rounded-xl border p-4 text-left transition-all",
                "hover:-translate-y-0.5 hover:bg-muted/60",
                isActive
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/70 bg-background"
              )}
            >
              <div className="mb-3 inline-flex rounded-lg border border-border/70 bg-background p-2">
                <Icon className="size-4" />
              </div>
              <p className="text-sm font-semibold">{option.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
