# Phase 2 staging runbook

This runbook is for an operator-approved staging window. The steps below are
instructions only; they have not been run against staging.

## 1. Back up staging and prove the restore path

1. Confirm the staging hostname, database name, PostgreSQL major version, and
   maintenance window with the operator. Do not use a production connection.
2. From a trusted host with PostgreSQL client tools, create a timestamped
   custom-format backup, keeping credentials out of shell history and logs:

   ```sh
   pg_dump --format=custom --no-owner --no-acl \
     --file="phase2-staging-YYYYMMDD-HHMM.dump" \
     "$STAGING_DATABASE_URL"
   ```

3. Confirm the dump is non-empty and readable:

   ```sh
   test -s "phase2-staging-YYYYMMDD-HHMM.dump"
   pg_restore --list "phase2-staging-YYYYMMDD-HHMM.dump"
   ```

4. Restore the dump into an isolated, disposable PostgreSQL instance running
   the same major version. Never restore over staging as a verification step:

   ```sh
   createdb phase2_restore_check
   pg_restore --exit-on-error --no-owner --no-acl \
     --dbname="$RESTORE_CHECK_DATABASE_URL" \
     "phase2-staging-YYYYMMDD-HHMM.dump"
   ```

5. Verify expected tables and representative records in the restored database.
   Keep the backup and restore-check database until the deployment is accepted.

## 2. Check migrations before deployment

From `dashboard/backend`, set `DATABASE_URL` only in the deployment process or
secret manager, then inspect migration state:

```sh
npx prisma migrate status
```

For a staging database already migrated through phase 1, the expected pending
migration is:

- `20261030130000_phase2_member_crm`

If phase 1 has not been deployed, `20261030120000_phase1_orders_tickets_faq`
may also be pending. Compare the complete pending list with the approved release
plan. Stop if any unexpected migration is pending, failed, or marked rolled
back. Do not edit `_prisma_migrations` to make the status appear clean.

## 3. Deploy the approved migrations

After the backup restore check and pending migration review succeed:

```sh
npx prisma migrate deploy
npx prisma migrate status
```

The final status must report that the database schema is up to date. Save both
command outputs with the release record.

## 4. Manual phase 2 checks

Use staging test accounts and non-sensitive sample data:

- Register a club member with a birth date; verify the saved date and default
  marketing-consent state.
- Withdraw marketing consent and verify the member is excluded from queued
  marketing delivery.
- Search members and nonmembers, then check page boundaries and pagination.
- Export member and nonmember lists to XLSX. Open both files in Microsoft Excel;
  confirm cells beginning with formula characters are displayed as text and no
  formula executes.
- Issue a coupon to a member and verify it is limited to that member and the
  requested usage count.
- Queue a message for opted-in members and verify the queue contains only
  eligible members; confirm revoked consent suppresses delivery.

## 5. Rollback plan

Prisma migrations are forward-only in this release. If deployment or manual
verification fails, stop application traffic or return the application to the
previous release, then restore the verified pre-deployment backup to staging
using the approved database recovery procedure. Validate the restored schema
and representative records before reopening traffic. Do not attempt to undo
the migration by manually dropping constraints or editing migration history.
