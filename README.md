# SQL Storage Adapter

A robust, cross-platform SQL storage abstraction layer with automatic fallback mechanisms and runtime detection. Provides a unified interface for SQL operations across PostgreSQL, SQLite, and WebAssembly-based databases.

## Features

- **Automatic Runtime Detection**: Intelligently selects the best available adapter for your environment
- **Graceful Fallbacks**: Seamlessly falls back to alternative adapters when primary options are unavailable
- **Cross-Platform Support**: Works in Node.js, Electron, browsers, and mobile (via Capacitor)
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Connection Pooling**: Efficient resource management for production workloads (PostgreSQL)
- **Transaction Support**: ACID-compliant transactions across all adapters
- **Prepared Statements**: Protection against SQL injection and improved performance

## Installation

```bash
npm install @framers/sql-storage-adapter

# Optional peer dependencies (install based on your needs)
npm install better-sqlite3  # For native SQLite performance
npm install pg              # For PostgreSQL support
npm install @capacitor-community/sqlite  # For mobile apps
```

## Quick Start

```typescript
import { resolveStorageAdapter } from '@framers/sql-storage-adapter';

// Automatic adapter selection based on environment
const adapter = await resolveStorageAdapter();

// Execute queries
await adapter.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  )
`);

// Insert data with parameters (prevents SQL injection)
const result = await adapter.run(
  'INSERT INTO users (name, email) VALUES (?, ?)',
  ['John Doe', 'john@example.com']
);
console.log(`User created with ID: ${result.lastInsertRowid}`);

// Query data
const user = await adapter.get('SELECT * FROM users WHERE id = ?', [1]);
const allUsers = await adapter.all('SELECT * FROM users');

// Transactions
await adapter.transaction(async (trx) => {
  await trx.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [100, 1]);
  await trx.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [100, 2]);
  // Automatically committed on success, rolled back on error
});

// Always close when done
await adapter.close();
```

## Adapters

### PostgreSQL Adapter

**When to use**: Production environments, multi-user applications, cloud deployments

**Pros**:
- Excellent concurrency with MVCC (Multi-Version Concurrency Control)
- Rich feature set (JSON/JSONB, arrays, full-text search, etc.)
- Connection pooling for efficient resource usage
- ACID compliance with strong consistency guarantees
- Supports complex queries, CTEs, window functions
- Battle-tested in production environments
- Horizontal scaling capabilities

**Cons**:
- Requires separate server process
- Higher resource consumption
- Network latency for remote connections
- More complex deployment and maintenance
- Overkill for single-user desktop applications

**Limitations**:
- No synchronous operations (all queries are async)
- Prepared statements are connection-scoped
- Connection limits based on PostgreSQL configuration
- SSL/TLS configuration may be required for production

**Configuration**:
```typescript
const adapter = await resolveStorageAdapter({
  postgres: {
    connectionString: 'postgresql://user:password@host:5432/database'
  }
});
```

**Graceful Degradation**:
- Falls back to SQLite if connection fails
- Automatically retries with connection pooling
- Handles connection drops with automatic reconnection

### Better-SQLite3 Adapter

**When to use**: Desktop applications, development, single-user scenarios, embedded databases

**Pros**:
- Synchronous operations available (unique among adapters)
- Zero-configuration, serverless
- Excellent performance for local operations
- Small footprint (~6MB)
- Full SQLite feature set including WAL mode
- File-based persistence
- ACID compliant

**Cons**:
- Single-writer limitation (readers don't block)
- Not suitable for high-concurrency scenarios
- Requires native compilation
- Platform-specific binaries needed
- No network access (local only)

**Limitations**:
- Database size limited by available disk space
- No native JSON operations (stored as TEXT)
- Limited concurrent write performance
- No built-in replication
- Maximum database size: 281 TB (theoretical)
- Maximum row size: 1 GB

**Configuration**:
```typescript
const adapter = await resolveStorageAdapter({
  filePath: '/absolute/path/to/database.sqlite3',
  priority: ['better-sqlite3']  // Force this adapter
});
```

**Platform Requirements**:
- **Windows**: Visual Studio Build Tools 2022, Python 3.8+
- **macOS**: Xcode Command Line Tools
- **Linux**: build-essential, python3, libsqlite3-dev

**Graceful Degradation**:
- Falls back to sql.js if native module unavailable
- Handles corrupted database files with automatic backups
- WAL mode prevents corruption from crashes

### SQL.js Adapter (WebAssembly)

**When to use**: Browsers, environments without native modules, testing, prototyping

**Pros**:
- Works everywhere (pure JavaScript/WebAssembly)
- No native dependencies
- Good for prototyping and testing
- Can persist to IndexedDB in browsers
- Consistent behavior across platforms

**Cons**:
- Slower than native implementations (2-10x overhead)
- Higher memory usage
- No true concurrency (single-threaded)
- Large initial download (~2.3MB WASM)
- Limited by browser memory constraints

**Limitations**:
- In-memory by default (data lost on refresh)
- Browser storage limits (typically 50-80% of free disk)
- No file locking
- No native extensions support
- Cannot share databases between tabs/workers
- Performance degrades with large datasets (>100MB)

**Configuration**:
```typescript
const adapter = await resolveStorageAdapter({
  priority: ['sqljs'],
  filePath: '/path/to/persist.db'  // Node.js only, ignored in browsers
});
```

**Graceful Degradation**:
- Can persist to file system in Node.js
- Falls back to in-memory if persistence fails
- Automatically handles IndexedDB quota errors

### Capacitor SQLite Adapter

**When to use**: Mobile applications (iOS/Android), Ionic apps

**Pros**:
- Native performance on mobile devices
- Encrypted database support
- Background execution support
- Handles app lifecycle (suspend/resume)
- Cross-platform mobile support

**Cons**:
- Requires Capacitor setup
- Platform-specific configurations needed
- Debugging can be challenging
- Version compatibility issues
- Additional app size overhead

**Limitations**:
- Mobile platform restrictions apply
- Database location varies by platform
- Limited debugging tools
- Synchronization must be handled manually
- Background execution limits on iOS

**Configuration**:
```typescript
const adapter = await resolveStorageAdapter({
  capacitor: {
    database: 'myapp',
    encrypted: false,
    mode: 'no-encryption'
  }
});
```

**Platform Setup Required**:
- Install and configure @capacitor-community/sqlite
- Update native project files
- Handle platform-specific permissions

## Capability Detection

Always check adapter capabilities before using optional features:

```typescript
const adapter = await resolveStorageAdapter();

// Check for specific capabilities
if (adapter.capabilities.has('streaming')) {
  // Use streaming for large result sets
}

if (adapter.capabilities.has('batch')) {
  // Use batch operations for bulk inserts
  await adapter.batch([
    { statement: 'INSERT INTO logs (msg) VALUES (?)', parameters: ['Event 1'] },
    { statement: 'INSERT INTO logs (msg) VALUES (?)', parameters: ['Event 2'] }
  ]);
}

if (adapter.capabilities.has('sync')) {
  // Adapter supports synchronous operations (only better-sqlite3)
}
```

### Available Capabilities

| Capability | Description | Adapters |
|------------|-------------|----------|
| `sync` | Synchronous execution support | better-sqlite3 |
| `transactions` | ACID transaction support | All |
| `wal` | Write-Ahead Logging support | better-sqlite3, capacitor |
| `locks` | File locking support | better-sqlite3, postgres |
| `persistence` | Data survives restarts | All except in-memory |
| `streaming` | Stream large result sets | postgres* |
| `batch` | Batch operations support | better-sqlite3*, postgres* |
| `prepared` | Prepared statements | better-sqlite3, postgres |
| `concurrent` | Concurrent connections | postgres |
| `json` | Native JSON support | postgres |
| `arrays` | Native array types | postgres |

*Planned features, check adapter documentation

## Environment Variables

- `STORAGE_ADAPTER`: Force specific adapter (`postgres`, `better-sqlite3`, `capacitor`, `sqljs`)
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Affects default paths and logging

## Error Handling

```typescript
import { StorageResolutionError } from '@framers/sql-storage-adapter';

try {
  const adapter = await resolveStorageAdapter();
  await adapter.run('INVALID SQL');
} catch (error) {
  if (error instanceof StorageResolutionError) {
    console.error('Failed to find suitable adapter:', error.causes);
  } else {
    console.error('Query error:', error);
  }
}
```

## Migration Guide

### From Raw SQLite/PostgreSQL

```typescript
// Before: Using better-sqlite3 directly
const Database = require('better-sqlite3');
const db = new Database('app.db');
const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

// After: Using sql-storage-adapter
import { resolveStorageAdapter } from '@framers/sql-storage-adapter';
const adapter = await resolveStorageAdapter({ filePath: 'app.db' });
const row = await adapter.get('SELECT * FROM users WHERE id = ?', [userId]);
```

### From Knex/TypeORM

This adapter provides a lower-level interface. For ORM features, consider wrapping the adapter or continuing to use your ORM with the appropriate database driver.

## Performance Considerations

### Query Performance

- **PostgreSQL**: Best for complex queries, concurrent access
- **Better-SQLite3**: Best for simple queries, single-user
- **SQL.js**: Acceptable for small datasets (<10MB)
- **Capacitor**: Native performance on mobile

### Memory Usage

- **PostgreSQL**: Configurable, typically 100-500MB
- **Better-SQLite3**: ~20-50MB typical
- **SQL.js**: 50-200MB (includes WASM overhead)
- **Capacitor**: Platform-dependent

### Startup Time

- **PostgreSQL**: 1-5 seconds (connection establishment)
- **Better-SQLite3**: <100ms
- **SQL.js**: 200-500ms (WASM initialization)
- **Capacitor**: 100-300ms

## Security

### SQL Injection Prevention

Always use parameterized queries:

```typescript
// NEVER DO THIS - Vulnerable to SQL injection
const query = `SELECT * FROM users WHERE name = '${userName}'`;

// DO THIS - Safe from SQL injection
await adapter.get('SELECT * FROM users WHERE name = ?', [userName]);
```

### Connection Security

- PostgreSQL: Use SSL/TLS in production
- SQLite: Use file system permissions
- Capacitor: Enable encryption for sensitive data

## Testing

```bash
# Run adapter compliance tests
npm test

# Test specific adapter
STORAGE_ADAPTER=postgres npm test
```

## Troubleshooting

### Common Issues

**"Cannot find module 'better-sqlite3'"**
- Install peer dependency: `npm install better-sqlite3`
- Or let it fall back to sql.js automatically

**"SQLITE_CANTOPEN: unable to open database file"**
- Check file path is absolute, not relative
- Ensure directory exists and has write permissions
- Verify disk space available

**"Connection timeout" with PostgreSQL**
- Check network connectivity
- Verify connection string format
- Ensure PostgreSQL is running
- Check firewall rules

**WebAssembly instantiation failed**
- Check Content Security Policy allows WASM
- Ensure sufficient memory available
- Try reducing database size

### Debug Logging

```typescript
// Enable debug logging
const adapter = await resolveStorageAdapter({
  openOptions: {
    adapterOptions: { debug: true }
  }
});
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT © Framers

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Support

- Issues: [GitHub Issues](https://github.com/wearetheframers/sql-storage-adapter/issues)
- Discussions: [GitHub Discussions](https://github.com/wearetheframers/sql-storage-adapter/discussions)
- Security: Report vulnerabilities to team@frame.dev