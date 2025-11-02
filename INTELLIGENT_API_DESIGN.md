# Intelligent API Design for SQL Storage Adapter

## Current State Analysis

### ✅ What's Good
- **Capability flags** (`StorageCapability`) exist for feature detection
- **Resolver** automatically selects best adapter for runtime
- **Type safety** with TypeScript throughout
- **Core interface** (`StorageAdapter`) is well-defined

### ❌ What's Missing

#### 1. **Runtime Introspection**
No easy way to query:
- What adapter is currently active?
- What capabilities are available right now?
- What are the limitations of the current adapter?

#### 2. **Graceful Degradation**
- No automatic fallback for unsupported operations
- Developers must manually check capabilities before calling optional methods
- No helper methods for "try this, or fall back to that"

#### 3. **Rich Type Information**
- `types/` folder exists but only has `extensions.ts`
- Missing: events, hooks, metadata, connection state, health checks
- No adapter-specific type exports (PostgreSQL vs SQLite differences)

#### 4. **Developer Experience**
- No global registry/singleton pattern for easy access
- No events for connection state changes, query performance, errors
- No built-in helpers for common patterns (migrations, seeding, health checks)

---

## Proposed Intelligent API Design

### 1. **AdapterContext - Runtime Introspection**

```typescript
interface AdapterContext {
  // Immutable runtime information
  readonly adapter: StorageAdapter;
  readonly kind: AdapterKind;
  readonly capabilities: ReadonlySet<StorageCapability>;
  readonly isOpen: boolean;
  readonly supportsSync: boolean;
  readonly supportsTransactions: boolean;
  readonly supportsBatch: boolean;
  readonly supportsPrepared: boolean;
  readonly supportsStreaming: boolean;
  readonly connectionInfo: ConnectionInfo;
  
  // Capability queries
  hasCapability(capability: StorageCapability): boolean;
  requiresCapability(capability: StorageCapability): void; // throws if missing
  
  // Limitations as JSON
  getLimitations(): AdapterLimitations;
  getStatus(): AdapterStatus;
}

interface ConnectionInfo {
  type: 'file' | 'memory' | 'network';
  engine: 'sqlite' | 'postgres' | 'mysql' | 'sqljs' | 'capacitor';
  version?: string;
  filePath?: string;
  host?: string;
  database?: string;
  readOnly: boolean;
}

interface AdapterLimitations {
  maxConnections?: number;
  maxStatementLength?: number;
  maxBatchSize?: number;
  supportedDataTypes: string[];
  unsupportedFeatures: string[];
  performanceCharacteristics: {
    concurrency: 'single' | 'pooled' | 'unlimited';
    persistence: 'memory' | 'file' | 'network';
    transactionIsolation: string[];
  };
}

interface AdapterStatus {
  healthy: boolean;
  connected: boolean;
  lastQuery?: Date;
  totalQueries: number;
  errors: number;
  uptime: number; // milliseconds
  metrics?: PerformanceMetrics;
}
```

### 2. **Graceful Degradation Helpers**

```typescript
interface StorageAdapterEnhanced extends StorageAdapter {
  // Context accessor
  readonly context: AdapterContext;
  
  // Graceful batch with fallback
  batchOrFallback(operations: BatchOperation[]): Promise<BatchResult>;
  
  // Graceful prepare with fallback
  prepareOrDirect<T>(statement: string): PreparedStatementOrDirect<T>;
  
  // Streaming with fallback to chunked all()
  stream?<T>(statement: string, params?: StorageParameters, options?: StreamOptions): AsyncIterable<T>;
  streamOrChunked<T>(statement: string, params?: StorageParameters, chunkSize?: number): AsyncIterable<T[]>;
  
  // Transaction with fallback to sequential execution
  transactionOrSequential<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T>;
}

// Wrapper that calls prepare() if available, otherwise returns direct executor
interface PreparedStatementOrDirect<T> {
  run(parameters?: StorageParameters): Promise<StorageRunResult>;
  get(parameters?: StorageParameters): Promise<T | null>;
  all(parameters?: StorageParameters): Promise<T[]>;
  finalize(): Promise<void>;
  readonly isPrepared: boolean; // true if using real prepared statement
}
```

### 3. **Event System**

```typescript
type AdapterEvent =
  | { type: 'connection:opened'; context: AdapterContext }
  | { type: 'connection:closed'; context: AdapterContext }
  | { type: 'connection:error'; error: Error; context: AdapterContext }
  | { type: 'query:start'; statement: string; parameters?: StorageParameters }
  | { type: 'query:complete'; statement: string; duration: number; rows?: number }
  | { type: 'query:error'; statement: string; error: Error; duration: number }
  | { type: 'transaction:start'; id: string }
  | { type: 'transaction:commit'; id: string; duration: number }
  | { type: 'transaction:rollback'; id: string; error?: Error }
  | { type: 'performance:slow-query'; statement: string; duration: number; threshold: number }
  | { type: 'cache:hit'; key: string; statement: string }
  | { type: 'cache:miss'; key: string; statement: string };

type AdapterEventListener = (event: AdapterEvent) => void;

interface EventEmitter {
  on(event: AdapterEvent['type'], listener: AdapterEventListener): () => void;
  once(event: AdapterEvent['type'], listener: AdapterEventListener): () => void;
  emit(event: AdapterEvent): void;
  removeAllListeners(): void;
}
```

### 4. **Global Registry Pattern**

```typescript
// Singleton for easy access across application
class StorageAdapterRegistry {
  private static instance?: StorageAdapterRegistry;
  private adapter?: StorageAdapterEnhanced;
  private events: EventEmitter;
  
  static getInstance(): StorageAdapterRegistry {
    if (!this.instance) {
      this.instance = new StorageAdapterRegistry();
    }
    return this.instance;
  }
  
  async initialize(options?: StorageResolutionOptions): Promise<AdapterContext> {
    this.adapter = await resolveStorageAdapterEnhanced(options);
    await this.adapter.open(options?.openOptions);
    this.events.emit({ type: 'connection:opened', context: this.adapter.context });
    return this.adapter.context;
  }
  
  getAdapter(): StorageAdapterEnhanced {
    if (!this.adapter) throw new Error('Adapter not initialized. Call initialize() first.');
    return this.adapter;
  }
  
  getContext(): AdapterContext {
    return this.getAdapter().context;
  }
  
  on(event: AdapterEvent['type'], listener: AdapterEventListener): () => void {
    return this.events.on(event, listener);
  }
}

// Usage:
const registry = StorageAdapterRegistry.getInstance();
await registry.initialize();
const adapter = registry.getAdapter();
const context = registry.getContext();

console.log(`Using ${context.kind} adapter with capabilities:`, context.capabilities);
console.log('Limitations:', JSON.stringify(context.getLimitations(), null, 2));
```

### 5. **Rich Type Definitions**

New files to add to `src/types/`:

```
types/
  ├── extensions.ts         (existing - performance metrics, migrations)
  ├── context.ts            (NEW - AdapterContext, ConnectionInfo, Status)
  ├── events.ts             (NEW - event types and emitter)
  ├── limitations.ts        (NEW - adapter-specific limitations)
  ├── helpers.ts            (NEW - utility types for developers)
  └── adapters/             (NEW - adapter-specific types)
      ├── sqlite.ts         (SQLite-specific extensions)
      ├── postgres.ts       (PostgreSQL-specific extensions)
      └── index.ts          (re-exports)
```

### 6. **Comprehensive Test Coverage**

New test files needed:

```
tests/
  ├── types.spec.ts                    (existing - 6 tests)
  ├── utils.spec.ts                    (existing - 8 tests)
  ├── postgresAdapter.spec.ts          (existing - 3 tests)
  ├── resolver.spec.ts                 (existing - 5 tests)
  ├── context.spec.ts                  (NEW - AdapterContext tests)
  ├── events.spec.ts                   (NEW - event emission tests)
  ├── graceful-degradation.spec.ts     (NEW - fallback behavior)
  ├── registry.spec.ts                 (NEW - singleton pattern tests)
  ├── integration/                     (NEW - cross-adapter tests)
  │   ├── migrations.spec.ts
  │   ├── transactions.spec.ts
  │   └── batch-operations.spec.ts
  └── adapters/                        (NEW - adapter-specific tests)
      ├── betterSqlite.spec.ts
      ├── sqlJs.spec.ts
      ├── capacitor.spec.ts
      └── supabase.spec.ts
```

Target coverage: **80%+ statements, 75%+ branches**

---

## Example Usage Scenarios

### Scenario 1: Check capabilities before using features

```typescript
import { StorageAdapterRegistry } from '@framers/sql-storage-adapter';

const registry = StorageAdapterRegistry.getInstance();
await registry.initialize();

const context = registry.getContext();

// Readable API - no manual Set checking
if (context.supportsBatch) {
  await registry.getAdapter().batch(operations);
} else {
  // Automatic fallback
  await registry.getAdapter().batchOrFallback(operations);
}
```

### Scenario 2: Log adapter limitations on startup

```typescript
const context = await registry.initialize();
const limitations = context.getLimitations();

console.log('Adapter Configuration:');
console.log('  Engine:', context.connectionInfo.engine);
console.log('  Type:', context.connectionInfo.type);
console.log('  Concurrency:', limitations.performanceCharacteristics.concurrency);
console.log('  Unsupported:', limitations.unsupportedFeatures.join(', '));
```

**Example output:**
```
Adapter Configuration:
  Engine: sqlite
  Type: file
  Concurrency: single
  Unsupported: streaming, arrays, json
```

### Scenario 3: Monitor query performance

```typescript
const registry = StorageAdapterRegistry.getInstance();
await registry.initialize();

// Subscribe to slow query events
registry.on('performance:slow-query', (event) => {
  console.warn(`Slow query detected (${event.duration}ms):`, event.statement);
  // Send to monitoring service
  analytics.track('slow_query', {
    statement: event.statement,
    duration: event.duration,
    threshold: event.threshold
  });
});

// Subscribe to errors
registry.on('query:error', (event) => {
  logger.error('Query failed:', event.error, { statement: event.statement });
});
```

### Scenario 4: Health checks for HTTP servers

```typescript
app.get('/health', async (req, res) => {
  const context = StorageAdapterRegistry.getInstance().getContext();
  const status = context.getStatus();
  
  res.json({
    healthy: status.healthy,
    adapter: context.kind,
    uptime: status.uptime,
    totalQueries: status.totalQueries,
    errors: status.errors,
    capabilities: Array.from(context.capabilities),
    limitations: context.getLimitations()
  });
});
```

**Example response:**
```json
{
  "healthy": true,
  "adapter": "postgres",
  "uptime": 3600000,
  "totalQueries": 1523,
  "errors": 2,
  "capabilities": ["transactions", "concurrent", "json", "arrays", "batch", "prepared"],
  "limitations": {
    "maxConnections": 100,
    "maxStatementLength": 1048576,
    "supportedDataTypes": ["integer", "text", "real", "blob", "json", "array"],
    "unsupportedFeatures": [],
    "performanceCharacteristics": {
      "concurrency": "pooled",
      "persistence": "network",
      "transactionIsolation": ["read_committed", "repeatable_read", "serializable"]
    }
  }
}
```

---

## Implementation Priority

### Phase 1: Foundation (Immediate)
1. ✅ Create `types/context.ts` - AdapterContext and related types
2. ✅ Create `types/events.ts` - Event system types
3. ✅ Create `types/limitations.ts` - Adapter limitation types
4. ✅ Implement AdapterContext in base adapters
5. ✅ Add comprehensive tests for new types

### Phase 2: Enhanced Features
6. Implement graceful degradation helpers (`batchOrFallback`, etc.)
7. Add EventEmitter to adapters
8. Create StorageAdapterRegistry singleton
9. Add adapter-specific limitation definitions

### Phase 3: Developer Experience
10. Create adapter-specific type exports (`types/adapters/`)
11. Add migration helpers and examples
12. Create comprehensive integration tests
13. Generate API documentation for all new features

### Phase 4: Polish
14. Add performance monitoring examples
15. Create migration guide from basic to enhanced API
16. Add health check middleware examples
17. Increase test coverage to 80%+

---

## Benefits

### For Developers
- **No manual capability checking** - Use helper methods with automatic fallback
- **Instant debugging** - `context.getStatus()` shows everything
- **Type safety** - Full TypeScript support for all features
- **Observable** - Subscribe to events for monitoring/logging
- **Predictable** - Know exactly what works on each adapter

### For Applications
- **Portable** - Same code works on SQLite, Postgres, SQL.js, Capacitor
- **Resilient** - Graceful degradation prevents runtime errors
- **Observable** - Built-in monitoring and health checks
- **Performant** - Use best features when available, fallback when not

### For Production
- **Health checks** - `/health` endpoint returns detailed adapter status
- **Monitoring** - Events integrate with APM tools (Sentry, DataDog, etc.)
- **Debugging** - Limitations JSON helps troubleshoot environment issues
- **Compliance** - Full audit trail of database operations via events

