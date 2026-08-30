# Codex 26.5825.32147 Compatibility Specification

## ADDED Requirements

### Requirement: exact 5825 support is isolated

Local Groups MUST support `26.5825.32147` through a dedicated exact-build variant. Unknown 5825 builds, suffixed versions and future minors MUST be rejected before planning a feature patch, restoring a backup or writing a bundle.

#### Scenario: verified clean build patches atomically

- **Given** the verified official linux-x64 `26.5825.32147` extension
- **When** safe plan and apply run
- **Then** every semantic target is uniquely located and each physical file is written at most once
- **And** syntax, external verifier and a second zero-change plan pass

#### Scenario: unknown build has no side effects

- **Given** a 5825 version other than exact `26.5825.32147`, including a suffix
- **When** plan or apply runs
- **Then** the version is rejected before backup restoration or writing
- **And** file contents and mtimes remain unchanged

### Requirement: the complete upgrade matrix is release-blocking

The 5825 adaptation MUST validate startup, locator safety, project history, grouped rows, title dual consumption, new-conversation grouping, V1/V2 subagent consumers, Sol Max/Ultra, safe-host exclusions, rollback, idempotency, performance and live behavior. A route-ready log, matching thread IDs, marker text or one visible consumer MUST NOT substitute for the complete matrix.

#### Scenario: a known regression domain lacks evidence

- **Given** an applicable matrix row has no fixture, clean, live or deterministic-equivalent evidence
- **When** completion status is evaluated
- **Then** the adaptation remains pending
- **And** the user is not asked to discover omitted regressions one by one

#### Scenario: producer or consumer drifts behind a decoy

- **Given** a real producer or consumer is missing or moved
- **And** expected text remains only in a string, nested function, later function, duplicate producer or fake panel
- **When** engine and verifier run
- **Then** both reject the bundle

### Requirement: Local Groups behavior is preserved on 5825

The 5825 variant MUST preserve metadata operations, project grouping, title dual consumption, native row opening, project-history isolation, V1/V2 subagent transcript and composer chains, and Sol Max/Ultra without changing Codex thread titles or the user's Multi-Agent configuration.

#### Scenario: titles and groups remain usable

- **Given** a conversation has Local Groups metadata
- **When** the recent menu or opened conversation renders
- **Then** both title consumers resolve the same conversation ID and immediately refresh after metadata changes
- **And** setting a title, setting a group and starting a conversation in that group remain usable

#### Scenario: subagent consumers remain distinct

- **Given** subagent activity exists under the user's current feature configuration
- **When** transcript and composer membership are derived
- **Then** both native consumption chains remain structurally intact
- **And** Local Groups does not switch V1/V2 or patch `canInteract`

#### Scenario: Sol efforts remain model-scoped

- **Given** `gpt-5.6-sol` is selected
- **When** supported efforts, the Reasoning menu, persisted configuration and model validation run
- **Then** Max and Ultra remain available and round-trip correctly
- **And** other models are unchanged

### Requirement: temporary artifacts are reclaimed by ownership

Every test and upgrade-validation run MUST register all files and directories it creates and remove them from a guaranteed finalization path on success, assertion failure, thrown error and no matched tests. Cleanup failure MUST fail the run. Only paths owned by the current run may be deleted.

#### Scenario: tests finish or fail

- **Given** a test run creates directories through `tempDir()` or direct temporary APIs
- **When** the run succeeds, fails, throws or matches no tests
- **Then** all paths registered by that run are removed
- **And** a cleanup failure produces a failing exit code

#### Scenario: unrelated temporary content exists

- **Given** pre-existing or unrelated files exist under the same system temporary root
- **When** cleanup runs
- **Then** those paths remain untouched

#### Scenario: upgrade validation creates non-test artifacts

- **Given** the workflow creates official, patched, rollback, VSIX, npm-cache, review, probe, log or helper artifacts
- **When** finalization runs
- **Then** every owned artifact type is removed and a recursive ownership scan finds no residue

