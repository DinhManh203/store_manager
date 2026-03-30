import { NextResponse } from "next/server";

import { extractAuthToken, extractErrorMessage, extractRole } from "@/lib/auth";

const AUTH_COOKIE_NAME = "auth_token";
const AUTH_ROLE_COOKIE_NAME = "auth_role";
const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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

const shouldTryAlternativeFormat = (status: number) =>
  status === 400 ||
  status === 401 ||
  status === 403 ||
  status === 404 ||
  status === 405 ||
  status === 415 ||
  status === 422;

const normalizeLoginErrorMessage = (rawMessage: string, status: number) => {
  const message = rawMessage.trim();
  const normalizedMessage = message.toLowerCase();

  const invalidCredentialPatterns = [
    "không thể xác thực thông tin đăng nhập",
    "khong the xac thuc thong tin dang nhap",
    "sai mật khẩu",
    "sai mat khau",
    "tài khoản không tồn tại",
    "tai khoan khong ton tai",
    "invalid credentials",
    "incorrect username or password",
  ];

  if (
    status === 401 ||
    invalidCredentialPatterns.some((pattern) => normalizedMessage.includes(pattern))
  ) {
    return "Tài khoản hoặc mật khẩu không đúng. Vui lòng thử lại.";
  }

  if (message) {
    return message;
  }

  return "Đăng nhập thất bại. Vui lòng thử lại.";
};

type LoginRequestVariant = {
  contentType: "application/x-www-form-urlencoded" | "application/json";
  body: Record<string, string>;
};

const sendLoginRequest = async (
  backendUrl: string,
  variant: LoginRequestVariant
) => {
  const requestBody =
    variant.contentType === "application/x-www-form-urlencoded"
      ? new URLSearchParams(variant.body).toString()
      : JSON.stringify(variant.body);

  const response = await fetch(backendUrl, {
    method: "POST",
    headers: {
      "Content-Type": variant.contentType,
    },
    body: requestBody,
    cache: "no-store",
  });

  const payload = await readPayload(response);
  return { response, payload };
};

const loginWithBackend = async (
  backendUrl: string,
  username: string,
  password: string
) => {
  const variants: LoginRequestVariant[] = [
    {
      contentType: "application/x-www-form-urlencoded",
      body: { username, password },
    },
    {
      contentType: "application/json",
      body: { username, password },
    },
    {
      contentType: "application/x-www-form-urlencoded",
      body: { email: username, password },
    },
    {
      contentType: "application/json",
      body: { email: username, password },
    },
    {
      contentType: "application/x-www-form-urlencoded",
      body: { account: username, password },
    },
    {
      contentType: "application/json",
      body: { account: username, password },
    },
    {
      contentType: "application/x-www-form-urlencoded",
      body: { tai_khoan: username, password },
    },
    {
      contentType: "application/json",
      body: { tai_khoan: username, password },
    },
  ];

  let latestResult: Awaited<ReturnType<typeof sendLoginRequest>> = {
    response: new Response(null, { status: 500 }),
    payload: {},
  };

  for (const variant of variants) {
    const result = await sendLoginRequest(backendUrl, variant);
    latestResult = result;

    if (result.response.ok) {
      return result;
    }

    if (!shouldTryAlternativeFormat(result.response.status)) {
      return result;
    }
  }

  return latestResult;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      username?: string;
      password?: string;
    };

    const loginInput = body.username ?? body.email ?? "";
    const trimmedIdentifier = loginInput.trim();
    const isUsernameOnly = !trimmedIdentifier.includes("@");
    const identifier = isUsernameOnly
      ? trimmedIdentifier
      : trimmedIdentifier.toLowerCase();
    const password = body.password ?? "";

    if (!identifier || !password) {
      return NextResponse.json(
        { message: "Vui lòng nhập tài khoản/Gmail và mật khẩu." },
        { status: 400 }
      );
    }

    const backendUrl = resolveBackendLoginUrl();
    const fallbackUsername = identifier.split("@")[0]?.trim().toLowerCase() ?? "";
    const shouldFallbackToUsername =
      !isUsernameOnly && Boolean(fallbackUsername) && fallbackUsername !== identifier;

    let loginResult = await loginWithBackend(backendUrl, identifier, password);

    if (
      !loginResult.response.ok &&
      shouldFallbackToUsername &&
      [400, 401, 403, 404, 422].includes(loginResult.response.status)
    ) {
      loginResult = await loginWithBackend(backendUrl, fallbackUsername, password);
    }

    const { response: backendResponse, payload } = loginResult;

    if (!backendResponse.ok) {
      const rawErrorMessage = extractErrorMessage(payload);
      return NextResponse.json(
        {
          message: normalizeLoginErrorMessage(rawErrorMessage, backendResponse.status),
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
