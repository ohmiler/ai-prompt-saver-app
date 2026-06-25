"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { clearSession, createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { validateLoginInput, validateRegisterInput } from "@/lib/validation";

export type AuthActionState = {
  message: string;
};

const initialError = { message: "" };

export async function registerAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const input = validateRegisterInput({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!input.ok) {
    return { message: input.message };
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: input.value.email,
        passwordHash: await hashPassword(input.value.password),
      },
    });

    await createSession(user.id);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { message: "An account with this email already exists." };
    }

    return { message: "Could not create account. Please try again." };
  }

  redirect("/");
}

export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const input = validateLoginInput({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!input.ok) {
    return { message: input.message };
  }

  const user = await prisma.user.findUnique({
    where: { email: input.value.email },
  });

  if (!user) {
    return { message: "Invalid email or password." };
  }

  const passwordValid = await verifyPassword(
    input.value.password,
    user.passwordHash,
  );

  if (!passwordValid) {
    return { message: "Invalid email or password." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export const emptyAuthState = initialError;
