"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Boxes,
  CircleAlert,
  PackageCheck,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DashboardOverview = {
  tong_san_pham: number;
  tong_ton_kho: number;
  het_hang: number;
  sap_het_hang: number;
};

type DashboardActivity = {
  id: string;
  product_id: string;
  product_name: string;
  change_type: string;
  quantity: number;
  stock_before: number | null;
  stock_after: number | null;
  note: string;
  created_by: string;
  created_at: string;
};

type DashboardTopProduct = {
  product_id: string;
  product_name: string;
  total_quantity: number;
  transaction_count: number;
};

type DashboardLowStockProduct = {
  id: string;
  name: string;
  stock: number;
  category: string;
};

type DashboardMovementSummary = {
  imported_quantity: number;
  exported_quantity: number;
  edited_quantity: number;
  import_transactions: number;
  export_transactions: number;
  edit_transactions: number;
  net_quantity: number;
};

type DashboardPayload = {
  overview: DashboardOverview;
  activities: DashboardActivity[];
  employees_count: number;
  top_imported: DashboardTopProduct[];
  top_exported: DashboardTopProduct[];
  low_stock_products: DashboardLowStockProduct[];
  movement_summary: DashboardMovementSummary;
  generated_at: string;
};

type DetailReportTab = "top-imported" | "top-exported" | "low-stock";

const detailReportTabLabels: Record<DetailReportTab, string> = {
  "top-imported": "Top nhập",
  "top-exported": "Top xuất",
  "low-stock": "Tồn kho thấp",
};

const detailTabTriggerClass =
  "h-10 rounded-xl px-2 text-sm font-semibold text-muted-foreground/90 transition-all duration-200 hover:text-foreground data-[state=active]:-translate-y-0.5 data-[state=active]:border data-[state=active]:border-border/70 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-[0_10px_22px_-14px_rgba(15,23,42,0.55)] sm:px-4";

const emptyDashboardPayload: DashboardPayload = {
  overview: {
    tong_san_pham: 0,
    tong_ton_kho: 0,
    het_hang: 0,
    sap_het_hang: 0,
  },
  activities: [],
  employees_count: 0,
  top_imported: [],
  top_exported: [],
  low_stock_products: [],
  movement_summary: {
    imported_quantity: 0,
    exported_quantity: 0,
    edited_quantity: 0,
    import_transactions: 0,
    export_transactions: 0,
    edit_transactions: 0,
    net_quantity: 0,
  },
  generated_at: "",
};

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

const readOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const normalizeOverview = (payload: unknown): DashboardOverview => {
  if (!isObject(payload)) {
    return emptyDashboardPayload.overview;
  }

  return {
    tong_san_pham: Math.max(0, Math.trunc(readNumber(payload.tong_san_pham))),
    tong_ton_kho: Math.max(0, Math.trunc(readNumber(payload.tong_ton_kho))),
    het_hang: Math.max(0, Math.trunc(readNumber(payload.het_hang))),
    sap_het_hang: Math.max(0, Math.trunc(readNumber(payload.sap_het_hang))),
  };
};

const normalizeActivities = (payload: unknown): DashboardActivity[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!isObject(item)) {
        return null;
      }

      const productName = readString(item.product_name).trim();
      if (!productName) {
        return null;
      }

      return {
        id: readString(item.id).trim() || readString(item._id).trim(),
        product_id: readString(item.product_id).trim(),
        product_name: productName,
        change_type: readString(item.change_type).trim(),
        quantity: Math.max(0, Math.trunc(readNumber(item.quantity))),
        stock_before: readOptionalNumber(item.stock_before),
        stock_after: readOptionalNumber(item.stock_after),
        note: readString(item.note).trim(),
        created_by: readString(item.created_by).trim(),
        created_at: readString(item.created_at).trim(),
      };
    })
    .filter((item): item is DashboardActivity => item !== null);
};

const normalizeTopProducts = (payload: unknown): DashboardTopProduct[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!isObject(item)) {
        return null;
      }

      const productName = readString(item.product_name).trim();
      if (!productName) {
        return null;
      }

      return {
        product_id: readString(item.product_id).trim(),
        product_name: productName,
        total_quantity: Math.max(0, Math.trunc(readNumber(item.total_quantity))),
        transaction_count: Math.max(0, Math.trunc(readNumber(item.transaction_count))),
      };
    })
    .filter((item): item is DashboardTopProduct => item !== null);
};

const normalizeLowStockProducts = (payload: unknown): DashboardLowStockProduct[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!isObject(item)) {
        return null;
      }

      const name = readString(item.name).trim();
      if (!name) {
        return null;
      }

      return {
        id: readString(item.id).trim(),
        name,
        stock: Math.max(0, Math.trunc(readNumber(item.stock))),
        category: readString(item.category).trim(),
      };
    })
    .filter((item): item is DashboardLowStockProduct => item !== null)
    .sort((left, right) => left.stock - right.stock);
};

const normalizeMovementSummary = (payload: unknown): DashboardMovementSummary => {
  if (!isObject(payload)) {
    return emptyDashboardPayload.movement_summary;
  }

  return {
    imported_quantity: Math.max(0, Math.trunc(readNumber(payload.imported_quantity))),
    exported_quantity: Math.max(0, Math.trunc(readNumber(payload.exported_quantity))),
    edited_quantity: Math.max(0, Math.trunc(readNumber(payload.edited_quantity))),
    import_transactions: Math.max(0, Math.trunc(readNumber(payload.import_transactions))),
    export_transactions: Math.max(0, Math.trunc(readNumber(payload.export_transactions))),
    edit_transactions: Math.max(0, Math.trunc(readNumber(payload.edit_transactions))),
    net_quantity: Math.trunc(readNumber(payload.net_quantity)),
  };
};

const normalizeDashboardPayload = (payload: unknown): DashboardPayload => {
  if (!isObject(payload)) {
    return emptyDashboardPayload;
  }

  return {
    overview: normalizeOverview(payload.overview),
    activities: normalizeActivities(payload.activities),
    employees_count: Math.max(0, Math.trunc(readNumber(payload.employees_count))),
    top_imported: normalizeTopProducts(payload.top_imported),
    top_exported: normalizeTopProducts(payload.top_exported),
    low_stock_products: normalizeLowStockProducts(payload.low_stock_products),
    movement_summary: normalizeMovementSummary(payload.movement_summary),
    generated_at: readString(payload.generated_at).trim(),
  };
};

const formatInteger = (value: number) =>
  value.toLocaleString("vi-VN", {
    maximumFractionDigits: 0,
  });

function formatTimeAgo(dateString: string) {
  if (!dateString) {
    return "Vừa xong";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) {
    return `${diffInSeconds} giây trước`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} giờ trước`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} ngày trước`;
}

const formatDateTime = (dateString: string) => {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getActionLabel = (changeType: string) => {
  if (changeType === "nhap") {
    return "Nhập kho";
  }

  if (changeType === "xuat") {
    return "Xuất kho";
  }

  if (changeType === "chinh_sua") {
    return "Cập nhật tồn kho";
  }

  return changeType || "Khác";
};

const getActionBadgeVariant = (changeType: string) => {
  if (changeType === "xuat") {
    return "outline" as const;
  }

  if (changeType === "nhap") {
    return "secondary" as const;
  }

  return "default" as const;
};

const formatQuantityWithSign = (activity: DashboardActivity) => {
  const value = formatInteger(activity.quantity);

  if (activity.change_type === "nhap") {
    return `+${value}`;
  }

  if (activity.change_type === "xuat") {
    return `-${value}`;
  }

  return value;
};

const buildStockTransitionLabel = (activity: DashboardActivity) => {
  if (activity.stock_before === null || activity.stock_after === null) {
    return "--";
  }

  return `${formatInteger(activity.stock_before)} -> ${formatInteger(activity.stock_after)}`;
};

const escapeCsvValue = (value: string) => {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload>(emptyDashboardPayload);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [detailReportTab, setDetailReportTab] = useState<DetailReportTab>("top-imported");
  const [isExportingDetailReport, setIsExportingDetailReport] = useState(false);
  const [detailReportExportError, setDetailReportExportError] = useState("");

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await fetch(
        "/api/dashboard?history_limit=15&top_limit=8&low_stock_limit=8",
        {
          method: "GET",
          cache: "no-store",
        }
      );
      const payload = (await response.json().catch(() => ({}))) as unknown;

      if (!response.ok) {
        const message =
          isObject(payload) && typeof payload.message === "string"
            ? payload.message
            : "Không thể tải dữ liệu báo cáo.";
        throw new Error(message);
      }

      setData(normalizeDashboardPayload(payload));
    } catch (error) {
      setData(emptyDashboardPayload);
      setLoadError(
        error instanceof Error ? error.message : "Không thể tải dữ liệu báo cáo."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const stats = useMemo(
    () => [
      {
        title: "Tổng sản phẩm",
        value: formatInteger(data.overview.tong_san_pham),
        icon: Boxes,
        hint: `${formatInteger(data.overview.tong_ton_kho)} đơn vị đang tồn kho`,
      },
      {
        title: "Sản phẩm sắp hết",
        value: formatInteger(data.overview.sap_het_hang),
        icon: CircleAlert,
        hint: "Cần theo dõi để bổ sung kịp thời",
      },
      {
        title: "Đã hết hàng",
        value: formatInteger(data.overview.het_hang),
        icon: PackageCheck,
        hint: "Cần xử lý ưu tiên",
      },
      {
        title: "Nhân sự hệ thống",
        value: formatInteger(data.employees_count),
        icon: Users,
        hint: "Tài khoản đang có quyền truy cập",
      },
    ],
    [data]
  );

  const handleExportActivities = () => {
    if (data.activities.length === 0 || isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const header = [
        "STT",
        "Sản phẩm",
        "Loại biến động",
        "Số lượng",
        "Tồn trước",
        "Tồn sau",
        "Người thực hiện",
        "Ghi chú",
        "Thời gian",
      ];

      const rows = data.activities.map((activity, index) => [
        String(index + 1),
        activity.product_name,
        getActionLabel(activity.change_type),
        String(activity.quantity),
        activity.stock_before === null ? "" : String(activity.stock_before),
        activity.stock_after === null ? "" : String(activity.stock_after),
        activity.created_by || "Hệ thống",
        activity.note,
        formatDateTime(activity.created_at),
      ]);

      const csv = [header, ...rows]
        .map((line) => line.map((value) => escapeCsvValue(value)).join(","))
        .join("\n");

      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const now = new Date();
      const fileName = `bao-cao-hoat-dong-${now
        .toISOString()
        .slice(0, 19)
        .replaceAll(":", "-")}.csv`;

      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } finally {
      setIsExporting(false);
    }
  };

  const detailReportExportConfig = useMemo(() => {
    if (detailReportTab === "top-imported") {
      return {
        sheetName: "TopNhap",
        filePrefix: "bao-cao-top-nhap",
        headers: ["STT", "Sản phẩm", "Tổng nhập", "Số lần"],
        rows: data.top_imported.map((item, index) => ({
          STT: index + 1,
          "Sản phẩm": item.product_name,
          "Tổng nhập": item.total_quantity,
          "Số lần": item.transaction_count,
        })),
      };
    }

    if (detailReportTab === "top-exported") {
      return {
        sheetName: "TopXuat",
        filePrefix: "bao-cao-top-xuat",
        headers: ["STT", "Sản phẩm", "Tổng xuất", "Số lần"],
        rows: data.top_exported.map((item, index) => ({
          STT: index + 1,
          "Sản phẩm": item.product_name,
          "Tổng xuất": item.total_quantity,
          "Số lần": item.transaction_count,
        })),
      };
    }

    return {
      sheetName: "TonKhoThap",
      filePrefix: "bao-cao-ton-kho-thap",
      headers: ["STT", "Sản phẩm", "Danh mục", "Tồn kho"],
      rows: data.low_stock_products.map((item, index) => ({
        STT: index + 1,
        "Sản phẩm": item.name,
        "Danh mục": item.category || "Khác",
        "Tồn kho": item.stock,
      })),
    };
  }, [detailReportTab, data.top_imported, data.top_exported, data.low_stock_products]);

  const handleDetailReportTabChange = (value: string) => {
    if (value === "top-imported" || value === "top-exported" || value === "low-stock") {
      setDetailReportTab(value);
    }
  };

  const handleExportDetailReportExcel = async () => {
    if (
      isLoading ||
      isExportingDetailReport ||
      detailReportExportConfig.rows.length === 0
    ) {
      return;
    }

    setDetailReportExportError("");
    setIsExportingDetailReport(true);

    try {
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(detailReportExportConfig.rows, {
        header: detailReportExportConfig.headers,
      });
      worksheet["!cols"] = detailReportExportConfig.headers.map((header) => ({
        wch: Math.max(14, header.length + 6),
      }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, detailReportExportConfig.sheetName);

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
      const fileName = `${detailReportExportConfig.filePrefix}-${now
        .toISOString()
        .slice(0, 19)
        .replaceAll(":", "-")}.xlsx`;

      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Không thể xuất báo cáo chi tiết ra Excel:", error);
      setDetailReportExportError("Không thể xuất báo cáo chi tiết ra file Excel.");
    } finally {
      setIsExportingDetailReport(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.title} className="border border-border/70">
            <CardHeader>
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className="text-2xl">{isLoading ? "..." : item.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div />
                <item.icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {isLoading ? "Đang tải..." : item.hint}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <Card className="h-full border border-border/70">
          <CardHeader className="border-b border-border/70">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Báo cáo chi tiết</CardTitle>
                <CardDescription>
                  Tổng hợp top nhập, top xuất và danh sách sản phẩm tồn thấp
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => void handleExportDetailReportExcel()}
                disabled={
                  isLoading ||
                  isExportingDetailReport ||
                  detailReportExportConfig.rows.length === 0
                }
              >
                {isExportingDetailReport ? "Đang xuất..." : "Xuất Excel"}
                <ArrowUpRight className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex h-full flex-col pt-4">
            <Tabs
              value={detailReportTab}
              onValueChange={handleDetailReportTabChange}
              className="flex h-full flex-col gap-4"
            >
              <TabsList className="grid h-12 w-full grid-cols-3 rounded-2xl border border-border/70 bg-muted/35 p-1.5">
                <TabsTrigger value="top-imported" className={detailTabTriggerClass}>
                  Top nhập
                </TabsTrigger>
                <TabsTrigger value="top-exported" className={detailTabTriggerClass}>
                  Top xuất
                </TabsTrigger>
                <TabsTrigger value="low-stock" className={detailTabTriggerClass}>
                  Tồn kho thấp
                </TabsTrigger>
              </TabsList>

              <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Đang xem:</span>{" "}
                <span className="font-semibold text-foreground">
                  {detailReportTabLabels[detailReportTab]}
                </span>
              </div>

              <TabsContent
                value="top-imported"
                className="mt-0 min-h-[260px] overflow-hidden rounded-xl border border-border/70"
              >
                <div className="h-full overflow-x-auto">
                <Table>
                  <TableHeader className="[&_tr]:bg-muted/30">
                    <TableRow>
                      <TableHead className="w-14">#</TableHead>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-right">Tổng nhập</TableHead>
                      <TableHead className="text-right">Số lần</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="h-[220px] p-0 align-middle">
                          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 px-4 text-center">
                            <p className="text-sm font-medium text-foreground">Đang tải dữ liệu...</p>
                            <p className="text-xs text-muted-foreground">
                              Hệ thống đang tổng hợp báo cáo, vui lòng chờ trong giây lát.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : data.top_imported.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="h-[220px] p-0 align-middle">
                          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 px-4 text-center">
                            <p className="text-sm font-medium text-foreground">Chưa có dữ liệu nhập kho.</p>
                            <p className="text-xs text-muted-foreground">
                              Dữ liệu sẽ hiển thị ngay khi phát sinh giao dịch nhập kho.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.top_imported.map((item, index) => (
                        <TableRow key={`${item.product_id}-${index + 1}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatInteger(item.total_quantity)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatInteger(item.transaction_count)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </TabsContent>

              <TabsContent
                value="top-exported"
                className="mt-0 min-h-[260px] overflow-hidden rounded-xl border border-border/70"
              >
                <div className="h-full overflow-x-auto">
                <Table>
                  <TableHeader className="[&_tr]:bg-muted/30">
                    <TableRow>
                      <TableHead className="w-14">#</TableHead>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-center">Tổng xuất</TableHead>
                      <TableHead className="text-center">Số lần</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="h-[220px] p-0 align-middle">
                          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 px-4 text-center">
                            <p className="text-sm font-medium text-foreground">Đang tải dữ liệu...</p>
                            <p className="text-xs text-muted-foreground">
                              Hệ thống đang tổng hợp báo cáo, vui lòng chờ trong giây lát.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : data.top_exported.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="h-[220px] p-0 align-middle">
                          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 px-4 text-center">
                            <p className="text-sm font-medium text-foreground">Chưa có dữ liệu xuất kho.</p>
                            <p className="text-xs text-muted-foreground">
                              Dữ liệu sẽ hiển thị ngay khi phát sinh giao dịch xuất kho.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.top_exported.map((item, index) => (
                        <TableRow key={`${item.product_id}-${index + 1}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell className="text-center tabular-nums">{formatInteger(item.total_quantity)}</TableCell>
                          <TableCell className="text-center tabular-nums">{formatInteger(item.transaction_count)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </TabsContent>

              <TabsContent
                value="low-stock"
                className="mt-0 min-h-[260px] overflow-hidden rounded-xl border border-border/70"
              >
                <div className="h-full overflow-x-auto">
                <Table>
                  <TableHeader className="[&_tr]:bg-muted/30">
                    <TableRow>
                      <TableHead className="w-14">#</TableHead>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead className="text-right">Tồn kho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="h-[220px] p-0 align-middle">
                          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 px-4 text-center">
                            <p className="text-sm font-medium text-foreground">Đang tải dữ liệu...</p>
                            <p className="text-xs text-muted-foreground">
                              Hệ thống đang tổng hợp báo cáo, vui lòng chờ trong giây lát.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : data.low_stock_products.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="h-[220px] p-0 align-middle">
                          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 px-4 text-center">
                            <p className="text-sm font-medium text-foreground">Không có sản phẩm tồn thấp.</p>
                            <p className="text-xs text-muted-foreground">
                              Mức tồn kho hiện tại đang an toàn ở thời điểm này.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.low_stock_products.map((item, index) => (
                        <TableRow key={`${item.id || item.name}-${index + 1}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.category || "Khác"}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={item.stock === 0 ? "destructive" : "outline"}>
                              {formatInteger(item.stock)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </TabsContent>
            </Tabs>
            {detailReportExportError ? (
              <p className="mt-3 text-sm text-destructive">{detailReportExportError}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="h-full border border-border/70">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Tóm tắt biến động</CardTitle>
            <CardDescription>Dữ liệu tổng hợp từ nhật ký nhập xuất gần đây</CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-4 pt-4">
            <div className="flex min-h-[96px] flex-col justify-between rounded-lg border border-border/70 bg-muted/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Tổng nhập kho</p>
                  <p className="text-lg font-semibold">
                    {isLoading ? "..." : formatInteger(data.movement_summary.imported_quantity)}
                  </p>
                </div>
                <TrendingUp className="size-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {isLoading ? "Đang tải..." : `${formatInteger(data.movement_summary.import_transactions)} giao dịch nhập`}
              </p>
            </div>

            <div className="flex min-h-[96px] flex-col justify-between rounded-lg border border-border/70 bg-muted/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Tổng xuất kho</p>
                  <p className="text-lg font-semibold">
                    {isLoading ? "..." : formatInteger(data.movement_summary.exported_quantity)}
                  </p>
                </div>
                <TrendingDown className="size-4 text-rose-600" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {isLoading ? "Đang tải..." : `${formatInteger(data.movement_summary.export_transactions)} giao dịch xuất`}
              </p>
            </div>

            <div className="flex min-h-[96px] flex-col justify-between rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Cân đối tồn kho (Nhập - Xuất)</p>
              <p
                className={`text-lg font-semibold ${
                  data.movement_summary.net_quantity >= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {isLoading
                  ? "..."
                  : `${data.movement_summary.net_quantity >= 0 ? "+" : ""}${formatInteger(data.movement_summary.net_quantity)}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isLoading
                  ? "Đang tải..."
                  : `${formatInteger(data.movement_summary.edit_transactions)} giao dịch cập nhật thủ công`}
              </p>
            </div>

            <div className="mt-auto rounded-lg border border-border/70 bg-muted/10 p-3 text-xs text-muted-foreground">
              {data.generated_at
                ? `Cập nhật lần cuối: ${formatDateTime(data.generated_at)}`
                : "Cập nhật lần cuối: --"}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border border-border/70">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Nhật ký hoạt động gần đây</CardTitle>
                <CardDescription>Các sự kiện nhập xuất tồn kho mới nhất</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchDashboardData()}
                  disabled={isLoading}
                >
                  Làm mới
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportActivities}
                  disabled={isLoading || data.activities.length === 0 || isExporting}
                >
                  Xuất nhật ký
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            {loadError ? (
              <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {loadError}
              </div>
            ) : null}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Thao tác</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead className="text-right">Tồn kho</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead>Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : data.activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                      Không có hoạt động nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.activities.map((activity, index) => (
                    <TableRow
                      key={
                        activity.id ||
                        `${activity.product_id}-${activity.change_type}-${activity.created_at}-${index + 1}`
                      }
                    >
                      <TableCell>
                        <p className="font-medium">{activity.product_name}</p>
                        {activity.note ? (
                          <p className="line-clamp-1 text-xs text-muted-foreground">{activity.note}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(activity.change_type)}>
                          {getActionLabel(activity.change_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatQuantityWithSign(activity)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {buildStockTransitionLabel(activity)}
                      </TableCell>
                      <TableCell>{activity.created_by || "Hệ thống"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <p>{formatTimeAgo(activity.created_at)}</p>
                        <p className="text-xs">{formatDateTime(activity.created_at)}</p>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

