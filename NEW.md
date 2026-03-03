Inspect the existing landlord dashboard backend routes and frontend components.

Task:
1. Implement backend endpoints that compute REAL metrics:
   - totalProperties
   - totalTenants
   - occupancyRate
   - rentCollectedThisMonth
   - overdueRentCount
   - pendingMaintenanceCount

2. Use Prisma aggregate queries (count, sum, groupBy).
3. Ensure all metrics are scoped to the authenticated landlord.
4. Wire endpoints to the frontend dashboard components.
5. Remove any placeholder data.

Constraints:
- No hardcoded values
- No fake charts
- Charts must reflect real backend responses

Deliverables:
- Updated API routes
- Updated React dashboard components
- Verified data flow from DB → API → UI

Complete the Vendor/Technician dashboard end-to-end.

Task:
1. Implement backend endpoints to fetch:
   - assigned maintenance jobs
   - job status (pending, in-progress, completed)
   - payout status (unpaid, paid)

2. Enforce vendor-only access.
3. Update frontend dashboard to:
   - list jobs
   - show status badges
   - show payout state

Rules:
- Vendor must never see other vendors’ jobs
- No placeholders
- Prisma queries must enforce vendorId ownership

Modify real code. Ensure UI renders live data.
