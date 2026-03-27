import type { IFullTextSearch } from '../core/contracts/fts.js';

/**
 * Postgres full-text search using tsvector columns and GIN indexes.
 *
 * Unlike FTS5 (separate virtual table), Postgres stores the tsvector
 * as a column `_tsv` on the content table itself. The `createIndex()`
 * call adds the column, creates the GIN index, and backfills existing rows.
 */
export class PostgresFts implements IFullTextSearch {
  /** The content table is stored during createIndex for use by other methods. */
  private _contentTable = '';
  private _columns: string[] = [];

  createIndex(config: { table: string; columns: string[]; contentTable?: string; tokenizer?: string }): string {
    const ct = config.contentTable ?? config.table;
    this._contentTable = ct;
    this._columns = config.columns;
    const colConcat = config.columns.map((c) => `COALESCE(${c}, '')`).join(" || ' ' || ");
    const lang = this._tokenizerToLang(config.tokenizer);

    return [
      `ALTER TABLE ${ct} ADD COLUMN IF NOT EXISTS _tsv tsvector`,
      `CREATE INDEX IF NOT EXISTS idx_${config.table}_tsv ON ${ct} USING GIN(_tsv)`,
      `UPDATE ${ct} SET _tsv = to_tsvector('${lang}', ${colConcat}) WHERE _tsv IS NULL`,
    ].join(';\n');
  }

  matchClause(_indexName: string, queryPlaceholder: string): string {
    return `_tsv @@ plainto_tsquery('english', ${queryPlaceholder})`;
  }

  rankExpression(_indexName: string, queryPlaceholder?: string): string {
    const qp = queryPlaceholder ?? '$1';
    return `ts_rank(_tsv, plainto_tsquery('english', ${qp}))`;
  }

  rebuildCommand(_indexName: string): string {
    const ct = this._contentTable;
    const colConcat = this._columns.map((c) => `COALESCE(${c}, '')`).join(" || ' ' || ");
    return `UPDATE ${ct} SET _tsv = to_tsvector('english', ${colConcat})`;
  }

  syncInsert(_indexName: string, rowIdExpr: string, columns: string[]): string {
    const ct = this._contentTable;
    const colConcat = columns.map((c) => `COALESCE(${c}, '')`).join(" || ' ' || ");
    return `UPDATE ${ct} SET _tsv = to_tsvector('english', ${colConcat}) WHERE rowid = ${rowIdExpr}`;
  }

  sanitizeQuery(input: string): string {
    return input;
  }

  joinClause(contentTable: string, contentAlias: string, _ftsAlias: string, _indexName: string): string {
    return `${contentTable} ${contentAlias}`;
  }

  /** Map FTS5-style tokenizer strings to Postgres text search configurations. */
  private _tokenizerToLang(tokenizer?: string): string {
    if (!tokenizer) return 'english';
    if (tokenizer.includes('porter')) return 'english';
    return 'simple';
  }
}
