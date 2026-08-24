import { notFound } from "next/navigation";
import { StaffActiveToggle } from "@/components/StaffActiveToggle";
import { StaffForm } from "@/components/StaffForm";
import { WorkerTemplatesForm } from "@/components/WorkerTemplatesForm";
import { ActionSheet } from "@/components/ui/Sheet";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/Field";
import { SurfaceLg, pageClass, sectionTitleClass } from "@/components/ui/layout";
import { roleLabel } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePermission("users.write");
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { workerTemplates: true },
  });
  if (!user) notFound();
  const templates = await prisma.productionTemplate.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const activeOwners = await prisma.user.count({
    where: { role: "OWNER", active: true },
  });

  let disabledReason: string | undefined;
  if (user.id === actor.id) disabledReason = "This is you";
  else if (user.role === "OWNER" && user.active && activeOwners < 2) {
    disabledReason = "Last owner";
  }

  return (
    <div className={pageClass}>
      <PageHeader
        title={user.name}
        description={user.email}
        backHref="/settings/users"
        backLabel="Back to staff"
        action={
          <ActionSheet triggerLabel="Edit staff" title="Edit staff" size="compact">
            <p className="mb-4 text-sm text-[var(--muted)]">Name, email, role, and password for this login.</p>
            <StaffForm user={user} />
          </ActionSheet>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Chip label={roleLabel[user.role]} />
        <Chip label={user.active ? "Active" : "Inactive"} tone={user.active ? "success" : "danger"} />
      </div>
      <SurfaceLg>
        <h2 className={sectionTitleClass}>Production templates</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          A worker sees and can be assigned work only for templates ticked here.
        </p>
        <div className="mt-6">
          <WorkerTemplatesForm
            userId={user.id}
            templates={templates}
            selectedIds={user.workerTemplates.map((row) => row.templateId)}
          />
        </div>
      </SurfaceLg>
      <SurfaceLg>
        <h2 className={sectionTitleClass}>Sign-in access</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Deactivate instead of deleting, so order history stays intact.
        </p>
        <div className="mt-6">
          <StaffActiveToggle
            userId={user.id}
            name={user.name}
            active={user.active}
            disabledReason={disabledReason}
          />
        </div>
      </SurfaceLg>
    </div>
  );
}
