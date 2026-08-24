# Shoe Manufacturing & Business Management System

## Project Requirements & Business Workflow

### 1. Project Overview

The proposed system is a centralized digital platform for managing a small-to-medium shoe manufacturing and sales business.

The system will connect the complete business lifecycle:

**Customer → Design & Measurement → Order → Material Planning → Production → Quality Control → Finishing → Inventory → Dispatch → Delivery → Customer**

The objective is to replace fragmented manual processes, notebooks, memory, verbal instructions, physical files, and disconnected communication with a single source of truth.

The system should allow management to know, at any moment:

- What orders have been received
- What customers have ordered
- What each customer has been measured for
- What designs are being produced
- What materials are available
- What materials need to be purchased
- Which worker is responsible for each task
- Where every order is in production
- Which orders are delayed
- Which orders failed quality control
- Which materials are being wasted
- Which products sell best
- Which colors and materials are popular
- What is ready for delivery
- What has been delivered
- How much money the business is making

---

# 2. Business Problems to Solve

The current business has identified the following major problems:

### Production

- Finishing is a major bottleneck.
- Production activities are manually coordinated.
- It is difficult to know exactly where an order is in production.
- Task delegation is difficult.
- Cutting and lasting mistakes are expensive.
- Production knowledge is heavily dependent on experienced workers.

### Inventory

- Materials are difficult to track.
- The business cannot always immediately determine which materials are available.
- Material purchasing decisions can be uncertain.
- Inventory mistakes cause financial losses.
- Material usage and wastage are not sufficiently tracked.

### Customer Information

- Customer measurements need to be easily accessible.
- Customer design history should be preserved.
- Repeat customers should not need to provide the same information repeatedly.

### Design

- Design information needs to be organized.
- Material/color combinations can be difficult to decide.
- Product photography and catalog management are manual.
- Knowledge about how specific products are made should be preserved.

### Orders

Orders come from multiple sources:

- Physical shop
- Online
- Referrals
- Potentially WhatsApp/social media/phone

These orders need to enter one unified system.

### Delivery

- Dispatch and delivery need better tracking.
- The business needs to know which orders have been dispatched, delivered, delayed, or returned.

### Knowledge Transfer

- Knowledge transfer to apprentices is difficult.
- Experienced workers possess knowledge that is not systematically documented.
- The long-term vision includes an academy, making structured training important.

---

# 3. Project Objectives

The system should achieve the following objectives:

### Primary objectives

1. Centralize all customer information.
2. Centralize all orders.
3. Track every order through production.
4. Track inventory in real time.
5. Connect materials to production requirements.
6. Improve task delegation.
7. Reduce production mistakes.
8. Improve finishing management.
9. Create quality-control checkpoints.
10. Track deliveries.
11. Preserve business knowledge.
12. Provide management with actionable data.

### Secondary objectives

13. Support online sales.
14. Provide a digital product catalog.
15. Support product customization.
16. Support customer self-service.
17. Provide analytics and reporting.
18. Prepare the business for expansion into a larger factory.
19. Eventually support an academy/training platform.
20. Provide a foundation for multiple branches and warehouses.

---

# 4. Core Business Principle

The central object in the system should be the:

## ORDER

Every order receives a unique Order ID.

Example:

**ORD-2026-00421**

Everything related to the order should be connected to that ID:

- Customer
- Measurements
- Design
- Product
- Materials
- Payment
- Production tasks
- Workers
- Quality control
- Finishing
- Delivery
- Customer communication
- Order history

This creates complete traceability.

---

# 5. Main Business Workflow

The primary workflow should be:

**CUSTOMER**

↓

**CUSTOMER REGISTRATION**

↓

**DESIGN SELECTION / CUSTOM DESIGN**

↓

**MEASUREMENT**

↓

**ORDER CREATION**

↓

**PRICE & PAYMENT**

↓

**MATERIAL AVAILABILITY CHECK**

↓

**MATERIAL RESERVATION**

↓

**PURCHASE MATERIALS IF REQUIRED**

↓

**PRODUCTION PLANNING**

↓

**PATTERN DRAFTING**

↓

**CUTTING**

↓

**STITCHING**

↓

**LASTING**

↓

**FILLING**

↓

**SOLE ATTACHMENT**

↓

**FINISHING**

↓

**QUALITY CONTROL**

↓

**READY FOR DELIVERY**

↓

**DISPATCH**

↓

**DELIVERY**

↓

**CUSTOMER CONFIRMATION**

↓

**ORDER COMPLETED**

---

# 6. Module Requirements

## Module 1 — Authentication & User Management

The system must support secure login.

### User types

- Super Admin
- Business Owner
- Manager
- Sales Staff
- Production Manager
- Production Worker
- Inventory Manager
- Quality Control Officer
- Finishing Worker
- Delivery/Dispatch Staff
- Apprentice
- Customer

Different users should have different permissions.

For example:

A production worker should not be able to:

- Change business financial information
- Delete customer records
- Change inventory prices
- Modify system settings

The owner should have full visibility.

---

# 7. Customer Management

The customer module should store:

### Basic information

- Customer ID
- Full name
- Phone number
- Email
- Address
- Customer type
- Source
- Date registered

### Customer history

The system should show:

- Previous orders
- Previous designs
- Previous measurements
- Payments
- Delivery history
- Complaints
- Returns
- Preferences

### Customer source

Orders can originate from:

- Walk-in
- Website
- Referral
- WhatsApp
- Phone
- Social media
- Other

---

# 8. Measurement Management

This should be a dedicated module.

A customer can have multiple measurement profiles.

### Measurement record

- Customer
- Date
- Person who measured
- Left foot measurements
- Right foot measurements
- Length
- Width
- Instep
- Heel
- Ankle
- Other custom measurements
- Notes
- Photos where appropriate

The system should preserve historical measurements instead of overwriting them.

Example:

**Measurement #001 — January 2026**

**Measurement #002 — August 2026**

This is important because people's measurements can change.

---

# 9. Product & Design Management

The system should have a central product/design library.

Each product should have:

- Product ID
- Product name
- Category
- Description
- Available sizes
- Materials
- Colors
- Sole types
- Images
- Videos
- Price
- Production time
- Bill of Materials
- Production instructions
- Pattern
- Status

### Categories

Examples:

- Loafers
- Corporate shoes
- Sneakers
- Sandals
- Boots
- Casual shoes
- School shoes
- Custom shoes

The business can add its own categories.

---

# 10. Design Studio / Color Management

A future-facing design module should allow users to configure a shoe.

Example:

**Shoe Style:** Loafer

**Upper:** Brown leather

**Lining:** Cream

**Sole:** Dark brown

**Thread:** Beige

**Accessory:** Gold buckle

The system should save the configuration as a design.

### Color Wheel

The proposed Color Wheel should help staff explore compatible color combinations.

A selected combination can be saved to a design.

This feature should initially be simple and can become more sophisticated later.

---

# 11. Order Management

Orders should be the central operational module.

### Order information

- Order ID
- Customer
- Product
- Design
- Size
- Measurement
- Quantity
- Material
- Color
- Price
- Discount
- Deposit
- Balance
- Order source
- Required delivery date
- Assigned staff
- Notes

### Order statuses

**Draft**

→

**Confirmed**

→

**Awaiting Materials**

→

**Ready for Production**

→

**In Production**

→

**Quality Control**

→

**Finishing**

→

**Ready for Delivery**

→

**Dispatched**

→

**Delivered**

→

**Completed**

Alternative statuses:

- Cancelled
- On Hold
- Returned
- Rework Required

---

# 12. Material & Inventory Management

Inventory should be one of the most important modules.

### Inventory categories

- Leather
- Suede
- Fabric
- Lining
- Soles
- Insoles
- Thread
- Glue
- Laces
- Buckles
- Accessories
- Packaging
- Other materials

Each inventory item should have:

- Item ID
- Name
- Category
- Color
- Material type
- Supplier
- Quantity
- Unit
- Cost
- Location
- Minimum stock
- Reorder level
- Batch information
- Date received

---

# 13. Inventory Transactions

Every inventory change should create a transaction.

### Transaction types

- Purchase
- Material issued to production
- Material returned
- Adjustmen
- Damaged
- Wasted
- Transfer
- Stock count

The system should never simply change:

**100 units → 80 units**

without recording why.

Instead:

**Opening:** 100

**Issued to ORD-1024:** -10

**Waste:** -2

**Purchased:** +50

**Current:** 138

This creates accountability.

---

# 14. Bill of Materials

Every standard product should have a Bill of Materials.

Example:

### Classic Loafer — 1 Pair

- Leather: 1.2 units
- Lining: 0.4 units
- Sole: 1 pair
- Insole: 1 pair
- Thread: 30m
- Glue: 50ml
- Buckle: 2 units

When an order is created for 10 pairs, the system calculates the required materials.

The system then compares:

**Required quantity**

against

**Available inventory**

and identifies shortages.

---

# 15. Procurement / Purchasing

If inventory is insufficient, the system should generate a material requirement.

Example:

### Material shortage

Order: ORD-2026-00421

Required:

10 soles

Available:

6 soles

Shortage:

4 soles

The system can generate:

**Purchase Request**

→

**Manager Approval**

→

**Purchase Order**

→

**Supplier**

→

**Goods Received**

→

**Inventory Updated**

---

# 16. Production Management

Production should operate as a workflow.

### Production stages

1. Pattern Drafting
2. Cutting Application
3. Cutting
4. Stitching
5. Lasting
6. Filling
7. Sole Attachment
8. Finishing
9. Quality Control

Each stage should have:

- Order
- Worker
- Start time
- Expected completion
- Actual completion
- Status
- Quantity
- Notes
- Defects
- Rework information

---

# 17. Production Board

Managers should have a visual production board.

Example:

| Stage            | Orders |
| ---------------- | -----: |
| Pattern Drafting |      4 |
| Cutting          |      8 |
| Stitching        |     12 |
| Lasting          |      7 |
| Filling          |      5 |
| Sole Attachment  |      6 |
| Finishing        |     10 |
| QC               |      4 |

Clicking a stage should reveal the relevant orders.

---

# 18. Task Management

Managers should be able to assign tasks.

Example:

**Task #783**

Order: ORD-2026-00421

Stage: Stitching

Worker: John

Quantity: 5 pairs

Priority: High

Due: August 24

Status:

**Assigned → Started → Completed → QC**

Workers should have their own task dashboard.

---

# 19. Finishing Management

Because management identified finishing as the highest-value automation opportunity, this deserves its own operational dashboard.

### Finishing Queue

The system should show:

- Order
- Customer
- Product
- Quantity
- Assigned worker
- Priority
- Due date
- Current status

Statuses:

**Waiting**

→

**In Progress**

→

**Completed**

→

**QC**

→

**Rework**

→

**Approved**

The manager should be able to see how long each shoe spends waiting for finishing.

This allows the business to determine whether the real problem is:

- Lack of workers
- Poor scheduling
- Poor task allocation
- Material delays
- Quality problems
- Rework
- Finishing capacity

---

# 20. Quality Control

Quality control should occur at multiple production stages.

### Cutting QC

- Correct pattern
- Correct size
- Correct material
- Correct color
- Correct quantity
- Material defects checked

### Stitching QC

- Stitch quality
- Alignment
- Thread quality
- No loose stitching
- Correct design

### Lasting QC

- Correct shape
- Correct alignment
- No wrinkles
- Proper tension
- Correct size

### Final QC

- Appearance
- Color
- Size
- Sole attachment
- Cleanliness
- Finishing
- Accessories
- Packaging

A failed QC should automatically create:

**REWORK TASK**

rather than simply being marked as failed.

---

# 21. Defect Management

The system should record why an item failed.

Example:

**Order:** ORD-2026-00421

**Stage:** Lasting

**Defect:** Incorrect alignment

**Worker:** John

**Action:** Rework

**Rework time:** 2 hours

This data becomes valuable later.

Management can see:

### Defects by stage

Cutting — 14%

Stitching — 7%

Lasting — 23%

Finishing — 11%

This identifies where training or process improvement is needed.

---

# 22. Waste Management

Material waste should be tracked.

Example:

**Leather issued:** 100 units

**Used:** 86

**Waste:** 14

**Waste percentage:** 14%

The system should allow the reason for waste to be recorded:

- Cutting error
- Material defect
- Incorrect measurement
- Damaged material
- Production mistake
- Design change
- Other

---

# 23. Delivery & Dispatch

Once an order passes QC:

**Ready for Delivery**

The system should create a dispatch record.

### Dispatch information

- Order
- Customer
- Address
- Phone
- Rider
- Rider phone
- Delivery fee
- Pickup time
- Expected delivery
- Delivery status

### Delivery statuses

**Ready**

→

**Assigned**

→

**Picked Up**

→

**In Transit**

→

**Delivered**

→

**Confirmed**

If delivery fails:

**Failed Delivery**

with reason.

---

# 24. Payment Management

The system should track:

- Total order amount
- Deposit
- Amount paid
- Outstanding balance
- Payment method
- Payment date
- Payment reference

Example:

**Order total:** ₦150,000

**Deposit:** ₦75,000

**Balance:** ₦75,000

The system should clearly show whether an order is financially cleared for production or delivery.

---

# 25. Reporting & Analytics

Management should eventually have access to:

### Sales

- Revenue
- Orders
- Average order value
- Best-selling products
- Best-selling colors
- Best-selling materials
- Best customers
- Sales by channel

### Production

- Orders completed
- Average production time
- Production by worker
- Production by stage
- Delayed orders
- Rework rate

### Inventory

- Current stock
- Low-stock materials
- Material usage
- Waste
- Inventory value
- Purchasing history

### Quality

- Defects by stage
- Defects by worker
- Rework rate
- Most common defects

### Delivery

- Deliveries completed
- Failed deliveries
- Average delivery time
- Delivery costs

---

# 26. Dashboard

The main management dashboard should provide an instant business overview.

### Today

**Orders:** 14

**Production:** 37

**Finishing:** 9

**QC:** 4

**Ready for Delivery:** 7

**Overdue:** 2

**Low Stock:** 6

**Revenue:** ₦XXX

### Alerts

- 3 materials below reorder level
- 2 orders overdue
- 4 orders waiting for materials
- 3 QC failures require rework
- 1 delivery failed

---

# 27. Notifications

The system should notify relevant users when important events occur.

Examples:

### Manager

"Order ORD-1024 is overdue."

### Inventory Manager

"Black leather has reached reorder level."

### Production Worker

"New stitching task assigned."

### Finishing Worker

"5 pairs are ready for finishing."

### Customer

"Your order has entered production."

### Customer

"Your order is ready for delivery."

---

# 28. Product Catalog

The system should have an internal and eventually public catalog.

Product information:

- Name
- Images
- Description
- Price
- Colors
- Sizes
- Materials
- Available customization
- Production time
- Availability

The same product data should be reusable for:

- Website
- Internal catalog
- Customer quotations
- Social media
- Marketing
- Sales staff

---

# 29. Online Ordering

This should be a later phase.

Customers should eventually be able to:

1. Browse products.
2. Select a design.
3. Select size.
4. Select color.
5. Customize where supported.
6. Provide measurements.
7. Upload references if necessary.
8. Place order.
9. Make payment.
10. Track order.

Online orders should automatically enter the same internal order system.

There should NOT be a separate production workflow for online orders.

---

# 30. Knowledge Base / Academy

The long-term system should preserve company knowledge.

### Knowledge base

- Production procedures
- SOPs
- Material guides
- Design guides
- Quality standards
- Troubleshooting
- Training videos
- Images
- Documents

### Academy

Eventually:

**Course → Lesson → Video → Assessment → Certification**

This will help transfer knowledge from experienced workers to apprentices.

---

# 31. Roles & Permissions

A permission system should control access.

### Owner

Full access.

### Manager

Operations, production, inventory, customers, reports.

### Sales

Customers, products, orders, payments.

### Inventory Manager

Inventory, suppliers, purchasing, material transactions.

### Production Manager

Production, workers, task assignment, workflow.

### Production Worker

Assigned tasks and relevant production instructions.

### QC Officer

Quality-control records and rework.

### Finishing Worker

Finishing queue and assigned jobs.

### Apprentice

Training and assigned tasks.

### Customer

Own profile, orders, measurements, payments and tracking.

---

# 32. Audit Trail

This is essential.

The system should record important changes.

Example:

**John changed order ORD-1024**

Old delivery date:

August 25

New delivery date:

August 28

Changed:

August 22, 10:42 AM

This prevents disputes and creates accountability.

---

# 33. Important Business Rules

The system should enforce rules rather than relying on employees to remember them.

### Rule 1

An order cannot enter production if required materials are unavailable unless a manager overrides it.

### Rule 2

An order cannot be marked "Completed" until QC has approved it.

### Rule 3

A failed QC automatically creates a rework requirement.

### Rule 4

Inventory cannot be reduced without an inventory transaction.

### Rule 5

Only authorized users can modify completed production records.

### Rule 6

Customer measurements should be versioned rather than overwritten.

### Rule 7

An order cannot be dispatched if the required balance/payment condition has not been satisfied unless authorized.

### Rule 8

Every production task must have an assigned worker.

---

# 34. Core Data Model

The initial database should revolve around these entities:

**User**

**Role**

**Customer**

**Customer Measurement**

**Product**

**Design**

**Design Component**

**Color**

**Material**

**Inventory Item**

**Inventory Transaction**

**Supplier**

**Purchase Request**

**Purchase Order**

**Order**

**Order Item**

**Payment**

**Production Job**

**Production Stage**

**Production Task**

**Quality Check**

**Defect**

**Rework**

**Waste Record**

**Delivery**

**Delivery Rider**

**Notification**

**Training Course**

**Training Lesson**

**Audit Log**

These entities should be related rather than storing duplicated information everywhere.

---

# 35. MVP — What Should Be Built First

Do not build the entire five-year vision immediately.

The MVP should focus on the operational problems.

## MVP Phase 1

### Essential

- Authentication
- User roles
- Customer management
- Measurements
- Product/design management
- Order management
- Inventory
- Material requirements
- Production workflow
- Task assignment
- Finishing queue
- Quality control
- Delivery
- Payments
- Basic dashboard
- Basic reports
- Audit logs

### Leave for later

- Advanced color wheel
- AI design generation
- Full e-commerce
- Customer self-service
- Academy
- Advanced forecasting
- Multiple branches
- Advanced accounting
- External courier integrations

---

# 36. Recommended Development Roadmap

## Phase 1 — Discovery

Document the real-world workflow.

Interview:

- Owner
- Manager
- Sales person
- Production manager
- Cutter
- Stitcher
- Lasting worker
- Finishing worker
- Inventory person
- Delivery person

Follow one real order from beginning to end.

---

## Phase 2 — System Design

Create:

- Business process diagrams
- User journeys
- Database ERD
- Permission matrix
- Wireframes
- API architecture
- Notification architecture

---

## Phase 3 — MVP

Build:

**Customers → Products → Orders → Inventory → Production → QC → Finishing → Delivery**

---

## Phase 4 — Pilot

Run the software alongside the existing manual process.

Do not immediately remove the notebooks.

Use the system with real orders and compare:

- Production time
- Inventory accuracy
- Mistakes
- Delays
- Worker adoption

---

## Phase 5 — Optimization

After real-world usage:

- Fix bottlenecks
- Improve dashboards
- Add automation
- Improve inventory forecasting
- Improve production planning

---

## Phase 6 — Digital Sales

Add:

- Website
- Online catalog
- Online ordering
- Customer accounts
- Payments
- Order tracking
- Custom design

---

## Phase 7 — Scale

Add:

- Academy
- Showroom management
- Multiple locations
- Warehouse management
- Factory management
- Advanced analytics
- Procurement
- Supplier management
- Machine management

---

# 37. The Complete Future-State Workflow

The final system should eventually operate like this:

### STEP 1 — CUSTOMER

Customer walks into the store, contacts the business online, or is referred.

↓

### STEP 2 — CUSTOMER PROFILE

Staff searches for the customer.

If existing:

**Retrieve profile.**

If new:

**Create customer.**

↓

### STEP 3 — DESIGN

Customer selects an existing design or creates a custom design.

↓

### STEP 4 — MEASUREMENT

Staff retrieves existing measurements or records new measurements.

↓

### STEP 5 — ORDER

Staff creates the order.

The system calculates:

**Price + Materials + Production requirements + Delivery**

↓

### STEP 6 — PAYMENT

Deposit/payment is recorded.

↓

### STEP 7 — MATERIAL CHECK

System automatically checks the Bill of Materials against inventory.

If available:

**Reserve materials.**

If unavailable:

**Generate purchase requirement.**

↓

### STEP 8 — PRODUCTION PLANNING

Production manager schedules the order.

↓

### STEP 9 — TASK ASSIGNMENT

Workers receive tasks.

↓

### STEP 10 — PRODUCTION

**Pattern**

↓

**Cutting**

↓

**Stitching**

↓

**Lasting**

↓

**Filling**

↓

**Sole Attachment**

↓

**Finishing**

Each stage records progress.

↓

### STEP 11 — QUALITY CONTROL

QC checks the completed shoe.

If failed:

**Rework**

If passed:

**Approved**

↓

### STEP 12 — READY

Customer receives notification.

↓

### STEP 13 — DISPATCH

Delivery is assigned.

↓

### STEP 14 — DELIVERY

Rider delivers the product.

↓

### STEP 15 — COMPLETION

Customer confirms receipt.

↓

### STEP 16 — DATA

The system updates:

- Customer history
- Product sales
- Material usage
- Worker performance
- Production statistics
- Revenue
- Delivery statistics

This data feeds the management dashboard.

---

# 38. The Most Important Design Principle

The system should not simply digitize the current manual process.

It should **improve the process while digitizing it.**

For example, don't build:

**Notebook inventory → digital inventory**

Build:

**Inventory → Production requirements → Automatic reservation → Low-stock alert → Purchase request → Receiving → Production consumption → Waste tracking → Analytics**

That is the difference between a digital notebook and a real business-management system.

---

# 39. Definition of Success

After implementation, the owner should be able to sit down at a computer or phone and answer these questions within seconds:

**"How many orders do we have?"**

**"Which orders are late?"**

**"Where is order ORD-1024?"**

**"Who is working on it?"**

**"What materials does it need?"**

**"Do we have those materials?"**

**"What materials are running low?"**

**"How much leather did we waste this month?"**

**"Which worker has the highest defect rate?"**

**"Why is finishing delayed?"**

**"How many shoes are ready for delivery?"**

**"How much money is outstanding?"**

**"Which products sell the most?"**

**"Which colors are most popular?"**

**"What did this customer order last time?"**

**"What were this customer's measurements?"**

**"How much did we spend on materials?"**

**"How profitable is each product?"**

If the software can answer those questions reliably, it is solving the real business problem.

---

# 40. Final Product Vision

The long-term product should become:

> **A complete digital operating system for a shoe manufacturing business.**

Not just:

**"An app for selling shoes."**

The architecture should be:

**CUSTOMER MANAGEMENT**

↕️

**DESIGN & MEASUREMENTS**

↕️

**ORDER MANAGEMENT**

↕️

**MATERIALS & INVENTORY**

↕️

**PROCUREMENT**

↕️

**PRODUCTION**

↕️

**WORKFORCE & TASKS**

↕️

**QUALITY CONTROL**

↕️

**FINISHING**

↕️

**DELIVERY**

↕️

**SALES & PAYMENTS**

↕️

**ANALYTICS**

with:

**WEBSITE + E-COMMERCE + ACADEMY + SHOWROOM + FACTORY MANAGEMENT**

being added as the business grows.

The most important MVP principle is:

**Build the operational backbone first. Then build the customer-facing features on top of it.**

That approach gives the business something useful immediately while also creating an architecture capable of supporting the owner's five-year vision.
