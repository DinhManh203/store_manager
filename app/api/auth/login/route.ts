import { NextResponse } from "next/server";

import { extractAuthToken, extractErrorMessage, extractRole } from "@/lib/auth";

const AUTH_COOKIE_NAME = "auth_token";
const AUTH_ROLE_COOKIE_NAME = "auth_role";
const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_ADMIN_ROLE = "Admin";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getAdminCredentials = () => {
  const username = process.env.ADMIN_USER_NAME?.trim() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const role = process.env.ADMIN_ROLE?.trim() || DEFAULT_ADMIN_ROLE;

  return { username, password, role };
};

const setAuthCookies = (
  response: NextResponse,
  token: string,
  role?: string
) => {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK_IN_SECONDS,
  });

  if (!role) {
    return;
  }

  response.cookies.set({
    name: AUTH_ROLE_COOKIE_NAME,
    value: role,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK_IN_SECONDS,
  });
};

const buildSuccessPayload = (payload: unknown, token: string, role?: string) => {
  const base = isObject(payload) ? { ...payload } : {};

  if (!("accessToken" in base) && !("access_token" in base) && !("token" in base)) {
    base.accessToken = token;
  }

  if (role && !("role" in base)) {
    base.role = role;
  }

  return base;
};

const resolveBackendLoginUrl = () => {
  const directUrl = process.env.NEXT_PUBLIC_API_LOGIN_URL;
  if (directUrl) {
    return directUrl;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL in .env");
  }

  const loginPath = process.env.NEXT_PUBLIC_API_LOGIN_PATH ?? "/auth/login";
  const normalizedPath = loginPath.startsWith("/") ? loginPath : `/${loginPath}`;

  return new URL(normalizedPath, baseUrl).toString();
};

const readPayload = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : {};
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";

    if (!username || !password) {
      return NextResponse.json(
        { message: "Vui lòng nhập tài khoản và mật khẩu." },
        { status: 400 }
      );
    }

    const admin = getAdminCredentials();
    const isAdminLogin =
      Boolean(admin.username && admin.password) &&
      username === admin.username &&
      password === admin.password;

    if (isAdminLogin) {
      const token = `local-admin-${crypto.randomUUID()}`;
      const responsePayload = buildSuccessPayload(
        { message: "Đăng nhập thành công." },
        token,
        admin.role
      );
      const response = NextResponse.json(responsePayload);
      setAuthCookies(response, token, admin.role);
      return response;
    }

    const backendUrl = resolveBackendLoginUrl();

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          message: extractErrorMessage(payload) || "Đăng nhập thất bại. Vui lòng thử lại.",
        },
        { status: backendResponse.status }
      );
    }

    const token = extractAuthToken(payload);
    if (!token) {
      return NextResponse.json(
        {
          message:
            "Đăng nhập thành công nhưng backend không trả về token. Kiểm tra API login.",
        },
        { status: 502 }
      );
    }

    const role = extractRole(payload) || undefined;
    const responsePayload = buildSuccessPayload(payload, token, role);
    const response = NextResponse.json(responsePayload);
    setAuthCookies(response, token, role);

    return response;
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API đăng nhập. Kiểm tra lại backend và env.",
      },
      { status: 500 }
    );
  }
}
