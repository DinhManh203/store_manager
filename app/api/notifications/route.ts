import { NextRequest, NextResponse } from "next/server";

import { extractErrorMessage } from "@/lib/auth";

const AUTH_COOKIE_NAME = "auth_token";
const NOTIFICATION_LIST_PATH = "/thong-bao/danh-sach";
const NOTIFICATION_MARK_ALL_PATH = "/thong-bao/danh-dau-tat-ca-da-doc";

type NotificationPayload = {
  id: string;
  type: string;
  title: string;
  message: string;
  actorUsername: string;
  actorFullName: string;
  actorRole: string;
  productId: string;
  productName: string;
  createdAt: string;
  isRead: boolean;
};

type NotificationListPayload = {
  unreadCount: number;
  total: number;
  items: NotificationPayload[];
  isSupported?: boolean;
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

const readBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return false;
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

const mapNotificationItem = (payload: unknown): NotificationPayload | null => {
  if (!isObject(payload)) {
    return null;
  }

  const id = readString(payload.id).trim();
  if (!id) {
    return null;
  }

  return {
    id,
    type: readString(payload.type).trim() || "product_created",
    title: readString(payload.title).trim() || "Thông báo",
    message: readString(payload.message).trim(),
    actorUsername:
      readString(payload.actor_username).trim() || readString(payload.actorUsername).trim(),
    actorFullName:
      readString(payload.actor_full_name).trim() || readString(payload.actorFullName).trim(),
    actorRole: readString(payload.actor_role).trim() || readString(payload.actorRole).trim(),
    productId: readString(payload.product_id).trim() || readString(payload.productId).trim(),
    productName:
      readString(payload.product_name).trim() || readString(payload.productName).trim(),
    createdAt:
      readString(payload.created_at).trim() || readString(payload.createdAt).trim() || "",
    isRead: readBoolean(payload.is_read) || readBoolean(payload.isRead),
  };
};

const mapNotificationList = (payload: unknown): NotificationListPayload => {
  if (!isObject(payload)) {
    return {
      unreadCount: 0,
      total: 0,
      items: [],
      isSupported: true,
    };
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems
    .map((item) => mapNotificationItem(item))
    .filter((item): item is NotificationPayload => item !== null);

  return {
    unreadCount: Math.max(
      0,
      Math.trunc(readNumber(payload.unread_count) || readNumber(payload.unreadCount))
    ),
    total: Math.max(0, Math.trunc(readNumber(payload.total))),
    items,
    isSupported: true,
  };
};

const buildUnsupportedNotificationsPayload = (): NotificationListPayload => ({
  unreadCount: 0,
  total: 0,
  items: [],
  isSupported: false,
});

const normalizeNotificationErrorMessage = (
  payload: unknown,
  fallback: string
) => {
  return extractErrorMessage(payload) || fallback;
};

const clampLimit = (value: string | null) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 30;
  }
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
};

export async function GET(request: NextRequest) {
  try {
    const authToken = readAuthTokenFromRequest(request);
    const authResult = ensureValidAuthToken(authToken);
    if (!authResult.ok) {
      return authResult.response;
    }

    const filter = request.nextUrl.searchParams.get("filter")?.trim().toLowerCase() ?? "all";
    const onlyUnread = filter === "unread";
    const limit = clampLimit(request.nextUrl.searchParams.get("limit"));

    const params = new URLSearchParams({
      onlyUnread: String(onlyUnread),
      limit: String(limit),
    });

    const backendUrl = resolveBackendUrl(`${NOTIFICATION_LIST_PATH}?${params.toString()}`);
    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (backendResponse.status === 404) {
      return NextResponse.json(buildUnsupportedNotificationsPayload(), { status: 200 });
    }

    if (!backendResponse.ok) {
      const message = normalizeNotificationErrorMessage(
        payload,
        "Không thể tải danh sách thông báo."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(mapNotificationList(payload), {
      status: backendResponse.status,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API thông báo.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authToken = readAuthTokenFromRequest(request);
    const authResult = ensureValidAuthToken(authToken);
    if (!authResult.ok) {
      return authResult.response;
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
    };

    if (body.action !== "mark-all-read") {
      return NextResponse.json(
        {
          message: "Hanh dong khong hop le.",
        },
        { status: 400 }
      );
    }

    const backendUrl = resolveBackendUrl(NOTIFICATION_MARK_ALL_PATH);
    const backendResponse = await fetch(backendUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (backendResponse.status === 404) {
      return NextResponse.json({ success: true, updatedCount: 0, isSupported: false });
    }

    if (!backendResponse.ok) {
      const message = normalizeNotificationErrorMessage(
        payload,
        "Không thể đánh dấu đã đọc tất cả thông báo."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const updatedCount = Math.max(
      0,
      Math.trunc(readNumber((payload as Record<string, unknown>).updated_count))
    );
    return NextResponse.json({ success: true, updatedCount }, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API thông báo.",
      },
      { status: 500 }
    );
  }
}
