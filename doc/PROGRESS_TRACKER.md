# Record Ingestion & Reporting System — Master Progress Tracker

**Stack:**
- **Frontend:** Next.js 14 (App Router, Tailwind CSS, Lucide Icons)
- **Backend:** NestJS (TypeScript, Modular Architecture, CLI & REST API)
- **Database:** PostgreSQL (via Prisma ORM, with zero-dependency SQLite fallback for testing)
- **Security:** JWT Authentication (Bcrypt, Passport-JWT, Protected APIs & Dashboard)

---

## 📊 Overall Progress Summary
- **Phase 1: Project Scaffolding & Dirty Dataset (>= 200 records)**: ✅ Complete (247 records generated)
- **Phase 2: Documentation Core (ASSUMPTIONS.md & README.md)**: ✅ Complete
- **Phase 3: Backend Ingestion Engine & Storage (NestJS + Prisma)**: ✅ Complete
- **Phase 4: Authentication & REST API**: ✅ Complete
- **Phase 5: Automated Testing Suite**: ✅ Complete (21/21 Jest tests passing)
- **Phase 6: Frontend Next.js Dashboard**: ✅ Complete
- **Phase 7: End-to-End Verification & Database Setup**: ✅ Complete (PostgreSQL Live)
- **Phase 8: Modular Rule Engine & Parent/Child Record History**: ✅ Complete (27/27 tests passing, PostgreSQL synced)

---

## 📝 Detailed Task & Subtask Tracker

### Phase 1: Foundation & Sample Dataset Generation
- [x] **Task 1.1: Project Setup & Monorepo Configuration**
  - [x] Subtask 1.1.1: Initialize root workspace `package.json` and gitignore
  - [x] Subtask 1.1.2: Configure `docker-compose.yml` and `.env.example`
  - [x] Subtask 1.1.3: Set up dual database architecture (SQLite for test, PostgreSQL for production)
- [x] **Task 1.2: Generate Comprehensive Sample Dataset (>= 200 records)**
  - [x] Subtask 1.2.1: Construct `sample-data/records_sample_250.json` (247 dirty records) covering:
    - [x] UUID & string IDs with duplicate records (identical vs conflicting payloads)
    - [x] Records with missing required fields (`id`, `source`, `recordedAt`, `value`, `status`)
    - [x] Dates in multiple formats (ISO 8601 UTC, offset, Unix Epoch sec/ms, RFC 2822, SQL datetime, invalid leap dates)
    - [x] Values outside 0–100 and floating-point non-integers
    - [x] Non-allowed status values (e.g. `UNKNOWN`, `ERROR`, `PENDING`, lowercase `ok`)
    - [x] Empty and whitespace-only text fields
  - [x] Subtask 1.2.2: Validate sample file meets all Section 3 PDF specifications

### Phase 2: Documentation Deliverables (R6 & README)
- [x] **Task 2.1: Author `ASSUMPTIONS.md` (R6)**
  - [x] Subtask 2.1.1: Document duplicate ID resolution strategy and trade-offs
  - [x] Subtask 2.1.2: Document date parsing and timezone normalization heuristics
  - [x] Subtask 2.1.3: Document string trimming and whitespace handling
  - [x] Subtask 2.1.4: Document numeric integer validation constraints
  - [x] Subtask 2.1.5: Document authentication design and security architecture
- [x] **Task 2.2: Author `README.md`**
  - [x] Subtask 2.2.1: Write clean half-page quickstart instructions
  - [x] Subtask 2.2.2: Document CLI commands, API endpoints, and authentication credentials

### Phase 3: Backend Ingestion Engine & Storage (NestJS + Prisma + PostgreSQL)
- [x] **Task 3.1: Initialize NestJS Backend & Prisma Setup**
  - [x] Subtask 3.1.1: Scaffold NestJS backend structure with TypeScript and tsconfig
  - [x] Subtask 3.1.2: Configure Prisma schema (`User`, `IngestRun`, `AcceptedRecord`, `RejectedRecord`)
  - [x] Subtask 3.1.3: Implement PrismaService and PrismaModule
- [x] **Task 3.2: Domain Validation & Normalization Engine**
  - [x] Subtask 3.2.1: Implement `DateNormalizerService` (cascading multi-format date parser)
  - [x] Subtask 3.2.2: Implement `RecordValidatorService` (field presence, range 0–100, enums, whitespace checks)
  - [x] Subtask 3.2.3: Implement `DeduplicationStrategy` (Strategy Pattern for conflict resolution & idempotency)
- [x] **Task 3.3: Ingestion Pipeline Implementation (R1, R2, R3, R5)**
  - [x] Subtask 3.3.1: Implement file stream reader (JSON array & NDJSON support)
  - [x] Subtask 3.3.2: Implement Dead-Letter queue storage for rejected records (raw payload + error taxonomy)
  - [x] Subtask 3.3.3: Implement Accepted records batch persister with content hash fingerprint
  - [x] Subtask 3.3.4: Implement R5 summary aggregator (counts & grouped rejection reasons)
- [x] **Task 3.4: CLI Ingestion Runner**
  - [x] Subtask 3.4.1: Implement standalone CLI script `npm run ingest -- <filepath>`
  - [x] Subtask 3.4.2: Format terminal output summary table (accepted, rejected, reason breakdown)

### Phase 4: Authentication & REST API (NestJS)
- [x] **Task 4.1: Authentication System (JWT + Bcrypt)**
  - [x] Subtask 4.1.1: User entity, password hashing, and default admin seed (`admin@assessment.local` / `Admin123!`)
  - [x] Subtask 4.1.2: Auth controller & service (`POST /api/auth/login`, `POST /api/auth/register`, JWT guard)
- [x] **Task 4.2: Query & Management REST API (R4)**
  - [x] Subtask 4.2.1: `GET /api/records` with filtering (`source`, `status`, `from`, `to`), sorting, pagination
  - [x] Subtask 4.2.2: `GET /api/rejections` with reason filtering and detailed error inspection
  - [x] Subtask 4.2.3: `POST /api/ingest/upload` for multipart file upload & ingestion
  - [x] Subtask 4.2.4: `GET /api/ingest/runs` and `GET /api/ingest/stats` for real-time dashboard metrics

### Phase 5: Automated Testing Suite
- [x] **Task 5.1: Unit Tests**
  - [x] Subtask 5.1.1: Unit test `RecordValidatorService` (boundary values 0, 100, -1, 101, floats, regex, enums)
  - [x] Subtask 5.1.2: Unit test `DateNormalizerService` (all date formats, timezones, and invalid dates)
  - [x] Subtask 5.1.3: Unit test `DeduplicationStrategy` (identical vs conflicting updates)
- [x] **Task 5.3: Idempotency Verification Test (R3)**
  - [x] Subtask 5.3.1: Automated test running ingestion twice sequentially, verifying zero duplicates

### Phase 6: Frontend Dashboard (Next.js App Router)
- [x] **Task 6.1: Next.js Setup & Design System**
  - [x] Subtask 6.1.1: Scaffold Next.js project with TypeScript, Tailwind CSS, Lucide icons
  - [x] Subtask 6.1.2: Implement auth context & API client in `lib/api.ts`
- [x] **Task 6.2: Authentication UI**
  - [x] Subtask 6.2.1: Sleek Login page with prefilled demo credentials & validation
- [x] **Task 6.3: Dashboard Hub & Ingestion Metrics**
  - [x] Subtask 6.3.1: Metric summary cards (Total Ingested, Accepted %, Rejected %, Pipeline status)
  - [x] Subtask 6.3.2: Rejection Reason distribution progress list (R5 visualization)
  - [x] Subtask 6.3.3: Interactive File Ingestion Runner (drag-and-drop file upload & sample file button)
- [x] **Task 6.4: Accepted Records Explorer (R4)**
  - [x] Subtask 6.4.1: Filterable table with source dropdown, status pills (`OK`, `WARN`, `FAIL`), and date range picker
  - [x] Subtask 6.4.2: Pagination, sorting, and detail view
- [x] **Task 6.5: Dead-Letter Vault (R2)**
  - [x] Subtask 6.5.1: Rejections inspection table with reason filter
  - [x] Subtask 6.5.2: Raw JSON payload viewer with highlighted validation error badges

### Phase 7: End-to-End Verification & Polish
- [x] **Task 7.1: Verify Prisma Client Generation and Database Migration (PostgreSQL configured & synced)**
- [x] **Task 7.2: Execute Jest Automated Test Suite (21/21 passing)**
- [x] **Task 7.3: Test CLI Ingest Execution on Sample File (Verified on PostgreSQL with idempotency)**

### Phase 8: Modular Rule Engine & Parent/Child Record History
- [x] **Task 8.1: Relational Database Schema & Foreign Keys Migration**
  - [x] Subtask 8.1.1: Add `RecordHistory` model with strict FK `acceptedRecordId -> accepted_records(id)`
  - [x] Subtask 8.1.2: Add nullable FK `acceptedRecordId` to `rejected_records` referencing `accepted_records(id)`
  - [x] Subtask 8.1.3: Run `npx prisma db push` and verify PostgreSQL foreign keys
- [x] **Task 8.2: Ingestion Rule Engine Architecture**
  - [x] Subtask 8.2.1: Define `IngestionRule`, `RuleContext`, `RuleEngineResult` in `src/ingestion/rules/rule.interface.ts`
  - [x] Subtask 8.2.2: Implement 6 modular rule classes in `src/ingestion/rules/built-in/`
  - [x] Subtask 8.2.3: Implement `RuleEngineService` and wire into `IngestionModule`
  - [x] Subtask 8.2.4: Refactor `RecordValidatorService` to delegate to `RuleEngineService`
- [x] **Task 8.3: Ingestion Pipeline & Parent/Child History Strategy**
  - [x] Subtask 8.3.1: Update `IngestionService` duplicate handling (archive master to history on newer, insert directly on older)
  - [x] Subtask 8.3.2: Link conflicting duplicate rejections to master record via `acceptedRecordId`
- [x] **Task 8.4: Backend REST API Endpoints**
  - [x] Subtask 8.4.1: Add `GET /api/records/:id/history` endpoint in `RecordsController`
  - [x] Subtask 8.4.2: Include `_count.history` in `GET /api/records`
  - [x] Subtask 8.4.3: Eager load `acceptedRecord` in `GET /api/rejections`
- [x] **Task 8.5: Frontend UI Interactive Dropdowns**
  - [x] Subtask 8.5.1: Build expandable revision history accordion on Accepted Records table (`/records`)
  - [x] Subtask 8.5.2: Build master record comparison dropdown in Dead-Letter Vault (`/rejections`)
- [x] **Task 8.6: End-to-End Verification & Automated Testing**
  - [x] Subtask 8.6.1: Run Jest unit test suite (`npm test` — 27/27 tests passing across 6 suites)
  - [x] Subtask 8.6.2: Test CLI ingestion on sample dataset and verify `record_history` rows in PostgreSQL

