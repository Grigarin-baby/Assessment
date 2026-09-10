# Rule Engine Thorough Testing & Verification Report

## Executive Summary
A comprehensive end-to-end audit and test of the **Record Ingestion Rule Engine** was conducted against all requirements in the Technical Assessment PDF specification, edge cases, and worst-case scenarios. 

To ensure fast query execution, deterministic assertions, and clear traceability without excessive log clutter, a targeted test dataset of **33 focused records** was constructed, covering every distinct rule, normalization requirement, deduplication scenario, and error condition.

The full flow—**Data Generation → Ingestion Execution → Direct PostgreSQL Multi-Table Assertions → Frontend CRM Visual Inspection**—was executed and passed with **100% success rate (28/28 Database Assertions Passed)**.

---

## 1. Test Dataset Architecture (33 Records)

| Category | Record IDs | Test Condition & Edge Case | Expected Disposition |
| :--- | :--- | :--- | :--- |
| **Boundary Validations** | `tc-clean-01`<br>`tc-clean-02`<br>`tc-clean-03` | Lower boundary (`value: 0`), Upper boundary (`value: 100`), Mid value (`value: 50`) | **Accepted** into `accepted_records` |
| **String Trimming** | `tc-clean-trim` | Leading/trailing whitespace on source (`"  delta  "`) | **Accepted**, normalized to `"delta"` |
| **Timezone & Offsets** | `tc-date-offset-pos`<br>`tc-date-offset-neg` | ISO-8601 with positive offset (`+05:30` IST) and negative offset (`-04:00` EDT) | **Accepted**, normalized to canonical UTC ISO-8601 |
| **Epoch & Standard Dates**| `tc-date-epoch-sec`<br>`tc-date-epoch-ms`<br>`tc-date-sql`<br>`tc-date-only` | Unix epoch seconds (`1773482400`), Unix epoch ms (`1773482400000`), SQL format (`YYYY-MM-DD HH:mm:ss`), Date-only (`YYYY-MM-DD`) | **Accepted**, normalized to UTC ISO-8601 |
| **Idempotent Duplicate** | `tc-dedup-skip` (2x) | Exact same ID, timestamp, and payload sent twice | 1st **Accepted**, 2nd **Skipped** (idempotent no-op) |
| **Newer Revision** | `tc-dedup-newer` (2x) | T1 (`value: 20`, 10:00Z) followed by T2 (`value: 85`, 11:00Z) | Master updated to v2 (`value: 85`); v1 (`value: 20`) archived to `record_history` |
| **Out-of-Order Backfill**| `tc-dedup-older` (2x) | T2 (`value: 90`, 12:00Z) followed by T1 (`value: 15`, 09:00Z) | Master retains v1 (`value: 90`); T1 (`value: 15`) inserted directly into `record_history` |
| **Simultaneous Conflict** | `tc-dedup-conflict` (2x)| Same ID, same timestamp, conflicting value (`25` vs `95`) | 1st **Accepted**; 2nd quarantined to `rejected_records` with `DUPLICATE_ID_CONFLICT` and `acceptedRecordId` link |
| **Missing Fields** | 5 records | Missing `id`, missing `source`, missing `recordedAt`, missing `value`, missing `status` | **Quarantined** (5x `MISSING_FIELD`) |
| **Whitespace Strings** | 2 records | Whitespace-only `id` (`"   "`), whitespace-only `source` (`"   "`) | **Quarantined** (2x `EMPTY_OR_WHITESPACE_STRING`) |
| **Invalid Dates** | 2 records | Non-date string (`"not-a-valid-date"`), impossible date (`"2026-02-31T10:00:00Z"`) | **Quarantined** (2x `INVALID_DATE_FORMAT`) |
| **Value Out of Range** | 2 records | Negative value (`-5`), excessive value (`105`) | **Quarantined** (2x `VALUE_OUT_OF_RANGE`) |
| **Non-Integer Values** | 2 records | Float metric (`42.75`), stringified number (`"75"`) | **Quarantined** (2x `VALUE_NOT_AN_INTEGER`) |
| **Invalid Status Enum** | 2 records | Non-existent status (`"INVALID_STATE"`), lowercase status (`"ok"`) | **Quarantined** (2x `INVALID_STATUS`) |

---

## 2. Ingestion Execution Summary

- **Endpoint**: `POST /api/ingest/upload` (Multipart form-data)
- **Execution Time**: 89 ms
- **Run ID**: `3798ca18-d721-4a93-ad02-2e4baae88a32`
- **Total Processed**: 33 records
- **Accepted Operations**: 16 (14 master records + 1 newer update + 1 older child revision)
- **Dead-Letter Rejections**: 16 quarantined payloads
- **Identical Skips**: 1 duplicate no-op

```json
{
  "totalProcessed": 33,
  "accepted": 16,
  "rejected": 16,
  "skippedDuplicates": 1,
  "rejectionSummary": {
    "DUPLICATE_ID_CONFLICT": 1,
    "MISSING_FIELD": 5,
    "EMPTY_OR_WHITESPACE_STRING": 2,
    "INVALID_DATE_FORMAT": 2,
    "VALUE_OUT_OF_RANGE": 2,
    "VALUE_NOT_AN_INTEGER": 2,
    "INVALID_STATUS": 2
  }
}
```

---

## 3. Database Table Assertions (PostgreSQL Direct Queries)

All 4 application tables were queried directly using Prisma Client to verify exact row counts, field normalization, relational foreign keys, and error payloads:

```
================================================================
📊 DATABASE RECORD COUNTS:
• Ingest Runs: 1
• Accepted Master Records: 14
• Child Historical Revisions: 2
• Dead-Letter Rejections: 16
================================================================
```

### Direct Assertion Results (28 Checks)

1. ✅ **IngestRun Total Count**: Processed 33 records
2. ✅ **IngestRun Accepted Operations**: 16 accepted operations
3. ✅ **IngestRun Rejected Count**: 16 rejections
4. ✅ **IngestRun Skipped Duplicates**: 1 identical duplicate skipped
5. ✅ **Accepted Master Records**: Exactly 14 unique master rows in `accepted_records`
6. ✅ **Lower Boundary**: `tc-clean-01` accepted with `value: 0`, `status: "OK"`
7. ✅ **Upper Boundary**: `tc-clean-02` accepted with `value: 100`, `status: "WARN"`
8. ✅ **Whitespace Trimming**: `tc-clean-trim` source sanitized to `"delta"`
9. ✅ **Positive Timezone Offset**: `tc-date-offset-pos` (`+05:30`) normalized to `2026-03-14T10:00:00.000Z`
10. ✅ **Negative Timezone Offset**: `tc-date-offset-neg` (`-04:00`) normalized to `2026-03-14T10:00:00.000Z`
11. ✅ **Unix Epoch Seconds**: `tc-date-epoch-sec` parsed and normalized to UTC
12. ✅ **Unix Epoch Milliseconds**: `tc-date-epoch-ms` parsed and normalized to UTC
13. ✅ **SQL Datetime**: `tc-date-sql` parsed and normalized to UTC
14. ✅ **Date-Only**: `tc-date-only` parsed and normalized to UTC
15. ✅ **Newer Revision Master**: `tc-dedup-newer` promoted to Version 2 with `value: 85`
16. ✅ **Newer Revision History**: `tc-dedup-newer` original v1 (`value: 20`) archived to `record_history`
17. ✅ **Older Out-of-Order Master**: `tc-dedup-older` retains v1 with `value: 90`
18. ✅ **Older Out-of-Order History**: `tc-dedup-older` historical backfill (`value: 15`) inserted into `record_history`
19. ✅ **Total History Records**: Exactly 2 rows in `record_history`
20. ✅ **Total Quarantined Records**: Exactly 16 rows in `rejected_records`
21. ✅ **Simultaneous Conflict Code**: `tc-dedup-conflict` rejected with `DUPLICATE_ID_CONFLICT`
22. ✅ **Simultaneous Conflict FK**: `tc-dedup-conflict` links to `acceptedRecordId: "tc-dedup-conflict"`
23. ✅ **Missing Fields Taxonomy**: 5 records quarantined under `MISSING_FIELD`
24. ✅ **Whitespace Strings Taxonomy**: 2 records quarantined under `EMPTY_OR_WHITESPACE_STRING`
25. ✅ **Invalid Dates Taxonomy**: 2 records quarantined under `INVALID_DATE_FORMAT`
26. ✅ **Value Out of Range Taxonomy**: 2 records quarantined under `VALUE_OUT_OF_RANGE`
27. ✅ **Non-Integer Value Taxonomy**: 2 records quarantined under `VALUE_NOT_AN_INTEGER`
28. ✅ **Invalid Status Taxonomy**: 2 records quarantined under `INVALID_STATUS`

**Pass Rate: 28 / 28 (100%)**

---

## 4. Frontend CRM Visual Verification

The user interface was validated across all pages and interactive components:

1. **Enterprise Ingestion Dashboard (`/`)**:
   - High-level metric cards accurately display:
     - **14 Accepted** (46.7%)
     - **16 Rejections** (53.3%)
     - **2 Child Revisions** in `record_history`
   - Section 3 Rejection Breakdown displays all 7 error buckets with exact counts.

2. **Accepted Records Explorer (`/records`)**:
   - Shows 14 master rows formatted in Indian Standard Time (IST).
   - Parent / Child revision badges display `v2 (1 accepted child)` for both `tc-dedup-newer` and `tc-dedup-older`.
   - Clicking the chevron expands the nested child table, displaying the active master and historical child records with their SHA-256 payload hashes and relational integrity badges.
   - Clicking **View** opens the Forensic Inspector modal rendering the normalized JSON and audit metadata.

3. **Dead-Letter Audit Vault (`/rejections`)**:
   - Filterable by rejection reason.
   - Filtering by `DUPLICATE_ID_CONFLICT` shows `tc-dedup-conflict`.
   - Clicking **Compare** opens the Side-by-Side Conflict Inspector comparing the PostgreSQL Master (`value: 25`, Status: OK) against the Competing Candidate (`value: 95`, Status: FAIL).

---

## 5. Conclusion
The Rule Engine, database schema, deduplication pipeline, and frontend CRM operate in strict compliance with all technical assessment specifications. All edge cases, invalid payloads, and relational history linkages are properly managed.
