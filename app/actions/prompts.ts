"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validatePromptInput } from "@/lib/validation";

export type PromptActionState = {
  message: string;
  success: boolean;
  version: number;
};

function currentVersion(state: PromptActionState) {
  return Number.isFinite(state.version) ? state.version : 0;
}

export async function createPromptAction(
  state: PromptActionState,
  formData: FormData,
): Promise<PromptActionState> {
  const user = await requireUser();
  const version = currentVersion(state);
  const input = validatePromptInput({
    title: formData.get("title"),
    content: formData.get("content"),
    category: formData.get("category"),
  });

  if (!input.ok) {
    return { message: input.message, success: false, version };
  }

  await prisma.prompt.create({
    data: {
      ...input.value,
      userId: user.id,
    },
  });

  revalidatePath("/");
  return { message: "", success: true, version: version + 1 };
}

export async function updatePromptAction(
  promptId: string,
  state: PromptActionState,
  formData: FormData,
): Promise<PromptActionState> {
  const user = await requireUser();
  const version = currentVersion(state);
  const input = validatePromptInput({
    title: formData.get("title"),
    content: formData.get("content"),
    category: formData.get("category"),
  });

  if (!input.ok) {
    return { message: input.message, success: false, version };
  }

  const result = await prisma.prompt.updateMany({
    where: {
      id: promptId,
      userId: user.id,
    },
    data: input.value,
  });

  if (result.count === 0) {
    return {
      message: "Prompt not found.",
      success: false,
      version,
    };
  }

  revalidatePath("/");
  return { message: "", success: true, version: version + 1 };
}

export async function deletePromptAction(formData: FormData) {
  const user = await requireUser();
  const promptId = formData.get("promptId");

  if (typeof promptId !== "string" || !promptId) {
    return;
  }

  await prisma.prompt.deleteMany({
    where: {
      id: promptId,
      userId: user.id,
    },
  });

  revalidatePath("/");
}
