"use client";

import { useActionState } from "react";
import { createTemplate, updateTemplate, type FormState } from "@/app/actions/templates";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Field, inputClassName } from "@/components/ui/Field";
import { PRODUCTION_STAGES, productionStageLabel } from "@/lib/stages";
import type { ProductionStage } from "@prisma/client";

const initial: FormState = {};

export function TemplateForm({
  template,
  stagesLocked,
}: {
  template?: { id: string; name: string; stages: ProductionStage[] };
  stagesLocked?: boolean;
}) {
  const action = template ? updateTemplate.bind(null, template.id) : createTemplate;
  const [state, formAction] = useActionState(action, initial);
  const selected = new Set(template?.stages ?? PRODUCTION_STAGES);

  return (
    <form action={formAction} className="grid max-w-xl gap-5">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Name" htmlFor="name">
        <input
          id="name"
          name="name"
          required
          defaultValue={template?.name}
          className={inputClassName()}
        />
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Stages in shop order</legend>
        <p className="text-sm text-[var(--muted)]">
          {stagesLocked
            ? "This template is already on orders, so the stage list stays as it was. You can still rename it."
            : "Untick a stage to skip it for every product on this template."}
        </p>
        <ul className="space-y-2">
          {PRODUCTION_STAGES.map((stage) => (
            <li key={stage}>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  name="stages"
                  value={stage}
                  defaultChecked={selected.has(stage)}
                  disabled={stagesLocked}
                  className="h-5 w-5"
                />
                <span>{productionStageLabel[stage]}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <SubmitButton>{template ? "Save template" : "Create template"}</SubmitButton>
    </form>
  );
}
