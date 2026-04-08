import { NextRequest, NextResponse } from "next/server";

import { extractErrorMessage } from "@/lib/auth";

const AUTH_COOKIE_NAME = "auth_token";
const SUPPLIER_LIST_PATH = "/nha-cung-cap/danh-sach";
const SUPPLIER_CREATE_PATH = "/nha-cung-cap/them";
const SUPPLIER_UPDATE_PATH = "/nha-cung-cap/chinh-sua";
const SUPPLIER_DELETE_PATH = "/nha-cung-cap/xoa";

type SupplierPayload = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown) => (typeof value === "string" ? value : "");

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

const mapBackendSupplier = (payload: unknown): SupplierPayload | null => {
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
    createdAt:
      readDateString(payload.created_at) ||
      readDateString(payload.createdAt),
  };
};

const mapBackendSupplierList = (payload: unknown) => {
  if (!Array.isArray(payload)) {
    return [] as SupplierPayload[];
  }

  return payload
    .map((item) => mapBackendSupplier(item))
    .filter((item): item is SupplierPayload => item !== null);
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

const normalizeApiErrorMessage = (payload: unknown, status: number, fallback: string) => {
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

export async function GET() {
  try {
    const backendUrl = resolveBackendUrl(SUPPLIER_LIST_PATH);
    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Không thể lấy danh sách nhà cung cấp."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const suppliers = mapBackendSupplierList(payload);
    return NextResponse.json(suppliers, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API nhà cung cấp.",
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

    const body = (await request.json()) as Record<string, unknown>;
    const name = readString(body.name).trim();
    if (!name) {
      return NextResponse.json({ message: "Vui lòng nhập tên nhà cung cấp." }, { status: 400 });
    }

    const backendUrl = resolveBackendUrl(SUPPLIER_CREATE_PATH);
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        phone: readString(body.phone).trim() || null,
        email: readString(body.email).trim() || null,
        address: readString(body.address).trim() || null,
      }),
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Không thể thêm nhà cung cấp."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const created = mapBackendSupplier(payload) ?? {
      id: `${Date.now()}`,
      name,
      phone: readString(body.phone).trim(),
      email: readString(body.email).trim(),
      address: readString(body.address).trim(),
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(created, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API thêm nhà cung cấp.",
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

    const body = (await request.json()) as Record<string, unknown>;
    const supplierId = readString(body.id).trim() || request.nextUrl.searchParams.get("id")?.trim() || "";
    if (!supplierId) {
      return NextResponse.json({ message: "Thiếu id nhà cung cấp để cập nhật." }, { status: 400 });
    }

    const name = readString(body.name).trim();
    if (!name) {
      return NextResponse.json({ message: "Vui lòng nhập tên nhà cung cấp." }, { status: 400 });
    }

    const backendUrl = resolveBackendUrl(`${SUPPLIER_UPDATE_PATH}/${encodeURIComponent(supplierId)}`);
    const backendResponse = await fetch(backendUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        phone: readString(body.phone).trim() || null,
        email: readString(body.email).trim() || null,
        address: readString(body.address).trim() || null,
      }),
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Không thể cập nhật nhà cung cấp."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const updated = mapBackendSupplier(payload) ?? {
      id: supplierId,
      name,
      phone: readString(body.phone).trim(),
      email: readString(body.email).trim(),
      address: readString(body.address).trim(),
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(updated, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API cập nhật nhà cung cấp.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authToken = readAuthTokenFromRequest(request);
    const authResult = ensureValidAuthToken(authToken);
    if (!authResult.ok) {
      return authResult.response;
    }

    let supplierId = request.nextUrl.searchParams.get("id")?.trim() ?? "";
    if (!supplierId) {
      try {
        const body = (await request.json()) as { id?: string };
        supplierId = body.id?.trim() ?? "";
      } catch {
        supplierId = "";
      }
    }

    if (!supplierId) {
      return NextResponse.json({ message: "Thiếu id nhà cung cấp để xóa." }, { status: 400 });
    }

    const backendUrl = resolveBackendUrl(`${SUPPLIER_DELETE_PATH}/${encodeURIComponent(supplierId)}`);
    const backendResponse = await fetch(backendUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);
    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Không thể xóa nhà cung cấp."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API xóa nhà cung cấp.",
      },
      { status: 500 }
    );
  }
}
