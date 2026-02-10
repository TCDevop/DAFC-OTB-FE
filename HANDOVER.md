# HANDOVER - DAFC OTB Platform (Full-Stack)

> **Khi quay lai, yeu cau Claude doc file nay de tiep tuc:**
> ```
> doc handover tiep tuc
> ```

---

## Cap nhat lan cuoi: 09/02/2026 (Session 10 - Node 22/24 Compatibility Fix)

---

## TONG QUAN DU AN

**DAFC OTB Platform** - He thong quan ly Open-to-Buy cho nganh thoi trang cao cap

| Thong tin | Chi tiet |
|-----------|----------|
| **Frontend** | Next.js 16.1.6, App Router, React 19 |
| **Styling** | Tailwind CSS v3, custom CSS variables |
| **Backend** | NestJS (rieng biet, port 4000) |
| **API Base** | `http://localhost:4000/api/v1` |
| **Dev Port** | `http://localhost:3006` |
| **Language** | Bilingual EN/VN with toggle |
| **Theme** | Dark/Light mode with CSS variables |

### Repositories

| Remote | URL | Note |
|--------|-----|------|
| **origin** | https://github.com/TCDevop/OTB.git | TCDevop (co lich su cu monorepo) |
| **dafc-otb** | https://github.com/nclamvn/dafc-otb.git | nclamvn - CLEAN (chi 95 files, 1 commit) |
| **dafc** | https://github.com/nclamvn/dafc.git | nclamvn mirror |
| **nclamvn** | https://github.com/nclamvn/DAFC-OTB-TCDATA.git | Legacy, khong dung nua |

> **Luu y:** `dafc-otb` la repo sach nhat — chi chua code Next.js, khong co file cu tu monorepo (`apps/`, `packages/`, `docs/`...).

### Demo Accounts

```
admin@dafc.com    / dafc@2026  (System Admin - full permissions)
buyer@dafc.com    / dafc@2026  (Buyer)
merch@dafc.com    / dafc@2026  (Merchandiser)
manager@dafc.com  / dafc@2026  (Merch Manager - L1 Approver)
finance@dafc.com  / dafc@2026  (Finance Director - L2 Approver)
```

---

## KIEN TRUC FRONTEND

```
DAFC-OTB-NextJS/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.jsx                # Root layout
│   │   ├── providers.jsx             # AuthProvider > LanguageProvider > AppProvider
│   │   ├── globals.css               # Theme CSS variables + component classes
│   │   ├── login/page.jsx            # Login route
│   │   └── (dashboard)/              # Protected routes (AuthGuard)
│   │       ├── layout.jsx            # Sidebar + AppHeader layout
│   │       ├── page.jsx              # / → HomeScreen
│   │       ├── budget-management/    # /budget-management
│   │       ├── planning/             # /planning → BudgetAllocateScreen
│   │       ├── otb-analysis/         # /otb-analysis
│   │       ├── proposal/             # /proposal → SKUProposalScreen
│   │       ├── tickets/              # /tickets
│   │       ├── approval-config/      # /approval-config
│   │       ├── approvals/            # /approvals (NEW Session 8)
│   │       ├── order-confirmation/   # /order-confirmation (NEW Session 8)
│   │       ├── receipt-confirmation/ # /receipt-confirmation (NEW Session 8)
│   │       ├── master-data/          # /master-data
│   │       ├── profile/              # /profile
│   │       ├── settings/             # /settings
│   │       └── dev-tickets/          # /dev-tickets
│   ├── screens/                      # 18 screen components (all 'use client')
│   │   ├── HomeScreen.jsx            # Dashboard KPI cards + alerts
│   │   ├── BudgetManagementScreen.jsx
│   │   ├── BudgetAllocateScreen.jsx
│   │   ├── OTBAnalysisScreen.jsx
│   │   ├── SKUProposalScreen.jsx
│   │   ├── TicketScreen.jsx
│   │   ├── TicketDetailPage.jsx
│   │   ├── PlanningDetailPage.jsx
│   │   ├── ProposalDetailPage.jsx
│   │   ├── ApprovalWorkflowScreen.jsx
│   │   ├── MasterDataScreen.jsx
│   │   ├── ProfileScreen.jsx
│   │   ├── SettingsScreen.jsx
│   │   ├── LoginScreen.jsx
│   │   ├── DevTicketScreen.jsx
│   │   ├── ApprovalsScreen.jsx          # (NEW Session 8)
│   │   ├── OrderConfirmationScreen.jsx  # (NEW Session 8)
│   │   └── ReceiptConfirmationScreen.jsx # (NEW Session 8)
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Sidebar.jsx           # Navigation sidebar (collapsible)
│   │   │   └── AppHeader.jsx         # Top header (search, dark mode, lang, notifications)
│   │   ├── Common/
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── ErrorMessage.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── BudgetModal.jsx
│   │   │   └── PlanningDetailModal.jsx
│   │   ├── AuthGuard.jsx             # Route protection
│   │   ├── BudgetAlertsBanner.jsx    # Premium alert banner
│   │   ├── RiskScoreCard.jsx         # AI risk assessment
│   │   ├── OtbAllocationAdvisor.jsx  # AI allocation advisor
│   │   ├── SkuRecommenderPanel.jsx   # AI SKU recommendations
│   │   ├── SizeCurveAdvisor.jsx      # AI size curve advisor
│   │   └── TicketKanbanBoard.jsx     # Kanban board
│   ├── contexts/
│   │   ├── AuthContext.js            # JWT auth (login, logout, user)
│   │   ├── LanguageContext.js        # Bilingual EN/VN with t() function
│   │   └── AppContext.js             # Shared state (darkMode, allocation data, etc.)
│   ├── services/
│   │   ├── api.js                    # Axios instance + JWT interceptor
│   │   ├── authService.js
│   │   ├── budgetService.js
│   │   ├── planningService.js
│   │   ├── proposalService.js
│   │   ├── masterDataService.js
│   │   ├── approvalService.js
│   │   ├── approvalWorkflowService.js
│   │   ├── aiService.js
│   │   └── index.js                  # Re-exports all services
│   ├── locales/
│   │   ├── en.js                     # English translations
│   │   ├── vi.js                     # Vietnamese translations
│   │   └── index.js
│   └── utils/
│       ├── routeMap.js               # screenId → URL mapping
│       └── formatters.js             # Currency, date formatters
└── public/
    └── dafc-logo.png
```

---

## KEY PATTERNS

### Services
```js
// api.js = Axios instance with JWT interceptor (NOT a service with methods)
// Domain services use: api.get('/endpoint') → response.data.data || response.data
```

### API Responses
```js
// May return { data: { data: [...] } } or { data: [...] } - always handle both
```

### Bilingual (i18n)
```js
const { t, language, setLanguage } = useLanguage();
// Usage: t('home.welcomeBack', { name: 'Admin' })
// Translations in src/locales/en.js and src/locales/vi.js
// Toggle on AppHeader + Settings page
// Persisted in localStorage
```

### Dark/Light Mode
```js
// CSS variables in globals.css (.light / .dark classes)
// All screens receive darkMode prop from AppContext
// Pattern: darkMode ? 'dark-classes' : 'light-classes'
```

### Premium Card Design
```js
// KPI/stat cards use gradient background + watermark icon pattern:
// - Diagonal gradient: linear-gradient(135deg, base 0%, base 60%, accentGrad 100%)
// - Large watermark icon: absolute -bottom-3 -right-3, size 80-90px, opacity 0.05
// - Icon badge: w-10 h-10 rounded-xl backdrop-blur-sm
// - Accent colors per card: gold, emerald, blue, rose, amber, teal, violet, indigo
// Applied in: HomeScreen, BudgetManagementScreen, TicketScreen, DevTicketScreen
```

### Color Palette
```
Dark Theme:
  #0A0A0A  - Background
  #121212  - Card background
  #1A1A1A  - Muted/input background
  #2E2E2E  - Borders
  #666666  - Muted text
  #999999  - Secondary text
  #F2F2F2  - Primary text
  #D7B797  - Brand gold (primary accent)
  #2A9E6A  - Success green
  #F85149  - Error red
  #E3B341  - Warning gold

Light Theme:
  #ffffff  - Card background
  #C4B5A5  - Borders (was border-[#2E2E2E]/20)
  #D4C8BB  - Light borders (was border-[#2E2E2E]/10)
  rgba(160,120,75,...) - Hover/accent backgrounds (was rgba(215,183,151,...))
```

---

## SESSION 06/02/2026 - Session 6

### Thay doi chinh

1. **Next.js Migration (tu CRA)**
   - CRA (reference): `/Users/mac/OTBDAFC/DAFC - OTB - App/`
   - Next.js 16, App Router, Tailwind v3, React 19
   - 16 routes (14 static + 2 dynamic), all build OK
   - AuthGuard bao ve dashboard routes
   - Cross-screen data: AppContext + sessionStorage

2. **Bilingual UI (EN/VN)**
   - LanguageContext with t() function, {{param}} interpolation
   - 500+ translated keys across 15 screens + components
   - Language toggle on AppHeader + Settings page
   - Persisted in localStorage, default: 'vi'
   - Missing key fallback: current lang → EN → raw key

3. **Premium Card Design**
   - KPI cards: gradient background + large watermark icon (80-90px)
   - 8 accent themes: gold, emerald, blue, rose, amber, teal, violet, indigo
   - Applied to HomeScreen (8 cards), BudgetManagement (3), Ticket (3), DevTicket (4)
   - BudgetAlertsBanner redesigned: glass-morphism, gradient badges, left accent bar
   - hover:shadow-lg, group-hover watermark scale animation

4. **Light Theme Contrast Fix**
   - CSS variables updated: stronger borders, pure white cards, saturated primary
   - Component-level light overrides: .light .ind-card, .ind-table, .kpi-card, etc.
   - Screen-level: border-[#2E2E2E]/20 → border-[#C4B5A5] (solid warm-tan)
   - Screen-level: rgba(215,183,151,...) → rgba(160,120,75,...) (deeper brown)
   - 11 screen files + AppHeader + globals.css updated

5. **Dark Blue Flash Fix**
   - AuthGuard.jsx: bg-[#0f172a] → bg-[#0A0A0A]
   - LoginScreen.jsx: Full palette conversion from slate to app dark theme

6. **Sidebar Enhancements**
   - All text bold (font-semibold for items, font-bold for headers/active)
   - Logo + brand name 120% larger when expanded (h-11, text-xs)
   - Header height 64px

### Files da cap nhat (39 files)

```
# New files
src/contexts/LanguageContext.js       # i18n context
src/locales/en.js                     # English translations
src/locales/vi.js                     # Vietnamese translations
src/locales/index.js                  # Re-export

# Modified - Layout & Components
src/app/globals.css                   # Theme variables + light mode overrides
src/app/providers.jsx                 # + LanguageProvider
src/components/AuthGuard.jsx          # Dark flash fix
src/components/BudgetAlertsBanner.jsx # Premium redesign
src/components/Layout/AppHeader.jsx   # Lang toggle + i18n + light fix
src/components/Layout/Sidebar.jsx     # i18n + bold text + larger logo
src/components/Common/*.jsx           # i18n translations
src/components/RiskScoreCard.jsx      # i18n
src/components/OtbAllocationAdvisor.jsx
src/components/SkuRecommenderPanel.jsx
src/components/SizeCurveAdvisor.jsx
src/components/TicketKanbanBoard.jsx

# Modified - Screens (all 15)
src/screens/*.jsx                     # i18n + light theme fix + premium cards
```

---

## PREVIOUS SESSIONS

### Session 5 (06/02/2026) - Frontend-Backend Integration
- All 7 phases completed: services connected to real API
- Removed all mock data fallbacks (except TicketDetailPage)
- HomeScreen/ProfileScreen use AuthContext user

### Session 4 (03/02/2026) - UI & Render Deployment
- AI button styling, dashboard welcome section
- Render deployment config (render.yaml)

### Session 3 (29/01/2026) - UI Design
- Watermark icon card design (original concept)
- Applied to 22 pages in monorepo version

### Session 2 (14/01/2026) - Backend Completion
- OTB Plans, SKU Proposals, Workflows, Analytics, Integrations modules
- Full API client, CI/CD, Docker config

---

## CONTEXTS (State Management)

### AuthContext.js
```js
const { user, loading, error, isAuthenticated, login, logout, hasPermission, hasAnyPermission, canApprove } = useAuth();
// login(email, password) - Async, sets user on success
// logout() - Clears tokens + state
// hasPermission('budget:write') - Check single permission
// canApprove(1) / canApprove(2) - Check L1/L2 approval permission
// Token: localStorage.accessToken, localStorage.refreshToken
// Auto-fetch user profile on mount
```

### AppContext.js
```js
const {
  darkMode, setDarkMode,                          // Dark/light theme
  sharedYear, setSharedYear,                       // Filter: fiscal year (default 2025)
  sharedGroupBrand, setSharedGroupBrand,           // Filter: group brand
  sharedBrand, setSharedBrand,                     // Filter: brand
  allocationData, setAllocationData,               // Cross-screen: planning data
  otbAnalysisContext, setOtbAnalysisContext,        // Cross-screen: OTB analysis
  skuProposalContext, setSkuProposalContext,        // Cross-screen: SKU proposal
  kpiData, setKpiData                              // Dashboard KPI values
} = useAppContext();
```

### LanguageContext.js
```js
const { language, setLanguage, t } = useLanguage();
// language: 'en' | 'vi' (default 'vi')
// t('home.welcomeBack', { name: 'Admin' }) - Translation with {{param}} interpolation
// Fallback: current lang → EN → raw key
// Persisted: localStorage.getItem('app-language')
// 758 lines per locale file, 500+ translation keys
```

---

## HOOKS (Domain Logic)

### useProposal.js
- State: `proposals`, `loading`, `error`, `showProposalDetail`, `selectedProposal`, `skuCatalog`
- Actions: `fetchProposals()`, `fetchSkuCatalog()`, `createProposal()`, `addProduct()`, `bulkAddProducts()`, `updateProduct()`, `removeProduct()`, `submitProposal()`, `approveProposal()`, `deleteProposal()`

### useBudget.js
- State: `selectedYear`, `selectedSeasonGroups`, `budgets`, `loading`, `error`, `brands`, `stores`, `seasons`
- Actions: `handleCellClick()`, `handleStoreAllocationChange()`, `handleSaveBudget()`, `submitBudget()`, `approveBudget()`
- Auto-fetches master data on mount, budgets on year change

### usePlanning.js
- State: `plannings`, `loading`, `error`, `collections`, `genders`, `categories`
- Actions: `handleOpenPlanningDetail()`, `handleSavePlanning()`, `submitPlanning()`, `approvePlanning()`, `markPlanningFinal()`, `copyPlanning()`

---

## SERVICES → API ENDPOINTS

### authService.js
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login → returns accessToken, refreshToken, user |
| POST | `/auth/refresh` | Refresh token |
| GET | `/auth/me` | Get current user profile |

### budgetService.js
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/budgets` | List (filters: fiscalYear, status, groupBrandId) |
| GET | `/budgets/statistics` | Budget stats |
| GET | `/budgets/:id` | Get one with details & approval history |
| POST | `/budgets` | Create with store allocations |
| PUT | `/budgets/:id` | Update (DRAFT only) |
| POST | `/budgets/:id/submit` | Submit for approval |
| POST | `/budgets/:id/approve/level1` | L1 approve/reject |
| POST | `/budgets/:id/approve/level2` | L2 approve/reject |
| DELETE | `/budgets/:id` | Delete (DRAFT only) |

### planningService.js
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/planning` | List (filters: budgetDetailId, budgetId, status) |
| GET | `/planning/:id` | Get with details & approvals |
| POST | `/planning` | Create for a budget detail |
| POST | `/planning/:id/copy` | Copy to new version |
| PUT | `/planning/:id` | Update (DRAFT) |
| PATCH | `/planning/:id/details/:detailId` | Update single detail |
| POST | `/planning/:id/submit` | Submit for approval |
| POST | `/planning/:id/approve/level1` | L1 approve/reject |
| POST | `/planning/:id/approve/level2` | L2 approve/reject |
| POST | `/planning/:id/final` | Mark as final version |
| DELETE | `/planning/:id` | Delete (DRAFT) |

### proposalService.js
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/proposals` | List (filters: budgetId, status) |
| GET | `/proposals/statistics` | Proposal stats |
| GET | `/proposals/:id` | Get with products & approvals |
| POST | `/proposals` | Create |
| PUT | `/proposals/:id` | Update (DRAFT) |
| POST | `/proposals/:id/products` | Add single product |
| POST | `/proposals/:id/products/bulk` | Bulk add products |
| PATCH | `/proposals/:id/products/:productId` | Update product |
| DELETE | `/proposals/:id/products/:productId` | Remove product |
| POST | `/proposals/:id/submit` | Submit |
| POST | `/proposals/:id/approve/level1` | L1 approve/reject |
| POST | `/proposals/:id/approve/level2` | L2 approve/reject |
| DELETE | `/proposals/:id` | Delete (DRAFT) |

### masterDataService.js
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/master/brands` | Group brands (FER, BUR, GUC, PRA) |
| GET | `/master/stores` | Stores (REX, TTP) |
| GET | `/master/collections` | Collections (Carry Over, New) |
| GET | `/master/genders` | Genders (Male, Female, Unisex) |
| GET | `/master/categories` | Full hierarchy: Gender → Category → SubCategory |
| GET | `/master/seasons` | Season config (SS/FW + Pre/Main) |
| GET | `/master/sku-catalog` | SKU catalog (query: search, productType, brandId, page, pageSize) |
| GET | `/master/sub-categories` | SubCategories (fallback: flatten from categories) |

### approvalWorkflowService.js
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/approval-workflow` | List steps (optional: brandId) |
| GET | `/approval-workflow/roles` | Available roles |
| GET | `/approval-workflow/brand/:brandId` | Workflow for a brand |
| POST | `/approval-workflow` | Create step |
| PATCH | `/approval-workflow/:id` | Update step |
| DELETE | `/approval-workflow/:id` | Delete step |
| POST | `/approval-workflow/brand/:brandId/reorder` | Reorder steps |

### aiService.js
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ai/size-curve/:category/:storeId` | AI size curve recommendation |
| POST | `/ai/size-curve/calculate` | Calculate size curve |
| POST | `/ai/size-curve/compare` | Compare user vs AI sizing |
| GET | `/ai/alerts` | Budget variance alerts |
| PATCH | `/ai/alerts/:id/read` | Mark alert read |
| POST | `/ai/alerts/check` | Trigger alert check |
| POST | `/ai/allocation/generate` | Generate OTB allocation |
| GET | `/ai/allocation/:budgetDetailId` | Get recommendations |
| POST | `/ai/allocation/:budgetDetailId/apply` | Apply recommendations |
| POST | `/ai/risk/assess/:entityType/:entityId` | Calculate risk score |
| GET | `/ai/risk/:entityType/:entityId` | Get risk assessment |
| POST | `/ai/sku-recommend/generate` | Generate SKU recommendations |
| GET | `/ai/sku-recommend/:budgetDetailId` | Get SKU recommendations |
| PATCH | `/ai/sku-recommend/:id/status` | Mark selected/rejected |

---

## BACKEND (NestJS)

### Location & Tech
```
/Users/mac/OTBDAFC/DAFC-Backend/dafc-otb-backend/
├── src/
│   ├── main.ts                          # Bootstrap + Swagger
│   ├── app.module.ts                    # Root (7 feature modules)
│   ├── prisma/                          # Prisma service
│   ├── common/guards/                   # jwt-auth.guard, permissions.guard
│   └── modules/
│       ├── auth/                        # Login, JWT, refresh
│       ├── master-data/                 # Brands, stores, SKU catalog
│       ├── budget/                      # Budget CRUD + 2-level approval
│       ├── planning/                    # Planning versions + dimensions
│       ├── proposal/                    # Flat proposal products
│       ├── ai/                          # Size curve, alerts, allocation, risk, SKU
│       └── approval-workflow/           # Workflow config per brand
├── prisma/
│   ├── schema.prisma                    # 29 tables
│   ├── seed.ts                          # Default users + master data
│   └── seed-rich.ts                     # Rich seed data
├── docker-compose.yml                   # PostgreSQL 16
└── package.json
```

### Database (PostgreSQL 16)
- Docker: `dafc-otb-db` container, port 5432
- Creds: user=`dafc`, password=`dafc2026`, db=`dafc_otb`
- ORM: Prisma 5.8.0, 29 tables

### Prisma Schema Summary

**Auth & RBAC:**
- `users` - accounts with role_id, store_access, brand_access
- `roles` - roles with JSON permissions array (`*` = admin)

**Master Data:**
- `group_brands` - FER, BUR, GUC, PRA with color config
- `stores`, `collections`, `genders`, `categories`, `sub_categories`
- `sku_catalog` - products with sku_code, product_name, srp, brand_id

**Budget (3 tables):**
- `budgets` - by GroupBrand × SeasonGroup × SeasonType × FiscalYear
- `budget_details` - store allocations (Budget → Store)
- `budget_alerts` - variance alerts

**Planning (2 tables):**
- `planning_versions` - version per BudgetDetail with isFinal flag
- `planning_details` - dimension allocation (collection/gender/category) with metrics

**Proposal (3 tables):**
- `proposals` - flat structure (no rails)
- `proposal_products` - SKU + orderQty + costings
- `product_allocations` - per-store quantity

**Approval & Audit:**
- `approvals` - polymorphic (budget/planning/proposal), level, action, comment
- `audit_logs` - entity changes with user_id, changes JSON

**AI Module (7+ tables):**
- `sales_history`, `size_curve_recommendations`, `budget_snapshots`
- `allocation_recommendations`, `risk_assessments`, `risk_thresholds`
- `sku_performance`, `attribute_trends`, `sku_recommendations`
- `approval_workflow_steps`

### Authentication Flow
```
1. POST /auth/login → accessToken (8h) + refreshToken (7d)
2. Request interceptor → Bearer token from localStorage
3. On 401 → Try POST /auth/refresh → new accessToken → retry
4. On refresh fail → clear tokens → redirect /login
5. Permission-based RBAC: budget:read, budget:write, budget:approve_l1, etc.
6. Admin has wildcard '*' permission
```

### Status Workflow (Budget / Planning / Proposal)
```
DRAFT → SUBMITTED → LEVEL1_APPROVED → APPROVED
                  ↘                 ↗
                    → REJECTED ←
```

### API Response Format
```json
// Success
{ "success": true, "data": { ... }, "message": "..." }

// Paginated
{ "success": true, "data": [...], "total": 100, "page": 1, "pageSize": 20 }

// Error
{ "statusCode": 400, "message": "Error", "error": "Bad Request" }
```

---

## ENVIRONMENT VARIABLES

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### Backend (.env)
```
DATABASE_URL="postgresql://dafc:dafc2026@localhost:5432/dafc_otb?schema=public"
JWT_SECRET="change-this-to-a-random-64-char-string-in-production"
PORT=4000
CORS_ORIGIN="http://localhost:3000"
```

---

## COMMANDS

```bash
# === FRONTEND (DAFC-OTB-NextJS/) ===
npm run dev              # Start dev server (port 3006)
npm run build            # Production build
npm run start            # Start production server (standalone)
npm run lint             # ESLint

# === BACKEND (DAFC-Backend/dafc-otb-backend/) ===
docker compose up -d     # Start PostgreSQL
npm install
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run DB migrations
npm run prisma:seed      # Seed default data + users
npm run prisma:studio    # Open Prisma Studio (GUI)
npm run start:dev        # Start NestJS dev (port 4000)

# Swagger docs: http://localhost:4000/api/docs

# === GIT (4 remotes) ===
git push origin main     # Push to TCDevop/OTB
git push dafc-otb main   # Push to nclamvn/dafc-otb (primary)
git push dafc main       # Push to nclamvn/dafc
git push nclamvn main    # Push to nclamvn/DAFC-OTB-TCDATA (legacy)
```

### Full Startup Sequence
```bash
# 1. Start database
cd "/Users/mac/OTBDAFC/DAFC-Backend/dafc-otb-backend"
docker compose up -d

# 2. Start backend
npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed
npm run start:dev
# API ready at http://localhost:4000/api/v1

# 3. Start frontend (new terminal)
cd "/Users/mac/OTBDAFC/DAFC-OTB-NextJS"
npm run dev
# App ready at http://localhost:3006
```

---

## DEPENDENCIES

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.1.6 | Framework |
| react | 19.2.3 | UI Library |
| axios | 1.13.4 | HTTP client |
| tailwindcss | 3.4.19 | Styling |
| lucide-react | 0.563.0 | Icons |
| recharts | 3.7.0 | Charts |
| react-hot-toast | 2.6.0 | Notifications |

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| @nestjs/* | 10.3.0 | Framework |
| @prisma/client | 5.8.0 | ORM |
| passport + @nestjs/jwt | — | Auth (JWT) |
| bcryptjs | — | Password hashing |
| class-validator | — | DTO validation |
| helmet | — | HTTP security headers |
| @nestjs/swagger | — | API documentation |

---

## SESSION 09/02/2026 - Session 10

### Thay doi chinh

1. **Node 22/24 Compatibility Fix**
   - `next.config.mjs`: Xoa `eslint`, `typescript`, `experimental` keys (deprecated Next.js 15)
   - Them `transpilePackages: []` va `logging.fetches.fullUrl` cho Node 22/24
   - Xoa `env.NEXT_PUBLIC_API_URL` (Next.js tu dong expose NEXT_PUBLIC_* vars)

2. **Standalone Server (thay the custom server.js)**
   - Xoa `server.js` — khong tuong thich voi `output: 'standalone'`
   - `npm run start` → `node .next/standalone/server.js` (built-in server)
   - `npm run start:azure` → `node azure-startup.js` (Azure wrapper)

3. **Cross-platform Scripts (thay the bash)**
   - Xoa `postbuild.sh`, `startup.sh` (bash — khong cross-platform)
   - `scripts/copy-assets.js` — Node.js script copy public/ va .next/static/ vao standalone
   - `azure-startup.js` — Azure startup: copy assets + spawn standalone server
   - `package.json`: `postbuild: node scripts/copy-assets.js` (tu dong chay sau build)

4. **Engine & Config Updates**
   - `engines.node`: `>=18.0.0 <25.0.0` → `>=20.0.0`
   - `.nvmrc`: `20` → `22`
   - `.npmrc`: Them `fetch-retries`, `fetch-retry-mintimeout`, `fetch-retry-maxtimeout`
   - `version`: `0.1.0` → `1.0.0`

### Build Verification
- 17 static + 3 dynamic routes (20 total), compiled 3.6s, 0 errors
- Standalone server: Ready in 54ms, HTTP 200 confirmed
- postbuild auto-copies public/ va .next/static/

### Azure Portal Configuration (UPDATED)
```
Frontend App Service:
  Stack: Node 22 LTS (hoac 24)        ← THAY DOI (khong dung Node 20)
  Startup Command: node .next/standalone/server.js
  PORT = 8080
  WEBSITES_PORT = 8080
  NODE_ENV = production
  NEXT_PUBLIC_API_URL = https://[backend-url]/api/v1
```

### Files da tao/cap nhat (9 files)
```
# New files
scripts/copy-assets.js                    # Cross-platform asset copy (Node.js)
azure-startup.js                          # Azure startup wrapper

# Modified files
next.config.mjs                           # Remove deprecated keys, add transpilePackages/logging
package.json                              # New scripts, engines >=20.0.0, version 1.0.0
package-lock.json                         # Updated
.nvmrc                                    # 20 → 22
.npmrc                                    # Added retry settings

# Deleted files
server.js                                 # Custom server (replaced by standalone)
postbuild.sh                              # Bash script (replaced by scripts/copy-assets.js)
startup.sh                                # Bash script (replaced by azure-startup.js)
```

---

## SESSION 09/02/2026 - Session 9

### Thay doi chinh

1. **Fix Frontend Azure Deployment (`sh: 1: next: not found`)**
   - `server.js`: Viet lai hoan toan — dung `next()` truc tiep thay vi require standalone
   - `package.json`: Scripts moi — `start: node server.js`, `start:standalone`, `start:next`, `postinstall`
   - `next.config.mjs`: Them `env.NEXT_PUBLIC_API_URL`, `experimental: {}`
   - `.npmrc`: Tao moi — `legacy-peer-deps=true`, `auto-install-peers=true`
   - `.env.production`: Tao moi — placeholder cho Azure

2. **Fix Backend Deployment (`Cannot find module '@nestjs/config'`)**
   - `package.json`: Them `@nestjs/config@^4.0.3`
   - `app.module.ts`: Them `ConfigModule.forRoot({ isGlobal: true })` lam import dau tien
   - `start:prod`: Fix path `node dist/main` → `node dist/src/main` (do tsconfig outDir)
   - `.npmrc`: Tao moi — `legacy-peer-deps=true` (fix swagger v11 peer dep conflict)

3. **Build Verification**
   - Frontend: 17 static + 3 dynamic routes, `.next/standalone/server.js` ton tai
   - Backend: Build thanh cong, `dist/src/main.js` ton tai

### Azure Portal Configuration (UPDATED)
```
Frontend App Service:
  Stack: Node 20 LTS
  Startup Command: node server.js        ← THAY DOI (khong dung bash startup.sh)
  PORT = 3000
  WEBSITES_PORT = 3000
  NODE_ENV = production
  NEXT_PUBLIC_API_URL = https://[backend-url]/api/v1

Backend App Service:
  Stack: Node 20 LTS
  Startup Command: node dist/src/main.js  ← THAY DOI (khong phai dist/main.js)
  PORT = 3000
  NODE_ENV = production
  DATABASE_URL = [postgresql-connection-string]
  JWT_SECRET = [your-secret]
  JWT_EXPIRES_IN = 7d
```

### Files da tao/cap nhat (8 files)
```
# New files
.npmrc                                    # npm config (legacy-peer-deps)
.env.production                           # Production env placeholder

# Modified files
server.js                                 # Rewritten: proper Next.js custom server
package.json                              # New scripts for Azure
next.config.mjs                           # Added env, experimental
backend/package.json                      # +@nestjs/config, fix start:prod path
backend/src/app.module.ts                 # +ConfigModule.forRoot()

# Also updated (standalone backend copy)
/Users/mac/otbdafc/DAFC-Backend/dafc-otb-backend/  # Same changes applied
```

---

## SESSION 08/02/2026 - Session 8

### Thay doi chinh

1. **100% Migration - 3 man hinh moi**
   - `ApprovalsScreen.jsx` - Phe duyet: bang, filter (entity type/level), approve/reject modal voi comment
   - `OrderConfirmationScreen.jsx` - Xac nhan don hang: KPI cards, bang PO, confirm/cancel workflow
   - `ReceiptConfirmationScreen.jsx` - Xac nhan bien nhan: KPI cards, bang receipt, flag discrepancy
   - 3 route pages: `/approvals`, `/order-confirmation`, `/receipt-confirmation`
   - routeMap.js: 3 entries moi (ROUTE_MAP + PATHNAME_TO_SCREEN)
   - i18n: 105+ translation keys moi (EN + VI) cho 3 man hinh

2. **Azure App Services Deployment Config**
   - `next.config.mjs`: `output: 'standalone'`, `images.unoptimized`, ignore TS/ESLint
   - `server.js`: Custom server cho Azure (port tu env, fallback logic)
   - `startup.sh`: Bash script copy static assets → start standalone server
   - `package.json`: `start:azure` script, `postbuild` copy assets, `engines: node >=18 <25`
   - `.nvmrc`: Node 20 LTS
   - `.env.example`: Huong dan cau hinh Azure

3. **Build & Infrastructure**
   - tsconfig.json: exclude `backend` directory fix build error
   - 20 routes total (17 static + 3 dynamic), 18 screens
   - Standalone build: `.next/standalone/server.js` + `public/` + `.next/static/`

4. **Backend Security Fix**
   - npm audit fix: 10 vulnerabilities → 0 vulnerabilities
   - @nestjs/cli: ^10.3.0 → ^11.0.16
   - @nestjs/swagger: ^7.2.0 → ^11.2.6

### Azure Portal Configuration
```
General Settings:
  Stack: Node
  Major version: 20 LTS (KHONG dung 24)
  Startup Command: bash startup.sh

Application Settings:
  PORT = 3000
  WEBSITES_PORT = 3000
  NODE_ENV = production
  NEXT_PUBLIC_API_URL = https://your-backend.azurewebsites.net/api/v1
```

### Files da tao/cap nhat (16 files)
```
# New files
.nvmrc                                        # Node 20
server.js                                     # Custom server cho Azure
startup.sh                                    # Azure startup script
src/screens/ApprovalsScreen.jsx               # Approvals screen
src/screens/OrderConfirmationScreen.jsx       # Order Confirmation screen
src/screens/ReceiptConfirmationScreen.jsx     # Receipt Confirmation screen
src/app/(dashboard)/approvals/page.jsx        # Route page
src/app/(dashboard)/order-confirmation/page.jsx
src/app/(dashboard)/receipt-confirmation/page.jsx

# Modified files
next.config.mjs                               # standalone output
package.json                                  # azure scripts, engines
tsconfig.json                                 # exclude backend
src/utils/routeMap.js                         # 3 new routes
src/locales/en.js                             # 105+ new keys
src/locales/vi.js                             # 105+ new keys
.env.example                                  # Azure config guide
```

---

## SESSION 07/02/2026 - Session 7

### Thay doi chinh

1. **Full-Stack Handover Documentation**
   - Bo sung toan bo Backend API documentation (7 modules, 60+ endpoints)
   - Document Database schema (Prisma, 29 tables)
   - Document Authentication flow + RBAC permissions
   - Bo sung Contexts, Hooks documentation chi tiet
   - Services → API endpoints mapping table day du
   - Environment variables, startup sequence, dependencies
   - Swagger docs URL: `http://localhost:4000/api/docs`

---

## REMAINING ITEMS

- [x] ~~3 missing screens (Approvals, Order Confirm, Receipt Confirm)~~ → Done Session 8
- [x] ~~Azure deployment config~~ → Done Session 8
- [x] ~~Backend security vulnerabilities~~ → 0 vulnerabilities (Session 8)
- [ ] TicketDetailPage.jsx still has MOCK_SKU_DATA and MOCK_DETAIL_DATA (fallback)
- [ ] Azure Portal manual config (Node 22 LTS, `node .next/standalone/server.js` / `node dist/src/main.js`, env vars)
- [ ] E2E testing (test suite co san, chua chay)
- [ ] Performance tuning
- [ ] Mobile responsive testing

---

## GHI CHU CHO CLAUDE

Khi doc file nay:
1. **Frontend**: `/Users/mac/OTBDAFC/DAFC-OTB-NextJS/`
2. **Backend**: `/Users/mac/OTBDAFC/DAFC-Backend/dafc-otb-backend/`
3. **API**: `http://localhost:4000/api/v1` | Swagger: `http://localhost:4000/api/docs`
4. **Database**: PostgreSQL via Docker (port 5432, user=dafc, db=dafc_otb)
5. Tat ca screen la `'use client'` components
6. i18n dung `useLanguage()` hook, translations tai `src/locales/`
7. Dark/light mode qua `darkMode` prop + CSS variables
8. Premium cards: gradient + watermark icon pattern (xem HomeScreen lam mau)
9. 2-level approval: DRAFT → SUBMITTED → L1_APPROVED → APPROVED
10. Permissions: `budget:read`, `budget:write`, `budget:approve_l1`, `budget:approve_l2`, etc.

---

*Cap nhat file nay sau moi session lam viec quan trong*
