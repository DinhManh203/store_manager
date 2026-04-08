"use client";

import {
  ChangeEvent,
  FormEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ImagePlus,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

import { extractErrorMessage } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";

type Product = {
  id: string;
  name: string;
  imageUrl: string;
  sku: string;
  category: string;
  quantity: number;
  price: number;
  createdAt: string;
  supplierId?: string;
  supplierName?: string;
};

type ProductForm = {
  name: string;
  imageUrl: string;
  sku: string;
  category: string;
  quantity: string;
  price: string;
  supplierId: string;
};

type HoverPreview = {
  src: string;
  name: string;
  x: number;
  y: number;
};

type StockFilter = "all" | "stable" | "low" | "out";

type Supplier = {
  id: string;
  name: string;
};

const emptyForm: ProductForm = {
  name: "",
  imageUrl: "",
  sku: "",
  category: "",
  quantity: "",
  price: "",
  supplierId: "",
};

const formatCurrency = (value: number) =>
  value.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

const formatDateTime = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Không rõ";
  }

  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(parsedDate);

  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const second = parts.find((part) => part.type === "second")?.value ?? "00";

  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
};

const getStockBadge = (quantity: number) => {
  if (quantity === 0) {
    return { label: "Hết hàng", variant: "destructive" as const };
  }

  if (quantity < 10) {
    return { label: "Sắp hết", variant: "outline" as const };
  }

  return { label: "Ổn định", variant: "secondary" as const };
};

const getProductInitials = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "SP";
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const HOVER_PREVIEW_WIDTH = 360;
const HOVER_PREVIEW_HEIGHT = 320;
const HOVER_PREVIEW_PADDING = 16;

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

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const matchStockFilter = (quantity: number, filter: StockFilter) => {
  if (filter === "all") {
    return true;
  }

  if (filter === "out") {
    return quantity === 0;
  }

  if (filter === "low") {
    return quantity > 0 && quantity < 10;
  }

  return quantity >= 10;
};

const normalizeProductPayload = (payload: unknown): Product | null => {
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
    sku: readString(payload.sku).trim(),
    category: readString(payload.category).trim() || "Khác",
    quantity: Math.max(0, Math.trunc(readNumber(payload.quantity))),
    price: readNumber(payload.price),
    imageUrl: readString(payload.imageUrl).trim(),
    supplierId: readString(payload.supplierId).trim(),
    supplierName: readString(payload.supplierName).trim(),
    createdAt:
      readString(payload.createdAt).trim() || readString(payload.created_at).trim(),
  };
};

export default function StoragePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [imageFileName, setImageFileName] = useState("");
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productsLoadError, setProductsLoadError] = useState("");
  const [error, setError] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const totalQuantity = useMemo(
    () => products.reduce((sum, product) => sum + product.quantity, 0),
    [products]
  );

  const totalInventoryValue = useMemo(
    () =>
      products.reduce(
        (sum, product) => sum + product.quantity * product.price,
        0
      ),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const keyword = normalizeSearchText(searchQuery);
    return products.filter((product) => {
      if (!matchStockFilter(product.quantity, stockFilter)) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystack = normalizeSearchText(
        [product.name, product.sku, product.category].join(" ")
      );
      return haystack.includes(keyword);
    });
  }, [products, searchQuery, stockFilter]);

  const loadProductsFromApi = async () => {
    setIsLoadingProducts(true);

    try {
      const response = await fetch("/api/products", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          extractErrorMessage(payload) || "Không thể tải danh sách sản phẩm từ API.";
        setProductsLoadError(message);
        return;
      }

      const nextProducts = Array.isArray(payload)
        ? payload
            .map((item) => normalizeProductPayload(item))
            .filter((item): item is Product => item !== null)
        : [];

      setProducts(nextProducts);
      setHoverPreview(null);
      setProductsLoadError("");
    } catch {
      setProductsLoadError("Không thể kết nối API danh sách sản phẩm.");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadSuppliersFromApi = async () => {
    try {
      const response = await fetch("/api/suppliers", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(payload)) {
        setSuppliers(payload.map((s: any) => ({
          id: readString(s.id).trim(),
          name: readString(s.name).trim(),
        })));
      }
    } catch {
      // Keep it simple and ignore supplier load failures for now
    }
  };

  useEffect(() => {
    void loadProductsFromApi();
    void loadSuppliersFromApi();
  }, []);

  const handleChange = (field: keyof ProductForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setImageFileName("");
    setError("");
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file hình ảnh hợp lệ.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Kích thước ảnh tối đa là 5MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("Không thể đọc file ảnh, vui lòng thử lại.");
        return;
      }

      handleChange("imageUrl", reader.result);
      setImageFileName(file.name);
      setError("");
    };
    reader.onerror = () => {
      setError("Không thể đọc file ảnh, vui lòng thử lại.");
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    handleChange("imageUrl", "");
    setImageFileName("");
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleHoverPreview = (
    event: ReactMouseEvent<HTMLDivElement>,
    product: Product
  ) => {
    if (!product.imageUrl) {
      return;
    }

    let x = event.clientX + 20;
    let y = event.clientY - HOVER_PREVIEW_HEIGHT / 2;

    if (typeof window !== "undefined") {
      const maxX = window.innerWidth - HOVER_PREVIEW_WIDTH - HOVER_PREVIEW_PADDING;
      const maxY = window.innerHeight - HOVER_PREVIEW_HEIGHT - HOVER_PREVIEW_PADDING;

      x = Math.min(
        Math.max(x, HOVER_PREVIEW_PADDING),
        Math.max(HOVER_PREVIEW_PADDING, maxX)
      );
      y = Math.min(
        Math.max(y, HOVER_PREVIEW_PADDING),
        Math.max(HOVER_PREVIEW_PADDING, maxY)
      );
    }

    setHoverPreview({
      src: product.imageUrl,
      name: product.name,
      x,
      y,
    });
  };

  const clearHoverPreview = () => {
    setHoverPreview(null);
  };

  const validateForm = () => {
    const name = form.name.trim();
    const sku = form.sku.trim();
    const quantity = Number(form.quantity);
    const price = Number(form.price);

    if (!name || !sku || !form.quantity || !form.price || !form.supplierId) {
      return "Vui lòng nhập đầy đủ thông tin (bắt buộc chọn nhà cung cấp).";
    }

    if (Number.isNaN(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
      return "Số lượng phải là số nguyên không âm.";
    }

    if (Number.isNaN(price) || price <= 0) {
      return "Giá phải là số lớn hơn 0.";
    }

    const duplicatedSku = products.some(
      (product) =>
        product.id !== editingId &&
        Boolean(product.sku.trim()) &&
        product.sku.toLowerCase() === sku.toLowerCase()
    );

    if (duplicatedSku) {
      return "SKU đã tồn tại, vui lòng dùng mã khác.";
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
      imageUrl: form.imageUrl.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category.trim() || "Khác",
      quantity: Number(form.quantity),
      price: Number(form.price),
      supplierId: form.supplierId,
      supplierName: suppliers.find(s => s.id === form.supplierId)?.name || "",
    };

    setError("");
    setIsSubmittingProduct(true);

    try {
      const response = await fetch("/api/products", {
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
            ? "Không thể cập nhật sản phẩm qua API."
            : "Không thể thêm sản phẩm qua API.");
        setError(message);
        return;
      }

      const normalizedProduct = normalizeProductPayload(responsePayload);
      if (normalizedProduct) {
        if (editingId) {
          setProducts((prev) =>
            prev.map((product) => (product.id === editingId ? normalizedProduct : product))
          );
        } else {
          setProducts((prev) => [normalizedProduct, ...prev]);
        }
      } else {
        await loadProductsFromApi();
      }

      setProductsLoadError("");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("notifications:refresh"));
      }
      resetForm();
      setIsProductDialogOpen(false);
    } catch {
      setError(
        editingId
          ? "Không thể kết nối API cập nhật sản phẩm."
          : "Không thể kết nối API thêm sản phẩm."
      );
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleEdit = (product: Product) => {
    const currentImageName = product.imageUrl
      ? product.imageUrl.startsWith("data:")
        ? "Ảnh đã tải lên"
        : product.imageUrl.split("/").pop()?.split("?")[0] ?? "Ảnh hiện tại"
      : "";

    setForm({
      name: product.name,
      imageUrl: product.imageUrl,
      sku: product.sku,
      category: product.category,
      quantity: String(product.quantity),
      price: String(product.price),
      supplierId: product.supplierId || "",
    });
    setImageFileName(currentImageName);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    setEditingId(product.id);
    setError("");
    setIsProductDialogOpen(true);
  };

  const handleOpenCreateProductDialog = () => {
    resetForm();
    setIsProductDialogOpen(true);
  };

  const handleOpenDeleteDialog = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (deletingProductId) {
      return;
    }

    setIsDeleteDialogOpen(open);
    if (!open) {
      setProductToDelete(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) {
      return;
    }

    const targetProduct = productToDelete;
    setDeletingProductId(targetProduct.id);

    try {
      const response = await fetch(`/api/products?id=${encodeURIComponent(targetProduct.id)}`, {
        method: "DELETE",
      });
      const responsePayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          extractErrorMessage(responsePayload) || "Không thể xóa sản phẩm qua API.";
        toast.error(message);
        return;
      }

      setProducts((prev) => prev.filter((item) => item.id !== targetProduct.id));
      clearHoverPreview();
      setProductsLoadError("");
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      toast.success(`Đã xóa sản phẩm "${targetProduct.name}".`);
    } catch {
      toast.error("Không thể kết nối API xóa sản phẩm.");
      return;
    } finally {
      setDeletingProductId(null);
    }

    if (editingId === targetProduct.id) {
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Kho hàng</p>
        <h1 className="text-2xl font-semibold tracking-tight">Quản lý kho hàng</h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi sản phẩm và cập nhật nhanh thông tin tồn kho.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/70">
          <CardHeader>
            <CardDescription>Tổng sản phẩm</CardDescription>
            <CardTitle>{products.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/70">
          <CardHeader>
            <CardDescription>Tổng tồn kho</CardDescription>
            <CardTitle>{totalQuantity}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-border/70">
          <CardHeader>
            <CardDescription>Giá trị tồn kho</CardDescription>
            <CardTitle>{formatCurrency(totalInventoryValue)}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm theo tên, SKU, danh mục..."
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={stockFilter}
            onValueChange={(value) => setStockFilter(value as StockFilter)}
          >
            <div className="relative w-full sm:w-[220px]">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
              <SelectTrigger className="w-full cursor-pointer pl-9">
                <SelectValue placeholder="Lọc theo trạng thái" />
              </SelectTrigger>
            </div>
            <SelectContent align="end" className="w-[220px]">
              <SelectItem value="all" className="cursor-pointer">
                Tất cả trạng thái
              </SelectItem>
              <SelectItem value="stable" className="cursor-pointer">
                Ổn định
              </SelectItem>
              <SelectItem value="low" className="cursor-pointer">
                Sắp hết
              </SelectItem>
              <SelectItem value="out" className="cursor-pointer">
                Hết hàng
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Hiển thị {filteredProducts.length}/{products.length} sản phẩm
          </p>
        </div>
      </div>

      <Card className="border border-border/70">
        <CardHeader className="border-b border-border/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Danh sách sản phẩm</CardTitle>
              <CardDescription>
                Chỉnh sửa hoặc xóa trực tiếp từng sản phẩm trong bảng.
              </CardDescription>
            </div>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={isSubmittingProduct}
              onClick={handleOpenCreateProductDialog}
            >
              <Plus className="size-4" />
              Thêm sản phẩm
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">STT</TableHead>
                <TableHead className="w-28">Hình ảnh</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Nhà cung cấp</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead>Số lượng</TableHead>
                <TableHead>Giá</TableHead>
                <TableHead className="min-w-[180px]">Thời gian tạo</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingProducts ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-6 text-center text-muted-foreground">
                    Đang tải danh sách sản phẩm...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-6 text-center text-muted-foreground">
                    Chưa có sản phẩm nào trong kho.
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-6 text-center text-muted-foreground">
                    Không tìm thấy sản phẩm phù hợp với từ khóa: {searchQuery}.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product, index) => {
                  const stock = getStockBadge(product.quantity);

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <div
                          className="group relative inline-flex"
                          onMouseEnter={(event) => handleHoverPreview(event, product)}
                          onMouseMove={(event) => handleHoverPreview(event, product)}
                          onMouseLeave={clearHoverPreview}
                        >
                          <div className="size-11 overflow-hidden border border-border/70 bg-muted">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                loading="lazy"
                                className="size-full object-cover transition-transform duration-200 group-hover:scale-110"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-xs font-medium text-muted-foreground">
                                {getProductInitials(product.name)}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.supplierName || "—"}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{product.quantity}</TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell>{formatDateTime(product.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={stock.variant}>{stock.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="cursor-pointer"
                            disabled={isSubmittingProduct || deletingProductId === product.id}
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="size-3.5" />
                            Sửa
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="cursor-pointer"
                            disabled={isSubmittingProduct || deletingProductId === product.id}
                            onClick={() => handleOpenDeleteDialog(product)}
                          >
                            <Trash2 className="size-3.5" />
                            {deletingProductId === product.id ? "Đang xóa" : "Xóa"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {productsLoadError ? (
            <p className="mt-3 text-sm text-destructive">{productsLoadError}</p>
          ) : null}
        </CardContent>
      </Card>

      {hoverPreview ? (
        <div
          className="pointer-events-none fixed z-[100] hidden md:block"
          style={{
            left: `${hoverPreview.x}px`,
            top: `${hoverPreview.y}px`,
          }}
        >
          <div className="w-[22.5rem] overflow-hidden rounded-xl border border-border/80 bg-background shadow-2xl ring-1 ring-black/10">
            <div className="flex h-64 items-center justify-center bg-muted/35 p-2">
              <img
                src={hoverPreview.src}
                alt={hoverPreview.name}
                loading="lazy"
                className="max-h-full w-full object-contain"
              />
            </div>
            <div className="border-t border-border/70 px-3 py-2 text-xs font-medium text-foreground">
              {hoverPreview.name}
            </div>
          </div>
        </div>
      ) : null}

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
                Xóa sản phẩm
              </AlertDialogTitle>
            </div>
          </AlertDialogHeader>

          <AlertDialogDescription className="px-5 py-4 text-sm leading-relaxed text-foreground/75">
            <span className="block">
              {productToDelete
                ? `Bạn có chắc muốn xóa sản phẩm "${productToDelete.name}"?`
                : "Bạn có chắc muốn xóa sản phẩm này?"}
            </span>
            <span className="mt-1 block">Hành động này không thể hoàn tác.</span>
          </AlertDialogDescription>

          <AlertDialogFooter className="m-0 flex items-center justify-end gap-2 border-t border-border/70 bg-background px-5 py-4">
            <AlertDialogCancel
              disabled={Boolean(deletingProductId)}
              className="cursor-pointer rounded-lg border-border/70 bg-background px-4 text-sm font-medium text-foreground hover:bg-muted/50"
            >
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              variant="outline"
              disabled={!productToDelete || Boolean(deletingProductId)}
              className="cursor-pointer rounded-lg border-destructive/15 bg-destructive/10 px-4 text-sm font-semibold text-destructive hover:bg-destructive/15 hover:text-destructive"
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {deletingProductId ? "Đang xóa..." : "Xóa sản phẩm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isProductDialogOpen}
        onOpenChange={(open) => {
          setIsProductDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-4xl">
          <DialogHeader className="space-y-2 border-b border-border/70 px-6 pt-6 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-xl">
                {editingId ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
              </DialogTitle>
              <Badge variant="secondary" className="text-[11px] font-medium">
                {editingId ? "Chế độ chỉnh sửa" : "Tạo mới"}
              </Badge>
            </div>
            <DialogDescription>
              Điền thông tin chính, tải ảnh từ máy và lưu sản phẩm ngay trong bảng kho.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <div className="space-y-3">
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Hình ảnh sản phẩm</p>
                    {form.imageUrl ? (
                      <Badge variant="secondary" className="text-[11px] font-medium">
                        Đã chọn ảnh
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px] font-medium">
                        Chưa có ảnh
                      </Badge>
                    )}
                  </div>

                  <div className="relative aspect-square overflow-hidden rounded-lg border border-dashed border-border/70 bg-background">
                    {form.imageUrl ? (
                      <>
                        <img
                          src={form.imageUrl}
                          alt={form.name || "Hình ảnh sản phẩm"}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 size-8 rounded-full shadow-md"
                          onClick={handleRemoveImage}
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Xóa ảnh</span>
                        </Button>
                      </>
                    ) : (
                      <div className="flex size-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                        <ImagePlus className="size-5" />
                        <p className="px-4 text-xs">Chưa có ảnh, vui lòng tải ảnh từ máy</p>
                      </div>
                    )}
                  </div>

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />

                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <ImagePlus className="size-4" />
                      {form.imageUrl ? "Đổi ảnh" : "Tải ảnh"}
                    </Button>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    {imageFileName
                      ? `Đã chọn: ${imageFileName}. Bấm nút thùng rác trên ảnh để xóa.`
                      : "Hỗ trợ JPG, PNG, WEBP (tối đa 5MB)."}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-background p-4 shadow-sm sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="product-name" className="text-sm font-medium">
                      Tên sản phẩm
                    </label>
                    <Input
                      id="product-name"
                      placeholder="Nhập tên sản phẩm"
                      value={form.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="product-sku" className="text-sm font-medium">
                      SKU
                    </label>
                    <Input
                      id="product-sku"
                      placeholder="VD: KB-K87"
                      value={form.sku}
                      onChange={(event) => handleChange("sku", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="product-category" className="text-sm font-medium">
                      Danh mục
                    </label>
                    <Input
                      id="product-category"
                      placeholder="VD: Phụ kiện"
                      value={form.category}
                      onChange={(event) => handleChange("category", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="product-supplier" className="text-sm font-medium">
                      Nhà cung cấp
                    </label>
                    <Select
                      value={form.supplierId || undefined}
                      onValueChange={(value) => handleChange("supplierId", value)}
                    >
                      <SelectTrigger id="product-supplier" className="w-full">
                        <SelectValue placeholder="-- Chọn nhà cung cấp --" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="product-quantity" className="text-sm font-medium">
                      Số lượng
                    </label>
                    <Input
                      id="product-quantity"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      value={form.quantity}
                      onChange={(event) => handleChange("quantity", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="product-price" className="text-sm font-medium">
                      Giá (VND)
                    </label>
                    <Input
                      id="product-price"
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="0"
                      value={form.price}
                      onChange={(event) => handleChange("price", event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={isSubmittingProduct}
                onClick={() => {
                  setIsProductDialogOpen(false);
                  resetForm();
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="cursor-pointer sm:min-w-[170px]"
                disabled={isSubmittingProduct}
              >
                <Plus className="size-4" />
                {isSubmittingProduct
                  ? editingId
                    ? "Đang lưu..."
                    : "Đang thêm..."
                  : editingId
                    ? "Lưu thay đổi"
                    : "Thêm sản phẩm"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
