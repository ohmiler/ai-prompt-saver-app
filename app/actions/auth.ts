"use server";

import { redirect } from "next/navigation";
import { clearSession, createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  isPrismaInitializationError,
  isPrismaUniqueConstraintError,
} from "@/lib/prisma-errors";
import { validateLoginInput, validateRegisterInput } from "@/lib/validation";

export type AuthActionState = {
  message: string;
};

const databaseErrorMessage =
  "Could not connect to the database. Please try again later.";

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

  let user;

  try {
    user = await prisma.user.create({
      data: {
        email: input.value.email,
        passwordHash: await hashPassword(input.value.password),
      },
    });

    await createSession(user.id);
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return { message: "An account with this email already exists." };
    }

    if (isPrismaInitializationError(error)) {
      return { message: databaseErrorMessage };
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

  try {
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
  } catch (error) {
    if (isPrismaInitializationError(error)) {
      return { message: databaseErrorMessage };
    }

    return { message: "Could not log in. Please try again." };
  }

  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
