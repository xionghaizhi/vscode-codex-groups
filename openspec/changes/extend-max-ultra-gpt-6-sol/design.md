# Design

原生 Power 预设 `Alt` 只到 `gpt-5.6-sol:xhigh`，`ultra` 另有开关，`max` 没有滑块槽位。目录有六档不能证明面板有六档。

既有插入点不变，只把模型守卫从：

`(model === gpt-5.6-sol || model === gpt-6-astra)`

扩成：

`(model === gpt-5.6-sol || model === gpt-6-sol || model === gpt-6-astra)`

并提高 Power/UI marker。已打过旧守卫的 bundle 用 `widenMaxUltraModelGuard()` 原地替换，不重写其他补丁。

后续升级检查：

1. 对照当前 `supported_reasoning_levels`，列出声明了 `max`/`ultra` 的 Sol/Astra slug。
2. 新 slug 必须加入同一守卫；只测 5.6 Sol 不算通过。
3. 菜单、紧凑滑块、展开滑块、保存回读四条都要跑。目录有档位、菜单有文字都不能代替拖拽条。
