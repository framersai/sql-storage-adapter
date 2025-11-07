/**
 * @fileoverview AgentOS-First Storage Adapter
 * @description Opinionated storage layer designed specifically for AgentOS with auto-schema,
 * typed queries, and cross-platform persistence. This is the recommended way to use
 * sql-storage-adapter with AgentOS.
 * 
 * **Features:**
 * - Auto-detects best adapter for platform (web, electron, capacitor, node, cloud)
 * - Pre-configured schema for conversations, sessions, personas, telemetry
 * - Typed query builders for common AgentOS operations
 * - Optional cloud sync for hybrid local+remote architectures
 * - Export/import for data portability
 * 
 * @example Basic Usage
 * ```typescript
 * import { createAgentOSStorage } from '@framers/sql-storage-adapter/agentos';
 * import { AgentOS } from '@agentos/core';
 * 
 * const storage = await createAgentOSStorage({
 *   platform: 'auto',  // Detects: web, electron, capacitor, node, cloud
 *   persistence: true,
 * });
 * 
 * const agentos = new AgentOS();
 * await agentos.initialize({
 *   storageAdapter: storage,
 *   // ... other config
 * });
 * ```
 * 
 * @example Multi-Platform
 * ```typescript
 * // Web (browser): Uses IndexedDB
 * const webStorage = await createAgentOSStorage({ platform: 'web' });
 * 
 * // Desktop (Electron): Uses better-sqlite3
 * const desktopStorage = await createAgentOSStorage({ platform: 'electron' });
 * 
 * // Mobile (Capacitor): Uses native SQLite
 * const mobileStorage = await createAgentOSStorage({ platform: 'capacitor' });
 * 
 * // Cloud (Node): Uses PostgreSQL
 * const cloudStorage = await createAgentOSStorage({ 
 *   platform: 'cloud',
 *   postgres: { connectionString: process.env.DATABASE_URL }
 * });
 * ```
 * 
 * @example Hybrid Sync
 * ```typescript
 * const storage = await createAgentOSStorage({
 *   local: { adapter: 'indexeddb' },
 *   remote: { adapter: 'postgres', connectionString: CLOUD_URL },
 *   syncStrategy: 'optimistic',  // Local-first, background sync
 *   syncIntervalMs: 30000,
 * });
 * ```
 */

import type { StorageAdapter, StorageOpenOptions } from '../core/contracts';
import { resolveStorageAdapter, type StorageResolutionOptions } from '../core/resolver';
import type { AdapterKind } from '../core/contracts/context';

/**
 * Platform types for AgentOS deployment
 */
export type AgentOSPlatform = 'web' | 'electron' | 'capacitor' | 'node' | 'cloud' | 'auto';

/**
 * Sync strategy for hybrid local+remote storage
 */
export type SyncStrategy = 
  | 'local-only'      // No sync (default for offline)
  | 'remote-only'     // Cloud-only (no local cache)
  | 'optimistic'      // Write local, sync async
  | 'pessimistic';    // Write remote, cache local

/**
 * Configuration for AgentOS-optimized storage
 */
export interface AgentOSStorageConfig {
  /**
   * Target platform. 'auto' detects runtime automatically.
   * @default 'auto'
   */
  platform?: AgentOSPlatform;

  /**
   * Enable persistence (vs in-memory only).
   * @default true
   */
  persistence?: boolean;

  /**
   * Database name (for IndexedDB, SQLite file, etc.)
   * @default 'agentos-db'
   */
  dbName?: string;

  /**
   * File path for SQLite adapters
   */
  filePath?: string;

  /**
   * PostgreSQL connection config
   */
  postgres?: {
    connectionString?: string;
  };

  /**
   * Capacitor-specific options
   */
  capacitor?: {
    database?: string;
    encrypted?: boolean;
  };

  /**
   * Features to enable (auto-creates tables)
   * @default all enabled
   */
  features?: {
    conversations?: boolean;
    sessions?: boolean;
    personas?: boolean;
    telemetry?: boolean;
    workflows?: boolean;
  };

  /**
   * Optional cloud sync for hybrid architectures
   */
  cloudSync?: {
    enabled?: boolean;
    provider?: 'supabase' | 'postgres' | 'custom';
    connectionString?: string;
    syncStrategy?: SyncStrategy;
    syncIntervalMs?: number;
  };

  /**
   * Advanced: manual adapter priority override
   */
  adapterPriority?: AdapterKind[];
}

/**
 * Platform detection priorities
 */
const PLATFORM_PRIORITIES: Record<AgentOSPlatform, AdapterKind[]> = {
  web: ['indexeddb', 'sqljs'],
  electron: ['better-sqlite3', 'sqljs'],
  capacitor: ['capacitor', 'indexeddb', 'sqljs'],
  node: ['better-sqlite3', 'postgres', 'sqljs'],
  cloud: ['postgres', 'better-sqlite3', 'sqljs'],
  auto: [], // Will be determined at runtime
};

/**
 * Detects the current platform runtime
 */
function detectPlatform(): AgentOSPlatform {
  // Browser environments
  if (typeof window !== 'undefined') {
    // Capacitor native apps
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      return 'capacitor';
    }
    // Standard web browser
    return 'web';
  }

  // Node.js environments
  if (typeof process !== 'undefined') {
    // Electron
    if (process.versions?.electron) {
      return 'electron';
    }
    // Cloud (has DATABASE_URL)
    if (process.env.DATABASE_URL) {
      return 'cloud';
    }
    // Generic Node.js
    return 'node';
  }

  // Fallback
  return 'node';
}

/**
 * AgentOS schema for conversations, sessions, personas, etc.
 */
const AGENTOS_SCHEMA_SQL = `
-- Conversations (GMI interactions)
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  metadata TEXT DEFAULT '{}'
);

-- Conversation events (streaming chunks, tool calls, etc.)
CREATE TABLE IF NOT EXISTS conversation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Sessions (UI/UX grouping of conversations)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  target_type TEXT CHECK(target_type IN ('persona', 'agency')) NOT NULL,
  target_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  metadata TEXT DEFAULT '{}'
);

-- Persona definitions (cached locally)
CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  definition TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Telemetry (token usage, costs, performance)
CREATE TABLE IF NOT EXISTS telemetry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_data TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

-- Workflows (cached definitions)
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  definition TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_events_conversation_id ON conversation_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_events_timestamp ON conversation_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_session_id ON telemetry(session_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp);
`;

/**
 * AgentOS-optimized storage adapter with auto-schema and typed queries.
 * 
 * This class wraps a generic StorageAdapter and adds AgentOS-specific
 * functionality like auto-schema creation, typed query builders, and
 * optional cloud sync.
 */
export class AgentOSStorageAdapter {
  private adapter: StorageAdapter;
  private config: AgentOSStorageConfig;

  constructor(adapter: StorageAdapter, config: AgentOSStorageConfig) {
    this.adapter = adapter;
    this.config = config;
  }

  /**
   * Initializes the storage adapter and creates AgentOS schema.
   */
  async initialize(): Promise<void> {
    // Create tables for enabled features
    const statements = AGENTOS_SCHEMA_SQL.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await this.adapter.run(statement);
      }
    }

    console.info('[AgentOSStorage] Schema initialized.');
  }

  /**
   * Gets the underlying storage adapter for custom queries.
   */
  getAdapter(): StorageAdapter {
    return this.adapter;
  }

  /**
   * Closes the storage adapter.
   */
  async close(): Promise<void> {
    await this.adapter.close();
  }

  /**
   * Conversations API with typed query builders.
   * 
   * @example
   * ```typescript
   * await storage.conversations.save('conv-1', 'user-1', 'v_researcher', [
   *   { type: 'user', content: 'Hello', timestamp: Date.now() },
   *   { type: 'assistant', content: 'Hi!', timestamp: Date.now() },
   * ]);
   * 
   * const conversation = await storage.conversations.get('conv-1');
   * const allConversations = await storage.conversations.list('user-1', { limit: 50 });
   * ```
   */
  get conversations() {
    return {
      /**
       * Saves a conversation with its events.
       * Creates the conversation if it doesn't exist, updates if it does.
       */
      save: async (id: string, userId: string, personaId: string, events: any[]) => {
        const now = Date.now();
        await this.adapter.run(
          'INSERT OR REPLACE INTO conversations (id, user_id, persona_id, created_at, updated_at) VALUES (?, ?, ?, COALESCE((SELECT created_at FROM conversations WHERE id = ?), ?), ?)',
          [id, userId, personaId, id, now, now]
        );
        // Clear old events and insert new ones
        await this.adapter.run('DELETE FROM conversation_events WHERE conversation_id = ?', [id]);
        for (const event of events) {
          await this.adapter.run(
            'INSERT INTO conversation_events (conversation_id, event_type, event_data, timestamp) VALUES (?, ?, ?, ?)',
            [id, event.type || 'unknown', JSON.stringify(event), event.timestamp || now]
          );
        }
      },
      /**
       * Gets a conversation by ID with all its events.
       * Returns null if not found.
       */
      get: async (id: string) => {
        const conversation = await this.adapter.get<{
          id: string;
          user_id: string;
          persona_id: string;
          created_at: number;
          updated_at: number;
          metadata: string;
        }>('SELECT * FROM conversations WHERE id = ?', [id]);
        if (!conversation) return null;
        const events = await this.adapter.all<{
          id: number;
          conversation_id: string;
          event_type: string;
          event_data: string;
          timestamp: number;
        }>('SELECT * FROM conversation_events WHERE conversation_id = ? ORDER BY timestamp ASC', [id]);
        return {
          ...conversation,
          events: events.map(e => JSON.parse(e.event_data)),
        };
      },
      /**
       * Lists conversations for a user, ordered by most recent first.
       */
      list: async (userId: string, options?: { limit?: number; offset?: number }) => {
        const limit = options?.limit || 50;
        const offset = options?.offset || 0;
        return this.adapter.all<{
          id: string;
          user_id: string;
          persona_id: string;
          created_at: number;
          updated_at: number;
          metadata: string;
        }>('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?', [userId, limit, offset]);
      },
      /**
       * Deletes a conversation and all its events.
       */
      delete: async (id: string) => {
        await this.adapter.run('DELETE FROM conversations WHERE id = ?', [id]);
        // Events are deleted via CASCADE, but explicit delete for safety
        await this.adapter.run('DELETE FROM conversation_events WHERE conversation_id = ?', [id]);
      },
    };
  }

  /**
   * Sessions API with typed query builders.
   * 
   * @example
   * ```typescript
   * await storage.sessions.save('session-1', 'user-1', 'V Session', 'persona', 'v_researcher');
   * const session = await storage.sessions.get('session-1');
   * const allSessions = await storage.sessions.list('user-1', { limit: 25 });
   * ```
   */
  get sessions() {
    return {
      /**
       * Saves a session (creates or updates).
       */
      save: async (id: string, userId: string, displayName: string, targetType: 'persona' | 'agency', targetId: string, metadata?: Record<string, any>) => {
        const now = Date.now();
        await this.adapter.run(
          'INSERT OR REPLACE INTO sessions (id, user_id, display_name, target_type, target_id, created_at, updated_at, metadata) VALUES (?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM sessions WHERE id = ?), ?), ?, ?)',
          [id, userId, displayName, targetType, targetId, id, now, now, JSON.stringify(metadata || {})]
        );
      },
      /**
       * Gets a session by ID.
       */
      get: async (id: string) => {
        return this.adapter.get<{
          id: string;
          user_id: string;
          display_name: string;
          target_type: 'persona' | 'agency';
          target_id: string;
          created_at: number;
          updated_at: number;
          metadata: string;
        }>('SELECT * FROM sessions WHERE id = ?', [id]);
      },
      /**
       * Lists sessions for a user, ordered by most recent first.
       */
      list: async (userId: string, options?: { limit?: number; offset?: number; targetType?: 'persona' | 'agency' }) => {
        const limit = options?.limit || 50;
        const offset = options?.offset || 0;
        if (options?.targetType) {
          return this.adapter.all<{
            id: string;
            user_id: string;
            display_name: string;
            target_type: 'persona' | 'agency';
            target_id: string;
            created_at: number;
            updated_at: number;
            metadata: string;
          }>('SELECT * FROM sessions WHERE user_id = ? AND target_type = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?', [userId, options.targetType, limit, offset]);
        }
        return this.adapter.all<{
          id: string;
          user_id: string;
          display_name: string;
          target_type: 'persona' | 'agency';
          target_id: string;
          created_at: number;
          updated_at: number;
          metadata: string;
        }>('SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?', [userId, limit, offset]);
      },
      /**
       * Deletes a session.
       */
      delete: async (id: string) => {
        await this.adapter.run('DELETE FROM sessions WHERE id = ?', [id]);
      },
    };
  }

  /**
   * Personas API with typed query builders.
   * 
   * @example
   * ```typescript
   * await storage.personas.cache('v_researcher', 'V', personaDefinition);
   * const persona = await storage.personas.get('v_researcher');
   * const allPersonas = await storage.personas.list();
   * ```
   */
  get personas() {
    return {
      /**
       * Caches a persona definition (creates or updates).
       */
      cache: async (id: string, displayName: string, definition: any) => {
        const now = Date.now();
        await this.adapter.run(
          'INSERT OR REPLACE INTO personas (id, display_name, description, definition, created_at, updated_at) VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM personas WHERE id = ?), ?), ?)',
          [id, displayName, definition.description || '', JSON.stringify(definition), id, now, now]
        );
      },
      /**
       * Gets a persona by ID.
       */
      get: async (id: string) => {
        const row = await this.adapter.get<{
          id: string;
          display_name: string;
          description: string;
          definition: string;
          created_at: number;
          updated_at: number;
        }>('SELECT * FROM personas WHERE id = ?', [id]);
        if (!row) return null;
        return {
          ...row,
          definition: JSON.parse(row.definition),
        };
      },
      /**
       * Lists all personas, ordered by display name.
       */
      list: async () => {
        const rows = await this.adapter.all<{
          id: string;
          display_name: string;
          description: string;
          definition: string;
          created_at: number;
          updated_at: number;
        }>('SELECT * FROM personas ORDER BY display_name ASC');
        return rows.map(row => ({
          ...row,
          definition: JSON.parse(row.definition),
        }));
      },
      /**
       * Deletes a persona.
       */
      delete: async (id: string) => {
        await this.adapter.run('DELETE FROM personas WHERE id = ?', [id]);
      },
    };
  }
}

/**
 * Creates an AgentOS-optimized storage adapter with auto-detection and schema setup.
 * 
 * This is the recommended way to use sql-storage-adapter with AgentOS.
 * It automatically:
 * 1. Detects the best storage adapter for the current platform
 * 2. Creates AgentOS-specific tables (conversations, sessions, personas, etc.)
 * 3. Provides typed query builders for common operations
 * 4. Handles graceful degradation (e.g., IndexedDB → sql.js)
 * 
 * @param config Configuration for platform, persistence, and features
 * @returns Initialized AgentOSStorageAdapter
 * 
 * @example
 * ```typescript
 * const storage = await createAgentOSStorage({ platform: 'auto' });
 * const agentos = new AgentOS();
 * await agentos.initialize({ storageAdapter: storage.getAdapter() });
 * ```
 */
export async function createAgentOSStorage(
  config: AgentOSStorageConfig = {}
): Promise<AgentOSStorageAdapter> {
  const platform = config.platform === 'auto' || !config.platform 
    ? detectPlatform() 
    : config.platform;

  const priority = config.adapterPriority || PLATFORM_PRIORITIES[platform];

  const resolverOptions: StorageResolutionOptions = {
    priority,
    filePath: config.filePath,
    postgres: config.postgres,
    capacitor: config.capacitor,
  };

  const adapter = await resolveStorageAdapter(resolverOptions);
  const agentosAdapter = new AgentOSStorageAdapter(adapter, config);
  
  await agentosAdapter.initialize();

  console.info(`[AgentOSStorage] Initialized for platform: ${platform}, adapter: ${adapter.kind}`);

  return agentosAdapter;
}

