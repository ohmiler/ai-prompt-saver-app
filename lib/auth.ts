import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSessionToken, hashSessionToken } from "@/lib/session-token";

export { createSessionToken } from "@/lib/session-token";

const SESSION_DAYS = 30;
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "prompt_saver_session";

export type CurrentUser = {
  id: string;
  email: string;
};

function sessionExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  return expiresAt;
}

// Mutates cookies; call only from Server Actions or Route Handlers.
export async function createSession(userId: string) {
  const token = createSessionToken();
  const tokenDigest = hashSessionToken(token);
  const expiresAt = sessionExpiry();

  await prisma.session.create({
    data: {
      token: tokenDigest,
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenDigest = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { token: tokenDigest },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await prisma.session.deleteMany({ where: { id: session.id } });
    }
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

// Mutates cookies; call only from Server Actions or Route Handlers.
export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: { token: hashSessionToken(token) },
    });
  }

  cookieStore.delete(COOKIE_NAME);
}
