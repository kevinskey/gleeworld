# T-Shirt Brothers order-process audit (2026-11-25)

Deliverables for the `kevinskey/tshirtbrothers` repo, parked here because the
session that produced them could not push to that repository.

- `report.html` — the audit: findings from the customer and admin walkthroughs,
  what was fixed, what is still open, verification results.
- `patches/0001..0004-*.patch` — four commits against tshirtbrothers `main`
  @ `cc90404` (branch `fix/order-process-vetting`). Apply with:

      git checkout -b fix/order-process-vetting origin/main
      git am docs/tsb-order-process-audit/patches/*.patch
      (cd server && npm test)                       # 305 passing
      (cd client && npx tsc -p tsconfig.app.json --noEmit)

- `local-dev-bootstrap.sql` — reconstructs the tables production created by
  hand (`invoices`, `quote_items`, `promotions`, `saved_designs`,
  `gang_sheets`, `custom_products`, extra `quotes`/`mockups` columns) so a
  fresh clone of tshirtbrothers can boot against an empty Postgres.

Nothing in this folder is used by GleeWorld itself. Delete it once the patches
have landed in tshirtbrothers.
