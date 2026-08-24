# Shoe workshop

Order desk through QC and delivery. Increments 1–5.

## Run locally

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and `AUTH_SECRET`.
2. Create the database: `createdb shoe_mfg`
3. `npx prisma migrate dev`
4. `npm run db:seed`
5. `npm run dev`

Open http://localhost:3000

Seed logins (change after first sign-in), password `changeme`:

- Owner: `owner@local.test`
- Sales: `sales@local.test`
- QC: `qc@local.test`
- Delivery: `delivery@local.test`

Backups: [docs/ops/BACKUPS.md](docs/ops/BACKUPS.md)

Customer status email is skipped until `EMAIL_WEBHOOK_URL` is set. The webhook receives JSON `{ from, to, subject, text }`.

## Stack

Next.js, Prisma, PostgreSQL, Auth.js. UI follows `docs/design/ui-reference.png`. Standards are in `.cursor/rules/`.
