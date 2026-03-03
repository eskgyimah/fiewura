# Fiewura — Quick Deployment (Pilot)

> Goal: Get the app working on your phone for pilot testing with facility manager contacts.

## Architecture

```
Phone App (Capacitor/Android) → API Server (Render) → PostgreSQL (Render)
```

## Option: Render.com (Free Tier)

### Step 1: Create PostgreSQL Database (2 min)
1. Go to https://render.com → Sign up / Log in
2. New → PostgreSQL → Free tier
3. Name: `fiewura-db`
4. Region: Frankfurt (closest to Ghana)
5. Click Create → Copy the **External Database URL**

### Step 2: Deploy API Server (5 min)
1. Push `apps/api/` to a GitHub repo (or use monorepo)
2. Render → New → Web Service → Connect repo
3. Settings:
   - Name: `fiewura-api`
   - Root Directory: `apps/api`
   - Build Command: `npm install && npx prisma generate && npx prisma db push`
   - Start Command: `npm start`
   - Free tier
4. Environment Variables:
   ```
   DATABASE_URL=<paste External Database URL from Step 1>
   JWT_SECRET=<generate: openssl rand -hex 32>
   PORT=3001
   BACKEND_URL=https://fiewura-api.onrender.com
   FRONTEND_URL=https://fiewura-web.onrender.com
   ```
5. Deploy → Wait for green

### Step 3: Seed Test Data (1 min)
In Render dashboard → Shell tab:
```bash
npx prisma db seed
```
This creates the 3 test accounts (admin, tenant, vendor).

### Step 4: Update App to Point to Render (2 min)
In `apps/web/.env` (or mobile config):
```
VITE_API_URL=https://fiewura-api.onrender.com
```

Rebuild APK:
```bash
cd apps/web
npm run deploy
```

### Step 5: Test Login
Use credentials from TEST_CREDENTIALS.md:
- admin@fiewura.com / admin123

## Alternative: Railway.app
Same flow but Railway offers $5/month with more uptime (Render free tier sleeps after 15 min idle).

Railway: https://railway.app
- New Project → Add PostgreSQL → Add Node.js service
- Same env vars as above

## Estimated Cost
| Option | Monthly | Notes |
|--------|---------|-------|
| Render Free | $0 | API sleeps after 15 min idle (30s cold start) |
| Render Starter | $7 | Always on, better for pilot |
| Railway | ~$5 | Usage-based, always on |

## After Deployment Checklist
- [ ] API responds at https://fiewura-api.onrender.com/api/health
- [ ] Login works with test credentials
- [ ] Seed additional test properties for pilot users
- [ ] Share APK with pilot facility managers
- [ ] Set up Paystack test mode for payment testing
