"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { useMounted } from "@/hooks/use-mounted";
import {
  extractErrorMessage,
  extractRoleFromToken,
  getRoleLabel,
} from "@/lib/auth";

type ProfileData = {
  username: string;
  email: string;
  role: string;
  full_name: string;
  phone: string;
};

type ProfileForm = {
  full_name: string;
  email: string;
  phone: string;
};

type PasswordForm = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

const emptyProfileForm: ProfileForm = {
  full_name: "",
  email: "",
  phone: "",
};

const emptyPasswordForm: PasswordForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown) => (typeof value === "string" ? value : "");

const normalizeProfilePayload = (payload: unknown): ProfileData | null => {
  if (!isObject(payload)) {
    return null;
  }

  const username = readString(payload.username).trim();
  const email = readString(payload.email).trim();
  if (!username || !email) {
    return null;
  }

  return {
    username,
    email,
    role: readString(payload.role).trim(),
    full_name: readString(payload.full_name).trim(),
    phone: readString(payload.phone).trim(),
  };
};

export default function ProfilePage() {
  const mounted = useMounted();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfileForm);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPasswordForm);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loadError, setLoadError] = useState("");

  const roleLabel = useMemo(() => {
    if (profile?.role) {
      return getRoleLabel(profile.role);
    }

    if (!mounted || typeof window === "undefined") {
      return "Chưa xác định";
    }

    const roleFromStorage = window.localStorage.getItem("auth_role")?.trim() ?? "";
    const token = window.localStorage.getItem("auth_token") ?? "";
    const roleFromToken = extractRoleFromToken(token);
    const resolvedRole = roleFromStorage || roleFromToken || (token ? "user" : "");

    return getRoleLabel(resolvedRole);
  }, [mounted, profile?.role]);

  const loadProfile = async () => {
    setIsLoadingProfile(true);

    try {
      const response = await fetch("/api/profile", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = extractErrorMessage(payload) || "Không thể tải hồ sơ cá nhân.";
        setLoadError(message);
        return;
      }

      const normalized = normalizeProfilePayload(payload);
      if (!normalized) {
        setLoadError("Dữ liệu hồ sơ không hợp lệ.");
        return;
      }

      setProfile(normalized);
      setProfileForm({
        full_name: normalized.full_name,
        email: normalized.email,
        phone: normalized.phone,
      });
      setLoadError("");

      if (typeof window !== "undefined") {
        window.localStorage.setItem("auth_username", normalized.email || normalized.username);
        if (normalized.role) {
          window.localStorage.setItem("auth_role", normalized.role);
        }
      }
    } catch {
      setLoadError("Không thể kết nối API hồ sơ cá nhân.");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleProfileFieldChange = (field: keyof ProfileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordFieldChange = (field: keyof PasswordForm, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      full_name: profileForm.full_name,
      email: profileForm.email,
      phone: profileForm.phone,
    };

    if (!payload.email.trim()) {
      const message = "Email không được để trống.";
      setProfileError(message);
      toast.warning(message);
      return;
    }

    setIsSavingProfile(true);
    setProfileError("");

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const responsePayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = extractErrorMessage(responsePayload) || "Không thể cập nhật hồ sơ.";
        setProfileError(message);
        toast.error(message);
        return;
      }

      const normalized = normalizeProfilePayload(responsePayload);
      if (!normalized) {
        const message = "Dữ liệu hồ sơ sau cập nhật không hợp lệ.";
        setProfileError(message);
        toast.error(message);
        return;
      }

      setProfile(normalized);
      setProfileForm({
        full_name: normalized.full_name,
        email: normalized.email,
        phone: normalized.phone,
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem("auth_username", normalized.email || normalized.username);
        if (normalized.role) {
          window.localStorage.setItem("auth_role", normalized.role);
        }
      }

      toast.success("Đã cập nhật hồ sơ cá nhân.");
    } catch {
      const message = "Không thể kết nối API cập nhật hồ sơ.";
      setProfileError(message);
      toast.error(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const currentPassword = passwordForm.current_password.trim();
    const newPassword = passwordForm.new_password.trim();
    const confirmPassword = passwordForm.confirm_password.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      const message =
        "Vui lòng nhập đầy đủ mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu.";
      setPasswordError(message);
      toast.warning(message);
      return;
    }

    if (newPassword.length < 8) {
      const message = "Mật khẩu mới phải có ít nhất 8 ký tự.";
      setPasswordError(message);
      toast.warning(message);
      return;
    }

    if (newPassword !== confirmPassword) {
      const message = "Xác nhận mật khẩu mới không khớp.";
      setPasswordError(message);
      toast.warning(message);
      return;
    }

    if (newPassword === currentPassword) {
      const message = "Mật khẩu mới phải khác mật khẩu hiện tại.";
      setPasswordError(message);
      toast.warning(message);
      return;
    }

    setIsChangingPassword(true);
    setPasswordError("");

    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordForm),
      });
      const responsePayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = extractErrorMessage(responsePayload) || "Không thể đổi mật khẩu.";
        setPasswordError(message);
        toast.error(message);
        return;
      }

      toast.success(extractErrorMessage(responsePayload) || "Đổi mật khẩu thành công.");
      setPasswordForm(emptyPasswordForm);
    } catch {
      const message = "Không thể kết nối API đổi mật khẩu.";
      setPasswordError(message);
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Tài khoản</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hồ sơ cá nhân</h1>
        <p className="text-sm text-muted-foreground">
          Cập nhật thông tin cá nhân và đổi mật khẩu cho tài khoản đang đăng nhập.
        </p>
      </section>

      <Card className="border border-border/70">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Thông tin đăng nhập</CardTitle>
          <CardDescription>Thông tin cơ bản của phiên làm việc hiện tại.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Tài khoản</p>
            <p className="text-sm font-medium">
              {isLoadingProfile ? "Đang tải..." : profile?.username || "Không rõ"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Email</p>
            <p className="text-sm font-medium">
              {isLoadingProfile ? "Đang tải..." : profile?.email || "Không rõ"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Vai trò</p>
            <Badge variant="secondary">{roleLabel}</Badge>
          </div>
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-border/70">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Chỉnh sửa hồ sơ cá nhân</CardTitle>
            <CardDescription>
              Cập nhật họ tên, email và số điện thoại để đồng bộ thông tin tài khoản.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-full-name">Họ và tên</Label>
                <Input
                  id="profile-full-name"
                  placeholder="Nhập họ và tên"
                  value={profileForm.full_name}
                  disabled={isLoadingProfile || isSavingProfile}
                  onChange={(event) => handleProfileFieldChange("full_name", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  placeholder="name@gmail.com"
                  value={profileForm.email}
                  disabled={isLoadingProfile || isSavingProfile}
                  onChange={(event) => handleProfileFieldChange("email", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-phone">Số điện thoại</Label>
                <Input
                  id="profile-phone"
                  placeholder="VD: 0912345678"
                  value={profileForm.phone}
                  disabled={isLoadingProfile || isSavingProfile}
                  onChange={(event) => handleProfileFieldChange("phone", event.target.value)}
                />
              </div>

              {profileError ? <p className="text-sm text-destructive">{profileError}</p> : null}

              <Button className="cursor-pointer" type="submit" disabled={isLoadingProfile || isSavingProfile}>
                {isSavingProfile ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Lưu hồ sơ
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border border-border/70">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Đổi mật khẩu</CardTitle>
            <CardDescription>
              Đặt mật khẩu mới với ít nhất 8 ký tự để tăng bảo mật cho tài khoản.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Nhập mật khẩu hiện tại"
                  value={passwordForm.current_password}
                  disabled={isChangingPassword}
                  onChange={(event) =>
                    handlePasswordFieldChange("current_password", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Mật khẩu mới</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Nhập mật khẩu mới"
                  value={passwordForm.new_password}
                  disabled={isChangingPassword}
                  onChange={(event) => handlePasswordFieldChange("new_password", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={passwordForm.confirm_password}
                  disabled={isChangingPassword}
                  onChange={(event) =>
                    handlePasswordFieldChange("confirm_password", event.target.value)
                  }
                />
              </div>

              {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}

              <Button
                type="submit"
                className="cursor-pointer"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang đổi...
                  </>
                ) : (
                  <>
                    <KeyRound className="size-4" />
                    Đổi mật khẩu
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
