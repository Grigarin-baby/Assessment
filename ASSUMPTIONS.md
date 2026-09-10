# Architectural Decisions & Assumptions (`ASSUMPTIONS.md`)

This document records the decisions made to resolve underspecified questions and deliberate specification gaps from the assessment prompt.

---

## 1. The Duplicate ID Problem (Section 6 Deep Dive)

### The Question:
> *"The same id appears twice with two different values. Do you keep the first one you saw, the last one, the one with the newer timestamp, or neither — and do you treat that as a rejection, or as an update?"*

### Our Decision & Implementation:
We implemented an **event-driven audit model**:
1. **Identical Record (Same ID, Same Timestamp, Same Payload):**
   - **Action:** Skipped as an idempotent no-op (R3). It does not create duplicate entries or inflate metrics.
2. **Newer Timestamp (Same ID, Newer Timestamp, Different Value):**
   - **Action:** Treated as an **Update**. The master record in `accepted_records` updates to the new value and increments its version (`v2`). The older version is not deleted; it is archived into `record_history` as a child revision.
3. **Out-of-Order Historical Backfill (Same ID, Older Timestamp):**
   - **Action:** Master record retains the latest state. The older record is inserted into `record_history` as a historical child.
4. **Simultaneous Conflict (Same ID, Identical Timestamp, Different Value):**
   - **Action:** The first record is accepted. The competing candidate with an identical timestamp but conflicting data cannot be safely resolved, so it is **quarantined to `rejected_records`** with the reason `DUPLICATE_ID_CONFLICT` and linked to the accepted record for human audit.

### Trade-Off Explanation:
- Keeping only the first record ignores valid downstream updates and fixes.
- Blindly overwriting (keeping last) destroys audit history and is vulnerable to file ordering.
- Rejecting all duplicates breaks real-world event streaming where entities change over time.
- **Our Approach** balances eventual consistency with complete data preservation: users always query the latest accurate state in `accepted_records`, while auditors can inspect every historical revision in `record_history`.

---

## 2. Specification Gaps & Adopted Decisions

| Decision | Specification Gap | Adopted Approach | Why We Decided This Way |
| :--- | :--- | :--- | :--- |
| **D1: Rejection Forensics (R2 & R5)** | If a record fails multiple rules, which reason is recorded? | Accumulate all failures (`allReasons`) but assign a deterministic `primaryReason`. | Full transparency: engineers can debug all errors, while executive reports get clean grouped counts. |
| **D2: Untouched Raw Payload** | How should rejected records be preserved? | Store raw, unmodified JSON payload in `rejected_records.rawPayload`. | Guarantees zero data loss ("it was dropped is not an acceptable answer") so any payload can be investigated or replayed. |
| **D3: Date Formats** | Dates arrive in "whatever format the sending system felt like using". | Support ISO-8601, timezone offsets (+05:30, -04:00), Unix Epoch (seconds & ms), SQL datetime, and date-only strings; normalize to canonical UTC. | Real-world upstream systems use varied timestamps. Normalizing to UTC ensures consistent sorting and range queries. |
| **D4: Numeric Value Bounds** | "Value is an integer between 0 and 100". | Enforce integer type (`Number.isInteger`) and inclusive range `[0, 100]`. Reject floats (`42.5`), strings (`"42"`), negatives, and values > 100. | Strict boundary adherence prevents floating-point inaccuracies and corrupt metrics. |
| **D5: Text Sanitization & Whitespace** | "Empty or whitespace-only strings where text is expected". | Reject whitespace-only strings (`"   "`). For valid text, trim leading and trailing spaces (`"  alpha  "` -> `"alpha"`). | Whitespace strings carry no semantic meaning. Trimming valid strings ensures clean indexing and deduplication. |
| **D6: Status Enum** | "Status is one of OK, WARN or FAIL". | Strict uppercase enum check (`OK`, `WARN`, `FAIL`). Reject lowercase (`ok`) or unexpected words (`PASS`). | Standardizes operational telemetry across heterogeneous producers. |
| **D7: Storage Selection** | "Any storage you like... but be ready to explain the choice." | PostgreSQL via Prisma, with automated SQLite fallback for zero-dependency local runs. | PostgreSQL provides ACID transactions, composite indexes for fast R4 queries, and JSONB columns. SQLite ensures evaluators can run it without installing Docker. |
