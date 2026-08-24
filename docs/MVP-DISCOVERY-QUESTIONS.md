# MVP Discovery Q&A

Answered 23 August 2026. Product scope comes from [Shoe Manufacturing & Business Management System — Project Requirements & Business Workflow.md](../Shoe%20Manufacturing%20%26%20Business%20Management%20System%20%E2%80%94%20Project%20Requirements%20%26%20Business%20Workflow.md). These answers feed [MVP-IMPLEMENTATION-PLAN.md](./MVP-IMPLEMENTATION-PLAN.md).

This file is a decision record. It is not the implementation plan.

---

## Locked product decisions

| Topic | Decision |
| --- | --- |
| First release | Full Section 35 MVP |
| Product form | Internal web app + phone-friendly shop-floor screens |
| Floor devices | Production workers use **their own phones**. A worker may be assigned **multiple production templates** (not one station only). |
| Native mobile app | Not in MVP |
| Out of MVP | Advanced color wheel, AI design, full e-commerce, customer self-service, academy, forecasting, multi-branch, advanced accounting, courier APIs, WhatsApp order intake, payment gateways |

Section 35 MVP includes: authentication, user roles, customers, measurements, products/designs, orders, inventory, material requirements, production workflow, task assignment, finishing queue, quality control, delivery, payments, basic dashboard, basic reports, audit logs.

---

## A. Team, time, stack

**A1. Who is building this, and what timeline should the plan use?**  
Solo or small team. Timeline is flexible. Build in phases inside the full MVP.

**A2. Tech stack?**  
Next.js, Prisma, PostgreSQL.

**A3. Where should it be hosted?**  
You will deploy it yourself. The plan must not lock a specific host. It should list what the app, database, and file storage need.

**A4. Budget that would block paid services?**  
Do not block the plan on budget. Paid extras (SMS, specific cloud vendors) can be connected later.

---

## B. Payments and notifications

**B1. Payments and alerts in this MVP?**  
Staff record cash, bank transfer, and POS amounts by hand. Notifications are in-app only for staff. No Paystack/Flutterwave.

**B2. Deposit / production rule?**  
Production may start with no deposit if the owner or manager overrides.

**B3. Who may override “no materials” or “balance not paid”?**  
Owner and manager. Overrides are audited.

**B4. Customer status messages in MVP?**  
In-app (staff) or email (customer). No WhatsApp or SMS.

---

## C. How the shop works

**C1. Locations?**  
One workshop, one stock location.

**C2. Typical weekly volume?**  
About 20–50 orders.

**C3. Production stages?**  
Default path: Pattern drafting → Cutting → Stitching → Lasting → Filling → Sole attachment → Finishing → QC. Some products skip stages.

**C4. Mixed orders and split work?**  
One order may contain mixed products and sizes. One worker per stage per order item. Quantity on a stage is not split across workers in MVP.

**C5. Devices on the floor?**  
Originally: shared phone or tablet per station.  
**Updated:** production workers use **their own phones**. A worker can belong to **multiple production templates** (e.g. loafer flow and sandal flow) and sees tasks across those templates.

**C6. How do new orders enter the system?**  
Staff type them in. Walk-in, WhatsApp, and phone stay outside the app.

**C7. Delivery?**  
Own riders and customer pickup from the shop. No third-party couriers.

---

## D. Who logs in on day one

**D1. Roles that need accounts in month 1?**  
Owner, manager, sales, production manager, inventory, QC, plus production, finishing, and delivery workers on phones.

**D2. Apprentices?**  
No separate login. They are workers.

Customers do not get accounts in MVP.

---

## E. Inventory, QC, finishing

**E1. Materials on order confirm?**  
Check availability and reserve stock on confirm.

**E2. When to log waste?**  
When material is issued and when a stage is completed.

**E3. QC checkpoints?**  
Cutting, stitching, lasting, and final QC.

**E4. Finishing?**  
Own finishing queue and dashboard, not only a generic production stage.

**E5. Stock units?**  
Simple units only (pairs, pieces, metres, ml). No unit conversions in MVP.

---

## F. Rollout

**F1. Pilot with notebooks?**  
2–4 weeks parallel run.

**F2. Which owner questions must work in week 1 of the pilot?**  
Where the order is, who is working on it, which orders are overdue, what is ready for delivery.

Materials available / low stock and the rest of Section 39 come in later increments.

---

## Assumptions (not asked; used in the plan)

- Staff auth: email + password. Owner or manager creates accounts.
- Online only. No offline-first design.
- English UI, Nigerian Naira (₦), timezone `Africa/Lagos`.
- Photos (products, measurements, QC) stored as files. You wire object storage when you deploy.
- Procurement in MVP: shortage list + purchase request. Goods received is a purchase inventory transaction, not a full supplier PO suite.
- Visual system: Finora-style dashboard (`docs/design/ui-reference.png`, `.cursor/rules/design-ui.mdc`).
- Super Admin from the requirements spec maps to Owner for this single-shop MVP (same person can hold both).
- Production templates are named stage sequences (not one template per worker). Workers attach to many templates. They use personal phones.

---

## Unasked items left open on purpose

These do not block the implementation plan. Decide during Increment 1 if they come up:

- Exact deposit percentage when a deposit is taken (staff enter the amount).
- Photo size limits.
- Whether measurement photos are required or optional.
- Name of the first shop-floor champion during pilot.
