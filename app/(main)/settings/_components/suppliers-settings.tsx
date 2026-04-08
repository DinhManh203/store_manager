"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SuppliersSettings() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Tên nhà cung cấp là bắt buộc");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Thêm nhà cung cấp thành công");
        setFormData({ name: "", phone: "", email: "", address: "" });
        router.push("/suppliers");
      } else {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof data?.message === "string" && data.message.trim()
            ? data.message
            : "Không thể thêm nhà cung cấp";
        toast.error(message);
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl border border-border/70">
      <CardHeader className="border-b border-border/70">
        <CardTitle className="text-lg">Thêm nhà cung cấp mới</CardTitle>
        <CardDescription>
          Tạo nhà cung cấp để sử dụng trong nhập kho và quản lý hàng hóa.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4 pt-6">
        <div className="grid gap-2">
          <label className="text-sm font-medium leading-none">
            Tên nhà cung cấp <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="VD: Công ty TNHH ABC"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium leading-none">Điện thoại</label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="0912345678"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium leading-none">Email</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="ncc@email.com"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium leading-none">Địa chỉ</label>
          <Input
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Số nhà, đường, quận..."
          />
        </div>
      </CardContent>
      <CardFooter className="border-t border-border/70 pt-6">
        <Button onClick={handleCreate} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Lưu nhà cung cấp
        </Button>
      </CardFooter>
    </Card>
  );
}
