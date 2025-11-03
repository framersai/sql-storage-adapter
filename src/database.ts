/**
 * High-level, user-friendly API for SQL storage.
 * 
 * This module provides simple functions like:
 * - createDatabase() - Automatically picks the best database for your environment
 * - connectDatabase() - Explicit connection with clear options
 * - openDatabase() - Simple file-based database
 */

import type { StorageAdapter } from './types';
import { resolveStorageAdapter, type StorageResolutionOptions, type AdapterKind } from './resolver';
import type { PostgresAdapterOptions } from './adapters/postgresAdapter';
import type { CapacitorAdapterOptions } from './adapters/capacitorSqliteAdapter';

/**
 * Database connection options.
 */
export interface DatabaseOptions {
  /** 
   * Database URL (e.g., postgresql://user:pass@host/db).
   * If provided, PostgreSQL will be used.
   */
  url?: string;
  
  /** 
   * File path for SQLite database.
   * Used for local/offline storage.
   */
  file?: string;
  
  /**
   * PostgreSQL-specific configuration.
   * Automatically uses PostgreSQL when provided.
   */
  postgres?: PostgresAdapterOptions;
  
  /**
   * Mobile (Capacitor) configuration.
   * Automatically detected on mobile platforms.
   */
  mobile?: CapacitorAdapterOptions;
  
  /**
   * Force a specific database type.
   * Leave empty to auto-detect.
   */
  type?: 'postgres' | 'sqlite' | 'browser' | 'mobile' | 'memory';
  
  /**
   * Custom priority order for adapter selection.
   * Advanced: Only use if you need fine-grained control.
   */
  priority?: AdapterKind[];
}

/**
 * Create a database connection.
 * Automatically picks the best database for your environment.
 * 
 * @example
 * ```typescript
 * // Auto-detect (PostgreSQL in prod, SQLite locally)
 * const db = await createDatabase();
 * 
 * // Specify database URL
 * const db = await createDatabase({
 *   url: process.env.DATABASE_URL
 * });
 * 
 * // Specify file path
 * const db = await createDatabase({
 *   file: './my-app.db'
 * });
 * 
 * // Full PostgreSQL config
 * const db = await createDatabase({
 *   postgres: {
 *     host: 'db.example.com',
 *     database: 'myapp',
 *     user: 'dbuser',
 *     password: process.env.DB_PASSWORD,
 *     ssl: true
 *   }
 * });
 * ```
 */
export async function createDatabase(options: DatabaseOptions = {}): Promise<StorageAdapter> {
  const resolverOptions: StorageResolutionOptions = {};

  // Handle URL (PostgreSQL)
  if (options.url) {
    resolverOptions.postgres = { connectionString: options.url };
  }

  // Handle PostgreSQL config
  if (options.postgres) {
    resolverOptions.postgres = options.postgres;
  }

  // Handle file path
  if (options.file) {
    resolverOptions.filePath = options.file;
  }

  // Handle mobile config
  if (options.mobile) {
    resolverOptions.capacitor = options.mobile;
  }

  // Handle explicit type
  if (options.type) {
    const typeMap = {
      'postgres': 'postgres',
      'sqlite': 'better-sqlite3',
      'browser': 'sqljs',
      'mobile': 'capacitor',
      'memory': 'better-sqlite3'  // Memory mode uses better-sqlite3 with :memory:
    } as const;
    resolverOptions.priority = [typeMap[options.type]];
    
    // Set in-memory mode for SQLite
    if (options.type === 'memory') {
      resolverOptions.filePath = ':memory:';
    }

    if (typeof window !== 'undefined') {
      // Use `sql.js` or another browser-compatible adapter
      resolverOptions.priority = ['sqljs'];
    } else {
      // Use `better-sqlite3` for Node.js environments
      resolverOptions.priority = ['better-sqlite3'];
    }
  }
  
  // Handle custom priority
  if (options.priority) {
    resolverOptions.priority = options.priority;
  }

  const adapter = await resolveStorageAdapter(resolverOptions);
  await adapter.open(resolverOptions.openOptions);
  return adapter;
}

/**
 * Connect to a remote database.
 * 
 * @example
 * ```typescript
 * // Simple connection string
 * const db = await connectDatabase('postgresql://user:pass@host/db');
 * 
 * // With full config
 * const db = await connectDatabase({
 *   host: 'db.example.com',
 *   database: 'myapp',
 *   user: 'dbuser',
 *   password: process.env.DB_PASSWORD,
 *   ssl: true
 * });
 * ```
 */
export async function connectDatabase(
  config: string | PostgresAdapterOptions
): Promise<StorageAdapter> {
  if (typeof config === 'string') {
    return createDatabase({ url: config });
  }
  return createDatabase({ postgres: config });
}

/**
 * Open a local database file.
 * 
 * @example
 * ```typescript
 * // SQLite file
 * const db = await openDatabase('./my-app.db');
 * 
 * // In-memory database
 * const db = await openDatabase(':memory:');
 * ```
 */
export async function openDatabase(filePath: string): Promise<StorageAdapter> {
  return createDatabase({ file: filePath });
}

/**
 * Create an in-memory database.
 * Perfect for testing or temporary storage.
 * 
 * @example
 * ```typescript
 * const db = await createMemoryDatabase();
 * await db.exec('CREATE TABLE users (id INTEGER, name TEXT)');
 * ```
 */
export async function createMemoryDatabase(): Promise<StorageAdapter> {
  return openDatabase(':memory:');
}

// Re-export for backwards compatibility
export { resolveStorageAdapter } from './resolver';
