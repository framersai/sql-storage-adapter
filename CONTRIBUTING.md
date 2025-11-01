# Contributing to SQL Storage Adapter

Thank you for your interest in contributing to SQL Storage Adapter! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct: be respectful, inclusive, and constructive in all interactions.

## How to Contribute

### Reporting Issues

1. Check existing issues to avoid duplicates
2. Use issue templates when available
3. Provide clear reproduction steps
4. Include relevant environment information:
   - Node.js version
   - Operating system
   - Database versions
   - Package version

### Suggesting Features

1. Open a discussion first for major features
2. Explain the use case and benefits
3. Consider backward compatibility
4. Provide examples of how it would work

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Update documentation as needed
7. Commit with clear messages
8. Push to your fork
9. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/wearetheframers/sql-storage-adapter.git
cd sql-storage-adapter

# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm dev:test
```

### Testing with Different Adapters

```bash
# Test PostgreSQL adapter
DATABASE_URL=postgresql://user:pass@localhost/test pnpm test

# Test better-sqlite3
STORAGE_ADAPTER=better-sqlite3 pnpm test

# Test sql.js
STORAGE_ADAPTER=sqljs pnpm test
```

## Project Structure

```
sql-storage-adapter/
├── src/
│   ├── adapters/           # Adapter implementations
│   │   ├── betterSqliteAdapter.ts
│   │   ├── postgresAdapter.ts
│   │   ├── sqlJsAdapter.ts
│   │   └── capacitorSqliteAdapter.ts
│   ├── utils/              # Utility functions
│   ├── types.ts            # TypeScript definitions
│   ├── resolver.ts         # Adapter resolution logic
│   └── index.ts            # Main exports
├── tests/                  # Test files
├── docs/                   # Additional documentation
└── package.json
```

## Coding Standards

### TypeScript

- Use TypeScript for all source code
- Maintain strict type safety
- Document complex types
- Avoid `any` types

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Follow existing patterns in the codebase

### Documentation

- Document all public APIs with JSDoc
- Include examples in documentation
- Update README for user-facing changes
- Add inline comments for complex logic

### Testing

- Write tests for new features
- Maintain test coverage above 80%
- Test error conditions
- Test across different adapters

## Adding a New Adapter

1. Create adapter file in `src/adapters/`
2. Implement the `StorageAdapter` interface
3. Add capability flags appropriately
4. Update resolver.ts to include the adapter
5. Add tests for the adapter
6. Document pros/cons in README
7. Update TypeScript definitions if needed

Example adapter structure:

```typescript
export class MyAdapter implements StorageAdapter {
  public readonly kind = 'my-adapter';
  public readonly capabilities = new Set(['transactions', 'persistence']);

  public async open(options?: StorageOpenOptions): Promise<void> {
    // Implementation
  }

  // ... implement other required methods
}
```

## Commit Messages

Follow conventional commits format:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions or changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Maintenance tasks

Examples:
```
feat: add streaming support for PostgreSQL adapter
fix: handle connection timeout in resolver
docs: update README with Capacitor examples
```

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create a pull request
4. After merge, tag the release
5. Publish to NPM

## Getting Help

- Open an issue for bugs
- Start a discussion for questions
- Check existing documentation
- Review closed issues for solutions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Acknowledgments

Thank you to all contributors who help make this project better!