# Platform Storage Strategy for AgentOS

## Executive Summary

**Recommendation:** Use **graceful degradation** with platform-specific optimizations and a unified `AgentOSStorageAdapter` facade.

```typescript
// Single API for all platforms
const storage = await createAgentOSStorage({ 
  platform: 'auto',  // Detects: web, electron, capacitor, node, cloud
  persistence: true 
});
```

---

## Platform Matrix: Pros & Cons

### 🌐 Web (Browser)

| Adapter | Pros | Cons | Best For |
|---------|------|------|----------|
| **IndexedDB** (NEW) | ✅ Native browser API<br>✅ Async, non-blocking<br>✅ 50MB-1GB+ quota<br>✅ Structured transactions<br>✅ No WASM overhead | ❌ Complex API (wrapped by sql.js)<br>❌ IndexedDB quotas vary by browser<br>❌ No SQL queries (need sql.js layer) | **Primary choice** for web<br>Offline PWAs<br>Privacy-first apps |
| **sql.js** | ✅ Full SQLite in WASM<br>✅ In-memory fast reads<br>✅ Optional IDB persistence<br>✅ Zero dependencies | ❌ 500KB WASM load<br>❌ Slow writes to IDB<br>❌ Single-threaded | Fallback for web<br>Edge functions |
| **LocalStorage** | ✅ 5-10MB simple API | ❌ Synchronous (blocks UI)<br>❌ String-only<br>❌ No transactions | ❌ **NOT RECOMMENDED** |

**Winner:** **IndexedDB + sql.js** (our new IndexedDbAdapter)
- Best of both: native IDB durability + SQL convenience
- Auto-save batching minimizes IDB overhead
- Works offline, respects privacy

---

### 🖥️ Electron (Desktop)

| Adapter | Pros | Cons | Best For |
|---------|------|------|----------|
| **better-sqlite3** | ✅ **FASTEST** (native C++)<br>✅ Full SQLite features<br>✅ WAL mode for concurrency<br>✅ Synchronous API (no async overhead)<br>✅ Mature, battle-tested | ❌ Requires native compilation<br>❌ Must rebuild for Electron ABI<br>❌ Large binary (~5MB) | **Primary choice** for Electron<br>Production desktop apps |
| **sql.js** | ✅ No rebuild needed<br>✅ Cross-platform WASM | ❌ 3-5x slower than native<br>❌ Async overhead | Quick prototyping<br>CI/CD without build tools |
| **IndexedDB** | ✅ Available in Electron renderer | ❌ Slower than better-sqlite3<br>❌ Unnecessary abstraction | ❌ Use better-sqlite3 instead |

**Winner:** **better-sqlite3**
- Native performance is unbeatable for desktop
- Electron already handles native modules
- Fallback to sql.js if build fails

---

### 📱 Mobile (Capacitor: iOS/Android)

| Adapter | Pros | Cons | Best For |
|---------|------|------|----------|
| **@capacitor-community/sqlite** | ✅ **BEST** native SQLite on mobile<br>✅ iOS: Core Data integration<br>✅ Android: Native SQLite<br>✅ Encryption support<br>✅ Multi-threaded | ❌ Capacitor-specific<br>❌ Requires native plugins | **Primary choice** for mobile<br>Capacitor apps only |
| **IndexedDB** | ✅ Available in WebView<br>✅ Works without Capacitor | ❌ Slower than native<br>❌ Limited mobile quota<br>❌ Browser quirks on mobile | PWA-style mobile apps<br>Ionic without Capacitor |
| **sql.js** | ✅ Universal fallback | ❌ WASM overhead on mobile<br>❌ Battery drain | Emergency fallback only |

**Winner:** **@capacitor-community/sqlite** for Capacitor apps, **IndexedDB** for web-based mobile

---

### ☁️ Cloud (Node.js, Serverless)

| Adapter | Pros | Cons | Best For |
|---------|------|------|----------|
| **PostgreSQL** | ✅ **BEST** for multi-user<br>✅ Connection pooling<br>✅ JSONB, full-text search<br>✅ Horizontal scaling<br>✅ Cloud-native (RDS, Supabase, Neon) | ❌ Requires hosted DB<br>❌ Network latency<br>❌ Cost at scale | **Primary choice** for cloud<br>Multi-tenant SaaS<br>Real-time sync |
| **better-sqlite3** | ✅ Fast for single-user<br>✅ No external DB needed<br>✅ Simple deployment | ❌ File-based (hard to scale)<br>❌ No network access<br>❌ Single-writer limitation | Personal cloud instances<br>Dev/staging |
| **sql.js (ephemeral)** | ✅ Serverless edge (Cloudflare Workers)<br>✅ No cold start for DB | ❌ In-memory only<br>❌ State lost on restart | Stateless functions<br>Cache layer |

**Winner:** **PostgreSQL** for production, **better-sqlite3** for dev/staging

---

## Graceful Degradation Strategy

### Priority Cascade by Platform

```typescript
const PLATFORM_PRIORITIES: Record<Platform, AdapterKind[]> = {
  web: ['indexeddb', 'sqljs'],                    // NEW: IndexedDB first
  electron: ['better-sqlite3', 'sqljs'],          // Native first
  capacitor: ['capacitor', 'indexeddb', 'sqljs'], // Native mobile > WebView IDB
  node: ['better-sqlite3', 'postgres', 'sqljs'],  // Native > Cloud > WASM
  cloud: ['postgres', 'better-sqlite3', 'sqljs'], // Cloud-first
};
```

### Automatic Detection

```typescript
function detectPlatform(): Platform {
  if (typeof window !== 'undefined') {
    if (window.Capacitor?.isNativePlatform?.()) return 'capacitor';
    if (window.indexedDB) return 'web';
  }
  if (typeof process !== 'undefined') {
    if (process.versions?.electron) return 'electron';
    if (process.env.DATABASE_URL) return 'cloud';
    return 'node';
  }
  return 'unknown';
}
```

---

## AgentOS-First Integration

### Current State (Generic)
```typescript
// sql-storage-adapter is generic
const db = await createDatabase();
await db.run('CREATE TABLE sessions ...');  // Manual schema
```

### Proposed: AgentOS-Aware Storage

```typescript
// NEW: First-class AgentOS integration
import { createAgentOSStorage } from '@framers/sql-storage-adapter/agentos';

const storage = await createAgentOSStorage({
  platform: 'auto',        // Detects best adapter
  persistence: true,
  features: {
    conversations: true,   // Auto-creates conversation tables
    sessions: true,        // Auto-creates session tables
    personas: true,        // Auto-creates persona cache
    telemetry: true,       // Auto-creates analytics tables
  },
  cloudSync: {             // Optional cloud backup
    provider: 'supabase',
    apiKey: process.env.SUPABASE_KEY,
    syncInterval: 30000,   // 30s
  },
});

// Seamless AgentOS integration
const agentos = new AgentOS();
await agentos.initialize({
  storageAdapter: storage,  // Automatically wired
  // ... other config
});
```

---

## First-Class AgentOS Features

### 1. **Auto-Schema Migration**
```typescript
// Storage adapter knows AgentOS schema
await storage.migrate({
  from: '1.0.0',
  to: '1.1.0',
  // Automatically applies AgentOS schema updates
});
```

### 2. **Optimized Queries**
```typescript
// Built-in AgentOS operations (no manual SQL)
await storage.conversations.save(conversationId, events);
await storage.personas.cache(personaId, definition);
await storage.sessions.list({ userId, limit: 50 });
```

### 3. **Cross-Platform Sync**
```typescript
// Hybrid: local IndexedDB + cloud Postgres
const storage = await createAgentOSStorage({
  local: { adapter: 'indexeddb' },
  remote: { adapter: 'postgres', url: CLOUD_DB },
  syncStrategy: 'optimistic',  // Local-first, sync in background
});
```

### 4. **Export/Import**
```typescript
// Move data between platforms
const backup = await storage.export({ format: 'sqlite' });
// User downloads .db file

// Later, on different device/platform
await storage.import(backup);  // Works on any adapter
```

---

## Implementation Plan

### Phase 1: Unified Facade ✅ (Partially Done)
- [x] IndexedDB adapter with tests
- [ ] `createAgentOSStorage()` wrapper
- [ ] Platform auto-detection
- [ ] Graceful degradation with priority

### Phase 2: AgentOS-Aware Schema
- [ ] `AgentOSStorageAdapter` interface
- [ ] Pre-defined tables (conversations, sessions, personas)
- [ ] Auto-migration system
- [ ] Typed query builders

### Phase 3: Cross-Platform Sync
- [ ] Local-remote sync manager
- [ ] Conflict resolution
- [ ] Offline queue
- [ ] Cloud backup integration

### Phase 4: Performance Optimization
- [ ] Web Workers for sql.js (non-blocking)
- [ ] IndexedDB batch writes
- [ ] Connection pooling for Postgres
- [ ] WAL mode for better-sqlite3

---

## Concrete Recommendations

### For agentos-client (Web)
```typescript
// Use IndexedDB adapter (new)
import { IndexedDbAdapter } from '@framers/sql-storage-adapter';

const storage = new IndexedDbAdapter({
  dbName: 'agentos-workbench',
  autoSave: true,
  saveIntervalMs: 5000,
});

await storage.open();

// AgentOS uses it for conversations
const agentos = new AgentOS();
await agentos.initialize({
  storageAdapter: storage,  // Add this to AgentOSConfig
  // ...
});
```

### For voice-chat-assistant (Electron)
```typescript
// Use better-sqlite3 for desktop
import { BetterSqliteAdapter } from '@framers/sql-storage-adapter';

const storage = new BetterSqliteAdapter({
  filePath: path.join(app.getPath('userData'), 'agentos.db'),
});

await storage.open();
```

### For Mobile (Capacitor)
```typescript
// Use Capacitor native SQLite
import { CapacitorSqliteAdapter } from '@framers/sql-storage-adapter';

const storage = new CapacitorSqliteAdapter({
  database: 'agentos-mobile',
  encrypted: true,
});

await storage.open();
```

### For Backend (Cloud)
```typescript
// Use Postgres for multi-user
import { PostgresAdapter } from '@framers/sql-storage-adapter';

const storage = new PostgresAdapter({
  connectionString: process.env.DATABASE_URL,
});

await storage.open();
```

---

## Why Not Just Prisma?

| Aspect | sql-storage-adapter | Prisma |
|--------|---------------------|--------|
| **Client-side** | ✅ Works in browser (IndexedDB) | ❌ Server-only |
| **Offline** | ✅ Full offline support | ❌ Requires server |
| **Bundle size** | ✅ 50-500KB (per adapter) | ❌ 5-10MB (full client) |
| **Flexibility** | ✅ Swap adapters at runtime | ❌ Fixed at build time |
| **SQLite** | ✅ Native + WASM + mobile | ⚠️ Native only (no browser) |
| **Schema-free** | ✅ Dynamic schemas | ❌ Requires migrations |

**Verdict:** Use **both**
- sql-storage-adapter for client-side AgentOS
- Prisma for backend multi-user scenarios (already integrated)

---

## Summary Table

| Platform | Primary | Fallback | Notes |
|----------|---------|----------|-------|
| **Web** | IndexedDB | sql.js | NEW adapter = best web experience |
| **Electron** | better-sqlite3 | sql.js | Native performance critical |
| **Capacitor** | capacitor | IndexedDB | Native mobile > WebView |
| **Node** | better-sqlite3 | Postgres | Local-first, cloud optional |
| **Cloud** | Postgres | better-sqlite3 | Multi-tenant requires Postgres |

---

## Next Steps

1. **Add `storageAdapter` to `AgentOSConfig`** (currently missing)
2. **Create `createAgentOSStorage()` factory** with auto-detection
3. **Wire IndexedDB into agentos-client** for full offline capability
4. **Document migration** from current Prisma-only backend to hybrid storage
5. **Benchmark** IndexedDB vs sql.js for conversation history (10K+ messages)

**TL;DR:** IndexedDB is the best web adapter. Use platform-specific natives (better-sqlite3, capacitor) for desktop/mobile. Graceful degradation ensures AgentOS works everywhere, from offline browsers to cloud clusters.

