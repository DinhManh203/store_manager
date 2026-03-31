"use client"

import { useTheme } from "@/components/theme-provider"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      visibleToasts={3}
      expand={false}
      icons={{
        success: (
          <CircleCheckIcon className="size-3.5" />
        ),
        info: (
          <InfoIcon className="size-3.5" />
        ),
        warning: (
          <TriangleAlertIcon className="size-3.5" />
        ),
        error: (
          <OctagonXIcon className="size-3.5" />
        ),
        loading: (
          <Loader2Icon className="size-3.5 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "0.75rem",
          fontFamily:
            "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
        } as React.CSSProperties
      }
      toastOptions={{
        duration: 2400,
        classNames: {
          toast:
            "cn-toast min-h-0 rounded-xl border border-border/80 bg-background/95 px-3 py-2 !font-bold shadow-[0_10px_28px_-18px_rgba(0,0,0,0.45)] backdrop-blur supports-[backdrop-filter]:bg-background/85",
          title: "text-[13px] !font-bold leading-5 tracking-[-0.01em]",
          description: "mt-0.5 text-[12px] !font-bold leading-4 text-muted-foreground",
          icon: "mt-0.5 text-muted-foreground",
          content: "gap-0.5",
          actionButton:
            "h-7 rounded-md border border-border/80 bg-background px-2.5 text-[11px] font-medium text-foreground hover:bg-muted",
          cancelButton:
            "h-7 rounded-md border border-border/70 bg-muted/55 px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted",
          closeButton:
            "h-5 w-5 rounded-full border border-border/70 bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground",
          success: "border-emerald-500/20",
          info: "border-sky-500/20",
          warning: "border-amber-500/25",
          error: "border-rose-500/25",
          loading: "border-border/80",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
