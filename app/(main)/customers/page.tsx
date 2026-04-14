"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Edit2, Plus, Search, Trash2, X } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { toast } from "@/components/ui/toast";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
};

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
};

const CUSTOMER_STORAGE_KEY = "store_manager_customers_v1";

const emptyForm: CustomerForm = {
  name: "",
  phone: "",
  email: "",
};

const PHONE_PATTERN = /^[0-9+\-\s]{9,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown) => (typeof value === "string" ? value : "");

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

const normalizeCustomerPayload = (payload: unknown): Customer | null => {
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
    createdAt: readString(payload.createdAt).trim() || new Date().toISOString(),
  };
};

const readCustomersFromStorage = () => {
  if (typeof window === "undefined") {
    return [] as Customer[];
  }

  try {
    const rawCustomers = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (!rawCustomers) {
      return [] as Customer[];
    }

    const parsedCustomers = JSON.parse(rawCustomers) as unknown;
    if (!Array.isArray(parsedCustomers)) {
      return [] as Customer[];
    }

    return parsedCustomers
      .map((item) => normalizeCustomerPayload(item))
      .filter((item): item is Customer => item !== null);
  } catch {
    return [] as Customer[];
  }
};

const createCustomerId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `customer-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const formatCreatedAt = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const nextCustomers = readCustomersFromStorage();
    setCustomers(nextCustomers);
    setIsLoadingCustomers(false);
  }, []);

  useEffect(() => {
    if (isLoadingCustomers || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customers));
  }, [customers, isLoadingCustomers]);

  const filteredCustomers = useMemo(() => {
    const keyword = normalizeSearchText(searchQuery);
    return customers.filter((customer) => {
      if (!keyword) {
        return true;
      }

      const haystack = normalizeSearchText(
        [customer.name, customer.phone, customer.email].join(" ")
      );
      return haystack.includes(keyword);
    });
  }, [customers, searchQuery]);

  const handleChange = (field: keyof CustomerForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  };

  const handleOpenCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const validateForm = () => {
    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (!name) {
      return "Vui lòng nhập tên khách hàng.";
    }

    if (phone && !PHONE_PATTERN.test(phone)) {
      return "Số điện thoại không hợp lệ. Vui lòng nhập từ 9-15 ký tự số.";
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      return "Email không hợp lệ.";
    }

    const duplicatedPhone = customers.some(
      (customer) =>
        customer.id !== editingId &&
        customer.phone.trim() &&
        customer.phone.trim() === phone
    );

    if (phone && duplicatedPhone) {
      return "Số điện thoại đã tồn tại.";
    }

    const duplicatedEmail = customers.some(
      (customer) =>
        customer.id !== editingId &&
        customer.email.trim() &&
        customer.email.trim().toLowerCase() === email.toLowerCase()
    );

    if (email && duplicatedEmail) {
      return "Email đã tồn tại.";
    }

    return "";
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      };

      if (editingId) {
        setCustomers((prev) =>
          prev.map((customer) =>
            customer.id === editingId
              ? {
                  ...customer,
                  ...payload,
                }
              : customer
          )
        );
      } else {
        const nextCustomer: Customer = {
          id: createCustomerId(),
          ...payload,
          createdAt: new Date().toISOString(),
        };

        setCustomers((prev) => [nextCustomer, ...prev]);
      }

      setIsDialogOpen(false);
      resetForm();
      toast.success(editingId ? "Cập nhật khách hàng thành công." : "Thêm khách hàng thành công.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    });
    setEditingId(customer.id);
    setError("");
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (deletingId) {
      return;
    }

    setIsDeleteDialogOpen(open);
    if (!open) {
      setCustomerToDelete(null);
    }
  };

  const handleConfirmDelete = () => {
    if (!customerToDelete) {
      return;
    }

    const targetCustomer = customerToDelete;
    setDeletingId(targetCustomer.id);

    try {
      setCustomers((prev) => prev.filter((customer) => customer.id !== targetCustomer.id));

      if (editingId === targetCustomer.id) {
        resetForm();
      }

      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
      toast.success(`Đã xóa khách hàng "${targetCustomer.name}".`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Khách hàng</p>
        <h1 className="text-2xl font-semibold tracking-tight">Quản lý khách hàng</h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi, thêm mới và cập nhật thông tin khách hàng.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/70">
          <CardHeader>
            <CardDescription>Tổng khách hàng</CardDescription>
            <CardTitle>{customers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/70">
          <CardHeader>
            <CardDescription>Có số điện thoại</CardDescription>
            <CardTitle>{customers.filter((customer) => customer.phone).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/70">
          <CardHeader>
            <CardDescription>Có email</CardDescription>
            <CardTitle>{customers.filter((customer) => customer.email).length}</CardTitle>
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

        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Hiển thị {filteredCustomers.length}/{customers.length} khách hàng
          </p>
          <Button
            type="button"
            className="cursor-pointer"
            onClick={handleOpenCreateDialog}
          >
            <Plus className="size-4" />
            Thêm khách hàng
          </Button>
        </div>
      </div>

      <Card className="border border-border/70">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Danh sách khách hàng</CardTitle>
          <CardDescription>
            Quản lý thông tin tên khách hàng, số điện thoại và email.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">STT</TableHead>
                <TableHead>Tên khách hàng</TableHead>
                <TableHead>Số điện thoại</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingCustomers ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    Đang tải danh sách khách hàng...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    Chưa có khách hàng nào.
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    Không tìm thấy khách hàng phù hợp với từ khóa: {searchQuery}.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer, index) => (
                  <TableRow key={customer.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone || "—"}</TableCell>
                    <TableCell>{customer.email || "—"}</TableCell>
                    <TableCell>{formatCreatedAt(customer.createdAt)}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="cursor-pointer"
                        disabled={isSubmitting || deletingId === customer.id}
                        onClick={() => handleEdit(customer)}
                        aria-label="Sửa khách hàng"
                        title="Sửa khách hàng"
                      >
                        <Edit2 className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="cursor-pointer text-red-500 hover:bg-red-500/10 hover:text-red-600"
                        disabled={isSubmitting || deletingId === customer.id}
                        onClick={() => handleOpenDeleteDialog(customer)}
                        aria-label="Xóa khách hàng"
                        title="Xóa khách hàng"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent
          size="default"
          className="!max-w-[34rem] overflow-hidden rounded-lg bg-background p-0 shadow-2xl ring-1 ring-black/10"
        >
          <AlertDialogHeader className="gap-0 border-b border-border/70 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <AlertDialogMedia className="m-0 size-10 shrink-0 rounded-lg bg-destructive/12 text-destructive">
                <Trash2 className="size-5" />
              </AlertDialogMedia>
              <AlertDialogTitle className="text-xl font-semibold leading-tight">
                Xóa khách hàng
              </AlertDialogTitle>
            </div>
          </AlertDialogHeader>

          <AlertDialogDescription className="px-5 py-4 text-sm leading-relaxed text-foreground/75">
            <span className="block">
              {customerToDelete
                ? `Bạn có chắc muốn xóa khách hàng "${customerToDelete.name}"?`
                : "Bạn có chắc muốn xóa khách hàng này?"}
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
              disabled={!customerToDelete || Boolean(deletingId)}
              className="cursor-pointer rounded-lg border-destructive/15 bg-destructive/10 px-4 text-sm font-semibold text-destructive hover:bg-destructive/15 hover:text-destructive"
              onClick={(event) => {
                event.preventDefault();
                handleConfirmDelete();
              }}
            >
              {deletingId ? "Đang xóa..." : "Xóa khách hàng"}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-xl">
          <DialogHeader className="space-y-2 border-b border-border/70 px-6 pb-4 pt-6">
            <DialogTitle className="text-xl">
              {editingId ? "Cập nhật khách hàng" : "Thêm khách hàng mới"}
            </DialogTitle>
            <DialogDescription>
              Nhập đầy đủ thông tin khách hàng để lưu vào danh sách quản lý.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
            <div className="rounded-xl border border-border/70 bg-background p-4 shadow-sm sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="customer-name" className="text-sm font-medium">
                    Tên khách hàng
                  </label>
                  <Input
                    id="customer-name"
                    placeholder="Nhập tên khách hàng"
                    value={form.name}
                    onChange={(event) => handleChange("name", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="customer-phone" className="text-sm font-medium">
                    Số điện thoại
                  </label>
                  <Input
                    id="customer-phone"
                    placeholder="VD: 0901234567"
                    value={form.phone}
                    onChange={(event) => handleChange("phone", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="customer-email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="VD: customer@email.com"
                    value={form.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                  />
                </div>
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

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
              <Button type="submit" className="cursor-pointer sm:min-w-[170px]" disabled={isSubmitting}>
                <Plus className="size-4" />
                {isSubmitting
                  ? editingId
                    ? "Đang lưu..."
                    : "Đang thêm..."
                  : editingId
                    ? "Lưu thay đổi"
                    : "Thêm khách hàng"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
