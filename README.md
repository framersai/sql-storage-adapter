# SQL Storage Adapter

A modular persistence layer for AgentOS that exposes a consistent database interface across multiple storage backends. It allows services, CLIs, and tests to share the same CRUD and transaction APIs while targeting SQLite (via `better-sqlite3`), Postgres, in-memory mocks, and cloud-hosted providers.

## Overview

- **Purpose**: Offer a unified abstraction so AgentOS components can swap storage backends without code changes.
- **Core abstractions**: `src/core` contains the `Database`, `StorageAdapter`, and `AdapterResolver` contracts that power higher-level helpers such as `createDatabase()`.
- **Concrete adapters**: `src/adapters/**` implements backends. Each adapter handles `open`/`close`, CRUD helpers, transactions, and optional capabilities (e.g., cloud backup or multi-tenant snapshots).
- **Resolution flow**: `resolveStorageAdapter` inspects runtime configuration (environment variables, explicit options, test hints) and tries adapters in priority order. If none succeed, it throws `StorageResolutionError`. Test utilities typically call `createDatabase()`, which delegates to the resolver.

### Common adapter types

| Adapter | Description | Typical usage |
| --- | --- | --- |
| `BetterSqliteAdapter` | File-backed SQLite using `better-sqlite3`; fast transactions, native module dependency. | CLI runs, developer machines, CI when native deps are available. |
| `MemoryAdapter` | Pure TypeScript fallback with limited durability. | Unit tests, environments where native modules cannot compile. |
| Cloud adapters | Wrap hosted SQLite/Postgres vendors, using secrets for auth. | Production deployments, remote snapshots, multi-region data. |

## Common Pain Points

### Native dependency (`better-sqlite3`)

`better-sqlite3` requires native build tooling when prebuilt binaries are unavailable.

- Install prerequisites first: Python 3.7+, `make`, `g++`, `libssl-dev` (or system equivalents).
- GitHub Actions runners frequently fail if Node.js versions mismatch (module compiled for Node 18 but runtime is Node 20+).
- Installing with `pnpm install --no-optional` skips the dependency, causing the resolver to fail when it tries to `require('better-sqlite3')`.
- Recommended mitigations:
  - Ensure the job installs build tools before `pnpm install`.
  - Pin Node.js to a version with prebuilt binaries when possible.
  - Keep `better-sqlite3` in `dependencies`, not `optionalDependencies`.
  - Run `pnpm rebuild better-sqlite3` when upgrading Node.js.

### Adapter resolution misconfiguration

- If no environment flag is set, the resolver may default to `better-sqlite3` even in browser builds. Explicitly set `STORAGE_ADAPTER=memory` (or another valid value) for CI or bundlers.
- New adapters must be registered in `resolver.ts`; missing registrations surface as runtime errors during resolution.

### Cloud backup tests

- `tests/cloudBackup.spec.ts` opens real database handles. Without `better-sqlite3`, the suite fails. Skip or parameterise the spec when running adapters that cannot support the scenario.
- Ensure tests close connections to avoid locked database errors in subsequent runs.

### Subtree mirrors and repo splits

The package is sometimes mirrored out of the monorepo via `git subtree`.

- Rewrites or mirror script runs (`mirror-subtrees.sh`) can desynchronise lock files and workflows.
- Keep `pnpm-lock.yaml` checked in so GitHub Actions caching works. Without it, setup steps abort because the lock file is missing.

### Version pinning and hoisting

- `better-sqlite3` ABI changes frequently. Build locally with Node 18 but deploy with Node 20 and the adapter may break.
- Align Node.js versions across development, CI, and production.
- When hoisting with pnpm or during subtree splits, verify `package.json` inside the adapter lists all required dependencies explicitly.

## Recommended Practices

### CI setup

- Before `pnpm install`, run `sudo apt-get update && sudo apt-get install -y build-essential python3` (or the platform-appropriate equivalent).
- Pin Node.js via `actions/setup-node` to match local development (commonly Node 20.x).
- Use `pnpm install --frozen-lockfile` and ensure the lock file lives alongside the package.
- Add a sanity check after install: `node -e "require('better-sqlite3')"` so native load issues fail fast.
- For lightweight lint or unit runs where native modules are unnecessary, set `STORAGE_ADAPTER=memory` in the job environment and reserve full adapter coverage for dedicated workflows.

### Testing strategy

- Parameterise tests to run against both `memory` and `better-sqlite3` adapters to catch backend-specific regressions while keeping unit runs fast.
- Provide helpers like `createTestDatabase(adapterName = 'memory')` so suites can override adapters centrally.
- In Vitest/Jest setup, catch resolution failures and fall back to memory for non-critical suites, logging the reason to aid diagnostics.

### Module usage

- Consumers should rely on high-level factories (`createDatabase`, `openStorage`) and pass configuration (file paths, credentials) via options or environment variables.
- Only instantiate adapters directly for advanced tuning.
- When distributing the adapter standalone, expose relevant types (`AdapterOptions`, `ResolvedDatabase`) and document required environment variables.

### Documentation

- Keep this README aligned with adapter capabilities, installation requirements, and troubleshooting tips.
- Document platform-specific caveats (e.g., Windows requires Visual Studio Build Tools for `better-sqlite3`).
- Highlight common error messages (such as "module 'better-sqlite3' was not found") and the corresponding fixes.

### Release engineering

- When splitting the monorepo, include `pnpm-lock.yaml` or `package-lock.json` in the exported repository to satisfy CI.
- After rewriting history, re-run `mirror-subtrees.sh --push` and verify the standalone adapter CI before tagging a release.

## Getting Started

```bash
# Install dependencies within the monorepo root
pnpm install

# Build the SQL storage adapter package
pnpm --filter sql-storage-adapter build

# Run tests (defaults to memory adapter unless overridden)
STORAGE_ADAPTER=memory pnpm --filter sql-storage-adapter test
```

Sample usage from an AgentOS service:

```typescript
import { createDatabase } from '@agentos/sql-storage-adapter';

async function bootstrap() {
  const db = await createDatabase({
    priority: ['better-sqlite3', 'memory'],
    filePath: './agentos.sqlite'
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(
    'INSERT INTO conversations (id, payload) VALUES (?, ?)',
    ['conv-1', JSON.stringify({ message: 'hello world' })]
  );

  const row = await db.get('SELECT payload FROM conversations WHERE id = ?', ['conv-1']);
  console.log(row?.payload);

  await db.close();
}

bootstrap().catch((err) => {
  console.error('Database bootstrap failed', err);
  process.exit(1);
});
```

## Troubleshooting Checklist

- [ ] `better-sqlite3` loads successfully (run the sanity script).
- [ ] `STORAGE_ADAPTER` is set for CI/browser builds when native modules are unavailable.
- [ ] Tests clean up database handles, especially for cloud backup specs.
- [ ] Lock files are committed alongside subtree mirrors.
- [ ] Node.js version matches the compiled adapter binaries across environments.

## Additional Resources

- `backend/README.md` for end-to-end service integration notes.
- `docs/AGENTOS_SERVER_API.md` for API-level expectations when swapping adapters.
- `scripts/mirror-subtrees.sh` for guidance on mirroring packages out of the monorepo.
