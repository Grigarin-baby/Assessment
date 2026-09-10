# Architectural Decisions & Assumptions (`ASSUMPTIONS.md`)

This document formally records all engineering decisions made to resolve underspecified requirements, deliberate specification gaps, and operational edge cases for the **Record Ingestion & Reporting System**.

---

## 1. Executive Summary of Key Decisions

| # | Topic | Specification Gap | Adopted Decision | Primary Rationale |
|---|---|---|---|---|
| **D1** | **Duplicate IDs (Conflicting Data)** | Does not specify whether to keep first, last, newer timestamp, or reject both. | **Configurable Strategy Pattern**<br>*(Default: "Latest `recordedAt` wins, superseded records logged to Audit History")* | Balances eventual consistency and real-world event stream updates without discarding audit history. Can be toggled to strict rejection via configuration. |
| **D2** | **Duplicate Records (Idempotency / R3)** | What defines "the same record" when running the program twice? | **Normalized Content Fingerprint (SHA-256) + Record ID** | If an incoming record matches an already accepted record's ID *and* normalized content hash, it is skipped as an idempotent no-op without duplicating records or skewing run metrics. |
| **D3** | **Date Formats & Timezone Normalization** | Dates arrive in "whatever format the sending system felt like using". | **Multi-tier Cascading Normalizer storing canonical UTC ISO 8601 strings** | Accepts ISO 8601 (with/without offset), RFC 2822, Unix Epoch (seconds & ms), SQL datetime (`YYYY-MM-DD HH:mm:ss`), and date-only strings. Rejects unparseable/impossible dates. |
| **D4** | **Rejection Granularity (R2 & R5)** | If a record fails multiple rules, which reason is recorded? | **Accumulate all errors (`allReasons: string[]`) + designate top-level `primaryReason`** | Provides 100% forensic transparency for upstream debugging while enabling clean categorical grouping for R5 summary reporting. |
| **D5** | **String Sanitization & Whitespace** | "Empty or whitespace-only strings where text is expected". | **Strict non-empty check after trimming; trim leading/trailing padding for valid text** | Pure whitespace strings (`""`, `"   "`, `"\t\n"`) are rejected with `EMPTY_OR_WHITESPACE_STRING`. Strings with valid characters (e.g. `" alpha "`) are trimmed to `"alpha"`. |
| **D6** | **Numeric Value Constraints** | "Value is an integer between 0 and 100". | **Strict numeric integer check (`Number.isInteger`) within $[0, 100]$ inclusive** | Floats (`42.5`), strings (`"42"`), booleans, negatives (`< 0`), and numbers `> 100` are strictly rejected with `VALUE_NOT_AN_INTEGER` or `VALUE_OUT_OF_RANGE`. |
| **D7** | **Status Taxonomy** | "Status is one of OK, WARN or FAIL". | **Strict uppercase enum check** | Case-sensitive match against `OK`, `WARN`, `FAIL`. Lowercase (`ok`) or alternative terms (`SUCCESS`, `ERROR`, `PENDING`) are rejected with `INVALID_STATUS`. |
| **D8** | **Record Identifier & ID Format** | Spec states "id is unique" and user requested UUID support. | **Accepts both UUID and short alphanumeric strings; generates UUIDs for internal primary keys** | Supports incoming UUIDs (`550e8400-...`) as well as string IDs (`r-0001`), ensuring compatibility while enforcing system-level UUID uniqueness. |
| **D9** | **Authentication & Security** | Real-world API & dashboard protection. | **Stateless JWT Authentication with Bcrypt password hashing** | Secures API endpoints and dashboard queries with role-based JWT authentication, pre-seeded with default administrator credentials. |
| **D10** | **Database Selection** | Storage choice must be justified and run cleanly on half a page. | **PostgreSQL via Prisma with automated SQLite fallback** | Enterprise-grade PostgreSQL with indexes on query fields, coupled with zero-dependency SQLite fallback for friction-free local evaluation. |

---

## 2. Detailed Technical Rationale

### 2.1 Handling Duplicate IDs (Section 6 of Specification)

#### The Problem:
The same record ID may appear multiple times:
1. **Identical duplicate:** Same ID and identical attributes.
2. **Conflicting duplicate:** Same ID, but differing values, timestamps, or statuses.

#### Trade-Off Analysis:
1. **Keep the first seen:** Discards subsequent updates, ignoring newer downstream corrections.
2. **Keep the last seen (file order):** Vulnerable to race conditions and file sorting quirks.
3. **Reject both / treat as rejection:** Punishes legitimate eventual-consistency updates.
4. **Update if newer timestamp wins (Chosen Default):**
   - If an incoming record has an identical content hash to an existing accepted record, it is recognized as an **idempotent duplicate** and skipped.
   - If an incoming record has the same ID with a **newer `recordedAt` timestamp**, the existing record is updated to the new state, and the previous revision is retained in the run's audit trail.
   - If an incoming record has the same ID with an **older `recordedAt` timestamp**, it is rejected with reason `OUT_OF_ORDER_DUPLICATE`.
   - If two records have the same ID, identical timestamps, but conflicting values, it is rejected with `DUPLICATE_ID_CONFLICT`.

*Live Interview Extensibility:* Because we encapsulate this in a `DeduplicationStrategy` interface, switching to strict rejection requires modifying only one strategy class.

---

### 2.2 Date Ingestion & Normalization

#### The Problem:
Upstream systems emit timestamps across heterogeneous formats (ISO 8601 UTC, offset timezones, Unix Epoch in seconds/milliseconds, RFC 2822, and standard SQL formats).

#### Rules Implemented:
1. **Priority Parsers:**
   - ISO 8601 / RFC 3339 standard (e.g. `2026-03-14T09:12:00Z` or `...T14:42:00+05:30`).
   - Unix epoch numeric timestamps (evaluated for magnitude: 10 digits = seconds, 13 digits = milliseconds).
   - SQL datetime strings (`YYYY-MM-DD HH:mm:ss`).
   - RFC 2822 (`Sat, 14 Mar 2026 09:12:00 GMT`).
   - Date-only formats (`YYYY-MM-DD`), normalized to 00:00:00.000 UTC.
2. **Rejection Criteria:**
   - Any string that fails standard date parsing.
   - Calendar impossibilities (e.g. `2026-02-31`).
   - Dates outside reasonable temporal bounds (before year 1970 or after year 2100).
   - Rejected records are tagged with `INVALID_DATE_FORMAT`.

---

### 2.3 Rejection Forensics & Recoverability (R2 & R5)

#### The Problem:
"The records you throw away matter as much as the ones you keep — somebody will eventually ask why a particular record never showed up, and 'it was dropped' is not an acceptable answer."

#### Strategy:
1. **Raw Payload Preservation:** The complete untouched payload is serialized to a JSONB column (`rawPayload`) in `rejected_records`.
2. **Multi-Error Accumulation:** Rather than failing fast on the first error, the validator runs all checks:
   ```json
   {
     "primaryReason": "VALUE_OUT_OF_RANGE",
     "allReasons": ["VALUE_OUT_OF_RANGE", "INVALID_STATUS"]
   }
   ```
3. **Reason Hierarchy for R5:** To provide clean aggregate reporting, the primary reason is determined by a deterministic hierarchy:
   - `MALFORMED_RECORD`
   - `MISSING_FIELD`
   - `EMPTY_OR_WHITESPACE_STRING`
   - `INVALID_DATE_FORMAT`
   - `VALUE_NOT_AN_INTEGER`
   - `VALUE_OUT_OF_RANGE`
   - `INVALID_STATUS`
   - `DUPLICATE_ID_CONFLICT`

---

### 2.4 Idempotency & Run Isolation (R3)

#### The Problem:
Running the program twice over the same file must not duplicate records or inflate metrics.

#### Strategy:
1. **File Fingerprint:** Each run computes an MD5/SHA-256 checksum of the input file.
2. **Payload Fingerprint:** Each accepted record computes a SHA-256 fingerprint of `id + source + recordedAt.toISOString() + value + status`.
3. **Database Upsert/Skip:** If a record with `payloadHash` already exists in `accepted_records`, the pipeline skips re-inserting it.
4. **Run Statistics:** Re-runs report the exact state: "X records previously accepted, 0 new duplicates inserted".

---

### 2.5 Storage Justification & Half-Page Quickstart Constraint

#### The Problem:
"Any storage you like, including a plain file or an embedded database — but be ready to explain the choice. It must run from a clean checkout with instructions that fit on half a page."

#### Decision:
- **PostgreSQL via Prisma:** Provides robust indexing for R4 queries (composite indexes on `source`, `status`, `recordedAt`), ACID transactions for batch consistency, and native JSONB querying for rejected raw payloads.
- **SQLite Fallback:** Because evaluators may not have PostgreSQL or Docker running locally, Prisma is configured so switching `DATABASE_URL="file:./dev.db"` allows zero-config startup with 100% functionality.
