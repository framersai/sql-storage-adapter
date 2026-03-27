import type { SqlDialect } from '../core/contracts/dialect.js';

/**
 * SQLite dialect implementation.
 *
 * Generates standard SQLite SQL syntax including `INSERT OR IGNORE`,
 * `INSERT OR REPLACE`, `json_extract()`, `ifnull()`, `PRAGMA`, and
 * positional `?` placeholders.
 */
export class SqliteDialect implements SqlDialect {
  readonly name = 'sqlite' as const;

  insertOrIgnore(table: string, columns: string[], placeholders: string[]): string {
    return `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
  }

  insertOrReplace(table: string, columns: string[], placeholders: string[], _primaryKey?: string): string {
    return `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
  }

  jsonExtract(column: string, jsonPath: string): string {
    return `json_extract(${column}, '${jsonPath}')`;
  }

  ifnull(expr: string, fallback: string): string {
    return `ifnull(${expr}, ${fallback})`;
  }

  autoIncrementPrimaryKey(): string {
    return 'INTEGER PRIMARY KEY AUTOINCREMENT';
  }

  pragma(key: string, value: string): string | null {
    return `PRAGMA ${key} = ${value}`;
  }

  placeholder(_index: number): string {
    return '?';
  }
}
