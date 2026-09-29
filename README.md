# 🏦 FinFlow – Next-Gen Banking & Financial Management Dashboard

[![CI Pipeline](https://github.com/amitbuilds18/banking-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/amitbuilds18/banking-dashboard/actions/workflows/ci.yml)
[![Live Frontend](https://img.shields.io/badge/Live-Vercel%20App-00D924?style=flat&logo=vercel)](https://banking-dashboard-dw4o.vercel.app/)
[![API Health](https://img.shields.io/badge/Backend-Healthy-blue?style=flat&logo=express)](https://banking-dashboard-anuc.vercel.app/api/health)

A modern, high-performance full-stack digital banking web application with peer-to-peer money transfers, QR payments, utility bill pay, 4-digit security MPIN authentication, savings vaults, virtual card management, and an automated GitHub Actions CI/CD pipeline.

---

## 🌐 Live Production Links

- **Live Web Application**: [https://banking-dashboard-dw4o.vercel.app/](https://banking-dashboard-dw4o.vercel.app/)
- **Live API Endpoint**: [https://banking-dashboard-anuc.vercel.app/api](https://banking-dashboard-anuc.vercel.app/api)
- **Database & Health Check**: [https://banking-dashboard-anuc.vercel.app/api/health](https://banking-dashboard-anuc.vercel.app/api/health)

---

## 🚀 Key Features

- **🔐 4-Digit Security MPIN**:
  - Bank-grade secondary security PIN requirement on all outgoing fund transfers and bill payments.
  - Setup and update MPIN directly from User Profile with cryptographic validation.
- **⚡ Instant Money Transfers & Multi-Modal QR Scanner**:
  - Live recipient lookup by account number or email.
  - Personal QR Code generator with one-click PNG download.
  - Live camera scanner, gallery QR upload, and demo quick-fill shortcuts.
- **💡 Utility Bill Payments & Recharges**:
  - Pay Electricity, Mobile Recharges, Broadband, and Water bills.
  - Instant balance deduction and transaction ledger updates.
- **💳 Smart Virtual Cards**:
  - Dynamic card freezing/unfreezing and spending limit management.
  - Sensitive details (CVV and full 16-digit card number) protected with a 10-second auto-mask timer.
- **💰 Savings Goal Vaults**:
  - Create dedicated vaults (Emergency, Car, Vacation) with visual progress meters and instant deposit/withdrawal.
- **📊 Financial Analytics & AI Insights**:
  - Dynamic spending breakdown by category and monthly cashflow charts using Recharts.
- **🛡️ Hardened Cloud Database**:
  - Connected to Neon PostgreSQL with serverless connection pooling, graceful reconnects, and rate limiting.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Tailwind CSS v4, Vite 8, React Router v7, Recharts, `html5-qrcode`, `qrcode` |
| **Backend** | Node.js 20, Express 5, PostgreSQL (`pg`), JWT, `bcrypt`, Stripe SDK, `pdfkit` |
| **CI / CD** | GitHub Actions (automated syntax & bundle build gate), Vercel (continuous deployment) |
| **Database** | Neon Serverless PostgreSQL with SSL connection pooling |

---

## 🔄 CI/CD Pipeline Architecture

Every commit and pull request to the `main` branch automatically triggers the `.github/workflows/ci.yml` pipeline:

```
[ Git Push / Pull Request ]
            │
            ▼
┌───────────────────────────────────────┐
│     GitHub Actions Cloud Runner       │
├───────────────────┬───────────────────┤
│    Backend CI     │    Frontend CI    │
│  - npm ci         │  - npm ci         │
│  - Syntax Check   │  - Vite Build     │
│  - 22 JS Modules  │  - React 19 Bundle│
└─────────┬─────────┴─────────┬─────────┘
          │                   │
          └─────────┬─────────┘
                    ▼
       [ All Checks Passed ✅ ]
                    │
                    ▼
     [ Vercel Zero-Downtime CD ]
   (Live Production Deployment)
```

---

## 💻 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/amitbuilds18/banking-dashboard.git
cd banking-dashboard
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

### 4. Running Verification Tests
```bash
# In backend directory
npm test

# In frontend directory
npm run build
```
