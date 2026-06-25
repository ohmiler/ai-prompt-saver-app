export const PROMPT_CATEGORIES = [
  "Coding",
  "Marketing",
  "Writing",
  "Research",
] as const;

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

export function isPromptCategory(value: unknown): value is PromptCategory {
  return (
    typeof value === "string" &&
    PROMPT_CATEGORIES.includes(value as PromptCategory)
  );
}
