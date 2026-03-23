# Sales KPI System Implementation (Kronus CRM)

## Overview
This document explains how the Quarterly Sales KPI system works in this codebase, why daily recalculation exists, and how data flows from source records to dashboard outputs.

## Why Daily Cron Recalculation Is Needed
`recalculateQuarterKPIs()` in daily cron is correct and intentional.

Reason:
- KPI score is not static; it depends on continuously changing records.
- New leads get assigned daily.
- Activities (CALL/MEETING/EMAIL/FOLLOW_UP) get added throughout the day.
- Site visits (events) are created/updated.
- Lead statuses change to `CONVERTED` and affect revenue/deals.
- Follow-up completion/misses change every day.

If recalculation is not done daily, leaderboard and KPI cards become stale and inaccurate.

## Important Correction Applied
A timezone bug was fixed in KPI quarter/date logic.

Problem before fix:
- Cron is scheduled in `Asia/Kolkata`, but quarter detection used server local timezone (`new Date().getMonth()`).
- On UTC servers, cron at 02:00 IST happens on previous UTC date, which could select the wrong quarter on boundary days.

Fix:
- KPI quarter derivation and date-key comparisons are now explicitly based on `Asia/Kolkata` in `kpiService`.
- Quarter start/end are stored as UTC instants representing IST boundaries.

## Formula Implemented
Final KPI:

```
KPI = closureScore + closureBonus + siteVisitScore + leadResponseScore + followUpComplianceScore - totalPenalties
```

System clamps final score to [0, 100].

### 1) Deal Closure Score (Max 55)

```
closureScore = min(55, (revenueClosed / targetRevenue) * 55)
```

Bonus:

```
if revenueClosed > 1.2 * targetRevenue => closureBonus = 10
```

### 2) Site Visit Conversion Score (Max 25)
Uses:

```
conversionRate = dealsClosed / siteVisits
```

Mapping:
- >25% => 25
- 18-25% => 20
- 10-18% => 12
- <10% => 6

### 3) Lead Response Discipline (Max 10)
Uses:

```
responseRate = leadsContacted24h / leadsAssigned
```

Mapping:
- >95% => 10
- 85-95% => 8
- 70-85% => 5
- <70% => 2

### 4) Follow-Up Compliance (Max 10)
Uses:

```
followUpCompliance = completedFollowUps / scheduledFollowUps
```

Mapping:
- >90% => 10
- 75-90% => 7
- 60-75% => 4
- <60% => 2

### 5) Penalties
Missed follow-up bucket:
- 1-2 => -2
- 3-5 => -5
- >5 => -10

Lead aging penalty:
- each lead not contacted within 48h => -1

Total:

```
totalPenalties = missedFollowUpPenalty + leadAgingPenalty
```

## Data Sources Used
For each salesperson (`roles` has `SALESMAN`) and quarter:

1. Leads (`Lead`)
- assigned to user
- created in quarter range
- fields used: `createdAt`, `followUpDate`, `status`, `updatedAt`, `budgetTo`

2. Activities (`Activity`)
- filtered by lead IDs and salesperson
- types considered as contact: `CALL`, `MEETING`, `EMAIL`, `FOLLOW_UP`
- used for 24h response, 48h aging, and follow-up completion checks

3. Site visits (`Event`)
- `type = SITE_VISIT`
- user-based and quarter range filtered

4. Targets (`QuarterlySalesTarget`)
- one target per `userId + quarterKey`
- default 0 if not set

5. KPI output (`SalesKPIQuarterly`)
- one KPI snapshot per `userId + quarterKey` (upsert)

## Storage Models
Added in Prisma schema:

1. `QuarterlySalesTarget`
- `userId`
- `quarterKey` (e.g., `2026-Q1`)
- `quarterStart`, `quarterEnd`
- `targetRevenue`
- unique: `(userId, quarterKey)`

2. `SalesKPIQuarterly`
- all computed metric fields and score components
- unique: `(userId, quarterKey)`
- index for ranking: `(quarterKey, finalScore)`

## Cron Jobs
In `backend/src/services/cronService.js`:

1. Daily KPI refresh
- Schedule: `0 2 * * *`
- Timezone: `Asia/Kolkata`
- Action: `recalculateQuarterKPIs()`

2. Quarter-start bootstrap/reset
- Schedule: `5 0 1 1,4,7,10 *`
- Timezone: `Asia/Kolkata`
- Action: `recalculateQuarterKPIs()`

Notes:
- This does not delete historical rows.
- New quarter records are created/upserted for the fresh quarter key.

## API Endpoints
Base: `/api/kpi`

1. `GET /quarter`
- returns current quarter metadata

2. `GET /quarterly`
- returns one user KPI for quarter
- non-privileged users see self

3. `GET /leaderboard`
- returns ranked KPI list by score desc, then revenue desc

4. `GET /admin-summary`
- privileged roles
- returns average KPI, top3, bottom3

5. `GET /targets`
- admin/executive/director
- returns all salespeople + target values for quarter

6. `PUT /targets`
- admin/executive/director
- upserts target revenues and recalculates impacted users

7. `POST /recalculate`
- manual trigger for recalculation

## Frontend Integration
1. Sidebar menu includes `Sales KPI` route (`/kpi`).
2. New page at `frontend/app/(dashboard)/kpi/page.js`:
- personal KPI card and breakdown
- leaderboard
- admin summary block
- target input section for admin/executive/director
3. Main dashboard also fetches and shows KPI summary for privileged users.

## Ranking Logic
Leaderboard sort order:
1. `finalScore` desc
2. `revenueClosed` desc
3. `updatedAt` asc (stable tie-breaker)

## Current Assumptions / Limitations
1. Lead response 24h/48h currently uses lead `createdAt` as assignment-time proxy.
- If reassignment-specific timing is needed, add explicit assignment timestamps/history.

2. Follow-up completion matching is date-based (IST day key), not exact time matching.
- A `FOLLOW_UP` activity on the same due date counts as completed.

3. `recalculateQuarterKPIs()` is intentionally called from cron and some read APIs to keep data fresh.
- For very large scale, this can be optimized by caching or moving full recalculation to queue workers.

## Operational Checklist
1. Schema sync:

```bash
cd backend
npx prisma db push
npx prisma generate
```

2. Restart backend.
3. Set quarterly targets from `/kpi` page.
4. Verify cron logs around 02:00 IST.
5. Test endpoints:
- `/api/kpi/quarter`
- `/api/kpi/quarterly`
- `/api/kpi/leaderboard`

## File Map
Backend:
- `backend/prisma/schema.prisma`
- `backend/src/services/kpiService.js`
- `backend/src/controllers/kpiController.js`
- `backend/src/routes/kpiRoutes.js`
- `backend/src/services/cronService.js`
- `backend/src/index.js`

Frontend:
- `frontend/app/(dashboard)/kpi/page.js`
- `frontend/app/(dashboard)/layout.js`
- `frontend/app/(dashboard)/dashboard/page.js`
