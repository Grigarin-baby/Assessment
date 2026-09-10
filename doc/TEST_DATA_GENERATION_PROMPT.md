# Test Dataset Generation Prompt (For External AI)

Use the prompt below with any LLM (Claude, ChatGPT, Gemini, etc.) to generate a synthetic, dirty JSON dataset (>= 250 records) designed to test every feature, rule, edge case, and relational constraint of the Record Ingestion & Reporting System.

---

## 📋 Copy-Paste Prompt

```text
You are a Lead QA Engineer and Data Architect. Generate a realistic, synthetic "dirty" test dataset formatted as a single JSON array of records (minimum 250 records) to stress-test an enterprise Record Ingestion, Rule Engine, and Parent/Child Relational History pipeline.

### System Record Specification
Each record represents an event with the following fields:
- `id`: String or UUID identifier.
- `source`: String originating system code (e.g., "alpha", "beta", "gamma", "delta").
- `recordedAt`: Timestamp string or numeric epoch.
- `value`: Integer reading from 0 to 100.
- `status`: String enum, allowed values: "OK", "WARN", "FAIL".

---

### Mandatory Test Scenarios To Include

Your generated dataset MUST systematically cover all of the following scenarios. Use explicit, traceable IDs (e.g., "tc-clean-001", "tc-dup-newer-001", "tc-err-range-001") so each test case is easily identifiable.

#### 1. Clean Valid Records (~100 records)
- Standard UUID and string IDs (e.g. "tc-valid-001" to "tc-valid-100").
- Sources: "alpha", "beta", "gamma", "delta".
- Values: integers from 0 to 100 (including exact boundaries 0 and 100).
- Statuses: "OK", "WARN", "FAIL".
- Clean ISO 8601 UTC timestamps (e.g., "2026-03-14T10:00:00Z").

#### 2. Multi-Format & Timezone Date Normalization (~30 records)
Valid records whose timestamps must normalize to canonical UTC:
- ISO 8601 with positive timezone offset (e.g., "2026-03-14T15:30:00+05:30").
- ISO 8601 with negative timezone offset (e.g., "2026-03-14T06:00:00-04:00").
- Unix Epoch in seconds (e.g., 1773482400 as integer or string).
- Unix Epoch in milliseconds (e.g., 1773482400000).
- RFC 2822 HTTP date format (e.g., "Sat, 14 Mar 2026 10:00:00 GMT").
- SQL standard datetime format (e.g., "2026-03-14 10:00:00").
- Date-only format (e.g., "2026-03-14").

#### 3. Parent/Child Record History & Deduplication Scenarios (~40 records)
Test the relational database's order-independent versioning and history tracking:
- **Scenario 3A: Idempotent Exact Duplicates (R3):**
  Same ID, exact same timestamp, exact same payload. The second occurrence must be skipped without duplication.
- **Scenario 3B: Newer Duplicate (Master Update & Child Archiving):**
  Record 1 arrives with timestamp T1 ("2026-03-14T10:00:00Z", value: 25).
  Record 2 arrives with the SAME ID but newer timestamp T2 ("2026-03-14T10:30:00Z", value: 85).
  -> Record 2 becomes Active Master in `accepted_records`; Record 1 is archived to `record_history`.
- **Scenario 3C: Older Duplicate (Out-of-Order Historical Child):**
  Record 1 arrives with timestamp T2 ("2026-03-14T12:00:00Z", value: 50).
  Record 2 arrives with the SAME ID but older timestamp T1 ("2026-03-14T11:00:00Z", value: 10).
  -> Record 1 remains Active Master; Record 2 is inserted directly into `record_history` as an older child.
- **Scenario 3D: Multi-Generation Chain (3+ Revisions):**
  Same ID appearing 3 times with progressive timestamps (e.g. 09:00:00, 09:15:00, 09:30:00) to test multiple versions in `record_history`.
- **Scenario 3E: Conflicting Duplicate (Same Timestamp, Conflicting Payload):**
  Record 1: ID "tc-conflict-01", timestamp "2026-03-14T10:00:00Z", value: 30, status: "OK".
  Record 2: ID "tc-conflict-01", EXACT SAME timestamp "2026-03-14T10:00:00Z", conflicting value: 95, status: "FAIL".
  -> Record 1 is accepted; Record 2 is rejected with reason `DUPLICATE_ID_CONFLICT` and links via Foreign Key (`acceptedRecordId: "tc-conflict-01"`).

#### 4. Validation Rule Violations (Dead-Letter Vault Recoverability) (~80 records)
Each of these records must fail validation and be preserved untouched in `rejected_records`:
- **Missing Required Fields (`MISSING_FIELD`):**
  - Missing `id` entirely or `id: null`.
  - Missing `source` entirely.
  - Missing `recordedAt`.
  - Missing `value`.
  - Missing `status`.
- **Empty / Whitespace String Sanitization (`EMPTY_OR_WHITESPACE_STRING`):**
  - `id: ""` (empty string) and `id: "   "` (whitespace only).
  - `source: ""` and `source: "   "`.
  - Valid string with leading/trailing spaces (e.g. `source: "  alpha  "`) that SHOULD pass after auto-trimming.
- **Invalid Dates (`INVALID_DATE_FORMAT`):**
  - Completely unparseable text (e.g., "not-a-date", "yesterday", "2026/99/99").
  - Calendar impossibilities (e.g., "2026-02-31T10:00:00Z", "2026-04-31T12:00:00Z").
- **Value Errors:**
  - **Out of Range (`VALUE_OUT_OF_RANGE`):** Negative numbers (e.g. -1, -50), numbers greater than 100 (e.g. 101, 250, 999).
  - **Non-Integer (`VALUE_NOT_AN_INTEGER`):** Floating point numbers (e.g. 42.5, 99.99), numeric strings (e.g. "50"), booleans (e.g. `true`), objects/null.
- **Invalid Status (`INVALID_STATUS`):**
  - Non-allowed enum values (e.g. "UNKNOWN", "ERROR", "PENDING", "ACTIVE").
  - Lowercase or mixed case (e.g. "ok", "Warn", "fail").

---

### Output Format Requirements
- Provide the output as a clean, valid, unescaped JSON array `[...]`.
- Do not truncate with ellipses (`...`). Ensure the JSON syntax is completely valid and parseable.
- Distribute the records naturally throughout the array so sequential ingestion processes a realistic mix of valid, invalid, duplicate, and out-of-order records.
```
