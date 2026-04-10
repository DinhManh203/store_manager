import { NextRequest, NextResponse } from "next/server";

import { extractErrorMessage } from "@/lib/auth";

const AUTH_COOKIE_NAME = "auth_token";
const IMPORT_ORDER_LIST_PATH = "/nhap-kho/danh-sach";
const IMPORT_ORDER_CREATE_PATH = "/nhap-kho/tao-phieu";

type ReturnOrderPayload = {
  id: string;
  supplierName: string;
  totalAmount: number;
  note: string;
  createdBy: string;
  createdAt: string;
  itemsCount: number;
  totalQuantity: number;
  sourceBranchId?: string;
  sourceBranchName?: string;
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

const readDateString = (value: unknown) => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  return "";
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

const resolveBackendUrl = (path: string) => {
  const baseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL in .env");
  }

  return new URL(path, baseUrl).toString();
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

const mapReturnOrder = (payload: unknown): ReturnOrderPayload | null => {
  if (!isObject(payload)) {
    return null;
  }

  const id = readString(payload.id).trim();
  if (!id) {
    return null;
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const totalQuantity = items.reduce((sum, item) => {
    if (!isObject(item)) {
      return sum;
    }
    return sum + Math.max(0, Math.trunc(readNumber(item.quantity)));
  }, 0);

  return {
    id,
    supplierName: readString(payload.supplier_name).trim(),
    totalAmount: readNumber(payload.total_amount),
    note: readString(payload.note).trim(),
    createdBy: readString(payload.created_by).trim(),
    createdAt:
      readDateString(payload.created_at) || readDateString(payload.createdAt),
    itemsCount: items.length,
    totalQuantity,
    sourceBranchId: readString(payload.source_branch_id).trim() || readString(payload.sourceBranchId).trim(),
    sourceBranchName: readString(payload.source_branch_name).trim() || readString(payload.sourceBranchName).trim(),
  };
};

const mapReturnOrderList = (payload: unknown) => {
  if (!Array.isArray(payload)) {
    return [] as ReturnOrderPayload[];
  }

  return payload
    .map((item) => mapReturnOrder(item))
    .filter((item): item is ReturnOrderPayload => item !== null);
};

const normalizeAuthToken = (rawToken: string) => {
  let token = rawToken.trim();
  if (!token) {
    return "";
  }

  if (token.startsWith("\"") && token.endsWith("\"")) {
    token = token.slice(1, -1);
  }

  token = token.replace(/^Bearer\s+/i, "").trim();
  return token;
};

const readAuthTokenFromRequest = (request: NextRequest) =>
  normalizeAuthToken(request.cookies.get(AUTH_COOKIE_NAME)?.value ?? "");

const ensureValidAuthToken = (authToken: string) => {
  if (!authToken) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        },
        { status: 401 }
      ),
    };
  }

  return { ok: true as const };
};

const normalizeApiErrorMessage = (
  payload: unknown,
  status: number,
  fallback: string
) => {
  const rawMessage = extractErrorMessage(payload).trim();
  const normalizedMessage = rawMessage.toLowerCase();

  if (
    status === 401 ||
    normalizedMessage.includes("xác thực thông tin đăng nhập") ||
    normalizedMessage.includes("xac thuc thong tin dang nhap")
  ) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  return rawMessage || fallback;
};

type CreateReturnOrderItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

type CreateReturnOrderBody = {
  supplierId: string;
  sourceBranchId: string;
  note: string;
  items: CreateReturnOrderItem[];
};

const normalizeCreateReturnOrderBody = (body: unknown): CreateReturnOrderBody => {
  const source = isObject(body) ? body : {};
  const rawItems = Array.isArray(source.items) ? source.items : [];

  const items = rawItems
    .filter((item): item is Record<string, unknown> => isObject(item))
    .map((item) => ({
      productId: readString(item.productId).trim(),
      quantity: Number(readString(item.quantity) || readNumber(item.quantity)),
      unitPrice: Number(readString(item.unitPrice) || readNumber(item.unitPrice)),
    }));

  return {
    supplierId: readString(source.supplierId).trim(),
    sourceBranchId: readString(source.sourceBranchId).trim(),
    note: readString(source.note).trim(),
    items,
  };
};

const validateCreateReturnOrderBody = (payload: CreateReturnOrderBody) => {
  if (!payload.supplierId && !payload.sourceBranchId) {
    return "Vui lòng chọn nhà cung cấp hoặc chi nhánh nguồn.";
  }

  if (payload.items.length === 0) {
    return "Vui lòng thêm ít nhất một sản phẩm nhập kho.";
  }

  for (let index = 0; index < payload.items.length; index += 1) {
    const item = payload.items[index];
    const rowNumber = index + 1;

    if (!item.productId) {
      return `Vui lòng chọn sản phẩm ở dòng ${rowNumber}.`;
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return `Số lượng ở dòng ${rowNumber} phải là số nguyên lớn hơn 0.`;
    }

    if (!Number.isFinite(item.unitPrice) || item.unitPrice <= 0) {
      return `Đơn giá ở dòng ${rowNumber} phải lớn hơn 0.`;
    }
  }

  return "";
};

export async function GET() {
  try {
    const backendUrl = resolveBackendUrl(IMPORT_ORDER_LIST_PATH);
    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Không thể tải danh sách đơn trả."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(mapReturnOrderList(payload), {
      status: backendResponse.status,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API đơn trả.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authToken = readAuthTokenFromRequest(request);
    const authResult = ensureValidAuthToken(authToken);
    if (!authResult.ok) {
      return authResult.response;
    }

    let requestBody: unknown = {};
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
    }

    const body = normalizeCreateReturnOrderBody(requestBody);
    const validationError = validateCreateReturnOrderBody(body);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const backendUrl = resolveBackendUrl(IMPORT_ORDER_CREATE_PATH);
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        supplier_id: body.supplierId || null,
        source_branch_id: body.sourceBranchId || null,
        note: body.note || null,
        items: body.items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      }),
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);
    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Không thể thêm đơn trả."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const totalAmount = body.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const totalQuantity = body.items.reduce((sum, item) => sum + item.quantity, 0);

    const createdOrder = mapReturnOrder(payload) ?? {
      id: `${Date.now()}`,
      supplierName: "",
      totalAmount,
      note: body.note,
      createdBy: "",
      createdAt: new Date().toISOString(),
      itemsCount: body.items.length,
      totalQuantity,
    };

    return NextResponse.json(createdOrder, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API thêm đơn trả.",
      },
      { status: 500 }
    );
  }
}
