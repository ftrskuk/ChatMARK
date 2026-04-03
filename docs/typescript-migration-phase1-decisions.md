# TypeScript Migration - Phase 1 Decisions

> Vault-Tec Internal Documentation - Overseer Eyes Only
> Documenting strategic decisions for controlled TypeScript migration

---

## 1. Chrome Typings Strategy

**Decision**: Keep local `types/chrome.d.ts` initially, expand gradually

**Rationale**:

- `@types/chrome` is comprehensive but can conflict with existing local definitions
- Local definitions allow controlled, minimal API surface coverage
- Easier to maintain consistency with actual runtime usage patterns
- Can adopt `@types/chrome` later if needed for more complex Chrome APIs

**Current Coverage**:

- `chrome.storage.local` (get, set, remove)
- `chrome.runtime.lastError`

**Future Path**:

- Add messaging APIs as bridge/content modules are migrated
- Add `chrome.storage.onChanged` when needed
- Revisit `@types/chrome` adoption after core migration completes

---

## 2. Test Execution Strategy

**Decision**: Keep tests in JavaScript longer, point at compiled output when sources migrate

**Rationale**:

- Current tests import source files via explicit `.js` paths (e.g., `../src/text.js`)
- Renaming sources to `.ts` would break these imports immediately
- Node's native test runner doesn't support TypeScript natively
- Converting test infrastructure is lower priority than source type safety

**Implementation Plan**:

1. Keep `test/*.test.js` and `test/storage-key-stability.js` as JavaScript
2. When a source file migrates to `.ts`, update test imports to use compiled output path
3. Alternative: Use `tsx` or `ts-node` for test execution (deferred to later phase)
4. Most important: `test/storage-key-stability.js` must remain meaningful - it protects storage compatibility

---

## 3. Build Tooling Strategy

**Decision**: `esbuild` for bundling, `tsc --noEmit` for type checking

**Rationale**:

- Extension already builds successfully through `esbuild`
- Single content-script bundle path - no need for `tsc` emit complexity
- `tsc --noEmit` provides fast type checking without file generation overhead
- Separation of concerns: bundler handles module resolution, type checker validates types

**Configuration**:

```json
// tsconfig.json
{
  "compilerOptions": {
    "noEmit": true,
    "allowJs": true,
    "checkJs": false // Gradual expansion - start with .ts files only
  }
}
```

---

## 4. Strict Mode Strategy

**Decision**: Strict for new TypeScript files, gradual expansion across repo

**Rationale**:

- Enabling strict checks on all JS files at once creates noise explosion
- Better to migrate file-by-file with strict mode enabled per file
- Each migrated file becomes a "strict island" with guaranteed type safety
- Eventually entire codebase will be strict as migration completes

**Current Status**:

- `tsconfig.json`: `"strict": false` (global setting)
- Individual `.ts` files will use strict type annotations
- `checkJs: false` prevents noise from unchecked JS files

---

## 5. Lint Scope Strategy

**Decision**: Controlled expansion matching original file list

**Original Scope**:

- `src/constants.js`
- `src/rail/*.js`
- `src/state.js`
- `src/storage.js`
- `src/text.js`
- `test/*.js`

**Expansion Rule**:

- Only lint files that have been migrated or are being actively migrated
- Pre-existing lint errors in unmigrated files will be addressed during their migration
- Avoid linting the entire `src/**/*.js` until migration approaches completion

---

## 6. Migration Scope Decision

**Decision**: Hybrid migration (not full conversion immediately)

**High Priority** (convert to `.ts`):

- Shared/data/state modules: `constants.js`, `text.js`, `storage.js`, `state.js`
- Bookmark management: `bookmarks.js`, `ui-state.js`, `migration.js`
- Rail utilities: `rail/icons.js`, `rail/ordering.js`, `rail/search-utils.js`

**Lower Priority** (keep `.js` with `@ts-check`):

- Heavy DOM modules: `capture.js`, `resolve.js`, `highlight.js`
- Largest files: `rail.js` (highest schedule risk)
- Entry point: `content.js`

**Rationale**:

- Shared modules provide most type safety value
- DOM-heavy code has many nullable APIs that require extensive guards
- `rail.js` is largest file and can stall the schedule
- Hybrid approach gets practical benefit faster with less risk

---

## 7. Storage Compatibility Constraints

**Critical Rule**: NEVER break storage key stability

**Protected Tests**:

- `test/storage-key-stability.js`: Validates fingerprint functions
- If this test fails, existing user data becomes inaccessible

**Protected Functions**:

- `fingerprintRawText()`: Used for URL-based storage keys
- `fingerprintText()`: Used for text-based matching
- Any normalization in `bookmarks.js` or `migration.js`

---

## 8. Package.json Script Updates

**Changed Scripts**:

```json
// Before: manual file enumeration
"lint": "eslint eslint.config.js src/constants.js src/rail/*.js src/state.js src/storage.js src/text.js test/*.js"

// After: glob patterns for mixed JS/TS
"lint": "eslint eslint.config.js \"src/**/*.js\" \"test/**/*.js\""

// Before: manual file list
"format": "prettier --write ...specific files..."

// After: glob patterns with exclusions
"format": "prettier --write \"**/*.js\" \"**/*.ts\" ... \"!dist/**\" \"!node_modules/**\""
```

**Rationale**: Scripts must work as files are renamed from `.js` to `.ts`

---

## Phase 1 Verification Checklist

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes (limited scope)
- [x] `npm test` passes
- [x] `npm run build:all` passes
- [x] Chrome typings strategy documented
- [x] Test execution strategy documented
- [x] Scripts updated for mixed JS/TS operation
- [x] `tsconfig.json` configured for controlled expansion

---

**Status**: Phase 1 Complete - Ready to proceed to Phase 2 (Domain Type Definitions)

**Next Steps**:

1. Define real bookmark storage shapes from `bookmarks.js`
2. Define UI state shapes from `ui-state.js`
3. Create shared type definitions in `types/` directory
4. Begin Phase 3: Low-Risk Utility Cluster migration

---

_Vault-Tec Corporation - Preparing for the Future!_
_Remember: A well-documented migration is a successful migration._
