"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { extractAuthToken, extractErrorMessage, extractRole } from "@/lib/auth";

type LoginForm = {
  username: string;
  password: string;
};

const initialForm: LoginForm = {
  username: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: keyof LoginForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const username = form.username.trim();
    const password = form.password;

    if (!username || !password) {
      const message = "Vui lòng nhập đầy đủ tài khoản và mật khẩu.";
      setError(message);
      toast.warning(message);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = extractErrorMessage(payload) || "Đăng nhập thất bại.";
        setError(message);
        toast.error(message);
        return;
      }

      const token = extractAuthToken(payload);
      if (token) {
        localStorage.setItem("auth_token", token);
      }

      const role = extractRole(payload);
      if (role) {
        localStorage.setItem("auth_role", role);
      } else {
        localStorage.removeItem("auth_role");
      }
      localStorage.setItem("auth_username", username);
      toast.success("Đăng nhập thành công.");

      router.replace("/");
      router.refresh();
    } catch {
      const message = "Không thể kết nối API. Vui lòng thử lại.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,_hsl(var(--muted))_0%,_transparent_55%),linear-gradient(to_bottom,_hsl(var(--background)),_hsl(var(--background)))] px-4 py-10">
      <Card className="w-full max-w-md border border-border/70">
        <CardHeader>
          <CardTitle className="text-xl">Đăng nhập tài khoản</CardTitle>
          <CardDescription>Nhập thông tin để truy cập hệ thống quản trị.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tài khoản</Label>
              <Input
                id="username"
                value={form.username}
                autoComplete="username"
                placeholder="Nhập tài khoản"
                onChange={(event) => handleChange("username", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <InputGroup>
                <InputGroupInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  onChange={(event) => handleChange("password", event.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end">
              <Button type="submit" className="w-40 cursor-pointer" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    <LogIn className="size-4" />
                    Đăng nhập
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
