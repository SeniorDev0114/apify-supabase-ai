# Apify → Supabase → OpenAI Platform

A full-stack data ingestion and AI analysis platform that fetches data from Apify, stores it in Supabase, and analyzes it using OpenAI.

## 🏗️ Architecture

```
┌─────────┐      ┌──────────┐      ┌──────────┐      ┌──────┐
│  Apify  │ ───> │ Supabase │ ───> │  OpenAI  │ ───> │  UI  │
└─────────┘      └──────────┘      └──────────┘      └──────┘
```

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Schema Reasoning](#1-schema-reasoning)
- [Workflow Explanation](#2-workflow-explanation)
- [Scaling Considerations](#3-scaling-thought)
- [Failure Handling](#4-failure-handling)
- [System Health](#5-bonus-system-health)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Supabase account
- Apify account
- OpenAI API key

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Apify
APIFY_TASK_ID=your_task_id
APIFY_TOKEN=your_apify_token

# OpenAI
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini

# Next.js
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Optional for development
```

### Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  source_created_at TIMESTAMPTZ,
  analysis JSONB,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_analyzed_at ON records(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_external_id ON records(external_id);
CREATE INDEX IF NOT EXISTS idx_records_source ON records(source);
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 1. Schema Reasoning

### Why this schema design?

The schema is designed with the following principles:

#### **Core Fields**
- **`id`** (UUID, Primary Key): Standard unique identifier for internal operations
- **`external_id`** (TEXT, UNIQUE): Deduplication key from Apify. Prevents duplicate ingestion of the same external item
- **`source`** (TEXT): URL or source identifier for traceability
- **`content`** (TEXT): Main text content to analyze
- **`source_created_at`** (TIMESTAMPTZ): Original creation timestamp from source for temporal queries

#### **Analysis Fields**
- **`analysis`** (JSONB): Flexible storage for OpenAI results (summary, sentiment, keywords). JSONB allows:
  - Querying nested fields
  - Adding new analysis fields without schema changes
  - Efficient storage and indexing
- **`analyzed_at`** (TIMESTAMPTZ): Tracks when analysis completed for:
  - Health monitoring
  - Filtering unanalyzed records
  - Performance metrics

#### **Metadata Fields**
- **`created_at`** / **`updated_at`**: Audit trail and sorting

### Tradeoffs Considered

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Deduplication** | `external_id` UNIQUE constraint | Prevents duplicates while allowing re-ingestion attempts |
| **Analysis Storage** | JSONB vs separate columns | JSONB provides flexibility for evolving analysis structure without migrations |
| **Indexing** | 4 indexes on key fields | Balances query performance with write overhead |
| **Timestamps** | Both `created_at` and `updated_at` | Enables time-based queries and change tracking |
| **Content Type** | TEXT vs VARCHAR | TEXT handles variable-length content without size limits |

### Scalability Considerations

- **Current Design**: Optimized for simplicity and moderate scale (< 100K records)
- **Future Optimizations**: 
  - Partition by `created_at` for very large datasets
  - Separate `analysis` table for complex queries
  - Full-text search indexes on `content`

---

## 2. Workflow Explanation

### End-to-End Flow

#### **Step 1: Data Ingestion (Apify → Supabase)**

1. **User Action**: Click "Ingest Now" button
2. **API Call**: `POST /api/ingest`
3. **Apify Integration** (`lib/apify.ts`):
   - `startApifyTask()`: Triggers Apify actor/task via API
   - `waitForRunCompletion()`: Polls run status every 2 seconds until SUCCEEDED
   - `readApifyItems()`: Fetches dataset items from completed run
4. **Data Storage** (`lib/supabase-storage.ts`):
   - Maps Apify data structure to our schema
   - Checks for existing `external_id` to prevent duplicates
   - Inserts only new records
   - Returns count of inserted records

#### **Step 2: AI Analysis (Supabase → OpenAI → Supabase)**

1. **User Action**: Click "Analyze Records" button
2. **API Call**: `POST /api/analyze?limit=10`
3. **Record Selection**:
   - Queries records where `analyzed_at IS NULL`
   - Orders by `created_at` (oldest first)
   - Limits to 10 records (configurable)
4. **OpenAI Analysis** (`lib/openai.ts`):
   - For each record:
     - Calls OpenAI API with content (truncated to 4000 chars)
     - Requests: summary, sentiment, keywords
     - Implements retry logic with exponential backoff for rate limits
     - Waits 21 seconds between requests (respects 3 RPM limit)
5. **Update Records**:
   - Stores analysis JSON in `analysis` field
   - Sets `analyzed_at` timestamp
   - Continues even if individual records fail

#### **Step 3: UI Display**

1. **Page Load**: Server-side fetches records from Supabase
2. **Display**: Shows records with:
   - Content preview (expandable)
   - Analysis results (if available)
   - Action buttons (Analyze, Delete)
3. **Real-time Updates**: Toast notifications for all actions

### Data Flow Diagram

```
User Click "Ingest"
    ↓
POST /api/ingest
    ↓
executeApifyWorkflow()
    ├─> startApifyTask() → Apify API
    ├─> waitForRunCompletion() → Poll Apify
    └─> readApifyItems() → Get Dataset
    ↓
storeInSupabase()
    ├─> Check existing external_ids
    └─> Insert new records
    ↓
UI Refresh → Show new records

User Click "Analyze"
    ↓
POST /api/analyze
    ↓
getUnanalyzedRecords()
    ↓
For each record:
    ├─> analyzeContent() → OpenAI API
    │   ├─> Retry on 429 errors
    │   └─> Wait 21s between requests
    └─> updateRecordAnalysis()
    ↓
UI Refresh → Show analysis results
```

---

## 3. Scaling Thought

### If processing 100,000 records per day...

#### **Current Bottlenecks**

1. **Sequential Processing**: Analyzing records one-by-one (21s delay = ~1,700 records/day max)
2. **Synchronous API Calls**: Blocking operations in Next.js API routes
3. **No Queue System**: All processing happens in request handlers
4. **Database Queries**: Single queries without batching
5. **Rate Limits**: OpenAI 3 RPM limit severely constrains throughput

#### **Changes I Would Make First**

##### **1. Implement Job Queue (Priority: Critical)**

**Technology**: BullMQ or Inngest

```typescript
// Instead of processing in API route
export async function POST() {
  // Queue the analysis job
  await analysisQueue.add('analyze-batch', { limit: 100 });
  return NextResponse.json({ ok: true, queued: true });
}

// Worker processes jobs
analysisQueue.process(async (job) => {
  const records = await getUnanalyzedRecords(100);
  await analyzeBatch(records); // Process in parallel
});
```

**Benefits**:
- Non-blocking API responses
- Retry failed jobs automatically
- Scale workers horizontally
- Monitor queue health

##### **2. Parallel Processing**

**Current**: Sequential (1 record at a time)
**Target**: Process 10-20 records in parallel

```typescript
// Process in batches of 10
const batchSize = 10;
for (let i = 0; i < records.length; i += batchSize) {
  const batch = records.slice(i, i + batchSize);
  await Promise.all(batch.map(record => analyzeAndUpdate(record)));
  await delay(21000); // Rate limit delay between batches
}
```

**Impact**: 10x throughput improvement

##### **3. Database Optimizations**

- **Batch Inserts**: Insert 100 records at once instead of one-by-one
- **Connection Pooling**: Use Supabase connection pool
- **Read Replicas**: Separate read/write databases
- **Partitioning**: Partition `records` table by `created_at` (monthly)

##### **4. Caching Layer**

- **Redis Cache**: Cache OpenAI responses for similar content
- **Content Hashing**: Use content hash to detect duplicates before API call

##### **5. Rate Limit Management**

- **Multiple API Keys**: Rotate between keys to increase throughput
- **Token Bucket Algorithm**: Distribute requests evenly across time
- **Upgrade OpenAI Tier**: Higher rate limits (500+ RPM)

#### **Architecture for 100K/day**

```
┌─────────┐
│   API   │ → Queue (BullMQ/Inngest)
└─────────┘         ↓
              ┌──────────┐
              │ Workers  │ (10-20 instances)
              └──────────┘
                    ↓
         ┌──────────────────┐
         │  Parallel Batch  │ (10 records/batch)
         │  Processing      │
         └──────────────────┘
                    ↓
         ┌──────────────────┐
         │  OpenAI API      │ (with key rotation)
         └──────────────────┘
                    ↓
         ┌──────────────────┐
         │  Supabase        │ (batch updates)
         └──────────────────┘
```

**Expected Throughput**: 
- Current: ~1,700 records/day
- With optimizations: 50,000-100,000 records/day

---

## 4. Failure Handling

### Current Implementation

#### **Apify API Failures**

**Handled in** (`lib/apify.ts`):

1. **Task Start Failures**:
   - Validates environment variables
   - Tries both `actor-tasks` and `actors` endpoints
   - Returns detailed error messages

2. **Run Completion Failures**:
   - Polls with 2-second intervals
   - Handles FAILED/ABORTED status
   - 5-minute timeout with clear error

3. **Dataset Read Failures**:
   - Validates response structure
   - Returns empty array if dataset is empty

**Current Approach**: **Fail Fast** - Errors bubble up to API route, which returns 500

#### **OpenAI API Failures**

**Handled in** (`lib/openai.ts`):

1. **Rate Limits (429)**:
   - **Retry Logic**: Up to 3 retries with exponential backoff
   - **Retry-After Header**: Respects OpenAI's suggested wait time
   - **Fallback**: Exponential backoff (1s, 2s, 4s)

2. **API Errors**:
   - Validates response structure
   - Handles JSON parsing errors
   - Returns descriptive error messages

3. **Content Validation**:
   - Checks for empty content
   - Truncates to 4000 characters to avoid token limits

**Current Approach**: **Retry with Backoff** - Continues processing other records even if one fails

#### **Supabase Failures**

**Handled in** (`lib/supabase-storage.ts`):

1. **Connection Errors**:
   - Tests connection before operations
   - Detects network errors (ECONNREFUSED, ENOTFOUND)
   - Provides helpful error messages

2. **Duplicate Handling**:
   - Checks existing `external_id` before insert
   - Prevents constraint violations
   - Returns count of actually inserted records

3. **RLS Errors**:
   - Uses service role key for server-side operations
   - Validates table access before operations

**Current Approach**: **Validate and Fail Fast** - Clear error messages for debugging

### Improvements for Production

#### **1. Queue-Based Retry System**

**Why Queue?**
- **Decoupling**: API doesn't wait for long-running operations
- **Automatic Retries**: Failed jobs retry with exponential backoff
- **Persistence**: Jobs survive server restarts
- **Monitoring**: Track success/failure rates

**Implementation**:
```typescript
// Queue failed analyses for retry
if (error) {
  await retryQueue.add('analyze-record', { recordId }, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 60000 }
  });
}
```

#### **2. Dead Letter Queue (DLQ)**

For records that fail after all retries:
- Store in separate table: `failed_analyses`
- Include error details and timestamp
- Manual review/retry interface
- Alert if failure rate exceeds threshold

#### **3. Circuit Breaker Pattern**

Prevent cascading failures:
```typescript
if (openaiErrorRate > 0.5) {
  circuitBreaker.open(); // Stop making requests
  // Queue for later processing
  await queue.add('analyze-later', records);
}
```

#### **4. Alerting System**

- **Metrics**: Track API error rates, queue depth, processing time
- **Alerts**: 
  - OpenAI rate limit exceeded
  - Apify task failures
  - Queue depth > 1000
  - Analysis success rate < 90%

#### **5. Graceful Degradation**

- **Partial Success**: Continue processing even if some records fail
- **Fallback Analysis**: Use simpler analysis if OpenAI fails
- **Cached Results**: Return cached analysis if API is down

### Recommended Strategy

| Failure Type | Strategy | Why |
|-------------|----------|-----|
| **Apify Failures** | Queue + Retry | External service may be temporarily down |
| **OpenAI Rate Limits** | Retry + Queue | Rate limits are temporary, queue for later |
| **OpenAI API Errors** | Retry (3x) + DLQ | Transient errors common, persistent ones need review |
| **Supabase Errors** | Fail Fast + Alert | Database issues need immediate attention |
| **Malformed Responses** | Validate + DLQ | Data quality issues need manual review |

---

## 5. Bonus: System Health

### Implementation

A **System Health** page is available at `/health` that displays:

- **Total analyzed records**: Count of all records with `analyzed_at IS NOT NULL`
- **Last successful OpenAI call**: Timestamp of the most recent analysis

### Code Location

`app/health/page.tsx`

```typescript
export default async function Health() {
  const { count } = await supabaseAnon
    .from('records')
    .select('*', { count: 'exact', head: true });
  
  const { data: last } = await supabaseAnon
    .from('records')
    .select('analyzed_at')
    .not('analyzed_at', 'is', null)
    .order('analyzed_at', { ascending: false })
    .limit(1);

  return (
    <main>
      <h1>System Health</h1>
      <div>Total analyzed records: {count ?? 0}</div>
      <div>Last successful OpenAI call: {last?.[0]?.analyzed_at ?? '—'}</div>
    </main>
  );
}
```

### Uptime Monitoring Usage

#### **1. Automated Health Checks**

Set up a monitoring service (e.g., UptimeRobot, Pingdom) to:

- **Check URL**: `https://your-domain.com/health`
- **Frequency**: Every 5 minutes
- **Alert Condition**: 
  - Last OpenAI call > 1 hour ago (system stuck)
  - Total count not increasing (ingestion broken)
  - HTTP status != 200 (application down)

#### **2. Metrics to Track**

```typescript
// Additional metrics to add:
- Records ingested in last hour
- Records analyzed in last hour
- Average analysis time
- Error rate (failed analyses / total)
- Queue depth (if using queue)
- API response times
```

#### **3. Dashboard Integration**

Export metrics to:
- **Grafana**: Visualize trends over time
- **Datadog**: Correlate with infrastructure metrics
- **Custom Dashboard**: Real-time status page

#### **4. Alert Thresholds**

| Metric | Warning | Critical |
|--------|---------|----------|
| Last analysis | > 30 min | > 2 hours |
| Analysis rate | < 10/hour | < 1/hour |
| Error rate | > 10% | > 25% |
| Queue depth | > 100 | > 1000 |

### Future Enhancements

1. **Health API Endpoint**: JSON response for programmatic checks
2. **Historical Metrics**: Store metrics over time for trend analysis
3. **Component Health**: Individual status for Apify, Supabase, OpenAI
4. **Performance Metrics**: P50, P95, P99 response times

---

## API Endpoints

### Data Ingestion

- **POST** `/api/ingest` - Fetch data from Apify and store in Supabase
  - Returns: `{ ok, message, itemsCount, storedCount, storedRecords }`

### Analysis

- **POST** `/api/analyze?limit=10` - Analyze unanalyzed records
  - Query params: `limit` (1-50, default: 10)
  - Returns: `{ ok, message, analyzed, failed, results, errors }`

- **GET** `/api/analyze` - Get count of unanalyzed records
  - Returns: `{ ok, unanalyzedCount }`

### Record Management

- **DELETE** `/api/records/:id` - Delete a record
  - Returns: `{ ok, message }`

- **POST** `/api/records/:id?action=analyze` - Analyze a single record
  - Returns: `{ ok, message, analysis, record }`

### Health

- **GET** `/health` - System health status page

---

## Project Structure

```
apify-supabase-ai/
├── app/
│   ├── api/
│   │   ├── ingest/route.ts          # Data ingestion endpoint
│   │   ├── analyze/route.ts          # Batch analysis endpoint
│   │   └── records/[id]/route.ts     # Individual record operations
│   ├── components/
│   │   ├── ActionButtons.tsx         # Ingest/Analyze buttons
│   │   ├── RecordItem.tsx            # Record display with actions
│   │   ├── Toast.tsx                 # Toast notifications
│   │   └── ToastProvider.tsx         # Toast context
│   ├── health/page.tsx               # System health page
│   └── page.tsx                      # Main application page
├── lib/
│   ├── apify.ts                      # Apify API integration
│   ├── openai.ts                     # OpenAI API integration
│   ├── supabase.ts                   # Supabase client setup
│   └── supabase-storage.ts           # Database operations
└── README.md                         # This file
```

---

## Technologies Used

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Supabase** - PostgreSQL database with real-time capabilities
- **OpenAI API** - GPT-4o-mini for content analysis
- **Apify API** - Web scraping and data extraction
- **Tailwind CSS** - Styling
