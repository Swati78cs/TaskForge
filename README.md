# TaskForge — Distributed Background Job Scheduling & Execution Platform

TaskForge is a portfolio-grade, distributed background job processing, scheduling, and monitoring platform built with the MERN stack (MongoDB, Express, React, Node.js), Redis, BullMQ, and Docker.

---

## 1. System Architecture

```text
                         ┌───────────────────┐
                         │   React Frontend  │
                         └─────────┬─────────┘
                                   │
                              REST / HTTP
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Node.js + Express │
                         │       API         │
                         └─────────┬─────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     │                           │
                     ▼                           ▼
               ┌───────────┐              ┌────────────┐
               │  MongoDB  │              │   Redis    │
               │ Persistent│              │  BullMQ    │
               │   Data    │              │   Queue    │
               └───────────┘              └─────┬──────┘
                                                 │
                              ┌──────────────────┼──────────────────┐
                              │                  │                  │
                              ▼                  ▼                  ▼
                         ┌---------┐        ┌---------┐        ┌---------┐
                         │ Worker 1│        │ Worker 2│        │ Worker 3│
                         └────┬────┘        └────┬────┘        └────┬────┘
                              │                  │                  │
                              └──────────────────┼──────────────────┘
                                                 ▼
                                          Job Handlers
                                                 │
                                  ┌──────────────┼──────────────┐
                                  ▼              ▼              ▼
                         Resend Email        PDFKit PDF     Sharp Image / Axios

               ┌─────────────────────────────────────────────┐
               │         Scheduler Process (node-cron)       │
               │   Scans recurringJobs where nextRunAt <= now│
               │   → creates Job + enqueues to BullMQ        │
               │   → updates nextRunAt using cron expression │
               └─────────────────────────────────────────────┘
```

The system comprises three independently scalable Node.js processes:
1. **API Process (`server.js`)**: Handles HTTP requests, JWT auth, input validation, DB persistence, and job queueing.
2. **Worker Process (`worker.js`)**: Consumes BullMQ queue tasks, executes business logic handlers, records attempt telemetry, and manages crash recovery.
3. **Scheduler Process (`scheduler.js`)**: Dedicated cron process scanning recurring job schedules and executing dual-write reconciliation.

---

## 2. Technology Stack

- **Frontend**: React 18, Vite, React Router v7, Axios, Tailwind CSS, Recharts, Lucide Icons.
- **Backend API**: Node.js, Express.js, Mongoose, JWT (access + refresh tokens), bcryptjs, Zod, express-rate-limit, helmet.
- **Database**: MongoDB — persistent source of truth for users, jobs, schedules, attempt history, and worker telemetry.
- **Queueing & Messaging**: Redis, BullMQ — handles asynchronous queueing, priorities, delayed tasks, and worker concurrency.
- **Job Handlers**: Resend (Email), PDFKit (PDF generation), Sharp (Image manipulation), Axios (SSRF-protected HTTP client).
- **Scheduler**: Dedicated process running `node-cron` and `cron-parser`.
- **Infrastructure**: Docker, Docker Compose.
- **Testing**: Jest, Supertest, MongoDB Memory Server, Redis Memory Server.

---

## 3. Database Design & Schema Rationale

### Job Schema (`Job.js`)
```javascript
{
  userId: { type: ObjectId, ref: 'User', index: true, required: true },
  type: { type: String, enum: ['send_email', 'generate_pdf', 'process_image', 'api_request'], required: true },
  payload: { type: Mixed, default: {} },
  status: { type: String, enum: ['PENDING', 'QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED', 'RETRYING', 'DEAD_LETTER', 'CANCELLED'], default: 'PENDING', index: true },
  priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'], default: 'NORMAL' },
  idempotencyKey: { type: String, index: true, sparse: true },
  scheduledAt: { type: Date },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  lastError: { type: String },
  attemptHistory: [{ attemptNumber: Number, workerId: String, status: String, error: String, startedAt: Date, completedAt: Date, duration: Number }],
  startedAt: { type: Date },
  completedAt: { type: Date }
}
```

#### Rationale for Embedding `attemptHistory`:
`attemptHistory` is embedded inside the `Job` document rather than split into a separate collection because:
1. **Read Pattern Alignment**: Execution history logs are always read in conjunction with their parent job document (e.g., when viewing job details in the dashboard).
2. **Bounded BSON Growth**: The number of attempts is bounded by `maxAttempts` (maximum 10). Thus, the embedded array size is strictly controlled and avoids BSON 16MB document size limit issues.

---

## 4. Job State Machine & Transitions

```text
               ┌──────────┐
               │ PENDING  │
               └────┬─────┘
                    │ (Enqueue to BullMQ)
                    ▼
               ┌──────────┐
  (Cancel) ◄───│  QUEUED  │───► (Cancel)
               └────┬─────┘
                    │ (Worker pick up)
                    ▼
               ┌──────────┐
               │PROCESSING│
               └────┬─────┘
         ┌──────────┴──────────┐
 (Success)│                    │ (Failure)
         ▼                    ▼
   ┌──────────┐          ┌──────────┐
   │ SUCCESS  │          │  FAILED  │
   └──────────┘          └────┬─────┘
                              │ (attempts < maxAttempts)
                              ▼
                         ┌──────────┐
                         │ RETRYING │───► (Requeued to BullMQ)
                         └──────────┘
                              │ (attempts >= maxAttempts)
                              ▼
                         ┌──────────┐
                         │DEAD_LETTER│ ───► (Manual Retry API)
                         └──────────┘
```

---

## 5. Dual-Write Problem & Failure Handling

When a job is submitted, two writes must occur:
1. Save the job document in MongoDB (`status: PENDING`).
2. Add the task payload to the BullMQ queue in Redis (`status: QUEUED`).

### Immediate Dual-Write Error Handling
If MongoDB succeeds but Redis `queue.add()` fails (e.g. Redis crash, network disconnect):
- The API catches the exception immediately.
- The MongoDB job status is marked `FAILED` with `lastError: "Queue submission failed: <reason>"`.
- A 500 error is returned to the client indicating queue submission failed.

### Reconciliation Worker Task
In `scheduler.js`, a periodic task runs every 5 minutes scanning for jobs in `PENDING` status created more than 5 minutes ago. It automatically re-attempts BullMQ queue submission or marks them `FAILED`.

---

## 6. Worker Concurrency & Crash Recovery

### Concurrency
Each worker process reads `WORKER_CONCURRENCY` (default: 5) to process multiple jobs in parallel.

### Worker Crash Recovery (BullMQ Stall Detection)
Workers configure a `lockDuration` (default: 30,000ms). If a worker process crashes mid-execution:
- BullMQ's automatic stalled-job checker detects that the job's lock was not renewed.
- The job is moved back to the queue or marked stalled.
- When reprocessed by an active worker, TaskForge's worker syncs the MongoDB `status` and adds a new record in `attemptHistory`.

---

## 7. Dedicated Scheduler Process

The scheduler process (`node scheduler.js`):
1. Executes a `node-cron` scanner every 30 seconds.
2. Queries MongoDB `RecurringJob` collection where `status === 'active'` and `nextRunAt <= now`.
3. For each due schedule:
   - Instantiates a new `Job` document in MongoDB.
   - Enqueues the job to BullMQ.
   - Updates `lastRunAt = now`.
   - Computes `nextRunAt` using `cron-parser` based on the cron expression.

---

## 8. Retry Strategy & Exponential Backoff

When a worker job fails:
1. **Exponential Backoff Formula**:
   $$\text{delay} = \text{baseDelay} \times 2^{(\text{attempt} - 1)}$$
   For `baseDelay = 5000ms`: Attempt 1 = 5s, Attempt 2 = 10s, Attempt 3 = 20s.
2. **Dead-Letter Transition**:
   If `attempts >= maxAttempts`, job transitions to `DEAD_LETTER`.
3. **Manual DLQ Retry**:
   Authorized users/admins can trigger `POST /api/jobs/:id/retry` to manually move a `DEAD_LETTER` job back to `RETRYING`/`QUEUED`.

---

## 9. Idempotency & Delivery Guarantees

### Semantics Statement
TaskForge provides **at-least-once delivery with idempotent submission**.

- **Idempotent Submission**: Handled via a unique sparse index on `idempotencyKey` in MongoDB. Re-submitting a job with an existing `idempotencyKey` returns the existing job document without creating duplicate records.
- **Delivery Guarantee**: In distributed networks with potential worker crashes or partition events, exactly-once processing is mathematically impossible without end-to-end atomic multi-resource transactions. TaskForge guarantees at-least-once execution and relies on handler idempotency.

---

## 10. Failure Scenarios Matrix (Section 26 Verification)

| Scenario | System Recovery Mechanism |
|---|---|
| **1. Worker crashes mid-job** | BullMQ stall detection reclaims lock after `lockDuration` and requeues task. |
| **2. Redis temporarily unavailable** | Job submission fails gracefully; dual-write handler marks MongoDB status `FAILED`. |
| **3. MongoDB operation fails** | API catches database error, returns 500 JSON response, state consistency maintained. |
| **4. Job handler throws error** | Caught inside worker try/catch, logged to `attemptHistory`, triggers backoff retry or DLQ transition. |
| **5. External API timeout** | Axios timeout triggers handler error, treated as retryable failure. |
| **6. Job exceeds max attempts** | Automatically transitions state from `FAILED` -> `DEAD_LETTER`. |
| **7. Duplicate submission** | Idempotency key sparse unique index returns existing job reference. |
| **8. Multiple simultaneous workers** | BullMQ atomic Redis locking prevents double-processing. |
| **9. Worker heartbeat stops** | Worker service detects no heartbeat > 30s and flags worker status as `OFFLINE`. |
| **10. MongoDB succeeds but Redis fails** | Catch block marks job `FAILED` + periodic scheduler reconciliation task checks stale `PENDING` jobs. |

---

## 11. Security & SSRF Prevention

1. **Authentication & RBAC**: Short-lived JWT access tokens + refresh tokens. Role authorization middleware (`USER`, `ADMIN`). Resource ownership validation on all routes.
2. **SSRF Prevention**: The `api_request` handler explicitly validates target URLs:
   - Restricts protocols to `http:` and `https:`.
   - Blocks private/internal IP ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `0.0.0.0`, `::1`).
   - Blocks Cloud Metadata endpoint (`169.254.169.254`) and `localhost`.
3. **Rate Limiting**: Express rate limiters protect `/api/auth/login`, `/api/auth/register`, and `/api/jobs` submission endpoints.
4. **Security Headers**: `helmet` and `cors` configured.

---

## 12. REST API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register new user (`name`, `email`, `password`, `role`)
- `POST /api/auth/login` — Sign in (`email`, `password`)
- `POST /api/auth/logout` — Revoke session
- `GET /api/auth/me` — Retrieve user profile

### Job Management (`/api/jobs`)
- `POST /api/jobs` — Submit job (`type`, `payload`, `priority`, `maxAttempts`, `idempotencyKey`, `scheduledAt`)
- `GET /api/jobs` — List jobs with filters (`page`, `limit`, `status`, `type`, `priority`, `sort`)
- `GET /api/jobs/:id` — Fetch job details
- `DELETE /api/jobs/:id` — Cancel job (`PENDING`/`QUEUED` only)
- `POST /api/jobs/:id/retry` — Manually retry job (`FAILED`/`DEAD_LETTER` only)
- `GET /api/jobs/:id/logs` — Get attempt history timeline logs

### Schedules (`/api/schedules`)
- `POST /api/schedules` — Create recurring schedule (`name`, `jobType`, `cronExpression`, `payload`)
- `GET /api/schedules` — List schedules
- `GET /api/schedules/:id` — Get schedule details
- `PUT /api/schedules/:id` — Update schedule
- `DELETE /api/schedules/:id` — Delete schedule
- `POST /api/schedules/:id/toggle` — Toggle active/paused status

### Worker Monitoring (`/api/workers`)
- `GET /api/workers` — List worker fleet telemetry and status
- `GET /api/workers/:id` — Specific worker details

### Metrics (`/api/metrics`)
- `GET /api/metrics` — Aggregate overview counts, rates, latencies, and timeline chart data

---

## 13. Local Execution Guide

### Prerequisites
- Node.js (v18+)
- MongoDB (Running on `mongodb://127.0.0.1:27017`)
- Redis (Running on `127.0.0.1:6379`)

### Running Local Development Processes

1. **Install Server Dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Start API Server**:
   ```bash
   cd server
   npm run dev
   ```

3. **Start Independent Worker Process**:
   ```bash
   cd server
   npm run worker
   ```

4. **Start Dedicated Scheduler Process**:
   ```bash
   cd server
   npm run scheduler
   ```

5. **Start React Dashboard**:
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 14. Docker Compose Setup

Run the full system (MongoDB, Redis, API, Workers, Scheduler, Client) in Docker containers:

```bash
docker compose up --build
```

---

## 15. Testing Suite Execution

Run unit, integration, and E2E Jest test suites:

```bash
cd server
npm test
```

Test suite coverage includes:
- `tests/health.test.js`: Health endpoint & 404 handler
- `tests/auth.test.js`: Authentication, JWT, RBAC
- `tests/job.test.js`: Job CRUD, ownership isolation, state machine transitions
- `tests/worker.test.js`: BullMQ enqueueing and worker processing
- `tests/handlers.test.js`: 4 real job handlers & SSRF URL validation
- `tests/reliability.test.js`: Exponential backoff, DLQ transition, idempotency
- `tests/schedule.test.js`: Recurring cron schedule CRUD & engine scanning
- `tests/metrics.test.js`: System statistics and telemetry aggregation

---

## 16. Recommended Workspace Setup

Recommend the user to set `C:\Users\swati\.gemini\antigravity\scratch\taskforge` as their active workspace directory in Antigravity IDE.
