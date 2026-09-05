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

## 2026-09-05 Sol/Astra 拖拽档位适配

- [x] 取得用户确认，取代旧“仅 Sol 菜单、原生滑块不扩展”的约束；记录目录过滤与菜单/滑块消费者脱节根因。
- [x] 补齐当前可用 Sol/Astra 的菜单、紧凑/展开拖拽条、保存值校验，并保留非目标模型和原生交互/持久化链。
- [x] 执行级回归覆盖过滤目录、两模型 Max/Ultra、顺序/去重、鼠标选择回调边界/键盘/重置、保存回读及缺失模型；同步 verifier 与 consumer 漂移负例。完整 DOM 和鼠标坐标拖动未实测，使用下述实际源码等价验证。
- [x] 验证 official clean、旧 live 原位迁移、语法、external verifier 和二次 plan 0。
- [x] 新建独立 review，最多两轮修复；完成最终 compile/lint/full test、strict OpenSpec 和清理。
- [x] 安装已验证产物，核对 active registry、源码哈希、live plan/verifier 及用户配置哈希/mtime；记录真实 UI 或确定性 runtime 等价验收，不把未测项写成 PASS。
- [x] 2026-09-05 用户确认本次修复“没问题”，补充验收结论；保留自动化验证的实际边界，不扩写为全部 UI 逐项实测。

### 本次基线证据

- 修改前 worktree 干净，基准提交 `43370b9683c40a481e813be90eb1fe8ef2d5cc37`；active 为 Codex `26.5901.22334` / Local Groups `0.0.67`。
- 重新下载官方 linux-x64 VSIX，SHA-256 与上述 `cd9cd06c...5933ff` 一致，ZIP 完整性与 package version 通过。只解压待验证的 `out/`、`webview/` 和 `package.json`；未重新安装 Codex 二进制。
- 将基准提交应用到官方 clean 副本：plan/apply 5、syntax 6、幂等、external verifier、二次 plan 0 通过；生成的五个 bundle 与当前 live 的 SHA-256 逐个一致。因此旧版迁移测试使用的是可重建的真实 live 基线，不是手造 marker。
- 所有下载、解压、旧源码、patched/rollback、副本和 probe 日志放在 `with-upgrade-workspace` 管理的本次所有权目录内，命令结束由顶层 finally 清理；最终已验证工作目录不存在，本次临时产物无残留。

### 独立 review 与修复轮次

- 首次 Standards review：P1 混合/重复 marker 未严格拒绝；P2 fixture 缺 Astra 过滤目录 compact/expanded 和缺失目标模型场景。
- 首次 Spec review：P1 真实 CKn return 后的不可达 `uKn` decoy 能骗过 verifier，旧 v1 迁移也可能误接受。
- 第 1 轮修复完成：统一收紧 marker 计数和真实 return 消费链，补上述持久回归。Standards 与 Spec 两位独立 reviewer 均复查通过，无剩余阻断；未启动第 2 轮修复。

### 修复后实物验证

- 最终代码重新从 official clean apply：plan/apply 5、syntax 6、幂等、external verifier、二次 plan 0；从旧提交重新生成 v1 后迁移：仅 Main/Power 2 文件、syntax 6、verifier、二次 plan 0，均 PASS。
- 实际 bundle 负例 6 组：Main/Power mixed marker、duplicate marker，以及真实 CKn return 后追加不可达 consumer 的 v2/v1；external verifier 拒绝，plan/apply 返回错误且被测文件内容与 mtime 不变。
- 独立运行时 probe 执行真实 `CKn` 的 `He/Ge` 片段、`pIn`、`uKn`、`LPn/XNn`、`i3`、`kQe` 和 `GQe` 保存回调。Sol/Astra 在过滤目录与完整目录下的顺序/去重、compact/expanded 选择、键盘及重置、缺失模型和 Terra 保持不变均 PASS；两模型 × Max/Ultra 四种保存组合的 model/effort、cache、原生写入边界和回读均一致。
- runtime 边界说明：`iIn/CFn` 为 JSX 捕获边界，`LPn` 复用真实键盘函数和子 slider 的选择回调；配置/API IO 被 stub。未驱动完整 VSCode DOM 或鼠标坐标，不把这项写成人工 UI PASS。默认关闭 xhigh 的上游实验分支也参与验证，未改变其行为。
- 配置审计：开始时 `config.toml` 为 Sol/xhigh，SHA-256 `b9592a063d23fb328246292729587ce21848f365c02d1019073c000ab3dcf278`；工作期间检测到该文件在 11:18:46 变成 Astra/medium，SHA-256 `d012fefff40eb0ea21e54cd2e2d68d561621c55a63735a3638d5e329e33e330e`。本次命令及 agents 未写该配置，保留发现时的当前内容，未回滚用户设置。不能声称整个工作期间哈希不变；安装前后按当前快照核对。模型目录 SHA-256 始终为 `a14ccfe3e56d2ec1244aef469d4e93611aaeafb5f862a9574a459f27f095024d`。

### v0.0.68 安装与最终验证

- 最终全量 `380 tests`、compile、lint、strict OpenSpec 和 `git diff --check` 均通过；Standards 与 Spec 两位独立 reviewer 在第 1 轮修复后关闭全部阻断问题，没有启动第 2 轮修复。
- Local Groups VSIX SHA-256：`0280996f3dd480833ba6c3fc6b477edfdd59ac782e814f3ebdcf9d9d2b4a9403`。Remote CLI 安装期间没有即时输出，按手册等待而未重复安装；11:57:12 的 `remoteagent.log` 记录解压、重命名与安装成功，随后 CLI 正常退出。
- active registry 为 Codex `26.5901.22334` / Local Groups `0.0.68`。安装目录 engine SHA-256 `aa22cd915336d1ae8ad9522ad2cf518c7ef8351d5695116070f30754334e131f`、verifier `8b281170a0de97e4631e163abc49408eaedf26894d431eae3194765056f7a496`、locator 均与仓库一致；从安装目录执行 compile、plan 0、apply 0、二次 plan 0 和 external verifier 通过。
- live 仅迁移 Main/Power 两个 bundle，apply syntax 6 通过；两文件与最终 official clean patched 副本的 SHA-256 一致。Host、Header、Server 与 Codex `package.json` 的内容哈希和 mtime 均未改变。实际源码 runtime probe 在 live 上再次通过，包括两模型 × Max/Ultra 四种保存回读组合。
- 安装前后 `config.toml` 与模型目录的 SHA-256、mtime 逐一不变；保留安装前实际配置 Astra/medium，不回滚开始时的旧值。未修改 provider 或 multi-agent 配置。
- 交付时工具不能驱动用户窗口的完整 DOM/鼠标坐标拖动或 Reload；以上是确定性实际源码运行时等价验收，不是主线程人工 UI PASS。窗口需要 Reload 才会载入新 bundle；后续用户确认见下节。
- 清理：托管工作区 shell 正常退出、finally 清理成功，原目录不存在；复查 `/tmp` 的 `codex-upgrade-*`、`codex-patch-*`、`clg-*` 无残留。本次下载、VSIX、npm cache、旧源码、probe 和测试临时文件均已删除；未删除既有发布产物或 live 所需备份。

### 用户确认与后续升级要求

- 2026-09-05，用户反馈“没问题，记录到openpsec文档中 然后提交推送吧”，确认本次 Sol/Astra 拖拽档位修复可接受。对应实现为 `d8bdcbe` / Local Groups `0.0.68`；本次补记只更新文档，不改运行代码或用户配置。
- 用户确认与上述 `380 tests`、实际源码 runtime、两位独立 reviewer 的证据分别保留；未新增鼠标坐标、完整 DOM 或冷启动耗时记录，不把确认扩写为全部 UI 矩阵实测通过。
- 下次升级必须继续执行本 change 的 Sol/Astra 完整契约及升级手册矩阵：菜单、紧凑/展开拖拽、选择回调、保存回读、过滤目录、顺序/去重、不可用模型、marker/真实 consumer 负例、旧版迁移、安装目录验证和临时文件清理，不得再次只修菜单。

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
