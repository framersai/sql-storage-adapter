import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { normaliseParameters } from '../utils/parameterUtils.js';
const loadBetterSqlite = async () => {
    try {
        return (await import('better-sqlite3'));
    }
    catch {
        try {
            const require = (await import('module')).createRequire(pathToFileURL(__filename));
            return require('better-sqlite3');
        }
        catch (error) {
            console.warn('[StorageAdapter] better-sqlite3 module not available.', error);
            return null;
        }
    }
};
export class BetterSqliteAdapter {
    constructor(defaultFilePath) {
        this.defaultFilePath = defaultFilePath;
        this.kind = 'better-sqlite3';
        this.capabilities = new Set(['sync', 'transactions', 'wal', 'locks', 'persistence']);
        this.module = null;
        this.db = null;
    }
    async open(options) {
        if (this.db) {
            return;
        }
        this.module = await loadBetterSqlite();
        if (!this.module) {
            throw new Error('better-sqlite3 module is not available. Install it or choose another adapter.');
        }
        const DatabaseCtor = this.module.default ?? this.module;
        const resolvedPath = options?.filePath ?? this.defaultFilePath;
        this.db = new DatabaseCtor(resolvedPath, options?.readOnly ? { readonly: true } : undefined);
    }
    async run(statement, parameters) {
        const stmt = this.prepare(statement);
        const { named, positional } = normaliseParameters(parameters);
        const result = named ? stmt.run(named) : stmt.run(positional ?? []);
        return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
    }
    async get(statement, parameters) {
        const stmt = this.prepare(statement);
        const { named, positional } = normaliseParameters(parameters);
        const row = named ? stmt.get(named) : stmt.get(positional ?? []);
        return row ?? null;
    }
    async all(statement, parameters) {
        const stmt = this.prepare(statement);
        const { named, positional } = normaliseParameters(parameters);
        const rows = named ? stmt.all(named) : stmt.all(positional ?? []);
        return rows;
    }
    async exec(script) {
        this.ensureOpen();
        this.db.exec(script);
    }
    async transaction(fn) {
        this.ensureOpen();
        const db = this.db;
        const wrap = db.transaction(async () => fn(this));
        return wrap();
    }
    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
    prepare(statement) {
        this.ensureOpen();
        return this.db.prepare(statement);
    }
    ensureOpen() {
        if (!this.db) {
            throw new Error('Storage adapter not opened. Call open() before executing statements.');
        }
    }
}
export const createBetterSqliteAdapter = (filePath) => {
    const resolved = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', filePath);
    return new BetterSqliteAdapter(resolved);
};
//# sourceMappingURL=betterSqliteAdapter.js.map