<p align="center">
  <a href="https://frame.dev" target="_blank" rel="noopener">
    <img src="./branding/frame-wordmark.svg" alt="Frame logo" width="320">
  </a>
</p>

# SQL Storage Adapter

[![npm version](https://img.shields.io/npm/v/@framers/sql-storage-adapter.svg)](https://www.npmjs.com/package/@framers/sql-storage-adapter)
[![CI](https://github.com/framersai/sql-storage-adapter/actions/workflows/ci.yml/badge.svg)](https://github.com/framersai/sql-storage-adapter/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/framersai/sql-storage-adapter/branch/master/graph/badge.svg)](https://codecov.io/gh/framersai/sql-storage-adapter)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)

> One SQL interface for Node.js, browsers, and mobile apps. Write your database code once, run it anywhere.

**[Documentation](https://framersai.github.io/sql-storage-adapter/)** | **[GitHub](https://github.com/framersai/sql-storage-adapter)** | **[NPM](https://www.npmjs.com/package/@framers/sql-storage-adapter)** | **[Changelog](./CHANGELOG.md)** | **[Frame.dev](https://frame.dev)**

## Why?

Build apps that work across platforms without rewriting database code:
- 🖥️ **Desktop** (Electron) - fast local storage with better-sqlite3
- 🌐 **Web** - in-browser SQL with sql.js (WebAssembly)
- 📱 **Mobile** (Capacitor/React Native) - native SQLite
- ☁️ **Server** - PostgreSQL or SQLite

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

// Auto-picks the best adapter for your environment
const db = await createDatabase();

// Same code everywhere
await db.run('INSERT INTO users (name) VALUES (?)', ['Alice']);
const user = await db.get('SELECT * FROM users WHERE id = ?', [1]);
```

## Installation

```bash
npm install @framers/sql-storage-adapter

# Install adapters you need:
npm install better-sqlite3      # Desktop (Node.js/Electron)
npm install pg                  # PostgreSQL (servers)
npm install @capacitor-community/sqlite  # Mobile (Capacitor)
# sql.js included - no extra install needed
```

## Quick Start

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

// Create database (auto-detects best option)
const db = await createDatabase();

// Create table
await db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY,
    task TEXT NOT NULL,
    done INTEGER DEFAULT 0
  )
`);

// Insert data
await db.run('INSERT INTO todos (task) VALUES (?)', ['Buy groceries']);

// Query data
const todos = await db.all('SELECT * FROM todos WHERE done = 0');

// Clean up
await db.close();
```

## Project Structure

```
src/
  adapters/            # Storage backends (better-sqlite3, postgres, sql.js, supabase, ...)
  core/                # Fundamental contracts, resolver, and database APIs
  features/
    backup/            # Cloud backup manager
    migrations/        # Export/import helpers
    sync/              # Offline/online sync manager
  shared/              # Cross-cutting helpers (e.g. parameter normalisation)
  types/               # Type-only re-export entrypoints
```

The new layout makes it easier to jump between low-level contracts and higher-level features, and keeps optional tooling out of the critical path for runtime adapters.

## Core API

```typescript
// Execute SQL (no results)
await db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');

// Run mutation (INSERT/UPDATE/DELETE)
const result = await db.run('INSERT INTO users (name) VALUES (?)', ['Alice']);
console.log(result.lastInsertRowid);  // Auto-increment ID

// Get single row
const user = await db.get<User>('SELECT * FROM users WHERE id = ?', [1]);

// Get all rows
const users = await db.all<User>('SELECT * FROM users');

// Transactions (automatic commit/rollback)
await db.transaction(async (tx) => {
  await tx.run('INSERT INTO users (name) VALUES (?)', ['Bob']);
  await tx.run('INSERT INTO posts (user_id, title) VALUES (?, ?)', [1, 'Hello']);
});

// Batch operations (if supported)
if (db.capabilities.has('batch')) {
  await db.batch([
    { statement: 'INSERT INTO users (name) VALUES (?)', parameters: ['Alice'] },
    { statement: 'INSERT INTO users (name) VALUES (?)', parameters: ['Bob'] }
  ]);
}

// Close connection
await db.close();
```

## Adapter Selection

Auto-detection order:

```
🖥️ Node.js:     better-sqlite3 → sql.js
🌐 Browser:     sql.js
📱 Mobile:      capacitor-sqlite → sql.js
☁️ Server:      postgres → better-sqlite3 → sql.js
```

Override with specific adapter:

```typescript
// Use PostgreSQL explicitly
const db = await createDatabase({ 
  url: 'postgresql://localhost/mydb' 
});

// Use SQLite explicitly
const db = await createDatabase({ 
  file: './app.db' 
});

// Custom priority
const db = await createDatabase({
  priority: ['postgres', 'better-sqlite3'],
  postgres: { connectionString: process.env.DATABASE_URL },
  filePath: './fallback.db'
});
```

## Auto-Sync & Offline Support

Build offline-first apps with automatic cloud sync:

```typescript
import { createSyncManager } from '@framers/sql-storage-adapter';

const manager = await createSyncManager({
  primary: './app.db',                     // Local SQLite
  remote: process.env.DATABASE_URL,        // Cloud PostgreSQL
  sync: {
    mode: 'auto',                          // Auto-sync after writes
    conflictStrategy: 'last-write-wins'
  }
});

// Work offline
await manager.db.run('INSERT INTO tasks (title) VALUES (?)', ['Buy milk']);

// Sync manually when needed
const result = await manager.sync();
console.log(`Synced ${result.recordsSynced} records`);
```

**Sync Modes:**
- `manual` - Call `sync()` explicitly (default)
- `auto` - Syncs after writes (debounced)
- `periodic` - Syncs every N seconds
- `realtime` - Syncs immediately on every write
- `on-reconnect` - Syncs when network returns

**Conflict Strategies:**
- `last-write-wins` - Newest timestamp wins (default)
- `local-wins` - Local always wins
- `remote-wins` - Server is authority
- `merge` - Custom merge function
- `keep-both` - Duplicate records

📖 **[Complete Offline Sync Guide](./guides/OFFLINE_SYNC.md)** - 8 real-world examples with mobile optimization

## Cloud Backups

Automatic S3-compatible backups (AWS S3, Cloudflare R2, MinIO):

```typescript
import { S3Client } from '@aws-sdk/client-s3';
import { createCloudBackupManager } from '@framers/sql-storage-adapter';

const s3 = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const manager = createCloudBackupManager(db, s3, 'my-backups', {
  interval: 3600000,  // Hourly backups
  maxBackups: 24,     // Keep 24 backups
  options: { compression: 'gzip' }
});

manager.start();  // Auto-backup every hour

// Manual backup
await manager.backupNow();

// Restore
await manager.restore('backups/my-database-2024-01-15.json.gz');
```

## Data Migration

Export, import, and migrate between adapters:

```typescript
import { 
  migrateLocalToSupabase,
  exportAsJSON,
  importFromJSON 
} from '@framers/sql-storage-adapter';

// Export to JSON
const backup = await exportAsJSON(db, { 
  tables: ['users', 'posts'],
  includeSchema: true 
});

// Import from JSON
await importFromJSON(db, backup, {
  dropTables: true,
  batchSize: 100
});

// Migrate SQLite → PostgreSQL
const result = await migrateLocalToSupabase(sqliteDb, postgresDb, {
  verify: true,
  onConflict: 'replace'
});

console.log(`Migrated ${result.rowsImported} rows in ${result.duration}ms`);
```

## PostgreSQL Remote Connections

Connect to hosted databases (AWS RDS, Heroku, Supabase, etc.):

```typescript
import { connectDatabase } from '@framers/sql-storage-adapter';

// Auto-detect from DATABASE_URL
const db = await connectDatabase(process.env.DATABASE_URL);

// Or configure explicitly
const db = await connectDatabase({
  host: 'db.example.com',
  database: 'myapp',
  user: 'dbuser',
  password: process.env.DB_PASSWORD,
  ssl: true,
  max: 20  // Connection pool size
});

// Same API as SQLite!
const users = await db.all('SELECT * FROM users');
```

📖 **[PostgreSQL Remote Guide](./guides/POSTGRES_REMOTE_CONNECTION.md)** - Cloud provider examples & SSL config

## Adapter Comparison

| Adapter | Best For | Speed | Size | Concurrent |
|---------|----------|-------|------|------------|
| **PostgreSQL** | Production servers | ⚡⚡⚡ | N/A | ✅ Yes |
| **better-sqlite3** | Desktop apps | ⚡⚡⚡ | 6 MB | ❌ No |
| **SQL.js** | Browsers | ⚡ | 2.3 MB | ❌ No |
| **Capacitor** | Mobile apps | ⚡⚡⚡ | ~1 MB | ❌ No |

## TypeScript Support

Full type safety with generics:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Type-safe queries
const user = await db.get<User>('SELECT * FROM users WHERE id = ?', [1]);
// user: User | null

const users = await db.all<User>('SELECT * FROM users');
// users: User[]

// Runtime introspection
const context = db.context;
console.log('Adapter:', db.kind);
console.log('Capabilities:', Array.from(db.capabilities));
console.log('Max connections:', context.getLimitations().maxConnections);
```

Type-only imports are now available via the dedicated entrypoint:

```typescript
import type { StorageAdapterCapabilities } from '@framers/sql-storage-adapter/types';
```

## Event Monitoring

Track queries and performance:

```typescript
db.events.on('query:error', (event) => {
  console.error('Query failed:', event.statement, event.error);
});

db.events.on('performance:slow-query', (event) => {
  if (event.duration > 1000) {
    console.warn(`Slow query (${event.duration}ms):`, event.statement);
  }
});

db.events.on('transaction:rollback', (event) => {
  console.warn('Transaction rolled back:', event.error);
});
```

## Examples

Real-world usage in `examples/`:
- `basic-usage.ts` - Getting started
- `remote-postgres.ts` - Cloud database connections
- `electron-app/` - Desktop app with better-sqlite3
- `browser-extension/` - Chrome extension with SQL.js
- `full-stack/` - Shared code frontend/backend
- `offline-sync.ts` - Auto-sync patterns
- `testing/` - Unit testing strategies

## FAQ

**Q: Which adapter should I use?**  
Use `createDatabase()` - it auto-picks the best adapter for your environment.

**Q: Can I switch adapters later?**  
Yes. Use migration functions to move data between adapters.

**Q: Is this production-ready?**  
Yes. Built on battle-tested libraries (pg, better-sqlite3, sql.js). The adapter layer adds <1% overhead.

**Q: What about schema migrations?**  
Use any migration tool: [`node-pg-migrate`](https://github.com/salsita/node-pg-migrate), [`prisma`](https://www.prisma.io/), or raw SQL.

**Q: How do I handle conflicts in sync?**  
Use `conflictStrategy`: `last-write-wins` (default), `local-wins`, `remote-wins`, `merge`, or `keep-both`.

**Q: Can I sync only on WiFi?**  
Yes. Use `mode: 'manual'` and call `sync()` when `isOnWiFi === true`. See [Offline Sync Guide](./guides/OFFLINE_SYNC.md#1-mobile-app-with-wifi-only-sync).

## Documentation

- **[API Documentation](https://framersai.github.io/sql-storage-adapter/)** - Complete TypeDoc reference
- **[Offline Sync Guide](./guides/OFFLINE_SYNC.md)** - Comprehensive sync patterns
- **[PostgreSQL Guide](./guides/POSTGRES_REMOTE_CONNECTION.md)** - Remote database setup
- **[Architecture](./ARCHITECTURE.md)** - Design decisions

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT © [The Framers](https://frame.dev)
