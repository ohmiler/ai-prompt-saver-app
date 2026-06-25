"use client";

import { useState } from "react";
import { deletePromptAction } from "@/app/actions/prompts";
import { PromptForm } from "@/app/ui/prompt-form";

type Prompt = {
  id: string;
  title: string;
  content: string;
  category: string;
};

type PromptListProps = {
  prompts: Prompt[];
};

export function PromptList({ prompts }: PromptListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (prompts.length === 0) {
    return (
      <div className="empty-state">
        <h2>No prompts found</h2>
        <p>Create a prompt or adjust your search and category filter.</p>
      </div>
    );
  }

  return (
    <div className="prompt-list">
      {prompts.map((prompt) => {
        const editing = editingId === prompt.id;

        return (
          <article className="prompt-card" key={prompt.id}>
            {editing ? (
              <PromptForm prompt={prompt} onDone={() => setEditingId(null)} />
            ) : (
              <>
                <div className="prompt-card-header">
                  <div>
                    <p className="category-label">{prompt.category}</p>
                    <h2>{prompt.title}</h2>
                  </div>
                  <div className="prompt-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setEditingId(prompt.id)}
                    >
                      Edit
                    </button>
                    <form
                      action={deletePromptAction}
                      onSubmit={(event) => {
                        if (!confirm("Delete this prompt?")) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="promptId" value={prompt.id} />
                      <button type="submit" className="danger-button">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
                <p className="prompt-content">{prompt.content}</p>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
