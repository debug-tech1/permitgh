# PermitGH

Municipal Assembly Service Request & SLA Accountability Tracker — a CSCD602
Advanced Software Engineering capstone project.

Citizens submit permit applications (business operating permits, building
permits, market stall permits) and get an SLA deadline the moment they
submit. Case officers work a per-service queue. A public, no-login dashboard
shows how each service is actually performing against its own promised
turnaround time — the accountability mechanic the rest of the system is
built around.

System design (architecture, ER diagram, use-case diagram, request lifecycle,
and the submission → escalation sequence) is documented separately:
see the published system design doc from the project planning session.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack)
- **PostgreSQL** in production, **SQLite** for zero-setup local dev — via
  [Prisma driver adapters](https://www.prisma.io/docs), same schema, no code
  changes needed to switch (see `src/lib/db.ts`)
- **Custom auth**: bcrypt password hashing + signed JWT session cookie +
  `src/proxy.ts` for role-based route gating (built by hand, not a library,
  so every access-control decision is auditable in one place)
- **Zod** for input validation, **Vitest** for unit tests

## Getting started

```bash
npm install
npx prisma migrate dev   # creates dev.db and applies the schema
npx prisma db seed       # loads demo service types, users, and requests
npm run dev
```

Then open http://localhost:3000.

### Seeded accounts

Password for all accounts: `Password123!`

| Role    | Email                              | Notes                        |
| ------- | ----------------------------------- | ----------------------------- |
| Admin   | `admin@permitgh.test`               | SLA config + performance view |
| Officer | `officer.business@permitgh.test`    | Business Operating Permit queue |
| Officer | `officer.building@permitgh.test`    | Building Permit queue |
| Officer | `officer.market@permitgh.test`      | Market Stall Permit queue |
| Officer | `officer.property@permitgh.test`    | Property Rate queue |
| Citizen | `citizen@permitgh.test`             | Ama Serwaa — has sample requests |
| Citizen | `citizen2@permitgh.test`            | Kwame Owusu — has a sample request |

New citizens can also self-register at `/register`. Officer and admin
accounts are seeded/issued directly, matching how Assembly staff accounts
would actually be provisioned.

## Testing

```bash
npm run test    # Vitest — SLA deadline math, overdue logic, status-transition graph
npm run lint
npm run build   # also runs the TypeScript compiler
```

`Testing_Report` (in the project documentation) covers functional, system,
and manual UAT-style pass-throughs of every role's flow in addition to this
unit suite.

## Live deployment

- **App:** https://servetrack-theta.vercel.app (URL unchanged since the ServeTrack -> PermitGH rename — renaming the Vercel project itself would break this already-shared link; the app displays "PermitGH" everywhere, only the deployment's URL slug is the old name)
- **Hosting:** Vercel (project `debug-tech/servetrack`)
- **Database:** Neon Postgres, provisioned via Vercel Storage and linked to the project (`DATABASE_URL` is injected automatically, not stored in this repo)
- Demo data was seeded once, as part of the first production build. `npm run build` no longer runs the seed step (see below), so later redeploys apply pending migrations but never reset data. To reseed on purpose, temporarily add `&& prisma db seed` back into the `build` script in `package.json` and redeploy.

## Deploying (SQLite → PostgreSQL)

This is the migration that was actually carried out to reach the live
deployment above — kept here as the runbook for standing up another
environment (e.g. staging) from scratch. Local dev during earlier phases
intentionally used SQLite so the project needed zero external signups to
build against; production needs a real Postgres instance because the
dashboards and SLA clock must survive across serverless invocations —
SQLite's file can't do that on Vercel. To switch:

1. Create a free Postgres database (e.g. [Neon](https://neon.tech) or
   [Supabase](https://supabase.com)) and copy its connection string.
2. In `prisma/schema.prisma`, change the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
   }
   ```
3. `npm install @prisma/adapter-pg pg`
4. In `src/lib/db.ts`, swap the adapter:
   ```ts
   import { PrismaPg } from "@prisma/adapter-pg";
   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
   ```
5. Set `DATABASE_URL` (the Postgres connection string) and `SESSION_SECRET`
   (a random 64-char hex string) as environment variables on the hosting
   platform.
6. `npx prisma migrate deploy && npx prisma db seed`

No model or query code changes — the schema deliberately avoids
provider-specific features (see the comment at the top of
`prisma/schema.prisma`).

## Project structure

```
prisma/schema.prisma        Data model (User, ServiceType, ServiceRequest, StatusHistory, Attachment)
prisma/seed.ts               Demo data — overdue case, on-track case, on-time and late resolutions
src/lib/sla.ts                Pure SLA/overdue/status-transition logic (unit tested)
src/lib/auth.ts               Password hashing, session JWT, per-action authorization
src/lib/stats.ts              Shared aggregation for the public + admin dashboards
src/proxy.ts                  Route-level RBAC gate (Next.js 16 renamed middleware → proxy)
src/actions/                  Server Actions — one file per role's mutations
src/app/                      Pages: public dashboard, citizen, officer, admin, auth
```
