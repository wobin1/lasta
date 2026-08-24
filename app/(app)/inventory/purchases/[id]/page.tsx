import Link from "next/link";
import { notFound } from "next/navigation";
import {
  approvePurchaseRequest,
  cancelPurchaseRequest,
  receivePurchaseRequest,
  submitPurchaseRequest,
} from "@/app/actions/purchases";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/Field";
import { TableCard, tableClass, tableLinkClass, tdClass, thClass, trClass } from "@/components/ui/Table";
import { Surface, SurfaceLg, pageClass, sectionTitleClass } from "@/components/ui/layout";
import { asQty } from "@/lib/inventory";
import { formatQty, purchaseStatusLabel, purchaseStatusTone } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("inventory.read");
  const { id } = await params;
  const request = await prisma.purchaseRequest.findUnique({
    where: { id },
    include: {
      createdBy: true,
      approvedBy: true,
      order: true,
      lines: { include: { inventoryItem: true } },
    },
  });
  if (!request) notFound();

  return (
    <div className={pageClass}>
      <PageHeader
        title={request.publicId}
        description={`Requested by ${request.createdBy.name}`}
        backHref="/inventory/purchases"
        backLabel="Back to purchases"
      />

      <SurfaceLg>
        <Chip label={purchaseStatusLabel[request.status]} tone={purchaseStatusTone[request.status]} />
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          {request.order ? (
            <div>
              <dt className="text-sm text-[var(--muted)]">Linked order</dt>
              <dd className="mt-1">
                <Link href={`/orders/${request.order.id}`} className={tableLinkClass}>
                  {request.order.publicId}
                </Link>
              </dd>
            </div>
          ) : (
            <div>
              <dt className="text-sm text-[var(--muted)]">Linked order</dt>
              <dd className="mt-1 text-[var(--muted)]">None</dd>
            </div>
          )}
          {request.approvedBy ? (
            <div>
              <dt className="text-sm text-[var(--muted)]">Approved by</dt>
              <dd className="mt-1 font-medium">{request.approvedBy.name}</dd>
            </div>
          ) : null}
        </dl>
        {request.notes ? <p className="mt-6 text-[var(--muted)]">{request.notes}</p> : null}
      </SurfaceLg>

      <TableCard title="Lines" count={request.lines.length} countLabel="materials">
        <table className={tableClass}>
          <caption className="sr-only">Purchase lines</caption>
          <thead>
            <tr>
              <th className={thClass}>Material</th>
              <th className={`${thClass} text-right`}>Qty</th>
            </tr>
          </thead>
          <tbody>
            {request.lines.map((line) => (
              <tr key={line.id} className={trClass}>
                <td className={tdClass}>
                  <Link href={`/inventory/${line.inventoryItemId}`} className={tableLinkClass}>
                    {line.inventoryItem.name}
                  </Link>
                </td>
                <td className={`${tdClass} text-right tabular-nums`}>
                  {formatQty(asQty(line.qty), line.inventoryItem.unit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      <Surface>
        <h2 className={sectionTitleClass}>Actions</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Submit, then owner or manager approves. Receiving raises on-hand stock.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {can(user.role, "purchases.write") && request.status === "DRAFT" ? (
            <form action={submitPurchaseRequest.bind(null, request.id)}>
              <Button type="submit">Submit</Button>
            </form>
          ) : null}
          {can(user.role, "materials.override") &&
          (request.status === "SUBMITTED" || request.status === "DRAFT") ? (
            <form action={approvePurchaseRequest.bind(null, request.id)}>
              <Button type="submit">Approve</Button>
            </form>
          ) : null}
          {can(user.role, "purchases.write") && request.status === "APPROVED" ? (
            <form action={receivePurchaseRequest.bind(null, request.id)}>
              <Button type="submit">Receive into stock</Button>
            </form>
          ) : null}
          {can(user.role, "purchases.write") &&
          request.status !== "RECEIVED" &&
          request.status !== "CANCELLED" ? (
            <ConfirmDelete
              action={cancelPurchaseRequest.bind(null, request.id)}
              title="Cancel this request?"
              label="Cancel request"
              message={`${request.publicId} will be cancelled. Nothing will be added to stock.`}
            />
          ) : null}
        </div>
      </Surface>
    </div>
  );
}
