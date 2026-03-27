import type { StorageAdapter } from '../core/contracts/index.js';
import type { IDatabaseExporter } from '../core/contracts/exporter.js';

/**
 * SQLite database exporter.
 *
 * Uses `VACUUM INTO` for file-based exports (better-sqlite3) and delegates
 * to the adapter's `exportDatabase()` method for in-memory exports (sql.js,
 * IndexedDB adapters).
 */
export class SqliteFileExporter implements IDatabaseExporter {
  constructor(private readonly adapter: StorageAdapter) {}

  async exportToFile(outputPath: string): Promise<void> {
    const escaped = outputPath.replace(/'/g, "''");
    await this.adapter.exec(`VACUUM INTO '${escaped}'`);
  }

  async exportToBytes(): Promise<Uint8Array> {
    const exportable = this.adapter as { exportDatabase?: () => Promise<Uint8Array> | Uint8Array };
    if (typeof exportable.exportDatabase === 'function') {
      const result = exportable.exportDatabase();
      return result instanceof Promise ? result : result;
    }
    throw new Error(
      `SqliteFileExporter.exportToBytes() is not supported for adapter "${this.adapter.kind}". ` +
      'Use exportToFile() instead, or use an adapter that supports exportDatabase() (sql.js, IndexedDB).',
    );
  }
}
