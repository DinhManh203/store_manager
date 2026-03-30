"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";

const themeOptions = [
  {
    value: "light",
    title: "Light",
    description: "Bright UI for daytime operations",
    icon: Sun,
  },
  {
    value: "dark",
    title: "Dark",
    description: "Reduced eye strain in low-light environments",
    icon: Moon,
  },
  {
    value: "system",
    title: "System",
    description: "Follow operating system preference",
    icon: Laptop,
  },
] as const;

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Preferences
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Interface Settings</h1>
        <p className="text-sm text-muted-foreground">
          Control the dashboard appearance and behavior for administrators.
        </p>
      </div>

      <Card className="border border-border/70">
        <CardHeader className="border-b border-border/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Color Theme</CardTitle>
              <CardDescription>
                Switch between Light, Dark, or System mode.
              </CardDescription>
            </div>
            <Badge variant="outline">
              Current: {mounted ? resolvedTheme ?? "system" : "loading"}
            </Badge>
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
                  "hover:bg-muted/60",
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
