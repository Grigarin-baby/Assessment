# Technical Architecture: Ingestion Rule Engine & Record History System

**Author:** Senior Full-Stack Engineering  
**Project:** Record Ingestion & Reporting System  
**Status:** Approved for Implementation  
**Location:** `/doc/RULE_ENGINE_AND_RECORD_HISTORY_PLAN.md`

---

## 1. Executive Summary & Problem Statement

### 1.1 The Problems Addressed
1. **Messy Monolithic Validation:**  
   Standard validation logic frequently devolves into sprawling, nested `if/else` checks within a single service. This violates the **Single Responsibility Principle (SRP)** and makes adding or modifying validation rules fragile and bug-prone.
2. **Loss of Historical Audit on Duplicate Updates:**  
   When an incoming record shares an existing ID with a newer timestamp, updating the active record in-place destroys previous state unless an explicit revision history is maintained.
3. **Preparedness for Live Interview Challenges:**  
   The assessment explicitly warns:
   > *"The next stage is a short session where you will change this code with us watching."*  
   A modular Rule Engine enables introducing new business rules or modifying constraints in under 60 seconds with zero risk of breaking existing rules (adhering strictly to the **Open/Closed Principle**).

---

## 2. Ingestion Rule Engine Architecture

```mermaid
flowchart TD
    Raw["Raw Ingestion Record"] --> Engine["RuleEngineService"]
    
    subgraph Pipeline["Pipeline / Chain of Responsibility"]
        R1["1. RequiredFieldsRule<br/>(Presence check)"]
        R2["2. IdSanityRule<br/>(Trim & Non-empty)"]
        R3["3. SourceSanityRule<br/>(Trim & Length)"]
        R4["4. DateNormalizerRule<br/>(Multi-format & UTC ISO)"]
        R5["5. IntegerRangeRule<br/>(Sub-rules: isInteger, 0-100)"]
        R6["6. StatusEnumRule<br/>(OK, WARN, FAIL)"]
    end
    
    Engine --> Pipeline
    Pipeline --> Evaluation{"Any Violations?"}
    
    Evaluation -- Yes --> DLQ["Dead-Letter Vault (rejected_records)<br/>Accumulated reasons & raw payload"]
    Evaluation -- No --> Normalized["Normalized Candidate Record<br/>Deterministic SHA-256 Payload Hash"]
```

### 2.1 Core Contracts & Interfaces

```typescript
export interface RuleContext {
  sanitizedFields: Map<string, unknown>;
  errors: string[];
}

export interface IngestionRule {
  readonly code: string;
  readonly description: string;
  readonly priority: number;
  
  /**
   * Executes rule validation against the raw record.
   * If valid, sets normalized output into context.sanitizedFields.
   * If invalid, pushes specific error code(s) to context.errors.
   */
  execute(raw: Record<string, unknown>, context: RuleContext): Promise<boolean> | boolean;
}

export interface RuleEngineResult {
  isValid: boolean;
  normalizedRecord?: NormalizedRecord;
  primaryReason?: string;
  allReasons: string[];
}
```

---

### 2.2 Built-In Rule Modules & Sub-Rules

Each rule is implemented as an isolated class with dedicated sub-rules:

| Rule Class | Rule Code | Sub-Rules & Error Conditions | Normalized Output |
|---|---|---|---|
| **`RequiredFieldsRule`** | `MISSING_FIELD` | • Check presence of `id`, `source`, `recordedAt`, `value`, `status`<br>• Flags `MISSING_FIELD` if any required key is `undefined` or `null`. | None (structural check) |
| **`IdSanityRule`** | `EMPTY_OR_WHITESPACE_STRING` | • Must be `typeof string`<br>• Trim whitespace; reject if length is 0. | `id: string` |
| **`SourceSanityRule`** | `EMPTY_OR_WHITESPACE_STRING` | • Must be `typeof string`<br>• Trim leading/trailing whitespace; reject if empty. | `source: string` (trimmed) |
| **`DateNormalizerRule`** | `INVALID_DATE_FORMAT` | • Priority cascading parse: ISO 8601 UTC/offsets, Epoch sec/ms, SQL datetime, RFC 2822, date-only.<br>• Rejects calendar impossibilities (e.g. Feb 31) and unparseable strings. | `recordedAt: Date` (canonical UTC) |
| **`IntegerRangeRule`** | `VALUE_NOT_AN_INTEGER`<br>`VALUE_OUT_OF_RANGE` | • **Sub-rule 5A (Integer Check):** Rejects floats (`42.5`), strings (`"42"`), booleans.<br>• **Sub-rule 5B (Range Check):** Rejects values $< 0$ or $> 100$. | `value: number` (integer) |
| **`StatusEnumRule`** | `INVALID_STATUS` | • Strict case-sensitive match against `['OK', 'WARN', 'FAIL']`.<br>• Rejects lowercase (`ok`), synonyms (`SUCCESS`, `ERROR`), and whitespace. | `status: 'OK'\|'WARN'\|'FAIL'` |

---

### 2.3 Live Interview Extensibility Walkthrough

**Interview Scenario:** *"We want to add a rule that values above 90 can only be sent by source 'alpha'."*

**Implementation:**
Create one standalone file `backend/src/ingestion/rules/built-in/alpha-high-value.rule.ts`:
```typescript
@Injectable()
export class AlphaHighValueRule implements IngestionRule {
  readonly code = 'INVALID_HIGH_VALUE_SOURCE';
  readonly description = 'Values above 90 are restricted to source alpha';
  readonly priority = 70;

  execute(raw: Record<string, unknown>, context: RuleContext): boolean {
    const value = context.sanitizedFields.get('value') as number;
    const source = context.sanitizedFields.get('source') as string;

    if (value > 90 && source !== 'alpha') {
      context.errors.push(this.code);
      return false;
    }
    return true;
  }
}
```
Register it in `IngestionModule`. **Existing code is untouched. Zero regression risk.**

---

## 3. Parent/Child Record History Architecture

### 3.1 Relational Schema Design

```mermaid
erDiagram
    accepted_records ||--o{ record_history : "has older revisions (FK: acceptedRecordId)"
    ingest_runs ||--o{ accepted_records : "batch tracks"
    ingest_runs ||--o{ record_history : "batch tracks"

    accepted_records {
        string id PK "Business Document ID (e.g. r-0001)"
        string source
        datetime recordedAt "LATEST timestamp (Parent)"
        int value
        string status
        int version "Active revision count"
        string payloadHash
        string ingestRunId FK
    }

    record_history {
        string id PK "UUID"
        string acceptedRecordId FK "References accepted_records(id)"
        string source
        datetime recordedAt "OLDER timestamp (Child)"
        int value
        string status
        int version "Historical revision number"
        string payloadHash
        string ingestRunId FK
        datetime replacedAt "Timestamp when superseded"
    }
```

### 3.2 Prisma Schema Definition

```prisma
model AcceptedRecord {
  id          String          @id // The record's unique business ID (from incoming document)
  source      String
  recordedAt  DateTime        // Latest point in time (Parent)
  value       Int
  status      String          // "OK", "WARN", "FAIL"
  payloadHash String
  version     Int             @default(1)
  ingestRunId String
  ingestRun   IngestRun       @relation(fields: [ingestRunId], references: [id], onDelete: Cascade)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  // 1-to-Many Relation to Historical Revisions:
  history     RecordHistory[]

  @@index([source])
  @@index([status])
  @@index([recordedAt])
  @@index([payloadHash])
  @@map("accepted_records")
}

model RecordHistory {
  id               String         @id @default(uuid())
  acceptedRecordId String         // Foreign Key to the Master Document ID
  acceptedRecord   AcceptedRecord @relation(fields: [acceptedRecordId], references: [id], onDelete: Cascade)
  source           String
  recordedAt       DateTime       // Historical timestamp (Child)
  value            Int
  status           String
  payloadHash      String
  version          Int
  ingestRunId      String?
  replacedAt       DateTime       @default(now())

  @@index([acceptedRecordId])
  @@index([recordedAt])
  @@map("record_history")
}
```

---

### 3.3 Deterministic Ingestion Handling

When an incoming record arrives with an ID that already exists in the system:

```text
Incoming Record (candidate)
           │
           ▼
Compare candidate.recordedAt vs existing.recordedAt
           │
           ├─► candidate.recordedAt > existing.recordedAt (NEWER)
           │   1. Archive current master snapshot to `record_history` (FK -> candidate.id)
           │   2. Update `accepted_records` with candidate data
           │   3. Increment version
           │   4. Status: ACCEPTED (UPDATE)
           │
           ├─► candidate.recordedAt < existing.recordedAt (OLDER)
           │   1. Insert candidate directly into `record_history` (FK -> candidate.id)
           │   2. Parent remains untouched
           │   3. Increment parent version
           │   4. Status: ACCEPTED (HISTORICAL_CHILD)
           │
           ├─► candidate.recordedAt == existing.recordedAt && payloadHash matches
           │   1. Skip as idempotent no-op (R3)
           │   2. Status: SKIPPED
           │
           └─► candidate.recordedAt == existing.recordedAt && payloadHash differs
               1. Contradictory conflict at exact same millisecond
               2. Send to `rejected_records` with reason DUPLICATE_ID_CONFLICT
               3. Status: REJECTED
```

---

## 4. REST API Endpoints

### 4.1 `GET /api/records`
Returns paginated accepted records with revision count:
```json
{
  "data": [
    {
      "id": "20000000-0000-4000-8000-000000000001",
      "source": "alpha",
      "recordedAt": "2026-03-14T10:15:00.000Z",
      "value": 85,
      "status": "WARN",
      "version": 2,
      "_count": {
        "history": 1
      }
    }
  ]
}
```

### 4.2 `GET /api/records/:id/history`
Returns all historical child records for a document ID in reverse chronological order:
```json
{
  "masterId": "20000000-0000-4000-8000-000000000001",
  "history": [
    {
      "id": "e81d4fae-...",
      "acceptedRecordId": "20000000-0000-4000-8000-000000000001",
      "source": "alpha",
      "recordedAt": "2026-03-14T10:12:00.000Z",
      "value": 25,
      "status": "OK",
      "version": 1,
      "replacedAt": "2026-09-10T11:20:00.000Z"
    }
  ]
}
```

---

## 5. Frontend UI: Expandable History Dropdown

In `frontend/src/app/records/page.tsx`:
* When `record._count.history > 0`, row displays a badge button:  
  👉 **`History (N versions) ▾`**
* Clicking expands an inline revision accordion showing:
  * **Active Master Record (Parent):** Highlighted with a green "Latest Master" badge.
  * **Older Revisions (Children):** Rendered in a sub-table displaying `version`, `recordedAt`, `value`, `status`, and `superseded at`.

---

## 6. Implementation Steps

1. **Schema Migration:** Add `RecordHistory` model to `prisma/schema.prisma` and run `npx prisma db push`.
2. **Rule Engine Implementation:** Create `rules/` directory with `rule.interface.ts`, 6 built-in rule classes, and `RuleEngineService`.
3. **Pipeline Integration:** Update `IngestionService` to route validation through `RuleEngineService` and store superseded records in `RecordHistory`.
4. **API Controller:** Expose `GET /api/records/:id/history`.
5. **Frontend History Accordion:** Add expandable history row in `frontend/src/app/records/page.tsx`.
6. **Testing & Verification:** Run Jest test suite and verify parent/child rows in PostgreSQL.
