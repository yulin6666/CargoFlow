# Railway Deployment Guide

Complete guide to deploy CargoFlow to Railway (Frontend + Backend + Database + n8n).

## Prerequisites

- Railway account (sign up at https://railway.app)
- GitHub account (to connect your repository)
- Shippo API test key
- Resend API key
- Airtable API key

## Architecture Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │───▶│   Backend   │───▶│     n8n     │───▶│  Airtable   │
│  (Next.js)  │    │  (NestJS)   │    │ (Workflows) │    │    (CRM)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                           │                   │
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐    ┌─────────────┐
                    │  PostgreSQL │    │    Shippo   │
                    │  (Database) │    │     API     │
                    └─────────────┘    └─────────────┘
```

## Step 1: Push Your Code to GitHub

1. **Initialize Git repository** (if not already):
   ```bash
   cd /Users/lindediannao/Documents/project/CargoFlow
   git init
   git add .
   git commit -m "Initial commit for Railway deployment"
   ```

2. **Create GitHub repository**:
   - Go to https://github.com/new
   - Name: `cargoflow-demo`
   - Visibility: Private (recommended)
   - Do NOT initialize with README

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/cargoflow-demo.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Create Railway Project

1. **Sign in to Railway**:
   - Go to https://railway.app
   - Click "Start a New Project"

2. **Deploy from GitHub**:
   - Click "Deploy from GitHub repo"
   - Authorize Railway to access GitHub
   - Select your `cargoflow-demo` repository

## Step 3: Add PostgreSQL Database

1. **In your Railway project**:
   - Click "+ New"
   - Select "Database"
   - Choose "Add PostgreSQL"

2. **Get database credentials**:
   - Click on the PostgreSQL service
   - Go to "Variables" tab
   - Copy the `DATABASE_URL` value
   - Format: `postgresql://user:password@host:port/database`

## Step 4: Deploy n8n

1. **Add n8n service**:
   - Click "+ New"
   - Select "Empty Service"
   - Name it "n8n"

2. **Configure n8n**:
   - Go to "Settings" tab
   - Under "Source", click "Add a Docker Image"
   - Docker Image: `n8nio/n8n:latest`
   - Port: `5678`

3. **Set n8n environment variables**:
   ```
   N8N_HOST=0.0.0.0
   N8N_PORT=5678
   N8N_PROTOCOL=https
   WEBHOOK_URL=https://YOUR_N8N_DOMAIN
   N8N_EDITOR_BASE_URL=https://YOUR_N8N_DOMAIN
   EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
   EXECUTIONS_DATA_SAVE_ON_ERROR=all
   ```

4. **Generate public domain**:
   - Go to "Settings" → "Networking"
   - Click "Generate Domain"
   - Save this URL (e.g., `n8n-production-xxxx.up.railway.app`)

5. **Update webhook URL**:
   - Replace `WEBHOOK_URL` and `N8N_EDITOR_BASE_URL` with your n8n domain

## Step 5: Configure n8n Database Connection

1. **In n8n service variables**, add:
   ```
   DB_TYPE=postgresdb
   DB_POSTGRESDB_DATABASE=railway
   DB_POSTGRESDB_HOST=<from PostgreSQL service>
   DB_POSTGRESDB_PORT=5432
   DB_POSTGRESDB_USER=<from PostgreSQL service>
   DB_POSTGRESDB_PASSWORD=<from PostgreSQL service>
   ```

2. **Or use DATABASE_URL** (easier):
   ```
   DB_TYPE=postgresdb
   DB_POSTGRESDB_URL=${{Postgres.DATABASE_URL}}
   ```

## Step 6: Deploy Backend (NestJS)

1. **Add backend service**:
   - Click "+ New"
   - Select "GitHub Repo"
   - Choose your repository

2. **Configure build settings**:
   - Root Directory: `/`
   - Build Command: `npm install && npm run build:backend`
   - Start Command: `npm run start:backend`

3. **Set environment variables**:
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   N8N_WEBHOOK_BASE=https://YOUR_N8N_DOMAIN
   SHIPPO_TEST_TOKEN=shippo_test_YOUR_KEY
   RESEND_API_KEY=re_YOUR_KEY
   RESEND_FROM_EMAIL=onboarding@resend.dev
   AIRTABLE_API_KEY=patYOUR_KEY
   AIRTABLE_BASE_ID=appYOUR_BASE_ID
   ```

4. **Generate public domain**:
   - Settings → Networking → Generate Domain
   - Save this URL (e.g., `backend-production-xxxx.up.railway.app`)

## Step 7: Deploy Frontend (Next.js)

1. **Add frontend service**:
   - Click "+ New"
   - Select "GitHub Repo"
   - Choose your repository

2. **Configure build settings**:
   - Root Directory: `/`
   - Build Command: `npm install && npm run build:frontend`
   - Start Command: `npm run start:frontend`

3. **Set environment variables**:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_DOMAIN
   ```

4. **Generate public domain**:
   - Settings → Networking → Generate Domain
   - Save this URL (e.g., `frontend-production-xxxx.up.railway.app`)

## Step 8: Update Cross-Service URLs

Now that all services are deployed, update environment variables with actual URLs:

### Backend Service
```
N8N_WEBHOOK_BASE=https://n8n-production-xxxx.up.railway.app
```

### Frontend Service
```
NEXT_PUBLIC_API_URL=https://backend-production-xxxx.up.railway.app
```

### n8n Service
```
WEBHOOK_URL=https://n8n-production-xxxx.up.railway.app
```

## Step 9: Initialize Database Schema

1. **Connect to your deployed backend**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login
   railway login

   # Link to your project
   railway link

   # Run migrations
   railway run --service backend npm run migrate
   ```

2. **Or run SQL manually**:
   - Go to PostgreSQL service in Railway
   - Click "Connect" → "Query"
   - Run the schema from `packages/database/schema.sql`

## Step 10: Import n8n Workflows

1. **Access n8n editor**:
   - Open `https://YOUR_N8N_DOMAIN`
   - First time: Set up admin account

2. **Configure credentials**:
   - Click Settings → Credentials
   - Add "PostgreSQL" credential:
     - Host: (from Railway PostgreSQL)
     - Database: railway
     - User: postgres
     - Password: (from Railway PostgreSQL)

   - Add "Airtable Token API" credential:
     - Name: Airtable API
     - Access Token: (your Airtable PAT)

   - Add "HTTP Header Auth" credential:
     - Name: Shippo Test Token
     - Header Name: Authorization
     - Value: `ShippoToken YOUR_SHIPPO_KEY`

3. **Import workflows**:
   - Go to Workflows
   - Click "Import from File"
   - Import these workflows one by one:
     - `docs/n8n-workflows/quote-generation-stage1.json`
     - `docs/n8n-workflows/purchase-label.json`
     - `docs/n8n-workflows/payment-processing.json`
     - `docs/n8n-workflows/shippo-tracking-webhook.json`

4. **Update workflow credentials**:
   - Open each workflow
   - Click on PostgreSQL nodes → Select your credential
   - Click on Airtable nodes → Select your credential
   - Click on Shippo nodes → Select your credential
   - Save and Activate each workflow

5. **Update Base and Table selections**:
   - In Airtable nodes, select:
     - Base: Your Airtable base
     - Table: "Contacts" or "Orders"

## Step 11: Test the Deployment

1. **Open frontend**:
   ```
   https://YOUR_FRONTEND_DOMAIN
   ```

2. **Test quote generation**:
   - Fill in the form
   - Click "Get Shippo Live Quote"
   - Verify rates appear

3. **Test label purchase**:
   - Select a rate
   - Click "Confirm Purchase"
   - Check if tracking number appears

4. **Verify Airtable sync**:
   - Check your Airtable base
   - Verify contacts and orders appear

5. **Check logs**:
   - Click "Logs" tab
   - Verify automation logs appear

## Step 12: Custom Domain (Optional)

1. **Add custom domain to Frontend**:
   - Go to Frontend service → Settings → Networking
   - Click "Add Domain"
   - Enter your domain (e.g., `app.cargoflow.com`)
   - Add CNAME record to your DNS:
     ```
     CNAME app YOUR_RAILWAY_DOMAIN
     ```

2. **Update NEXT_PUBLIC_API_URL** if needed

## Troubleshooting

### Backend fails to start
- Check logs: Railway → Backend service → Deployments → Logs
- Verify DATABASE_URL is correct
- Ensure all dependencies are in `package.json`

### n8n webhooks not working
- Verify N8N_WEBHOOK_BASE in backend matches n8n domain
- Check n8n workflow is activated (green toggle)
- Test webhook URL: `curl https://YOUR_N8N_DOMAIN/webhook/generate-quote`

### Frontend can't connect to backend
- Verify NEXT_PUBLIC_API_URL matches backend domain
- Check CORS settings in backend
- Test backend health: `https://YOUR_BACKEND_DOMAIN/health`

### Airtable sync fails
- Verify Airtable credentials in n8n
- Check Base ID and Table names match
- Ensure typecast is enabled in Airtable nodes

## Environment Variables Reference

### Frontend
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://backend-production-xxxx.up.railway.app
```

### Backend
```
NODE_ENV=production
PORT=3001
DATABASE_URL=${{Postgres.DATABASE_URL}}
N8N_WEBHOOK_BASE=https://n8n-production-xxxx.up.railway.app
SHIPPO_TEST_TOKEN=shippo_test_YOUR_KEY
RESEND_API_KEY=re_YOUR_KEY
RESEND_FROM_EMAIL=onboarding@resend.dev
AIRTABLE_API_KEY=patYOUR_KEY
AIRTABLE_BASE_ID=appYOUR_BASE_ID
```

### n8n
```
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://n8n-production-xxxx.up.railway.app
N8N_EDITOR_BASE_URL=https://n8n-production-xxxx.up.railway.app
DB_TYPE=postgresdb
DB_POSTGRESDB_URL=${{Postgres.DATABASE_URL}}
EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
EXECUTIONS_DATA_SAVE_ON_ERROR=all
```

## Cost Estimation

Railway pricing (as of 2024):
- **Hobby Plan**: $5/month
  - Includes $5 usage credit
  - Pay for what you use beyond credit

- **Estimated monthly cost**:
  - PostgreSQL: ~$2-3
  - Backend: ~$2-3
  - Frontend: ~$2-3
  - n8n: ~$2-3
  - **Total**: ~$8-12/month

## Maintenance

### Update workflows
1. Export updated workflow from n8n
2. Save to `docs/n8n-workflows/`
3. Commit and push to GitHub

### Update code
```bash
git add .
git commit -m "Update feature"
git push origin main
```
Railway will auto-deploy on push.

### Monitor logs
- Railway Dashboard → Service → Deployments
- n8n → Executions tab

## Security Best Practices

1. **Use environment variables** for all secrets
2. **Enable Railway's Private Networking** between services
3. **Set up n8n basic auth** or restrict by IP
4. **Use HTTPS** for all public endpoints
5. **Rotate API keys** periodically

## Next Steps

- Set up monitoring (Railway metrics)
- Configure alerting (email/Slack)
- Add rate limiting
- Enable backup strategy for PostgreSQL
- Set up staging environment

---

**Deployment Complete!** 🎉

Your CargoFlow demo is now live at:
- Frontend: `https://YOUR_FRONTEND_DOMAIN`
- Backend: `https://YOUR_BACKEND_DOMAIN`
- n8n: `https://YOUR_N8N_DOMAIN`
