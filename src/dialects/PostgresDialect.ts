import type { SqlDialect } from '../core/contracts/dialect.js';

/**
 * PostgreSQL dialect implementation.
 *
 * Generates Postgres-compatible SQL syntax including `ON CONFLICT DO NOTHING`,
 * `ON CONFLICT ... DO UPDATE SET`, `jsonb` extraction operators, `COALESCE()`,
 * `GENERATED ALWAYS AS IDENTITY`, and `$N` positional placeholders.
 */
export class PostgresDialect implements SqlDialect {
  readonly name = 'postgres' as const;

  insertOrIgnore(table: string, columns: string[], placeholders: string[]): string {
    return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT DO NOTHING`;
  }

  insertOrReplace(table: string, columns: string[], placeholders: string[], primaryKey?: string): string {
    const pk = primaryKey ?? columns[0];
    const updates = columns
      .filter((col) => col !== pk)
      .map((col) => `${col} = EXCLUDED.${col}`)
      .join(', ');
    return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT (${pk}) DO UPDATE SET ${updates}`;
  }

  jsonExtract(column: string, jsonPath: string): string {
    const path = jsonPath.replace(/^\$\./, '');
    const parts = path.split('.');
    if (parts.length === 1) {
      return `(${column}::jsonb)->>'${parts[0]}'`;
    }
    const args = parts.map((p) => `'${p}'`).join(', ');
    return `jsonb_extract_path_text(${column}::jsonb, ${args})`;
  }

  ifnull(expr: string, fallback: string): string {
    return `COALESCE(${expr}, ${fallback})`;
  }

  autoIncrementPrimaryKey(): string {
    return 'INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY';
  }

  pragma(_key: string, _value: string): string | null {
    return null;
  }

  placeholder(index: number): string {
    return `$${index + 1}`;
  }
}
