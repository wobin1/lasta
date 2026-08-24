import Link from "next/link";
import { TemplateForm } from "@/components/TemplateForm";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { tableLinkClass } from "@/components/ui/Table";
import { Surface, SurfaceLg, pageClass, sectionTitleClass } from "@/components/ui/layout";
import { productionStageLabel } from "@/lib/stages";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export default async function TemplatesPage() {
  await requirePermission("templates.write");
  const templates = await prisma.productionTemplate.findMany({
    include: {
      stages: { orderBy: { sortOrder: "asc" } },
      _count: { select: { workers: true, products: true, jobs: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className={pageClass}>
      <PageHeader
        title="Production templates"
        description="Named stage lists. Attach products and workers to a template. A worker can have more than one."
        backHref="/production"
        backLabel="Back to board"
      />
      {templates.length === 0 ? (
        <EmptyState
          title="No templates"
          body="Create Classic leather and Sandal so products can skip different stages."
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {templates.map((template) => (
            <li key={template.id}>
              <Surface>
                <Link href={`/settings/templates/${template.id}`} className={`${tableLinkClass} text-lg`}>
                  {template.name}
                </Link>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {template.stages.map((row) => productionStageLabel[row.stage]).join(" → ") || "No stages"}
                </p>
                <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-[var(--muted)]">Workers</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{template._count.workers}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted)]">Products</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{template._count.products}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted)]">Jobs</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{template._count.jobs}</dd>
                  </div>
                </dl>
              </Surface>
            </li>
          ))}
        </ul>
      )}
      <SurfaceLg>
        <h2 className={sectionTitleClass}>New template</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Tick the stages this style of shoe goes through.</p>
        <div className="mt-6">
          <TemplateForm />
        </div>
      </SurfaceLg>
    </div>
  );
}
