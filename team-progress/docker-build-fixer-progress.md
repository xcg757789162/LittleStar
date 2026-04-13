# docker-build-fixer 进度记录

## TODO 清单
- [x] 核对 `pregen-builder` 缺失依赖与最小修复范围
- [x] 确认 `docker/deploy/Dockerfile.app` 已补齐必要 `COPY` 规则
- [x] 做最小静态验证并记录环境限制
- [x] 向 `team-lead` 汇报处理结果

## 工作内容
- **根因核对**：`src/services/openmaic/pipeline-types.ts` 第 11 行从 `../../lib/openmaic/media/types.js` 导入 `MediaGenerationRequest`，因此 Docker 内只复制 `pipeline-types.ts` 而未复制 `src/lib/openmaic/media/types.ts` 时，会在 `npx tsc -p tsconfig.server.json` 阶段报 `Cannot find module ../../lib/openmaic/media/types.js`。
- **当前工作区状态**：`docker/deploy/Dockerfile.app` 的 `pregen-builder` 已包含以下最小必要复制规则：
  - `COPY src/server/ ./src/server/`
  - `COPY src/engine/ ./src/engine/`
  - `COPY src/types/ ./src/types/`
  - `COPY src/shared/ ./src/shared/`
  - `COPY src/services/openmaic/pipeline-types.ts ./src/services/openmaic/pipeline-types.ts`
  - `COPY src/lib/openmaic/media/types.ts ./src/lib/openmaic/media/types.ts`
- **变更判定**：`git diff -- docker/deploy/Dockerfile.app` 显示本轮与 `pregen-builder` 相关的增量，正是补齐 `src/engine`、`src/types`、`src/shared` 与 `src/lib/openmaic/media/types.ts` 的 `COPY`；未看到额外扩大改动。
- **执行结论**：当前工作区里，阻塞 `pregen-builder` 的缺件修复已经在位，我未再扩大编辑范围，只做了核对、验证和进度留痕。

## 最小验证
- **静态核对**：确认 `Dockerfile.app` 中 `pipeline-types.ts` 对应的 `media/types.ts` 已被复制进 Docker 构建上下文。
- **宿主机 TypeScript 编译**：
  - 命令：`export PATH="/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:$PATH" && cd /Users/chenguoxie/CodeBuddy/OpenMAIC && ./node_modules/.bin/tsc -p tsconfig.server.json --noEmit`
  - 结果：**通过**（退出码 0，无报错输出）。
- **Docker 直接验证限制**：
  - 命令：`docker build --progress=plain --target pregen-builder -f docker/deploy/Dockerfile.app .`
  - 结果：当前执行环境无 `docker` 命令（`command not found: docker`），因此无法在此会话内做容器级复验。

## 环境信息
- **系统**：macOS / zsh
- **工作区**：`/Users/chenguoxie/CodeBuddy/OpenMAIC`
- **时间**：2026-04-13 12:31 左右

## 当前状态
- **状态**：已完成最小范围核对与静态验证，`pregen-builder` 所需缺件修复已存在于当前工作区。
- **残留风险**：仍建议后续在具备 Docker CLI 的环境中补跑一次 `docker build --target pregen-builder`，把容器内 `npm ci` + `tsc` 全链路再确认一遍。