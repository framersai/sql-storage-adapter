# SQL Storage Adapter

[![npm version](https://img.shields.io/npm/v/@framers/sql-storage-adapter.svg)](https://www.npmjs.com/package/@framers/sql-storage-adapter)
[![CI](https://github.com/wearetheframers/sql-storage-adapter/actions/workflows/ci.yml/badge.svg)](https://github.com/wearetheframers/sql-storage-adapter/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/wearetheframers/sql-storage-adapter/branch/main/graph/badge.svg)](https://codecov.io/gh/wearetheframers/sql-storage-adapter)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)

> One SQL interface for Node.js, browsers, and mobile apps. Write your database code once, run it anywhere.

**[Documentation](https://wearetheframers.github.io/sql-storage-adapter/)** | **[GitHub](https://github.com/wearetheframers/sql-storage-adapter)** | **[Frame.dev](https://frame.dev)**

## Why?

You're building an app that needs to work across different environments:
- 🖥️ **Desktop app** (Electron) - needs fast local storage
- 🌐 **Web app** - needs to work in browsers
- 📱 **Mobile app** (Capacitor/React Native) - needs native performance
- ☁️ **Server** - might use PostgreSQL or SQLite

Instead of writing separate database code for each platform, use one simple interface:

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

// Automatically picks the best database for your environment
const db = await createDatabase();

// Same code works everywhere
await db.run('INSERT INTO users (name) VALUES (?)', ['Alice']);
const user = await db.get('SELECT * FROM users WHERE id = ?', [1]);
```

## Real-World Use Cases

### 1. Offline-First Apps
Build apps that work without internet, sync when online.

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

// Works offline with SQLite, syncs to Postgres when online
const db = await createDatabase({
  url: navigator.onLine ? process.env.DATABASE_URL : undefined,
  file: './offline.db'
});
```

**Perfect for:** Field service apps, note-taking apps, inventory management

### 2. Electron Apps
Desktop apps that need embedded databases.

```typescript
import { openDatabase } from '@framers/sql-storage-adapter';
import { app } from 'electron';
import path from 'path';

// Uses better-sqlite3 for fast native performance
const db = await openDatabase(
  path.join(app.getPath('userData'), 'app.db')
);
```

**Perfect for:** IDEs, chat apps, local-first tools, music players

### 3. Browser Extensions
Chrome/Firefox extensions with local storage.

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

// Uses SQL.js (WebAssembly) - no server needed
const db = await createDatabase({ type: 'browser' });
```

**Perfect for:** Password managers, bookmarking tools, productivity extensions

### 4. Mobile Apps
Capacitor/React Native apps with native SQLite.

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

// Uses Capacitor SQLite on iOS/Android
const db = await createDatabase({
  mobile: { database: 'myapp' }
});
```

**Perfect for:** Task managers, fitness trackers, expense trackers

### 5. Full-Stack Apps
Shared database logic between frontend and backend.

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

// Backend uses Postgres, frontend uses SQLite/SQL.js
const db = await createDatabase({
  url: process.env.DATABASE_URL  // Auto-detects
});
```

**Perfect for:** SaaS apps, marketplaces, social platforms

### 6. Testing
Test your database code without a real database.

```typescript
import { createMemoryDatabase } from '@framers/sql-storage-adapter';

// In-memory database for fast tests
const db = await createMemoryDatabase();  // Starts fresh every time
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
import { createDatabase } from '@framers/sql-storage-adapter';

// 1. Create a database (auto-detects best option)
const db = await createDatabase();

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

You can control the behavior:

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

// Use specific database type
const db = await createDatabase({ type: 'postgres' });

// Or via environment variable
// DATABASE_URL=postgresql://... node app.js
// (Automatically uses PostgreSQL when DATABASE_URL is set)
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

## Data Export, Import & Migration

Need to move data between adapters? We've got you covered.

### Quick Migration Example

```typescript
import { 
  migrateLocalToSupabase,
  migrateSupabaseToLocal,
  createBackup,
  restoreFromBackup 
} from '@framers/sql-storage-adapter';

// Move from local SQLite to Supabase (production deployment)
const localDb = await openDatabase('./app.db');
const supabaseDb = await createDatabase({ url: process.env.SUPABASE_URL });

const result = await migrateLocalToSupabase(localDb, supabaseDb, {
  verify: true,  // Verify row counts after migration
  dropExisting: false,  // Keep existing data
  onConflict: 'replace'  // Replace on ID conflicts
});

console.log(`✅ Migrated ${result.rowsImported} rows in ${result.duration}ms`);
```

### Export Data

Export your database to portable formats:

```typescript
import { exportAsJSON, exportAsSQL, exportAsCSV } from '@framers/sql-storage-adapter';

// Export as JSON (portable, includes schema)
const jsonBackup = await exportAsJSON(db, { 
  tables: ['users', 'posts'],  // Optional: specific tables
  pretty: true,  // Pretty-print JSON
  includeSchema: true  // Include CREATE TABLE statements
});

// Export as SQL dump
const sqlDump = await exportAsSQL(db, {
  includeSchema: true  // CREATE TABLE + INSERT statements
});

// Export as CSV (one file per table)
const csvFiles = await exportAsCSV(db);
// csvFiles = { users: '...csv...', posts: '...csv...' }
```

### Import Data

Restore from backups or migrate data:

```typescript
import { importFromJSON, importFromSQL, importFromCSV } from '@framers/sql-storage-adapter';

// Import from JSON backup
const result = await importFromJSON(db, jsonBackup, {
  dropTables: true,  // Drop existing tables first
  batchSize: 100,  // Insert in batches of 100
  onConflict: 'ignore'  // Skip duplicates
});

// Import from SQL dump
await importFromSQL(db, sqlDump);

// Import from CSV
await importFromCSV(db, 'users', csvContent);
```

### Cross-Adapter Migration

Easily move between different storage backends:

```typescript
import { migrateAdapters } from '@framers/sql-storage-adapter';

// Development → Production
const devDb = createBetterSqliteAdapter('./dev.db');
const prodDb = createPostgresAdapter({ connectionString: '...' });

const result = await migrateAdapters(devDb, prodDb, {
  verify: true,  // Verify data integrity
  batchSize: 500,  // Insert 500 rows at a time
  tables: ['users', 'posts']  // Only these tables
});

if (result.verification?.passed) {
  console.log('✅ Migration verified successfully');
}
```

### Create Backups

```typescript
import { createBackup, restoreFromBackup } from '@framers/sql-storage-adapter';

// Create a backup
const backup = await createBackup(db, {
  tables: ['users', 'sessions', 'posts'],
  pretty: true
});

// Save to file
await fs.writeFile('backup.json', backup);

// Restore from backup
const backupData = await fs.readFile('backup.json', 'utf-8');
await restoreFromBackup(db, backupData, {
  dropTables: true  // Fresh restore
});
```

### Cloud Backups

Automatically backup your database to S3-compatible storage (AWS S3, Cloudflare R2, MinIO) with scheduled backups, compression, and retention policies.

#### AWS S3 Scheduled Backups

```typescript
import { S3Client } from '@aws-sdk/client-s3';
import { createCloudBackupManager } from '@framers/sql-storage-adapter';

const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

// Create backup manager with auto-scheduling
const manager = createCloudBackupManager(db, s3Client, 'my-app-backups', {
  interval: 3600000,  // Backup every hour
  maxBackups: 24,     // Keep last 24 backups
  options: {
    compression: 'gzip',  // Compress to save storage costs
    format: 'json'
  }
});

// Start automatic backups
manager.start();
console.log('✅ Cloud backups running every hour');

// Manual backup when needed
await manager.backupNow();

// Restore from a specific backup
await manager.restore('backups/my-database-2024-01-15T10-30-00.json.gz');
```

#### Cloudflare R2

```typescript
import { S3Client } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
});

const manager = createCloudBackupManager(db, r2Client, 'my-r2-bucket', {
  interval: 86400000,  // Daily backups
  maxBackups: 30,      // Keep 30 days
  options: { compression: 'gzip', format: 'json' }
});

manager.start();
```

#### Self-Hosted MinIO

```typescript
import { S3Client } from '@aws-sdk/client-s3';

const minioClient = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://localhost:9000',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin'
  },
  forcePathStyle: true  // Required for MinIO
});

const manager = createCloudBackupManager(db, minioClient, 'backups', {
  interval: 3600000,
  maxBackups: 48,
  options: { compression: 'gzip', format: 'sql' }  // SQL format supported
});

manager.start();
```

### Common Migration Scenarios

#### Local SQLite → Supabase (Going to Production)

```typescript
import { migrateLocalToSupabase } from '@framers/sql-storage-adapter';

const result = await migrateLocalToSupabase(localDb, supabaseDb, {
  verify: true,
  dropExisting: false,
  onConflict: 'replace'
});
```

#### Supabase → Local SQLite (Local Development)

```typescript
import { migrateSupabaseToLocal } from '@framers/sql-storage-adapter';

const result = await migrateSupabaseToLocal(supabaseDb, localDb, {
  verify: true,
  tables: ['users', 'posts']  // Only sync specific tables
});
```

#### Browser → Mobile (SQL.js → Capacitor)

```typescript
import { migrateBrowserToMobile } from '@framers/sql-storage-adapter';

const result = await migrateBrowserToMobile(sqlJsDb, capacitorDb, {
  verify: true,
  batchSize: 100
});
```

#### Clone Adapter (Perfect Copy)

```typescript
import { cloneAdapter } from '@framers/sql-storage-adapter';

// Create an exact copy with verification
const result = await cloneAdapter(sourceDb, targetDb, {
  verify: true,  // Always verify clones
  dropExisting: true  // Ensure clean copy
});
```

### Migration Result Details

```typescript
const result = await migrateAdapters(source, target, { verify: true });

console.log(result.success);  // true/false
console.log(result.tablesImported);  // Number of tables
console.log(result.rowsImported);  // Number of rows
console.log(result.duration);  // Time in ms
console.log(result.errors);  // Array of error messages (if any)

// Verification details
if (result.verification) {
  console.log(result.verification.passed);  // true if counts match
  console.log(result.verification.tableCounts);
  // { users: { source: 100, target: 100, match: true }, ... }
}
```

### Format Migration Results

```typescript
import { formatMigrationResult } from '@framers/sql-storage-adapter';

const result = await migrateAdapters(source, target, { verify: true });
console.log(formatMigrationResult(result));

// Outputs:
// ============================================================
// Migration Result
// ============================================================
// Source: better-sqlite3
// Target: supabase
// Status: ✅ SUCCESS
// Duration: 1234ms
// Tables: 5
// Rows: 10523
// 
// Verification:
// Status: ✅ PASSED
// 
// Table Counts:
//   ✅ users: source=100, target=100
//   ✅ posts: source=450, target=450
// ============================================================
```

### Export Options

All export functions support these options:

```typescript
interface DataExportOptions {
  tables?: string[];        // Tables to export (all if not specified)
  includeSchema?: boolean;  // Include CREATE TABLE statements
  format?: 'json' | 'sql' | 'csv';  // Export format
  batchSize?: number;       // Batch size for large exports
  pretty?: boolean;         // Pretty-print JSON
}
```

### Import Options

All import functions support these options:

```typescript
interface DataImportOptions {
  dropTables?: boolean;     // Drop existing tables before import
  skipSchema?: boolean;     // Skip schema creation (data only)
  skipData?: boolean;       // Skip data import (schema only)
  batchSize?: number;       // Batch size for inserts (default: 100)
  tables?: string[];        // Tables to import (all if not specified)
  onConflict?: 'replace' | 'ignore' | 'error';  // Conflict strategy
}
```

## Offline Sync & Cloud Backup

Build apps that work offline and sync to the cloud automatically. Perfect for mobile apps, PWAs, desktop apps, and anywhere you need offline-first architecture.

> 📖 **[Complete Offline Sync Guide](./guides/OFFLINE_SYNC.md)** - Comprehensive guide with 8 real-world examples, sync modes, conflict resolution strategies, mobile optimization, and best practices.

### Quick Example: Mobile App with WiFi-Only Sync

```typescript
import { createSyncManager } from '@framers/sql-storage-adapter';

const manager = await createSyncManager({
  primary: './app.db',                     // Work offline
  remote: process.env.DATABASE_URL,        // Sync to cloud
  sync: {
    mode: 'manual',                        // Manual control (DEFAULT)
    conflictStrategy: 'last-write-wins'    // Simple conflict resolution (DEFAULT)
  }
});

// Work completely offline
await manager.db.run('INSERT INTO tasks (title) VALUES (?)', ['Buy milk']);

// Sync when on WiFi
if (isOnWiFi) {
  const result = await manager.sync();
  console.log(`Synced ${result.recordsSynced} records`);
}
```

### Online-First with Automatic Fallback

Perfect for web apps that need offline resilience:

```typescript
const manager = await createSyncManager({
  primary: {
    url: process.env.DATABASE_URL,         // Try cloud first
    fallback: './offline.db'               // Fall back to local if cloud fails
  },
  sync: {
    mode: 'periodic',                      // Auto-sync every interval
    interval: 30000                        // 30 seconds
  }
});

// Use like normal database - syncs automatically
await manager.db.run('INSERT INTO ...');
```

### Sync Modes

| Mode | Use Case | How It Works |
|------|----------|--------------|
| **`manual`** (default) | Mobile apps, user control | Call `sync()` explicitly |
| **`auto`** | Real-time collaboration | Syncs after writes (debounced) |
| **`periodic`** | Background sync | Syncs every N seconds |
| **`realtime`** | Critical data | Syncs immediately on every write |
| **`on-reconnect`** | Unreliable networks | Syncs when network returns |

### Conflict Resolution Strategies

| Strategy | How It Works | Best For |
|----------|--------------|----------|
| **`last-write-wins`** (default) | Newest timestamp wins | Most use cases (simple) |
| **`local-wins`** | Local always wins | Offline-first apps |
| **`remote-wins`** | Server is authority | Cloud-first apps |
| **`merge`** | Custom merge function | Complex data structures |
| **`keep-both`** | Duplicate records | Manual resolution |

### Mobile Optimization

Limit storage and network usage:

```typescript
const manager = await createSyncManager({
  primary: './mobile.db',
  remote: CLOUD_URL,
  sync: {
    mode: 'manual',
    mobileStorageLimit: 50,                // 50MB limit
    storageLimitAction: 'warn',            // 'warn' | 'error' | 'prune'
    tables: {
      'messages': {
        priority: 'critical',              // Sync first
        maxRecords: 1000                   // Keep latest 1000
      },
      'attachments': {
        skip: !isOnWiFi                    // Skip on cellular
      }
    }
  }
});
```

### Monitoring Sync Status

```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: CLOUD_URL,
  sync: { mode: 'periodic', interval: 60000 },
  
  onSync: (result) => {
    console.log(`✓ Synced ${result.recordsSynced} records in ${result.duration}ms`);
  },
  
  onConflict: (conflict) => {
    console.warn(`Conflict in ${conflict.table}:`, conflict.id);
  },
  
  onOffline: () => {
    showBanner('Working offline - changes will sync when reconnected');
  },
  
  onOnline: () => {
    showBanner('Back online - syncing changes');
  },
  
  onError: (error) => {
    console.error('Sync failed:', error);
  }
});

// Check status
console.log('Syncing:', manager.syncing);
console.log('Online:', manager.online);
console.log('Last sync:', manager.lastSync);
```

### Real-World Patterns

See [guides/OFFLINE_SYNC.md](./guides/OFFLINE_SYNC.md) for complete examples:

1. **Mobile App with WiFi-Only Sync** - Save data, limit storage, sync on WiFi
2. **PWA with Online/Offline Switching** - Automatic fallback and reconnection
3. **Desktop App with Background Sync** - Periodic cloud backup
4. **Real-Time Collaboration** - Handle conflicts gracefully
5. **Backup-Only (Push-Only)** - One-way sync to cloud
6. **Cloud Data Reader (Pull-Only)** - Download for fast local reads
7. **Custom Conflict Resolution** - Merge complex data structures
8. **Network-Aware Sync** - Different strategies for WiFi/4G/3G

## Advanced Usage

### Custom Priority

```typescript
const db = await createDatabase({
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

## Remote PostgreSQL Connections

Connect to remote PostgreSQL databases on AWS, Heroku, Supabase, DigitalOcean, and other cloud providers.

> 📖 **[Complete Remote PostgreSQL Guide](./guides/POSTGRES_REMOTE_CONNECTION.md)** - Detailed documentation with cloud provider examples, security best practices, troubleshooting, and more.

### Automatic Detection (Recommended)

The library automatically uses PostgreSQL when you provide connection credentials:

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

// Automatically uses PostgreSQL when DATABASE_URL is set
const db = await createDatabase({
  url: process.env.DATABASE_URL  // postgresql://...
});

// Or even simpler - auto-detects from environment
const db = await createDatabase();
// Uses DATABASE_URL if set, falls back to SQLite

// Same code works everywhere - PostgreSQL in production, SQLite locally
const users = await db.all('SELECT * FROM users');
```

### Simple Connection

```typescript
import { connectDatabase } from '@framers/sql-storage-adapter';

// Connect with URL
const db = await connectDatabase(process.env.DATABASE_URL);

// Connect with config
const db = await connectDatabase({
  host: 'db.example.com',
  database: 'myapp',
  user: 'dbuser',
  password: process.env.DB_PASSWORD,
  ssl: true
});
```

### Environment-Based Configuration

```typescript
// .env.production
DATABASE_URL=postgresql://user:password@db.example.com:5432/myapp?sslmode=require

// .env.development
DATABASE_URL=  # Empty = falls back to SQLite
```

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

// Automatically picks PostgreSQL in production, SQLite locally
const db = await createDatabase();  // Auto-detects DATABASE_URL!

await db.open();
```

### Explicit Priority

Control which adapter is preferred:

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

const db = await createDatabase({
  priority: ['postgres', 'better-sqlite3'],  // Try PostgreSQL first
  postgres: {
    connectionString: process.env.DATABASE_URL
  },
  filePath: './fallback.db'
});

await db.open();
console.log(`Using: ${db.kind}`);  // "postgres" or "better-sqlite3"
```

### Full Configuration Options

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

const db = await createDatabase({
  priority: ['postgres'],
  postgres: {
    host: 'db.example.com',
    port: 5432,
    database: 'myapp',
    user: 'dbuser',
    password: process.env.DB_PASSWORD,
    
    // Security
    ssl: true,  // or { rejectUnauthorized: true, ca: cert }
    
    // Performance
    max: 20,                      // Max connections in pool
    min: 2,                       // Min idle connections
    idleTimeoutMillis: 10000,     // Close idle connections after 10s
    connectionTimeoutMillis: 5000, // Timeout connection attempts after 5s
    
    // Monitoring
    application_name: 'my-app-v1',  // Track in pg_stat_activity
    statement_timeout: 30000,        // Kill queries after 30s
    query_timeout: 10000,            // Query timeout
  }
});

await db.open();
```

### Cloud Provider Examples

#### AWS RDS

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

const db = await createDatabase({
  postgres: {
    host: 'mydb.abc123.us-east-1.rds.amazonaws.com',
    port: 5432,
    database: 'production',
    user: 'admin',
    password: process.env.RDS_PASSWORD,
    ssl: { 
      rejectUnauthorized: true,
      ca: process.env.RDS_CA_CERT  // Optional: RDS CA certificate
    },
    max: 20,
    application_name: 'my-app-prod'
  }
});

await db.open();

// Query works exactly the same as local databases
const users = await db.all('SELECT * FROM users LIMIT 10');
```

#### Heroku Postgres

```typescript
// Heroku provides DATABASE_URL automatically
const db = createPostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  ssl: { 
    rejectUnauthorized: false  // Heroku uses self-signed certs
  }
});

await db.open();
```

#### Supabase

```typescript
// Get connection string from Supabase dashboard → Database → Connection String
const db = createPostgresAdapter({
  connectionString: process.env.SUPABASE_DB_URL,
  // Example: postgresql://postgres:[YOUR-PASSWORD]@db.projectid.supabase.co:5432/postgres
  ssl: true,
  max: 10  // Supabase free tier has connection limits
});

await db.open();

// Same API as local SQLite!
const posts = await db.all('SELECT * FROM posts ORDER BY created_at DESC');
```

#### DigitalOcean Managed Database

```typescript
const db = createPostgresAdapter({
  host: 'db-postgresql-nyc3-12345.ondigitalocean.com',
  port: 25060,  // DigitalOcean uses custom ports
  database: 'defaultdb',
  user: 'doadmin',
  password: process.env.DO_DB_PASSWORD,
  ssl: { 
    rejectUnauthorized: true,
    ca: process.env.DO_CA_CERT  // Download from DO dashboard
  },
  max: 25
});

await db.open();
```

#### Railway

```typescript
// Railway provides DATABASE_URL
const db = createPostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

await db.open();
```

#### Render

```typescript
// Render provides DATABASE_URL
const db = createPostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await db.open();
```

### SSL/TLS Configuration

Secure connections for production databases:

```typescript
// Enable SSL (accepts self-signed certificates)
const db = createPostgresAdapter({
  host: 'db.example.com',
  database: 'mydb',
  user: 'dbuser',
  password: process.env.DB_PASSWORD,
  ssl: true
});

// Strict SSL (verify server certificate)
const db = createPostgresAdapter({
  host: 'db.example.com',
  database: 'mydb',
  user: 'dbuser',
  password: process.env.DB_PASSWORD,
  ssl: { 
    rejectUnauthorized: true  // Reject invalid certificates
  }
});

// Custom CA certificate (for self-hosted)
const db = createPostgresAdapter({
  host: 'db.example.com',
  database: 'mydb',
  user: 'dbuser',
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt').toString(),
    cert: fs.readFileSync('/path/to/client-cert.crt').toString(),  // Optional
    key: fs.readFileSync('/path/to/client-key.key').toString()     // Optional
  }
});
```

### Connection Pooling

Optimize performance with connection pools:

```typescript
const db = createPostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  
  // Pool configuration
  max: 20,              // Maximum connections (default: 10)
  min: 5,               // Minimum idle connections (default: 0)
  idleTimeoutMillis: 10000,     // Close idle after 10s (default: 10000)
  connectionTimeoutMillis: 5000 // Timeout new connections (default: 0 = no timeout)
});

// Connection pool is managed automatically
// Multiple queries run concurrently using pool connections
const [users, posts, comments] = await Promise.all([
  db.all('SELECT * FROM users'),
  db.all('SELECT * FROM posts'),
  db.all('SELECT * FROM comments')
]);
```

### Environment Variables

Best practices for configuration:

```bash
# .env file
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
DB_HOST=db.example.com
DB_PORT=5432
DB_NAME=myapp
DB_USER=dbuser
DB_PASSWORD=secure_password_here
DB_POOL_MAX=20
DB_SSL=true
```

```typescript
// config/database.ts
import { createPostgresAdapter } from '@framers/sql-storage-adapter';

export const createDatabase = () => {
  // Option 1: Use connection string
  if (process.env.DATABASE_URL) {
    return createPostgresAdapter({
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      ssl: process.env.DB_SSL === 'true'
    });
  }
  
  // Option 2: Use individual variables
  return createPostgresAdapter({
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    ssl: process.env.DB_SSL === 'true',
    max: parseInt(process.env.DB_POOL_MAX || '10')
  });
};

// Usage
const db = createDatabase();
await db.open();
```

### Error Handling

Handle connection errors gracefully:

```typescript
import { createPostgresAdapter } from '@framers/sql-storage-adapter';

async function connectWithRetry(maxRetries = 3) {
  const db = createPostgresAdapter(process.env.DATABASE_URL!);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await db.open();
      console.log('✅ Connected to PostgreSQL');
      return db;
    } catch (error) {
      console.error(`❌ Connection attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw new Error('Failed to connect to database after max retries');
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

// Usage
try {
  const db = await connectWithRetry();
  
  // Use database
  const users = await db.all('SELECT * FROM users');
  
  // Always close when done
  await db.close();
} catch (error) {
  console.error('Database connection failed:', error);
  process.exit(1);
}
```

### Monitoring & Health Checks

Track connection health:

```typescript
import { createPostgresAdapter } from '@framers/sql-storage-adapter';

const db = createPostgresAdapter({
  connectionString: process.env.DATABASE_URL!,
  application_name: 'my-app-v1.0',  // Shows in pg_stat_activity
  max: 20
});

await db.open();

// Health check endpoint (Express example)
app.get('/health/database', async (req, res) => {
  try {
    // Simple query to verify connection
    const result = await db.get<{ now: string }>('SELECT NOW() as now');
    
    // Get active connections (admin access required)
    const connections = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM pg_stat_activity WHERE application_name = 'my-app-v1.0'"
    );
    
    res.json({
      status: 'healthy',
      timestamp: result?.now,
      active_connections: connections?.count || 0
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: (error as Error).message
    });
  }
});
```

### Migration from Local to Remote

Move from local development to production:

```typescript
import { 
  createBetterSqliteAdapter, 
  createPostgresAdapter,
  migrateAdapters 
} from '@framers/sql-storage-adapter';

// Development: Local SQLite
const localDb = createBetterSqliteAdapter('./dev.db');

// Production: Remote PostgreSQL
const remoteDb = createPostgresAdapter({
  host: 'production-db.example.com',
  database: 'myapp',
  user: 'dbuser',
  password: process.env.DB_PASSWORD,
  ssl: true
});

await localDb.open();
await remoteDb.open();

// Migrate all data
const result = await migrateAdapters(localDb, remoteDb, {
  verify: true,      // Verify row counts match
  dropTables: false, // Keep existing data
  onConflict: 'replace'
});

console.log(`✅ Migrated ${result.rowsImported} rows to production`);

await localDb.close();
await remoteDb.close();
```

### Same API Everywhere

The beauty of the adapter pattern - same code works locally and remotely:

```typescript
// This function works with ANY adapter
async function getRecentUsers(db: StorageAdapter) {
  return await db.all<{ id: number; name: string; email: string }>(
    'SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT 10'
  );
}

// Works with local SQLite
const localDb = createBetterSqliteAdapter('./local.db');
await localDb.open();
const localUsers = await getRecentUsers(localDb);

// Works with remote PostgreSQL
const remoteDb = createPostgresAdapter(process.env.DATABASE_URL!);
await remoteDb.open();
const remoteUsers = await getRecentUsers(remoteDb);

// Same code, different storage!
```

## Examples

Check out the `examples/` directory:
- `basic-usage.ts` - Getting started
- `remote-postgres.ts` - Remote PostgreSQL connections (AWS, Heroku, Supabase, etc.)
- `electron-app/` - Desktop app with better-sqlite3
- `browser-extension/` - Chrome extension with SQL.js
- `full-stack/` - Shared code between frontend and backend
- `testing/` - Unit testing strategies

## FAQ

**Q: Which adapter should I use?**  
A: Let `createDatabase()` pick automatically. It chooses based on your environment.

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

MIT © [The Framers](https://frame.dev)
