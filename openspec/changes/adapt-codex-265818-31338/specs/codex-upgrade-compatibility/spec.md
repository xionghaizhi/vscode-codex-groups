# Codex 26.5818.31338 Compatibility Specification

## ADDED Requirements

### Requirement: exact 5818 support fails closed before planning

Local Groups MUST support official `26.5818.31338` only after all semantic anchors and contracts pass. Unknown minor/build MUST stop before feature planning, backup restoration or file writes. Existing 5810 and 5814 support MUST remain intact.

#### Scenario: official clean patches atomically

- **Given** verified official linux-x64 `26.5818.31338` clean extension
- **When** safe plan and apply run
- **Then** only the expected unique bundle set is planned
- **And** syntax and idempotent second plan pass
- **And** any failure restores every touched file

#### Scenario: unknown minor or build is rejected

- **Given** an unverified future minor or 5818 build, with or without old markers/backups
- **Then** plan and apply report the exact unsupported version
- **And** no bundle is planned, restored or written
- **And** file content and mtime remain unchanged

### Requirement: known contracts form one release gate

The 5818 release MUST validate project isolation, per-group row limits, Metadata four entries, same-ID title consistency, Sol Max/Ultra, project history, and both subagent transcript and composer consumers. Passing only changed anchors MUST NOT count as completion.

#### Scenario: title consumers remain consistent

- **Given** one conversation has native title A and non-empty local title B
- **Then** dropdown and opened Header both display B for the same ID
- **And** blank or missing local title makes both display A
- **And** refresh and listener cleanup work without writing native title

#### Scenario: subagent chain remains native

- **Then** V1/V2 producers connect to membership store/export and parent selector
- **And** filters, original visibility guard and real composer panel remain connected
- **And** Local Groups does not patch `canInteract` or user Multi-Agent configuration

#### Scenario: structural decoys are rejected

- **Given** a real Metadata, title or composer call site is broken
- **When** expected text remains only in a later function, nested function or standalone same-try object
- **Then** engine postcondition and external verifier both fail closed

### Requirement: user configuration remains byte-for-byte unchanged

Plan, apply, repair, verify and install MUST NOT write, reorder or restore `config.toml`. Current content hash and mtime MUST remain identical before and after work.

#### Scenario: current configuration differs from historical evidence

- **Given** current `config.toml` hash differs from an older OpenSpec record
- **Then** current bytes and mtime become the read-only baseline
- **And** no upgrade step restores the historical value

### Requirement: official artifacts are exact

The official linux-x64 VSIX MUST match size `228799121` and SHA-256 `6eb72e234e83b809e776fa100f377f289910fd6410d0680438bae9ac5c9cfb2c` before extraction. Active registry, directory and package version MUST all match before live apply.

#### Scenario: exact artifact becomes live target

- **Given** the verified VSIX has been installed
- **Then** active registry version, relative location and package version all equal `26.5818.31338`
- **And** any different stable or prerelease directory is excluded from live evidence
