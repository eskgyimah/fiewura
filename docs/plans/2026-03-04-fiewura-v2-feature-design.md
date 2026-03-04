# Fiewura v2 Feature Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Fiewura from MVP to full property management platform with subscription tiers, maintenance workflow, QR onboarding, meter tracking, tenancy agreements, and Ghana-specific legal compliance.

**Architecture:** Extend existing Express + Prisma + React + Capacitor stack. Add 6 new Prisma models, ~15 new API endpoints, 5 new frontend pages, and Paystack subscription billing. GPS/QR via Capacitor plugins.

**Tech Stack:** Node.js/Express, Prisma/PostgreSQL (Supabase), React/Vite, Capacitor, Paystack, Socket.io, PDFKit, qrcode

---

## Current State (v1.0 MVP)

### What Exists
- **Roles:** LANDLORD, TENANT, VENDOR, TECH_TEAM
- **Auth:** JWT (15m access + 7d refresh), bcrypt, role middleware
- **Properties:** CRUD (landlord only), address/city/country/rentAmount
- **Leases:** Link tenant to property, ACTIVE/EXPIRED/TERMINATED
- **Maintenance:** PENDING/IN_PROGRESS/COMPLETED/CANCELLED, categories (plumbing/electrical/structural/cleaning/other), photos
- **Assignments:** Vendor job assignment, scheduling, cost tracking, before/after photos
- **Payments:** Paystack initiate/webhook/verify, PDF receipt, SMS notification
- **Community:** Threaded posts per property, moderation, real-time Socket.io
- **Cron:** Daily SMS reminders (rent due, overdue, maintenance updates)
- **Analytics:** Landlord dashboard metrics, revenue charts, PDF export

### What's Missing
- Tenant/Tech post-login experience (just fixed)
- QR onboarding, GPS capture, meter tracking
- Maintenance challenge → response → resolution workflow
- Tenancy agreement templates + e-sign
- Subscription/billing tiers
- Eviction legal flow
- Ghana Housing Policies reference

---

## Phase 1: Subscription Tiers + Payment (Week 1-2)

### New Models

```prisma
model Subscription {
  id          String   @id @default(cuid())
  landlordId  String   @unique
  landlord    User     @relation(fields: [landlordId], references: [id])
  tier        SubscriptionTier @default(FREE)
  status      SubscriptionStatus @default(ACTIVE)
  startDate   DateTime @default(now())
  renewalDate DateTime?
  paystackSubCode String?  // Paystack subscription code
  paystackCustomerCode String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum SubscriptionTier {
  FREE
  BASIC
  PREMIUM
}

enum SubscriptionStatus {
  ACTIVE
  EXPIRED
  CANCELLED
}
```

### Tier Limits (enforced server-side)

| Feature | FREE | BASIC (GHS 15/mo) | PREMIUM (GHS 35/mo) |
|---------|------|-------------------|---------------------|
| Properties | 1 | 5 | Unlimited |
| Tenants/property | 3 | 10 | Unlimited |
| Challenges/month | 3 | 20 | Unlimited |
| Payment collection | No | 2.5% fee | 1.5% fee |
| Agreement templates | No | Yes | Yes + custom |
| Eviction flow | No | No | Yes |
| Meter tracking | No | Yes | Yes |
| Analytics export | No | Yes | Yes |
| Tech marketplace | No | No | Yes |

### Payment Methods
- **MTN MoMo:** Paystack mobile_money_gh channel
- **Telecel Cash:** Paystack mobile_money_gh channel (if supported) or direct USSD
- **Visa/Mastercard:** Paystack card channel

### Endpoints
- `POST /api/subscriptions/create` — Create subscription (Paystack plan)
- `GET /api/subscriptions/current` — Get landlord's current tier
- `POST /api/subscriptions/upgrade` — Upgrade tier
- `POST /api/subscriptions/cancel` — Cancel subscription
- `POST /api/subscriptions/webhook` — Paystack subscription webhook

### Middleware
- `requireTier(minTier)` — Gate features by subscription tier

---

## Phase 2: Tenant QR Join + GPS Property Capture (Week 2-3)

### QR Join Flow
1. Landlord opens property → "Generate QR" button
2. Backend generates QR data: `{ propertyId, landlordId, expiry }` signed with JWT
3. QR code displayed as image (npm `qrcode`)
4. Tenant opens app → "Join Property" → scans QR (Capacitor Barcode Scanner)
5. Backend validates QR token → creates Tenant record → creates Lease

### GPS Property Capture
1. Landlord taps "Add Property" → Capacitor Geolocation gets current coords
2. Map preview with draggable pin (Leaflet or Google Maps)
3. Reverse geocode → auto-fill address
4. Photo gallery capture (Capacitor Camera)
5. Submit: coords + address + photos + rent amount

### Schema Changes

```prisma
model Property {
  // ... existing fields
  latitude    Float?
  longitude   Float?
  images      String[]   // photo URLs
  qrToken     String?    // signed JWT for QR join
  qrExpiresAt DateTime?
}
```

### Endpoints
- `POST /api/properties/:id/generate-qr` — Generate QR join token
- `POST /api/properties/join` — Tenant joins via QR token
- `POST /api/properties` — Updated: accept lat/lng/images

### Capacitor Plugins Needed
```
npm install @capacitor/geolocation @capacitor-community/barcode-scanner @capacitor/camera
```

---

## Phase 3: Maintenance Challenge Workflow (Week 3-4)

### Full Flow
```
Tenant reports challenge (category + description + photo)
    → Landlord gets push notification + SMS
    → Landlord assigns Tech (or handles self)
        → Tech gets notification
        → Tech proposes appointment date/time
            → Tenant confirms/rejects appointment
        → Tech arrives, fixes, uploads proof photos
        → Tech marks COMPLETED
    → Tenant reviews: FIXED or UNFIXED
        → If UNFIXED: re-opens challenge, Landlord notified
    → If FIXED: challenge closed, rating optional
```

### New Model

```prisma
model ChallengeResponse {
  id              String   @id @default(cuid())
  maintenanceId   String
  maintenance     Maintenance @relation(fields: [maintenanceId], references: [id])
  responderId     String   // Tech or Landlord
  responder       User     @relation(fields: [responderId], references: [id])
  type            ResponseType
  message         String?
  photos          String[]
  createdAt       DateTime @default(now())
}

enum ResponseType {
  APPOINTMENT_PROPOSED
  APPOINTMENT_CONFIRMED
  APPOINTMENT_REJECTED
  WORK_STARTED
  WORK_COMPLETED
  TENANT_CONFIRMED_FIXED
  TENANT_MARKED_UNFIXED
  REOPENED
}
```

### Maintenance Model Updates

```prisma
model Maintenance {
  // ... existing fields
  appointmentDate DateTime?
  tenantVerified  Boolean  @default(false)
  reopenCount     Int      @default(0)
  responses       ChallengeResponse[]
}
```

### Endpoints
- `POST /api/maintenance` — Tenant creates challenge (+ photo upload)
- `GET /api/maintenance/my` — Tenant's challenges
- `PUT /api/maintenance/:id/assign` — Landlord assigns tech
- `POST /api/maintenance/:id/appointment` — Tech proposes appointment
- `PUT /api/maintenance/:id/appointment/respond` — Tenant accepts/rejects
- `PUT /api/maintenance/:id/complete` — Tech marks complete
- `PUT /api/maintenance/:id/verify` — Tenant confirms fixed/unfixed
- `GET /api/maintenance/:id/timeline` — Full challenge timeline

### Socket.io Events
- `challenge-created` → Landlord
- `challenge-assigned` → Tech
- `appointment-proposed` → Tenant
- `work-completed` → Tenant + Landlord
- `challenge-verified` → Landlord + Tech
- `challenge-reopened` → Landlord + Tech

---

## Phase 4: Meter Tracking (Week 4-5)

### Model

```prisma
model Meter {
  id          String   @id @default(cuid())
  propertyId  String
  property    Property @relation(fields: [propertyId], references: [id])
  type        MeterType
  meterId     String   // Physical meter ID number
  createdAt   DateTime @default(now())
  readings    MeterReading[]
}

model MeterReading {
  id          String   @id @default(cuid())
  meterId     String
  meter       Meter    @relation(fields: [meterId], references: [id])
  value       Float
  photoUrl    String?  // Photo proof of reading
  recordedBy  String
  recorder    User     @relation(fields: [recordedBy], references: [id])
  recordedAt  DateTime @default(now())
}

enum MeterType {
  WATER
  ELECTRICITY
  GAS
}
```

### Endpoints
- `POST /api/meters` — Add meter to property (Landlord)
- `GET /api/meters/property/:id` — Get meters for property
- `POST /api/meters/:id/reading` — Submit reading + photo (Tenant)
- `GET /api/meters/:id/history` — Reading history with trend

---

## Phase 5: Tenancy Agreement (Week 5-6)

### Model

```prisma
model TenancyAgreement {
  id            String   @id @default(cuid())
  leaseId       String   @unique
  lease         Lease    @relation(fields: [leaseId], references: [id])
  templateType  String   @default("standard")  // standard, furnished, commercial
  terms         Json     // Structured agreement terms
  landlordSigned Boolean @default(false)
  tenantSigned   Boolean @default(false)
  landlordSignedAt DateTime?
  tenantSignedAt   DateTime?
  documentUrl    String?  // Generated PDF URL
  status         AgreementStatus @default(DRAFT)
  createdAt      DateTime @default(now())
}

enum AgreementStatus {
  DRAFT
  PENDING_SIGNATURES
  ACTIVE
  EXPIRED
  TERMINATED
}
```

### Flow
1. Landlord creates agreement from template (selects lease, fills terms)
2. PDF generated with Ghana Rent Act compliance
3. Landlord e-signs (checkbox + name + date)
4. Tenant gets notification → reviews → e-signs
5. Both signed → status ACTIVE → PDF stored

### Endpoints
- `POST /api/agreements` — Create from template
- `GET /api/agreements/:id` — View agreement
- `POST /api/agreements/:id/sign` — Sign (landlord or tenant)
- `GET /api/agreements/:id/pdf` — Download PDF

---

## Phase 6: Eviction Alerts + Ghana Housing Policies (Week 6-7)

### Model

```prisma
model EvictionNotice {
  id          String   @id @default(cuid())
  leaseId     String
  lease       Lease    @relation(fields: [leaseId], references: [id])
  reason      EvictionReason
  details     String?
  noticePeriod Int     // days, per Ghana Rent Act
  issuedAt    DateTime @default(now())
  effectiveDate DateTime
  status      EvictionStatus @default(ISSUED)
}

enum EvictionReason {
  NON_PAYMENT        // 1 month notice (Rent Act 25)
  LEASE_VIOLATION     // 1 month notice
  PROPERTY_NEEDED     // 3 months notice (Rent Act 25(1)(b))
  LEASE_EXPIRED       // 3 months notice
}

enum EvictionStatus {
  ISSUED
  ACKNOWLEDGED
  CONTESTED
  ENFORCED
  CANCELLED
}
```

### Ghana Housing Policies (Embedded)
- Static page with key sections from:
  - Rent Act, 1963 (Act 220)
  - Rent Control Law, 1986 (PNDCL 138)
  - Landlord & Tenant Decree, 1972
- Key sections: Notice periods, rent increase limits, security deposit rules, dispute resolution
- Searchable, with FAQ format

### Endpoints
- `POST /api/eviction/issue` — Landlord issues notice (Premium only)
- `GET /api/eviction/lease/:id` — Get notices for lease
- `PUT /api/eviction/:id/acknowledge` — Tenant acknowledges
- `GET /api/policies` — Static Ghana housing policies content

---

## Phase 7: Tech Appointment Scheduling (Week 7)

### Updates to MaintenanceAssignment

```prisma
model MaintenanceAssignment {
  // ... existing fields
  appointmentDate    DateTime?
  appointmentStatus  AppointmentStatus @default(NONE)
  tenantAvailability String[]  // Tenant's available slots
}

enum AppointmentStatus {
  NONE
  PROPOSED
  CONFIRMED
  RESCHEDULED
  CANCELLED
}
```

### Flow
1. Tech proposes date/time
2. Tenant gets notification → Confirm / Reject / Suggest alternative
3. Once confirmed, both get calendar reminder
4. Cron job: reminder SMS 24h before appointment

---

## UI Design — Bottom Navigation

### Landlord
```
Home | Properties | Challenges | Community | More
```

### Tenant
```
Home | My Place | Report | Community | More
```

### Tech
```
Home | Jobs | Schedule | Chat | More
```

### "More" Menu (all roles)
- Profile & Settings
- Ghana Housing Policies
- Subscription (Landlord only)
- Tenancy Agreement
- Meter Readings (Tenant)
- Help & Support

---

## Implementation Priority

| Priority | Phase | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Phase 3: Maintenance Challenge Workflow | 1 week | Core value prop |
| 2 | Phase 2: QR Join + GPS Capture | 1 week | Onboarding UX |
| 3 | Phase 1: Subscription Tiers | 1 week | Revenue |
| 4 | Phase 4: Meter Tracking | 3 days | Tenant retention |
| 5 | Phase 5: Tenancy Agreement | 4 days | Legal compliance |
| 6 | Phase 6: Eviction + Policies | 3 days | Premium feature |
| 7 | Phase 7: Appointment Scheduling | 2 days | Tech UX |

---

## New Dependencies

### Backend
```
qrcode          # QR code generation
jsonwebtoken    # Already exists — for QR token signing
```

### Frontend (Capacitor plugins)
```
@capacitor/geolocation
@capacitor-community/barcode-scanner
@capacitor/camera
@capacitor/local-notifications
leaflet + react-leaflet    # Map display
```

---

## Database Migration Plan

Single migration with all new models + alterations:
1. Add Subscription model
2. Add latitude/longitude/images/qrToken to Property
3. Add ChallengeResponse model
4. Add appointmentDate/tenantVerified/reopenCount to Maintenance
5. Add Meter + MeterReading models
6. Add TenancyAgreement model
7. Add EvictionNotice model
8. Add appointmentDate/appointmentStatus to MaintenanceAssignment

Run: `npx prisma migrate dev --name fiewura_v2_features`
