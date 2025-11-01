import type { StorageAdapter, StorageOpenOptions, StorageParameters, StorageRunResult, StorageCapability } from '../types.js';
export declare class BetterSqliteAdapter implements StorageAdapter {
    private readonly defaultFilePath;
    readonly kind = "better-sqlite3";
    readonly capabilities: ReadonlySet<StorageCapability>;
    private module;
    private db;
    constructor(defaultFilePath: string);
    open(options?: StorageOpenOptions): Promise<void>;
    run(statement: string, parameters?: StorageParameters): Promise<StorageRunResult>;
    get<T>(statement: string, parameters?: StorageParameters): Promise<T | null>;
    all<T>(statement: string, parameters?: StorageParameters): Promise<T[]>;
    exec(script: string): Promise<void>;
    transaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T>;
    close(): Promise<void>;
    private prepare;
    private ensureOpen;
}
export declare const createBetterSqliteAdapter: (filePath: string) => StorageAdapter;
//# sourceMappingURL=betterSqliteAdapter.d.ts.map