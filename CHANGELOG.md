# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2] - 2025-11-07

### Changed
- **Documentation clarifications**: Updated all docs to clarify that IndexedDB adapter is sql.js + IndexedDB persistence wrapper (not a separate SQL engine)
- **Capability updates**: Added `json` and `prepared` capabilities to IndexedDB and sql.js adapters
  - Both adapters now correctly declare JSON support (via SQLite JSON1 extension)
  - Prepared statements capability added for both adapters
- **README updates**: Clarified IndexedDB adapter relationship with sql.js throughout documentation

### Documentation
- Updated README.md adapter matrix to clarify IndexedDB is sql.js wrapper
- Updated PLATFORM_STRATEGY.md with detailed explanation of IndexedDB + sql.js architecture
- Updated ARCHITECTURE.md to note IndexedDB adapter is not a separate SQL engine
- Added notes about JSON support via SQLite JSON1 extension for IndexedDB/sql.js adapters

## [0.3.0] - 2025-11-06

### Added
- **IndexedDB Adapter** (`IndexedDbAdapter`) - sql.js + IndexedDB persistence wrapper for browser-native SQL storage
  - **Note**: This adapter uses sql.js (WASM SQLite) for all SQL execution and IndexedDB only for storing the database file as a binary blob
  - Automatic persistence to IndexedDB with configurable auto-save intervals
  - Full SQL support via sql.js (SQLite compiled to WebAssembly)
  - Export/import functionality for data portability
  - Optimized for Progressive Web Apps (PWAs) and offline-first workflows
  - Privacy-first: data never leaves the browser
- **AgentOS Integration Layer** (`createAgentOSStorage`, `AgentOSStorageAdapter`)
  - Pre-configured schema for AgentOS entities (conversations, sessions, personas, telemetry)
  - Auto-detection of platform (web, electron, capacitor, node, cloud)
  - Typed query builders for common AgentOS operations
  - Graceful degradation across platforms
  - Export available via `@framers/sql-storage-adapter/agentos`
- **Enhanced Graceful Degradation**
  - IndexedDB added to resolver priority chain for browser environments
  - Automatic fallback: IndexedDB → sql.js → memory for web
  - Improved platform detection for Electron, Capacitor, and Node.js
- **Platform Strategy Documentation**
  - New `PLATFORM_STRATEGY.md` with comprehensive pros/cons analysis
  - Updated `docs/media/ARCHITECTURE.md` with IndexedDB adapter details
  - Client-side storage guide for AgentOS deployments

### Changed
- Resolver now prioritizes `indexeddb` for browser environments
- `AdapterKind` type now includes `'indexeddb'` option
- Improved adapter selection logic with better fallback chains

### Documentation
- Added IndexedDB adapter to README adapter matrix
- Comprehensive TSDoc comments for IndexedDB adapter
- Platform strategy guide with detailed comparison tables
- AgentOS integration examples and best practices

## [0.2.0] - 2025-11-04

### Added
- Barrel export available via `@framers/sql-storage-adapter/types` so bundlers can import the public type surface without reaching into `dist/`.

### Changed
- Hardened adapter modules (PostgreSQL, better-sqlite3, Capacitor, SQL.js) to avoid top-level side effects and provide clearer runtime errors when optional dependencies are missing.
- Normalised `lastInsertRowid` values returned by PostgreSQL, better-sqlite3, and SQL.js adapters so they are always plain numbers or strings.
- Improved `createDatabase` automatic adapter resolution for Node.js, browser, and Deno environments with clearer fallbacks.
- Restructured the source tree into `core/`, `adapters/`, `features/`, and `shared/` folders so contributors can navigate contracts, runtime APIs, and higher-level utilities independently.

### Fixed
- Sanitised Sync Manager merge inputs and conflict handling so records lacking IDs or timestamps no longer crash synchronisation.
- Tightened Supabase adapter caching/stream typings and connection pool metrics reporting to prevent `unknown` leak-through at runtime.
- Updated offline sync example merge helper to defensively parse profile data before combining settings.
- Migration tests now fall back to the `sql.js` adapter when `better-sqlite3` is unavailable, keeping CI and contributors unblocked.

## [0.1.0] - 2025-11-01

### Added
- Initial release of SQL Storage Adapter
- Support for multiple SQL backends:
  - PostgreSQL (via `pg`)
  - Better-SQLite3 (native SQLite)
  - SQL.js (WebAssembly SQLite)
  - Capacitor SQLite (mobile)
- Automatic runtime detection and adapter selection
- Graceful fallback mechanisms
- Full TypeScript support with comprehensive type definitions
- Transaction support across all adapters
- Prepared statement support (where available)
- Batch operations for bulk inserts
- Connection pooling for PostgreSQL
- Comprehensive documentation with pros/cons for each adapter
- Extensive error handling and recovery mechanisms

### Features
- **Automatic Adapter Resolution**: Intelligently selects the best available adapter
- **Cross-Platform**: Works in Node.js, browsers, Electron, and mobile apps
- **Type Safety**: Full TypeScript support with detailed interfaces
- **Performance**: Optimized for each platform with adapter-specific enhancements
- **Security**: SQL injection prevention through parameterized queries
- **Flexibility**: Support for both named and positional parameters

### Supported Capabilities by Adapter
- **PostgreSQL**: transactions, locks, persistence, concurrent, json, arrays, prepared
- **Better-SQLite3**: sync, transactions, wal, locks, persistence, prepared, batch
- **SQL.js**: transactions, persistence (Node.js only)
- **Capacitor**: transactions, wal, persistence

### Documentation
- Comprehensive README with usage examples
- Detailed pros/cons for each adapter
- Migration guides from raw database drivers
- Troubleshooting section
- Performance considerations

### Security
- SQL injection prevention through parameterized queries
- Connection security guidelines
- Secure default configurations

---

For more information, see the [README](README.md) or visit our [GitHub repository](https://github.com/framersai/sql-storage-adapter).
