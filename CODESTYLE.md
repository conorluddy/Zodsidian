# Code Style Guide

> **Core Principle**: Context is finite. Every token — code, comment, structure — competes for limited attention. Maximize signal, minimize noise. Write for two audiences: humans with limited working memory and AI agents with bounded context windows.

## Philosophy

The optimal code is the minimum necessary to solve the problem correctly. Every additional line is debt.

**Progressive Disclosure**: Structure code layer-by-layer. Readers grasp high-level flow immediately, drilling into details only when needed. File names indicate purpose. Directory structures mirror conceptual hierarchies. Function names describe behavior without reading implementation.

**Self-Documenting**: Names eliminate need for comments. Comments explain "why," never "what." If you chose algorithm A over B for subtle reasons, state that. If you're working around a library bug, explain it.

**Aggressive Minimalism**: Before adding code, ask: "Is this the simplest solution?" Before adding a comment: "Does this clarify something non-obvious?" Before introducing an abstraction: "Does this reduce complexity, or merely relocate it?"

**AHA Over DRY**: Avoid Hasty Abstractions. Wait for the 3rd duplication before extracting. The wrong abstraction is worse than duplication. Three similar lines of code is better than a premature abstraction.

## Naming

The #1 impact on readability. Good names eliminate mental translation overhead.

```typescript
// ✅ Descriptive, unambiguous
async function validateJsonAgainstSchema(
  schema: ZodSchema,
  input: string,
): Promise<ValidationResult>;

function calculateExponentialBackoff(attemptNumber: number, baseDelayMs: number): number;

// ❌ Vague, abbreviated
async function valJson(s: any, i: string): Promise<any>;
function calcBackoff(n: number, d: number): number;
```

**Rules**:

1. **Be specific**: `activeUsers` not `users`, `httpTimeoutMs` not `timeout`
2. **Include units**: `delayMs` not `delay`, `maxRetries` not `max`
3. **Avoid abbreviations**: `customer` not `cust`, `configuration` not `cfg`
4. **Use domain language**: Names from business domain, not technical abstractions
5. **Boolean prefixes**: `isValid`, `hasPermission`, `canEdit`, `shouldRetry`
6. **Verbs for functions**: `validateEmailFormat()` not `checkEmail()`, `fetchActiveUsers()` not `getUsers()`

## Function Design

### Single Responsibility with Explicit Contracts

```typescript
// ✅ Self-contained, explicit dependencies, typed contract
async function authenticateUser(
  credentials: UserCredentials,
  database: Database,
  currentTime: DateTime,
): Promise<Result<AuthSession, AuthError>> {
  // All dependencies visible in signature
  // Return type reveals all possible outcomes
}

// ❌ Hidden dependencies, unclear contract
async function auth(data: any): Promise<any> {
  // Uses global config, modifies global state
}
```

### Guard Clauses Over Nesting

Handle edge cases first, keep the happy path unindented and visible.

```typescript
// ✅ Guard clauses — happy path clear
function processOrder(order: Order): Result<Receipt, ProcessError> {
  if (!order) return err("missing_order");
  if (order.items.length === 0) return err("empty_order");
  if (order.total <= 0) return err("invalid_total");
  if (!order.paymentMethod) return err("missing_payment");

  return ok(completePayment(order));
}

// ❌ Nested conditions — happy path buried
function processOrder(order: Order) {
  if (order) {
    if (order.items.length > 0) {
      if (order.total > 0) {
        // Happy path buried 4 levels deep
      }
    }
  }
}
```

### Design Rules

1. **Single responsibility** — describable in one sentence
2. **Explicit dependencies** — all inputs as parameters, no hidden global state
3. **Type everything** — TypeScript strict mode, Python type hints
4. **Self-contained context units** — comprehensible without reading other files
5. **50-line guideline** — not a hard limit, but a refactoring trigger

## Error Handling

### Result Types — Make Errors Explicit

Errors belong in function signatures, not hidden behind `throw`.

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

type UserError = "not_found" | "unauthorized" | "network_failure";

async function fetchUser(id: string): Promise<Result<User, UserError>> {
  // Errors are part of the contract
}

// Usage forces error handling — compiler catches missing cases
const result = await fetchUser(userId);
if (!result.ok) {
  switch (result.error) {
    case "not_found":
      return show404();
    case "unauthorized":
      return redirectLogin();
    case "network_failure":
      return showRetry();
  }
}
```

**When to use Result types**: API calls, file I/O, validation, any complex error path.
**When to use exceptions**: Truly exceptional/unrecoverable situations (out of memory, corrupted state).

### Branded Types — Validate at Boundaries

```typescript
type ValidatedEmail = string & { readonly __brand: "ValidatedEmail" };
type UserId = string & { readonly __brand: "UserId" };

function validateEmail(input: string): ValidatedEmail | null {
  return isValidEmail(input) ? (input as ValidatedEmail) : null;
}

// Type system prevents using unvalidated data
function sendEmail(to: ValidatedEmail, subject: string) {
  // No need to re-validate — type guarantees validity
}
```

Once you have a `ValidatedEmail`, downstream functions carry zero validation overhead. The type system encodes the knowledge that validation occurred.

### Error Principles

1. **Never silently swallow errors** — log or propagate, never ignore
2. **Fail fast at boundaries** — validate inputs immediately, not deep in call stack
3. **Provide actionable messages** — what failed, expected vs actual, how to fix

```typescript
// ✅ Actionable error with context
throw new ValidationError(
  `Email validation failed for "user_email": ` +
    `Expected "name@domain.com", received "${input}". ` +
    `Use validateEmailFormat() to check before calling.`,
);

// ❌ Opaque
throw new Error("Validation failed");
```

## File & Module Organization

### Structure with Clear Boundaries

```typescript
// ========================================
// PUBLIC API
// ========================================

export class UserService {
  constructor(private readonly db: Database) {}

  async createUser(data: CreateUserData): Promise<Result<User, CreateError>> {
    // Public interface
  }
}

// ========================================
// VALIDATION
// ========================================

function validateUserData(data: unknown): Result<ValidatedData, ValidationError> {
  // Grouped validation logic
}

// ========================================
// PRIVATE HELPERS
// ========================================

function hashPassword(password: string): Promise<HashedPassword> {
  // Internal implementation
}
```

### Organization Rules

1. **Group by feature/domain**, not file type — `authentication/`, `orders/`, `payments/`
2. **Public API first** — exported functions at top, helpers at bottom
3. **One major export per file** — `UserService.ts` exports `UserService`
4. **Co-locate tests** — `UserService.test.ts` next to `UserService.ts`
5. **300-line guideline** — not a hard limit, but a refactoring trigger
6. **Minimal cross-module dependencies** — each module is a clean context boundary

```
project/
├── authentication/     # Self-contained context
│   ├── index.ts       # Public API only
│   ├── credentials.ts
│   ├── sessions.ts
│   └── README.md      # Module architecture
├── orders/            # Independent context
└── storage/           # Independent context
```

## Testing

### Testing Trophy — Mostly Integration

"Write tests. Not too many. Mostly integration." — Kent C. Dodds

1. **Static Analysis** (foundation): TypeScript strict mode, ESLint
2. **Unit Tests** (narrow): Pure functions, complex algorithms
3. **Integration Tests** (widest — most tests here): How pieces work together, where bugs actually live
4. **E2E Tests** (top): Critical user journeys only

### Tests as Documentation

Test names describe scenarios. Docstrings explain "why." Tests demonstrate usage.

```typescript
test("should reject invalid credentials without revealing if username exists", async () => {
  // Prevents username enumeration attacks
  const auth = new Authenticator(database);

  const result = await auth.authenticate({
    email: "nonexistent@example.com",
    password: "any-password",
  });

  expect(result.ok).toBe(false);
  expect(result.error.code).toBe("INVALID_CREDENTIALS");
  expect(result.error.message).not.toContain("user not found");
});
```

### Testing Rules

1. **Test behavior, not implementation** — focus on inputs/outputs, not internal state
2. **One concept per test** — don't test multiple unrelated things
3. **Integration over unit** — test pieces working together (more confidence per test, more resilient to refactoring)
4. **Clear test names** — describe the scenario: `test('user can add items to cart')`
5. **80% coverage minimum** — focus on critical paths

## Observability

### Structured Logging

```typescript
// ✅ Structured — queryable, correlated
logger.info("Request processed", {
  request_id: requestId,
  user_id: userId,
  endpoint: req.path,
  method: req.method,
  duration_ms: duration,
  status_code: res.statusCode,
  cache_hit: cacheHit,
});

// ❌ Unstructured — hard to query
logger.info(`User ${userId} accessed ${req.path}`);
```

### What to Log

**Always include**: request_id, user_id, trace_id, entity IDs, operation type, duration_ms, error details.

**Log at critical boundaries**:

- External API calls (request/response)
- Database operations (query, duration)
- Authentication/authorization decisions
- Error occurrences with full context

**One structured event per operation** — derive metrics, logs, or traces from the same data. Don't instrument separately for each observability pillar.

## Agentic Coding Patterns

These patterns address the unique demands of code that will be read, modified, and executed by AI agents alongside humans.

### Idempotent Operations

Agents retry. Network calls fail. Tasks get re-run. Design every mutation to be safely repeatable.

```typescript
// ✅ Idempotent — safe to retry
async function ensureUserExists(email: ValidatedEmail, db: Database): Promise<User> {
  const existing = await db.users.findByEmail(email);
  if (existing) return existing;
  return db.users.create({ email });
}

// ❌ Non-idempotent — duplicates on retry
async function createUser(email: string, db: Database): Promise<User> {
  return db.users.create({ email });
}
```

### Explicit State Machines Over Implicit Flows

When operations have distinct phases, model them explicitly. Agents reason about state machines far better than implicit status flags scattered across objects.

```typescript
type OrderState =
  | { status: "draft"; items: Item[] }
  | { status: "submitted"; items: Item[]; submittedAt: DateTime }
  | { status: "paid"; items: Item[]; submittedAt: DateTime; paymentId: string }
  | { status: "shipped"; items: Item[]; trackingNumber: string };

// Each transition is a pure function with clear preconditions
function submitOrder(
  order: OrderState & { status: "draft" },
): OrderState & { status: "submitted" } {
  return { ...order, status: "submitted", submittedAt: DateTime.now() };
}
```

### Machine-Parseable Errors

Agents need structured errors alongside human-readable ones. Return error codes that can be programmatically matched, with messages that explain context.

```typescript
type AppError = {
  code: "VALIDATION_FAILED" | "NOT_FOUND" | "CONFLICT" | "UPSTREAM_TIMEOUT";
  message: string; // Human-readable explanation
  field?: string; // Which input caused it
  retryable: boolean; // Can the caller retry?
};
```

### Atomic, Independently-Verifiable Changes

Structure work so each change can be validated in isolation. This applies to commits, PRs, and function design. An agent (or reviewer) should be able to verify correctness without understanding the entire system.

```typescript
// ✅ Each function is independently testable and verifiable
function parseConfig(raw: string): Result<Config, ParseError> {
  /* ... */
}
function validateConfig(config: Config): Result<ValidConfig, ValidationError[]> {
  /* ... */
}
function applyConfig(config: ValidConfig, system: System): Result<void, ApplyError> {
  /* ... */
}

// ❌ Monolithic — must understand everything to verify anything
function loadAndApplyConfig(path: string): void {
  /* 200 lines */
}
```

### Convention Over Configuration

Reduce the search space for agents (and humans). Consistent patterns mean less context needed per decision.

- Consistent file naming: `UserService.ts`, `UserService.test.ts`, `UserService.types.ts`
- Predictable directory structure across features
- Standard patterns for CRUD operations, API endpoints, error handling
- If your project has a pattern, follow it. If it doesn't, establish one and document it

### Contract-First Design

Define types before implementation. Types are the cheapest, most scannable form of documentation. An agent reading your types understands your system's data flow without reading a single function body.

```typescript
// Define the contract first
interface OrderService {
  create(data: CreateOrderInput): Promise<Result<Order, CreateOrderError>>;
  cancel(id: OrderId, reason: CancelReason): Promise<Result<void, CancelError>>;
  findByUser(
    userId: UserId,
    pagination: Pagination,
  ): Promise<PaginatedResult<OrderSummary>>;
}

// Then implement — the types guide everything
```

### Observable Side Effects

Every mutation should produce structured output describing what changed. This enables agents to verify their actions and enables humans to audit.

```typescript
type MutationResult<T> = {
  data: T;
  changes: Change[]; // What was modified
  warnings: string[]; // Non-fatal issues encountered
};

async function updateUserProfile(
  id: UserId,
  updates: ProfileUpdates,
): Promise<Result<MutationResult<UserProfile>, UpdateError>> {
  // Returns both the result AND a description of what changed
}
```

### Token-Efficient APIs

Design functions that return focused summaries with drill-down references, not data dumps.

```typescript
// ✅ Summary with references for drill-down
function getUserActivitySummary(userId: string, limit = 100): ActivitySummary {
  return {
    totalEvents: 1247,
    recentEvents: getRecentEvents(userId, 10),
    eventIdsByType: groupEventIds(userId),
    // Use getActivityDetails(eventId) for specifics
  };
}

// ❌ Returns everything — wastes tokens and memory
function getUserActivity(userId: string): Activity[] {
  return getAllEvents(userId); // Thousands of events
}
```

Support pagination (`limit`, `offset`) on any function that could return large result sets.

## Project Navigation

### CLAUDE.md at Project Root

Every project needs a navigation file. List entry points, patterns, and common tasks.

```markdown
# Project: Data Processing Pipeline

## Entry Points

- `src/main.ts`: CLI interface
- `src/api/server.ts`: REST API
- `src/processors/pipeline.ts`: Core processing

## Key Patterns

- All processors implement `Processor` interface (src/processors/base.ts)
- Config uses Zod schemas (src/config/schemas.ts)
- External APIs via `APIClient` (src/external/client.ts)

## Common Tasks

- Add data source → implement `DataSource` in `src/api/sources/`
- Add transformation → implement `Transformer` in `src/processors/transformers/`
```

Keep under 200 lines. Update when architecture changes.

### Module-Level READMEs

Every major directory gets a README answering: What is this? How does it work? What are the gotchas?

```markdown
# Module: User Authentication

## Purpose

JWT-based authentication with refresh token rotation

## Key Decisions

- bcrypt cost factor 12 for password hashing
- Access tokens expire after 15 minutes
- Refresh tokens stored in HTTP-only cookies

## Dependencies

- jose library for JWT (not jsonwebtoken — more secure)
- PostgreSQL for user storage
- Redis for token blacklist
```

### Progressive Context Hierarchy

1. **CLAUDE.md / README.md at root** — system overview, entry points, setup
2. **README.md per major module** — module purpose, key decisions, patterns
3. **Section comments in files** — group related code with clear headers
4. **Function/class docs** — purpose, examples for non-obvious APIs
5. **Inline comments** — only for "why" decisions

## Anti-Patterns

- **Premature optimization** — Measure first, optimize second
- **Hasty abstractions** — Wait for 3rd duplication before extracting
- **Clever code** — Simple and obvious beats clever and compact
- **Silent failures** — Log and propagate, never swallow
- **Vague interfaces** — `process(data: any): any` provides zero guidance
- **Hidden dependencies** — Global state, singletons, ambient imports
- **Nested conditionals** — Use guard clauses instead
- **Comments describing "what"** — If you need a comment to explain what code does, rename things
- **Premature generalization** — Build for today's requirements, not hypothetical futures
- **Token bloat** — Functions returning everything when callers need summaries

## Checklist

Before submitting code:

- [ ] Solves the stated problem with minimal code?
- [ ] A new developer can understand it without extensive context?
- [ ] Errors handled with actionable messages?
- [ ] Names clear, specific, and unambiguous?
- [ ] Functions have single, clear responsibilities?
- [ ] Dependencies explicit (no hidden global state)?
- [ ] Tests cover critical paths?
- [ ] Operations idempotent where applicable?
- [ ] Types define contracts before implementation?
- [ ] Would this work well with ~200 lines of surrounding context?

---

_"Any fool can write code that a computer can understand. Good programmers write code that humans can understand." — Martin Fowler_
