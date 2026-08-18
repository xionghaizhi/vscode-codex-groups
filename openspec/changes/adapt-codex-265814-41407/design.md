# 设计：Codex 26.5814.41407 兼容

## 已确认基线

- Marketplace linux-x64：`26.5814.41407`，发布时间 `2026-08-18T00:24:21.4Z`。
- official VSIX：`222415919` bytes，SHA-256 `a25dc61555d079b989e32c22017cd5e43e0b6894d3428481ae34581838c66708`。
- clean bundle：Header `header-BdmTQpqZ.js`；App Main/Statsig/Request `app-initial-B2gWpz-T.js`；App Server/History `app-initial-XTPxJJJs.js`。
- locator 零改动即可唯一定位上述拓扑；`localTitlePath`、sidebar 两个可选目标为空。
- 内置 Codex CLI 从 `0.148.0-alpha.9` 更新到 `0.148.0-alpha.15`。
- 现有 safe plan 只规划通用 Host/Header，随后明确报 `不支持的 Codex 扩展版本：26.5814.41407`；没有写入 clean 或 live。

## 配置所有权

本次开始时用户 `config.toml` SHA-256 为 `dbee59d4f58bb49fb0f2245207a85c8e283824965b3a15bc5b87ae041be069ea`，mtime epoch 为 `1786951796`。该值是当前只读基线，不得按历史 OpenSpec 中旧 hash 回退。

## 实现原则

- 5814 使用独立、精确的 build 门禁和真实语义锚点；未知 build 零写入。
- 复用现有 Local Groups helper、原子写入、备份回滚和 verifier，不复制业务实现。
- marker 只在生成契约变化时提升；仅压缩名或 clean anchor 漂移时保持原 marker。
- postcondition 与 verifier 必须绑定具体 producer、consumer、筛选、渲染和 cleanup 作用域，不能只检查字符串或 marker。
- official clean 先完成 plan/apply/plan、语法和 verifier；主线程 review 后才允许改 live。

## 最终映射

- Extension Host：Webview 看门狗类为 `YI`，唯一 `timeoutMs:3e4},3e4` 延长到 120 秒；capn 消息解析器为 `Q9`。Metadata 四入口必须绑定真实 Header dispatch 参数对象、Host `postMessage` 参数对象和 `metadataSaved` 回传，不能用同函数内的独立对象或嵌套函数冒充。
- Header：最近会话数据使用 `I/v/a/d`，原生 row 为 `ae`，菜单 trigger 为 `ie`；execution target 导出 `U$`，messenger 导出 `Vst`；打开页标题组件为 `zn/Wn/In/o/s`。下拉与 `zn` 使用同一 conversation ID，本地非空标题优先，空白或缺失回退原生标题。
- UI/Power：`Jdn/Xdn/Zdn/Udn/S$/NC/q3e` 组成 5.6 Sol 数据、Reasoning 菜单、写入、回读和校验链；仅补上游缺失的 Max，不复制已有 Ultra。
- History：`dgn/pgn/WV/vM/KV/ngn/tgn/PD/nO/bot/wRt/AF/mnt` 组成 Hook、store、manager 能力检测、分页和 proxy fallback；继续复用 `listAllThreads()`。
- 子 agent：`SNn -> xNn -> lX(Ri, export IC) -> zBr(sl) -> HBr/BBr -> vWr(yn) -> RQn(I6)`。V1/V2 producer 必须绑定 normalized key、`conversationId` 和 parent selector；composer 必须绑定同一 `vWr` 顶层原生 guard、options、rows 和真实 panel，不修改 `canInteract`。

## 本次阻碍与防复发

1. `B8` 已漂移为 `Q9`。首轮 plan 没有报错，但 live verifier 拦下 Host 回调缺口；因此 engine postcondition 与 verifier 都必须验证 Host parser 和 Metadata 四入口，不能只验证 marker。
2. 首版 5814 测试错误复用了 52044 fixture，只证明版本字符串被放行。最终改成独立 41407 Host/Header/Main/Server fixture，并执行 plan/apply/plan 0、分组 25 条、标题双消费、Sol、History 和子 agent 断链矩阵。
3. 未知 5814 build 原先会在版本检查前恢复旧高风险 backup。`apply()` 现于任何扫描、恢复或写入前执行统一 preflight；未知 build 的内容、mtime、`changed`、`cleanRestored` 均保持不变。
4. 仅在函数文本内查字符串仍会被后续函数、嵌套函数或同一 `try` 内独立对象造成假绿。最终用 brace depth 和唯一参数对象锚点绑定真实 dispatch、`postMessage`、composer options、guard 和 panel props；零个或多个同层锚点都 fail closed。
5. Remote `code --install-extension openai.chatgpt --pre-release` 实际安装了 stable `26.814.41407`。该目录不得作为 5814 official/live 证据；最终使用已校验 SHA-256 的本地 prerelease VSIX，核对 active registry 为 `26.5814.41407` 后才 apply。

## 验证边界

自动、official clean、patched clean、live/verifier 和 Reload 人工五阶段按升级手册全量矩阵填写。任一适用项 pending 时不得宣称整次适配完成；Reload 人工证据由用户实际操作确认。
