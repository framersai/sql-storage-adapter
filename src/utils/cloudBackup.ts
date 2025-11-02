/**
 * Cloud backup utilities for S3, R2, and other object storage.
 * Provides automatic scheduled backups and restore functionality.
 */

import type { StorageAdapter } from '../types';
import { exportAsJSON, exportAsSQL } from './dataExport';
import { importFromJSON, importFromSQL } from './dataImport';

export type BackupFormat = 'json' | 'sql';
export type CompressionType = 'gzip' | 'none';

export interface CloudStorageProvider {
  /** Upload data to cloud storage */
  upload(key: string, data: string | Buffer): Promise<void>;
  /** Download data from cloud storage */
  download(key: string): Promise<string | Buffer>;
  /** List backups in cloud storage */
  list(prefix?: string): Promise<string[]>;
  /** Delete a backup */
  delete(key: string): Promise<void>;
}

export interface BackupOptions {
  /** Backup format (json or sql) */
  format?: BackupFormat;
  /** Compression type */
  compression?: CompressionType;
  /** Tables to include (undefined = all) */
  tables?: string[];
  /** Prefix for backup keys */
  prefix?: string;
  /** Include timestamp in key */
  includeTimestamp?: boolean;
}

export interface ScheduledBackupConfig {
  /** Interval in milliseconds */
  interval: number;
  /** Maximum number of backups to keep */
  maxBackups?: number;
  /** Backup options */
  options?: BackupOptions;
  /** Callback on successful backup */
  onSuccess?: (key: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * S3-compatible cloud storage provider.
 * Works with AWS S3, Cloudflare R2, MinIO, etc.
 */
export class S3StorageProvider implements CloudStorageProvider {
  constructor(
    private client: {
      putObject: (params: { Bucket: string; Key: string; Body: string | Buffer }) => Promise<unknown>;
      getObject: (params: { Bucket: string; Key: string }) => Promise<{ Body: { transformToString: () => Promise<string> } }>;
      listObjectsV2: (params: { Bucket: string; Prefix?: string }) => Promise<{ Contents?: Array<{ Key?: string }> }>;
      deleteObject: (params: { Bucket: string; Key: string }) => Promise<unknown>;
    },
    private bucket: string
  ) {}

  async upload(key: string, data: string | Buffer): Promise<void> {
    await this.client.putObject({
      Bucket: this.bucket,
      Key: key,
      Body: data,
    });
  }

  async download(key: string): Promise<string> {
    const response = await this.client.getObject({
      Bucket: this.bucket,
      Key: key,
    });
    return await response.Body.transformToString();
  }

  async list(prefix?: string): Promise<string[]> {
    const response = await this.client.listObjectsV2({
      Bucket: this.bucket,
      Prefix: prefix,
    });
    return response.Contents?.map(obj => obj.Key).filter((key): key is string => !!key) ?? [];
  }

  async delete(key: string): Promise<void> {
    await this.client.deleteObject({
      Bucket: this.bucket,
      Key: key,
    });
  }
}

/**
 * Compress data using gzip.
 */
async function compress(data: string): Promise<Buffer> {
  const { gzip } = await import('zlib');
  const { promisify } = await import('util');
  const gzipAsync = promisify(gzip);
  return await gzipAsync(Buffer.from(data));
}

/**
 * Decompress gzipped data.
 */
async function decompress(data: Buffer): Promise<string> {
  const { gunzip } = await import('zlib');
  const { promisify } = await import('util');
  const gunzipAsync = promisify(gunzip);
  const decompressed = await gunzipAsync(data);
  return decompressed.toString('utf-8');
}

/**
 * Cloud backup manager for automatic scheduled backups.
 */
export class CloudBackupManager {
  private intervalId?: NodeJS.Timeout;

  constructor(
    private adapter: StorageAdapter,
    private storage: CloudStorageProvider,
    private config: ScheduledBackupConfig
  ) {}

  /**
   * Create a backup and upload to cloud storage.
   */
  async backup(options: BackupOptions = {}): Promise<string> {
    const format = options.format ?? this.config.options?.format ?? 'json';
    const compression = options.compression ?? this.config.options?.compression ?? 'none';
    const tables = options.tables ?? this.config.options?.tables;
    const prefix = options.prefix ?? this.config.options?.prefix ?? 'backups/';
    const includeTimestamp = options.includeTimestamp ?? this.config.options?.includeTimestamp ?? true;

    // Export data
    let data: string;
    if (format === 'json') {
      data = await exportAsJSON(this.adapter, { tables });
    } else {
      data = await exportAsSQL(this.adapter, { tables });
    }

    // Compress if needed
    let uploadData: string | Buffer = data;
    if (compression === 'gzip') {
      uploadData = await compress(data);
    }

    // Generate key
    const timestamp = includeTimestamp ? `-${new Date().toISOString().replace(/[:.]/g, '-')}` : '';
    const ext = format === 'json' ? 'json' : 'sql';
    const compExt = compression === 'gzip' ? '.gz' : '';
    const key = `${prefix}backup${timestamp}.${ext}${compExt}`;

    // Upload
    await this.storage.upload(key, uploadData);

    // Cleanup old backups if needed
    if (this.config.maxBackups) {
      await this.cleanupOldBackups(prefix);
    }

    return key;
  }

  /**
   * Restore from a cloud backup.
   */
  async restore(key: string): Promise<void> {
    // Download
    const data = await this.storage.download(key);

    // Decompress if needed
    let restored: string;
    if (key.endsWith('.gz')) {
      restored = await decompress(Buffer.from(data));
    } else {
      restored = typeof data === 'string' ? data : data.toString('utf-8');
    }

    // Import
    if (key.includes('.json')) {
      await importFromJSON(this.adapter, restored);
    } else {
      await importFromSQL(this.adapter, restored);
    }
  }

  /**
   * List all backups in cloud storage.
   */
  async listBackups(prefix?: string): Promise<string[]> {
    const searchPrefix = prefix ?? this.config.options?.prefix ?? 'backups/';
    return await this.storage.list(searchPrefix);
  }

  /**
   * Delete old backups exceeding maxBackups limit.
   */
  private async cleanupOldBackups(prefix: string): Promise<void> {
    if (!this.config.maxBackups) return;

    const backups = await this.storage.list(prefix);
    if (backups.length <= this.config.maxBackups) return;

    // Sort by name (timestamp) and delete oldest
    const sorted = backups.sort();
    const toDelete = sorted.slice(0, backups.length - this.config.maxBackups);

    for (const key of toDelete) {
      await this.storage.delete(key);
    }
  }

  /**
   * Start automatic scheduled backups.
   */
  start(): void {
    if (this.intervalId) {
      throw new Error('Scheduled backups already started');
    }

    this.intervalId = setInterval(async () => {
      try {
        const key = await this.backup();
        this.config.onSuccess?.(key);
      } catch (error) {
        this.config.onError?.(error as Error);
      }
    }, this.config.interval);
  }

  /**
   * Stop automatic scheduled backups.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Perform a backup immediately (manual trigger).
   */
  async backupNow(options?: BackupOptions): Promise<string> {
    return await this.backup(options);
  }
}

/**
 * Create a cloud backup manager with S3-compatible storage.
 * 
 * @example AWS S3
 * ```ts
 * import { S3Client } from '@aws-sdk/client-s3';
 * import { createCloudBackupManager } from '@framers/sql-storage-adapter';
 * 
 * const s3 = new S3Client({ region: 'us-east-1' });
 * const manager = createCloudBackupManager(db, s3, 'my-bucket', {
 *   interval: 60 * 60 * 1000, // 1 hour
 *   maxBackups: 24,
 *   options: { compression: 'gzip' }
 * });
 * 
 * manager.start();
 * ```
 * 
 * @example Cloudflare R2
 * ```ts
 * import { S3Client } from '@aws-sdk/client-s3';
 * 
 * const r2 = new S3Client({
 *   region: 'auto',
 *   endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
 *   credentials: {
 *     accessKeyId: process.env.R2_ACCESS_KEY_ID,
 *     secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
 *   },
 * });
 * 
 * const manager = createCloudBackupManager(db, r2, 'backups', {
 *   interval: 24 * 60 * 60 * 1000, // Daily
 *   maxBackups: 7
 * });
 * ```
 */
export function createCloudBackupManager(
  adapter: StorageAdapter,
  s3Client: ConstructorParameters<typeof S3StorageProvider>[0],
  bucket: string,
  config: ScheduledBackupConfig
): CloudBackupManager {
  const storage = new S3StorageProvider(s3Client, bucket);
  return new CloudBackupManager(adapter, storage, config);
}
