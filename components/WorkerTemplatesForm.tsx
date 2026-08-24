"use client";

import { saveWorkerTemplates } from "@/app/actions/templates";
import { SubmitButton } from "@/components/ui/Button";

export function WorkerTemplatesForm({
  userId,
  templates,
  selectedIds,
}: {
  userId: string;
  templates: { id: string; name: string }[];
  selectedIds: string[];
}) {
  const selected = new Set(selectedIds);
  if (templates.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Create a production template first.</p>;
  }
  return (
    <form action={saveWorkerTemplates.bind(null, userId)} className="space-y-4">
      <ul className="space-y-2">
        {templates.map((template) => (
          <li key={template.id}>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                name="templateId"
                value={template.id}
                defaultChecked={selected.has(template.id)}
                className="h-5 w-5"
              />
              <span>{template.name}</span>
            </label>
          </li>
        ))}
      </ul>
      <SubmitButton>Save templates</SubmitButton>
    </form>
  );
}
