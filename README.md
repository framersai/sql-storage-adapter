# SQL Storage Adapter

[![npm version](https://img.shields.io/npm/v/@framers/sql-storage-adapter.svg)](https://www.npmjs.com/package/@framers/sql-storage-adapter)
[![CI](https://github.com/wearetheframers/sql-storage-adapter/actions/workflows/ci.yml/badge.svg)](https://github.com/wearetheframers/sql-storage-adapter/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/wearetheframers/sql-storage-adapter/branch/main/graph/badge.svg)](https://codecov.io/gh/wearetheframers/sql-storage-adapter)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)

> One SQL interface for Node.js, browsers, and mobile apps. Write your database code once, run it anywhere.

**[Documentation](https://wearetheframers.github.io/sql-storage-adapter/)** | **[GitHub](https://github.com/wearetheframers/sql-storage-adapter)**

## Why?

You're building an app that needs to work across different environments:
- 🖥️ **Desktop app** (Electron) - needs fast local storage
- 🌐 **Web app** - needs to work in browsers
- 📱 **Mobile app** (Capacitor/React Native) - needs native performance
- ☁️ **Server** - might use PostgreSQL or SQLite

Instead of writing separate database code for each platform, use one simple interface:

```typescript
import { resolveStorageAdapter } from '@framers/sql-storage-adapter';

// Automatically picks the best adapter for your environment
const db = await resolveStorageAdapter();

// Same code works everywhere
await db.run('INSERT INTO users (name) VALUES (?)', ['Alice']);
const user = await db.get('SELECT * FROM users WHERE id = ?', [1]);
```

## Real-World Use Cases

### 1. Offline-First Apps
Build apps that work without internet, sync when online.

```typescript
// Works offline with SQLite, syncs to Postgres when online
const db = await resolveStorageAdapter({
  priority: navigator.onLine ? ['postgres', 'better-sqlite3'] : ['better-sqlite3']
});
```

**Perfect for:** Field service apps, note-taking apps, inventory management

### 2. Electron Apps
Desktop apps that need embedded databases.

```typescript
// Uses better-sqlite3 for fast native performance
const db = await resolveStorageAdapter({
  filePath: path.join(app.getPath('userData'), 'app.db')
});
```

**Perfect for:** IDEs, chat apps, local-first tools, music players

### 3. Browser Extensions
Chrome/Firefox extensions with local storage.

```typescript
// Uses SQL.js (WebAssembly) - no server needed
const db = await resolveStorageAdapter({
  priority: ['sqljs']
});
```

**Perfect for:** Password managers, bookmarking tools, productivity extensions

### 4. Mobile Apps
Capacitor/React Native apps with native SQLite.

```typescript
// Uses Capacitor SQLite on iOS/Android
const db = await resolveStorageAdapter({
  capacitor: { database: 'myapp' }
});
```

**Perfect for:** Task managers, fitness trackers, expense trackers

### 5. Full-Stack Apps
Shared database logic between frontend and backend.

```typescript
// Backend uses Postgres, frontend uses SQLite/SQL.js
const db = await resolveStorageAdapter({
  postgres: { connectionString: process.env.DATABASE_URL }
});
```

**Perfect for:** SaaS apps, marketplaces, social platforms

### 6. Testing
Test your database code without a real database.

```typescript
// In-memory database for fast tests
const db = await resolveStorageAdapter({
  priority: ['sqljs']  // Starts fresh every time
});
```

**Perfect for:** Unit tests, integration tests, CI/CD pipelines

## Installation

```bash
npm install @framers/sql-storage-adapter

# Install adapters you need:
npm install better-sqlite3      # Desktop apps (Node.js/Electron)
npm install pg                  # PostgreSQL (servers)
npm install @capacitor-community/sqlite  # Mobile (Capacitor)
# sql.js is included, no extra install needed
```

## Quick Start

```typescript
import { resolveStorageAdapter } from '@framers/sql-storage-adapter';

// 1. Get an adapter (auto-detects best option)
const db = await resolveStorageAdapter();

// 2. Create tables
await db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY,
    task TEXT NOT NULL,
    done INTEGER DEFAULT 0
  )
`);

// 3. Insert data (parameterized for safety)
await db.run('INSERT INTO todos (task) VALUES (?)', ['Buy groceries']);
await db.run('INSERT INTO todos (task) VALUES (?)', ['Walk the dog']);

// 4. Query data
const todos = await db.all('SELECT * FROM todos WHERE done = 0');
console.log(todos);

// 5. Update data
await db.run('UPDATE todos SET done = 1 WHERE id = ?', [1]);

// 6. Clean up
await db.close();
```

## How It Works

The library tries adapters in order until one works:

```
🖥️ Node.js:     better-sqlite3 → sql.js
🌐 Browser:     sql.js
📱 Mobile:      capacitor-sqlite → sql.js
☁️ Server:      postgres → better-sqlite3 → sql.js
```

You can override this:

```typescript
// Force a specific adapter
const db = await resolveStorageAdapter({
  priority: ['postgres', 'better-sqlite3']
});

// Or use environment variable
// STORAGE_ADAPTER=postgres node app.js
```

## Key Features

### ✅ Type-Safe
Full TypeScript support with generics:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const user = await db.get<User>('SELECT * FROM users WHERE id = ?', [1]);
// user is typed as User | null
```

### ✅ Transactions
Automatic commit/rollback:

```typescript
await db.transaction(async (tx) => {
  await tx.run('INSERT INTO users (name) VALUES (?)', ['Alice']);
  await tx.run('INSERT INTO posts (user_id, title) VALUES (?, ?)', [1, 'Hello']);
  // Commits automatically, or rolls back on error
});
```

### ✅ Runtime Introspection
Know what your database can do:

```typescript
const context = db.context;

if (context.supportsBatch) {
  // Use batch operations for speed
  await db.batch([...operations]);
} else {
  // Fall back to individual inserts
  for (const op of operations) {
    await db.run(op.statement, op.parameters);
  }
}

// Get limitations
const limits = context.getLimitations();
console.log(`Max connections: ${limits.maxConnections}`);
console.log(`Supported types: ${limits.supportedDataTypes}`);
```

### ✅ Event Monitoring
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
```

## API Overview

```typescript
// Execute SQL (no results)
await db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');

// Run mutation (INSERT/UPDATE/DELETE)
const result = await db.run('INSERT INTO users (name) VALUES (?)', ['Alice']);
console.log(result.lastInsertRowid);  // 1

// Get single row
const user = await db.get('SELECT * FROM users WHERE id = ?', [1]);

// Get all rows
const users = await db.all('SELECT * FROM users');

// Transactions
await db.transaction(async (tx) => {
  await tx.run('...');
  await tx.run('...');
});

// Batch operations (if supported)
if (db.capabilities.has('batch')) {
  await db.batch([
    { statement: 'INSERT INTO users (name) VALUES (?)', parameters: ['Alice'] },
    { statement: 'INSERT INTO users (name) VALUES (?)', parameters: ['Bob'] }
  ]);
}

// Prepared statements (if supported)
if (db.capabilities.has('prepared')) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const user = await stmt.get([1]);
  await stmt.finalize();
}

// Clean up
await db.close();
```

## Adapters at a Glance

| Adapter | Best For | Speed | Size | Concurrent |
|---------|----------|-------|------|------------|
| **PostgreSQL** | Production servers | ⚡⚡⚡ | N/A | ✅ Yes |
| **better-sqlite3** | Desktop apps | ⚡⚡⚡ | 6 MB | ❌ No |
| **SQL.js** | Browsers | ⚡ | 2.3 MB | ❌ No |
| **Capacitor** | Mobile apps | ⚡⚡⚡ | ~1 MB | ❌ No |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed comparison.

## Advanced Usage

### Custom Priority

```typescript
const db = await resolveStorageAdapter({
  priority: ['postgres', 'better-sqlite3', 'sqljs'],
  postgres: {
    connectionString: 'postgresql://localhost/mydb'
  },
  filePath: './app.db'  // For SQLite adapters
});
```

### Check Capabilities

```typescript
console.log('Adapter:', db.kind);
console.log('Capabilities:', Array.from(db.capabilities));

if (db.capabilities.has('concurrent')) {
  // Can handle multiple connections
}
```

### Health Checks

```typescript
const status = db.context.getStatus();

app.get('/health', (req, res) => {
  res.json({
    healthy: status.healthy,
    uptime: status.uptime,
    queries: status.totalQueries,
    errors: status.errors
  });
});
```

## Examples

Check out the `examples/` directory:
- `basic-usage.ts` - Getting started
- `electron-app/` - Desktop app with better-sqlite3
- `browser-extension/` - Chrome extension with SQL.js
- `full-stack/` - Shared code between frontend and backend
- `testing/` - Unit testing strategies

## FAQ

**Q: Which adapter should I use?**  
A: Let `resolveStorageAdapter()` pick automatically. It chooses based on your environment.

**Q: Can I switch adapters later?**  
A: Yes, but you might need to migrate data. SQLite → PostgreSQL is common for apps that start small and grow.

**Q: Is this production-ready?**  
A: Yes. The adapters (pg, better-sqlite3, etc.) are battle-tested. This library just provides a unified interface.

**Q: What about migrations?**  
A: Use any migration tool. We recommend [`node-pg-migrate`](https://github.com/salsita/node-pg-migrate) or [`prisma`](https://www.prisma.io/).

**Q: Performance overhead?**  
A: Minimal. The abstraction layer is thin (~100 lines per adapter). Benchmarks show <1% overhead.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT © [The Framers](https://github.com/wearetheframers)

---

Built with ❤️ for developers who want to write database code once and run it everywhere.
