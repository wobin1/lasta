"use client";

import { useActionState } from "react";
import {
  assignTask,
  claimTask,
  completeTask,
  startTask,
  type FormState,
} from "@/app/actions/production";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";

const initial: FormState = {};

function isNextControlFlow(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = String((error as { digest: unknown }).digest ?? "");
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND");
}

function shopFloorActionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("unexpected response") || message.includes("was not found on the server")) {
    return "Could not update that stage. Refresh the page and try again.";
  }
  if (message) return message;
  return "Could not update that stage. Refresh the page and try again.";
}

function safeAction(action: (prev: FormState, formData: FormData) => Promise<FormState>) {
  return async (prev: FormState, formData: FormData): Promise<FormState> => {
    try {
      return await action(prev, formData);
    } catch (error) {
      if (isNextControlFlow(error)) throw error;
      return { error: shopFloorActionError(error) };
    }
  };
}

const claimTaskSafe = safeAction(claimTask);
const startTaskSafe = safeAction(startTask);
const completeTaskSafe = safeAction(completeTask);
const assignTaskSafe = safeAction(assignTask);

function TaskIdField({ taskId }: { taskId: string }) {
  return <input type="hidden" name="taskId" value={taskId} />;
}

export function ClaimButton({ taskId }: { taskId: string }) {
  const [state, action] = useActionState(claimTaskSafe, initial);
  return (
    <form action={action}>
      <TaskIdField taskId={taskId} />
      {state.error ? <Alert>{state.error}</Alert> : null}
      <SubmitButton pendingLabel="Claiming…">Claim</SubmitButton>
    </form>
  );
}

export function StartButton({ taskId }: { taskId: string }) {
  const [state, action] = useActionState(startTaskSafe, initial);
  return (
    <form action={action}>
      <TaskIdField taskId={taskId} />
      {state.error ? <Alert>{state.error}</Alert> : null}
      <SubmitButton pendingLabel="Starting…">Start</SubmitButton>
    </form>
  );
}

export function CompleteButton({ taskId }: { taskId: string }) {
  const [state, action] = useActionState(completeTaskSafe, initial);
  return (
    <form action={action}>
      <TaskIdField taskId={taskId} />
      {state.error ? <Alert>{state.error}</Alert> : null}
      <SubmitButton pendingLabel="Saving…">Complete</SubmitButton>
    </form>
  );
}

export type AssignWorkerChoice = {
  id: string;
  name: string;
  allowed: boolean;
  reason?: string;
};

export function AssignTaskForm({
  taskId,
  workers,
  compact = false,
  inline = false,
}: {
  taskId: string;
  workers: AssignWorkerChoice[];
  compact?: boolean;
  inline?: boolean;
}) {
  const [state, action] = useActionState(assignTaskSafe, initial);
  if (workers.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No shop-floor workers are set up yet.</p>;
  }
  const eligible = workers.filter((worker) => worker.allowed);
  const ineligible = workers.filter((worker) => !worker.allowed);
  const options = [
    ...eligible.map((worker) => ({
      value: worker.id,
      label: worker.name,
      group: "Has this template",
    })),
    ...ineligible.map((worker) => ({
      value: worker.id,
      label: `${worker.name} — ${worker.reason}`,
      group: "Cannot take this template",
    })),
  ];
  const select = (
    <Select
      id={`worker-${taskId}`}
      name="workerId"
      required
      placeholder="Select worker"
      fullWidth={!inline}
      aria-describedby={compact || inline ? undefined : `worker-${taskId}-hint`}
      options={options}
    />
  );

  if (inline) {
    return (
      <form action={action} className="flex w-full min-w-0 flex-col gap-2 lg:w-auto">
        <TaskIdField taskId={taskId} />
        {state.error ? <Alert>{state.error}</Alert> : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor={`worker-${taskId}`} className="sr-only">
            Assign worker
          </label>
          {select}
          <SubmitButton pendingLabel="Assigning…">Assign</SubmitButton>
        </div>
      </form>
    );
  }

  return (
    <form action={action} className={compact ? "flex flex-col gap-2" : "flex flex-col gap-3 sm:flex-row sm:items-end"}>
      <TaskIdField taskId={taskId} />
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field
        label="Assign worker"
        htmlFor={`worker-${taskId}`}
        hint={compact ? undefined : "Everyone is listed. Assigning someone without this template is blocked."}
      >
        {select}
      </Field>
      <SubmitButton pendingLabel="Assigning…">Assign</SubmitButton>
    </form>
  );
}
