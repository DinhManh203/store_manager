import { NextRequest, NextResponse } from "next/server";

import { extractErrorMessage } from "@/lib/auth";

const AUTH_COOKIE_NAME = "auth_token";
const PROFILE_PATH = process.env.NEXT_PUBLIC_API_PROFILE_PATH ?? "/nguoi-dung/ho-so";

type ProfilePayload = {
  username: string;
  email: string;
  role: string;
  full_name: string;
  phone: string;
};

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

const mapProfilePayload = (payload: unknown): ProfilePayload | null => {
  if (!isObject(payload)) {
    return null;
  }

  const username = readString(payload.username).trim();
  const email = readString(payload.email).trim();
  const role = readString(payload.role).trim();

  if (!username || !email) {
    return null;
  }

  return {
    username,
    email,
    role,
    full_name: readString(payload.full_name).trim(),
    phone: readString(payload.phone).trim(),
  };
};

export async function GET(request: NextRequest) {
  try {
    const authToken = readAuthTokenFromRequest(request);
    const authResult = ensureValidAuthToken(authToken);
    if (!authResult.ok) {
      return authResult.response;
    }

    const backendUrl = resolveBackendUrl(PROFILE_PATH);
    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      cache: "no-store",
    });
    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = extractErrorMessage(payload) || "Không thể tải hồ sơ cá nhân.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const profile = mapProfilePayload(payload);
    if (!profile) {
      return NextResponse.json(
        { message: "Dữ liệu hồ sơ từ backend không hợp lệ." },
        { status: 502 }
      );
    }

    return NextResponse.json(profile, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API hồ sơ cá nhân.",
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

    const body = (await request.json()) as {
      full_name?: string | null;
      email?: string | null;
      phone?: string | null;
    };

    const hasFullName = Object.prototype.hasOwnProperty.call(body, "full_name");
    const hasEmail = Object.prototype.hasOwnProperty.call(body, "email");
    const hasPhone = Object.prototype.hasOwnProperty.call(body, "phone");

    const fullName = readString(body.full_name).trim();
    const email = readString(body.email).trim().toLowerCase();
    const phone = readString(body.phone).trim();

    if (hasEmail && !email) {
      return NextResponse.json(
        {
          message: "Email không được để trống.",
        },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, string> = {};
    if (hasFullName && fullName) {
      updatePayload.full_name = fullName;
    }
    if (hasEmail && email) {
      updatePayload.email = email;
    }
    if (hasPhone && phone) {
      updatePayload.phone = phone;
    }

    if (!Object.keys(updatePayload).length) {
      return NextResponse.json(
        {
          message: "Không có dữ liệu để cập nhật hồ sơ.",
        },
        { status: 400 }
      );
    }

    const backendUrl = resolveBackendUrl(PROFILE_PATH);
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
      const message = extractErrorMessage(payload) || "Không thể cập nhật hồ sơ cá nhân.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const profile = mapProfilePayload(payload);
    if (!profile) {
      return NextResponse.json(
        { message: "Dữ liệu hồ sơ sau cập nhật không hợp lệ." },
        { status: 502 }
      );
    }

    return NextResponse.json(profile, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API cập nhật hồ sơ.",
      },
      { status: 500 }
    );
  }
}
