# Codex 26.5818.41705 Compatibility Specification

## ADDED Requirements

### Requirement: upgrade adaptation is OpenSpec-gated

Every Codex upgrade adaptation MUST read the applicable OpenSpec change and upgrade playbook before modifying code. The applicable task list and full regression matrix are the implementation and release contract, not optional documentation. The adaptation MUST NOT be declared complete by checking only the newly changed anchor or by waiting for the user to discover omitted regressions.

#### Scenario: a new Codex build is adapted

- **Given** a new exact Codex build needs support
- **When** implementation starts
- **Then** the main thread reads the current change, known regression matrix and previous failure records first
- **And** it maps every applicable contract to code, verifier, test and acceptance evidence before changing live bundles

#### Scenario: an omitted defect is discovered

- **Given** a defect escaped the current matrix
- **When** the root cause is confirmed
- **Then** the requirement and a failing regression are added before the implementation fix
- **And** all applicable matrix rows are rerun instead of validating only that defect

### Requirement: routine acceptance is owned by the main thread

The main thread MUST complete and record routine clean, live, startup, performance and UI acceptance. It MUST NOT delegate ordinary Reload or regression testing to the user. When direct UI automation is unavailable, it MUST provide a deterministic headless/runtime equivalent for the changed behavior; if neither is possible, it MUST report the adaptation as blocked rather than complete. User confirmation is reserved for business ambiguity, destructive actions or user-specific choices.

#### Scenario: live bundles have been patched

- **Given** clean and live verifier gates pass
- **When** release acceptance runs
- **Then** the main thread gathers post-apply UI evidence or a deterministic equivalent for every changed behavior
- **And** it records the evidence in OpenSpec without asking the user to execute the checklist

#### Scenario: acceptance cannot be executed

- **Given** an applicable behavior has neither agent-operated UI evidence nor a deterministic equivalent
- **When** completion status is evaluated
- **Then** the task remains blocked or pending
- **And** the adaptation is not described as complete

### Requirement: exact 41705 support is isolated

Local Groups MUST support `26.5818.41705` only through its dedicated exact-build variants. It MUST NOT broaden 31338 anchors or accept a suffix/future build.

#### Scenario: verified clean bundle patches atomically

- **Given** the verified official `26.5818.41705` clean extension
- **When** safe plan and apply run
- **Then** exactly Host, Header, Main/Statsig and Server/History are planned
- **And** syntax, verifier and a second zero-change plan pass

#### Scenario: unknown build is rejected before side effects

- **Given** a 5818 build not explicitly listed, including a suffix build
- **When** plan or apply runs
- **Then** it reports the unsupported version
- **And** it does not plan, restore backup or write a bundle

### Requirement: 41705 contracts are scope-bound

The 41705 gate MUST bind the real `oY`, Header imports/title consumers, Main membership/composer chain, Sol/Power consumers and project-history title semantics. A string, nested, later-function or fake-panel decoy MUST NOT satisfy the gate.

#### Scenario: decoy does not satisfy a real consumer

- **Given** a real 41705 title, Power, history or composer consumer is broken
- **And** the expected text remains only in a string, nested scope or later function
- **Then** engine postconditions and the external verifier reject the patched bundle

### Requirement: project history avoids repeated rollout repair scans

The 41705 Local Groups project-history pagination MUST request `thread/list` with `useStateDbOnly: true`. Native Codex callers that omit the option MUST retain the upstream `hostId !== PT` default. This optimization MUST NOT change the returned project conversation ID set for the verified 41705 data.

#### Scenario: scoped project history uses the state database

- **Given** Local Groups loads all pages for the active project
- **When** it calls the patched `listRecentThreads`
- **Then** every project-history page sets `useStateDbOnly: true`
- **And** root and child conversations remain complete and cross-project conversations remain excluded

#### Scenario: native history keeps its upstream default

- **Given** an existing Codex caller omits `useStateDbOnly`
- **When** it calls `listRecentThreads`
- **Then** the request still derives the value from `hostId !== PT`
- **And** only an explicit Local Groups project-history request overrides it

#### Scenario: old marker migrates without a false green

- **Given** a 41705 bundle already contains the previous project-history marker
- **When** plan runs with the current Local Groups engine
- **Then** it plans the state-DB parameter migration exactly once
- **And** a second plan is zero-change
- **And** a missing helper flag or ignored method parameter is rejected

### Requirement: recent-menu readiness is independently accepted

Route readiness MUST NOT be used as evidence that the recent menu is usable. Main-thread acceptance MUST separately confirm that the recent-menu spinner terminates, project rows appear, and a row can be opened, or provide a deterministic runtime equivalent for the changed loading path.

#### Scenario: routes are ready but project history is still loading

- **Given** startup logs report routes mounted and ready
- **When** the user opens the recent menu
- **Then** the adaptation remains pending until the spinner terminates and a project row is usable

### Requirement: project history preserves the native conversation mapper contract

The 41705 project-history loader MUST pass the raw thread and summary-derived metadata to the native `bdt` conversation mapper. It MUST NOT pass a `ThreadSummary` directly to `bdt`, because `bdt` requires a `{ thread, hostId, conversationId, ... }` input and reads timestamps and cwd from `thread`. The fallback path MUST obey the same contract.

#### Scenario: state-DB rows become recent-menu conversations

- **Given** `thread/list` returns matching raw threads from the state database
- **When** Local Groups converts the project-history pages
- **Then** the loader passes each raw thread as `thread` and the summary title, host, ID, workspace kind and unread state through the native mapper contract
- **And** the result contains usable project conversation rows instead of a swallowed query error and `No chats yet`

#### Scenario: a loose fixture cannot hide mapper drift

- **Given** the native `bdt` producer requires a `thread` property
- **When** the loader or fallback passes a summary-shaped object without `thread`
- **Then** engine postconditions, runtime regression and the external verifier reject the bundle
- **And** matching ID counts alone cannot be used as UI-equivalence evidence

#### Scenario: whole-bundle depth scanning misclassifies the mapper

- **Given** the minified 41705 bundle makes a whole-file brace-depth scanner report the real `bdt` at a non-zero or negative depth
- **When** engine and verifier validate the mapper producer
- **Then** they require exactly one named `bdt` producer with the complete verified signature and an extractable function scope
- **And** a nested or string producer decoy cannot replace or supplement a drifted real producer

### Requirement: test temporary artifacts are always reclaimed

Every repository test and upgrade-validation command MUST reclaim all temporary files and directories created by that run. Cleanup MUST run for success, assertion failure, no matched tests and thrown errors. A cleanup failure MUST fail the command. Cleanup MUST be ownership-scoped to paths registered by the current run and MUST NOT delete pre-existing or unrelated `/tmp` content.
The ownership inventory MUST cover every artifact type created by the workflow, including official downloads, extracted and patched copies, rollback trees, VSIX packages, npm caches, review workspaces, probes, schemas, logs and helper files. Cleanup MUST NOT be limited to prefixes explicitly reported by a user.

#### Scenario: a complete test run finishes

- **Given** the test runner creates hundreds of `codex-*` temporary directories through shared helpers or direct test setup
- **When** the run passes
- **Then** every path created by that run is removed before the command exits
- **And** the before/after temporary-directory inventory contains no new current-run path

#### Scenario: a test exits early

- **Given** a test assertion fails, `--grep` matches nothing, or an unexpected error is thrown
- **When** the runner exits through an error path
- **Then** the same ownership-scoped cleanup runs from a guaranteed finalization path
- **And** cleanup failure changes the command result to failure

#### Scenario: upgrade validation creates large workspaces

- **Given** an upgrade workflow creates `/tmp/codex-upgrade-*`, extracted VSIX trees, patched clean copies or diagnostic workspaces
- **When** required hashes and results have been recorded in OpenSpec
- **Then** those temporary workspaces are deleted before the workflow is declared complete
- **And** an on-disk `/tmp` path is not treated as permanent release evidence

#### Scenario: additional artifact types were not named in the original report

- **Given** the workflow also created VSIX files, rollback copies, npm caches, review directories, probes, logs or helper files under different names
- **When** final cleanup runs
- **Then** every path in the current-run ownership inventory is reclaimed
- **And** cleanup does not stop after deleting only the prefixes mentioned in the original defect report
