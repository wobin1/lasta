# MVP Implementation Plan

Shoe manufacturing and business management system — first release.

Decisions: [MVP-DISCOVERY-QUESTIONS.md](./MVP-DISCOVERY-QUESTIONS.md)  
Requirements: [Shoe Manufacturing & Business Management System — Project Requirements & Business Workflow.md](../Shoe%20Manufacturing%20%26%20Business%20Management%20System%20%E2%80%94%20Project%20Requirements%20%26%20Business%20Workflow.md)  
Design: [docs/design/README.md](./design/README.md) and `.cursor/rules/design-ui.mdc` (ISO 9241, WCAG 2.2 AA, Finora-style dashboard)

This plan is the build sequence. It does not replace the requirements document.

---

## 1. Goal and non-goals

### Goal

Build the operational backbone for one workshop: **Customer → Order → Materials → Production → QC → Finishing → Delivery**, with money and audit attached to the order.

The central object is the **Order** (`ORD-YYYY-#####`). Everything else hangs off it.

After the full MVP, the owner can answer Section 39 questions from a computer or phone. After Increment 1, week-1 pilot only needs: where the order is, who is working on it, which are overdue, what is ready for delivery.

### In scope (Section 35)

Authentication and roles, customers, measurements, products/designs, orders, inventory, material requirements and reservation, production workflow, task assignment, finishing queue, quality control, delivery (riders + pickup), manual payments, basic dashboard, basic reports, audit logs.

### Out of scope

Advanced color wheel, AI design, public e-commerce, customer accounts/self-service, academy, forecasting, multiple branches/warehouses, advanced accounting, courier APIs, WhatsApp intake, payment gateways, native apps, offline-first, unit conversions, full supplier PO/receiving suite.

---

## 2. Constraints

| Constraint | Implication |
| --- | --- |
| Solo / small team, flexible time | One increment at a time. Each increment is demoable in the shop. |
| Next.js + Prisma + PostgreSQL | Single web app. No separate mobile codebase. |
| You deploy | Plan lists runtime needs. No locked host (Railway, VPS, etc.). |
| Workers have their own phones | Phone-first **My tasks** UI. Worker logs in as themselves. No shared-station “pick worker” flow. |
| Worker ↔ many templates | A production worker can be attached to **multiple production templates**. Their queue is the union of tasks from those templates. |
| ~20–50 orders/week | Simple Postgres queries are enough. No queue platform in MVP. |
| One location | No warehouse/location tables beyond a single default location. |
| Online only | If the network dies, the floor waits. Call this out in pilot. |

---

## 3. Architecture

```
Browser (shop PC, worker phone, or tablet)
        |
        v
Next.js (App Router) — UI + Route Handlers / Server Actions
        |
        +-- Prisma --> PostgreSQL
        |
        +-- local files or S3-compatible bucket (photos)
        |
        +-- transactional email (customer status; wire when you deploy)
```

- **Monolith:** one Next.js app, one database. No microservices.
- **Auth:** email + password (e.g. Auth.js / credentials). Owner or manager creates staff users. No public signup. No customer login.
- **Authorization:** role + permission checks on every mutation. UI hides actions the role cannot do.
- **Money:** integer **kobo** in the database, display as ₦.
- **Time:** store UTC, display `Africa/Lagos`.
- **Language:** English.
- **Audit:** append-only `AuditLog` on create/update/delete of orders, payments, inventory, production, QC, overrides.
- **Notifications:** in-app `Notification` rows for staff. Email to customer on selected status changes (configurable later; implement in Increment 5).
- **Photos:** store URL/path on measurement, product, QC. Adapter interface so local disk works in dev and object storage in prod.

Suggested layout:

```
app/
  (auth)/login
  (app)/                 # staff shell
    dashboard
    customers/
    products/
    orders/
    inventory/
    production/          # board + worker My tasks (phone)
    finishing/
    qc/
    delivery/
    reports/
    settings/users
prisma/
  schema.prisma
lib/
  auth.ts
  permissions.ts
  money.ts
  audit.ts
```

---

## 4. Users and permissions

### Roles in MVP

| Role | Typical device | Notes |
| --- | --- | --- |
| Owner | Shop PC | Full access. Spec Super Admin is this person. |
| Manager | Shop PC | Operations, override materials/payment blocks. |
| Sales | Shop PC | Customers, measurements, products, orders, payment recording. |
| Production manager | Shop PC / phone | Board, assign tasks to workers by template, start production. |
| Inventory | Shop PC | Stock, transactions, shortages, purchase requests. |
| QC officer | Phone / PC | QC checklists, fail → rework. |
| Production worker | **Own phone** | Logs in as themselves. Sees **My tasks** across all templates they belong to. Apprentices use this role. |
| Finishing worker | Own phone (or shop tablet) | Finishing queue; may also be a production worker with the finishing template. |
| Delivery staff | Own phone | Pickup vs rider dispatch. |

No customer role. No apprentice role.

### Permission matrix

| Action | Owner | Manager | Sales | Prod mgr | Inventory | QC | Worker | Finishing | Delivery |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Manage users / roles (create, deactivate) | Y | Y | | | | | | | |
| Customers create / edit | Y | Y | Y | | | | | | |
| Customers delete | Y | | | | | | | | |
| Measurements (new version only; never delete) | Y | Y | Y | | | | | | |
| Product categories create / edit / delete unused | Y | Y | | | | | | | |
| Products create / edit / archive | Y | Y | read | Y | read | | | | |
| Products delete (unused on orders) | Y | | | | | | | | |
| Create / edit orders | Y | Y | Y | | | | | | |
| Orders delete (draft or cancelled, no payments) | Y | | | | | | | | |
| Confirm order | Y | Y | Y | | | | | | |
| Record payment | Y | Y | Y | | | | | | |
| Override no-deposit / unpaid dispatch | Y | Y | | | | | | | |
| Override no-materials | Y | Y | | | | | | | |
| Inventory + transactions | Y | Y | | | Y | | | | |
| Purchase request | Y | Y | | | Y | | | | |
| Assign / start production | Y | Y | | Y | | | | | |
| Update own assigned task | Y | Y | | Y | | | Y | Y | |
| Claim unassigned task in own templates | Y | Y | | Y | | | Y | Y | |
| Finishing queue | Y | Y | | Y | | | | Y | |
| QC pass/fail | Y | Y | | | | Y | | | |
| Dispatch / deliver / pickup | Y | Y | | | | | | | Y |
| Dashboard / basic reports | Y | Y | limited | limited | limited | limited | own tasks (all templates) | own queue | own deliveries |
| Change shop settings | Y | | | | | | | | | |

Workers cannot change prices, financials, customer deletes, or inventory costs.

### Worker phones and multiple templates

Production workers log in on **their own phones** (responsive web, not a native app). The logged-in user is the worker on every start/complete. That satisfies “every production task must have an assigned worker.”

A worker is not tied to one station. Each worker is attached to **one or more production templates** (reusable stage sequences such as “Classic leather” and “Sandal”). Their home screen is **My tasks**: assigned work across all of those templates, grouped or filtered by stage.

- Production manager may assign a task only to a worker who has that job’s template.
- Worker may **claim** an unassigned task only if they have that template.
- Same person can stitch on one order and last on another if both templates/stages are on their profile.
- Optional PIN is not required for personal phones; keep password login. In-app notifications go to that user.

Shared shop tablets remain allowed (someone borrows a tablet and logs in as themselves). Do not build a station-anonymous session.

---

## 5. Domain model

Prisma models (names can match these). Order is the root.

### Identity

- `User` — email, password hash, name, role, active
- `Role` — enum is enough in MVP: `OWNER | MANAGER | SALES | PRODUCTION_MANAGER | INVENTORY | QC | PRODUCTION_WORKER | FINISHING_WORKER | DELIVERY`
- `ProductionTemplate` — named workflow (e.g. “Classic leather”, “Sandal”) with ordered stages. Products skip a stage by omitting it from the template copy, or by a per-product overlay.
- `WorkerTemplate` — join `User` ↔ `ProductionTemplate`. A worker may have **many** templates. Finishing workers typically have a template that includes `FINISHING`.

### Customer

- `Customer` — `CUS-YYYY-#####`, name, phone (unique), email, address, type, source (`WALK_IN | WEBSITE | REFERRAL | WHATSAPP | PHONE | SOCIAL | OTHER`), notes
- `Measurement` — versioned; never overwrite. Left/right: length, width, instep, heel, ankle, custom JSON, notes, photos[], `measuredByUserId`, dated

### Catalog

- `Product` — name, category, description, priceKobo, productionDays, status, images, `productionTemplateId`
- `ProductCategory` — shop-defined
- `ProductStageOverride` — optional: omit or extra stage for this product vs its template
- `BomLine` — product → material item, qty per pair, unit
- `Design` — optional saved config for an order (style, upper, lining, sole, thread, accessory). Simple fields, not a color wheel.

Default stage enum:

`PATTERN_DRAFTING | CUTTING | STITCHING | LASTING | FILLING | SOLE_ATTACHMENT | FINISHING | QC`

### Inventory (one location)

- `InventoryItem` — name, category, color, type, unit (`PAIR | PIECE | METRE | ML | OTHER`), qtyOnHand, qtyReserved, minStock, reorderLevel, costKobo, supplierName (string is enough), batch optional
- `InventoryTransaction` — type `PURCHASE | ISSUE | RETURN | ADJUSTMENT | DAMAGE | WASTE | STOCK_COUNT | RESERVE | UNRESERVE`, qty, unit, `orderId?`, `taskId?`, reason, `createdById`
- Never change `qtyOnHand` without a transaction.

Categories from the spec: leather, suede, fabric, lining, soles, insoles, thread, glue, laces, buckles, accessories, packaging, other.

### Procurement (thin)

- `PurchaseRequest` — lines of item + qty, status `DRAFT | SUBMITTED | APPROVED | RECEIVED | CANCELLED`, linked orders for shortage context
- Receiving: approve + `PURCHASE` transaction. No separate Purchase Order entity in MVP.

### Order

- `Order` — `ORD-YYYY-#####`, customer, source, status, requiredDate, notes, assignedSalesId, totals, `materialsOverride?`, `paymentOverride?`
- `OrderItem` — product, design?, size, measurementId?, qty, unitPriceKobo, material/color notes
- `OrderStatus` enum:

```
DRAFT → CONFIRMED → AWAITING_MATERIALS → READY_FOR_PRODUCTION
  → IN_PRODUCTION → QUALITY_CONTROL → FINISHING → READY_FOR_DELIVERY
  → DISPATCHED → DELIVERED → COMPLETED
```

Alternates: `CANCELLED | ON_HOLD | RETURNED | REWORK_REQUIRED`

Confirming an order: explode BOM × qty, compare on-hand − reserved, create `RESERVE` transactions, set `AWAITING_MATERIALS` or `READY_FOR_PRODUCTION`.

### Payment

- `Payment` — orderId, amountKobo, method `CASH | TRANSFER | POS`, date, reference, recordedById
- Derived: total, paid, deposit (first payment or explicit flag), balance
- No gateway.

### Production

- `ProductionJob` — **per order item**, snapshot of which `ProductionTemplate` was used
- `ProductionTask` — job, stage, `workerId` (required before start), qty, priority, due, status `ASSIGNED | STARTED | COMPLETED | BLOCKED`, times, notes
- Skipping: tasks are created only for stages on that job’s template (plus product overrides).
- Assignment rule: `workerId` must be a user who has `WorkerTemplate` for that job’s template.

### Finishing

Finishing is a stage **and** a queue view: tasks where `stage = FINISHING`, with wait-time = now − entered finishing.

Statuses in UI: Waiting → In progress → Completed → QC → Rework → Approved (map to task + QC records).

### Quality

- `QualityCheck` — orderItem, stage (`CUTTING | STITCHING | LASTING | FINAL`), result PASS/FAIL, checklist JSON, photos, inspectorId
- `Defect` — stage, reason, workerId, notes
- Fail ⇒ create `Rework` task (same or prior stage) and set order `REWORK_REQUIRED` until passed

Cutting QC checklist: pattern, size, material, color, qty, defects.  
Stitching: stitch quality, alignment, thread, loose stitches, design.  
Lasting: shape, alignment, wrinkles, tension, size.  
Final: appearance, color, size, sole, cleanliness, finishing, accessories, packaging.

### Waste

- `WasteRecord` — item, qty, reason (`CUTTING_ERROR | MATERIAL_DEFECT | BAD_MEASUREMENT | DAMAGED | PRODUCTION_MISTAKE | DESIGN_CHANGE | OTHER`), orderId?, stage?, linked transaction `WASTE`

Log at issue (variance vs BOM) and at stage complete.

### Delivery

- `Delivery` — order, type `PICKUP | RIDER`, address, phone, riderUserId?, feeKobo, times, status `READY | ASSIGNED | PICKED_UP | IN_TRANSIT | DELIVERED | CONFIRMED | FAILED`
- Failed delivery requires a reason.

### Cross-cutting

- `Notification` — userId, body, link, readAt
- `AuditLog` — actorId, entity, entityId, action, before JSON, after JSON, at

Do **not** add `TrainingCourse` / `TrainingLesson` in MVP.

---

## 6. Business rules (must be enforced in code)

From requirements Section 33, plus discovery:

1. Order cannot enter production if required materials are unavailable, unless **owner or manager** overrides (audited).
2. Order cannot be `COMPLETED` until final QC has passed.
3. Failed QC creates a rework task automatically.
4. Inventory quantity never changes without an `InventoryTransaction`.
5. Completed production records are immutable except owner/manager.
6. Measurements are versioned, never overwritten.
7. Order cannot be dispatched if balance > 0, unless **owner or manager** overrides (audited).
8. Every production task has an assigned worker before it can start (the phone user, or a manager assignment).
9. A worker may only be assigned or claim a task if they have that job’s **production template**.
10. Production may start with **no deposit** only with owner/manager override (audited). If a deposit exists, staff enter the amount; there is no fixed 50% rule.
11. Reserve on confirm; release reserve on cancel or when issued to production (`ISSUE` reduces on-hand and reserved).

---

## 7. Screens

Desktop = shop PC. Phone = worker’s own phone (small viewport). Same Next.js routes; layouts differ. Worker home after login is My tasks, not the manager board.

| Route | Purpose | Primary roles |
| --- | --- | --- |
| `/login` | Staff login | All |
| `/dashboard` | Today: order counts, overdue, finishing, QC, ready for delivery, alerts | Owner, manager |
| `/customers` `/customers/[id]` | Search, create, history (orders, measurements, payments) | Sales+ |
| `/customers/[id]/measurements` | New versioned measurement + photos | Sales |
| `/products` `/products/[id]` | Catalog, price, BOM, production template, images | Owner, manager |
| `/orders/new` | Capture: customer, items, measurement, dates, source | Sales |
| `/orders/[id]` | Status timeline, payments, materials, tasks, QC, delivery | Most (read scoped) |
| `/inventory` | On-hand, reserved, min/reorder | Inventory+ |
| `/inventory/transactions` | Ledger | Inventory+ |
| `/inventory/shortages` | Open orders vs stock | Inventory, prod mgr |
| `/production` | Board: counts per stage / template; click → list | Prod mgr, manager |
| `/production/me` | **My tasks** on the worker’s phone: all assigned work across their templates; filter by stage; start/complete | Production worker |
| `/production/available` | Unassigned tasks in the worker’s templates (claim) | Production worker |
| `/settings/templates` | Production templates (stage lists) and which workers have which templates | Owner, prod mgr |
| `/settings/users` | Create staff, set role, attach templates | Owner, manager |
| `/finishing` | Finishing queue, wait time, assign (workers with finishing template also see these in My tasks) | Finishing, prod mgr |
| `/qc` | Checklist for current item/stage | QC |
| `/delivery` | Ready / assign rider / mark pickup or delivered | Delivery |
| `/reports` | Basic: orders, overdue, revenue (paid), waste, defects | Owner, manager |

UI follows [docs/design/ui-reference.png](./design/ui-reference.png) and `.cursor/rules/design-ui.mdc`: gray canvas, white 24px-radius cards, icon sidebar, top profile bar. Same tokens on catalog and operations. Tables and queues stay inside cards so the task still fits ISO 9241-110.

---

## 8. Build increments

Calendar is flexible. Finish one increment, demo in the shop, then start the next. Do not start Increment 2 until Increment 1 is usable with real dummy orders.

### Increment 1 — Order desk

**Status:** Signed off (23 Aug 2026). Do not reopen unless the shop pilot finds a blocker.

**Ship:** auth, users/roles, customers, measurements, products (no BOM yet), orders + items, payment ledger, order status (manual: Draft → Confirmed → … through Ready for delivery as a **sales/manager status**, without production engine), dashboard widgets: open orders, overdue (by required date), ready for delivery.

**Week-1 pilot questions:** where the order is (status), overdue, ready for delivery. “Who is working on it” is N/A until Increment 3; show assigned sales until then.

**Done when:** sales can register a customer, save a measurement, create a mixed-item order, record a payment, and the owner sees the order on the dashboard.

### Increment 2 — Materials

**Status:** Signed off (23 Aug 2026). Do not reopen unless the shop pilot finds a blocker.

**Ship:** inventory items, transactions, BOM, confirm-order reserve, shortage list, purchase request, low-stock on dashboard, materials override.

**Done when:** confirming 10 pairs of a loafer reserves leather/soles; shortage blocks production-ready status unless manager overrides.

### Increment 3 — Production and finishing

**Status:** Signed off (23 Aug 2026). Do not reopen unless the shop pilot finds a blocker.

**Ship:** named production templates with ordered stages (products may skip stages), `WorkerTemplate` (worker has many templates), production job/tasks, assignment only within a worker’s templates, production board, **My tasks + claim** on the worker’s phone, finishing queue with wait time. Order status driven by tasks, not typed by sales. In-app “new task assigned” for that user.

**Done when:** a worker with two templates sees both loafer-stitching and sandal-lasting tasks on their phone; they start/complete without a station pick-list; manager cannot assign a cutting task to a worker who lacks that template; finishing queue still works; owner sees who is on the order.

### Increment 4 — QC and waste

**Status:** Signed off (23 Aug 2026). Do not reopen unless the shop pilot finds a blocker. Do not start Increment 5 until asked.

**Ship:** cutting / stitching / lasting / final QC checklists, fail → rework, defects, waste at issue and at stage complete.

**Done when:** a lasting fail creates rework and appears on QC/defect report.

### Increment 5 — Delivery, reports, email, hardening

**Status:** In progress (23 Aug 2026).

**Ship:** dispatch, rider vs pickup, delivery statuses + failed reason, payment block on dispatch + override, basic reports (sales, production time, waste %, defects by stage), customer email on key statuses, audit completeness, backups documented, role QA pass.

**Done when:** unpaid order cannot dispatch without override; pickup and rider paths both work; owner reports match Section 39 that depend on this data.

---

## 9. Core flows

### New order (sales)

1. Find or create customer.  
2. Select or create measurement version.  
3. Add line items (product, size, qty, notes).  
4. Set required date, source, notes.  
5. Save `DRAFT`. Record deposit payment if taken.  
6. Confirm → Increment 2+ runs BOM + reserve.

### Production (after Increment 3)

1. Production manager opens board, assigns a worker who has that job’s template (or leaves it unassigned for claim).  
2. Worker opens **My tasks** on their phone, starts and completes. Unassigned work in their templates appears under Available.  
3. QC at cutting/stitching/lasting as configured.  
4. Finishing (queue and/or My tasks if the worker has the finishing template); finishing QC; final QC.  
5. Pass → `READY_FOR_DELIVERY`.

### Delivery

1. If balance > 0, block unless override.  
2. Pickup: customer collects, mark delivered + confirmed.  
3. Rider: assign, picked up, in transit, delivered, confirmed (or failed + reason).

---

## 10. Data, files, deploy-yourself checklist

You deploy. The app should boot from environment variables only.

**Required**

- Node.js LTS  
- PostgreSQL 15+  
- `DATABASE_URL`  
- `AUTH_SECRET`  
- `APP_URL`  
- `TZ` display: `Africa/Lagos`

**When you add them**

- File storage credentials (or local `./uploads` in dev)  
- SMTP / email provider for customer status  
- Automated `pg_dump` (daily) kept off the app machine  

**Ops notes**

- Run `prisma migrate deploy` on release.  
- Back up Postgres before every migrate.  
- Seed: owner user, at least two production templates, sample workers attached to one vs both templates, sample product + BOM.  
- Expect ~20–50 orders/week; keep indexes on `Order.status`, `Order.requiredDate`, `Customer.phone`, `ProductionTask.stage + status`, `ProductionTask.workerId`.

---

## 11. Pilot

- Run the app **beside notebooks for 2–4 weeks**. Do not delete paper on day one.  
- Enter every real order in both places for the first week of each increment that is live.  
- Champion: owner or manager plus one sales user (name later).  
- Compare: missed orders, wrong status, inventory drift, time to find an order.

**Week 1 of first pilot (Increment 1):** order location, overdue, ready for delivery.

**End of MVP:** Section 39 set — counts, delays, worker, materials, waste, defects, outstanding money, repeat customer history.

---

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Full Section 35 is large for a solo builder | Strict increments. Shop uses Increment 1 before 2 is built. |
| Personal phones, forgotten login | Keep login simple; manager can reassign in-app. |
| Worker has the wrong templates | Assignment blocked unless `WorkerTemplate` matches the job. Review templates in settings. |
| Phone data / small screens | My tasks is phone-first: large tap targets, one task at a time. |
| Network drops on the floor | Online-only; keep notebooks in pilot. Do not fake offline. |
| Opening stock is wrong | Physical count before Increment 2 go-live. |
| Staff skip QC | Cannot complete order without final pass. |
| Status typed by hand fights the board | After Increment 3, status is derived from tasks/QC/delivery. |

---

## 13. Explicit later (do not build now)

WhatsApp intake or alerts, Paystack/Flutterwave, SMS, customer portal, public catalog / online checkout, academy, multi-location, unit conversions, courier integrations, native apps, offline sync, advanced color wheel, AI design, full accounting, machine management.

---

## 14. Suggested first build ticket (when you start code)

Not part of this docs task. When implementation starts:

1. Next.js + Prisma + Postgres scaffold  
2. Auth + Owner user  
3. Customer + Measurement + Product + Order + Payment  
4. Dashboard: open / overdue / ready for delivery  

That is Increment 1.
