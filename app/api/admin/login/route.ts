import { NextRequest, NextResponse } from "next/server";
import { passwordIsValid, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body?.password === "string" ? body.password : "";
  if (!passwordIsValid(password)) {
    return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieOptions());
  return response;
}