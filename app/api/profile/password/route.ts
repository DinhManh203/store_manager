import { NextRequest, NextResponse } from "next/server";

import { extractErrorMessage } from "@/lib/auth";

const AUTH_COOKIE_NAME = "auth_token";
const CHANGE_PASSWORD_PATH =
  process.env.NEXT_PUBLIC_API_CHANGE_PASSWORD_PATH ?? "/nguoi-dung/doi-mat-khau";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown) => (typeof value === "string" ? value : "");

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

const readAuthTokenFromRequest = (request: NextRequest) =>
  request.cookies.get(AUTH_COOKIE_NAME)?.value?.trim() ?? "";

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

export async function PUT(request: NextRequest) {
  try {
    const authToken = readAuthTokenFromRequest(request);
    const authResult = ensureValidAuthToken(authToken);
    if (!authResult.ok) {
      return authResult.response;
    }

    const body = (await request.json()) as {
      current_password?: string;
      new_password?: string;
      confirm_password?: string;
    };

    const currentPassword = readString(body.current_password).trim();
    const newPassword = readString(body.new_password).trim();
    const confirmPassword = readString(body.confirm_password).trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        {
          message: "Vui lòng nhập đầy đủ mật khẩu hiện tại, mật khẩu mới và xác nhận.",
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          message: "Mật khẩu mới phải có ít nhất 8 ký tự.",
        },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          message: "Xác nhận mật khẩu mới không khớp.",
        },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        {
          message: "Mật khẩu mới phải khác mật khẩu hiện tại.",
        },
        { status: 400 }
      );
    }

    const backendUrl = resolveBackendUrl(CHANGE_PASSWORD_PATH);
    const backendResponse = await fetch(backendUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
      cache: "no-store",
    });
    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = extractErrorMessage(payload) || "Không thể đổi mật khẩu.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const message =
      isObject(payload) && typeof payload.message === "string"
        ? payload.message
        : "Đổi mật khẩu thành công.";

    return NextResponse.json({ message }, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API đổi mật khẩu.",
      },
      { status: 500 }
    );
  }
}
