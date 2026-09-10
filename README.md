# Record Ingestion & Reporting System

A robust, production-grade ingestion engine, CLI tool, and interactive web dashboard built with **NestJS**, **Next.js**, and **Prisma** (PostgreSQL / SQLite).

---

## ⚡ Half-Page Quickstart Guide

### 1. Prerequisites
- **Node.js**: >= 18.x
- **npm**: >= 9.x

### 2. Setup & Installation
Clone the repository and install all dependencies:
```bash
# Install backend and frontend dependencies
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 3. Database Initialization
By default, the system runs with zero external dependencies using an embedded SQLite database (`dev.db`).
```bash
cd backend
npx prisma generate
npx prisma db push
```
*(To use PostgreSQL, simply set `DATABASE_URL="postgresql://user:password@localhost:5432/assessment_db"` in `backend/.env`).*

---

## 🚀 How to Run the Ingestion Pipeline (R1, R2, R3, R5)

Run the CLI command on any JSON dataset (including the bundled 247+ record dirty dataset):
```bash
cd backend
npm run ingest -- ../sample-data/records_sample_250.json
```
**Output:** The command parses, validates, and deduplicates all records, persists valid ones into `accepted_records` and invalid ones into `rejected_records`, and prints the **R5 Terminal Summary Table** detailing accepted/rejected counts and categorized rejection reasons.

---

## 🌐 Running the Web Application & Query API (R4)

### 1. Start the Backend API (NestJS)
```bash
cd backend
npm run start:dev
# API running at: http://localhost:4000/api
```

### 2. Start the Frontend Dashboard (Next.js)
```bash
cd frontend
npm run dev
# Dashboard running at: http://localhost:3000
```

### 3. Default Admin Credentials
- **Email:** `admin@assessment.local`
- **Password:** `Admin123!`

---

## 🧪 Running Automated Tests
Run the comprehensive test suite (Unit tests, Validation rules, Date parsing, Integration, and R3 Idempotency):
```bash
cd backend
npm test
```

---

## 📂 Key Documentation
- **[ASSUMPTIONS.md](./ASSUMPTIONS.md):** Complete analysis of all deliberate specification gaps, duplicate ID strategies, date normalization heuristics, and engineering trade-offs.
- **[PROGRESS_TRACKER.md](./PROGRESS_TRACKER.md):** Master milestone and subtask execution tracker.
- **[sample-data/records_sample_250.json](./sample-data/records_sample_250.json):** 247-record test dataset covering all Section 3 edge cases.
