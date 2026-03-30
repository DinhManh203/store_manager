"use client";

import { FormEvent, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  price: number;
};

type ProductForm = {
  name: string;
  sku: string;
  category: string;
  quantity: string;
  price: string;
};

const initialProducts: Product[] = [
  {
    id: "p-1",
    name: "Bàn phím cơ K87",
    sku: "KB-K87",
    category: "Phụ kiện",
    quantity: 24,
    price: 890000,
  },
  {
    id: "p-2",
    name: "Chuột không dây M550",
    sku: "MS-M550",
    category: "Phụ kiện",
    quantity: 8,
    price: 420000,
  },
  {
    id: "p-3",
    name: "Màn hình 24 inch IPS",
    sku: "MN-24IPS",
    category: "Thiết bị",
    quantity: 5,
    price: 2750000,
  },
];

const emptyForm: ProductForm = {
  name: "",
  sku: "",
  category: "",
  quantity: "",
  price: "",
};

const formatCurrency = (value: number) =>
  value.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

const getStockBadge = (quantity: number) => {
  if (quantity === 0) {
    return { label: "Hết hàng", variant: "destructive" as const };
  }

  if (quantity < 10) {
    return { label: "Sắp hết", variant: "outline" as const };
  }

  return { label: "Ổn định", variant: "secondary" as const };
};

export default function StoragePage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

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

  const handleChange = (field: keyof ProductForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  };

  const validateForm = () => {
    const name = form.name.trim();
    const sku = form.sku.trim();
    const quantity = Number(form.quantity);
    const price = Number(form.price);

    if (!name || !sku || !form.quantity || !form.price) {
      return "Vui lòng nhập đầy đủ tên, SKU, số lượng và giá.";
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
        product.sku.toLowerCase() === sku.toLowerCase()
    );

    if (duplicatedSku) {
      return "SKU đã tồn tại, vui lòng dùng mã khác.";
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

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category.trim() || "Khác",
      quantity: Number(form.quantity),
      price: Number(form.price),
    };

    if (editingId) {
      setProducts((prev) =>
        prev.map((product) =>
          product.id === editingId ? { ...product, ...payload } : product
        )
      );
      resetForm();
      return;
    }

    const newProduct: Product = {
      id: `${Date.now()}`,
      ...payload,
    };

    setProducts((prev) => [newProduct, ...prev]);
    resetForm();
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      quantity: String(product.quantity),
      price: String(product.price),
    });
    setEditingId(product.id);
    setError("");
  };

  const handleDelete = (product: Product) => {
    const isAccepted = window.confirm(
      `Bạn có chắc muốn xóa sản phẩm "${product.name}"?`
    );

    if (!isAccepted) {
      return;
    }

    setProducts((prev) => prev.filter((item) => item.id !== product.id));

    if (editingId === product.id) {
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

      <Card className="border border-border/70">
        <CardHeader className="border-b border-border/70">
          <CardTitle>
            {editingId ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
          </CardTitle>
          <CardDescription>
            Nhập thông tin cơ bản để quản lý hàng trong kho.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Input
                placeholder="Tên sản phẩm"
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
              />
              <Input
                placeholder="SKU"
                value={form.sku}
                onChange={(event) => handleChange("sku", event.target.value)}
              />
              <Input
                placeholder="Danh mục"
                value={form.category}
                onChange={(event) => handleChange("category", event.target.value)}
              />
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="Số lượng"
                value={form.quantity}
                onChange={(event) => handleChange("quantity", event.target.value)}
              />
              <Input
                type="number"
                min={0}
                step={1000}
                placeholder="Giá (VND)"
                value={form.price}
                onChange={(event) => handleChange("price", event.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-wrap gap-2">
              <Button type="submit">
                <Plus className="size-4" />
                {editingId ? "Lưu thay đổi" : "Thêm sản phẩm"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Hủy chỉnh sửa
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-border/70">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Danh sách sản phẩm</CardTitle>
          <CardDescription>
            Chỉnh sửa hoặc xóa trực tiếp từng sản phẩm trong bảng.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead>Số lượng</TableHead>
                <TableHead>Giá</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Chưa có sản phẩm nào trong kho.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const stock = getStockBadge(product.quantity);

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{product.quantity}</TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        <Badge variant={stock.variant}>{stock.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="size-3.5" />
                            Sửa
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(product)}
                          >
                            <Trash2 className="size-3.5" />
                            Xóa
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
