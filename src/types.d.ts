export type StorageCapability = 'sync' | 'transactions' | 'wal' | 'locks' | 'persistence';
export type StorageParameters = undefined | null | Record<string, unknown> | Array<string | number | null | Uint8Array | unknown>;
export interface StorageRunResult {
    changes: number;
    lastInsertRowid?: string | number | null;
}
export interface StorageOpenOptions {
    filePath?: string;
    readOnly?: boolean;
    adapterOptions?: Record<string, unknown>;
}
export interface StorageAdapter {
    readonly kind: string;
    readonly capabilities: ReadonlySet<StorageCapability>;
    open(options?: StorageOpenOptions): Promise<void>;
    run(statement: string, parameters?: StorageParameters): Promise<StorageRunResult>;
    get<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T | null>;
    all<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T[]>;
    exec(script: string): Promise<void>;
    transaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T>;
    close(): Promise<void>;
}
export type StorageAdapterFactory = () => Promise<StorageAdapter>;
export declare class StorageResolutionError extends Error {
    readonly causes: unknown[];
    constructor(message: string, causes?: unknown[]);
}
//# sourceMappingURL=types.d.ts.map