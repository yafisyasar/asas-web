import crypto from "node:crypto";

export const SESSION_COOKIE = "asas_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function sign(message: string): string {
  return crypto.createHmac("sha256", secret()).update(message).digest("hex");
}

export function passwordIsValid(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || !input) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createSessionToken(): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const random = crypto.randomBytes(24).toString("base64url");
  const sig = sign(`${expires}.${random}`);
  return `${expires}.${random}.${sig}`;
}

export function verifySessionToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const [expiresMs, random, sig] = token.split(".");
  if (!expiresMs || !random || !sig) return false;
  const expires = Number(expiresMs);
  if (Number.isNaN(expires) || expires < Date.now()) return false;
  const expected = sign(`${expiresMs}.${random}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    value: createSessionToken(),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + SESSION_TTL_MS),
  };
}

export function clearSessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  };
}