# Tasks

- [x] 1. 读取升级手册、既有 change、相关 engine/verifier/tests，并校验 official VSIX 与 clean topology。
- [x] 2. 确认 Host、Header、Main、Power、Server/History 和 lazy transcript 的真实 aliases 与调用链。
- [x] 3. 实现 exact-build 白名单、五 bundle 适配和 unknown/suffix 零写入。
- [x] 4. 同步 external verifier 的 exact mappings 与跨 bundle 契约。
- [x] 5. 增加 locator、engine、runtime 和 verifier 版本回归。
- [x] 6. official clean 完成 plan/apply、语法、external verifier和二次 plan 0。
- [x] 7. 完成全量 test、compile、lint、strict OpenSpec 和独立 review。
- [x] 8. 由主线程同步发布文档、版本、安装与最终验收结论。

## Post-validation repair

- [x] 修复用户实测的 5901 下拉标题未即时回显：确认 Header refresh 链已触发，根因是 Main `$T/yMt` 先返回原生标题，导致旧版非字符串 `titleOverride` 被忽略。
- [x] 将 Header 标记传递、Main 精确标记解析、旧 v0.0.66 原位迁移、非空覆盖/清空回退执行回归，以及缺失解析器 fail-closed 同步写入 engine、external verifier 和测试。
- [x] 独立 review 补充 decorator→项目 row→Header marker 的 producer/use 门禁，并加入 producer 漂移、row cache 漂移和 decorator duplicate/later/nested decoy 负例。

## Deferred safeguard

- [ ] 两轮修复已用尽：下次升级前必须将项目 row helper 的 decorator consumer 绑定到真实 `u.map` 渲染 callback，并覆盖 row consumer direct/later/nested-use decoy；不得以当前局部 `includes` 当作该条 future-drift 门禁。

## Evidence

- Official VSIX SHA-256：`cd9cd06c5bfcc8e18972587d04ac9d08b04152ebf6de426233ddc812b05933ff`。
- Clean plan/apply：Host、Header、Main、Power、Server/History 共 5 个 bundle；apply syntax 6 项通过，external verifier 通过，二次 plan 0。
- 定向回归：exact locator、unknown/suffix zero-write、五 bundle patch/idempotency、root/subdir pagination/repeated-cursor/manager fallback。
- 初次 live Reload：`Bn` 出现 error boundary。根因是 opened-title 注入把 JSX runtime `$` 当作 hooks runtime；`Ln` 才是 Header 的真实 hooks runtime。
- 修复：`Bn` 强制使用 `Ln.useState/useEffect`，并在同一 effect 成对 add/remove refresh listener；engine、external verifier 与执行级负例同步拒绝 `$` hooks 或缺 cleanup。
- 自动化：修复后全量 370 tests、compile 26 files、lint 26 files、strict OpenSpec 与 `git diff --check` 通过；两轮独立 review 均无阻断项。
- live：官方 VSIX 安装 `26.5901.22334` 后，5 bundle apply/repair、二次 plan 0、verifier、已安装 Local Groups compile/plan/verifier、源码与安装产物 hash 一致均通过。`config.toml` SHA-256/mtime 保持不变。
- Reload：初次 `code -n` Host 记录了旧 `$` hooks error boundary；修复后 live Header 已验证为 `Ln` hooks、`$` 无 hooks，且执行级运行时回归通过。当前 remote CLI 无法驱动已有用户窗口的 `Developer: Reload Window`，因此新 UI 交互保持为确定性 runtime 等价验收；下次打开或 Reload 会加载修复后的 bundle。
- 下拉标题：用户实测打开页 `Bn` 已显示本地标题、下拉仍显示原生标题。根因是 5901 Main `$T/yMt` 的 `if(title!=null)return title` 覆盖了 Header 的旧非字符串 override；v0.0.67 以唯一字符串标记限定恢复 Local Groups 本地标题优先，普通调用仍保持原生优先。旧 0.0.66 live bundle 只迁移 Header/Main 两个文件。
- Review 修复：仅校验 Header marker 与 Main decoder 仍可能让 decorator 漂移为原生 title 后假通过。现已按唯一 top-level scope 精确校验 `codexLocalGroupsDecoratedItem()`、项目 row 的 decorator 使用和 row title cache；decorator 声明漂移或 duplicate/later/nested decoy 均零写入失败。row helper 内未调用 nested-use decoy 的 future-drift 门禁记入 Deferred safeguard，因两轮修复上限不在本次继续修改。

## v0.0.67 Release Evidence

- 运行时修复只迁移 live Header 与 Main 两个 bundle；Apply 后二次 plan 为 0，live external verifier 和 6 个目标 bundle 语法检查均通过。
- 回归：全量 `375` tests、compile 26 files、lint 26 files、strict OpenSpec 与 `git diff --check` 通过；定向覆盖 native title + Local Groups marker、清空回退、普通 override、旧 0.0.66 原位迁移、缺 resolver、producer drift、row cache drift 和 decorator decoy。
- 发布：`vscode-codex-groups@0.0.67` 已安装；VSIX SHA-256 为 `ddfbe86fcc40962a4d83c187f5d40b512ab27daa6b873e0c953bd81c4b62fca7`。安装目录的 `patchEngine.js` 与 verifier 分别与源码 SHA-256 `2bee5e3cbbaff77721d9b7945077fcefcf063aa348dda9df3e17be9e553bda8d`、`e4c76535fb05bc946e8a922c0213048bafb5683d4cda388fc14f114e31b9606d` 一致；安装目录 plan 0、verifier 通过。
- 安全与清理：`/root/.codex/config.toml` SHA-256 保持 `1d635091db50b9c9388b46c3a4277d2340cd856666159f9a9ed09e763af9fba8`；本次临时 VSIX 已用 `fs.rmSync()` 删除。
