# CLAUDE.md — @makfly/beacon-protocol

Rules for working in this repo. Read before any change that ships.

## What this is

The shared wire-protocol contract (TS types + constants) consumed by every Beacon SDK.
**No runtime deps, no I/O.** Published to **npmjs** (public) as `@makfly/beacon-protocol`.

## Versioning (SemVer — strict)

The version lives in `package.json` `"version"`. A git tag `vX.Y.Z` **must** match it.

- **PATCH** (`0.1.0 → 0.1.1`): doc/typo/internal, no contract change.
- **MINOR** (`0.1.0 → 0.2.0`): additive only (new optional field, new constant). Backward-compatible.
- **MAJOR** (`0.1.0 → 1.0.0`): any breaking change to a type/constant/key.
  ⚠️ A MAJOR here breaks `@makfly/beacon-sdk-js` and `makfly/beacon-sdk-php` — bump + republish them too.

## Release workflow

```bash
# 1. bump "version" in package.json (SemVer)
# 2. commit
git add -A && git commit -m "release: vX.Y.Z"
# 3. tag — MUST equal package.json version
git tag vX.Y.Z
# 4. push commit + tag
git push origin main && git push origin vX.Y.Z
# 5. build + publish to npmjs (needs `npm login` / automation token, 2FA)
bun run build && bun publish
```

## Hard rules

- **Tags are immutable.** Never `git tag -f` / delete-and-recreate a tag that was published.
  A bad release → ship the next PATCH, never rewrite history.
- Tag `vX.Y.Z` **always** equals `package.json` `version`. No drift.
- `files: ["dist"]` → only `dist/` is published. **Always `bun run build` before `bun publish`.**
- This repo is a **git submodule** of a private telemetry monorepo.
  After releasing, bump the submodule pointer in that parent.
- Search/code with `ig`, never `grep`/`rg`. Use `bun`, never `npm`/`npx`/`pnpm`/`yarn`
  (except `npm login` for the npmjs auth, which bun delegates to).
