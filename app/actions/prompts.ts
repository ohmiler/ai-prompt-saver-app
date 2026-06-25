"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validatePromptInput } from "@/lib/validation";

export type PromptActionState = {
  message: string;
};

export async function createPromptAction(
  _state: PromptActionState,
  formData: FormData,
): Promise<PromptActionState> {
  const user = await requireUser();
  const input = validatePromptInput({
    title: formData.get("title"),
    content: formData.get("content"),
    category: formData.get("category"),
  });

  if (!input.ok) {
    return { message: input.message };
  }

  await prisma.prompt.create({
    data: {
      ...input.value,
      userId: user.id,
    },
  });

  revalidatePath("/");
  return { message: "" };
}

export async function updatePromptAction(
  promptId: string,
  _state: PromptActionState,
  formData: FormData,
): Promise<PromptActionState> {
  const user = await requireUser();
  const input = validatePromptInput({
    title: formData.get("title"),
    content: formData.get("content"),
    category: formData.get("category"),
  });

  if (!input.ok) {
    return { message: input.message };
  }

  const result = await prisma.prompt.updateMany({
    where: {
      id: promptId,
      userId: user.id,
    },
    data: input.value,
  });

  if (result.count === 0) {
    return { message: "Prompt not found." };
  }

  revalidatePath("/");
  return { message: "" };
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
