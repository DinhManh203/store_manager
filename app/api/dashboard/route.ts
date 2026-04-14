import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "auth_token";
const REPORT_OVERVIEW_PATH = "/bao-cao/tong-quan-ton-kho";
const REPORT_HISTORY_PATH = "/bao-cao/lich-su-bien-dong";
const REPORT_LOW_STOCK_PATH = "/bao-cao/ton-kho-thap";
const REPORT_TOP_IMPORTED_PATH = "/bao-cao/san-pham-nhap-nhieu";
const REPORT_TOP_EXPORTED_PATH = "/bao-cao/san-pham-xuat-nhieu";
const EMPLOYEE_DASHBOARD_PATH = "/nguoi-dung/quan-tri/bang-dieu-khien";

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

type BackendFetchResult = {
  ok: boolean;
  status: number;
  payload: unknown;
};

const emptyOverview: DashboardOverview = {
  tong_san_pham: 0,
  tong_ton_kho: 0,
  het_hang: 0,
  sap_het_hang: 0,
};

const emptyMovementSummary: DashboardMovementSummary = {
  imported_quantity: 0,
  exported_quantity: 0,
  edited_quantity: 0,
  import_transactions: 0,
  export_transactions: 0,
  edit_transactions: 0,
  net_quantity: 0,
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

const normalizeApiBaseUrl = (rawBaseUrl?: string) => {
  const trimmed = rawBaseUrl?.trim() ?? "";
  if (!trimmed) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmed);
    parsedUrl.hash = "";

    if (parsedUrl.pathname === "/docs" || parsedUrl.pathname === "/docs/") {
      parsedUrl.pathname = "/";
    }

    return parsedUrl.toString();
  } catch {
    return trimmed;
  }
};

const resolveBackendUrl = (path: string, searchParams?: URLSearchParams) => {
  const baseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL in .env");
  }

  const url = new URL(path, baseUrl);
  if (searchParams) {
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
  }

  return url.toString();
};

const readAuthTokenFromRequest = (request: NextRequest) => {
  let token = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? "";
  token = token.trim();

  if (token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  return token.replace(/^Bearer\s+/i, "").trim();
};

const readPayload = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const rawText = await response.text();
      if (!rawText.trim()) {
        return {};
      }

      return JSON.parse(rawText) as unknown;
    }

    const text = await response.text();
    return text ? { message: text } : {};
  } catch {
    return {};
  }
};

const fetchBackendPayload = async (
  path: string,
  headers: Record<string, string>,
  searchParams?: URLSearchParams
): Promise<BackendFetchResult> => {
  try {
    const response = await fetch(resolveBackendUrl(path, searchParams), {
      headers,
      cache: "no-store",
    });

    const payload = await readPayload(response);
    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      payload: {},
    };
  }
};

const toBoundedInteger = (
  rawValue: string | null,
  fallback: number,
  min: number,
  max: number
) => {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const normalized = Math.trunc(parsed);
  if (normalized < min) {
    return min;
  }

  if (normalized > max) {
    return max;
  }

  return normalized;
};

const normalizeOverview = (payload: unknown): DashboardOverview => {
  if (!isObject(payload)) {
    return emptyOverview;
  }

  return {
    tong_san_pham: Math.max(0, Math.trunc(readNumber(payload.tong_san_pham))),
    tong_ton_kho: Math.max(0, Math.trunc(readNumber(payload.tong_ton_kho))),
    het_hang: Math.max(0, Math.trunc(readNumber(payload.het_hang))),
    sap_het_hang: Math.max(0, Math.trunc(readNumber(payload.sap_het_hang))),
  };
};

const normalizeActivities = (
  payload: unknown,
  limit: number
): DashboardActivity[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!isObject(item)) {
        return null;
      }

      const id = readString(item.id).trim() || readString(item._id).trim();
      const productId = readString(item.product_id).trim();
      const productName = readString(item.product_name).trim();
      const changeType = readString(item.change_type).trim();
      const quantity = Math.max(0, Math.trunc(readNumber(item.quantity)));
      const createdAt =
        readString(item.created_at).trim() || readString(item.updated_at).trim();

      if (!productName) {
        return null;
      }

      return {
        id,
        product_id: productId,
        product_name: productName,
        change_type: changeType,
        quantity,
        stock_before: readOptionalNumber(item.stock_before),
        stock_after: readOptionalNumber(item.stock_after),
        note: readString(item.note).trim(),
        created_by: readString(item.created_by).trim(),
        created_at: createdAt,
      };
    })
    .filter((item): item is DashboardActivity => item !== null)
    .slice(0, limit);
};

const normalizeTopProducts = (
  payload: unknown,
  type: "imported" | "exported",
  limit: number
): DashboardTopProduct[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  const quantityKey = type === "imported" ? "total_imported" : "total_exported";
  const countKey = type === "imported" ? "import_count" : "export_count";

  return payload
    .map((item) => {
      if (!isObject(item)) {
        return null;
      }

      const productId =
        readString(item.product_id).trim() || readString(item._id).trim();
      const productName = readString(item.product_name).trim();
      const totalQuantity = Math.max(0, Math.trunc(readNumber(item[quantityKey])));
      const transactionCount = Math.max(0, Math.trunc(readNumber(item[countKey])));

      if (!productName) {
        return null;
      }

      return {
        product_id: productId,
        product_name: productName,
        total_quantity: totalQuantity,
        transaction_count: transactionCount,
      };
    })
    .filter((item): item is DashboardTopProduct => item !== null)
    .slice(0, limit);
};

const normalizeLowStockProducts = (
  payload: unknown,
  limit: number
): DashboardLowStockProduct[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!isObject(item)) {
        return null;
      }

      const id = readString(item.id).trim();
      const name = readString(item.name).trim();
      const stock = Math.max(0, Math.trunc(readNumber(item.stock)));
      const category = readString(item.category).trim();

      if (!name) {
        return null;
      }

      return {
        id,
        name,
        stock,
        category,
      };
    })
    .filter((item): item is DashboardLowStockProduct => item !== null)
    .sort((left, right) => left.stock - right.stock)
    .slice(0, limit);
};

const countEmployees = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload.length;
  }

  if (!isObject(payload)) {
    return 0;
  }

  const total = Math.trunc(readNumber(payload.total));
  if (total > 0) {
    return total;
  }

  if (Array.isArray(payload.items)) {
    return payload.items.length;
  }

  if (Array.isArray(payload.data)) {
    return payload.data.length;
  }

  return 0;
};

const buildMovementSummary = (
  activities: DashboardActivity[]
): DashboardMovementSummary => {
  const summary = { ...emptyMovementSummary };

  activities.forEach((activity) => {
    if (activity.change_type === "nhap") {
      summary.import_transactions += 1;
      summary.imported_quantity += activity.quantity;
      return;
    }

    if (activity.change_type === "xuat") {
      summary.export_transactions += 1;
      summary.exported_quantity += activity.quantity;
      return;
    }

    if (activity.change_type === "chinh_sua") {
      summary.edit_transactions += 1;
      summary.edited_quantity += activity.quantity;
    }
  });

  summary.net_quantity = summary.imported_quantity - summary.exported_quantity;
  return summary;
};

export async function GET(request: NextRequest) {
  try {
    const authToken = readAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ message: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
    }

    const historyLimit = toBoundedInteger(
      request.nextUrl.searchParams.get("history_limit"),
      12,
      1,
      100
    );
    const topLimit = toBoundedInteger(
      request.nextUrl.searchParams.get("top_limit"),
      6,
      1,
      20
    );
    const lowStockThreshold = toBoundedInteger(
      request.nextUrl.searchParams.get("low_stock_threshold"),
      10,
      0,
      1000000
    );
    const lowStockLimit = toBoundedInteger(
      request.nextUrl.searchParams.get("low_stock_limit"),
      6,
      1,
      50
    );

    const headers = { Authorization: `Bearer ${authToken}` };

    const historyParams = new URLSearchParams();
    historyParams.set("gioi_han", String(historyLimit));

    const historyType = request.nextUrl.searchParams
      .get("history_type")
      ?.trim()
      .toLowerCase();
    if (
      historyType === "nhap" ||
      historyType === "xuat" ||
      historyType === "chinh_sua"
    ) {
      historyParams.set("loai", historyType);
    }

    const lowStockParams = new URLSearchParams();
    lowStockParams.set("nguong", String(lowStockThreshold));

    const [
      overviewResult,
      historyResult,
      employeesResult,
      topImportedResult,
      topExportedResult,
      lowStockResult,
    ] = await Promise.all([
      fetchBackendPayload(REPORT_OVERVIEW_PATH, headers),
      fetchBackendPayload(REPORT_HISTORY_PATH, headers, historyParams),
      fetchBackendPayload(EMPLOYEE_DASHBOARD_PATH, headers),
      fetchBackendPayload(REPORT_TOP_IMPORTED_PATH, headers),
      fetchBackendPayload(REPORT_TOP_EXPORTED_PATH, headers),
      fetchBackendPayload(REPORT_LOW_STOCK_PATH, headers, lowStockParams),
    ]);

    const overview = overviewResult.ok
      ? normalizeOverview(overviewResult.payload)
      : emptyOverview;
    const activities = historyResult.ok
      ? normalizeActivities(historyResult.payload, historyLimit)
      : [];
    const employeesCount = employeesResult.ok
      ? countEmployees(employeesResult.payload)
      : 0;
    const topImported = topImportedResult.ok
      ? normalizeTopProducts(topImportedResult.payload, "imported", topLimit)
      : [];
    const topExported = topExportedResult.ok
      ? normalizeTopProducts(topExportedResult.payload, "exported", topLimit)
      : [];
    const lowStockProducts = lowStockResult.ok
      ? normalizeLowStockProducts(lowStockResult.payload, lowStockLimit)
      : [];
    const movementSummary = buildMovementSummary(activities);

    return NextResponse.json(
      {
        overview,
        activities,
        employees_count: employeesCount,
        top_imported: topImported,
        top_exported: topExported,
        low_stock_products: lowStockProducts,
        movement_summary: movementSummary,
        generated_at: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { message: "Không thể lấy dữ liệu dashboard." },
      { status: 500 }
    );
  }
}
