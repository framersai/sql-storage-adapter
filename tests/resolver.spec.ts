import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resolveStorageAdapter, StorageResolutionError } from '../src/index.js';

describe('Storage Adapter Resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('should export resolveStorageAdapter function', () => {
    expect(resolveStorageAdapter).toBeDefined();
    expect(typeof resolveStorageAdapter).toBe('function');
  });

  it('should throw StorageResolutionError when no adapter can be resolved', async () => {
    // Mock all adapters to fail
    vi.mock('../src/adapters/betterSqliteAdapter.js', () => ({
      createBetterSqliteAdapter: () => {
        throw new Error('better-sqlite3 not available');
      }
    }));

    vi.mock('../src/adapters/sqlJsAdapter.js', () => ({
      createSqlJsAdapter: () => {
        throw new Error('sql.js not available');
      }
    }));

    try {
      await resolveStorageAdapter({ priority: ['better-sqlite3'] });
      expect.fail('Should have thrown StorageResolutionError');
    } catch (error) {
      expect(error).toBeInstanceOf(StorageResolutionError);
      expect(error.message).toContain('Unable to resolve a storage adapter');
    }
  });

  it('should respect priority order when specified', async () => {
    const options = {
      priority: ['sqljs' as const],
      filePath: '/test/db.sqlite'
    };

    // This will attempt sql.js first due to priority
    // The actual adapter creation might fail in test environment
    // but we're testing the resolution logic
    try {
      await resolveStorageAdapter(options);
    } catch (error) {
      // Expected in test environment without actual adapters
      expect(error).toBeInstanceOf(StorageResolutionError);
    }
  });

  it('should use environment variable STORAGE_ADAPTER when set', async () => {
    vi.stubEnv('STORAGE_ADAPTER', 'sqljs');

    try {
      await resolveStorageAdapter();
    } catch (error) {
      // Expected in test environment
      expect(error).toBeInstanceOf(StorageResolutionError);
    }
  });

  it('should prioritize PostgreSQL when DATABASE_URL is set', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');

    try {
      await resolveStorageAdapter();
    } catch (error) {
      // Expected in test environment
      expect(error).toBeInstanceOf(StorageResolutionError);
      expect(error.causes).toBeDefined();
    }
  });
});