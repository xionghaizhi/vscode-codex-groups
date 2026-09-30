# Design: Codex 26.5917.62051

## Constraints

- Unknown 5917 builds, suffixed versions and future minors fail closed before restore or write.
- 62051 host aliases are `aD`, `dm`, `SM`, `oLe`, `ate` and metadata anchor `Z2e/O/gT/xB/yG/Zt`.
- Header, UI, Power and Server consumers stay on the verified 61114 semantic anchors.
- 61114 host aliases remain required for that exact build. A 62051 bundle with 61114 host symbols must not be written.

## Codex Audio on Remote-SSH

`openai.chatgpt@26.5917.62051` depends on `openai.codex-audio`. Matching marketplace build is `openai.codex-audio@26.917.62051` (same 62051, version string has no `5`).

Codex Audio `package.json` has `"extensionKind": ["ui"]`. VS Code disables UI extensions on the SSH remote. Observed errors:

1. Codex Audio not installed: `无法激活 Codex，因为它依赖于 OpenAI 中的 Codex Audio 扩展，而该扩展未安装`.
2. After copying the VSIX into `~/.vscode-server/extensions` only: `无法激活 Codex，因为它依赖于被禁用的 Codex Audio 扩展`.
3. Clicking the dialog `安装并重新加载` can install a second copy. Reload after a correct enablement instead.
4. A separate Remote-SSH toast `Failed to set up dynamic port forwarding connection over SSH` is client/SSH forwarding, not Local Groups. This host `sshd` allows forwarding for the current user; `Match User sftpuser` is the only `AllowTcpForwarding no`.

Working remote-server path used this time:

- Install `openai.codex-audio-26.917.62051` next to Codex, keep the old Codex directory.
- Set remote Machine settings `remote.extensionKind["openai.codex-audio"] = ["workspace"]` so the UI-kind extension is allowed to run on the remote host.
- Reload Window. Dictation then uses the Linux host; missing audio devices must not block Codex activation.

Do not put this setting in `~/.codex/config.toml`.

## Verification

- Fixture plan/apply for both exact builds, zero-write negative case, locator uniqueness, official clean plan/apply/verifier/second plan, and no `config.toml` change.
- After live install: Codex activates, Local Groups status is compatible, Reload Window is required.

## 2026-09-30: Max/Ultra follows the model catalog

The prior UI/Power v2 patches explicitly named 5.6 Sol, 6 Sol and 6 Astra. Consequently, a new `gpt-6.1-sol` slug was omitted even when its catalog declared Max/Ultra. Removing that guard alone is insufficient: Main `yj` passes the enabled-effort set and Ultra feature gate into `DFe` (Power export `Mkn`), which filters `model/list` capabilities before `ndi` receives `Oe`.

UI v3 adds Max/Ultra only to the transformation's allowed-effort set and enables its Ultra pass-through. The transformation still intersects those values with the actual model declarations and preserves native visibility/provider filtering. `qvt` returns to native declaration-based validation. Power v3 displays declared Max/Ultra in `L$` and rebuilds only the selected model's extended slider entries from `Oe.supportedReasoningEfforts`; it never supplements absent capabilities. Native `ikn`, slider interactions, disabled state and persistence remain unchanged.

Both v1 and v2 installed patches migrate in place to v3 with exact replacement and postcondition checks. Unknown builds still fail closed. This change applies to the two verified 26.5917 builds; older adapters remain untouched. Future build adaptations must preserve the catalog-driven rule instead of copying model-name guards. Tests cover arbitrary slugs, both/one/neither capability, unsupported saved values, empty models, migration and idempotence. Source changes do not imply installation or live UI acceptance.
