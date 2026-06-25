import type { Prisma } from "@prisma/client";
import { isPromptCategory } from "@/lib/categories";

export function buildPromptWhere(
  userId: string,
  query: string | undefined,
  category: string | undefined,
): Prisma.PromptWhereInput {
  const where: Prisma.PromptWhereInput = { userId };
  const trimmedQuery = query?.trim();

  if (trimmedQuery) {
    where.OR = [
      { title: { contains: trimmedQuery } },
      { content: { contains: trimmedQuery } },
    ];
  }

  if (isPromptCategory(category)) {
    where.category = category;
  }

  return where;
}
