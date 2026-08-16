# 设计：Codex 26.5810.52044 兼容

## 已确认上游变化

| 职责 | 26.5810.41047 | 26.5810.52044 | 结论 |
| --- | --- | --- | --- |
| Extension Host | `jP` / `timeoutMs:3e4},3e4`、capn `B8` | 完全未漂移 | 零改动，120s 补丁原样命中。 |
| Header | `header-DPGKK91L.js` | `header-CSBoBpDg.js` | 结构同契约，局部变量压缩名漂移。 |
| App Main / Statsig / Power / composer | `app-initial-CuO8rPSL.js` | `app-initial-BYsFXcPC.js` | Power 与 UI 同文件；仍只有 Ultra，只补 Max。 |
| App Server / History | `app-initial-DLJA_f9P.js` | `app-initial-CireNHNv.js` | hook/store/manager 结构不变，符号漂移。 |

## 符号漂移映射（41047 → 52044，均在 clean bundle 验证唯一）

- Header：rows `onClose:i,u`→`a,f`；历史源 `{data:p}=j()`→`{data:h}=te()`（父组件 `l=r(),{authMethod:u}=p(),d=n(),f=ee(Ln),m=ee(Rn),...,g=Ae(),`）；菜单组件 `c=o!==void 0&&o,l=s===void 0||s,u=r(),f=we(),{authMethod:m}=p(),`；fail-closed 过滤 `E=r.filter(T),D=hn(n.data,r,w)`→`T=i.filter(w),E=hn(n.data,i,ee)`；行组件 `pt→_t`；菜单 `triggerButton:oe→se`。
- Power：`Pon→Fon`、主数组 `Ion→Lon`、Ultra 对象 `Lon→Ron`、`kon→Aon`（上游新增 `removeXHigh`）、Reasoning 菜单 `u$→l$`（`wC→TC`）。
- 子 agent：producer `dyn→fyn`、aggregator `uyn→dyn`（名字对调）、store `lJ=Dc→uJ=Nc`（导出仍 `as FT`）、hook `DOr→AOr`（`wc(lJ`→`jc(uJ`）、筛选 `AOr→NOr`/`OOr→jOr`、composer `aNr→cNr`、面板 `xzn→Szn`、开关 `fn→pn`、jsx `J6→q6`。
- History：`Ron/Bon→ssn/lsn`（`ssn as qm`）、`aRt→gRt`、`eH→MV`、`YO→ZO`、`nH→PV`、`kon→Qon`、`Oon→Zon`、`IF→EF`、`Lk→zk`、`zF→kF`、`pRt/BF→wRt/AF`。

## 未漂移并复用的语义定位

- execution target 导出 `qZ`、messenger 导出 `kat`，由 `findExecutionTargetExports` / `findVscodeMessengerExports` 自动唯一命中。
- `function Sn(e){return e.kind===`remote`}function Cn` helper 插入点、`Bn` 打开页标题锚点、`An=(0,Dn.memo)(...(24)` cache 锚点、300px/60vh 菜单布局字符串。
- V1/V2 transcript switch 后置条件为捕获组语义正则，零改动继续命中。
- `1221508807` 旧开关仍不存在，不注入子 agent gate。

## 根因与双 build 设计

同 minor 新 build 全量重压缩，5810 专用锚点字符串与命名后置条件失配。注入的生成代码（helper 体、fail-closed 过滤、分组视图、标题 override）不变，只换原生符号引用，因此 marker 保持 `=1`。

Review 第 1 轮指出首版整体替换锚点破坏了 41047 已支持版本与滚回链。最终设计：`context.codexBuild` + `CODEX_265810_BUILDS` 白名单（41047/52044）显式选择变体；`HEADER_265810_VARIANTS` / `COMPOSER_265810_VARIANTS` / `POWER_265810_VARIANTS` / `HISTORY_265810_VARIANTS` 四张表只承载原生符号名与锚点串，生成体共享单一实现；postcondition 与 verifier 按 build 验具体链。未知 build plan 报 `不支持的 Codex 26.5810 build` 且不规划特性 bundle、apply 零写入。

## 实施阻碍与防复发

1. 获取阻碍：CDN 断流 + 官方 CLI 安装失败；替代流程为 HTTP/1.1 Range 续传 + 独立 SHA-256 校验，残件（`cdn-partial`）不得当 official clean。
2. 同 minor 重压缩也必须一次跑完全矩阵（Header 全链、UI postcondition、Power 三锚点、History 注入点、子 agent producer→store→composer→panel），不得只修第一个报错。
3. 命名后置条件每次重压缩都要重新映射；能写语义结构的（transcript switch）继续用捕获组。

## 提交前复盘

- 下载链路：Marketplace CDN 多次断流，官方 CLI 安装又返回非结构化错误。最终只接受 HTTP/1.1 Range 续传后的完整 VSIX，并在解包前独立校验 SHA-256；任何残件都不能进入 clean 基线。
- 兼容边界：首版只替换 52044 压缩锚点，导致同 minor 的 41047 回滚链失效。最终按完整 build 选择四张变体表，同时验证 41047、52044 和未知 build fail-closed，禁止用新锚点覆盖旧 build。
- 测试遗漏：首轮自动化覆盖业务补丁，但缺少 52044 实际分包拓扑的 locator 正向回归。Review 第 2 轮补齐真实 Header、main/statsig/request 合包、server 与无关候选，防止以后“补丁测试通过但定位错 bundle”。
- 发布边界：live 自动门禁与安装版复验已通过；用户 `config.toml` 内容和 mtime 未变。Reload 后的完整 UI 矩阵仍是人工门禁，未完成前不得写成通过。

## 验证

双版本最终验证副本 `/tmp/clg-5810-dual-final-1786872909`：

- `clean41047`：plan 4 / errors 0；apply 幂等未回滚；二次 plan 0；语法 5 项通过；verifier 通过
- `clean52044`：plan 4 / errors 0；apply 幂等；二次 plan 0；语法通过；verifier 通过（含标题双消费、`jP` 120s、Max-only、`fyn/dyn/uJ -> AOr/NOr/jOr -> cNr -> Szn` 全链）
- `patched41047`（live 回滚副本）：plan 0 / errors []；verifier 通过
- compile、lint、243 tests、`git diff --check` 通过；OpenSpec strict validation 通过
- 用户 `config.toml` SHA-256 `47d1d34e2a1e0f20f86ee3a631651b539834eaa82b6287ead7431a5ae8eb9889`、mtime epoch `1786814971`，前后一致
- 主线程独立双版本复验 `/tmp/clg-root-review-5810-dual-20260816-174631`：41047 / 52044 official clean 都通过 plan 4 / apply / plan 0 / verifier
- live active Codex `26.5810.52044` 与 Local Groups `0.0.58` 已安装；live plan 4 / apply 幂等 / plan 0 / verifier 通过，安装版 Local Groups 再次 plan 0 / verifier 通过
- Reload 人工验收：pending
