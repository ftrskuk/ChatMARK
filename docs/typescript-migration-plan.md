# ChatMARK TypeScript Migration Plan

## Status Summary

- **Current source mix**: almost entirely JavaScript
- **Existing TypeScript**: `types/chrome.d.ts` only
- **Current compiler posture**: `allowJs` + `checkJs` on a limited subset
- **Migration goal**: improve type safety without breaking runtime behavior, storage compatibility, or the current extension build pipeline

## Why This Plan Was Revised

This plan replaces the earlier draft after a deeper review of the repo, test setup, and Oracle feedback.

The previous version had four major problems:

1. It omitted important files, especially `src/rail.js` and `test/storage-key-stability.js`.
2. It delayed test-runner strategy until after file renames, even though current tests import source files by explicit `.js` path.
3. It treated `tsc` as part of the build emitter path even though this repo already uses `esbuild` effectively.
4. It used simplified sample types that do not match the actual storage and bookmark shapes in the codebase.

This revised plan fixes those issues and is the one to follow.

## Ground Rules

1. **Do not break storage compatibility.** Existing bookmark keys, normalization, and migration behavior are runtime-critical.
2. **Do not rename a tested source file to `.ts` until the corresponding test execution path is ready.** Current tests import source modules directly via `.js`.
3. **Use `esbuild` as the runtime build emitter.** Use `tsc --noEmit` for type checking.
4. **Prefer real domain types over aspirational interfaces.** Define types from actual normalized shapes in `bookmarks.js`, `ui-state.js`, `migration.js`, and storage helpers.
5. **Start strict on new `.ts` files, but expand coverage gradually.** Do not flip the whole repo at once.

## Recommended Migration Strategy

Use a **gradual, cluster-based migration** rather than renaming files in arbitrary order.

The main risk is not TypeScript syntax. The main risk is:

- breaking Node-based tests that import `.js` files directly
- mismatching persisted storage shapes
- underestimating heavy DOM modules
- introducing Chrome extension type conflicts

## Phase 0: Pre-Migration Decisions

Before renaming the first file, make these decisions explicitly:

### 1. Chrome typings source

Choose one approach:

- **Option A: keep local `types/chrome.d.ts` initially** and expand it only as needed
- **Option B: adopt `@types/chrome` later** and then remove or narrow the local declaration to avoid overlap

Do **not** blindly keep both full definitions active at once.

### 2. Test execution strategy

Choose one approach before the first `.js` → `.ts` rename for a tested module:

- **Safer default**: keep tests in JavaScript longer and point them at compiled `.js` output when source files begin moving to `.ts`
- **Alternative**: introduce a dedicated TS-aware test execution path before renaming tested source modules

### 3. Migration scope

Choose between:

- **Full migration**: convert all practical source modules to `.ts`
- **Hybrid migration**: convert shared/data/state modules to `.ts`, keep the heaviest DOM modules on `.js` with `@ts-check` and JSDoc for a while

If speed matters more than ideological purity, the hybrid option is the best value path.

## Phase 1: Tooling and Runtime Safety First

### Objectives

- make TypeScript coexist with the current build
- avoid breaking tests during the first renames
- prepare lint/format/typecheck scripts for mixed JS/TS operation

### Required changes

1. **Keep `esbuild` as the build emitter**
   - `build` and `build:all` should continue to emit browser-ready JavaScript through `esbuild`
   - `tsc` should be used for checking, not for primary bundling

2. **Revise `tsconfig.json` deliberately**
   - keep `allowJs: true`
   - keep `checkJs: true` only where noise stays manageable
   - prefer gradual include expansion instead of checking every JS file at once
   - enable `strict: true` once the config only targets migrated/clean files or carefully scoped mixed files
   - do **not** add `outDir` to the main config unless a separate compiled output path is intentionally introduced

3. **Fix script fragility in `package.json`**
   Current scripts manually enumerate files. That means each rename can silently break:
   - `lint`
   - `format`
   - `format:check`
   - `typecheck` coverage assumptions

   Update these commands as part of the migration so they follow the real file set.

4. **Decide test routing before renames**
   Current tests import modules like:
   - `../src/text.js`
   - `../src/storage.js`

   Once those sources become `.ts`, those imports will fail unless the test path is updated first.

### Deliverables

- revised `tsconfig.json`
- revised `package.json` scripts
- documented decision on Chrome typings
- documented decision on test execution during migration

## Phase 2: Define Real Domain Types Before Broad Renames

### Why this phase matters

Do not invent idealized interfaces first. The repo already encodes runtime and storage rules that TypeScript must reflect.

### Focus areas

1. **Bookmark and storage shapes**
   - derive from normalization and persistence logic in `src/bookmarks.js`
   - preserve real serialized field types
   - do not assume date-like fields are `Date` objects if storage uses strings or numbers

2. **UI state shapes**
   - derive from `src/ui-state.js` and related persistence behavior
   - account for pinned IDs, expanded IDs, interaction locks, popup layout state, and shard-backed UI state

3. **Chrome API contracts**
   - storage callback signatures
   - `runtime.lastError`
   - any messaging APIs used by bridge/content modules

4. **State store shapes**
   - `src/state.js` contains many nullable DOM refs and interaction fields
   - this needs real, explicit typing strategy before strict typing spreads outward

### Deliverables

- shared type definitions derived from actual runtime data
- a short note documenting which fields are serialized, nullable, legacy, or storage-critical

## Phase 3: Low-Risk Utility Cluster

Start with modules that are relatively isolated and already easy to reason about.

### Recommended order

1. `src/log.js`
2. `src/constants.js`
3. `src/text.js`
4. `src/storage.js`
5. `src/state.js`

### Why this order

- `log.js` and `constants.js` are cheap wins
- `text.js` and `storage.js` already have focused tests
- `state.js` is central, but small enough to type before the heavier modules that depend on it

### Important note

For `text.js` and `storage.js`, do **not** rename first and figure tests out later. Pair each conversion with the chosen test strategy immediately.

## Phase 4: Shared Behavior and Data-State Cluster

These modules shape the app’s persistent behavior and interaction state more than its rendering surface.

### Recommended order

1. `src/rail/icons.js`
2. `src/rail/ordering.js`
3. `src/rail/search-utils.js`
4. `src/bookmarks.js`
5. `src/ui-state.js`
6. `src/migration.js`
7. `src/history.js`

### Why this cluster comes early

- it solidifies the real bookmark and UI-state types
- it reduces ambiguity before touching the biggest DOM-heavy files
- it puts storage migration and normalization near the type source of truth

## Phase 5: Mid-Complexity DOM and Interaction Cluster

### Recommended order

1. `src/dom.js`
2. `src/scroll.js`
3. `src/selection.js`
4. `src/popup.js`

### Known complexity

- DOM APIs are nullable and verbose in strict mode
- event targets need explicit narrowing
- selection/range code often requires careful `Node` and `Element` guards

Budget extra time here. These files may look small but often generate a lot of type narrowing work.

## Phase 6: High-Complexity DOM and Messaging Cluster

### Recommended order

1. `src/capture.js`
2. `src/resolve.js`
3. `src/highlight.js`
4. `src/bridge.js`
5. `src/sandbox-card.js`

### Why this cluster is high risk

- heavy DOM traversal
- range/selection/highlight complexity
- cross-frame or bridge-style messaging
- many nullability and lifecycle edge cases

These modules will absorb more time than their file count suggests.

## Phase 7: Largest UI Surface

### Files

1. `src/rail.js`
2. `src/content.js`

### Why these are last

- `src/rail.js` is the largest file in the repo and the most obvious schedule risk
- `src/content.js` is the entry surface and should only be migrated after lower-level modules have stabilized

If `src/rail.js` becomes a migration wall, split or partially stabilize it before forcing a full strict rewrite.

## Phase 8: Test Strategy Completion

This phase finishes the test migration after source migration strategy is stable.

### Files in scope

- `test/text.test.js`
- `test/storage.test.js`
- `test/storage-key-stability.js`

### Guidance

1. Keep the storage-key stability test meaningful. It protects against data-access regressions.
2. If tests remain in JS for most of the migration, that is acceptable.
3. Only migrate tests to TS if the execution path is clear and low-friction.

Test conversion is optional for early value. Test reliability is not optional.

## Strict Mode Strategy

Use this approach:

- **Strict for new TypeScript files from the start**
- **Gradual expansion of coverage across the repo**
- avoid turning on broad strict checks for every legacy JS file at once

### Important clarification

Do not plan a separate final step to “enable `noImplicitAny`.” It is already included in `strict`.

The real work is:

- keeping the checked file set manageable
- fixing strict-null and callback typing issues incrementally
- refusing fake type safety through broad weak annotations

## Build Strategy

### Recommended approach

Use:

- `esbuild` for browser bundle output
- `tsc --noEmit` for type checking

### Why

- the extension already builds through `esbuild`
- the repo has a single primary content-script bundle path today
- adding `tsc` emit into the main build increases complexity without meaningful runtime benefit

### Build note

If a future test flow needs compiled output for Node-based execution, introduce that explicitly as a separate path. Do not overload the primary extension build for that purpose.

## Chrome Extension-Specific Considerations

1. **Storage is serialized data, not trusted typed state**
   - keep normalization and migration logic even after TS adoption

2. **Chrome type source must stay coherent**
   - if `@types/chrome` is adopted, reconcile it with `types/chrome.d.ts`

3. **DOM-heavy content script code will require many null guards**
   - this is expected, not a sign the migration is failing

4. **Messaging and bridge contracts deserve named types**
   - don’t leave bridge/content message payloads as anonymous object blobs

5. **Manifest JSON does not need to become TypeScript**
   - keep migration scope focused on the runtime code first

## File Inventory Checklist

### Source modules

- [ ] `src/log.js`
- [ ] `src/constants.js`
- [ ] `src/text.js`
- [ ] `src/storage.js`
- [ ] `src/state.js`
- [ ] `src/rail/icons.js`
- [ ] `src/rail/ordering.js`
- [ ] `src/rail/search-utils.js`
- [ ] `src/bookmarks.js`
- [ ] `src/ui-state.js`
- [ ] `src/migration.js`
- [ ] `src/history.js`
- [ ] `src/dom.js`
- [ ] `src/scroll.js`
- [ ] `src/selection.js`
- [ ] `src/popup.js`
- [ ] `src/capture.js`
- [ ] `src/resolve.js`
- [ ] `src/highlight.js`
- [ ] `src/bridge.js`
- [ ] `src/sandbox-card.js`
- [ ] `src/rail.js`
- [ ] `src/content.js`

### Tests and support

- [ ] `test/text.test.js`
- [ ] `test/storage.test.js`
- [ ] `test/storage-key-stability.js`
- [ ] `types/chrome.d.ts` strategy resolved
- [ ] `package.json` scripts updated for mixed JS/TS operation
- [ ] `tsconfig.json` updated for controlled strict expansion

## Verification Rules

After each migration step or cluster:

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run build:all`
5. manual extension smoke test in Chrome

### Smoke test checklist

- create bookmark
- edit bookmark
- delete bookmark
- search bookmarks
- reorder bookmarks
- verify scroll/jump behavior
- verify storage survives reload
- verify no regression in bookmark key stability assumptions

## Risks and Mitigations

| Risk                               | Why it matters                                      | Mitigation                                                                   |
| ---------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------- |
| Test breakage during first renames | current tests import `.js` source paths directly    | solve test routing in Phase 1 before renaming tested modules                 |
| Incorrect storage typing           | can silently misrepresent persisted data            | derive types from normalization and runtime behavior, not idealized examples |
| Chrome typing conflicts            | local declarations and package types can overlap    | choose one source of truth at a time                                         |
| Strict-mode noise explosion        | broad JS checking can swamp migration               | enable strict under controlled scope, not everywhere at once                 |
| Large-file stall on `src/rail.js`  | single file can dominate schedule                   | migrate it late, and split/refactor if needed before pushing further         |
| DOM nullability fatigue            | content-script code hits many nullable browser APIs | budget extra time and add helper guards where useful                         |

## Timeline Reality Check

### Revised estimate

- **Tooling and strategy setup**: 4-8 hours
- **Domain type design and early cluster migration**: 8-14 hours
- **Mid/high-complexity DOM modules**: 12-20 hours
- **`src/rail.js` + `src/content.js` stabilization**: 10-18 hours
- **test completion and cleanup**: 4-8 hours

**Total realistic estimate**: **40-60 hours**

The lower number is only realistic if the migration accepts weaker typing or stops early with a hybrid JS/TS approach.

## Lower-Risk Alternative

If the goal is “better type safety soon” rather than “every source file becomes `.ts` immediately,” use this approach:

1. migrate shared/data/state modules to TypeScript
2. keep the heaviest DOM modules in JavaScript for now
3. add `@ts-check` and JSDoc where high-value
4. defer `src/rail.js`, `src/capture.js`, `src/resolve.js`, `src/highlight.js`, and possibly `src/content.js`

This gets most of the practical benefit with less schedule risk.

## Definition of Done

The migration is done only when all of the following are true:

- runtime behavior matches the current extension behavior
- storage compatibility is preserved
- checked files pass TypeScript without suppressed errors
- lint, tests, and build all pass
- manual Chrome smoke testing passes
- the repo’s script/config surface no longer assumes a JS-only file list

---

_Created: 2026-04-03_
_Revised after Oracle review: 2026-04-03_
_Status: Ready for execution once migration scope and test strategy are confirmed_
