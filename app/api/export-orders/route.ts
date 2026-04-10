import { NextRequest, NextResponse } from "next/server";

import { extractErrorMessage } from "@/lib/auth";

const AUTH_COOKIE_NAME = "auth_token";
const EXPORT_ORDER_LIST_PATH = "/xuat-kho/danh-sach";
const EXPORT_ORDER_CREATE_PATH = "/xuat-kho/tao-phieu";

type TransferOrderPayload = {
  id: string;
  reason: string;
  note: string;
  createdBy: string;
  createdAt: string;
  itemsCount: number;
  totalQuantity: number;
  targetBranchId?: string;
  targetBranchName?: string;
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

const mapTransferOrder = (payload: unknown): TransferOrderPayload | null => {
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
    reason: readString(payload.reason).trim(),
    note: readString(payload.note).trim(),
    createdBy: readString(payload.created_by).trim(),
    createdAt:
      readDateString(payload.created_at) || readDateString(payload.createdAt),
    itemsCount: items.length,
    totalQuantity,
    targetBranchId: readString(payload.target_branch_id).trim() || readString(payload.targetBranchId).trim(),
    targetBranchName: readString(payload.target_branch_name).trim() || readString(payload.targetBranchName).trim(),
  };
};

const mapTransferOrderList = (payload: unknown) => {
  if (!Array.isArray(payload)) {
    return [] as TransferOrderPayload[];
  }

  return payload
    .map((item) => mapTransferOrder(item))
    .filter((item): item is TransferOrderPayload => item !== null);
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

type CreateTransferOrderItem = {
  productId: string;
  quantity: number;
};

type CreateTransferOrderBody = {
  reason: string;
  note: string;
  items: CreateTransferOrderItem[];
  targetBranchId: string;
};

const normalizeCreateTransferOrderBody = (body: unknown): CreateTransferOrderBody => {
  const source = isObject(body) ? body : {};
  const rawItems = Array.isArray(source.items) ? source.items : [];

  const items = rawItems
    .filter((item): item is Record<string, unknown> => isObject(item))
    .map((item) => ({
      productId: readString(item.productId).trim(),
      quantity: Number(readString(item.quantity) || readNumber(item.quantity)),
    }));

  return {
    reason: readString(source.reason).trim(),
    note: readString(source.note).trim(),
    items,
    targetBranchId: readString(source.targetBranchId).trim(),
  };
};

const validateCreateTransferOrderBody = (payload: CreateTransferOrderBody) => {
  if (!payload.targetBranchId) {
    return "Vui lòng chọn chi nhánh đích.";
  }

  if (payload.items.length === 0) {
    return "Vui lòng thêm ít nhất một sản phẩm chuyển kho.";
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
  }

  return "";
};

export async function GET() {
  try {
    const backendUrl = resolveBackendUrl(EXPORT_ORDER_LIST_PATH);
    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Không thể tải danh sách đơn chuyển."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(mapTransferOrderList(payload), {
      status: backendResponse.status,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API đơn chuyển.",
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

    const body = normalizeCreateTransferOrderBody(requestBody);
    const validationError = validateCreateTransferOrderBody(body);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const backendUrl = resolveBackendUrl(EXPORT_ORDER_CREATE_PATH);
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: body.reason || null,
        note: body.note || null,
        target_branch_id: body.targetBranchId,
        items: body.items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
      }),
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);
    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Không thể thêm đơn chuyển."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const createdOrder = mapTransferOrder(payload) ?? {
      id: `${Date.now()}`,
      reason: body.reason,
      note: body.note,
      createdBy: "",
      createdAt: new Date().toISOString(),
      itemsCount: body.items.length,
      totalQuantity: body.items.reduce((sum, item) => sum + item.quantity, 0),
    };

    return NextResponse.json(createdOrder, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API thêm đơn chuyển.",
      },
      { status: 500 }
    );
  }
}
