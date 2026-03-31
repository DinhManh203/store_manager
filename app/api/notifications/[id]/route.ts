import { NextRequest, NextResponse } from "next/server";

import { extractErrorMessage } from "@/lib/auth";

const AUTH_COOKIE_NAME = "auth_token";
const NOTIFICATION_MARK_READ_PATH = "/thong-bao/danh-dau-da-doc";

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

const readString = (value: unknown) => (typeof value === "string" ? value : "");

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authToken = readAuthTokenFromRequest(request);
    const authResult = ensureValidAuthToken(authToken);
    if (!authResult.ok) {
      return authResult.response;
    }

    const { id } = await params;
    const notificationId = readString(id).trim();
    if (!notificationId) {
      return NextResponse.json(
        {
          message: "Thieu id thong bao.",
        },
        { status: 400 }
      );
    }

    const backendUrl = resolveBackendUrl(
      `${NOTIFICATION_MARK_READ_PATH}/${encodeURIComponent(notificationId)}`
    );
    const backendResponse = await fetch(backendUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      cache: "no-store",
    });
    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = extractErrorMessage(payload) || "Khong the danh dau thong bao da doc.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json({ success: true, id: notificationId }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        message: "Khong the ket noi API thong bao.",
      },
      { status: 500 }
    );
  }
}
