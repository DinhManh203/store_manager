"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  PackagePlus,
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
import { toast } from "@/components/ui/toast";
import { useMounted } from "@/hooks/use-mounted";
import { extractRoleFromToken, getRoleLabel } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavbarProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  actorUsername: string;
  actorFullName: string;
  actorRole: string;
  productId: string;
  productName: string;
  createdAt: string;
  isRead: boolean;
};

type NotificationApiPayload = {
  unreadCount: number;
  total: number;
  items: NotificationItem[];
};

const NOTIFICATION_POLLING_INTERVAL_MS = 15000;
const NEW_NOTIFICATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const NOTIFICATION_BADGE_MAX = 9;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown) => (typeof value === "string" ? value : "");

const readNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const readBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return false;
};

const normalizeNotificationItem = (payload: unknown): NotificationItem | null => {
  if (!isObject(payload)) {
    return null;
  }

  const id = readString(payload.id).trim();
  if (!id) {
    return null;
  }

  return {
    id,
    type: readString(payload.type).trim() || "product_created",
    title: readString(payload.title).trim(),
    message: readString(payload.message).trim(),
    actorUsername: readString(payload.actorUsername).trim(),
    actorFullName: readString(payload.actorFullName).trim(),
    actorRole: readString(payload.actorRole).trim(),
    productId: readString(payload.productId).trim(),
    productName: readString(payload.productName).trim(),
    createdAt: readString(payload.createdAt).trim(),
    isRead: readBoolean(payload.isRead),
  };
};

const normalizeNotificationResponse = (payload: unknown): NotificationApiPayload => {
  if (!isObject(payload)) {
    return { unreadCount: 0, total: 0, items: [] };
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems
    .map((item) => normalizeNotificationItem(item))
    .filter((item): item is NotificationItem => item !== null);

  return {
    unreadCount: Math.max(0, Math.trunc(readNumber(payload.unreadCount))),
    total: Math.max(0, Math.trunc(readNumber(payload.total))),
    items,
  };
};

const formatRelativeTime = (createdAt: string) => {
  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Vừa xong";
  }

  const diffMs = Date.now() - parsedDate.getTime();
  if (diffMs <= 0 || diffMs < 60 * 1000) {
    return "Vừa xong";
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `${diffMinutes} phút`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} ngày`;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
};

const isNewNotification = (createdAt: string) => {
  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return true;
  }
  return Date.now() - parsedDate.getTime() <= NEW_NOTIFICATION_WINDOW_MS;
};

const getNotificationActorName = (notification: NotificationItem) =>
  notification.actorFullName.trim() ||
  notification.actorUsername.trim() ||
  "Nhân viên";

const getNotificationInitials = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "NV";
};

const buildNotificationMessage = (notification: NotificationItem) => {
  const actorName = getNotificationActorName(notification);
  const productName = notification.productName.trim();

  if (notification.type === "product_created" && productName) {
    return `${actorName} vừa thêm sản phẩm ${productName} vào kho.`;
  }

  if (notification.type === "product_updated" && productName) {
    return `${actorName} vừa chỉnh sửa sản phẩm ${productName}.`;
  }

  if (notification.message.trim()) {
    return notification.message;
  }

  if (productName) {
    return `${actorName} vừa cập nhật sản phẩm ${productName}.`;
  }

  return notification.message || `${actorName} vừa cập nhật kho hàng.`;
};

const Navbar = ({ isSidebarOpen, onToggleSidebar }: NavbarProps) => {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const hasInitializedNotificationsRef = useRef(false);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  const isDark = mounted && resolvedTheme === "dark";
  const authName =
    mounted && typeof window !== "undefined"
      ? window.localStorage.getItem("auth_username") || "Người dùng"
      : "Người dùng";
  const authRole = (() => {
    if (!mounted || typeof window === "undefined") {
      return "Chưa xác định";
    }

    const roleFromStorage = window.localStorage.getItem("auth_role")?.trim() ?? "";
    const token = window.localStorage.getItem("auth_token") ?? "";
    const roleFromToken = extractRoleFromToken(token);
    const resolvedRole = roleFromStorage || roleFromToken || (token ? "user" : "");

    return getRoleLabel(resolvedRole);
  })();

  const handleToggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const notifyNewNotifications = useCallback((items: NotificationItem[]) => {
    const nextIds = new Set(items.map((item) => item.id));

    if (!hasInitializedNotificationsRef.current) {
      hasInitializedNotificationsRef.current = true;
      seenNotificationIdsRef.current = nextIds;
      return;
    }

    const freshItems = items.filter(
      (item) => !seenNotificationIdsRef.current.has(item.id)
    );

    if (freshItems.length > 0) {
      freshItems
        .slice(0, 3)
        .reverse()
        .forEach((notification) => {
          toast.info("Thông báo mới", {
            description: buildNotificationMessage(notification),
            position: "bottom-left",
            duration: 2600,
          });
        });
    }

    seenNotificationIdsRef.current = nextIds;
  }, []);

  const loadNotifications = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoadingNotifications(true);
      }

      try {
        const response = await fetch("/api/notifications?filter=all&limit=40", {
          method: "GET",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (!silent) {
            const message =
              readString((payload as Record<string, unknown>).message).trim() ||
              "Không thể tải thông báo.";
            setNotificationError(message);
          }
          return;
        }

        const normalized = normalizeNotificationResponse(payload);
        notifyNewNotifications(normalized.items);
        setNotifications(normalized.items);
        setUnreadCount(normalized.unreadCount);
        setNotificationError("");
      } catch {
        if (!silent) {
          setNotificationError("Không thể kết nối API thông báo.");
        }
      } finally {
        if (!silent) {
          setIsLoadingNotifications(false);
        }
      }
    },
    [notifyNewNotifications]
  );

  useEffect(() => {
    void loadNotifications();

    const intervalId = window.setInterval(() => {
      void loadNotifications({ silent: true });
    }, NOTIFICATION_POLLING_INTERVAL_MS);

    const handleRefresh = () => {
      void loadNotifications();
    };

    window.addEventListener("notifications:refresh", handleRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("notifications:refresh", handleRefresh);
    };
  }, [loadNotifications]);

  const handleMarkNotificationRead = async (notification: NotificationItem) => {
    if (notification.isRead) {
      return;
    }

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, isRead: true } : item
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const response = await fetch(
        `/api/notifications/${encodeURIComponent(notification.id)}`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error("Mark read failed");
      }
    } catch {
      void loadNotifications();
    }
  };

  const newestNotifications = useMemo(
    () => notifications.filter((notification) => isNewNotification(notification.createdAt)),
    [notifications]
  );

  const previousNotifications = useMemo(
    () => notifications.filter((notification) => !isNewNotification(notification.createdAt)),
    [notifications]
  );

  const renderNotificationCard = (notification: NotificationItem) => {
    const actorName = getNotificationActorName(notification);
    return (
      <button
        key={notification.id}
        type="button"
        onClick={() => void handleMarkNotificationRead(notification)}
        className={cn(
          "flex w-full cursor-pointer items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors",
          notification.isRead
            ? "hover:bg-accent/45"
            : "bg-accent/60 hover:bg-accent/80"
        )}
      >
        <div className="relative shrink-0">
          <div className="flex size-11 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
            {getNotificationInitials(actorName)}
          </div>
          <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <PackagePlus className="size-3" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-5 text-foreground">
            {buildNotificationMessage(notification)}
          </p>
          <p className="mt-1 text-xs font-medium text-primary">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>

        {!notification.isRead ? (
          <span className="mt-2 size-2.5 shrink-0 rounded-full bg-primary" />
        ) : null}
      </button>
    );
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

        <Button
          variant="outline"
          size="icon"
          className="cursor-pointer"
          onClick={handleToggleTheme}
          aria-label="Đổi giao diện sáng/tối"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <DropdownMenu
          open={isNotificationOpen}
          onOpenChange={(open) => {
            setIsNotificationOpen(open);
            if (open) {
              void loadNotifications();
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Thông báo" className="relative cursor-pointer">
              <Bell className="size-4" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                  {unreadCount > NOTIFICATION_BADGE_MAX
                    ? `${NOTIFICATION_BADGE_MAX}+`
                    : unreadCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={10}
            className="w-[360px] rounded-2xl border border-border/80 bg-popover p-0 text-popover-foreground shadow-2xl"
          >
            <div className="border-b border-border/70 px-4 py-3">
              <h3 className="text-3xl font-bold tracking-tight">Thông báo</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {unreadCount > 0
                  ? `Bạn có ${unreadCount} thông báo chưa đọc`
                  : "Không có thông báo chưa đọc"}
              </p>
            </div>

            <div className="max-h-[430px] space-y-2 overflow-y-auto px-2 py-3">
              {isLoadingNotifications && notifications.length === 0 ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">Đang tải thông báo...</p>
              ) : null}

              {!isLoadingNotifications && notifications.length === 0 && !notificationError ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">
                  Chưa có thông báo mới.
                </p>
              ) : null}

              {notificationError ? (
                <p className="px-2 py-2 text-xs text-destructive">{notificationError}</p>
              ) : null}

              {newestNotifications.length > 0 ? (
                <>
                  <div className="px-2 pt-1 text-base font-semibold leading-none text-foreground">
                    Mới
                  </div>
                  {newestNotifications.map(renderNotificationCard)}
                </>
              ) : null}

              {previousNotifications.length > 0 ? (
                <>
                  <div className="px-2 pt-2 text-base font-semibold leading-none text-foreground">
                    Trước đó
                  </div>
                  {previousNotifications.map(renderNotificationCard)}
                </>
              ) : null}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

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
