"use client";

import { ProductionStage } from "@prisma/client";
import { useActionState, useMemo, useState } from "react";
import { recordQualityCheck, type FormState } from "@/app/actions/qc";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Field, inputClassName } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { QC_CHECKLISTS, checkpointForTask, qcCheckpointLabel } from "@/lib/qc-checklists";
import { productionStageLabel } from "@/lib/stages";

const initial: FormState = {};

export function QcForm({
  taskId,
  stage,
  stages,
}: {
  taskId: string;
  stage: ProductionStage;
  stages: { stage: ProductionStage; sortOrder: number }[];
}) {
  const checkpoint = checkpointForTask(stage, stages);
  const [state, action] = useActionState(recordQualityCheck.bind(null, taskId), initial);
  const items = checkpoint ? QC_CHECKLISTS[checkpoint] : [];
  const [answers, setAnswers] = useState<Record<string, "pass" | "fail">>({});
  const marked = items.filter((item) => answers[item.key]).length;
  const failCount = items.filter((item) => answers[item.key] === "fail").length;
  const anyFail = failCount > 0;
  const currentIndex = stages.find((row) => row.stage === stage)?.sortOrder ?? 0;
  const reworkOptions = useMemo(
    () =>
      stages
        .filter((row) => row.sortOrder <= currentIndex && row.stage !== "QC")
        .map((row) => ({ value: row.stage, label: productionStageLabel[row.stage] })),
    [stages, currentIndex],
  );
  const defaultRework =
    checkpoint === "FINAL"
      ? reworkOptions.find((row) => row.value === "FINISHING")?.value ?? reworkOptions.at(-1)?.value
      : stage;
  const progress = items.length === 0 ? 0 : Math.round((marked / items.length) * 100);

  if (!checkpoint) {
    return <p className="text-sm text-[var(--muted)]">This stage does not have a QC checklist.</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-6 p-6 sm:p-8">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Inspection points</h2>
          <p className="max-w-xl text-sm text-[var(--muted)]">
            Mark every {qcCheckpointLabel[checkpoint].toLowerCase()} point. Any fail sends the pair back
            for rework.
          </p>
        </div>
        <p className="text-sm tabular-nums text-[var(--muted)]">
          <span className="text-base font-semibold text-[var(--text)]">{marked}</span>
          <span> of {items.length}</span>
          {failCount > 0 ? (
            <span className="mt-1 block font-medium text-[var(--danger)]">
              {failCount} fail{failCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </p>
      </header>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--ground)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Checklist progress"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            anyFail ? "bg-[var(--danger)]" : "bg-[var(--text)]"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="space-y-3">
        {items.map((item, index) => {
          const name = `check-${item.key}`;
          const value = answers[item.key];
          const labelId = `qc-point-${item.key}`;
          return (
            <li key={item.key}>
              <div
                role="group"
                aria-labelledby={labelId}
                className="flex flex-col gap-3 rounded-[20px] bg-[var(--ground)] p-4 sm:flex-row sm:items-center sm:gap-6 sm:px-5 sm:py-4"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                      value === "pass"
                        ? "bg-[var(--tint-success)] text-[var(--success)]"
                        : value === "fail"
                          ? "bg-[var(--tint-danger)] text-[var(--danger)]"
                          : "bg-[var(--surface)] text-[var(--muted)] shadow-[var(--shadow)]"
                    }`}
                    aria-hidden
                  >
                    {value === "pass" ? (
                      <CheckGlyph />
                    ) : value === "fail" ? (
                      <FailGlyph />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>
                  <p id={labelId} className="text-base font-medium tracking-tight">
                    {item.label}
                  </p>
                </div>
                <div className="grid w-full grid-cols-2 gap-1 rounded-[16px] bg-[var(--surface)] p-1 sm:w-[15.5rem] sm:shrink-0">
                  <VerdictOption
                    name={name}
                    value="pass"
                    selected={value === "pass"}
                    onChange={() => setAnswers((current) => ({ ...current, [item.key]: "pass" }))}
                  >
                    Pass
                  </VerdictOption>
                  <VerdictOption
                    name={name}
                    value="fail"
                    selected={value === "fail"}
                    tone="fail"
                    onChange={() => setAnswers((current) => ({ ...current, [item.key]: "fail" }))}
                  >
                    Fail
                  </VerdictOption>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className={`space-y-4 ${anyFail ? "" : "opacity-70"}`}>
        <Field
          label="Rework stage"
          htmlFor="reworkStage"
          hint="Used only if you fail a point. The pair goes back to this stage."
        >
          <Select
            id="reworkStage"
            name="reworkStage"
            defaultValue={defaultRework}
            options={reworkOptions}
          />
        </Field>
        <Field label="Notes" htmlFor="qc-notes" hint="Optional. Add a note when you fail a point.">
          <textarea id="qc-notes" name="notes" rows={3} className={`${inputClassName()} py-3`} />
        </Field>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--muted)]">
          {marked < items.length
            ? `${items.length - marked} point${items.length - marked === 1 ? "" : "s"} still unmarked.`
            : anyFail
              ? "Saving will create rework from the failed points."
              : "All points passed. This stage can move on."}
        </p>
        <SubmitButton variant={anyFail ? "danger" : "primary"} pendingLabel="Saving…">
          {anyFail ? "Fail and create rework" : "Pass inspection"}
        </SubmitButton>
      </div>
    </form>
  );
}

function VerdictOption({
  name,
  value,
  selected,
  tone = "pass",
  onChange,
  children,
}: {
  name: string;
  value: "pass" | "fail";
  selected: boolean;
  tone?: "pass" | "fail";
  onChange: () => void;
  children: React.ReactNode;
}) {
  const selectedClass =
    tone === "fail"
      ? "bg-[var(--surface)] text-[var(--danger)] shadow-[var(--shadow)]"
      : "bg-[var(--surface)] text-[var(--success)] shadow-[var(--shadow)]";
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--text)] ${
                    selected ? selectedClass : "text-[var(--muted)] hover:bg-[var(--ground)] hover:text-[var(--text)]"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        required
        className="sr-only"
        onChange={onChange}
      />
      {tone === "fail" ? <FailGlyph /> : <CheckGlyph />}
      {children}
    </label>
  );
}

function CheckGlyph() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5 9.5 17 19 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FailGlyph() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
