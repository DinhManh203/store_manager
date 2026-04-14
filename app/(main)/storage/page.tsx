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
  Copy,
  Check,
  Download,
  ImagePlus,
  Edit2,
  Loader2,
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
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type TransferOrderItemForm = {
  productId: string;
  quantity: string;
};

type TransferOrderForm = {
  reason: string;
  note: string;
  targetBranchId: string;
  items: TransferOrderItemForm[];
};

type ReturnOrderItemForm = {
  productId: string;
  quantity: string;
  unitPrice: string;
};

type ReturnOrderForm = {
  supplierId: string;
  sourceBranchId: string;
  note: string;
  items: ReturnOrderItemForm[];
};

type HoverPreview = {
  src: string;
  name: string;
  x: number;
  y: number;
};

type StockFilter = "all" | "stable" | "low" | "out";
type StorageTab = "inventory" | "categories" | "transfer-orders" | "return-orders";

type Supplier = {
  id: string;
  name: string;
};

type Branch = {
  id: string;
  name: string;
};

type TransferOrder = {
  id: string;
  reason: string;
  note: string;
  createdBy: string;
  createdAt: string;
  itemsCount: number;
  totalQuantity: number;
  targetBranchName?: string;
};

type ReturnOrder = {
  id: string;
  supplierName: string;
  totalAmount: number;
  note: string;
  createdBy: string;
  createdAt: string;
  itemsCount: number;
  totalQuantity: number;
  sourceBranchName?: string;
};

type CategorySummary = {
  catalogId?: string;
  key: string;
  name: string;
  productCount: number;
  totalQuantity: number;
  totalValue: number;
};

type CategoryItem = {
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

const createEmptyTransferOrderForm = (): TransferOrderForm => ({
  reason: "",
  note: "",
  targetBranchId: "",
  items: [{ productId: "", quantity: "1" }],
});

const createEmptyReturnOrderForm = (): ReturnOrderForm => ({
  supplierId: "",
  sourceBranchId: "",
  note: "",
  items: [{ productId: "", quantity: "1", unitPrice: "0" }],
});

const DEFAULT_CATEGORY_NAME = "Khác";
const CATEGORY_FALLBACK_STORAGE_KEY = "storage.custom-categories";
const STORAGE_ACTIVE_TAB_KEY = "storage.active-tab";
const NO_SUPPLIER_VALUE = "__none__";

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

const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
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

const normalizeCategoryName = (value: string) => value.trim().replace(/\s+/g, " ");

const getCategoryKey = (value: string) => normalizeSearchText(normalizeCategoryName(value));

const normalizeCategoryList = (values: string[]) => {
  const categoryMap = new Map<string, string>();

  values.forEach((value) => {
    const normalized = normalizeCategoryName(value);
    if (!normalized) {
      return;
    }

    const key = getCategoryKey(normalized);
    if (!categoryMap.has(key)) {
      categoryMap.set(key, normalized);
    }
  });

  return Array.from(categoryMap.values()).sort((left, right) =>
    left.localeCompare(right, "vi", { sensitivity: "base" })
  );
};

const createLocalCategoryItems = (values: string[]): CategoryItem[] =>
  normalizeCategoryList(values).map((name) => ({
    id: `local:${getCategoryKey(name)}`,
    name,
  }));

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
    category: readString(payload.category).trim() || DEFAULT_CATEGORY_NAME,
    quantity: Math.max(0, Math.trunc(readNumber(payload.quantity))),
    price: readNumber(payload.price),
    imageUrl: readString(payload.imageUrl).trim(),
    supplierId: readString(payload.supplierId).trim(),
    supplierName: readString(payload.supplierName).trim(),
    createdAt:
      readString(payload.createdAt).trim() || readString(payload.created_at).trim(),
  };
};

const normalizeCategoryPayload = (payload: unknown): CategoryItem | null => {
  if (!isObject(payload)) {
    return null;
  }

  const id = readString(payload.id).trim();
  const name = normalizeCategoryName(readString(payload.name));
  if (!id || !name) {
    return null;
  }

  return { id, name };
};

export default function StoragePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transferOrders, setTransferOrders] = useState<TransferOrder[]>([]);
  const [returnOrders, setReturnOrders] = useState<ReturnOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<StorageTab>("inventory");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [transferOrderForm, setTransferOrderForm] = useState<TransferOrderForm>(
    createEmptyTransferOrderForm
  );
  const [returnOrderForm, setReturnOrderForm] = useState<ReturnOrderForm>(
    createEmptyReturnOrderForm
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isTransferOrderDialogOpen, setIsTransferOrderDialogOpen] = useState(false);
  const [isReturnOrderDialogOpen, setIsReturnOrderDialogOpen] = useState(false);
  const [imageFileName, setImageFileName] = useState("");
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isExportingProducts, setIsExportingProducts] = useState(false);
  const [isSubmittingTransferOrder, setIsSubmittingTransferOrder] = useState(false);
  const [isSubmittingReturnOrder, setIsSubmittingReturnOrder] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productsLoadError, setProductsLoadError] = useState("");
  const [transferOrdersLoadError, setTransferOrdersLoadError] = useState("");
  const [returnOrdersLoadError, setReturnOrdersLoadError] = useState("");
  const [isLoadingTransferOrders, setIsLoadingTransferOrders] = useState(true);
  const [isLoadingReturnOrders, setIsLoadingReturnOrders] = useState(true);
  const [error, setError] = useState("");
  const [transferOrderError, setTransferOrderError] = useState("");
  const [returnOrderError, setReturnOrderError] = useState("");
  const [categoryCatalog, setCategoryCatalog] = useState<CategoryItem[]>([]);
  const [isCategoryApiUnavailable, setIsCategoryApiUnavailable] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const totalQuantity = useMemo(
    () => products.reduce((sum, product) => sum + product.quantity, 0),
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

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const categorySummaries = useMemo(() => {
    const categoryMap = new Map<string, CategorySummary>();

    products.forEach((product) => {
      const categoryName = normalizeCategoryName(product.category) || DEFAULT_CATEGORY_NAME;
      const key = getCategoryKey(categoryName);
      const current = categoryMap.get(key);

      if (!current) {
        categoryMap.set(key, {
          key,
          name: categoryName,
          productCount: 1,
          totalQuantity: product.quantity,
          totalValue: product.quantity * product.price,
        });
        return;
      }

      current.productCount += 1;
      current.totalQuantity += product.quantity;
      current.totalValue += product.quantity * product.price;
    });

    categoryCatalog.forEach((category) => {
      const normalized = normalizeCategoryName(category.name);
      if (!normalized) {
        return;
      }

      const key = getCategoryKey(normalized);
      const current = categoryMap.get(key);
      if (current) {
        current.catalogId = category.id;
        current.name = category.name;
        return;
      }

      categoryMap.set(key, {
        catalogId: category.id,
        key,
        name: normalized,
        productCount: 0,
        totalQuantity: 0,
        totalValue: 0,
      });
    });

    return Array.from(categoryMap.values()).sort((left, right) =>
      left.name.localeCompare(right.name, "vi", { sensitivity: "base" })
    );
  }, [categoryCatalog, products]);

  const categoryInUseCount = useMemo(
    () => categorySummaries.filter((category) => category.productCount > 0).length,
    [categorySummaries]
  );

  const emptyCategoryCount = useMemo(
    () => categorySummaries.filter((category) => category.productCount === 0).length,
    [categorySummaries]
  );

  const categoryOptions = useMemo(
    () => normalizeCategoryList(categorySummaries.map((category) => category.name)),
    [categorySummaries]
  );

  const transferOrderTotalQuantityPreview = useMemo(
    () =>
      transferOrderForm.items.reduce((sum, item) => {
        const quantity = Number(item.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          return sum;
        }
        return sum + Math.trunc(quantity);
      }, 0),
    [transferOrderForm.items]
  );

  const returnOrderTotalAmountPreview = useMemo(
    () =>
      returnOrderForm.items.reduce((sum, item) => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);

        if (
          !Number.isFinite(quantity) ||
          quantity <= 0 ||
          !Number.isFinite(unitPrice) ||
          unitPrice <= 0
        ) {
          return sum;
        }

        return sum + Math.trunc(quantity) * unitPrice;
      }, 0),
    [returnOrderForm.items]
  );

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
        const nextSuppliers = payload
          .filter((item): item is Record<string, unknown> => isObject(item))
          .map((item) => ({
            id: readString(item.id).trim(),
            name: readString(item.name).trim(),
          }))
          .filter((item) => Boolean(item.id) && Boolean(item.name));
        setSuppliers(nextSuppliers);
      }
    } catch {
      // Keep it simple and ignore supplier load failures for now
    }
  };

  const loadBranchesFromApi = async () => {
    try {
      const response = await fetch("/api/branches", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(payload)) {
        const nextBranches = payload
          .filter((item): item is Record<string, unknown> => isObject(item))
          .map((item) => ({
            id: readString(item.id).trim(),
            name: readString(item.name).trim(),
          }))
          .filter((item) => Boolean(item.id) && Boolean(item.name));
        setBranches(nextBranches);
      }
    } catch {
      // Ignore failures
    }
  };

  const loadCategoriesFromApi = async () => {
    const loadLocalFallback = () => {
      if (typeof window === "undefined") {
        return [] as CategoryItem[];
      }

      try {
        const raw = window.localStorage.getItem(CATEGORY_FALLBACK_STORAGE_KEY);
        if (!raw) {
          return [] as CategoryItem[];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          return [] as CategoryItem[];
        }

        return createLocalCategoryItems(parsed.map((item) => readString(item)));
      } catch {
        return [] as CategoryItem[];
      }
    };

    try {
      const response = await fetch("/api/categories", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (
        response.ok &&
        isObject(payload) &&
        payload.unavailable === true
      ) {
        const fallbackCategories = loadLocalFallback();
        setCategoryCatalog(fallbackCategories);
        setIsCategoryApiUnavailable(true);
        setCategoryError("");
        return;
      }

      if (!response.ok) {
        if (response.status === 404) {
          const fallbackCategories = loadLocalFallback();
          setCategoryCatalog(fallbackCategories);
          setIsCategoryApiUnavailable(true);
          setCategoryError("");
          return;
        }

        const message =
          extractErrorMessage(payload) || "Không thể tải danh sách danh mục từ API.";
        setCategoryError(message);
        return;
      }

      const nextCategories = Array.isArray(payload)
        ? payload
            .map((item) => normalizeCategoryPayload(item))
            .filter((item): item is CategoryItem => item !== null)
        : [];

      setIsCategoryApiUnavailable(false);
      setCategoryCatalog(nextCategories);
      setCategoryError("");
    } catch {
      const fallbackCategories = loadLocalFallback();
      if (fallbackCategories.length > 0) {
        setCategoryCatalog(fallbackCategories);
        setIsCategoryApiUnavailable(true);
        setCategoryError("");
        return;
      }

      setCategoryError("Không thể kết nối API danh mục.");
    }
  };

  const loadTransferOrdersFromApi = async () => {
    setIsLoadingTransferOrders(true);

    try {
      const response = await fetch("/api/export-orders", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          extractErrorMessage(payload) || "Không thể tải danh sách đơn chuyển.";
        setTransferOrdersLoadError(message);
        return;
      }

      const orders = Array.isArray(payload)
        ? payload
            .filter((item): item is Record<string, unknown> => isObject(item))
            .map((item) => ({
              id: readString(item.id).trim(),
              reason: readString(item.reason).trim(),
              note: readString(item.note).trim(),
              createdBy: readString(item.createdBy).trim(),
              createdAt: readString(item.createdAt).trim(),
              itemsCount: Math.max(0, Math.trunc(readNumber(item.itemsCount))),
              totalQuantity: Math.max(0, Math.trunc(readNumber(item.totalQuantity))),
            }))
            .filter((item) => Boolean(item.id))
        : [];

      setTransferOrders(orders);
      setTransferOrdersLoadError("");
    } catch {
      setTransferOrdersLoadError("Không thể kết nối API đơn chuyển.");
    } finally {
      setIsLoadingTransferOrders(false);
    }
  };

  const loadReturnOrdersFromApi = async () => {
    setIsLoadingReturnOrders(true);

    try {
      const response = await fetch("/api/import-orders", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          extractErrorMessage(payload) || "Không thể tải danh sách đơn trả.";
        setReturnOrdersLoadError(message);
        return;
      }

      const orders = Array.isArray(payload)
        ? payload
            .filter((item): item is Record<string, unknown> => isObject(item))
            .map((item) => ({
              id: readString(item.id).trim(),
              supplierName: readString(item.supplierName).trim(),
              totalAmount: readNumber(item.totalAmount),
              note: readString(item.note).trim(),
              createdBy: readString(item.createdBy).trim(),
              createdAt: readString(item.createdAt).trim(),
              itemsCount: Math.max(0, Math.trunc(readNumber(item.itemsCount))),
              totalQuantity: Math.max(0, Math.trunc(readNumber(item.totalQuantity))),
            }))
            .filter((item) => Boolean(item.id))
        : [];

      setReturnOrders(orders);
      setReturnOrdersLoadError("");
    } catch {
      setReturnOrdersLoadError("Không thể kết nối API đơn trả.");
    } finally {
      setIsLoadingReturnOrders(false);
    }
  };

  useEffect(() => {
    void loadProductsFromApi();
    void loadSuppliersFromApi();
    void loadBranchesFromApi();
    void loadCategoriesFromApi();
    void loadTransferOrdersFromApi();
    void loadReturnOrdersFromApi();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedTab = window.localStorage.getItem(STORAGE_ACTIVE_TAB_KEY);
    if (
      storedTab === "inventory" ||
      storedTab === "categories" ||
      storedTab === "transfer-orders" ||
      storedTab === "return-orders"
    ) {
      setActiveTab(storedTab);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_ACTIVE_TAB_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!isCategoryApiUnavailable || typeof window === "undefined") {
      return;
    }

    try {
      const categoryNames = normalizeCategoryList(
        categoryCatalog.map((category) => category.name)
      );
      window.localStorage.setItem(
        CATEGORY_FALLBACK_STORAGE_KEY,
        JSON.stringify(categoryNames)
      );
    } catch {
      // Ignore localStorage write errors
    }
  }, [categoryCatalog, isCategoryApiUnavailable]);

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

  const resetTransferOrderForm = () => {
    setTransferOrderForm(createEmptyTransferOrderForm());
    setTransferOrderError("");
  };

  const resetReturnOrderForm = () => {
    setReturnOrderForm(createEmptyReturnOrderForm());
    setReturnOrderError("");
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
      setError("Kích thước ảnh tối đa là 15MB.");
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
    const category = form.category.trim();
    const quantity = Number(form.quantity);
    const price = Number(form.price);

    if (categoryOptions.length === 0) {
      return "Chưa có danh mục nào. Vui lòng tạo danh mục trước khi thêm sản phẩm.";
    }

    if (!name || !sku || !category || !form.quantity || !form.price || !form.supplierId) {
      return "Vui lòng nhập đầy đủ thông tin (bắt buộc chọn danh mục và nhà cung cấp).";
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
      toast.error(validationError);
      return;
    }

    const payload = {
      name: form.name.trim(),
      imageUrl: form.imageUrl.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category.trim(),
      quantity: Number(form.quantity),
      price: Number(form.price),
      supplierId: form.supplierId,
      supplierName: suppliers.find(s => s.id === form.supplierId)?.name || "",
    };

    setError("");
    setIsSubmittingProduct(true);
    const loadingToastId = toast.loading(
      editingId ? "Đang lưu sản phẩm..." : "Đang thêm sản phẩm..."
    );

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
        toast.error(message, { id: loadingToastId });
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
      toast.success(
        editingId
          ? `Đã lưu thay đổi sản phẩm "${payload.name}".`
          : `Đã thêm sản phẩm "${payload.name}".`,
        { id: loadingToastId }
      );
    } catch {
      const message = editingId
        ? "Không thể kết nối API cập nhật sản phẩm."
        : "Không thể kết nối API thêm sản phẩm.";
      setError(
        editingId
          ? "Không thể kết nối API cập nhật sản phẩm."
          : "Không thể kết nối API thêm sản phẩm."
      );
      toast.error(message, { id: loadingToastId });
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleTransferOrderFieldChange = (
    field: keyof Omit<TransferOrderForm, "items">,
    value: string
  ) => {
    setTransferOrderForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTransferOrderItemChange = (
    index: number,
    field: keyof TransferOrderItemForm,
    value: string
  ) => {
    setTransferOrderForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleAddTransferOrderItem = () => {
    setTransferOrderForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: "1" }],
    }));
  };

  const handleRemoveTransferOrderItem = (index: number) => {
    setTransferOrderForm((prev) => {
      if (prev.items.length <= 1) {
        return { ...prev, items: [{ productId: "", quantity: "1" }] };
      }

      return {
        ...prev,
        items: prev.items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const validateTransferOrderCreateForm = () => {
    if (!transferOrderForm.targetBranchId) {
      return "Vui lòng chọn chi nhánh đích.";
    }

    if (transferOrderForm.items.length === 0) {
      return "Vui lòng thêm ít nhất một sản phẩm chuyển kho.";
    }

    const selectedProductIds = new Set<string>();

    for (let index = 0; index < transferOrderForm.items.length; index += 1) {
      const item = transferOrderForm.items[index];
      const rowNumber = index + 1;
      const productId = item.productId.trim();

      if (!productId) {
        return `Vui lòng chọn sản phẩm ở dòng ${rowNumber}.`;
      }

      if (selectedProductIds.has(productId)) {
        return `Sản phẩm ở dòng ${rowNumber} đang bị trùng, vui lòng gộp số lượng vào một dòng.`;
      }
      selectedProductIds.add(productId);

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return `Số lượng ở dòng ${rowNumber} phải là số nguyên lớn hơn 0.`;
      }

      const selectedProduct = productsById.get(productId);
      if (!selectedProduct) {
        return `Không tìm thấy sản phẩm ở dòng ${rowNumber}. Vui lòng chọn lại.`;
      }

      if (quantity > selectedProduct.quantity) {
        return `Số lượng chuyển của "${selectedProduct.name}" vượt tồn kho hiện tại (${selectedProduct.quantity}).`;
      }
    }

    return "";
  };

  const handleSubmitTransferOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateTransferOrderCreateForm();
    if (validationError) {
      setTransferOrderError(validationError);
      return;
    }

    const payload = {
      reason: transferOrderForm.reason.trim(),
      note: transferOrderForm.note.trim(),
      targetBranchId: transferOrderForm.targetBranchId,
      items: transferOrderForm.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
    };

    setTransferOrderError("");
    setIsSubmittingTransferOrder(true);

    try {
      const response = await fetch("/api/export-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          extractErrorMessage(responsePayload) || "Không thể thêm đơn chuyển qua API.";
        setTransferOrderError(message);
        return;
      }

      await Promise.all([loadTransferOrdersFromApi(), loadProductsFromApi()]);
      setTransferOrdersLoadError("");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("notifications:refresh"));
      }

      resetTransferOrderForm();
      setIsTransferOrderDialogOpen(false);
      toast.success("Đã thêm đơn chuyển mới.");
    } catch {
      setTransferOrderError("Không thể kết nối API thêm đơn chuyển.");
    } finally {
      setIsSubmittingTransferOrder(false);
    }
  };

  const handleReturnOrderFieldChange = (
    field: keyof Omit<ReturnOrderForm, "items">,
    value: string
  ) => {
    setReturnOrderForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReturnOrderItemChange = (
    index: number,
    field: keyof ReturnOrderItemForm,
    value: string
  ) => {
    setReturnOrderForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleAddReturnOrderItem = () => {
    setReturnOrderForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: "1", unitPrice: "0" }],
    }));
  };

  const handleRemoveReturnOrderItem = (index: number) => {
    setReturnOrderForm((prev) => {
      if (prev.items.length <= 1) {
        return {
          ...prev,
          items: [{ productId: "", quantity: "1", unitPrice: "0" }],
        };
      }

      return {
        ...prev,
        items: prev.items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const validateReturnOrderCreateForm = () => {
    if (!returnOrderForm.supplierId && !returnOrderForm.sourceBranchId) {
      return "Vui lòng chọn nhà cung cấp hoặc chi nhánh nguồn.";
    }

    if (returnOrderForm.items.length === 0) {
      return "Vui lòng thêm ít nhất một sản phẩm nhập kho.";
    }

    const selectedProductIds = new Set<string>();

    for (let index = 0; index < returnOrderForm.items.length; index += 1) {
      const item = returnOrderForm.items[index];
      const rowNumber = index + 1;
      const productId = item.productId.trim();

      if (!productId) {
        return `Vui lòng chọn sản phẩm ở dòng ${rowNumber}.`;
      }

      if (selectedProductIds.has(productId)) {
        return `Sản phẩm ở dòng ${rowNumber} đang bị trùng, vui lòng gộp số lượng vào một dòng.`;
      }
      selectedProductIds.add(productId);

      if (!productsById.has(productId)) {
        return `Không tìm thấy sản phẩm ở dòng ${rowNumber}. Vui lòng chọn lại.`;
      }

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return `Số lượng ở dòng ${rowNumber} phải là số nguyên lớn hơn 0.`;
      }

      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return `Đơn giá ở dòng ${rowNumber} phải lớn hơn 0.`;
      }
    }

    return "";
  };

  const handleSubmitReturnOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateReturnOrderCreateForm();
    if (validationError) {
      setReturnOrderError(validationError);
      return;
    }

    const payload = {
      supplierId: returnOrderForm.supplierId.trim(),
      sourceBranchId: returnOrderForm.sourceBranchId.trim(),
      note: returnOrderForm.note.trim(),
      items: returnOrderForm.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    };

    setReturnOrderError("");
    setIsSubmittingReturnOrder(true);

    try {
      const response = await fetch("/api/import-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          extractErrorMessage(responsePayload) || "Không thể thêm đơn trả qua API.";
        setReturnOrderError(message);
        return;
      }

      await Promise.all([loadReturnOrdersFromApi(), loadProductsFromApi()]);
      setReturnOrdersLoadError("");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("notifications:refresh"));
      }

      resetReturnOrderForm();
      setIsReturnOrderDialogOpen(false);
      toast.success("Đã thêm đơn trả mới.");
    } catch {
      setReturnOrderError("Không thể kết nối API thêm đơn trả.");
    } finally {
      setIsSubmittingReturnOrder(false);
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

  const handleOpenCreateTransferOrder = () => {
    resetTransferOrderForm();
    setIsTransferOrderDialogOpen(true);
  };

  const handleOpenCreateReturnOrder = () => {
    resetReturnOrderForm();
    setIsReturnOrderDialogOpen(true);
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

  const getProductsByCategoryKey = (categoryKey: string) =>
    products.filter((product) => {
      const normalizedCategory = normalizeCategoryName(product.category) || DEFAULT_CATEGORY_NAME;
      return getCategoryKey(normalizedCategory) === categoryKey;
    });

  const updateSingleProductCategory = async (product: Product, category: string) => {
    const response = await fetch("/api/products", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        sku: product.sku,
        category,
        quantity: product.quantity,
        price: product.price,
        supplierId: product.supplierId || "",
        supplierName: product.supplierName || "",
      }),
    });

    const responsePayload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        extractErrorMessage(responsePayload) ||
          `Không thể cập nhật danh mục cho sản phẩm "${product.name}".`
      );
    }

    return normalizeProductPayload(responsePayload) ?? { ...product, category };
  };

  const createCategory = async (name: string) => {
    if (isCategoryApiUnavailable) {
      return {
        id: `local:${getCategoryKey(name)}`,
        name,
      };
    }

    const response = await fetch("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
    const responsePayload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        extractErrorMessage(responsePayload) || "Không thể thêm danh mục qua API."
      );
    }

    return normalizeCategoryPayload(responsePayload) ?? {
      id: `${Date.now()}`,
      name,
    };
  };

  const updateCategory = async (id: string, name: string) => {
    if (isCategoryApiUnavailable) {
      return { id, name };
    }

    const response = await fetch("/api/categories", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, name }),
    });
    const responsePayload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        extractErrorMessage(responsePayload) || "Không thể cập nhật danh mục qua API."
      );
    }

    return normalizeCategoryPayload(responsePayload) ?? { id, name };
  };

  const deleteCategory = async (id: string) => {
    if (isCategoryApiUnavailable) {
      return;
    }

    const response = await fetch(`/api/categories?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const responsePayload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        extractErrorMessage(responsePayload) || "Không thể xóa danh mục qua API."
      );
    }
  };

  const handleAddCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingCategory) {
      return;
    }

    const normalized = normalizeCategoryName(newCategoryName);
    if (!normalized) {
      setCategoryError("Vui lòng nhập tên danh mục.");
      return;
    }

    const categoryKey = getCategoryKey(normalized);
    const existed = categorySummaries.some((category) => category.key === categoryKey);
    if (existed) {
      setCategoryError("Danh mục đã tồn tại.");
      return;
    }

    setIsSubmittingCategory(true);
    setCategoryError("");
    const loadingToastId = toast.loading("Đang thêm danh mục...");

    try {
      const createdCategory = await createCategory(normalized);
      setCategoryCatalog((prev) => {
        const nextByKey = new Map(
          prev.map((item) => [getCategoryKey(item.name), item] as const)
        );
        nextByKey.set(getCategoryKey(createdCategory.name), createdCategory);
        return Array.from(nextByKey.values()).sort((left, right) =>
          left.name.localeCompare(right.name, "vi", { sensitivity: "base" })
        );
      });
      setNewCategoryName("");
      toast.success(`Đã thêm danh mục "${createdCategory.name}".`, {
        id: loadingToastId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể thêm danh mục sản phẩm.";
      setCategoryError(message);
      toast.error(message, { id: loadingToastId });
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleStartCategoryEdit = (category: CategorySummary) => {
    if (isSubmittingCategory) {
      return;
    }

    if (category.key === getCategoryKey(DEFAULT_CATEGORY_NAME)) {
      const message = `Không thể đổi tên danh mục "${DEFAULT_CATEGORY_NAME}".`;
      setCategoryError(message);
      toast.error(message);
      return;
    }

    setEditingCategoryKey(category.key);
    setEditingCategoryValue(category.name);
    setCategoryError("");
  };

  const handleCancelCategoryEdit = () => {
    setEditingCategoryKey(null);
    setEditingCategoryValue("");
    setCategoryError("");
  };

  const handleSaveCategoryEdit = async (category: CategorySummary) => {
    if (isSubmittingCategory) {
      return;
    }

    const nextName = normalizeCategoryName(editingCategoryValue);
    if (!nextName) {
      setCategoryError("Vui lòng nhập tên danh mục.");
      return;
    }

    const nextKey = getCategoryKey(nextName);
    if (
      nextKey !== category.key &&
      categorySummaries.some((item) => item.key === nextKey)
    ) {
      setCategoryError("Tên danh mục đã tồn tại.");
      return;
    }

    const affectedProducts = getProductsByCategoryKey(category.key);
    const loadingToastId = toast.loading("Đang cập nhật danh mục...");
    setIsSubmittingCategory(true);
    setCategoryError("");

    try {
      if (affectedProducts.length > 0) {
        const updateResults = await Promise.allSettled(
          affectedProducts.map((product) => updateSingleProductCategory(product, nextName))
        );

        const fulfilledResults = updateResults.filter(
          (result): result is PromiseFulfilledResult<Product> => result.status === "fulfilled"
        );
        const rejectedResults = updateResults.filter(
          (result): result is PromiseRejectedResult => result.status === "rejected"
        );

        if (fulfilledResults.length > 0) {
          const nextProductsById = new Map(
            fulfilledResults.map((result) => [result.value.id, result.value])
          );
          setProducts((prev) =>
            prev.map((product) => nextProductsById.get(product.id) ?? product)
          );
        }

        if (rejectedResults.length > 0) {
          const firstError = rejectedResults[0]?.reason;
          const message =
            firstError instanceof Error
              ? firstError.message
              : "Không thể cập nhật danh mục cho một số sản phẩm.";
          setCategoryError(message);
          toast.error(message, { id: loadingToastId });
          return;
        }
      }

      const persistedCategory = category.catalogId
        ? await updateCategory(category.catalogId, nextName)
        : await createCategory(nextName);

      setCategoryCatalog((prev) => {
        const nextByKey = new Map(
          prev.map((item) => [getCategoryKey(item.name), item] as const)
        );
        nextByKey.delete(category.key);
        nextByKey.set(getCategoryKey(persistedCategory.name), persistedCategory);
        return Array.from(nextByKey.values()).sort((left, right) =>
          left.name.localeCompare(right.name, "vi", { sensitivity: "base" })
        );
      });
      setEditingCategoryKey(null);
      setEditingCategoryValue("");
      toast.success(`Đã đổi danh mục "${category.name}" thành "${nextName}".`, {
        id: loadingToastId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể cập nhật danh mục sản phẩm.";
      setCategoryError(message);
      toast.error(message, { id: loadingToastId });
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (category: CategorySummary) => {
    if (isSubmittingCategory) {
      return;
    }

    const affectedProducts = getProductsByCategoryKey(category.key);
    if (
      category.key === getCategoryKey(DEFAULT_CATEGORY_NAME) &&
      affectedProducts.length > 0
    ) {
      const message = `Không thể xóa danh mục "${DEFAULT_CATEGORY_NAME}" vì vẫn còn sản phẩm đang sử dụng.`;
      setCategoryError(message);
      toast.error(message);
      return;
    }

    const confirmMessage =
      affectedProducts.length > 0
        ? `Xóa danh mục "${category.name}" và chuyển ${affectedProducts.length} sản phẩm về "${DEFAULT_CATEGORY_NAME}"?`
        : `Xóa danh mục "${category.name}"?`;

    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) {
      return;
    }

    const loadingToastId = toast.loading("Đang xóa danh mục...");
    setIsSubmittingCategory(true);
    setCategoryError("");

    try {
      if (affectedProducts.length > 0) {
        const updateResults = await Promise.allSettled(
          affectedProducts.map((product) =>
            updateSingleProductCategory(product, DEFAULT_CATEGORY_NAME)
          )
        );

        const fulfilledResults = updateResults.filter(
          (result): result is PromiseFulfilledResult<Product> => result.status === "fulfilled"
        );
        const rejectedResults = updateResults.filter(
          (result): result is PromiseRejectedResult => result.status === "rejected"
        );

        if (fulfilledResults.length > 0) {
          const nextProductsById = new Map(
            fulfilledResults.map((result) => [result.value.id, result.value])
          );
          setProducts((prev) =>
            prev.map((product) => nextProductsById.get(product.id) ?? product)
          );
        }

        if (rejectedResults.length > 0) {
          const firstError = rejectedResults[0]?.reason;
          const message =
            firstError instanceof Error
              ? firstError.message
              : "Không thể chuyển danh mục cho một số sản phẩm.";
          setCategoryError(message);
          toast.error(message, { id: loadingToastId });
          return;
        }
      }

      if (category.catalogId) {
        await deleteCategory(category.catalogId);
      }

      setCategoryCatalog((prev) =>
        prev.filter(
          (item) =>
            item.id !== category.catalogId &&
            getCategoryKey(item.name) !== category.key
        )
      );

      if (editingCategoryKey === category.key) {
        setEditingCategoryKey(null);
        setEditingCategoryValue("");
      }

      toast.success(
        affectedProducts.length > 0
          ? `Đã xóa danh mục "${category.name}" và chuyển sản phẩm về "${DEFAULT_CATEGORY_NAME}".`
          : `Đã xóa danh mục "${category.name}".`,
        { id: loadingToastId }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể xóa danh mục sản phẩm.";
      setCategoryError(message);
      toast.error(message, { id: loadingToastId });
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleCopyOrderId = async (orderId: string, orderTypeLabel: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      toast.error("Trình duyệt không hỗ trợ sao chép tự động.");
      return;
    }

    try {
      await navigator.clipboard.writeText(orderId);
      toast.success(`Đã sao chép mã ${orderTypeLabel}: ${orderId}`);
    } catch {
      toast.error(`Không thể sao chép mã ${orderTypeLabel}.`);
    }
  };

  const handleExportProductsExcel = async () => {
    if (isLoadingProducts || isExportingProducts || filteredProducts.length === 0) {
      return;
    }

    const loadingToastId = toast.loading("Đang xuất danh sách sản phẩm...");
    setIsExportingProducts(true);

    try {
      const XLSX = await import("xlsx");
      const headers = [
        "STT",
        "Tên sản phẩm",
        "SKU",
        "Nhà cung cấp",
        "Danh mục",
        "Số lượng",
        "Giá/SP",
        "Tổng giá trị tồn",
        "Trạng thái",
        "Thời gian tạo",
      ];

      const rows = filteredProducts.map((product, index) => ({
        STT: index + 1,
        "Tên sản phẩm": product.name,
        SKU: product.sku || "-",
        "Nhà cung cấp": product.supplierName || "-",
        "Danh mục": product.category || DEFAULT_CATEGORY_NAME,
        "Số lượng": product.quantity,
        "Giá/SP": product.price,
        "Tổng giá trị tồn": product.quantity * product.price,
        "Trạng thái": getStockBadge(product.quantity).label,
        "Thời gian tạo": formatDateTime(product.createdAt),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 28 },
        { wch: 14 },
        { wch: 20 },
        { wch: 16 },
        { wch: 10 },
        { wch: 14 },
        { wch: 18 },
        { wch: 14 },
        { wch: 22 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachSanPham");

      const output = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const blob = new Blob([output], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const now = new Date();
      const fileName = `danh-sach-san-pham-${now
        .toISOString()
        .slice(0, 19)
        .replaceAll(":", "-")}.xlsx`;

      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);

      toast.success("Đã xuất danh sách sản phẩm ra Excel.", { id: loadingToastId });
    } catch (error) {
      console.error("Không thể xuất danh sách sản phẩm:", error);
      toast.error("Không thể xuất danh sách sản phẩm ra file Excel.", {
        id: loadingToastId,
      });
    } finally {
      setIsExportingProducts(false);
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
        {isCategoryApiUnavailable ? (
          <p className="mt-2 text-xs text-amber-600">
            API danh mục trên backend chưa sẵn sàng. Hệ thống đang dùng chế độ lưu danh mục cục bộ
            trên trình duyệt.
          </p>
        ) : null}
      </section>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as StorageTab)}
        className="w-full flex-col gap-4"
      >
        <TabsList className="h-auto w-fit max-w-full justify-start gap-1 overflow-x-auto rounded-xl bg-muted/70 p-1">
          <TabsTrigger
            value="inventory"
            className="h-9 flex-none cursor-pointer px-4 text-sm text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm data-active:bg-background data-active:font-semibold data-active:text-foreground data-active:shadow-sm"
          >
            Tồn kho
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="h-9 flex-none cursor-pointer px-4 text-sm text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm data-active:bg-background data-active:font-semibold data-active:text-foreground data-active:shadow-sm"
          >
            Danh mục
          </TabsTrigger>
          <TabsTrigger
            value="transfer-orders"
            className="h-9 flex-none cursor-pointer px-4 text-sm text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm data-active:bg-background data-active:font-semibold data-active:text-foreground data-active:shadow-sm"
          >
            Đơn chuyển
          </TabsTrigger>
          <TabsTrigger
            value="return-orders"
            className="h-9 flex-none cursor-pointer px-4 text-sm text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm data-active:bg-background data-active:font-semibold data-active:text-foreground data-active:shadow-sm"
          >
            Đơn trả
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-0 space-y-6">
          <section className="grid gap-4 md:grid-cols-2">
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Danh sách sản phẩm</CardTitle>
                  <CardDescription>
                    Chỉnh sửa hoặc xóa trực tiếp từng sản phẩm trong bảng.
                  </CardDescription>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    disabled={isLoadingProducts || isExportingProducts || filteredProducts.length === 0}
                    onClick={() => void handleExportProductsExcel()}
                  >
                    {isExportingProducts ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    {isExportingProducts ? "Đang xuất..." : "Xuất Excel"}
                  </Button>
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
                    <TableHead>Giá/SP</TableHead>
                    <TableHead>Tổng giá trị tồn</TableHead>
                    <TableHead className="min-w-[180px]">Thời gian tạo</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingProducts ? (
                    <TableRow>
                      <TableCell colSpan={12} className="py-6 text-center text-muted-foreground">
                        Đang tải danh sách sản phẩm...
                      </TableCell>
                    </TableRow>
                  ) : products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="py-6 text-center text-muted-foreground">
                        Chưa có sản phẩm nào trong kho.
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="py-6 text-center text-muted-foreground">
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
                          <TableCell>{formatCurrency(product.quantity * product.price)}</TableCell>
                          <TableCell>{formatDateTime(product.createdAt)}</TableCell>
                          <TableCell>
                            <Badge variant={stock.variant}>{stock.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer"
                                disabled={isSubmittingProduct || deletingProductId === product.id}
                                onClick={() => handleEdit(product)}
                                aria-label="Sửa sản phẩm"
                                title="Sửa sản phẩm"
                              >
                                <Edit2 className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-red-500"
                                disabled={isSubmittingProduct || deletingProductId === product.id}
                                onClick={() => handleOpenDeleteDialog(product)}
                                aria-label="Xóa sản phẩm"
                                title={
                                  deletingProductId === product.id
                                    ? "Đang xử lý xóa..."
                                    : "Xóa sản phẩm"
                                }
                              >
                                <Trash2 className="size-4" />
                              </Button>
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
        </TabsContent>

        <TabsContent value="categories" className="mt-0 space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <Card className="border border-border/70">
              <CardHeader>
                <CardDescription>Tổng danh mục</CardDescription>
                <CardTitle>{categorySummaries.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border border-border/70">
              <CardHeader>
                <CardDescription>Danh mục đang dùng</CardDescription>
                <CardTitle>{categoryInUseCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border border-border/70">
              <CardHeader>
                <CardDescription>Danh mục trống</CardDescription>
                <CardTitle>{emptyCategoryCount}</CardTitle>
              </CardHeader>
            </Card>
          </section>

          <Card className="border border-border/70">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Quản lý danh mục</CardTitle>
              <CardDescription>
                Thêm mới, đổi tên hoặc xóa danh mục sản phẩm trực tiếp trên hệ thống.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <form
                onSubmit={handleAddCategory}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <Input
                  value={newCategoryName}
                  onChange={(event) => {
                    setNewCategoryName(event.target.value);
                    if (categoryError) {
                      setCategoryError("");
                    }
                  }}
                  placeholder="Nhập tên danh mục mới"
                  className="sm:max-w-sm"
                  disabled={isSubmittingCategory}
                />
                <Button
                  type="submit"
                  className="cursor-pointer sm:min-w-[140px]"
                  disabled={isSubmittingCategory || !newCategoryName.trim()}
                >
                  {isSubmittingCategory ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Thêm danh mục
                </Button>
              </form>

              {categoryError ? (
                <p className="text-sm text-destructive">{categoryError}</p>
              ) : null}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">STT</TableHead>
                    <TableHead>Tên danh mục</TableHead>
                    <TableHead className="text-right">Số sản phẩm</TableHead>
                    <TableHead className="text-right">Tổng tồn</TableHead>
                    <TableHead className="text-right">Giá trị tồn</TableHead>
                    <TableHead className="text-right">Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorySummaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                        Chưa có danh mục nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categorySummaries.map((category, index) => {
                      const isEditingCategory = editingCategoryKey === category.key;
                      const isDefaultCategory = category.key === getCategoryKey(DEFAULT_CATEGORY_NAME);

                      return (
                        <TableRow key={category.key}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell>
                            {isEditingCategory ? (
                              <Input
                                value={editingCategoryValue}
                                onChange={(event) => setEditingCategoryValue(event.target.value)}
                                disabled={isSubmittingCategory}
                                className="max-w-sm"
                              />
                            ) : (
                              <span className="font-medium">{category.name}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{category.productCount}</TableCell>
                          <TableCell className="text-right">{category.totalQuantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(category.totalValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={category.productCount > 0 ? "secondary" : "outline"}>
                              {category.productCount > 0 ? "Đang sử dụng" : "Chưa sử dụng"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {isEditingCategory ? (
                              <div className="flex justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="cursor-pointer text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-emerald-600"
                                  disabled={isSubmittingCategory || !editingCategoryValue.trim()}
                                  onClick={() => void handleSaveCategoryEdit(category)}
                                  aria-label="Lưu danh mục"
                                  title="Lưu danh mục"
                                >
                                  {isSubmittingCategory ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <Check className="size-4" />
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="cursor-pointer"
                                  disabled={isSubmittingCategory}
                                  onClick={handleCancelCategoryEdit}
                                  aria-label="Hủy sửa danh mục"
                                  title="Hủy sửa danh mục"
                                >
                                  <X className="size-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="cursor-pointer"
                                  disabled={isSubmittingCategory}
                                  onClick={() => handleStartCategoryEdit(category)}
                                  aria-label="Sửa danh mục"
                                  title={
                                    isDefaultCategory
                                      ? `Không thể đổi tên danh mục "${DEFAULT_CATEGORY_NAME}".`
                                      : "Sửa danh mục"
                                  }
                                >
                                  <Edit2 className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-red-500"
                                  disabled={isSubmittingCategory}
                                  onClick={() => void handleDeleteCategory(category)}
                                  aria-label="Xóa danh mục"
                                  title={
                                    isDefaultCategory && category.productCount > 0
                                      ? `Không thể xóa danh mục "${DEFAULT_CATEGORY_NAME}" vì vẫn còn sản phẩm đang sử dụng.`
                                      : "Xóa danh mục"
                                  }
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer-orders" className="mt-0">
          <Card className="border border-border/70">
            <CardHeader className="border-b border-border/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Đơn chuyển kho</CardTitle>
                  <CardDescription>
                    Danh sách phiếu xuất kho dùng để chuyển hàng nội bộ.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  className="cursor-pointer"
                  onClick={handleOpenCreateTransferOrder}
                >
                  <Plus className="size-4" />
                  Thêm đơn
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">STT</TableHead>
                    <TableHead className="min-w-[170px]">Mã đơn</TableHead>
                    <TableHead className="min-w-[180px]">Thời gian</TableHead>
                    <TableHead>Chi nhánh đích</TableHead>
                    <TableHead>Người tạo</TableHead>
                    <TableHead>Số mặt hàng</TableHead>
                    <TableHead>Tổng SL</TableHead>
                    <TableHead>Lý do</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTransferOrders ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-6 text-center text-muted-foreground">
                        Đang tải đơn chuyển...
                      </TableCell>
                    </TableRow>
                  ) : transferOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-6 text-center text-muted-foreground">
                        Chưa có đơn chuyển nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transferOrders.map((order, index) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{order.id}</TableCell>
                        <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                        <TableCell>{order.targetBranchName || "—"}</TableCell>
                        <TableCell>{order.createdBy || "Không rõ"}</TableCell>
                        <TableCell>{order.itemsCount}</TableCell>
                        <TableCell>{order.totalQuantity}</TableCell>
                        <TableCell>{order.reason || "—"}</TableCell>
                        <TableCell>{order.note || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer"
                            onClick={() => void handleCopyOrderId(order.id, "đơn chuyển")}
                            aria-label="Sao chép mã đơn chuyển"
                            title="Sao chép mã đơn chuyển"
                          >
                            <Copy className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {transferOrdersLoadError ? (
                <p className="mt-3 text-sm text-destructive">{transferOrdersLoadError}</p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="return-orders" className="mt-0">
          <Card className="border border-border/70">
            <CardHeader className="border-b border-border/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Đơn trả kho</CardTitle>
                  <CardDescription>
                    Danh sách phiếu nhập kho từ các đợt trả hàng hoặc hoàn kho.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  className="cursor-pointer"
                  onClick={handleOpenCreateReturnOrder}
                >
                  <Plus className="size-4" />
                  Thêm đơn
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">STT</TableHead>
                    <TableHead className="min-w-[170px]">Mã đơn</TableHead>
                    <TableHead className="min-w-[180px]">Thời gian</TableHead>
                    <TableHead>Nguồn trả (NCC/Chi nhánh)</TableHead>
                    <TableHead>Người tạo</TableHead>
                    <TableHead>Số mặt hàng</TableHead>
                    <TableHead>Tổng SL</TableHead>
                    <TableHead>Tổng tiền</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingReturnOrders ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-6 text-center text-muted-foreground">
                        Đang tải đơn trả...
                      </TableCell>
                    </TableRow>
                  ) : returnOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-6 text-center text-muted-foreground">
                        Chưa có đơn trả nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    returnOrders.map((order, index) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{order.id}</TableCell>
                        <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                        <TableCell>
                          {order.sourceBranchName ? `[CN] ${order.sourceBranchName}` : order.supplierName ? `[NCC] ${order.supplierName}` : "—"}
                        </TableCell>
                        <TableCell>{order.createdBy || "Không rõ"}</TableCell>
                        <TableCell>{order.itemsCount}</TableCell>
                        <TableCell>{order.totalQuantity}</TableCell>
                        <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                        <TableCell>{order.note || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer"
                            onClick={() => void handleCopyOrderId(order.id, "đơn trả")}
                            aria-label="Sao chép mã đơn trả"
                            title="Sao chép mã đơn trả"
                          >
                            <Copy className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {returnOrdersLoadError ? (
                <p className="mt-3 text-sm text-destructive">{returnOrdersLoadError}</p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
        <DialogContent
          className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-4xl"
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
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
                <div className="rounded-xl bg-muted/30 p-4">
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
                      : "Hỗ trợ JPG, PNG, WEBP (tối đa 15MB)."}
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
                    <Select
                      value={form.category || undefined}
                      onValueChange={(value) => handleChange("category", value)}
                      disabled={categoryOptions.length === 0}
                    >
                      <SelectTrigger id="product-category" className="w-full">
                        <SelectValue placeholder="-- Chọn danh mục --" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((categoryName) => (
                          <SelectItem key={categoryName} value={categoryName}>
                            {categoryName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {categoryOptions.length === 0 ? (
                      <p className="text-xs text-amber-600">
                        Chưa có danh mục nào. Vui lòng vào tab Danh mục để tạo trước khi thêm sản
                        phẩm.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Muốn thêm mới hoặc đổi tên danh mục? Vào tab Danh mục để quản lý.
                      </p>
                    )}
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
                      step="any"
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
                {isSubmittingProduct ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
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

      <Dialog
        open={isTransferOrderDialogOpen}
        onOpenChange={(open) => {
          if (isSubmittingTransferOrder) {
            return;
          }

          setIsTransferOrderDialogOpen(open);
          if (!open) {
            resetTransferOrderForm();
          }
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-3xl"
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="space-y-2 border-b border-border/70 px-6 pt-6 pb-4">
            <DialogTitle className="text-xl">Thêm đơn chuyển kho</DialogTitle>
            <DialogDescription>
              Tạo phiếu xuất kho nội bộ. Chọn sản phẩm, số lượng và ghi chú nếu cần.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitTransferOrder} className="space-y-5 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="transfer-target-branch" className="text-sm font-medium text-destructive">
                  Chi nhánh đích *
                </label>
                <Select
                  value={transferOrderForm.targetBranchId || undefined}
                  onValueChange={(value) =>
                    handleTransferOrderFieldChange("targetBranchId", value)
                  }
                >
                  <SelectTrigger id="transfer-target-branch" className="w-full">
                    <SelectValue placeholder="-- Chọn chi nhánh đích --" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="transfer-reason" className="text-sm font-medium">
                  Lý do chuyển kho
                </label>
                <Input
                  id="transfer-reason"
                  placeholder="VD: Điều phối hàng giữa các kho"
                  value={transferOrderForm.reason}
                  onChange={(event) =>
                    handleTransferOrderFieldChange("reason", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="transfer-note" className="text-sm font-medium">
                  Ghi chú
                </label>
                <Textarea
                  id="transfer-note"
                  placeholder="Ghi chú thêm (nếu có)"
                  value={transferOrderForm.note}
                  onChange={(event) =>
                    handleTransferOrderFieldChange("note", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Danh sách sản phẩm chuyển</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={isSubmittingTransferOrder}
                  onClick={handleAddTransferOrderItem}
                >
                  <Plus className="size-3.5" />
                  Thêm dòng
                </Button>
              </div>

              <div className="space-y-3">
                {transferOrderForm.items.map((item, index) => {
                  const selectedProduct = productsById.get(item.productId);

                  return (
                    <div
                      key={`transfer-item-${index + 1}`}
                      className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_140px_140px]"
                    >
                      <div className="space-y-2">
                        <label className="block h-4 text-xs leading-4 font-medium text-muted-foreground">
                          Sản phẩm {index + 1}
                        </label>
                        <Select
                          value={item.productId || undefined}
                          onValueChange={(value) =>
                            handleTransferOrderItemChange(index, "productId", value)
                          }
                        >
                          <SelectTrigger className="h-9 w-full py-0 leading-none">
                            <SelectValue placeholder="-- Chọn sản phẩm --" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                                {product.sku ? ` (${product.sku})` : ""} - Tồn: {product.quantity}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedProduct ? (
                          <p className="text-xs text-muted-foreground">
                            Tồn khả dụng: {selectedProduct.quantity}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <label className="block h-4 text-xs leading-4 font-medium text-muted-foreground">
                          Số lượng
                        </label>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          className="h-9 py-0 text-sm leading-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="0"
                          value={item.quantity}
                          onChange={(event) =>
                            handleTransferOrderItemChange(index, "quantity", event.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block h-4 text-xs leading-4 font-medium text-muted-foreground">
                          Thao tác
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full cursor-pointer py-0 text-sm leading-none"
                          disabled={
                            isSubmittingTransferOrder || transferOrderForm.items.length === 1
                          }
                          onClick={() => handleRemoveTransferOrderItem(index)}
                        >
                          <Trash2 className="size-3.5" />
                          Xóa dòng
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Tổng số lượng chuyển: {transferOrderTotalQuantityPreview}
              </p>
            </div>

            {transferOrderError ? (
              <p className="text-sm text-destructive">{transferOrderError}</p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={isSubmittingTransferOrder}
                onClick={() => {
                  setIsTransferOrderDialogOpen(false);
                  resetTransferOrderForm();
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="cursor-pointer sm:min-w-[170px]"
                disabled={isSubmittingTransferOrder}
              >
                <Plus className="size-4" />
                {isSubmittingTransferOrder ? "Đang thêm..." : "Thêm đơn chuyển"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isReturnOrderDialogOpen}
        onOpenChange={(open) => {
          if (isSubmittingReturnOrder) {
            return;
          }

          setIsReturnOrderDialogOpen(open);
          if (!open) {
            resetReturnOrderForm();
          }
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-4xl"
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="space-y-2 border-b border-border/70 px-6 pt-6 pb-4">
            <DialogTitle className="text-xl">Thêm đơn trả kho</DialogTitle>
            <DialogDescription>
              Tạo phiếu nhập kho từ trả hàng hoặc hoàn kho, có thể chọn nhà cung cấp và đơn
              giá theo từng sản phẩm.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitReturnOrder} className="space-y-5 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="return-supplier" className="text-sm font-medium">
                  Nhà cung cấp (tùy chọn)
                </label>
                <Select
                  value={returnOrderForm.supplierId || NO_SUPPLIER_VALUE}
                  onValueChange={(value) =>
                    handleReturnOrderFieldChange(
                      "supplierId",
                      value === NO_SUPPLIER_VALUE ? "" : value
                    )
                  }
                >
                  <SelectTrigger id="return-supplier" className="w-full">
                    <SelectValue placeholder="-- Không chọn nhà cung cấp --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SUPPLIER_VALUE}>-- Không chọn nhà cung cấp --</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="return-source-branch" className="text-sm font-medium">
                  Chi nhánh nguồn (tùy chọn)
                </label>
                <Select
                  value={returnOrderForm.sourceBranchId || NO_SUPPLIER_VALUE}
                  onValueChange={(value) =>
                    handleReturnOrderFieldChange(
                      "sourceBranchId",
                      value === NO_SUPPLIER_VALUE ? "" : value
                    )
                  }
                >
                  <SelectTrigger id="return-source-branch" className="w-full">
                    <SelectValue placeholder="-- Không chọn chi nhánh nguồn --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SUPPLIER_VALUE}>-- Không chọn chi nhánh nguồn --</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="return-note" className="text-sm font-medium">
                  Ghi chú
                </label>
                <Textarea
                  id="return-note"
                  placeholder="Ghi chú thêm (nếu có)"
                  value={returnOrderForm.note}
                  onChange={(event) =>
                    handleReturnOrderFieldChange("note", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Danh sách sản phẩm nhập</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={isSubmittingReturnOrder}
                  onClick={handleAddReturnOrderItem}
                >
                  <Plus className="size-3.5" />
                  Thêm dòng
                </Button>
              </div>

              <div className="space-y-3">
                {returnOrderForm.items.map((item, index) => (
                  <div
                    key={`return-item-${index + 1}`}
                    className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 lg:grid-cols-[minmax(0,1fr)_110px_150px_140px]"
                  >
                    <div className="space-y-2">
                      <label className="block h-4 text-xs leading-4 font-medium text-muted-foreground">
                        Sản phẩm {index + 1}
                      </label>
                      <Select
                        value={item.productId || undefined}
                        onValueChange={(value) =>
                          handleReturnOrderItemChange(index, "productId", value)
                        }
                      >
                        <SelectTrigger className="h-9 w-full py-0 leading-none">
                          <SelectValue placeholder="-- Chọn sản phẩm --" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                              {product.sku ? ` (${product.sku})` : ""} - Tồn: {product.quantity}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="block h-4 text-xs leading-4 font-medium text-muted-foreground">
                        Số lượng
                      </label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        className="h-9 py-0 text-sm leading-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        placeholder="0"
                        value={item.quantity}
                        onChange={(event) =>
                          handleReturnOrderItemChange(index, "quantity", event.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block h-4 text-xs leading-4 font-medium text-muted-foreground">
                        Đơn giá
                      </label>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        className="h-9 py-0 text-sm leading-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        placeholder="0"
                        value={item.unitPrice}
                        onChange={(event) =>
                          handleReturnOrderItemChange(index, "unitPrice", event.target.value)
                        }
                      />
                    </div>

                      <div className="space-y-2">
                        <label className="block h-4 text-xs leading-4 font-medium text-muted-foreground">
                          Thao tác
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full cursor-pointer py-0 text-sm leading-none"
                          disabled={isSubmittingReturnOrder || returnOrderForm.items.length === 1}
                          onClick={() => handleRemoveReturnOrderItem(index)}
                        >
                        <Trash2 className="size-3.5" />
                        Xóa dòng
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Tổng tiền tạm tính: {formatCurrency(returnOrderTotalAmountPreview)}
              </p>
            </div>

            {returnOrderError ? (
              <p className="text-sm text-destructive">{returnOrderError}</p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={isSubmittingReturnOrder}
                onClick={() => {
                  setIsReturnOrderDialogOpen(false);
                  resetReturnOrderForm();
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="cursor-pointer sm:min-w-[170px]"
                disabled={isSubmittingReturnOrder}
              >
                <Plus className="size-4" />
                {isSubmittingReturnOrder ? "Đang thêm..." : "Thêm đơn trả"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
