import { NextRequest, NextResponse } from "next/server";

import { extractErrorMessage } from "@/lib/auth";

const AUTH_COOKIE_NAME = "auth_token";
const CATEGORY_LIST_PATH = "/danh-muc/danh-sach";
const CATEGORY_CREATE_PATH = "/danh-muc/them";
const CATEGORY_UPDATE_PATH = "/danh-muc/chinh-sua";
const CATEGORY_DELETE_PATH = "/danh-muc/xoa";
const CATEGORY_NAME_MIN_LENGTH = 1;
const CATEGORY_NAME_MAX_LENGTH = 120;

type CategoryPayload = {
  id: string;
  name: string;
  createdAt: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown) => (typeof value === "string" ? value : "");

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, " ");
const readNormalizedString = (value: unknown) => normalizeWhitespace(readString(value));

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

const mapBackendCategory = (payload: unknown): CategoryPayload | null => {
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
    createdAt: readDateString(payload.created_at) || readDateString(payload.createdAt),
  };
};

const mapBackendCategoryList = (payload: unknown) => {
  if (!Array.isArray(payload)) {
    return [] as CategoryPayload[];
  }

  return payload
    .map((item) => mapBackendCategory(item))
    .filter((item): item is CategoryPayload => item !== null);
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
    const backendUrl = resolveBackendUrl(CATEGORY_LIST_PATH);
    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      if (backendResponse.status === 404) {
        return NextResponse.json(
          {
            unavailable: true,
            categories: [],
            message:
              "Backend chưa hỗ trợ API danh mục. Frontend sẽ dùng chế độ lưu cục bộ.",
          },
          { status: 200 }
        );
      }

      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Không thể lấy danh sách danh mục."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const categories = mapBackendCategoryList(payload);
    return NextResponse.json(categories, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API danh mục.",
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
    const name = readNormalizedString(body.name);
    if (!name) {
      return NextResponse.json({ message: "Vui lòng nhập tên danh mục." }, { status: 400 });
    }
    if (name.length < CATEGORY_NAME_MIN_LENGTH) {
      return NextResponse.json(
        { message: `Tên danh mục phải có ít nhất ${CATEGORY_NAME_MIN_LENGTH} ký tự.` },
        { status: 400 }
      );
    }
    if (name.length > CATEGORY_NAME_MAX_LENGTH) {
      return NextResponse.json(
        { message: `Tên danh mục tối đa ${CATEGORY_NAME_MAX_LENGTH} ký tự.` },
        { status: 400 }
      );
    }

    const backendUrl = resolveBackendUrl(CATEGORY_CREATE_PATH);
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);
    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Không thể thêm danh mục."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const created = mapBackendCategory(payload) ?? {
      id: `${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(created, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API thêm danh mục.",
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
    const categoryId = readString(body.id).trim() || request.nextUrl.searchParams.get("id")?.trim() || "";
    if (!categoryId) {
      return NextResponse.json({ message: "Thiếu id danh mục để cập nhật." }, { status: 400 });
    }

    const name = readNormalizedString(body.name);
    if (!name) {
      return NextResponse.json({ message: "Vui lòng nhập tên danh mục." }, { status: 400 });
    }
    if (name.length < CATEGORY_NAME_MIN_LENGTH) {
      return NextResponse.json(
        { message: `Tên danh mục phải có ít nhất ${CATEGORY_NAME_MIN_LENGTH} ký tự.` },
        { status: 400 }
      );
    }
    if (name.length > CATEGORY_NAME_MAX_LENGTH) {
      return NextResponse.json(
        { message: `Tên danh mục tối đa ${CATEGORY_NAME_MAX_LENGTH} ký tự.` },
        { status: 400 }
      );
    }

    const backendUrl = resolveBackendUrl(
      `${CATEGORY_UPDATE_PATH}/${encodeURIComponent(categoryId)}`
    );
    const backendResponse = await fetch(backendUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);
    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Không thể cập nhật danh mục."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const updated = mapBackendCategory(payload) ?? {
      id: categoryId,
      name,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(updated, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API cập nhật danh mục.",
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

    let categoryId = request.nextUrl.searchParams.get("id")?.trim() ?? "";
    if (!categoryId) {
      try {
        const body = (await request.json()) as { id?: string };
        categoryId = body.id?.trim() ?? "";
      } catch {
        categoryId = "";
      }
    }

    if (!categoryId) {
      return NextResponse.json({ message: "Thiếu id danh mục để xóa." }, { status: 400 });
    }

    const backendUrl = resolveBackendUrl(
      `${CATEGORY_DELETE_PATH}/${encodeURIComponent(categoryId)}`
    );
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
        "Không thể xóa danh mục."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API xóa danh mục.",
      },
      { status: 500 }
    );
  }
}
