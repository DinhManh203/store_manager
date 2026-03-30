import { NextRequest, NextResponse } from "next/server";

import { extractErrorMessage } from "@/lib/auth";

const AUTH_COOKIE_NAME = "auth_token";
const EMPLOYEE_CREATE_PATH = "/nguoi-dung/quan-tri/tao-nhan-vien";
const EMPLOYEE_LIST_PATH = "/nguoi-dung/quan-tri/danh-sach-nhan-vien";
const EMPLOYEE_DASHBOARD_PATH = "/nguoi-dung/quan-tri/bang-dieu-khien";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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

const extractValidationMessage = (payload: unknown) => {
  if (!isObject(payload)) {
    return "";
  }

  const detail = payload.detail;
  if (typeof detail === "string") {
    return detail;
  }

  if (!Array.isArray(detail)) {
    return "";
  }

  const messages = detail
    .map((item) => (isObject(item) && typeof item.msg === "string" ? item.msg : ""))
    .filter(Boolean);

  return messages.join(", ");
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

const resolveCreateEmployeeUrl = () => {
  const baseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL in .env");
  }

  return new URL(EMPLOYEE_CREATE_PATH, baseUrl).toString();
};

const resolveDashboardUrl = () => {
  const baseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL in .env");
  }

  return new URL(EMPLOYEE_DASHBOARD_PATH, baseUrl).toString();
};

const resolveEmployeeListUrl = () => {
  const directUrl = process.env.NEXT_PUBLIC_API_EMPLOYEES_LIST_URL;
  if (directUrl) {
    return directUrl;
  }

  const baseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL in .env");
  }

  const listPath = process.env.NEXT_PUBLIC_API_EMPLOYEES_LIST_PATH ?? EMPLOYEE_LIST_PATH;
  const normalizedPath = listPath.startsWith("/") ? listPath : `/${listPath}`;
  return new URL(normalizedPath, baseUrl).toString();
};

const readAuthTokenFromRequest = (request: NextRequest) =>
  request.cookies.get(AUTH_COOKIE_NAME)?.value ?? "";

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

export async function GET(request: NextRequest) {
  try {
    const authToken = readAuthTokenFromRequest(request);
    const authResult = ensureValidAuthToken(authToken);
    if (!authResult.ok) {
      return authResult.response;
    }

    const configuredListUrl = resolveEmployeeListUrl();
    let backendResponse = await fetch(configuredListUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      cache: "no-store",
    });
    let payload = await readPayload(backendResponse);

    if (backendResponse.status === 404 || backendResponse.status === 405) {
      const dashboardUrl = resolveDashboardUrl();
      backendResponse = await fetch(dashboardUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        cache: "no-store",
      });
      payload = await readPayload(backendResponse);
    }

    if (!backendResponse.ok) {
      const message =
        extractErrorMessage(payload) ||
        extractValidationMessage(payload) ||
        "Không thể lấy danh sách nhân viên.";

      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API danh sách nhân viên.",
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

    const body = (await request.json()) as {
      full_name?: string;
      email?: string;
      phone?: string;
      role?: string;
      temporary_password?: string;
    };

    const fullName = body.full_name?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    const role = body.role === "admin" ? "admin" : "user";
    const temporaryPassword = body.temporary_password?.trim() ?? "";

    if (!fullName || !email || !phone || !temporaryPassword) {
      return NextResponse.json(
        {
          message: "Thiếu thông tin bắt buộc để tạo nhân viên.",
        },
        { status: 400 }
      );
    }

    const backendUrl = resolveCreateEmployeeUrl();

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: fullName,
        email,
        phone,
        role,
        temporary_password: temporaryPassword,
      }),
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      const message =
        extractErrorMessage(payload) ||
        extractValidationMessage(payload) ||
        (backendResponse.status === 500
          ? "Backend đang lỗi khi tạo nhân viên. Vui lòng thử lại bằng tài khoản admin backend khác hoặc kiểm tra log backend."
          : "Tạo nhân viên thất bại.");

      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API tạo nhân viên.",
      },
      { status: 500 }
    );
  }
}
