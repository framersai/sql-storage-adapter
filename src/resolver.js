import path from 'path';
import { StorageResolutionError } from './types.js';
import { createBetterSqliteAdapter } from './adapters/betterSqliteAdapter.js';
import { createSqlJsAdapter } from './adapters/sqlJsAdapter.js';
import { createCapacitorSqliteAdapter } from './adapters/capacitorSqliteAdapter.js';
const isCapacitorRuntime = () => {
    if (typeof window === 'undefined') {
        return false;
    }
    const maybeCapacitor = window.Capacitor;
    return Boolean(maybeCapacitor?.isNativePlatform?.());
};
export const resolveStorageAdapter = async (options = {}) => {
    const envOverride = process.env.STORAGE_ADAPTER;
    const filePath = options.filePath ?? path.join(process.cwd(), 'db_data', 'app.sqlite3');
    const priority = envOverride
        ? [envOverride]
        : options.priority ??
            (isCapacitorRuntime()
                ? ['capacitor', 'sqljs']
                : ['better-sqlite3', 'sqljs']);
    const candidates = priority.map(name => {
        switch (name) {
            case 'better-sqlite3':
                return { name, factory: async () => createBetterSqliteAdapter(filePath) };
            case 'capacitor':
                return { name, factory: async () => createCapacitorSqliteAdapter(options.capacitor) };
            case 'sqljs':
            default:
                return { name: 'sqljs', factory: async () => createSqlJsAdapter() };
        }
    });
    const errors = [];
    for (const candidate of candidates) {
        try {
            const adapter = await candidate.factory();
            await adapter.open(options.openOptions ?? { filePath });
            console.info(`[StorageAdapter] Using adapter "${candidate.name}".`);
            return adapter;
        }
        catch (error) {
            console.warn(`[StorageAdapter] Failed to initialise adapter "${candidate.name}".`, error);
            errors.push(error);
            continue;
        }
    }
    throw new StorageResolutionError('Unable to resolve a storage adapter for the current environment.', errors);
};
//# sourceMappingURL=resolver.js.map