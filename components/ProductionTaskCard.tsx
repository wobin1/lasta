import Link from "next/link";
import { AssignTaskForm, ClaimButton, CompleteButton, StartButton } from "@/components/TaskActions";
import { WasteDisclosure } from "@/components/WasteDisclosure";
import { WasteForm } from "@/components/WasteForm";
import { Chip } from "@/components/ui/Chip";
import { ButtonLink } from "@/components/ui/Button";
import { cardClassLg } from "@/components/ui/layout";
import { formatLagosDate, formatWait } from "@/lib/dates";
import { productionTaskLabel, productionTaskTone } from "@/lib/labels";
import { productionStageLabel } from "@/lib/stages";
import type { ProductionStage, ProductionTaskStatus } from "@prisma/client";

export type TaskCardData = {
  id: string;
  stage: ProductionStage;
  status: ProductionTaskStatus;
  qty: number;
  enteredAt: Date;
  workerId: string | null;
  workerName: string | null;
  templateId: string;
  templateName: string;
  orderId: string;
  orderPublicId: string;
  productName: string;
  size: string;
  requiredDate: Date;
  materials?: { id: string; name: string }[];
};

export function ProductionTaskCard({
  task,
  workers,
  showAssign,
  showClaim,
  showStart,
  showComplete,
  showWait,
  showWaste,
  inspectHref,
}: {
  task: TaskCardData;
  workers?: { id: string; name: string; allowed: boolean; reason?: string }[];
  showAssign?: boolean;
  showClaim?: boolean;
  showStart?: boolean;
  showComplete?: boolean;
  showWait?: boolean;
  showWaste?: boolean;
  inspectHref?: string | null;
}) {
  return (
    <article className={`${cardClassLg} space-y-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">{productionStageLabel[task.stage]}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            <Link
              className="rounded-lg outline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text)]"
              href={`/orders/${task.orderId}`}
            >
              {task.orderPublicId}
            </Link>
          </h2>
          <p className="mt-1 font-medium">
            {task.productName} · size {task.size}
          </p>
        </div>
        <Chip label={productionTaskLabel[task.status]} tone={productionTaskTone[task.status]} />
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[var(--muted)]">Pairs</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{task.qty}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Due</dt>
          <dd className="mt-0.5 font-medium">{formatLagosDate(task.requiredDate)}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Template</dt>
          <dd className="mt-0.5 font-medium">{task.templateName}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">{showWait ? "Waiting" : "Worker"}</dt>
          <dd className="mt-0.5 font-medium">
            {showWait ? formatWait(task.enteredAt) : task.workerName ?? "Unassigned"}
          </dd>
        </div>
      </dl>
      <div className="flex flex-col gap-3">
        {showAssign ? <AssignTaskForm taskId={task.id} workers={workers ?? []} /> : null}
        {showClaim ? <ClaimButton taskId={task.id} /> : null}
        {showStart ? <StartButton taskId={task.id} /> : null}
        {showComplete ? <CompleteButton taskId={task.id} /> : null}
        {inspectHref ? <ButtonLink href={inspectHref}>Inspect</ButtonLink> : null}
        {showWaste ? (
          <WasteDisclosure>
            <WasteForm
              compact
              items={task.materials ?? []}
              taskId={task.id}
              orderId={task.orderId}
              stage={task.stage}
            />
          </WasteDisclosure>
        ) : null}
      </div>
    </article>
  );
}
