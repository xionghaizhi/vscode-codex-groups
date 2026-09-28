# Proposal: adapt Codex 26.5917.61114

## Why

Codex 26.5917.61114 changes the webview from the 26.5908 five-bundle layout to a split UI/core/server topology. Local Groups must preserve title/group actions, project history, Max/Ultra, subagent display and fail-closed upgrade safety without changing user configuration.

## Scope

- Add exact-build support for official `openai.chatgpt@26.5917.61114`.
- Locate and patch the verified Host, Header, Main UI, Power/core and Server bundles.
- Preserve existing OpenSpec contracts and add regression/verifier coverage.
- Do not modify Codex configuration, Multi-Agent settings, or unrelated supported versions.
