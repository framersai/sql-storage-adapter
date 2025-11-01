import path from 'path';
import type { StorageAdapter, StorageAdapterFactory, StorageOpenOptions } from './types.js';
import { StorageResolutionError } from './types.js';
import { createBetterSqliteAdapter } from './adapters/betterSqliteAdapter.js';
import { createSqlJsAdapter } from './adapters/sqlJsAdapter.js';
import { createCapacitorSqliteAdapter, type CapacitorAdapterOptions } from './adapters/capacitorSqliteAdapter.js';
import { createPostgresAdapter } from './adapters/postgresAdapter.js';

export type AdapterKind = 'postgres' | 'better-sqlite3' | 'capacitor' | 'sqljs';

export interface StorageResolutionOptions {
  /** Absolute path for sqlite file (used by better-sqlite3/sql.js when persistence is desired). */
  filePath?: string;
  /** Explicit adapter priority override. */
  priority?: AdapterKind[];
  /** Options passed to the Capacitor adapter. */
  capacitor?: CapacitorAdapterOptions;
  /** Options passed to the Postgres adapter. */
  postgres?: { connectionString?: string };
  /** Options forwarded to adapter.open. */
  openOptions?: StorageOpenOptions;
}

const isCapacitorRuntime = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  const maybeCapacitor = (window as any).Capacitor;
  return Boolean(maybeCapacitor?.isNativePlatform?.());
};

interface Candidate {
  name: AdapterKind;
  factory: StorageAdapterFactory;
  openOptions?: StorageOpenOptions;
}

/**
 * Resolves the most appropriate storage adapter for the current runtime.
 * Tries candidates in the supplied priority order and falls back when one fails.
 */
export const resolveStorageAdapter = async (options: StorageResolutionOptions = {}): Promise<StorageAdapter> => {
  const envOverride = process.env.STORAGE_ADAPTER as AdapterKind | undefined;
  const postgresConnection = options.postgres?.connectionString ?? process.env.DATABASE_URL ?? undefined;
  const filePath = options.filePath ?? path.join(process.cwd(), 'db_data', 'app.sqlite3');

  const defaultPriority: AdapterKind[] = (() => {
    if (options.priority && options.priority.length > 0) {
      return options.priority;
    }
    if (envOverride) {
      return [envOverride];
    }
    if (isCapacitorRuntime()) {
      return ['capacitor', 'sqljs'];
    }
    if (postgresConnection) {
      return ['postgres', 'better-sqlite3', 'sqljs'];
    }
    return ['better-sqlite3', 'sqljs'];
  })();

  const candidates: Candidate[] = defaultPriority.map((name) => {
    switch (name) {
      case 'postgres': {
        return {
          name,
          factory: async () => {
            if (!postgresConnection) {
              throw new Error('DATABASE_URL or postgres connection string not provided.');
            }
            return createPostgresAdapter(postgresConnection);
          },
          openOptions: { connectionString: postgresConnection }
        };
      }
      case 'better-sqlite3':
        return {
          name,
          factory: async () => createBetterSqliteAdapter(filePath),
          openOptions: { filePath }
        };
      case 'capacitor':
        return {
          name,
          factory: async () => createCapacitorSqliteAdapter(options.capacitor)
        };
      case 'sqljs':
      default:
        return {
          name: 'sqljs',
          factory: async () => createSqlJsAdapter(),
          openOptions: { filePath }
        };
    }
  });

  const errors: unknown[] = [];

  for (const candidate of candidates) {
    try {
      const adapter = await candidate.factory();
      const openOptions: StorageOpenOptions = {
        ...candidate.openOptions,
        ...options.openOptions,
      };
      await adapter.open(openOptions);
      console.info(`[StorageAdapter] Using adapter "${candidate.name}".`);
      return adapter;
    } catch (error) {
      console.warn(`[StorageAdapter] Failed to initialise adapter "${candidate.name}".`, error);
      errors.push(error);
      continue;
    }
  }

  throw new StorageResolutionError('Unable to resolve a storage adapter for the current environment.', errors);
};

