import type { StorageAdapter, StorageCapability, StorageOpenOptions, StorageParameters, StorageRunResult } from '../types.js';
type SqlJsAdapterOptions = {
    locateFile?: (file: string) => string;
};
export declare class SqlJsAdapter implements StorageAdapter {
    private readonly adapterOptions;
    readonly kind = "sqljs";
    readonly capabilities: ReadonlySet<StorageCapability>;
    private SQL;
    private db;
    private filePath?;
    constructor(adapterOptions?: SqlJsAdapterOptions);
    open(options?: StorageOpenOptions): Promise<void>;
    run(statement: string, parameters?: StorageParameters): Promise<StorageRunResult>;
    get<T>(statement: string, parameters?: StorageParameters): Promise<T | null>;
    all<T>(statement: string, parameters?: StorageParameters): Promise<T[]>;
    exec(script: string): Promise<void>;
    transaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T>;
    close(): Promise<void>;
    private prepare;
    private ensureOpen;
    private persistIfNeeded;
}
export declare const createSqlJsAdapter: (options?: SqlJsAdapterOptions) => StorageAdapter;
export {};
//# sourceMappingURL=sqlJsAdapter.d.ts.map