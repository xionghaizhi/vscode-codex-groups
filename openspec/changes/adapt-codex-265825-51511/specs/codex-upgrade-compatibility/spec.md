# Codex 26.5825.51511 Compatibility Specification

## ADDED Requirements

### Requirement: exact 51511 support is isolated

Local Groups MUST support `26.5825.51511` through a dedicated exact-build variant while retaining `26.5825.32147`. Unknown 5825 builds, suffixed versions and future minors MUST be rejected before backup restoration or bundle writes.

#### Scenario: verified official build patches atomically

- **Given** the verified official linux-x64 `26.5825.51511` extension
- **When** safe plan and apply run
- **Then** the Host, Header, Main/Power/Subagent and Server/History targets are uniquely located
- **And** syntax, external verification and a second zero-change plan pass

#### Scenario: unknown build has no side effects

- **Given** an unverified 5825 build or a suffixed 5825 version
- **When** plan or apply runs
- **Then** the version is rejected before restoration or writing
- **And** file contents and mtimes remain unchanged

### Requirement: every affected 51511 behavior is release-blocking

The adaptation MUST validate the public recent-menu wrapper, title dual consumption, title/group/new-in-group actions, project-history isolation and non-empty mapping, transcript and composer subagent displays, Sol Max/Ultra validation/menu/persistence, startup and configuration immutability. Marker text, route readiness or one visible consumer MUST NOT substitute for these checks.

#### Scenario: the recent menu is exercised

- **Given** patched `26.5825.51511` Header code and grouped conversation metadata
- **When** the public `codexLocalGroupsProjectRowsView` wrapper executes
- **Then** grouped rows render with the local title
- **And** title, group and new-in-group entry points remain callable

#### Scenario: subagent consumers remain distinct

- **Given** spawn and activity events for the current parent conversation
- **When** transcript items and composer membership are derived
- **Then** transcript styles and the top composer panel both receive their intended rows
- **And** Local Groups does not change `multi_agent`, `multi_agent_v2` or `canInteract`

#### Scenario: project history and Sol efforts execute

- **Given** current-root and child-root conversations plus Sol and non-Sol model definitions
- **When** the patched history mapper and reasoning contracts execute
- **Then** only current-project conversations produce non-empty rows through state-database requests
- **And** Max/Ultra are accepted only for `gpt-5.6-sol` and remain persistent

### Requirement: the installed artifact closes the release gate

A repository-only pass or a patched Codex directory MUST NOT be treated as completion. The released Local Groups VSIX MUST be installed and verified from its active installation directory before post-Reload acceptance.

#### Scenario: repository changes are packaged and installed

- **Given** engine or verifier contracts changed for `26.5825.51511`
- **When** the Local Groups VSIX is built and installed
- **Then** the active registry points to the new Local Groups version
- **And** installed engine and verifier hashes equal the repository files
- **And** installed compile, plan zero and external verifier pass

#### Scenario: Reload acceptance runs

- **Given** the new Codex and Local Groups versions are active
- **When** a new Extension Host starts
- **Then** Local Groups output contains no incompatible or unpatched warning
- **And** each behavior affected by this adaptation has UI evidence or a deterministic runtime equivalent

### Requirement: upgrade artifacts are reclaimed by ownership

Official, patched, backup, VSIX, npm-cache, probe, log, helper and test artifacts created by this upgrade MUST be removed through owned-path cleanup. Cleanup failure MUST fail the release gate, and unrelated paths MUST remain untouched.

#### Scenario: upgrade validation finishes

- **Given** the workflow created temporary artifacts under registered paths
- **When** validation succeeds or fails
- **Then** every owned path is removed
- **And** recursive scans of the known project prefixes find no residue from this run

