import { normaliseParameters } from '../utils/parameterUtils.js';
const loadCapacitorSqlite = async () => {
    try {
        return await import('@capacitor-community/sqlite');
    }
    catch (error) {
        console.warn('[StorageAdapter] @capacitor-community/sqlite module not available.', error);
        return null;
    }
};
export class CapacitorSqliteAdapter {
    constructor(options = {}) {
        this.options = options;
        this.kind = 'capacitor-sqlite';
        this.capabilities = new Set(['transactions', 'wal', 'locks', 'persistence']);
        this.plugin = null;
        this.connection = null;
        this.dbName = options.database ?? 'app';
    }
    async open(options) {
        if (this.connection) {
            return;
        }
        this.plugin = await loadCapacitorSqlite();
        if (!this.plugin) {
            throw new Error('@capacitor-community/sqlite is unavailable. Install the plugin or choose a different adapter.');
        }
        const dbName = options?.adapterOptions?.database ?? this.options.database ?? this.dbName;
        this.connection = await this.plugin.createConnection(dbName, false, 'no-encryption', 1, false);
        await this.connection.open();
        if (this.options.enableWal ?? true) {
            try {
                await this.connection.execute('PRAGMA journal_mode = WAL;');
            }
            catch (error) {
                console.warn('[StorageAdapter] Failed to enable WAL on Capacitor SQLite.', error);
            }
        }
    }
    async run(statement, parameters) {
        const conn = this.ensureConnection();
        const { positional } = normaliseParameters(parameters);
        const result = await conn.run(statement, positional ?? []);
        return { changes: result.changes ?? 0, lastInsertRowid: result.lastId ?? null };
    }
    async get(statement, parameters) {
        const rows = await this.all(statement, parameters);
        return rows.length > 0 ? rows[0] : null;
    }
    async all(statement, parameters) {
        const conn = this.ensureConnection();
        const { positional } = normaliseParameters(parameters);
        const result = await conn.query(statement, positional ?? []);
        return (result.values ?? []);
    }
    async exec(script) {
        const conn = this.ensureConnection();
        await conn.execute(script);
    }
    async transaction(fn) {
        const conn = this.ensureConnection();
        await conn.execute('BEGIN TRANSACTION;');
        try {
            const result = await fn(this);
            await conn.execute('COMMIT;');
            return result;
        }
        catch (error) {
            await conn.execute('ROLLBACK;');
            throw error;
        }
    }
    async close() {
        if (this.connection) {
            await this.connection.close();
            this.connection = null;
        }
    }
    ensureConnection() {
        if (!this.connection) {
            throw new Error('Storage adapter not opened. Call open() before executing statements.');
        }
        return this.connection;
    }
}
export const createCapacitorSqliteAdapter = (options) => new CapacitorSqliteAdapter(options);
//# sourceMappingURL=capacitorSqliteAdapter.js.map