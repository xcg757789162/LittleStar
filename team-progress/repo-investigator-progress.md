# repo-investigator progress

- 状态: 执行中
- 负责任务: 追查 `llmBaseUrl` 从设置页到 `child.settings` 的完整同步链路
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC`

## TODO
- [ ] 核对 `SettingsDialog` → `syncOpenMAICToChild()` 的完整触发链路
- [ ] 核对哪些入口可能只写 `llmProviderId/llmModel/llmApiKey` 而漏写 `llmBaseUrl`
- [ ] 判断是否存在旧数据、手工 patch 或迁移缺口
- [ ] 回传最可疑缺口与对应文件位置

## 工作内容
- 已收到主控同步：标准路径下 `syncOpenMAICToChild()` 会把当前 provider config 的 `baseUrl` 反写到 `child.settings.llmBaseUrl`。
- 运行态新增证据：当前数据库里不只是 `llmBaseUrl` 缺失，连 `llmProviderId / llmModel / llmApiKey` 也整体为空，且并非单个孩子特例。
- 当前重点已更新为：排查现场 phase2 是否读取的是另一份内存/本地 settings，而不是数据库当前 `child.settings`；同时继续核对非标准路径、旧数据或部分更新路径，确认为什么高级设置字段长期未回填。

## 环境信息
- 当前以仓内搜索和链路核对为主，尚未改代码
