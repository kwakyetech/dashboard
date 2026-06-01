# AeroLedger AI - SaaS Financial Management & AI Reporting Platform

AeroLedger AI is a premium SaaS dashboard tailored for accounting firms to manage client portfolios, automate bookkeeping workflows, and generate AI-narrated financial statements. The platform features secure Paystack billing, Neon PostgreSQL database synchronization, and resilient Claude 3.5 Sonnet financial analysts.

---

## 🚀 Key Features

### 1. Multi-Company Client Management
*   **Firm Isolation**: Multi-tenant structure isolating accounting firms, their staff, and client portfolios.
*   **Role-Based Access Control (RBAC)**: Supports roles (`ADMIN`, `STAFF`, `CLIENT`). Only administrators see and edit billing configurations.

### 2. Intelligent Transaction Categorization
*   **Ledger File Processing**: Upload raw transaction lists in CSV/Excel formats for specific companies.
*   **AI Auto-Categorization**: Leverages **Claude 3.5 Sonnet** to evaluate transaction descriptions and map them to correct account tags (e.g., travel, utilities, payroll, legal) with confidence metrics.
*   **Keyword Fallback Engine**: If no API key is set or the request fails, the application falls back to a rules-based classification algorithm to prevent runtime disruptions.

### 3. AI-Narrated Financial Statements (The 4 Core Statements)
Synthesize client company ledgers over custom date ranges into clean, printable tabular sheets accompanied by AI analysis:
1.  **Income Statement (Profit & Loss)**: Tracks revenue sources, operating expenses, and net profit margins.
2.  **Balance Sheet**: Standard ledger format checking total assets against liabilities and equity.
3.  **Cash Flow Statement**: Reconciles beginning and ending cash flows across operating, investing, and financing divisions.
4.  **Statement of Shareholders' Equity**: Visualizes equity changes, capital additions, and distributions.

*   **AI Commentary**: Claude Sonnet analyzes the generated balances to write a **3-paragraph Executive Commentary** and **3-5 Key Insights** in Ghanaian Cedis (`GH₵`).
*   **Print to PDF**: Built-in styling optimizations for clean print outputs or saving as PDFs.

### 4. Paystack Subscription System
*   **Plan Upgrades**: Allows admins to upgrade the firm's tier from Free to **Pro (GH₵150/mo)** or **Enterprise (GH₵390/mo)**.
*   **Paystack Checkout**: Secure billing initializer redirecting to Mobile Money (MoMo) or card entry portals.
*   **Signature-Verified Webhooks**: Webhook listener verifying `x-paystack-signature` using HMAC-SHA512 to securely adjust firm subscription statuses and rolling 30-day expiry dates.

---

## 🛠️ Technology Stack

*   **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Lucide icons, glassmorphism design tokens.
*   **Backend**: Next.js Server Actions and Route Handlers.
*   **Database & ORM**: PostgreSQL hosted on **Neon**, mapped through **Prisma ORM**.
*   **AI Engine**: Anthropic Claude 3.5 Sonnet Messages API.
*   **Payment Gateway**: Paystack API integration (GH₵ sub-unit pesewa transactions).

---

## ⚙️ Project Structure

```
├── prisma/
│   └── schema.prisma         # Database models (User, Firm, Company, Transaction, Report)
├── src/
│   ├── app/
│   │   ├── (dashboard)/      # Dashboard pages (Companies list, transactions, reports, payroll)
│   │   ├── api/
│   │   │   ├── billing/      # Paystack checkout initialize & webhook routes
│   │   │   └── companies/    # Company, transactions, and report CRUD API endpoints
│   │   ├── login/
│   │   └── signup/
│   ├── context/
│   │   ├── AuthContext.tsx    # Firm user session provider
│   │   └── CompanyContext.tsx # Selected active company provider
│   ├── lib/
│   │   ├── claude.ts         # Claude prompt templates and report fallback logic
│   │   ├── db.ts             # Prisma DB client singleton
│   │   └── format.ts         # GHS/USD currency and formatting utilities
└── .env                      # Local secret environment variables
```

---

## 🛠️ Step-by-Step Setup Guide

### 1. Database Provisioning (Neon)
1. Sign up on [Neon Console](https://neon.tech) and create a new PostgreSQL database.
2. In your local `.env` file, set your connection string:
   ```env
   DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@YOUR_HOST/neondb?sslmode=require"
   ```
3. Push the schema to sync tables:
   ```bash
   npx prisma db push
   ```

### 2. Environment Configurations
Configure the following keys in your `.env` (and in your Vercel Environment Variables for production):
```env
# Database Connection
DATABASE_URL="postgresql://..."

# Session Signatures
NEXTAUTH_SECRET="your-32-character-secret-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000" # Use https://aeroledger.vercel.app for production

# Anthropic Claude Integration
ANTHROPIC_API_KEY="sk-ant-..."
CLAUDE_MODEL="claude-3-5-sonnet-20241022"

# Paystack API Keys
PAYSTACK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_test_..."
```

### 3. Start Local Environment
Install dependencies and run the development server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Deploying to Vercel
1. Push your code to your GitHub repository.
2. Import the project in Vercel.
3. Configure the Environment Variables listed in step 2.
4. Set up the webhook URL on your Paystack Dashboard under **Settings > API Keys & Webhooks**:
   ```
   https://your-vercel-domain.vercel.app/api/billing/webhook
   ```

---

## 🧪 Testing and Verification
*   **Local Checks**: Test transactions are available in Paystack's dashboard test mode. Upgrading plans will redirect to standard Paystack mobile money test simulators.
*   **Compile Build**: Run `npm run build` to verify standard TypeScript typings and route endpoints compile successfully.
