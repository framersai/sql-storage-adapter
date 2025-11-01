import type { StorageAdapter, StorageOpenOptions } from './types.js';
import { type CapacitorAdapterOptions } from './adapters/capacitorSqliteAdapter.js';
export interface StorageResolutionOptions {
    filePath?: string;
    priority?: Array<'better-sqlite3' | 'capacitor' | 'sqljs'>;
    capacitor?: CapacitorAdapterOptions;
    openOptions?: StorageOpenOptions;
}
export declare const resolveStorageAdapter: (options?: StorageResolutionOptions) => Promise<StorageAdapter>;
//# sourceMappingURL=resolver.d.ts.map