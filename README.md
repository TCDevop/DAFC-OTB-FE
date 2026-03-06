# DAFC OTB Platform — Full-Stack

He thong quan ly Open-To-Buy (OTB) cho DAFC. **Frontend** (Next.js 16) + **Backend** (NestJS) trong cung 1 repo.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js (App Router) | 16.1.6 |
| UI Library | React | 19.x |
| Styling | Tailwind CSS | 3.4.x |
| Icons | lucide-react | latest |
| Charts | Recharts | 3.7.x |
| HTTP Client | Axios | 1.13.x |
| **Backend** | NestJS | 10.3.x |
| ORM | Prisma | 5.8.x |
| Database | SQL Server | Azure SQL |
| Auth | JWT (Passport) + Azure AD (MSAL) | — |

## Cau truc thu muc

```text
dafc-otb/
├── frontend/              # FRONTEND (Next.js 16, React 19)
│   ├── src/app/           # App Router routes (19 routes)
│   ├── src/components/    # UI components (Layout, Common, AI)
│   ├── src/contexts/      # AuthContext, AppContext, LanguageContext
│   ├── src/hooks/         # useDataImport, useKPIBreakdown, useNetworkStatus...
│   ├── src/services/      # API services (14 files)
│   ├── src/locales/       # i18n EN/VN translations
│   └── src/utils/         # Formatters, constants, routeMap
├── backend/               # BACKEND (NestJS)
│   ├── src/modules/       # 9 API modules
│   │   ├── auth/          # Login, JWT, refresh token
│   │   ├── budget/        # Budget CRUD + 2-level approval
│   │   ├── planning/      # Planning versions + dimensions
│   │   ├── proposal/      # SKU proposals + products
│   │   ├── master-data/   # Brands, stores, categories, SKU catalog
│   │   ├── ai/            # Size curve, alerts, allocation, risk, SKU recommend
│   │   ├── approval-workflow/ # Workflow config per brand
│   │   ├── ticket/        # Ticket management
│   │   └── health/        # Health check
│   ├── prisma/            # DB schema (35 tables, SQL Server) + seed
│   └── docker-compose.yml # PostgreSQL 16 (legacy, not used with SQL Server)
├── public/                # Static assets
└── package.json           # Frontend dependencies
```

## Quick Start

### 1. Start Backend (NestJS - port 4001)

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed       # Tao demo accounts + master data
npm run start:dev
```

> API: `http://<HOST>:<PORT>/api/v1`
> Swagger: `http://<HOST>:<PORT>/api/docs`

### 2. Start Frontend (Next.js - port 3000)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

> App: `http://<HOST>:3000`

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@dafc.com | dafc@2026 | System Admin |
| buyer@dafc.com | dafc@2026 | Buyer |
| merch@dafc.com | dafc@2026 | Merchandiser |
| manager@dafc.com | dafc@2026 | Merch Manager (L1 Approver) |
| finance@dafc.com | dafc@2026 | Finance Director (L2 Approver) |

## Frontend Routes

| URL | Mo ta |
|-----|-------|
| `/login` | Dang nhap |
| `/` | Dashboard KPI |
| `/budget-management` | Quan ly ngan sach |
| `/planning` | Phan bo ngan sach |
| `/planning/[id]` | Chi tiet ke hoach |
| `/otb-analysis` | Phan tich OTB |
| `/proposal` | De xuat SKU |
| `/proposal/[id]` | Chi tiet de xuat |
| `/tickets` | Danh sach ticket |
| `/tickets/[id]` | Chi tiet ticket |
| `/approvals` | Danh sach duyet |
| `/approval-config` | Cau hinh duyet |
| `/import-data` | Import du lieu |
| `/order-confirmation` | Xac nhan don hang |
| `/receipt-confirmation` | Xac nhan nhan hang |
| `/dev-tickets` | Dev tickets |
| `/profile` | Ho so ca nhan |
| `/settings` | Cai dat |
| `/master-data/[type]` | Master data |

## Backend API (port 4001)

| Module | Base Path | Endpoints |
|--------|-----------|-----------|
| Auth | `/auth` | login, refresh, me |
| Budget | `/budgets` | CRUD + submit + approve L1/L2 |
| Planning | `/planning` | CRUD + copy + submit + approve + finalize |
| Proposal | `/proposals` | CRUD + products + bulk + submit + approve |
| Master Data | `/master` | brands, stores, collections, categories, SKU catalog |
| AI | `/ai` | size-curve, alerts, allocation, risk, sku-recommend |
| Approval Workflow | `/approval-workflow` | CRUD + reorder per brand |
| Ticket | `/tickets` | Ticket management |
| Health | `/health` | Health check |

## Environment Variables

### Frontend (frontend/.env)

```text
NEXT_PUBLIC_API_URL=http://<your-host-ip>:4001/api/v1
NEXT_PUBLIC_AZURE_CLIENT_ID=<azure-client-id>
NEXT_PUBLIC_AZURE_TENANT_ID=<azure-tenant-id>
```

### Backend (backend/.env)

```text
DATABASE_URL="sqlserver://host:1433;database=dbname;user=...;password=...;encrypt=true;trustServerCertificate=true"
JWT_SECRET="your-secret-key"
HOST="<your-host-ip>"
PORT=4001
CORS_ORIGINS="http://localhost:3000,http://<your-host-ip>:3000,http://<your-host-ip>:4001"
```

## Approval Workflow

```text
DRAFT -> SUBMITTED -> LEVEL1_APPROVED -> APPROVED
                   \                  /
                    -> REJECTED <-
```

- **L1**: Merch Manager duyet
- **L2**: Finance Director duyet
- Ap dung cho: Budget, Planning, Proposal
