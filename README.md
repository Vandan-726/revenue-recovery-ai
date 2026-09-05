# 🚀 Recoverly AI — Autonomous Revenue Recovery Platform

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1-61DAFB.svg?style=flat-square&logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38B2AC.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-5.2-000000.svg?style=flat-square&logo=express)](https://expressjs.com/)
[![Neon](https://img.shields.io/badge/Postgres-Neon-00E599.svg?style=flat-square&logo=postgresql)](https://neon.tech/)
[![Drizzle](https://img.shields.io/badge/ORM-Drizzle-C5F74F.svg?style=flat-square)](https://orm.drizzle.team/)
[![OpenRouter](https://img.shields.io/badge/AI-OpenRouter_LLM-6366F1.svg?style=flat-square)](https://openrouter.ai/)
[![Security](https://img.shields.io/badge/Security_Tests-35%2F35_Passing-success.svg?style=flat-square)](scripts/security-test.mjs)

**Turn failed transactions into recovered ARR with AI-driven root cause diagnosis, smart payment retries, and high-converting omnichannel recovery workflows.**

[Key Features](#-key-features) • [Architecture](#-architecture) • [Project Structure](#-project-structure) • [Tech Stack](#%EF%B8%8F-technology-stack) • [Quick Start](#-quick-start) • [Security & Testing](#-security--testing-suite) • [API Reference](#-api-endpoints)

</div>

---

## 📖 Overview

**Recoverly AI** is an enterprise-grade payment recovery platform built to solve involuntary customer churn. When transactions fail due to insufficient funds, card network throttles, 3D-Secure timeouts, or expired payment instruments, Recoverly AI immediately intercepts the failure, analyzes why it happened using advanced LLM reasoning, and orchestrates personalized multi-channel recovery campaigns.

Whether communicating via **WhatsApp UPI 1-click links**, personalized **SMS alerts**, or **smart off-peak retries**, Recoverly AI captures revenue that would otherwise be permanently lost.

---

## ✨ Key Features

### 🧠 Autonomous AI Root-Cause Analysis
- **Deep Failure Diagnosis**: Evaluates error codes, bank responses, transaction history, and customer profile data using **OpenRouter LLMs** (e.g. Meta Llama 3.3 70B).
- **Graceful Deterministic Fallback**: Automatically switches to strict rule-based heuristic engines if AI services are unavailable or latency limits are reached.
- **Dynamic Strategy Orchestration**: Calculates customer risk profiles, selects high-probability recovery paths, and sequences automated execution tasks.

### 📲 Omnichannel Customer Recovery & Smart Retries
- **Multi-Touch Outreach**: Coordinated communications across **WhatsApp**, **SMS**, **Email**, and **Voice**.
- **1-Click Checkout Links**: Generates payment checkout links with personalized discount incentives and validity windows.
- **Bilingual Notification Templates**: Built-in, field-tested templates in multiple languages with dynamic merge tags.
- **Hybrid Delivery System**: Full support for real carrier dispatch (**Twilio**, **Exotel**, **SendGrid**, **AWS SES**, **Razorpay**) alongside an instant zero-cost **Simulation Mode** for staging and testing.

### 📊 Real-Time Operations Dashboard
- **Executive Analytics**: Live metrics on Recovered ARR, Recovery Rates, Revenue at Risk, and Active Workflows.
- **Interactive Recovery Timeline**: Granular tracking for each recovery attempt, showing delivery receipts, timestamps, and audit events.
- **Settings & Integration Hub**: Intuitive configuration panel for profile details, business currency, notification rules, retry bounds, and payment gateways.

### 🛡️ Hardened Security Architecture
- **HMAC Signature Verification**: Validates Razorpay SHA-256 webhook signatures with replay attack protection.
- **Zero Secret Exposure**: Server credentials (`DATABASE_URL`, API secrets) are isolated from browser bundles with runtime Zod schema parsing.
- **Automated Security Suites**: 35 automated security assertions testing injection resilience, prototype pollution defense, path traversal prevention, and rate limits.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               Frontend: Vite + React 19 SPA                 │
│         (Tailwind CSS v4 • Lucide Icons • Wouter)           │
└──────────────────────────────┬──────────────────────────────┘
                               │  /api  (Reverse Proxy)
┌──────────────────────────────▼──────────────────────────────┐
│             Backend: Express 5 API Server (TypeScript)      │
│  ┌───────────────────────┬────────────────────────────────┐ │
│  │ Zod Input Validation  │ Rate Limiting & HMAC Security  │ │
│  └───────────────────────┴────────────────────────────────┘ │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│     Postgres Database       ││    AI & Provider Adapters    │
│  Neon Cloud + Drizzle ORM   ││ • OpenRouter LLM Analysis    │
│ • Recoveries & Attempts     ││ • WhatsApp / SMS (Twilio)    │
│ • Webhook Events & Audits   ││ • Email (SendGrid / AWS SES) │
│ • Provider Configurations   ││ • Razorpay Smart Retries     │
└─────────────────────────────┘└──────────────────────────────┘
```

---

## 📁 Project Structure

```
├── artifacts/
│   ├── api-server/                 # Express 5 backend server
│   │   ├── src/routes/             # API routes & webhook endpoints
│   │   ├── src/lib/                # Core libraries, logger & environment
│   │   │   ├── phase3/             # LLM analyzer, strategy queues & orchestrator
│   │   │   └── phase4/             # Notification adapters & template engines
│   │   └── src/index.ts            # Server entrypoint
│   └── revenue-recovery-dashboard/ # React 19 + Vite frontend
│       ├── src/components/         # Reusable UI components & layouts
│       ├── src/pages/              # Dashboard, Recoveries, Settings, Analytics
│       └── src/hooks/              # Custom query & mutation hooks
├── lib/
│   ├── api-spec/                   # OpenAPI specification
│   ├── api-zod/                    # Shared validation schemas
│   └── db/                         # Drizzle schema definitions & client
├── scripts/                        # Automated smoke & security test suites
└── package.json                    # Workspace scripts & dependencies
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Radix UI, Lucide Icons, Wouter Router, TanStack Query |
| **Backend** | Node.js, Express 5, TypeScript, Zod, Pino Logger |
| **Database** | Neon Serverless PostgreSQL, Drizzle ORM, Drizzle Kit |
| **AI Intelligence**| OpenRouter API (Meta Llama 3.3 70B Instruct) with Deterministic Rule Engine Fallback |
| **Payment & Comms** | Razorpay, Twilio, Exotel, SendGrid, AWS SES (with Native Sandbox Simulation) |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `v20.0.0` or higher
- **pnpm**: `v9.0.0` or higher
- **PostgreSQL**: A Neon database URL (or standard PostgreSQL instance)

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/revenue-recovery-ai.git
cd revenue-recovery-ai

# Install dependencies using pnpm
pnpm install
```

### 2. Configure Environment Variables
Create your local development configuration from the template:
```bash
cp .env.example .env.development.local
```

Open `.env.development.local` and configure your credentials:
```env
# Server Runtime
PORT=3000
API_PORT=3001
NODE_ENV=development

# Database (Required)
DATABASE_URL=postgresql://user:password@your-neon-host/neondb?sslmode=require

# AI Engine (Optional — deterministic rules fallback if unset)
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct

# Provider Integrations (Leave blank or set to 'simulation' for sandbox mode)
SMS_PROVIDER=simulation
EMAIL_PROVIDER=simulation
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

### 3. Initialize Database Schema
Sync your database with the Drizzle ORM schema:
```bash
pnpm db:push
```

### 4. Start Local Development
Start both the Express API backend and Vite React dashboard in parallel:
```bash
pnpm dev
```

Your applications will be online at:
- 🌐 **Dashboard Preview**: [http://localhost:3000](http://localhost:3000)
- ⚙️ **Express API**: [http://localhost:3001](http://localhost:3001)
- 📊 **Prometheus Metrics**: [http://localhost:3001/metrics](http://localhost:3001/metrics)

---

## 🛡️ Security & Testing Suite

Recoverly AI includes two automated security testing suites built specifically for financial API integrity.

### Run Standard Security Audit (27 Checks)
Tests webhook signatures, JSON parsing, injection defenses, and header security:
```bash
pnpm test:security
```

### Run Advanced Hardened Security Suite (8 Deep Checks)
Performs stress testing across Prototype Pollution, Webhook Replay Attacks, Mass Assignment, HTTP Verb Tampering, and DoS Payload limits:
```bash
pnpm test:security:advanced
```

### Run Smoke Tests & Health Checks
```bash
pnpm smoke-test
```

---

## 🔌 API Endpoints

All core API endpoints are prefixed with `/api`.

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/healthz` | System health check and uptime status |
| `GET` | `/api/v1/dashboard` | Aggregated recovery rates, revenue saved, and trend metrics |
| `GET` | `/api/v1/recoveries` | Paginated recovery records with filtering & search |
| `GET` | `/api/v1/recoveries/:id` | Detailed recovery timeline, customer data, and audit history |
| `POST` | `/api/v1/recoveries/:id/analyze` | Triggers synchronous AI root-cause analysis & strategy selection |
| `GET` | `/api/v1/recoveries/:id/analysis`| Retrieves stored LLM analysis and action plan |
| `POST` | `/api/v1/webhooks/razorpay` | Receives incoming payment failure events (HMAC verified) |
| `GET` | `/api/v1/settings` | Fetches workspace configurations and provider connection state |
| `PUT` | `/api/v1/settings` | Updates profile, currency, max retry limits, and alerts |
| `POST` | `/api/v1/integrations/test` | Live or simulated dispatch test for SMS, Email, or WhatsApp |
| `GET` | `/api/v1/notifications` | Delivery logs, dispatch statuses, and recipient records |
| `GET` | `/api/v1/provider-health` | Real-time connectivity and status for external carriers |

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
#   r e v e n u e - r e c o v e r y - a i  
 #   r e v e n u e - r e c o v e r y - a i  
 