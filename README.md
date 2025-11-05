# SQL Storage Adapter

<p align="center">
  <a href="https://frame.dev" target="_blank" rel="noopener">
    <img src="./logos/frame-wordmark.svg" alt="Frame.dev" width="280">
  </a>
</p>

[![npm version](https://img.shields.io/npm/v/@framers/sql-storage-adapter.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@framers/sql-storage-adapter)
[![CI](https://github.com/framersai/sql-storage-adapter/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/framersai/sql-storage-adapter/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/framersai/sql-storage-adapter/branch/master/graph/badge.svg)](https://codecov.io/gh/framersai/sql-storage-adapter)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/npm/l/@framers/sql-storage-adapter.svg)](./LICENSE)

> Cross-platform SQL access for Node.js, web, and native runtimes with automatic adapter selection and consistent APIs.

The SQL Storage Adapter provides a single, ergonomic interface over SQLite (native and WASM), PostgreSQL, Capacitor, and in-memory stores. It handles adapter discovery, capability detection, and advanced features like cloud backups so you can focus on your application logic.

---

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Adapter Matrix](#adapter-matrix)
- [Configuration & Resolution](#configuration--resolution)
- [CI, Releases, and Badges](#ci-releases-and-badges)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Auto-detected adapters** – `createDatabase()` inspects environment signals and picks the best backend (native SQLite, PostgreSQL, Capacitor, sql.js, memory, etc.).
- **Capability-aware API** – consistent CRUD, transactions, batching, and event hooks across adapters with runtime capability introspection.
- **Cloud backups & migrations** – built-in backup manager with compression, retention policies, and restore helpers plus migration utilities.
- **Portable packaging** – optional native dependencies; falls back to pure TypeScript/WASM adapters when native modules are unavailable.
- **CI-first design** – Vitest coverage, Codecov integration, and GitHub Actions workflows for linting, testing, releasing, and npm publish/tag automation.

## Installation

```bash
# Core package
npm install @framers/sql-storage-adapter

# Install only the adapters you plan to use
npm install better-sqlite3            # Native SQLite for Node/Electron
npm install pg                        # PostgreSQL
npm install @capacitor-community/sqlite  # Capacitor / mobile
# sql.js ships with the package (no extra install)
```

> Windows users: ensure the Visual Studio Build Tools (C++ workload) are installed before adding `better-sqlite3`. On Linux, install `python3`, `build-essential`, and `libssl-dev` prior to `npm install`.

## Quick Start

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

async function main() {
  // Automatically selects the best adapter for the current runtime
  const db = await createDatabase();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY,
      task TEXT NOT NULL,
      done INTEGER DEFAULT 0
    )
  `);

  await db.run('INSERT INTO todos (task) VALUES (?)', ['Ship cross-platform builds']);
  const items = await db.all<{ id: number; task: string; done: number }>('SELECT * FROM todos');
  console.log(items);

  await db.close();
}

main().catch((error) => {
  console.error('Database bootstrap failed', error);
  process.exit(1);
});
```

## Adapter Matrix

| Adapter | Package | Ideal for | Pros | Considerations |
| --- | --- | --- | --- | --- |
| `better-sqlite3` | `better-sqlite3` | Node/Electron, CLI, CI | Native performance, transactional semantics, WAL support | Needs native toolchain; version must match Node ABI |
| `postgres` | `pg` | Hosted or on-prem PostgreSQL | Connection pooling, rich SQL features, cloud friendly | Requires `DATABASE_URL`/credentials |
| `sqljs` | bundled | Browsers, serverless edge, native fallback | Pure WASM, no native deps | Write performance limited vs native, optional persistence |
| `capacitor` | `@capacitor-community/sqlite` | Mobile (iOS/Android, Capacitor) | Native SQLite on mobile | Requires Capacitor runtime |
| `memory` | built-in | Unit tests, storybooks, constrained sandboxes | Zero dependencies, instant startup | Non-durable, single-process only |

## Configuration & Resolution

- `resolveStorageAdapter` inspects:
  - explicit options (`priority`, `type`, adapter configs),
  - environment variables (`STORAGE_ADAPTER`, `DATABASE_URL`),
  - runtime hints (Capacitor detection, browser globals).
- Adapters are attempted in priority order until one opens successfully; a `StorageResolutionError` includes the full failure chain.
- Provide `priority: ['memory', 'sqljs']` for browser bundles or tests where native modules shouldn’t load.
- Use `createCloudBackupManager` for S3-compatible backups with gzip compression and retention limits.

## CI, Releases, and Badges

- GitHub Actions workflows:
  - `ci.yml` runs lint, tests, and coverage on every branch.
  - `release.yml` publishes new versions to npm, tags the commit (`vX.Y.Z`), and creates/updates the GitHub Release when `CHANGELOG.md` and `package.json` bump the version.
- Check badge health whenever builds fail:
  - CI badge should be green for `master`.
  - Codecov badge updates after coverage reports upload.
  - npm badge reflects the latest published version.
- Manual verification commands:
  ```bash
  npm info @framers/sql-storage-adapter version
  pnpm --filter sql-storage-adapter test
  pnpm --filter sql-storage-adapter build
  ```
- See [RELEASING.md](./RELEASING.md) for the automated release flow, required secrets (`NPM_TOKEN`), and manual fallback steps.

## Troubleshooting

- **`better-sqlite3` cannot be required** – install native build tools before `npm install`, ensure Node version matches prebuilt binaries, or fall back to sql.js by setting `STORAGE_ADAPTER=sqljs`.
- **Adapter resolution picks the wrong backend** – set `priority` or `STORAGE_ADAPTER` explicitly; register new adapters in `src/core/resolver.ts`.
- **Cloud backup tests lock the database** – call `await db.close()` in test teardown; use the in-memory/sql.js fallback on runners without native SQLite.
- **GitHub release missing** – confirm `release.yml` succeeded, `NPM_TOKEN` is configured, and the version bump is committed. Rerun the workflow if needed.
- **Missing lock file in subtree mirror** – keep `pnpm-lock.yaml` committed so CI caches dependencies correctly when this package is mirrored out of a monorepo.

## Contributing

- Read [CONTRIBUTING.md](./CONTRIBUTING.md) for coding standards, lint/test commands, and pull request guidelines.
- Architecture notes live in [ARCHITECTURE.md](./ARCHITECTURE.md); API docs can be regenerated with `pnpm --filter sql-storage-adapter run docs`.

## License

[MIT](./LICENSE)

---

<p align="center">
  Built and maintained by <a href="https://frame.dev" target="_blank" rel="noopener">Frame.dev</a>
</p>
