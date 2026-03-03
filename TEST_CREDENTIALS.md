# Fiewura — Test Login Credentials

## Seeded Accounts (run `npx prisma db seed` first)

| Role | Email | Password |
|------|-------|----------|
| Landlord/Admin | admin@fiewura.com | admin123 |
| Tenant | tenant@fiewura.com | tenant123 |
| Vendor | vendor@fiewura.com | vendor123 |

## Create New Account

```
POST /auth/register
{
  "email": "your-email@example.com",
  "password": "min-6-chars",
  "name": "Your Name",
  "phone": "+233XXXXXXXXXX",
  "role": "LANDLORD | TENANT | VENDOR | TECH_TEAM"
}
```

## Auth Details
- JWT access tokens: 15-min expiry
- Refresh tokens: 7-day expiry (httpOnly cookie)
- Passwords: bcrypt hashed (10 rounds)
