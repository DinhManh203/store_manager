import { NextRequest, NextResponse } from "next/server";

import { extractErrorMessage } from "@/lib/auth";

const AUTH_COOKIE_NAME = "auth_token";
const PRODUCT_LIST_PATH = "/san-pham/danh-sach";
const PRODUCT_CREATE_PATH = "/san-pham/them-san-pham";
const PRODUCT_UPDATE_PATH = "/san-pham/chinh-sua";
const PRODUCT_DELETE_PATH = "/san-pham/xoa";

type ProductPayload = {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  price: number;
  imageUrl: string;
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

const extractSkuFromDescription = (description: string) => {
  const trimmed = description.trim();
  if (!trimmed) {
    return "";
  }

  const matched = trimmed.match(/^sku\s*[:\-]\s*(.+)$/i);
  return matched?.[1]?.trim() ?? "";
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

const mapBackendProduct = (
  payload: unknown,
  fallback: Partial<ProductPayload> = {}
): ProductPayload | null => {
  if (!isObject(payload)) {
    return null;
  }

  const rawDescription = readString(payload.description);
  const id = readString(payload.id).trim() || readString(fallback.id).trim();
  const name = readString(payload.name).trim() || readString(fallback.name).trim();
  const category =
    readString(payload.category).trim() || readString(fallback.category).trim() || "Khác";
  const imageUrl =
    readString(payload.image_url).trim() ||
    readString(payload.imageUrl).trim() ||
    readString(fallback.imageUrl).trim();
  const quantity = Math.max(
    0,
    Math.trunc(readNumber(payload.stock) || readNumber(fallback.quantity))
  );
  const price = readNumber(payload.price) || readNumber(fallback.price);
  const sku =
    readString(payload.sku).trim() ||
    extractSkuFromDescription(rawDescription) ||
    readString(fallback.sku).trim();
  const createdAt =
    readDateString(payload.created_at) ||
    readDateString(payload.createdAt) ||
    readDateString(fallback.createdAt);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    sku,
    category,
    quantity,
    price,
    imageUrl,
    createdAt,
  };
};

const mapBackendProductList = (payload: unknown) => {
  if (!Array.isArray(payload)) {
    return [] as ProductPayload[];
  }

  return payload
    .map((item) => mapBackendProduct(item))
    .filter((item): item is ProductPayload => item !== null);
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

const normalizeCreateOrUpdateBody = (body: unknown) => {
  const source = isObject(body) ? body : {};
  const name = readString(source.name).trim();
  const sku = readString(source.sku).trim().toUpperCase();
  const category = readString(source.category).trim() || "Khác";
  const imageUrl = readString(source.imageUrl).trim();
  const quantity = Number(readString(source.quantity) || readNumber(source.quantity));
  const price = Number(readString(source.price) || readNumber(source.price));
  const description = readString(source.description).trim();

  return {
    id: readString(source.id).trim(),
    name,
    sku,
    category,
    imageUrl,
    quantity,
    price,
    description,
  };
};

const validateProductBody = (payload: ReturnType<typeof normalizeCreateOrUpdateBody>) => {
  if (!payload.name || !payload.sku) {
    return "Vui lòng nhập đầy đủ tên và SKU sản phẩm.";
  }

  if (!Number.isInteger(payload.quantity) || payload.quantity < 0) {
    return "Số lượng phải là số nguyên không âm.";
  }

  if (!Number.isFinite(payload.price) || payload.price <= 0) {
    return "Giá phải là số lớn hơn 0.";
  }

  return "";
};

export async function GET() {
  try {
    const backendUrl = resolveBackendUrl(PRODUCT_LIST_PATH);
    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Khong the lay danh sach san pham."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const products = mapBackendProductList(payload);
    return NextResponse.json(products, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API sản phẩm.",
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

    const body = normalizeCreateOrUpdateBody(await request.json());
    const validationError = validateProductBody(body);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const backendUrl = resolveBackendUrl(PRODUCT_CREATE_PATH);
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: body.name,
        category: body.category,
        stock: body.quantity,
        price: body.price,
        image_url: body.imageUrl || null,
        description: body.description || `SKU:${body.sku}`,
        sku: body.sku,
      }),
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Khong the them san pham."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const createdProduct =
      mapBackendProduct(payload, {
        name: body.name,
        sku: body.sku,
        category: body.category,
        quantity: body.quantity,
        price: body.price,
        imageUrl: body.imageUrl,
        createdAt: new Date().toISOString(),
      }) ?? {
        id: `${Date.now()}`,
        name: body.name,
        sku: body.sku,
        category: body.category,
        quantity: body.quantity,
        price: body.price,
        imageUrl: body.imageUrl,
        createdAt: new Date().toISOString(),
      };

    return NextResponse.json(createdProduct, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API thêm sản phẩm.",
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

    const body = normalizeCreateOrUpdateBody(await request.json());
    const productId = body.id || request.nextUrl.searchParams.get("id")?.trim() || "";
    if (!productId) {
      return NextResponse.json({ message: "Thiếu id sản phẩm để cập nhật." }, { status: 400 });
    }

    const validationError = validateProductBody(body);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const backendUrl = resolveBackendUrl(`${PRODUCT_UPDATE_PATH}/${encodeURIComponent(productId)}`);
    const backendResponse = await fetch(backendUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: body.name,
        category: body.category,
        stock: body.quantity,
        price: body.price,
        image_url: body.imageUrl || null,
        description: body.description || `SKU:${body.sku}`,
        sku: body.sku,
      }),
      cache: "no-store",
    });

    const payload = await readPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = normalizeApiErrorMessage(
        payload,
        backendResponse.status,
        "Khong the cap nhat san pham."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    const updatedProduct =
      mapBackendProduct(payload, {
        id: productId,
        name: body.name,
        sku: body.sku,
        category: body.category,
        quantity: body.quantity,
        price: body.price,
        imageUrl: body.imageUrl,
        createdAt: new Date().toISOString(),
      }) ?? {
        id: productId,
        name: body.name,
        sku: body.sku,
        category: body.category,
        quantity: body.quantity,
        price: body.price,
        imageUrl: body.imageUrl,
        createdAt: new Date().toISOString(),
      };

    return NextResponse.json(updatedProduct, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API cập nhật sản phẩm.",
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

    let productId = request.nextUrl.searchParams.get("id")?.trim() ?? "";
    if (!productId) {
      try {
        const body = (await request.json()) as { id?: string };
        productId = body.id?.trim() ?? "";
      } catch {
        productId = "";
      }
    }

    if (!productId) {
      return NextResponse.json({ message: "Thiếu id sản phẩm để xóa." }, { status: 400 });
    }

    const backendUrl = resolveBackendUrl(`${PRODUCT_DELETE_PATH}/${encodeURIComponent(productId)}`);
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
        "Khong the xoa san pham."
      );
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        message: "Không thể kết nối API xóa sản phẩm.",
      },
      { status: 500 }
    );
  }
}

