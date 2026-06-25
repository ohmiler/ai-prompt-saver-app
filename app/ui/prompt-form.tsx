"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createPromptAction,
  type PromptActionState,
  updatePromptAction,
} from "@/app/actions/prompts";
import { PROMPT_CATEGORIES, type PromptCategory } from "@/lib/categories";

type PromptFormProps = {
  prompt?: {
    id: string;
    title: string;
    content: string;
    category: string;
  };
  onDone?: () => void;
};

const initialState: PromptActionState = {
  message: "",
  success: false,
  version: 0,
};

export function PromptForm({ prompt, onDone }: PromptFormProps) {
  const action = prompt
    ? updatePromptAction.bind(null, prompt.id)
    : createPromptAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    if (prompt) {
      onDone?.();
      return;
    }

    formRef.current?.reset();
  }, [onDone, prompt, state.success, state.version]);

  return (
    <form
      action={formAction}
      aria-label={prompt ? "Edit prompt" : "Add prompt"}
      className="prompt-form"
      ref={formRef}
    >
      <div className="form-heading">
        <h2>{prompt ? "Edit prompt" : "Add prompt"}</h2>
        {prompt ? (
          <button type="button" onClick={onDone} className="ghost-button">
            Cancel
          </button>
        ) : null}
      </div>
      <label>
        Title
        <input name="title" required defaultValue={prompt?.title ?? ""} />
      </label>
      <label>
        Category
        <select
          name="category"
          required
          defaultValue={(prompt?.category as PromptCategory) ?? "Coding"}
        >
          {PROMPT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label>
        Prompt
        <textarea
          name="content"
          required
          rows={8}
          defaultValue={prompt?.content ?? ""}
        />
      </label>
      {state.message ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}
      <button type="submit" disabled={pending}>
        {pending ? "Saving..." : prompt ? "Save changes" : "Save prompt"}
      </button>
    </form>
  );
}
