# CargoFlow - Logistics Automation Demo

Automated logistics workflow system powered by n8n, Shippo API, and Airtable CRM.

## Features

- 📦 Real-time shipping quotes from multiple carriers (Shippo API)
- 🏷️ Automated label purchasing
- 📧 Email notifications (Resend)
- 📊 CRM sync (Airtable)
- 🔄 n8n workflow automation
- 🎨 Modern React/Next.js UI

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Automation**: n8n
- **APIs**: Shippo (shipping), Resend (email), Airtable (CRM)

## Quick Start

### Local Development

```bash
# 1. Clone repository
git clone <your-repo-url>
cd CargoFlow

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example apps/backend/.env
cp .env.example apps/frontend/.env.local

# Edit the .env files with your API keys

# 4. Start infrastructure
npm run docker:postgres
npm run docker:n8n

# 5. Initialize database
npm run prisma:generate
cd packages/database && npx prisma db push

# 6. Start development servers
npm run dev
```

Visit:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- n8n: http://localhost:5678

### Deploy to Railway

See **[DEPLOY.md](./DEPLOY.md)** for step-by-step Railway deployment guide.

## Project Structure

```
CargoFlow/
├── apps/
│   ├── backend/          # NestJS API
│   │   ├── src/
│   │   └── nixpacks.toml # Railway config
│   └── frontend/         # Next.js UI
│       ├── src/
│       └── nixpacks.toml # Railway config
├── packages/
│   └── database/         # Prisma schema & migrations
├── docs/
│   ├── n8n-workflows/    # n8n workflow JSON files
│   └── architecture/     # System architecture docs
├── DEPLOY.md            # Railway deployment guide
└── .env.example         # Environment variables template
```

## Environment Variables

Required API keys:

- **Shippo**: Get test key at https://goshippo.com
- **Resend**: Get API key at https://resend.com
- **Airtable**: Create token at https://airtable.com/create/tokens

See `.env.example` for all variables.

## Workflows

Import n8n workflows from `docs/n8n-workflows/`:

1. **quote-generation-stage1.json** - Generate shipping quotes
2. **purchase-label.json** - Purchase shipping labels with Airtable sync
3. **payment-processing.json** - Handle Stripe payment webhooks
4. **shippo-tracking-webhook.json** - Process tracking updates

## API Endpoints

### Backend (NestJS)
- `POST /api/shipments/quote` - Get shipping quote
- `POST /api/shipments/:id/purchase-label` - Purchase label
- `POST /api/shipments/:id/mock-payment` - Simulate payment
- `GET /api/shipments` - List all shipments
- `GET /api/shipments/:id` - Get shipment details

### n8n Webhooks
- `POST /webhook/generate-quote` - Quote generation workflow
- `POST /webhook/purchase-label` - Label purchase workflow
- `POST /webhook/stripe-payment-webhook` - Payment processing
- `POST /webhook/shippo-tracking` - Tracking updates

## Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Build for production
npm run build

# Generate Prisma client
npm run prisma:generate

# Open Prisma Studio
cd packages/database && npm run db:studio
```

## Deployment

Deploy to Railway in minutes:

1. Push code to GitHub
2. Connect Railway to your repo
3. Add PostgreSQL database
4. Deploy Backend, Frontend, and n8n services
5. Import n8n workflows

See **[DEPLOY.md](./DEPLOY.md)** for complete guide.

## License

MIT

## Support

For issues and questions, see the [deployment guide](./DEPLOY.md) troubleshooting section.
