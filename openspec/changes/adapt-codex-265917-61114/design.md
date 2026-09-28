# Design: Codex 26.5917.61114

## Constraints

- Unknown 5917 builds, suffixed versions and future minors fail closed before restore or write.
- Official clean bundle topology must be recorded before implementation; this release has separate UI/title, power/core and server/history app-initial bundles.
- Existing title/group bridge, project-root filtering, state-db pagination, Max/Ultra and watchdog contracts remain unchanged.
- Tests and upgrade extraction must clean task-owned temporary artifacts; live restore backups remain for recovery.

## Verification

- Required: locator uniqueness, exact/suffix zero writes, five/six bundle atomic plan/apply, syntax, external verifier, idempotency, title/group runtime, history pagination, power consumer, watchdog, compile/lint/full tests and strict OpenSpec.
