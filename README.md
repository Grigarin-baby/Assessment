# Record Ingestion & Reporting System

A resilient, production-grade record ingestion engine, query API, and interactive CRM built with **NestJS**, **Prisma** (PostgreSQL / SQLite), and **Next.js**.

---

## ⚡ Quickstart (How to Run It)

Run everything locally from a clean checkout:

### 1. Install Dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Initialize Database
```bash
cd backend
npx prisma generate
npx prisma db push
```
*(By default, uses embedded SQLite or PostgreSQL via `DATABASE_URL` in `backend/.env`).*

### 3. Run Ingestion on Sample Data
Process the bundled 247-record test dataset:
```bash
cd backend
npm run ingest -- ../sample-data/records_sample_250.json
```
**Output (R5):** Displays total records processed, accepted count, rejected count, and a categorized breakdown of rejection reasons.

### 4. Run the Servers (API & Web Dashboard)
In two separate terminals:
```bash
# Terminal 1: Backend API (port 4000)
cd backend && npm run start:dev

# Terminal 2: Frontend Web CRM (port 3000)
cd frontend && npm run dev
```
Open **http://localhost:3000** to explore the dashboard.

---

## 🔍 How to Query It (R4)

Query accepted records via HTTP API with filters for `source`, `status`, and date ranges:

```bash
# Filter by source system
curl "http://localhost:4000/api/records?source=alpha"

# Filter by status (OK, WARN, FAIL)
curl "http://localhost:4000/api/records?status=WARN"

# Filter by date range
curl "http://localhost:4000/api/records?startDate=2026-03-01&endDate=2026-03-31"

# Combine filters
curl "http://localhost:4000/api/records?source=beta&status=OK&startDate=2026-03-14T00:00:00Z"
```

You can also query the Dead-Letter Vault for rejected records:
```bash
curl "http://localhost:4000/api/rejections?reason=DUPLICATE_ID_CONFLICT"
```

Or query via the **Web Dashboard** at `http://localhost:3000/records` with interactive filtering, sorting, and CSV/JSON export.

---

## 🏗️ The Design Chosen and Why

1. **Modular Rule Engine (`backend/src/ingestion/rules/`)**:
   - Each validation rule is an isolated class implementing `IngestionRule` with an assigned priority.
   - Evaluates all rules rather than failing fast, collecting all errors while assigning a deterministic `primaryReason` for aggregate reporting.
2. **Relational Deduplication & Parent/Child History**:
   - Instead of silently overwriting or discarding data, newer valid records update the master entity while previous versions are archived into `record_history`.
   - Simultaneous timestamp conflicts are quarantined to `rejected_records` with reason `DUPLICATE_ID_CONFLICT`.
3. **Storage (PostgreSQL + Prisma)**:
   - Provides ACID transactions for atomic batch commits and composite indexes on `(source, status, recordedAt)` for fast R4 queries.
   - Includes SQLite zero-config fallback for seamless evaluation without Docker.
4. **Idempotency (R3)**:
   - Computes SHA-256 payload fingerprints. Running the same file multiple times skips identical records without duplicating data.

---

## 🔮 What I Would Do Differently With More Time

1. **Streaming & Chunked Ingestion**:
   - Stream multi-gigabyte files using Node streams or NDJSON parser to avoid buffering large payloads in memory.
2. **Asynchronous Background Workers**:
   - Offload batch processing to BullMQ / Redis queues with worker concurrency and real-time WebSocket progress reporting.
3. **Dead-Letter Replay & Correction Interface**:
   - Build a UI feature allowing operators to correct invalid fields on quarantined records and replay them into the ingestion pipeline.
4. **Audit Log Export**:
   - Automated S3 / Parquet cold storage archiving for historical records and audit trails.

---

## 🧪 Running Tests
```bash
cd backend
npm test
```
Runs 27 unit and integration test suites covering validation rules, date normalization, deduplication strategy, and idempotency.
