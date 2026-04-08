import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "auth_token";
const REPORT_OVERVIEW_PATH = "/bao-cao/tong-quan-ton-kho";
const REPORT_HISTORY_PATH = "/bao-cao/lich-su-bien-dong";
const EMPLOYEE_DASHBOARD_PATH = "/nguoi-dung/quan-tri/bang-dieu-khien";

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

const resolveBackendUrl = (path: string, searchParams?: URLSearchParams) => {
  const baseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL in .env");
  }
  const url = new URL(path, baseUrl);
  if (searchParams) {
    searchParams.forEach((val, key) => {
      url.searchParams.append(key, val);
    });
  }
  return url.toString();
};

const readAuthTokenFromRequest = (request: NextRequest) => {
  let token = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? "";
  token = token.trim();
  if (token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }
  return token.replace(/^Bearer\s+/i, "").trim();
};

export async function GET(request: NextRequest) {
  try {
    const authToken = readAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ message: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
    }

    const headers = { Authorization: `Bearer ${authToken}` };

    // Fetch Overview
    const overviewRes = await fetch(resolveBackendUrl(REPORT_OVERVIEW_PATH), {
      headers,
      cache: "no-store",
    });
    
    // Fetch History
    const historyParams = new URLSearchParams();
    historyParams.append("gioi_han", "10");
    const historyRes = await fetch(resolveBackendUrl(REPORT_HISTORY_PATH, historyParams), {
      headers,
      cache: "no-store",
    });

    // Fetch Users info (optional, skip if error)
    const employeesRes = await fetch(resolveBackendUrl(EMPLOYEE_DASHBOARD_PATH), {
      headers,
      cache: "no-store",
    });

    const overview = overviewRes.ok ? await overviewRes.json() : {};
    const history = historyRes.ok ? await historyRes.json() : [];
    
    let employeesCount = 0;
    if (employeesRes.ok) {
        const d = await employeesRes.json();
        // Employee dashboard usually returns list or stats
        if (Array.isArray(d)) {
            employeesCount = d.length;
        } else if (d?.total) {
            employeesCount = d.total;
        }
    }

    return NextResponse.json({
        overview: {
            tong_san_pham: overview.tong_san_pham || 0,
            tong_ton_kho: overview.tong_ton_kho || 0,
            het_hang: overview.het_hang || 0,
            sap_het_hang: overview.sap_het_hang || 0,
        },
        activities: history,
        employees_count: employeesCount
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { message: "Không thể lấy dữ liệu dashboard." },
      { status: 500 }
    );
  }
}
