import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { normaliseParameters } from '../utils/parameterUtils.js';
const hasFsAccess = () => {
    try {
        return typeof fs.accessSync === 'function';
    }
    catch {
        return false;
    }
};
export class SqlJsAdapter {
    constructor(adapterOptions = {}) {
        this.adapterOptions = adapterOptions;
        this.kind = 'sqljs';
        this.SQL = null;
        this.db = null;
        const caps = ['transactions'];
        if (hasFsAccess()) {
            caps.push('persistence');
        }
        this.capabilities = new Set(caps);
    }
    async open(options) {
        if (this.db) {
            return;
        }
        this.SQL = await initSqlJs(this.adapterOptions);
        this.filePath = options?.filePath;
        if (this.filePath && hasFsAccess() && fs.existsSync(this.filePath)) {
            const buffer = fs.readFileSync(this.filePath);
            this.db = new this.SQL.Database(buffer);
        }
        else {
            this.db = new this.SQL.Database();
        }
    }
    async run(statement, parameters) {
        const stmt = this.prepare(statement);
        try {
            const { named, positional } = normaliseParameters(parameters);
            if (named) {
                stmt.bind(named);
            }
            else if (positional) {
                stmt.bind(positional);
            }
            stmt.step();
            return { changes: this.db.getRowsModified(), lastInsertRowid: this.db.exec('SELECT last_insert_rowid() AS id')[0]?.values?.[0]?.[0] ?? null };
        }
        finally {
            stmt.free();
            await this.persistIfNeeded();
        }
    }
    async get(statement, parameters) {
        const rows = await this.all(statement, parameters);
        return rows.length > 0 ? rows[0] : null;
    }
    async all(statement, parameters) {
        const stmt = this.prepare(statement);
        try {
            const { named, positional } = normaliseParameters(parameters);
            if (named) {
                stmt.bind(named);
            }
            else if (positional) {
                stmt.bind(positional);
            }
            const results = [];
            while (stmt.step()) {
                const row = {};
                stmt.getColumnNames().forEach((column, index) => {
                    row[column] = stmt.get()[index];
                });
                results.push(row);
            }
            return results;
        }
        finally {
            stmt.free();
        }
    }
    async exec(script) {
        this.ensureOpen();
        this.db.run(script);
        await this.persistIfNeeded();
    }
    async transaction(fn) {
        this.ensureOpen();
        this.db.run('BEGIN TRANSACTION;');
        try {
            const result = await fn(this);
            this.db.run('COMMIT;');
            await this.persistIfNeeded();
            return result;
        }
        catch (error) {
            this.db.run('ROLLBACK;');
            throw error;
        }
    }
    async close() {
        if (this.db) {
            await this.persistIfNeeded();
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
            throw new Error('Storage adapter not opened. Call open() first.');
        }
    }
    async persistIfNeeded() {
        if (!this.filePath || !hasFsAccess()) {
            return;
        }
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const data = this.db.export();
        fs.writeFileSync(this.filePath, Buffer.from(data));
    }
}
export const createSqlJsAdapter = (options) => new SqlJsAdapter(options);
//# sourceMappingURL=sqlJsAdapter.js.map