# CV Screener

> **AI-powered resume intelligence platform** that analyzes the compatibility between a CV and a Job Description — delivering a detailed match score, skills gap analysis, and a personalized learning path.

---

## Overview

CV Screener helps **job seekers** understand how well their resume fits a specific role, and helps **recruiters** evaluate candidate suitability faster — without the manual effort.

Upload a PDF resume, paste a job description, and get results in under 5 seconds.

---

## Features

### For Job Seekers
- 📄 **CV Upload** — Upload PDF resumes for instant analysis
- 📊 **Match Score** — Overall compatibility score with a detailed breakdown
- 🧠 **Skills Gap Analysis** — Matched, partially matched, and missing skills
- 🛤️ **Learning Path** — Ordered recommendations to close skill gaps
- 📁 **Analysis History** — Track progress across multiple analyses
- 🔗 **Shareable Links** — Share results via a public read-only link

### For Recruiters
- ⚡ **Fast Candidate Evaluation** — Instant suitability assessment
- 📈 **Dashboard Metrics** — Aggregated insights across analyses
- 🔍 **Transparent Scoring** — Explainable scores, not black-box results

### Subscription Plans
| Plan | Analyses |
|------|----------|
| Anonymous | 3 total |
| Free | 20 / month |
| Premium | Unlimited |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | .NET 8 Web API, Clean Architecture |
| ML Inference | Python (scikit-learn → ONNX), ONNX Runtime in .NET |
| Database | PostgreSQL (Supabase) |
| Auth | Clerk |
| Deployment | Vercel (frontend) · Railway / VPS (backend) |

---

## Architecture

```
Frontend (Next.js)
      ↓
API Gateway (.NET 8 Web API)
      ↓
┌─────────────────────────────────────┐
│           Core Services             │
│  CV Parser · Matching Engine        │
│  Skills Engine · Learning Path      │
│  Auth Middleware                    │
└─────────────────────────────────────┘
      ↓
ONNX Runtime (TF-IDF Inference)
      ↓
Database (PostgreSQL - Supabase)
```

---

## Scoring Methodology

The platform uses a **Hybrid Scoring Model**:

```
Final Score =
  (0.50 × Text Similarity)     ← TF-IDF via ONNX
+ (0.35 × Skills Match)        ← Skills taxonomy engine
+ (0.15 × Experience Match)    ← Rule-based experience analysis
```

---

## Project Structure

```
cv-screener/
├── backend/                  # .NET 8 Web API
│   ├── src/
│   │   ├── CVScreener.API            # Controllers, middleware
│   │   ├── CVScreener.Core           # Domain models, interfaces
│   │   └── CVScreener.Infrastructure # Services, DB, ONNX inference
│   ├── tests/                # Unit & integration tests
│   └── Dockerfile
│
├── frontend/                 # Next.js 14 app
│   ├── app/                  # App router pages
│   ├── components/           # Reusable UI components
│   └── lib/                  # Utilities & API clients
│
└── ml/                       # Python ML pipeline
    ├── models/               # Trained ONNX models
    └── requirements.txt
```

---

## Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 18+](https://nodejs.org/)
- [Python 3.10+](https://www.python.org/)
- A [Supabase](https://supabase.com/) project
- A [Clerk](https://clerk.com/) application

---

### 1. Clone the repository

```bash
git clone https://github.com/your-username/cv-screener.git
cd cv-screener
```

---

### 2. Backend setup

```bash
cd backend

# Copy and fill in your environment variables
cp src/CVScreener.API/.env.example src/CVScreener.API/.env

# Restore and run
dotnet restore
dotnet run --project src/CVScreener.API
```

The API will be available at `http://localhost:5000`.

---

### 3. Frontend setup

```bash
cd frontend

# Copy and fill in your environment variables
cp .env.example .env.local

npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

---

### 4. ML pipeline setup

```bash
cd ml

python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

---

## Environment Variables

### Backend — `.env`

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
CLERK_SECRET_KEY=your_clerk_secret
```

### Frontend — `.env.local`

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/analyze` | Analyze CV against a job description |
| `GET` | `/api/v1/analysis/{id}` | Retrieve a saved analysis |
| `GET` | `/api/v1/share/{id}` | Public read-only analysis view |
| `GET` | `/api/v1/history` | User's analysis history |

---

## Roadmap

- [x] TF-IDF + ONNX matching engine
- [x] Skills taxonomy matching
- [x] Hybrid scoring system
- [x] Analysis history & dashboard
- [x] Shareable public links
- [ ] Batch candidate ranking (recruiter mode)
- [ ] Semantic embeddings upgrade (MiniLM / BERT)
- [ ] Redis caching layer
- [ ] ATS integration

---

## License

This project is licensed under the [MIT License](LICENSE).
