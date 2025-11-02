# API Redesign: Simple, Intuitive Database Creation

## Overview

The SQL Storage Adapter now features a **simplified, high-level API** that makes database creation intuitive and automatic. No more wrestling with adapter names or resolver options!

## New API Functions

### `createDatabase(options?)` - Auto-Detecting Magic ✨

The main function you'll use. It automatically detects the best database for your environment.

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

// Auto-detects from DATABASE_URL environment variable
const db = await createDatabase();

// Explicit URL
const db = await createDatabase({ 
  url: 'postgresql://user:pass@host/db' 
});

// Local file
const db = await createDatabase({ 
  file: './app.db' 
});

// In-memory (perfect for testing)
const db = await createDatabase({ 
  type: 'memory' 
});

// Force specific type
const db = await createDatabase({ 
  type: 'postgres' 
});
```

**Auto-Detection Logic:**
- If `DATABASE_URL` is set → PostgreSQL
- If browser environment → SQL.js
- If Capacitor mobile → Capacitor SQLite
- Otherwise → Better-SQLite3 (local file)

### `connectDatabase(config)` - Explicit Remote Connection

For when you want to explicitly connect to a remote database with full configuration.

```typescript
import { connectDatabase } from '@framers/sql-storage-adapter';

const db = await connectDatabase({
  host: 'db.example.com',
  port: 5432,
  database: 'myapp',
  user: 'dbuser',
  password: process.env.DB_PASSWORD,
  ssl: true,
  max: 20  // Connection pool size
});
```

### `openDatabase(filePath)` - File-Based Database

Simple file-based database creation.

```typescript
import { openDatabase } from '@framers/sql-storage-adapter';

// Local SQLite file
const db = await openDatabase('./my-app.db');

// In-memory
const db = await openDatabase(':memory:');
```

### `createMemoryDatabase()` - Testing Database

Perfect for tests, experiments, and development.

```typescript
import { createMemoryDatabase } from '@framers/sql-storage-adapter';

const db = await createMemoryDatabase();
```

## Migration from Old API

### Before (Technical, Awkward) ❌

```typescript
import { resolveStorageAdapter } from '@framers/sql-storage-adapter';

// Confusing: Why do I need to know about "priority" and "adapters"?
const db = await resolveStorageAdapter({
  priority: ['postgres'],
  postgres: {
    connectionString: process.env.DATABASE_URL
  }
});
```

### After (Simple, Clear) ✅

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

// Just works!
const db = await createDatabase();
```

## Real-World Examples

### Environment-Based (Production vs Development)

```typescript
// .env.production
DATABASE_URL=postgresql://user:pass@prod.db.com/app

// .env.development
DATABASE_URL=  # Empty

// Your code (same in both environments!)
const db = await createDatabase();
// → PostgreSQL in production
// → SQLite locally
```

### Multi-Platform App

```typescript
// Works on Node.js, Browser, Electron, Mobile!
const db = await createDatabase();

// The library auto-detects:
// - Node.js → Better-SQLite3
// - Browser → SQL.js
// - Electron → Better-SQLite3
// - Mobile → Capacitor SQLite
```

### Explicit Configuration (When You Need It)

```typescript
const db = await createDatabase({
  url: process.env.DATABASE_URL,
  postgres: {
    ssl: { rejectUnauthorized: true },
    max: 20,
    statement_timeout: 30000,
    application_name: 'my-app-v1.0'
  }
});
```

### Testing

```typescript
import { createMemoryDatabase } from '@framers/sql-storage-adapter';
import { describe, it, beforeEach } from 'vitest';

describe('User Service', () => {
  let db;

  beforeEach(async () => {
    // Fresh database for each test
    db = await createMemoryDatabase();
    await db.open();
  });

  it('creates users', async () => {
    await db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
    // ... your test
  });
});
```

## Advanced Options

### Custom Priority

If you need fine-grained control:

```typescript
const db = await createDatabase({
  priority: ['postgres', 'better-sqlite3', 'sqljs'],
  postgres: { /* config */ },
  filePath: './fallback.db'
});
```

### Mobile Configuration

```typescript
const db = await createDatabase({
  type: 'mobile',
  mobile: {
    database: 'myapp.db',
    version: 1,
    encrypted: true
  }
});
```

## Export/Import/Migration Features

All migration utilities work seamlessly with the new API:

```typescript
import { 
  createDatabase, 
  openDatabase,
  migrateLocalToSupabase,
  exportData,
  importData,
  createBackup
} from '@framers/sql-storage-adapter';

// Export from PostgreSQL
const prodDb = await createDatabase();
const data = await exportData(prodDb, { format: 'json' });

// Import to local SQLite
const localDb = await openDatabase('./backup.db');
await importData(localDb, data, { onConflict: 'replace' });

// Or migrate directly
const result = await migrateLocalToSupabase(localDb, prodDb, {
  verify: true,
  onConflict: 'replace'
});
console.log(`Migrated ${result.rowsImported} rows`);
```

## Backwards Compatibility

The old `resolveStorageAdapter()` function still works! It's not going anywhere. But we recommend using the new API for better developer experience.

```typescript
// Still works (but not recommended for new code)
import { resolveStorageAdapter } from '@framers/sql-storage-adapter';

const db = await resolveStorageAdapter({
  priority: ['postgres'],
  postgres: { connectionString: process.env.DATABASE_URL }
});
```

## Why the Change?

### Old API Problems
- ❌ Too technical - users need to know about "adapters" and "resolvers"
- ❌ Verbose - simple tasks require complex configuration
- ❌ Not intuitive - "priority" arrays and adapter names are confusing
- ❌ Function name doesn't describe what it does

### New API Benefits
- ✅ Intuitive - `createDatabase()` does what it says
- ✅ Auto-detecting - Just works in most cases
- ✅ Simple - One function for most use cases
- ✅ Clear specialized functions - `openDatabase()`, `connectDatabase()`, `createMemoryDatabase()`
- ✅ Progressive complexity - Simple by default, powerful when needed

## Summary

| Task | Old API | New API |
|------|---------|---------|
| Auto-detect database | `resolveStorageAdapter({ postgres: { connectionString: process.env.DATABASE_URL } })` | `createDatabase()` |
| Remote PostgreSQL | `resolveStorageAdapter({ priority: ['postgres'], postgres: {...} })` | `createDatabase({ url: '...' })` |
| Local file | `resolveStorageAdapter({ priority: ['better-sqlite3'], filePath: './app.db' })` | `openDatabase('./app.db')` |
| In-memory test | `resolveStorageAdapter({ priority: ['better-sqlite3'], filePath: ':memory:' })` | `createMemoryDatabase()` |
| Explicit config | `resolveStorageAdapter({ priority: [...], postgres: {...} })` | `connectDatabase({...})` |

**The new API is designed to be:**
- **Simple** - One function does it all
- **Smart** - Auto-detects the right database
- **Scalable** - Same code works from prototype to production
- **Intuitive** - Function names describe what they do
