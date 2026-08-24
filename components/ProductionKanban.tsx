"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AssignTaskForm, type AssignWorkerChoice } from "@/components/TaskActions";
import { ButtonLink } from "@/components/ui/Button";
import { inputClassName } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { formatLagosDate, formatWait, startOfTodayLagos } from "@/lib/dates";
import { productionTaskLabel } from "@/lib/labels";
import { PRODUCTION_STAGES, productionStageBar, productionStageLabel } from "@/lib/stages";
import type { ProductionStage, ProductionTaskStatus } from "@prisma/client";

export type KanbanTask = {
  id: string;
  stage: ProductionStage;
  status: ProductionTaskStatus;
  qty: number;
  enteredAt: string;
  workerId: string | null;
  workerName: string | null;
  templateId: string;
  templateName: string;
  orderId: string;
  orderPublicId: string;
  productName: string;
  size: string;
  requiredDate: string;
  workers: AssignWorkerChoice[];
  inspectHref?: string | null;
};

type Layout = "board" | "list";

const pillClass =
  "inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--ground)] px-3 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)]";
const toolClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)]";

export function ProductionKanban({
  tasks,
  showFinishing,
  showTemplates,
  showQc,
}: {
  tasks: KanbanTask[];
  showFinishing?: boolean;
  showTemplates?: boolean;
  showQc?: boolean;
}) {
  const [layout, setLayout] = useState<Layout>("board");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [assignee, setAssignee] = useState("all");

  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    for (const task of tasks) {
      if (task.workerId && task.workerName) map.set(task.workerId, task.workerName);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [tasks]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (assignee === "unassigned" && task.workerId) return false;
      if (assignee !== "all" && assignee !== "unassigned" && task.workerId !== assignee) return false;
      if (!needle) return true;
      const hay = `${task.orderPublicId} ${task.productName} ${task.templateName} ${task.workerName ?? ""} ${task.size}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [tasks, query, assignee]);

  const grouped = useMemo(() => {
    const byStage = new Map<ProductionStage, KanbanTask[]>();
    for (const stage of PRODUCTION_STAGES) byStage.set(stage, []);
    for (const task of filtered) {
      byStage.get(task.stage)?.push(task);
    }
    return byStage;
  }, [filtered]);

  const noMatch = tasks.length > 0 && filtered.length === 0;
  const showSearch = searchOpen || query.length > 0;

  return (
    <div className="space-y-5">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Production board</h1>
          <InfoCard />
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div role="group" aria-label="Board layout" className="flex flex-wrap items-center gap-1">
            <LayoutTab
              selected={layout === "board"}
              onSelect={() => setLayout("board")}
              icon={<BoardIcon />}
            >
              Board
            </LayoutTab>
            <LayoutTab
              selected={layout === "list"}
              onSelect={() => setLayout("list")}
              icon={<ListIcon />}
            >
              List
            </LayoutTab>
            {showFinishing ? (
              <Link
                href="/finishing"
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)]"
              >
                <FinishingIcon />
                Finishing
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="board-assignee" className="shrink-0 text-sm font-medium">
                Worker
              </label>
              <div className="w-[14rem]">
                <Select
                  id="board-assignee"
                  value={assignee}
                  onChange={setAssignee}
                  options={[
                    { value: "all", label: "All" },
                    { value: "unassigned", label: "Unassigned" },
                    ...assignees.map(([id, name]) => ({ value: id, label: name })),
                  ]}
                />
              </div>
            </div>
            <button
              type="button"
              className={toolClass}
              aria-expanded={showSearch}
              aria-controls="board-search"
              onClick={() => setSearchOpen((open) => !open)}
            >
              <SearchIcon />
              Search
            </button>
            {showTemplates ? <ButtonLink href="/settings/templates">Templates</ButtonLink> : null}
            {showQc ? <ButtonLink href="/qc">QC</ButtonLink> : null}
          </div>
        </div>

        {showSearch ? (
          <div className="max-w-xl">
            <label htmlFor="board-search" className="sr-only">
              Find work
            </label>
            <input
              id="board-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Order, product, or worker"
              className={inputClassName()}
              autoFocus={searchOpen}
            />
          </div>
        ) : null}
      </header>

      {tasks.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          Confirm an order with a product template to fill these columns.
        </p>
      ) : null}
      {noMatch ? (
        <p className="text-sm text-[var(--muted)]" role="status">
          No open work matches that search.
        </p>
      ) : null}

      {layout === "list" ? (
        <ListView tasks={filtered} />
      ) : (
        <BoardTrack>
          {PRODUCTION_STAGES.map((stage) => {
            const columnTasks = grouped.get(stage) ?? [];
            return (
              <section
                key={stage}
                aria-labelledby={`col-${stage}`}
                className="flex w-[18.5rem] shrink-0 snap-start flex-col rounded-[24px] bg-[var(--surface)] shadow-[var(--shadow)]"
              >
                <header className="flex items-start gap-3 px-4 pt-4 pb-3">
                  <span className={`mt-1 h-8 w-1 shrink-0 rounded-full ${productionStageBar[stage]}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <h2 id={`col-${stage}`} className="text-base font-semibold tracking-tight">
                      {productionStageLabel[stage]}
                    </h2>
                    <p className="text-sm text-[var(--muted)]">
                      {columnTasks.length === 1 ? "1 task" : `${columnTasks.length} tasks`}
                    </p>
                  </div>
                </header>
                <ul className="flex max-h-[min(70vh,44rem)] flex-col gap-3 overflow-y-auto px-3 pb-3">
                  {columnTasks.length === 0 ? (
                    <li className="rounded-[20px] bg-[var(--ground)] px-4 py-10 text-center text-sm text-[var(--muted)]">
                      No work in this stage
                    </li>
                  ) : (
                    columnTasks.map((task) => (
                      <li key={task.id}>
                        <KanbanCard task={task} />
                      </li>
                    ))
                  )}
                </ul>
              </section>
            );
          })}
        </BoardTrack>
      )}
    </div>
  );
}

function InfoCard() {
  const titleId = useId();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={pillClass}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <InfoIcon />
        Info
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={titleId}
          className="absolute left-0 top-[calc(100%+10px)] z-50 w-[min(22rem,calc(100vw-2.5rem))] rounded-[24px] bg-[var(--surface)] p-6 shadow-[var(--shadow)]"
        >
          <h2 id={titleId} className="text-base font-semibold tracking-tight">
            How this board works
          </h2>
          <ul className="mt-3 space-y-2.5 text-sm text-[var(--muted)]">
            <li>Each column is a production stage. Work only shows here when that stage is open.</li>
            <li>Staff start and complete from My tasks. Cutting, stitching, lasting, and final QC wait for an inspector before the next stage opens.</li>
            <li>You can assign only to people who already have that product’s template.</li>
            <li>Orders short on materials stay on Awaiting materials until stock is in.</li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function BoardTrack({ children }: { children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  function sync() {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const overflowing = max > 4;
    setCanLeft(overflowing && el.scrollLeft > 4);
    setCanRight(overflowing && el.scrollLeft < max - 4);
  }

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", sync);
      observer.disconnect();
    };
  }, [children]);

  function move(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const column = el.querySelector("section");
    const gap = 16;
    const step = column ? column.getBoundingClientRect().width + gap : Math.round(el.clientWidth * 0.75);
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  const overflow = canLeft || canRight;

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="-mx-1 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:thin]"
      >
        <div className="flex min-w-min snap-x snap-mandatory gap-4 px-1">{children}</div>
      </div>
      {overflow ? (
        <>
          <BoardArrow direction="left" disabled={!canLeft} onClick={() => move(-1)} />
          <BoardArrow direction="right" disabled={!canRight} onClick={() => move(1)} />
        </>
      ) : null}
    </div>
  );
}

function BoardArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const left = direction === "left";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={left ? "Show previous stages" : "Show next stages"}
      className={`absolute top-8 z-10 flex h-11 w-11 items-center justify-center rounded-full shadow-[var(--shadow)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40 ${
        left ? "left-0 sm:left-1" : "right-0 sm:right-1"
      } ${
        disabled
          ? "bg-[var(--surface)] text-[var(--muted)]"
          : "bg-[var(--text)] text-white hover:bg-[var(--text-hover)]"
      }`}
    >
      <BoardChevron left={left} />
    </button>
  );
}

function BoardChevron({ left }: { left: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={left ? "M14.5 6.5 9 12l5.5 5.5" : "M9.5 6.5 15 12l-5.5 5.5"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ListView({ tasks }: { tasks: KanbanTask[] }) {
  const sections = PRODUCTION_STAGES.map((stage) => ({
    stage,
    tasks: tasks.filter((task) => task.stage === stage),
  })).filter((section) => section.tasks.length > 0);

  if (tasks.length === 0) {
    return (
      <div className="rounded-[24px] bg-[var(--surface)] px-6 py-12 text-center shadow-[var(--shadow)]">
        <p className="font-semibold tracking-tight">No work in this list</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
          Try another worker, or clear search.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <section key={section.stage} aria-labelledby={`list-${section.stage}`}>
          <div className="mb-3 flex items-center gap-3">
            <span className={`h-6 w-1 rounded-full ${productionStageBar[section.stage]}`} aria-hidden />
            <h2 id={`list-${section.stage}`} className="text-lg font-semibold tracking-tight">
              {productionStageLabel[section.stage]}
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {section.tasks.length === 1 ? "1 task" : `${section.tasks.length} tasks`}
            </p>
          </div>
          <ul className="overflow-hidden rounded-[24px] bg-[var(--surface)] shadow-[var(--shadow)]">
            {section.tasks.map((task, index) => (
              <li
                key={task.id}
                className={index > 0 ? "border-t border-[var(--line)]" : undefined}
              >
                <ListRow task={task} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ListRow({ task }: { task: KanbanTask }) {
  const overdue = new Date(task.requiredDate) < startOfTodayLagos();
  const awaitingQc = task.status === "AWAITING_QC" || task.stage === "QC";
  const canAssign = task.status === "ASSIGNED" && !awaitingQc;
  const showWait = task.stage === "FINISHING" && task.status !== "BLOCKED";
  const statusText =
    task.status === "ASSIGNED" && !task.workerId ? "Unassigned" : productionTaskLabel[task.status];

  return (
    <article className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:gap-8">
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold tracking-tight">
          <Link className="underline-offset-2 hover:underline" href={`/orders/${task.orderId}`}>
            {task.orderPublicId}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {task.productName} · size {task.size} · {task.qty} pair{task.qty === 1 ? "" : "s"}
          {" · "}
          {task.templateName}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm lg:shrink-0">
        <div>
          <p className="text-[var(--muted)]">Due</p>
          <p className={`mt-0.5 font-medium ${overdue ? "text-[var(--warning)]" : ""}`}>
            {overdue ? `Overdue · ${formatLagosDate(task.requiredDate)}` : formatLagosDate(task.requiredDate)}
          </p>
        </div>
        <div>
          <p className="text-[var(--muted)]">Status</p>
          <p className="mt-0.5 font-medium">{statusText}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ground)] text-xs font-semibold"
            aria-hidden
          >
            {task.workerName ? initials(task.workerName) : "—"}
          </span>
          <div>
            <p className="text-[var(--muted)]">Worker</p>
            <p className="font-medium">{task.workerName ?? "None yet"}</p>
            {showWait ? (
              <p className="text-[var(--muted)]">Waiting {formatWait(new Date(task.enteredAt))}</p>
            ) : null}
          </div>
        </div>
      </div>

      {canAssign ? (
        <div className="lg:ml-auto lg:shrink-0">
          <AssignTaskForm taskId={task.id} workers={task.workers} inline />
        </div>
      ) : null}
      {task.inspectHref ? (
        <div className="lg:ml-auto lg:shrink-0">
          <ButtonLink href={task.inspectHref}>Inspect</ButtonLink>
        </div>
      ) : null}
    </article>
  );
}

function LayoutTab({
  selected,
  onSelect,
  icon,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)] ${
        selected
          ? "bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow)]"
          : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
      }`}
      onClick={onSelect}
    >
      {icon}
      {children}
    </button>
  );
}

function KanbanCard({ task }: { task: KanbanTask }) {
  const overdue = new Date(task.requiredDate) < startOfTodayLagos();
  const awaitingQc = task.status === "AWAITING_QC" || task.stage === "QC";
  const canAssign = task.status === "ASSIGNED" && !awaitingQc;
  const showWait = task.stage === "FINISHING" && task.status !== "BLOCKED";
  const statusText =
    task.status === "ASSIGNED" && !task.workerId ? "Unassigned" : productionTaskLabel[task.status];

  return (
    <article className="space-y-4 rounded-[20px] bg-[var(--ground)] p-4">
      <div>
        <h3 className="text-base font-semibold tracking-tight">
          <Link className="underline-offset-2 hover:underline" href={`/orders/${task.orderId}`}>
            {task.orderPublicId}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {task.productName} · size {task.size} · {task.qty} pair{task.qty === 1 ? "" : "s"}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[var(--muted)]">Due</dt>
          <dd className={`mt-0.5 font-medium ${overdue ? "text-[var(--warning)]" : ""}`}>
            {overdue ? `Overdue · ${formatLagosDate(task.requiredDate)}` : formatLagosDate(task.requiredDate)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Status</dt>
          <dd className="mt-0.5 font-medium">{statusText}</dd>
        </div>
      </dl>

      <div className="flex items-center gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)] text-xs font-semibold shadow-[var(--shadow)]"
          aria-hidden
        >
          {task.workerName ? initials(task.workerName) : "—"}
        </span>
        <p className="min-w-0 text-sm">
          <span className="font-medium">{task.workerName ?? "None yet"}</span>
          {showWait ? (
            <span className="block text-[var(--muted)]">Waiting {formatWait(new Date(task.enteredAt))}</span>
          ) : (
            <span className="block text-[var(--muted)]">{task.templateName}</span>
          )}
        </p>
      </div>

      {canAssign ? <AssignTaskForm taskId={task.id} workers={task.workers} compact /> : null}
      {task.inspectHref ? <ButtonLink href={task.inspectHref}>Inspect</ButtonLink> : null}
    </article>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function InfoIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5M12 8v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="5" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="9.5" y="5" width="5" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="15.5" y="5" width="5" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 7h12M8 12h12M8 17h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="4.5" cy="7" r="1.2" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="4.5" cy="17" r="1.2" fill="currentColor" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FinishingIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4 13.8 9.2 19 11 13.8 12.8 12 18 10.2 12.8 5 11 10.2 9.2 12 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
