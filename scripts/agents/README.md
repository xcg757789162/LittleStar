---

## 强制派工规则

**收到实质性任务时，必须优先使用 dispatch-task.sh 派给专业员工**：

- **必须使用 dispatch-task.sh 的任务**：
  - 需求规划、方案设计、代码实现、Bug 修复
  - 代码审查、测试验证
  - 任何需要深度分析或持久化结果的工作
- **禁止直接使用通用 task 子代理替代员工链路**

**允许主代理自己执行的跑腿动作**：
- 单文件读取
- 简单定位（如文件搜索）
- 日志轮询、结果摘录

**推荐分工**：
- **Gemini**：搜索、归纳、建立全局视图
- **Codex**：精确改码、补脚本、修局部逻辑
- **Claude**：评审、验收、收敛风险

**例外说明**：
- 跑腿动作（读取/定位/摘要）无需派工
- 紧急故障排查可临时主代理处理，但事后应整理为正式任务派工

---

这套脚本把 `claude-internal`、`gemini-internal`、`codex-internal` 包成了同一套入口，目标是：

- **少记参数**：三套 CLI 的差异被收敛到固定脚本里。
- **少浪费 token**：统一用 prompt 模板，把任务、路径、验收标准压成最小上下文包。
- **少污染仓库**：运行态文件默认落到 `.codebuddy/agents/`，不把日志和临时结果散落到源码目录。

## 目录结构

```text
scripts/agents/
├── common.sh                 # 公共函数：日志、路径、模板渲染、命令捕获
├── run-claude.sh             # Claude Internal 包装器
├── run-gemini.sh             # Gemini Internal 包装器
├── run-codex.sh              # Codex Internal 包装器
├── dispatch-task.sh          # 统一派工入口
└── templates/
    └── dispatch-task.md      # 固定任务模板
```

运行态目录：

```text
.codebuddy/agents/
├── logs/
└── output/
    └── <run-id>/
        ├── prompt.txt
        ├── response.txt
        ├── metadata.json
        └── command.sh
```

## 0. 依赖前提

在使用这套脚本前，至少需要：

- **已安装对应 internal CLI**：`claude-internal` / `gemini-internal` / `codex-internal`
- **`python3` 可用**：`dispatch-task.sh` 依赖 `python3` 渲染模板并写 `metadata.json`
- **可用的 Node 运行时**：脚本默认优先探测 `~/.nvm/versions/node/v20.20.2/bin`

如果 internal CLI 不在默认路径，可通过环境变量覆盖：

- `CLAUDE_INTERNAL_BIN`
- `GEMINI_INTERNAL_BIN`
- `CODEX_INTERNAL_BIN`

## 1. 直接启动员工

### Claude

```bash
bash scripts/agents/run-claude.sh
```

```bash
bash scripts/agents/run-claude.sh --prompt "检查 src/router/index.tsx 的路由职责"
```

**模式说明**：
- 交互 / 非交互都支持：`--agent`、`--add-dir`
- **仅非交互**：`--system-prompt`、`--append-system-prompt`、`--permission-mode`、`--output-format`、`--keep-session`、`--output-file`、`--log-file`
- **仅交互**：`--resume`、`--continue`

### Gemini

```bash
bash scripts/agents/run-gemini.sh
```

```bash
bash scripts/agents/run-gemini.sh --prompt "总结 src/server/index.ts 的 API 入口" --approval-mode plan
```

**模式说明**：
- 交互 / 非交互都支持：`--model`、`--resume`、`--include-dir`
- **仅非交互**：`--approval-mode`、`--output-format`、`--output-file`、`--log-file`

### Codex

```bash
bash scripts/agents/run-codex.sh
```

```bash
bash scripts/agents/run-codex.sh --prompt "修复 scripts/build-server.sh 的容错逻辑" --sandbox workspace-write
```

**模式说明**：
- 交互 / 非交互都支持：`--model`、`--sandbox`、`--add-dir`、`--search`、`--full-auto`
- **仅交互**：`--approval`
- **仅非交互**：`--output-file`、`--log-file`
- 当前 `codex-internal` 的非交互 `exec` 子命令**不单独接受 `--approval`**，默认 `approval=never`；如需更自动化的执行策略，请改用 `--full-auto`

## 2. 统一派工（推荐）

统一入口：

```bash
bash scripts/agents/dispatch-task.sh --role <research|implement|review> --task "..."
```

### 默认员工映射

- **`research`** → `gemini-internal`
- **`implement`** → `codex-internal`
- **`review`** → `claude-internal`

### 研究任务

```bash
bash scripts/agents/dispatch-task.sh \
  --role research \
  --task "定位课堂启动链路" \
  --paths "src/pages/NativeClassroom.tsx, src/router/index.tsx" \
  --acceptance "给出启动入口、核心调用链和关键文件"
```

### 实现任务

```bash
bash scripts/agents/dispatch-task.sh \
  --role implement \
  --task "为 scripts/agents 增加更清晰的帮助示例" \
  --path scripts/agents \
  --acceptance "帮助信息中包含 research / implement / review 示例"
```

### 评审任务

```bash
bash scripts/agents/dispatch-task.sh \
  --worker claude \
  --role review \
  --task "评审 scripts/agents 目录中的改动，重点看参数一致性和风险" \
  --path scripts/agents
```

**派工约束**：
- 未知 `--role` 会直接报错，不再静默路由到默认员工
- 自定义 `--run-id` 如果已存在，会直接报错，避免覆盖旧的 prompt / response / log

## 3. 输出和日志怎么找

每次 `dispatch-task.sh` 执行后，会生成固定的 `run-id`，并把结果写到：

- **prompt**: `.codebuddy/agents/output/<run-id>/prompt.txt`
- **response**: `.codebuddy/agents/output/<run-id>/response.txt`
- **metadata**: `.codebuddy/agents/output/<run-id>/metadata.json`
- **command**: `.codebuddy/agents/output/<run-id>/command.sh`
- **log**: `.codebuddy/agents/logs/<run-id>.log`

这样做的好处是：

- 失败时可以直接复盘 prompt 和实际命令。
- 之后做“员工接力”时，不必重新拼上下文。
- 结果、日志、命令分离，便于脚本再加工。

## 4. 低 token 使用原则

这套脚本默认遵循下面的 prompt 纪律：

- **只给任务目标**
- **只给相关路径**
- **只给验收标准**
- **不把整个聊天历史塞给员工**
- **运行态结果落文件，不靠长对话记忆**

如果你想继续压缩 token，优先做这三件事：

1. 把 `--paths` 收得更小。
2. 把 `--task` 写成单一目标，而不是多目标大杂烩。
3. 把 `--acceptance` 写成 1-3 条最关键的完成标准。

## 5. 注意事项

- `dispatch-task.sh` 会在运行前检查 `python3` 是否存在；缺失时会直接报错，而不是在模板渲染阶段静默失败。
- 四个脚本现在都会对**缺少参数值**给出友好报错，例如 `参数 --prompt 缺少值`。
- 三个包装器对**只在某一模式生效**的参数会直接 fail-fast，不再静默忽略。
- `codex-internal` 当前真实可用的非交互参数形式是 `exec --cd ... --sandbox ...`；`run-codex.sh` 已按这个形式对齐。

## 6. 建议的团队分工

推荐把三员工职责固定下来，减少重复劳动：

- **Gemini**：搜索、归纳、建立全局视图
- **Codex**：精确改码、补脚本、修局部逻辑
- **Claude**：评审、验收、收敛风险

这样一轮任务通常只需要：

1. `research` 建图
2. `implement` 落地
3. `review` 验收

比三个员工都去全仓重扫更省 token，也更不容易互相打架。

## 7. 自动上下文注入

默认情况下（未使用 `--no-default-context`），`dispatch-task.sh` 会根据任务类型自动补充上下文文件：

### 默认注入项目索引

- **文件路径**：`.codebuddy/project-index.md`
- **触发条件**：所有任务（除非使用 `--no-default-context`）
- **用途**：快速定位代码位置，避免全仓搜索

### OpenMAIC 源码分析文档

- **文件路径**：`docs/openmaic-source-analysis.md`
- **触发条件**：满足以下任一条件
  1. **关键词命中**：任务描述或标题包含以下任一关键词：
     - `OpenMAIC`、`架构`、`链路`、`源码`、`source`、`architecture`、`pipeline`、`upstream`
  2. **路径命中**：相关路径命中以下任一目录或文件：
     - `src/lib/openmaic/`、`src/components/openmaic/`、`src/services/openmaic/`、`src/stores/openmaic/`、`src/types/openmaic/`、`src/server/`、`docs/openmaic-source-analysis.md`
- **用途**：对 OpenMAIC/架构任务提供组件与 API 映射

bash scripts/agents/dispatch-task.sh \
  --role research \
  --task "分析某段代码" \
  --context-file .codebuddy/project-index.md
```

- 支持相对路径和绝对路径，会先归一化成稳定路径再去重
- 显式传入的文件如果与默认注入文件相同，不会重复添加
- 多个 `--context-file` 可以重复传入

### 去重机制

内部使用路径归一化（`normalize_realpath`）确保 `.codebuddy/project-index.md` 等文件不会因相对/绝对路径的差异而被重复注入。
