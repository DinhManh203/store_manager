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
import { Switch } from "@/components/ui/switch";

export default function BranchesSettings() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    manager: "",
    is_active: true,
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Tên chi nhánh là bắt buộc");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Thêm chi nhánh thành công");
        setFormData({ name: "", address: "", phone: "", manager: "", is_active: true });
        router.push("/branches");
      } else {
        const data = await res.json();
        toast.error(data.message || "Không thể thêm chi nhánh");
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border border-border/70 max-w-2xl">
      <CardHeader className="border-b border-border/70">
        <CardTitle className="text-lg">Thêm chi nhánh mới</CardTitle>
        <CardDescription>
          Tạo tài khoản cửa hàng phụ trong hệ thống.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6 grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium leading-none">Tên chi nhánh <span className="text-red-500">*</span></label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="VD: Cửa hàng cơ sở 2"
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
        <div className="grid gap-2">
          <label className="text-sm font-medium leading-none">Điện thoại</label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="0912345678"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium leading-none">Người quản lý</label>
          <Input
            value={formData.manager}
            onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
            placeholder="Họ tên quản lý"
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
           <Switch 
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
           />
           <span className="text-sm">Đang hoạt động</span>
        </div>
      </CardContent>
      <CardFooter className="border-t border-border/70 pt-6">
        <Button onClick={handleCreate} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Lưu chi nhánh
        </Button>
      </CardFooter>
    </Card>
  );
}
