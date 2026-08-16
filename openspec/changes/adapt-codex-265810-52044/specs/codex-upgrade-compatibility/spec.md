# Codex 26.5810.52044 Compatibility Specification

## ADDED Requirements

### Requirement: same-minor dual build compatibility

26.5810.52044 是同 minor 全量重压缩。5810 patch MUST 按完整版本号显式选择 41047 或 52044 的唯一业务锚点（`context.codexBuild` + build 白名单），两个 build MUST 同时严格支持：clean 41047 与 clean 52044 都 plan 4 / apply 幂等 / plan 0 / verifier 通过，已 patched 41047 MUST plan 0 / errors []。未知 5810 build MUST fail closed。注入生成契约不变时 marker MUST 保持 `=1`；共享业务 helper MUST 保持单一实现，变体表只承载原生符号名与锚点字符串。postcondition 与 verifier MUST 对具体 build 验具体链，MUST NOT 用 OR 混搭造成假绿。

#### Scenario: header compressed names remapped per build

- **Then** 52044 项目行使用 `F.map` / `An` / `y` / `onClose:a` / `onActiveArchiveStart:f`，41047 使用 `onClose:i` / `onActiveArchiveStart:u`
- **And** 52044 历史源为 `{data:h}=te()`，41047 为 `{data:p}=j()`
- **And** 52044 fail-closed 过滤锚点为 `let T=i.filter(w),E=hn(n.data,i,ee),`，41047 为 `let E=r.filter(T),D=hn(n.data,r,w),`
- **And** 行组件 52044 为 `_t`、41047 为 `pt`，菜单触发 52044 为 `triggerButton:se`、41047 为 `triggerButton:oe`
- **And** 打开页 `Bn`、memo cache 24、`Sn` helper 插入点在两 build 继续命中

#### Scenario: Power only adds missing Max on per-build names

- **Given** 上游已有唯一 `gpt-5.6-sol:ultra` 对象（52044 为 `Ron`，41047 为 `Lon`）
- **When** 应用 Power patch
- **Then** 主数组（52044 `Lon` / 41047 `Ion`）在 `xhigh` 后增加 `gpt-5.6-sol:max`
- **And** Ultra 对象仍只有一处
- **And** 52044 `Fon([...Lon,Ron].filter` / 41047 `Pon([...Ion,Lon].filter` 使 Ultra 进入菜单
- **And** Reasoning 菜单（52044 `l$` / 41047 `u$`）为 Sol 补 Max/Ultra

#### Scenario: subagent chain remapped per build

- **Then** 52044 producer 为 `fyn`、aggregator 为 `dyn`、store 为 `uJ=Nc`、hook 为 `AOr`、筛选 `NOr`/`jOr`、组件 `cNr`、面板 `Szn`；41047 对应 `dyn`/`uyn`/`lJ=Dc`/`DOr`/`AOr`/`OOr`/`aNr`/`xzn`
- **And** 两 build 导出均为 `as FT`
- **And** 任一 build 任一段缺失 MUST fail closed

#### Scenario: project history remapped per build

- **Then** 52044 hook 为 `ssn/lsn`、store 请求为 `gRt`，helper 引用 `MV/ZO/PV/Qon/Zon/EF/zk/kF/wRt/AF`；41047 为 `Ron/Bon`、`aRt`、`eH/YO/nH/kon/Oon/IF/Lk/zF/pRt/BF`
- **And** manager/store 能力检测与分页契约在两 build 不变

### Requirement: acquisition obstacles use verified fallback

official VSIX 获取失败时 MUST 记录断流证据，使用 HTTP/1.1 Range 续传等替代流程，并在解包前独立校验 SHA-256。残件 MUST NOT 作为 official clean。

#### Scenario: CDN partial download is rejected

- **Given** Marketplace CDN 断流留下 `cdn-partial` 残件
- **Then** 残件不解包、不参与 plan
- **And** Range 续传完整文件经 SHA-256 校验后才成为 official clean

### Requirement: unchanged extension host anchors are reused

`out/extension.js` 的 `jP` 看门狗、capn `B8` 消息桥、metadata helper 锚点在 41047 与 52044 一致，MUST 原样命中；漂移 MUST fail closed。

#### Scenario: jP watchdog still patched to 120 seconds

- **Then** `timeoutMs:3e4},3e4` 唯一锚点改为 `12e4`
- **And** 锚点缺失时报 `找不到唯一 jP 看门狗`
