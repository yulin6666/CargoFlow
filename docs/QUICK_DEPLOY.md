# Quick Deploy to Railway

## TL;DR

```bash
# 1. Push to GitHub
git add .
git commit -m "Ready for Railway deployment"
git push origin main

# 2. Go to Railway
# https://railway.app → New Project → Deploy from GitHub

# 3. Add services in this order:
# - PostgreSQL (database)
# - n8n (workflows) - Docker image: n8nio/n8n:latest
# - Backend (NestJS) - Root: /, Build: npm run build:backend, Start: npm run start:backend
# - Frontend (Next.js) - Root: /, Build: npm run build:frontend, Start: npm run start:frontend

# 4. Set environment variables (see RAILWAY_DEPLOYMENT.md)

# 5. Connect domains and update cross-references

# 6. Import n8n workflows from docs/n8n-workflows/
```

## Required Environment Variables

### Backend
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
N8N_WEBHOOK_BASE=https://your-n8n-domain.up.railway.app
SHIPPO_TEST_TOKEN=shippo_test_xxx
RESEND_API_KEY=re_xxx
AIRTABLE_API_KEY=patxxx
AIRTABLE_BASE_ID=appxxx
```

### Frontend
```
NEXT_PUBLIC_API_URL=https://your-backend-domain.up.railway.app
```

### n8n
```
N8N_PORT=5678
WEBHOOK_URL=https://your-n8n-domain.up.railway.app
DB_TYPE=postgresdb
DB_POSTGRESDB_URL=${{Postgres.DATABASE_URL}}
```

## Verification Checklist

- [ ] All 4 services deployed (PostgreSQL, n8n, Backend, Frontend)
- [ ] Database schema initialized
- [ ] n8n workflows imported and activated
- [ ] Backend health check: `https://backend-domain/health`
- [ ] Frontend loads: `https://frontend-domain`
- [ ] Quote generation works
- [ ] Label purchase works
- [ ] Airtable sync works

## Support

See full deployment guide: `docs/RAILWAY_DEPLOYMENT.md`
