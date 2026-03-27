import { describe, it, expect } from 'vitest';
import { SqliteFts5 } from '../src/fts/SqliteFts5.js';
import { PostgresFts } from '../src/fts/PostgresFts.js';

describe('SqliteFts5', () => {
  const fts = new SqliteFts5();

  it('createIndex generates FTS5 virtual table DDL', () => {
    const ddl = fts.createIndex({
      table: 'memory_traces_fts',
      columns: ['content', 'tags'],
      contentTable: 'memory_traces',
      tokenizer: 'porter ascii',
    });
    expect(ddl).toContain('CREATE VIRTUAL TABLE IF NOT EXISTS memory_traces_fts USING fts5');
    expect(ddl).toContain('content, tags');
    expect(ddl).toContain("content='memory_traces'");
    expect(ddl).toContain("tokenize='porter ascii'");
  });

  it('matchClause generates MATCH expression', () => {
    expect(fts.matchClause('memory_traces_fts', '?'))
      .toBe('memory_traces_fts MATCH ?');
  });

  it('rankExpression generates rank reference', () => {
    expect(fts.rankExpression('memory_traces_fts'))
      .toContain('rank');
  });

  it('rebuildCommand generates rebuild insert', () => {
    expect(fts.rebuildCommand('memory_traces_fts'))
      .toBe("INSERT INTO memory_traces_fts(memory_traces_fts) VALUES('rebuild')");
  });

  it('syncInsert generates external-content insert', () => {
    const sql = fts.syncInsert('memory_traces_fts', '(SELECT rowid FROM memory_traces WHERE id = ?)', ['content', 'tags']);
    expect(sql).toContain('INSERT INTO memory_traces_fts');
    expect(sql).toContain('rowid, content, tags');
  });

  it('sanitizeQuery wraps words in quotes', () => {
    const q = fts.sanitizeQuery('dark mode preference');
    expect(q).toContain('"dark"');
    expect(q).toContain('"mode"');
  });

  it('joinClause generates FROM ... JOIN on rowid', () => {
    const clause = fts.joinClause('memory_traces', 't', 'fts', 'memory_traces_fts');
    expect(clause).toContain('memory_traces_fts fts');
    expect(clause).toContain('JOIN');
    expect(clause).toContain('rowid');
  });
});

describe('PostgresFts', () => {
  const fts = new PostgresFts();

  it('createIndex generates tsvector column + GIN index', () => {
    const ddl = fts.createIndex({
      table: 'memory_traces_fts',
      columns: ['content', 'tags'],
      contentTable: 'memory_traces',
    });
    expect(ddl).toContain('ADD COLUMN IF NOT EXISTS _tsv tsvector');
    expect(ddl).toContain('USING GIN');
  });

  it('matchClause generates @@ expression', () => {
    const clause = fts.matchClause('memory_traces_fts', '$1');
    expect(clause).toContain('@@');
    expect(clause).toContain('plainto_tsquery');
  });

  it('rankExpression generates ts_rank', () => {
    const expr = fts.rankExpression('memory_traces_fts', '$1');
    expect(expr).toContain('ts_rank');
  });

  it('rebuildCommand generates UPDATE with to_tsvector', () => {
    const cmd = fts.rebuildCommand('memory_traces_fts');
    expect(cmd).toContain('UPDATE');
    expect(cmd).toContain('to_tsvector');
  });

  it('joinClause returns content table only (no JOIN — tsvector is on the table)', () => {
    const clause = fts.joinClause('memory_traces', 't', 'fts', 'memory_traces_fts');
    expect(clause).toContain('memory_traces t');
    expect(clause).not.toContain('JOIN');
  });
});
