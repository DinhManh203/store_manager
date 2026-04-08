import { NextRequest, NextResponse } from "next/server";

import { extractErrorMessage } from "@/lib/auth";

const AUTH_COOKIE_NAME = "auth_token";
const BRANCH_LIST_PATH = "/chi-nhanh/danh-sach";
const BRANCH_CREATE_PATH = "/chi-nhanh/them";
const BRANCH_UPDATE_PATH = "/chi-nhanh/chinh-sua";
const BRANCH_DELETE_PATH = "/chi-nhanh/xoa";
const BRANCH_NAME_MIN_LENGTH = 2;
const BRANCH_NAME_MAX_LENGTH = 120;
const BRANCH_PHONE_PATTERN = /^\+?[0-9][0-9\s\-().]{6,19}$/;

type BranchPayload = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  manager?: string;
  is_active: boolean;
  createdAt: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown) => (typeof value === "string" ? value : "");
const readBoolean = (value: unknown) => (typeof value === "boolean" ? value : true);
const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, " ");
const readNormalizedString = (value: unknown) => normalizeWhitespace(readString(value));
const normalizeNullableString = (value: unknown) => {
  const normalized = readNormalizedString(value);
  return normalized || null;
};
const hasOwn = (source: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(source, key);

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

const mapBackendBranch = (payload: unknown): BranchPayload | null => {
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
    address: readString(payload.address).trim(),
    phone: readString(payload.phone).trim(),
    manager: readString(payload.manager).trim(),
    is_active: payload.is_active !== undefined ? readBoolean(payload.is_active) : true,
    createdAt:
      readDateString(payload.created_at) ||
      readDateString(payload.createdAt),
  };
};

const mapBackendBranchList = (payload: unknown) => {
  if (!Array.isArray(payload)) {
    return [] as BranchPayload[];
  }

  return payload
    .map((item) => mapBackendBranch(item))
    .filter((item): item is BranchPayload => item !== null);
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

  if (status === 404 && (normalizedMessage.includes("not found") || normalizedMessage.includes("không tìm thấy"))) {
    return "Backend hiện chưa hỗ trợ API chi nhánh. Vui lòng deploy phiên bản backend mới nhất.";
  }

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
    const backendUrl = resolveBackendUrl(BRANCH_LIST_PATH);
    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Không thể lấy danh sách chi nhánh."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const branches = mapBackendBranchList(payload);
    return NextResponse.json(branches, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API chi nhánh.",
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
      return NextResponse.json({ message: "Vui lòng nhập tên chi nhánh." }, { status: 400 });
    }
    if (name.length < BRANCH_NAME_MIN_LENGTH) {
      return NextResponse.json(
        { message: `Tên chi nhánh phải có ít nhất ${BRANCH_NAME_MIN_LENGTH} ký tự.` },
        { status: 400 }
      );
    }
    if (name.length > BRANCH_NAME_MAX_LENGTH) {
      return NextResponse.json(
        { message: `Tên chi nhánh tối đa ${BRANCH_NAME_MAX_LENGTH} ký tự.` },
        { status: 400 }
      );
    }

    const phone = normalizeNullableString(body.phone);
    if (phone && !BRANCH_PHONE_PATTERN.test(phone)) {
      return NextResponse.json({ message: "Số điện thoại chi nhánh không hợp lệ." }, { status: 400 });
    }

    const createPayload: Record<string, unknown> = {
      name,
      is_active: hasOwn(body, "is_active") ? readBoolean(body.is_active) : true,
    };

    if (hasOwn(body, "address")) {
      createPayload.address = normalizeNullableString(body.address);
    }
    if (hasOwn(body, "phone")) {
      createPayload.phone = phone;
    }
    if (hasOwn(body, "manager")) {
      createPayload.manager = normalizeNullableString(body.manager);
    }

    const backendUrl = resolveBackendUrl(BRANCH_CREATE_PATH);
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createPayload),
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Không thể thêm chi nhánh."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const created = mapBackendBranch(payload) ?? {
      id: `${Date.now()}`,
      name,
      address:
        typeof createPayload.address === "string" ? createPayload.address : undefined,
      phone: typeof createPayload.phone === "string" ? createPayload.phone : undefined,
      manager:
        typeof createPayload.manager === "string" ? createPayload.manager : undefined,
      is_active:
        typeof createPayload.is_active === "boolean" ? createPayload.is_active : true,
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json(created, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API thêm chi nhánh.",
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
    const branchId = readString(body.id).trim() || request.nextUrl.searchParams.get("id")?.trim() || "";
    if (!branchId) {
      return NextResponse.json({ message: "Thiếu id chi nhánh để cập nhật." }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {};

    if (hasOwn(body, "name")) {
      const name = readNormalizedString(body.name);
      if (!name) {
        return NextResponse.json({ message: "Vui lòng nhập tên chi nhánh." }, { status: 400 });
      }
      if (name.length < BRANCH_NAME_MIN_LENGTH) {
        return NextResponse.json(
          { message: `Tên chi nhánh phải có ít nhất ${BRANCH_NAME_MIN_LENGTH} ký tự.` },
          { status: 400 }
        );
      }
      if (name.length > BRANCH_NAME_MAX_LENGTH) {
        return NextResponse.json(
          { message: `Tên chi nhánh tối đa ${BRANCH_NAME_MAX_LENGTH} ký tự.` },
          { status: 400 }
        );
      }
      updatePayload.name = name;
    }

    if (hasOwn(body, "address")) {
      updatePayload.address = normalizeNullableString(body.address);
    }

    if (hasOwn(body, "phone")) {
      const phone = normalizeNullableString(body.phone);
      if (phone && !BRANCH_PHONE_PATTERN.test(phone)) {
        return NextResponse.json({ message: "Số điện thoại chi nhánh không hợp lệ." }, { status: 400 });
      }
      updatePayload.phone = phone;
    }

    if (hasOwn(body, "manager")) {
      updatePayload.manager = normalizeNullableString(body.manager);
    }

    if (hasOwn(body, "is_active")) {
      updatePayload.is_active = readBoolean(body.is_active);
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ message: "Không có dữ liệu gì để cập nhật." }, { status: 400 });
    }

    const backendUrl = resolveBackendUrl(`${BRANCH_UPDATE_PATH}/${encodeURIComponent(branchId)}`);
    const backendResponse = await fetch(backendUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatePayload),
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Không thể cập nhật chi nhánh."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const updated = mapBackendBranch(payload) ?? {
      id: branchId,
      name: typeof updatePayload.name === "string" ? updatePayload.name : "",
      address:
        typeof updatePayload.address === "string" ? updatePayload.address : undefined,
      phone: typeof updatePayload.phone === "string" ? updatePayload.phone : undefined,
      manager:
        typeof updatePayload.manager === "string" ? updatePayload.manager : undefined,
      is_active:
        typeof updatePayload.is_active === "boolean" ? updatePayload.is_active : true,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(updated, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API cập nhật chi nhánh.",
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

    let branchId = request.nextUrl.searchParams.get("id")?.trim() ?? "";
    if (!branchId) {
      try {
        const body = (await request.json()) as { id?: string };
        branchId = body.id?.trim() ?? "";
      } catch {
        branchId = "";
      }
    }

    if (!branchId) {
      return NextResponse.json({ message: "Thiếu id chi nhánh để xóa." }, { status: 400 });
    }

    const branchListUrl = resolveBackendUrl(BRANCH_LIST_PATH);
    const branchListResponse = await fetch(branchListUrl, {
      method: "GET",
      cache: "no-store",
    });
    const branchListPayload = await readPayload(branchListResponse);

    if (!branchListResponse.ok) {
      const message = normalizeApiErrorMessage(
        branchListPayload,
        branchListResponse.status,
        "Không thể kiểm tra trạng thái chi nhánh trước khi xóa."
      );
      return NextResponse.json({ message }, { status: branchListResponse.status });
    }

    const existingBranch = mapBackendBranchList(branchListPayload).find(
      (branch) => branch.id === branchId
    );
    if (!existingBranch) {
      return NextResponse.json({ message: "Không tìm thấy chi nhánh." }, { status: 404 });
    }

    if (existingBranch.is_active) {
      return NextResponse.json(
        {
          message:
            "Chỉ có thể xóa chi nhánh đang ngừng hoạt động. Vui lòng tắt trạng thái hoạt động trước.",
        },
        { status: 400 }
      );
    }

    const backendUrl = resolveBackendUrl(`${BRANCH_DELETE_PATH}/${encodeURIComponent(branchId)}`);
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
        "Không thể xóa chi nhánh."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API xóa chi nhánh.",
      },
      { status: 500 }
    );
  }
}
