# 设计：Codex 26.5810.41047 兼容

## 已确认上游变化

| 职责 | 26.5803.61601 | 26.5810.41047 | 结论 |
| --- | --- | --- | --- |
| Extension Host | `out/extension.js` + `this.onTimeout()},3e4))}dispose()` | 同一路径；看门狗改为 `var jP=class` / `timeoutMs:3e4},3e4` | 必须按 jP 唯一语义改 30s→120s，旧锚点消失。 |
| Header | `header-C4MbtUfx.js`，`Be`/`triggerButton:J`/`Bn` 参数 `o/s` | `header-DPGKK91L.js`，`pt`/`triggerButton:oe`/`Bn` 参数 `s/c` | 结构同契约，压缩名全漂。 |
| App Main / Statsig / Power | main=`BOIVXb2k`，Power 在 `4D0dCZ-d` | 合并为 `app-initial-CuO8rPSL.js`；Power=`Pon/Ion/Lon/kon/u$` | Power 与 UI 同文件；已有 Ultra，只补 Max。 |
| App Server / History | 与 Statsig 合包 `_Xe()/vXe` | 独立 `app-initial-DLJA_f9P.js`；`Ron()/Bon` | 新 hook / store `aRt` / 符号 `IF/Lk/zF/pRt/BF/eH/YO/kon/Oon/nH`。 |
| Transcript / composer | `Zmt/Xmt/XV as sS` → `Cen/Een/wen` → `_Rt` | `dyn/uyn/lJ as FT` → `DOr/AOr/OOr` → `aNr` → `xzn` | 只验证原生链，不改 `canInteract`。 |

`CodexExtensionLocator.locate()` 对新版返回唯一候选，locator 生产 predicate 不改。

## 根因

1. minor `5810` 不在白名单，plan 在定位成功后直接 fail closed。
2. 26.5803 专用锚点全部失配，不能“放行后复用旧函数”。
3. `jP` 看门狗旧字符串消失；若因 minor 变化跳过 120s，会重现 30s Oops。
4. 3757 个 export 时旧 messenger 扫描是 O(exports×filesize)，official clean plan 无法在合理时间内完成。语义不变的一遍扫描是 5810 交付前提。
5. 5810 `localTitlePath` 可为空，`runSyntaxChecks` 无条件读该路径会在 apply 后置语法检查抛错并回滚。

## 实现边界

- 新增 `patchSafeHeader265810`、`patchCodexUi265810`、`patchCodexPower265810`、`patchProjectHistory265810`、`patchExtensionWebviewTimeout265810`。
- Power 只把 `xhigh` 后插入 `gpt-5.6-sol:max`；原生 `Lon` Ultra 对象保持一份。`Pon([...Ion,Lon].filter` 仍保证 Ultra 进入菜单，不新增第二个 Ultra 条目。
- 打开页标题复用 `codexLocalGroupsLocalTitle()`，独立 marker `OpenedTitle265810`。
- capn 增加 `B8` 变体，保证 metadata 四入口仍能进 Extension Host。
- 用户 `config.toml` 只读；适配代码未写入。任务期间编排意外改动了 model/reasoning，恢复基线 hash+mtime 由主线程在全部 agent 结束后做。

## 实施中遇到的问题与防复发约束

1. 最初只放行新 minor 不够；Header、Power、History、transcript/composer 的压缩名和分包均漂移，必须为 5810 建立独立锚点和 marker。
2. 新 `jP` 看门狗仍是 30s，而真实 route mount 可超过 30s；必须将唯一的 timeout 和回调同时改到 120s，锚点缺失时 fail closed。
3. 第一轮自动证据只验证子 agent transcript 和标记存在，不能证明 `dyn→uyn→lJ→DOr/AOr/OOr→aNr→xzn` 可见链。Engine postcondition、live verifier 和逐段断链负例必须同等强。
4. 第一轮矩阵曾过度声称四入口、分组 15/5 和标题一致性已覆盖。以后必须真执行 `promptNewGroup`、5→15→25 及 15/5 双收起、同 ID dropdown + `Bn` 双消费和空值回退。
5. 3757 个 export 使旧 messenger 扫描退化，应先一次收集 `getInstance()` 单例后再与 export 求交；`localTitlePath=null` 必须跳过语法检查。
6. Agent 编排和 VS Code CLI 激活可能改写当前 model/reasoning。升级前后必须比对 `config.toml` 内容 hash 和 mtime，并恢复用户原值；不得将这种编排副作用当成业务修复。

## 验证

Official clean/validation：`/tmp/codex-26581041047-final-validation-20260814-102809/openai.chatgpt-26.5810.41047`。

- plan 4 / errors 0
- apply 语法通过、idempotent true、二次 plan 0
- verifier 通过，含标题双消费、jP 120s、Max-only、`dyn/uyn/lJ -> DOr/AOr/OOr -> xzn`

Live 已在 review 通过后安装：active Codex `26.5810.41047`、Local Groups `0.0.57`，plan/apply/plan + verifier 通过。Reload 日志为 10:50:30.398 root render、10:51:03.528 route mounted（`36,967ms`）、10:51:03.550 ready，无启动看门狗超时；用户确认 UI 无问题。
