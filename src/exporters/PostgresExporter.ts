import type { IDatabaseExporter } from '../core/contracts/exporter.js';

/**
 * PostgreSQL database exporter using `pg_dump`.
 *
 * Requires a valid connection string and `pg_dump` to be available on
 * the system PATH. Supports both file-based and byte-array exports.
 */
export class PostgresExporter implements IDatabaseExporter {
  constructor(private readonly connectionString?: string) {}

  async exportToFile(outputPath: string): Promise<void> {
    if (!this.connectionString) {
      throw new Error('PostgresExporter requires a connection string for pg_dump.');
    }
    const { execSync } = await import('node:child_process');
    execSync(`pg_dump "${this.connectionString}" --file="${outputPath}" --format=custom`, {
      stdio: 'pipe',
    });
  }

  async exportToBytes(): Promise<Uint8Array> {
    if (!this.connectionString) {
      throw new Error('PostgresExporter requires a connection string for pg_dump.');
    }
    const { execSync } = await import('node:child_process');
    const buf = execSync(`pg_dump "${this.connectionString}" --format=custom`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 256 * 1024 * 1024,
    });
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
}
