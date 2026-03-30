"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMounted } from "@/hooks/use-mounted";

export default function ProfilePage() {
  const mounted = useMounted();
  const username =
    mounted && typeof window !== "undefined"
      ? window.localStorage.getItem("auth_username") || "admin"
      : "admin";
  const role =
    mounted && typeof window !== "undefined"
      ? window.localStorage.getItem("auth_role") || "Chưa xác định"
      : "Chưa xác định";

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Tài khoản</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hồ sơ cá nhân</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý thông tin tài khoản quản trị đang đăng nhập.
        </p>
      </section>

      <Card className="border border-border/70">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Thông tin đăng nhập</CardTitle>
          <CardDescription>Dữ liệu phiên hiện tại của bạn.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Tài khoản</p>
            <p className="text-sm font-medium">{username}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Vai trò</p>
            <Badge variant="secondary">{role}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
