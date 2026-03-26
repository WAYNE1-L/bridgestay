# BridgeStay

**BridgeStay** is a PropTech platform connecting international students with verified housing near U.S. universities — starting with the University of Utah and Salt Lake City.

Unlike traditional rental platforms (Zillow, KSL Homes) that require a Social Security Number and U.S. credit history, BridgeStay lets international students apply using only their passport and I-20 documentation. The platform provides bilingual support (English/Chinese), admin-verified listings, AI-powered listing generation, and Stripe-based paid promotions for landlords.

> Originally developed as a University of Utah entrepreneurship competition submission (Tim Draper UEC 2026).

---

## Folder Structure

```
Bridgestay/
├── app/                     # Product source code (React + Express + TypeScript)
├── docs/                    # Project documentation, business plans, dev notes
├── research/                # Market research, scraped articles, housing data
├── scripts/                 # Python data pipeline and scraper tools
├── legal/                   # Platform-facing legal document templates
├── company/                 # BridgeStay LLC official records (LOCAL ONLY)
├── archive/                 # Deprecated files, exports, old lockfiles
├── .env.example             # Environment variable template
├── .gitignore               # Git exclusions
└── README.md                # This file
```

### `app/`

The full-stack web application. Built with:

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Wouter, tRPC client
- **Backend:** Express, tRPC, Drizzle ORM, MySQL
- **Auth:** Custom session-based auth with JWT (jose)
- **Storage:** AWS S3 for image uploads
- **Database:** Supabase (PostgreSQL) for live listings; MySQL for app data
- **Payments:** Stripe (checkout + webhooks)
- **AI:** OpenAI GPT-4o for listing extraction; Gemini for image generation

```
app/
├── client/src/
│   ├── components/    # Shared UI components
│   ├── pages/         # Route-level page components
│   ├── contexts/      # React contexts (Listings, Language, Theme)
│   ├── hooks/         # Custom React hooks
│   └── lib/           # Supabase client, tRPC, translations, utils
├── server/
│   ├── _core/         # Framework internals (tRPC, auth, vite, storage)
│   ├── routers.ts     # All tRPC API routes
│   ├── db.ts          # Database connection
│   ├── storage.ts     # S3 helpers
│   └── stripe/        # Stripe checkout, webhooks, products
├── shared/            # Types and constants shared by client + server
└── drizzle/           # DB schema, migrations, relations
```

### `docs/`

Internal project documentation. Not user-facing. Includes:

- `project-overview.docx` — high-level project overview
- `BridgeStay_Business_Model_UEC2026.md` — UEC 2026 competition business plan
- `BridgeStay_Video_Script_UEC2026.md` — 2-minute pitch video script
- `BridgeStay_Complete_Work_Archive.md` — full development history archive
- `dev-notes/` — debug logs, integration notes, test results, task history

### `research/`

Market research and background reading:

- `market_data.md` — TAM/SAM/SOM, SLC housing stats, UofU enrollment data
- `research-rentbottomline-intl-student-housing.md` — scraped article on intl student housing challenges
- `research-deseret-utah-intl-students-2025.md` — Deseret News article on Utah intl students

### `scripts/`

Python data pipeline tools for scraping and importing listings:

- `bridge_stay_pipeline.py` — V5.0 Selenium scraper for Xiaohongshu (小红书). Reads `links.txt`, extracts listing data with GPT-4o, saves to Supabase.
- `pipeline-v1.py` — V1.0 clean pipeline. Accepts raw text via stdin, extracts and saves to Supabase. No browser required.

Both scripts require environment variables to be set. See `.env.example`.

### `legal/`

Platform-facing legal document templates (not yet drafted):

- `terms-of-service/` — platform ToS for tenants and landlords
- `privacy-policy/` — data handling and international student privacy
- `lease-addendum/` — addendum replacing SSN requirement with passport/I-20 verification
- `landlord-agreement/` — verified landlord partner agreement template

### `company/`

**Local only — never committed to version control.**

Official BridgeStay LLC records: formation documents, IRS filings, tax documents.
See `.gitignore`. Do not push this folder to any remote repository.

### `archive/`

**Local only — never committed to version control.**

Deprecated files, old exports, and reference snapshots. Not needed for development.

---

## Running the App Locally

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- A Supabase project (free tier works)
- Optional: MySQL database, Stripe account, AWS S3 bucket

### Setup

```bash
# 1. Navigate to the app folder
cd app

# 2. Install dependencies
pnpm install

# 3. Copy environment template and fill in your values
cp ../.env.example .env
# Edit .env with your real keys

# 4. Push database schema
pnpm db:push

# 5. Start development server
pnpm dev
```

The app runs at `http://localhost:3000` by default.

### Running the scraper pipeline

```bash
cd scripts

# Install Python dependencies
pip install openai supabase python-dotenv selenium webdriver-manager

# Copy and fill in environment variables
cp ../.env.example .env

# V1 — pipe raw listing text directly:
echo "房源描述文本..." | python pipeline-v1.py

# V5 — batch scrape from links.txt (requires Chrome):
python bridge_stay_pipeline.py
```

---

## Environment Variables

All secrets are loaded from a `.env` file. **Never hardcode keys in source files.**

Copy `.env.example` to `.env` and fill in your values:

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o listing extraction |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase service role key (never expose client-side) |
| `STRIPE_SECRET_KEY` | Payments | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Payments | Stripe webhook signing secret |
| `AWS_ACCESS_KEY_ID` | Image upload | AWS credentials for S3 |
| `AWS_SECRET_ACCESS_KEY` | Image upload | AWS credentials for S3 |
| `AWS_REGION` | Image upload | S3 bucket region |
| `AWS_S3_BUCKET` | Image upload | S3 bucket name |
| `PORT` | Optional | Dev server port (default: 3000) |

---

## What Is Intentionally Excluded from GitHub

| Item | Reason |
|---|---|
| `company/` | Legal + tax + formation documents — sensitive, local only |
| `archive/` | Exports, old files, not needed for development |
| `.env` | Real secrets — use `.env.example` as the template |
| `app/node_modules/` | Installed dependencies — run `pnpm install` to restore |
| `app/.manus/` | Manus AI platform metadata — not source code |
| `app/.claude/` | Local IDE settings — not source code |
| `scripts/links.txt` | Xiaohongshu URLs with session tokens — sensitive |
| `scripts/*.png / *.jpg` | Raw scraper data captures — not source code |
| `*.pdf` | All PDFs (company documents) — sensitive |
| `*.log` | Debug and console logs — temporary |
| `package-lock.json` | npm lockfile conflict — project uses pnpm |

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui |
| Backend | Express, tRPC v11, Node.js |
| Database | Drizzle ORM + MySQL, Supabase (PostgreSQL) |
| Auth | Custom JWT session auth (jose) |
| Storage | AWS S3 |
| Payments | Stripe |
| AI | OpenAI GPT-4o, Google Gemini |
| Scraper | Python, Selenium, OpenAI GPT-4o |
| Deploy | — (not yet configured) |

---

## Status

Active development. Core platform features are complete (listings, search, admin review, AI generator, Stripe promotions, Supabase integration). Three items pending before production launch — see `docs/dev-notes/todo.md`.
