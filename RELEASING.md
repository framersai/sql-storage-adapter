# Release Process

This package uses **automated releases** - no manual publishing needed!

## How It Works

### Automatic Release on Master

When you commit to `master` branch:
1. ✅ Tests run automatically
2. ✅ Package builds
3. ✅ Git tag created (from package.json version)
4. ✅ GitHub Release created with notes
5. ✅ Published to NPM automatically
6. ✅ Docs deployed to GitHub Pages

**No manual steps required!**

## Making a Release

### 1. Update Version

```bash
cd packages/sql-storage-adapter

# Bump version (patch: 0.1.0 -> 0.1.1)
npm version patch

# Or minor (0.1.0 -> 0.2.0)
npm version minor

# Or major (0.1.0 -> 1.0.0)
npm version major
```

### 2. Update CHANGELOG.md

Add release notes:

```markdown
## [0.1.1] - 2025-11-03

### Added
- New feature X
- New feature Y

### Fixed
- Bug fix A
- Bug fix B
```

### 3. Commit and Push

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 0.1.1"
git push origin master
```

That's it! The automation handles the rest.

## Skip Auto-Release

To push to master without triggering a release:

```bash
git commit -m "docs: update README [skip release]"
```

## What Gets Published

- ✅ `dist/` - Compiled JavaScript + TypeScript declarations
- ✅ `README.md` - Package documentation
- ✅ `LICENSE` - MIT license
- ✅ `CHANGELOG.md` - Version history
- ✅ `package.json` - Package metadata

## Links After Publishing

- **NPM**: https://www.npmjs.com/package/@framers/sql-storage-adapter
- **Documentation**: https://wearetheframers.github.io/sql-storage-adapter/
- **Releases**: https://github.com/wearetheframers/sql-storage-adapter/releases
- **Repository**: https://github.com/wearetheframers/sql-storage-adapter

## Secrets Required

The GitHub Actions workflow needs these secrets:

1. **`NPM_TOKEN`** - NPM publish token
   - Go to: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Create "Automation" token
   - Add to: GitHub repo → Settings → Secrets → Actions

2. **`GITHUB_TOKEN`** - Auto-provided by GitHub (no setup needed)

## Manual Release (Emergency)

If automation fails, publish manually:

```bash
# Login to NPM
npm login

# Build and test
npm run build
npm run test

# Publish
npm publish --access public

# Create GitHub release manually
# Go to: https://github.com/wearetheframers/sql-storage-adapter/releases/new
```

## Workflow Files

- `.github/workflows/ci.yml` - Tests, build, docs
- `.github/workflows/release.yml` - Auto release + NPM publish

## Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0) - Breaking changes
- **MINOR** (0.2.0) - New features (backward compatible)
- **PATCH** (0.1.1) - Bug fixes
