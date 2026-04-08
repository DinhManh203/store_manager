"use client";

import { useState, useEffect } from "react";
import { Edit2, Trash2, Store, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

type BranchPayload = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  manager?: string;
  is_active: boolean;
  createdAt: string;
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchPayload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentBranch, setCurrentBranch] = useState<BranchPayload | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    manager: "",
    is_active: true,
  });

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/branches");
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      } else {
        toast.error("Không thể tải danh sách chi nhánh (Hãy xem phần giải thích lỗi 404)");
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleOpenEdit = (branch: BranchPayload) => {
    setCurrentBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address || "",
      phone: branch.phone || "",
      manager: branch.manager || "",
      is_active: branch.is_active,
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (branch: BranchPayload) => {
    if (branch.is_active) {
      toast.error("Chỉ có thể xóa chi nhánh đang ngừng hoạt động.");
      return;
    }

    setCurrentBranch(branch);
    setIsDeleteOpen(true);
  };

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
        setIsCreateOpen(false);
        fetchBranches();
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

  const handleEdit = async () => {
    if (!currentBranch) return;
    if (!formData.name.trim()) {
      toast.error("Tên chi nhánh là bắt buộc");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/branches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentBranch.id, ...formData }),
      });

      if (res.ok) {
        toast.success("Cập nhật chi nhánh thành công");
        setIsEditOpen(false);
        fetchBranches();
      } else {
        const data = await res.json();
        toast.error(data.message || "Không thể cập nhật chi nhánh");
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentBranch) return;
    if (currentBranch.is_active) {
      toast.error("Chỉ có thể xóa chi nhánh đang ngừng hoạt động.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/branches?id=${currentBranch.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Xóa chi nhánh thành công");
        setIsDeleteOpen(false);
        fetchBranches();
      } else {
        const data = await res.json();
        toast.error(data.message || "Không thể xóa chi nhánh");
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (branch: BranchPayload) => {
    const updatedStatus = !branch.is_active;
    const previousBranches = [...branches];
    
    setBranches((prev) => 
      prev.map(b => b.id === branch.id ? { ...b, is_active: updatedStatus } : b)
    );

    try {
      const res = await fetch("/api/branches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: branch.id, name: branch.name, is_active: updatedStatus }),
      });

      if (!res.ok) {
        setBranches(previousBranches);
        toast.error("Không thể cập nhật trạng thái");
      } else {
        toast.success(`Đã ${updatedStatus ? "kích hoạt" : "ngừng hoạt động"} chi nhánh.`);
      }
    } catch {
      setBranches(previousBranches);
      toast.error("Lỗi khi cập nhật trạng thái");
    }
  };

  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Hệ thống</p>
        <h1 className="text-2xl font-semibold tracking-tight">Quản lý chi nhánh</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý danh sách các chi nhánh và cửa hàng phụ.
        </p>
      </div>

      <Card className="border border-border/70">
        <CardHeader className="border-b border-border/70 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Danh sách chi nhánh</CardTitle>
            <CardDescription>Hiển thị toàn bộ chi nhánh đã có trong hệ thống.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center">
            <div className="relative flex-1 md:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên chi nhánh..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/70 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Tên chi nhánh</TableHead>
                  <TableHead>Địa chỉ</TableHead>
                  <TableHead>Điện thoại</TableHead>
                  <TableHead>Người quản lý</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <Loader2 className="size-6 animate-spin text-primary mx-auto mb-2" />
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : filteredBranches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <Store className="size-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                      <p className="text-muted-foreground">Chưa có chi nhánh nào.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBranches.map((branch) => (
                    <TableRow key={branch.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate" title={branch.address}>
                        {branch.address || "-"}
                      </TableCell>
                      <TableCell>{branch.phone || "-"}</TableCell>
                      <TableCell>{branch.manager || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch 
                            className="cursor-pointer"
                            checked={branch.is_active}
                            onCheckedChange={() => toggleActive(branch)}
                          />
                          <Badge variant={branch.is_active ? "default" : "secondary"}>
                            {branch.is_active ? "Hoạt động" : "Ngừng HĐ"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="cursor-pointer"
                          onClick={() => handleOpenEdit(branch)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(branch)}
                          disabled={branch.is_active}
                          title={
                            branch.is_active
                              ? "Vui lòng ngừng hoạt động chi nhánh trước khi xóa"
                              : "Xóa chi nhánh"
                          }
                          className="cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-red-500"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm chi nhánh mới</DialogTitle>
              <DialogDescription>Điền thông tin cho chi nhánh mới.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">Tên chi nhánh</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Chi nhánh Quận 1"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">Địa chỉ</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Địa chỉ chi nhánh..."
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">Điện thoại</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0912..."
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">Người quản lý</label>
                <Input
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="Tên người quản lý..."
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                 <Switch 
                    className="cursor-pointer"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                 />
                 <span className="text-sm">Đang hoạt động</span>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setIsCreateOpen(false)}
              >
                Hủy
              </Button>
              <Button className="cursor-pointer" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Lưu chi nhánh
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sửa chi nhánh</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">Tên chi nhánh</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">Địa chỉ</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">Điện thoại</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">Người quản lý</label>
                <Input
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setIsEditOpen(false)}
              >
                Hủy
              </Button>
              <Button className="cursor-pointer" onClick={handleEdit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Cập nhật
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận xóa</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa chi nhánh <span className="font-medium text-foreground">{currentBranch?.name}</span> không?
                Thao tác này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setIsDeleteOpen(false)}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                className="cursor-pointer"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Xác nhận xóa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </Card>
    </div>
  );
}
