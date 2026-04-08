"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Edit2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { extractErrorMessage } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";

type Supplier = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  is_active: boolean;
  createdAt: string;
};

type SupplierForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

const emptyForm: SupplierForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
};



const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown) => (typeof value === "string" ? value : "");
const readBoolean = (value: unknown) => (typeof value === "boolean" ? value : true);

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const normalizeSupplierPayload = (payload: unknown): Supplier | null => {
  if (!isObject(payload)) {
    return null;
  }

  const id = readString(payload.id).trim();
  const name = readString(payload.name).trim();
  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    phone: readString(payload.phone).trim(),
    email: readString(payload.email).trim(),
    address: readString(payload.address).trim(),
    is_active: payload.is_active !== undefined ? readBoolean(payload.is_active) : true,
    createdAt:
      readString(payload.createdAt).trim() || readString(payload.created_at).trim(),
  };
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [suppliersLoadError, setSuppliersLoadError] = useState("");
  const [error, setError] = useState("");

  const filteredSuppliers = useMemo(() => {
    const keyword = normalizeSearchText(searchQuery);
    return suppliers.filter((supplier) => {
      if (!keyword) {
        return true;
      }

      const haystack = normalizeSearchText(
        [supplier.name, supplier.phone, supplier.email, supplier.address].join(" ")
      );
      return haystack.includes(keyword);
    });
  }, [suppliers, searchQuery]);

  const loadSuppliersFromApi = async () => {
    setIsLoadingSuppliers(true);

    try {
      const response = await fetch("/api/suppliers", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          extractErrorMessage(payload) || "Không thể tải danh sách nhà cung cấp từ API.";
        setSuppliersLoadError(message);
        return;
      }

      const nextSuppliers = Array.isArray(payload)
        ? payload
            .map((item) => normalizeSupplierPayload(item))
            .filter((item): item is Supplier => item !== null)
        : [];

      setSuppliers(nextSuppliers);
      setSuppliersLoadError("");
    } catch {
      setSuppliersLoadError("Không thể kết nối API danh sách nhà cung cấp.");
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    void loadSuppliersFromApi();
  }, []);

  const handleChange = (field: keyof SupplierForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  };

  const validateForm = () => {
    const name = form.name.trim();

    if (!name) {
      return "Vui lòng nhập tên nhà cung cấp.";
    }

    const duplicatedName = suppliers.some(
      (supplier) =>
        supplier.id !== editingId &&
        supplier.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicatedName) {
      return "Tên nhà cung cấp đã tồn tại.";
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
    };

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/suppliers", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
      });
      const responsePayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          extractErrorMessage(responsePayload) ||
          (editingId
            ? "Không thể cập nhật nhà cung cấp qua API."
            : "Không thể thêm nhà cung cấp qua API.");
        setError(message);
        return;
      }

      const normalizedSupplier = normalizeSupplierPayload(responsePayload);
      if (normalizedSupplier) {
        if (editingId) {
          setSuppliers((prev) =>
            prev.map((supplier) => (supplier.id === editingId ? normalizedSupplier : supplier))
          );
        } else {
          setSuppliers((prev) => [normalizedSupplier, ...prev]);
        }
      } else {
        await loadSuppliersFromApi();
      }

      setSuppliersLoadError("");
      resetForm();
      setIsDialogOpen(false);
      toast.success(editingId ? "Cập nhật nhà cung cấp thành công." : "Thêm nhà cung cấp thành công.");
    } catch {
      setError(
        editingId
          ? "Không thể kết nối API cập nhật nhà cung cấp."
          : "Không thể kết nối API thêm nhà cung cấp."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setForm({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
    });
    setEditingId(supplier.id);
    setError("");
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (supplier: Supplier) => {
    if (supplier.is_active) {
      toast.error("Chỉ có thể xóa nhà cung cấp đang Ngừng cung cấp.");
      return;
    }

    setSupplierToDelete(supplier);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (deletingId) {
      return;
    }

    setIsDeleteDialogOpen(open);
    if (!open) {
      setSupplierToDelete(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) {
      return;
    }

    const targetSupplier = supplierToDelete;
    if (targetSupplier.is_active) {
      toast.error("Chỉ có thể xóa nhà cung cấp đang Ngừng cung cấp.");
      return;
    }

    setDeletingId(targetSupplier.id);

    try {
      const response = await fetch(`/api/suppliers?id=${encodeURIComponent(targetSupplier.id)}`, {
        method: "DELETE",
      });
      const responsePayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          extractErrorMessage(responsePayload) || "Không thể xóa nhà cung cấp qua API.";
        toast.error(message);
        return;
      }

      setSuppliers((prev) => prev.filter((item) => item.id !== targetSupplier.id));
      setSuppliersLoadError("");
      setIsDeleteDialogOpen(false);
      setSupplierToDelete(null);
      toast.success(`Đã xóa nhà cung cấp "${targetSupplier.name}".`);
    } catch {
      toast.error("Không thể kết nối API xóa nhà cung cấp.");
      return;
    } finally {
      setDeletingId(null);
    }

    if (editingId === targetSupplier.id) {
      resetForm();
    }
  };

  const toggleActive = async (supplier: Supplier, nextStatus: boolean) => {
    const previousSuppliers = [...suppliers];

    setSuppliers((prev) =>
      prev.map((item) =>
        item.id === supplier.id ? { ...item, is_active: nextStatus } : item
      )
    );

    try {
      const response = await fetch("/api/suppliers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: supplier.id,
          is_active: nextStatus,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSuppliers(previousSuppliers);
        toast.error(
          extractErrorMessage(payload) || "Không thể cập nhật trạng thái nhà cung cấp."
        );
        return;
      }

      const normalized = normalizeSupplierPayload(payload);
      if (normalized) {
        const hasStatusInPayload =
          isObject(payload) && typeof payload.is_active === "boolean";
        const nextSupplier = hasStatusInPayload
          ? normalized
          : { ...normalized, is_active: nextStatus };

        setSuppliers((prev) =>
          prev.map((item) => (item.id === nextSupplier.id ? nextSupplier : item))
        );
      }

      toast.success(nextStatus ? "Đã chuyển sang Nguồn cung cấp." : "Đã chuyển sang Ngừng cung cấp.");
    } catch {
      setSuppliers(previousSuppliers);
      toast.error("Không thể kết nối API cập nhật trạng thái nhà cung cấp.");
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Nhà cung cấp</p>
        <h1 className="text-2xl font-semibold tracking-tight">Quản lý nhà cung cấp</h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi, thêm mới và cập nhật thông tin nhà cung cấp.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/70">
          <CardHeader>
            <CardDescription>Tổng nhà cung cấp</CardDescription>
            <CardTitle>{suppliers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/70">
          <CardHeader>
            <CardDescription>Có số điện thoại</CardDescription>
            <CardTitle>{suppliers.filter((s) => s.phone).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/70">
          <CardHeader>
            <CardDescription>Có email</CardDescription>
            <CardTitle>{suppliers.filter((s) => s.email).length}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm theo tên, SĐT, email..."
            className="pl-8 pr-8"
          />
          {searchQuery ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setSearchQuery("")}
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Hiển thị {filteredSuppliers.length}/{suppliers.length} nhà cung cấp
        </p>
      </div>

      <Card className="border border-border/70">
        <CardHeader className="border-b border-border/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Danh sách nhà cung cấp</CardTitle>
              <CardDescription>
                Chỉnh sửa hoặc xóa trực tiếp từng nhà cung cấp trong bảng.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">STT</TableHead>
                <TableHead>Tên nhà cung cấp</TableHead>
                <TableHead>Địa chỉ</TableHead>
                <TableHead>Số điện thoại</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingSuppliers ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Đang tải danh sách nhà cung cấp...
                  </TableCell>
                </TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Chưa có nhà cung cấp nào.
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Không tìm thấy nhà cung cấp phù hợp với từ khóa: {searchQuery}.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier, index) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{supplier.address || "—"}</TableCell>
                    <TableCell>{supplier.phone || "—"}</TableCell>
                    <TableCell>{supplier.email || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          className="cursor-pointer"
                          checked={supplier.is_active}
                          onCheckedChange={(checked) => void toggleActive(supplier, checked)}
                        />
                        <Badge variant={supplier.is_active ? "default" : "secondary"}>
                          {supplier.is_active ? "Nguồn cung cấp" : "Ngừng cung cấp"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="cursor-pointer"
                        disabled={isSubmitting || deletingId === supplier.id}
                        onClick={() => handleEdit(supplier)}
                        aria-label="Sửa nhà cung cấp"
                        title="Sửa nhà cung cấp"
                      >
                        <Edit2 className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isSubmitting || deletingId === supplier.id || supplier.is_active}
                        onClick={() => handleOpenDeleteDialog(supplier)}
                        aria-label="Xóa nhà cung cấp"
                        title={
                          supplier.is_active
                            ? "Vui lòng chuyển trạng thái về Ngừng cung cấp trước khi xóa"
                            : deletingId === supplier.id
                              ? "Đang xóa..."
                              : "Xóa nhà cung cấp"
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

          {suppliersLoadError ? (
            <p className="mt-3 text-sm text-destructive">{suppliersLoadError}</p>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent
          size="default"
          className="!max-w-[34rem] sm:!max-w-[38rem] overflow-hidden rounded-lg bg-background p-0 shadow-2xl ring-1 ring-black/10"
        >
          <AlertDialogHeader className="gap-0 border-b border-border/70 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <AlertDialogMedia className="m-0 size-10 shrink-0 rounded-lg bg-destructive/12 text-destructive">
                <Trash2 className="size-5" />
              </AlertDialogMedia>
              <AlertDialogTitle className="text-xl font-semibold leading-tight">
                Xóa nhà cung cấp
              </AlertDialogTitle>
            </div>
          </AlertDialogHeader>

          <AlertDialogDescription className="px-5 py-4 text-sm leading-relaxed text-foreground/75">
            <span className="block">
              {supplierToDelete
                ? `Bạn có chắc muốn xóa nhà cung cấp "${supplierToDelete.name}"?`
                : "Bạn có chắc muốn xóa nhà cung cấp này?"}
            </span>
            <span className="mt-1 block">Hành động này không thể hoàn tác.</span>
          </AlertDialogDescription>

          <AlertDialogFooter className="m-0 flex items-center justify-end gap-2 border-t border-border/70 bg-background px-5 py-4">
            <AlertDialogCancel
              disabled={Boolean(deletingId)}
              className="cursor-pointer rounded-lg border-border/70 bg-background px-4 text-sm font-medium text-foreground hover:bg-muted/50"
            >
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              variant="outline"
              disabled={!supplierToDelete || Boolean(deletingId)}
              className="cursor-pointer rounded-lg border-destructive/15 bg-destructive/10 px-4 text-sm font-semibold text-destructive hover:bg-destructive/15 hover:text-destructive"
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {deletingId ? "Đang xóa..." : "Xóa nhà cung cấp"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-2xl">
          <DialogHeader className="space-y-2 border-b border-border/70 px-6 pt-6 pb-4">
            <DialogTitle className="text-xl">
              {editingId ? "Cập nhật nhà cung cấp" : "Thêm nhà cung cấp mới"}
            </DialogTitle>
            <DialogDescription>
              Điền thông tin nhà cung cấp và lưu vào hệ thống.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
            <div className="rounded-xl border border-border/70 bg-background p-4 shadow-sm sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="supplier-name" className="text-sm font-medium">
                    Tên nhà cung cấp
                  </label>
                  <Input
                    id="supplier-name"
                    placeholder="Nhập tên nhà cung cấp"
                    value={form.name}
                    onChange={(event) => handleChange("name", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="supplier-phone" className="text-sm font-medium">
                    Số điện thoại
                  </label>
                  <Input
                    id="supplier-phone"
                    placeholder="VD: 0901234567"
                    value={form.phone}
                    onChange={(event) => handleChange("phone", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="supplier-email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="supplier-email"
                    type="email"
                    placeholder="VD: ncc@email.com"
                    value={form.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="supplier-address" className="text-sm font-medium">
                    Địa chỉ
                  </label>
                  <Input
                    id="supplier-address"
                    placeholder="Nhập địa chỉ nhà cung cấp"
                    value={form.address}
                    onChange={(event) => handleChange("address", event.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={isSubmitting}
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="cursor-pointer sm:min-w-[170px]"
                disabled={isSubmitting}
              >
                <Plus className="size-4" />
                {isSubmitting
                  ? editingId
                    ? "Đang lưu..."
                    : "Đang thêm..."
                  : editingId
                    ? "Lưu thay đổi"
                    : "Thêm nhà cung cấp"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
