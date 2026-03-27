import type { SqlDialect } from './dialect.js';
import type { IFullTextSearch } from './fts.js';
import type { IBlobCodec } from './blobCodec.js';
import type { IDatabaseExporter } from './exporter.js';
import type { StorageAdapter } from './index.js';
import { SqliteDialect } from '../../dialects/SqliteDialect.js';
import { PostgresDialect } from '../../dialects/PostgresDialect.js';
import { SqliteFts5 } from '../../fts/SqliteFts5.js';
import { PostgresFts } from '../../fts/PostgresFts.js';
import { NodeBlobCodec } from '../../codecs/NodeBlobCodec.js';
import { BrowserBlobCodec } from '../../codecs/BrowserBlobCodec.js';
import { SqliteFileExporter } from '../../exporters/SqliteFileExporter.js';
import { PostgresExporter } from '../../exporters/PostgresExporter.js';

/**
 * Bundle of platform-aware database features.
 *
 * Created by `createStorageFeatures(adapter)` — consumers use this
 * instead of writing raw platform-specific SQL.
 */
export interface StorageFeatures {
  readonly dialect: SqlDialect;
  readonly fts: IFullTextSearch;
  readonly blobCodec: IBlobCodec;
  readonly exporter: IDatabaseExporter;
}

/**
 * Create a platform-aware feature bundle for the given storage adapter.
 *
 * Inspects `adapter.kind` and the runtime environment to select the right
 * dialect, FTS, BLOB codec, and exporter implementations.
 */
export function createStorageFeatures(adapter: StorageAdapter): StorageFeatures {
  const isPostgres = adapter.kind === 'postgres';
  const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

  return {
    dialect: isPostgres ? new PostgresDialect() : new SqliteDialect(),
    fts: isPostgres ? new PostgresFts() : new SqliteFts5(),
    blobCodec: isBrowser ? new BrowserBlobCodec() : new NodeBlobCodec(),
    exporter: isPostgres ? new PostgresExporter() : new SqliteFileExporter(adapter),
  };
}
