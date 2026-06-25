import "server-only";

import { buildPromptWhere } from "@/lib/prompt-filters";
import { prisma } from "@/lib/db";

export async function getPromptsForUser(
  userId: string,
  query?: string,
  category?: string,
) {
  return prisma.prompt.findMany({
    where: buildPromptWhere(userId, query, category),
    orderBy: { updatedAt: "desc" },
  });
}
