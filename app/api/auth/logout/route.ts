import { NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "auth_token";
const AUTH_ROLE_COOKIE_NAME = "auth_role";

export async function POST() {
  const response = NextResponse.json({ message: "Đăng xuất thành công." });

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set({
    name: AUTH_ROLE_COOKIE_NAME,
    value: "",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
