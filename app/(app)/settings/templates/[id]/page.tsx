import { notFound } from "next/navigation";
import { TemplateForm } from "@/components/TemplateForm";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/Field";
import { SurfaceLg, pageClass, sectionTitleClass } from "@/components/ui/layout";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("templates.write");
  const { id } = await params;
  const template = await prisma.productionTemplate.findUnique({
    where: { id },
    include: {
      stages: { orderBy: { sortOrder: "asc" } },
      workers: { include: { user: true } },
      _count: { select: { jobs: true } },
    },
  });
  if (!template) notFound();

  return (
    <div className={pageClass}>
      <PageHeader
        title={template.name}
        description={
          template.workers.length
            ? `Workers: ${template.workers.map((row) => row.user.name).join(", ")}`
            : "No workers attached yet. Attach them on each staff record."
        }
        backHref="/settings/templates"
        backLabel="Back to templates"
      />
      <SurfaceLg>
        <div className="flex flex-wrap gap-2">
          {template.workers.length === 0 ? (
            <Chip label="No workers" tone="warning" />
          ) : (
            template.workers.map((row) => <Chip key={row.userId} label={row.user.name} />)
          )}
        </div>
        {template._count.jobs > 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Stages are locked because jobs already use this template.
          </p>
        ) : null}
        <h2 className={`mt-6 ${sectionTitleClass}`}>Edit template</h2>
        <div className="mt-6">
          <TemplateForm
            template={{
              id: template.id,
              name: template.name,
              stages: template.stages.map((row) => row.stage),
            }}
            stagesLocked={template._count.jobs > 0}
          />
        </div>
      </SurfaceLg>
    </div>
  );
}
