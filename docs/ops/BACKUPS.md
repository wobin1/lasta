# Backups

Postgres is the source of truth. Back it up before every migrate and every day in production.

## Daily dump

Keep the dump **off the app machine**.

```bash
pg_dump "$DATABASE_URL" --format=custom --file="atelier-$(date -u +%Y%m%d).dump"
```

Restore:

```bash
pg_restore --clean --if-exists --dbname="$DATABASE_URL" atelier-YYYYMMDD.dump
```

## Before a release

1. Take a dump (command above).
2. Run `npx prisma migrate deploy`.
3. Confirm the app boots and staff can sign in.

## Files

Product and measurement photos (when wired) live on local disk in development (`./uploads`) or object storage in production. Include that bucket in the same backup schedule as the database.

Email is not a backup. SMTP failures are logged; order and delivery records stay in Postgres.
