# OpenSpec 集成提案技能使用说明

## 概述

`openspec-integrated-superpowers` 是一个将 Superpowers 的 brainstorming 流程与 OpenSpec 工作流深度集成的技能。它提供从设计讨论到代码实施的完整闭环，替代了传统的 `brainstorming → writing-plans → docs/plans/` 独立流程。

**核心特性**:
- 统一的设计讨论 → 文档生成 → 代码实施流程
- 支持 TDD 和非 TDD 任务执行
- 内置 PreCI 代码规范检查和自动修正
- 智能代码审查和分支管理

集成操作和实践案例可见KM文章：https://km.woa.com/group/53000/articles/show/623693

---

## 触发命令

| 命令 | 功能 | 对应阶段 |
|------|------|----------|
| `/opsx:propose` 或 `/openspec:proposal` | 开始新功能/变更提案 | Phase 1 + 1.5 + 2 |
| `/opsx:apply` 或 `/openspec:apply` | 实施已确认的提案 | Phase 3 |
| `/opsx:rollback` 或 "回滚" | 紧急回滚未提交变更 | 回滚流程 |

---

## 工作流程

### Phase 1: 设计讨论 (Brainstorming)

**触发**: `/opsx:propose`

**流程**:
1. 自动调用 `superpowers:brainstorming` 技能进行设计讨论
2. AI 探索项目上下文，了解需求和约束
3. 提出 2-3 个方案及权衡分析
4. 分节呈现设计方案，逐节获取用户确认

**完成标准**: 用户对完整设计方案给出明确确认（如"确认"/"ok"/"同意"）

**⚠️ 重要限制**:
- 本阶段**禁止创建任何文件**
- 禁止调用 `writing-plans` 技能
- 禁止在 `docs/plans/` 下创建文件

---

### Phase 1.5: Worktree 环境检查

**触发**: Phase 1 完成后自动执行

**检测逻辑**:
```bash
git rev-parse --git-dir
```

| 检测结果 | 处理方式 |
|----------|----------|
| 包含 `.git/worktrees/` | 已在 worktree 中，直接进入 Phase 2 |
| 输出 `.git`（主仓库） | 提示用户选择：创建 worktree / 当前继续 / 取消 |
| 执行失败（非 Git 仓库） | 终止流程，提示需要 Git 环境 |

**配置 `skip_worktree_check: true`**: 跳过检测，直接进入 Phase 2

---

### Phase 2: 生成 OpenSpec 文档

**触发**: Phase 1.5 完成后

**生成的文档结构**:
```
openspec/changes/<kebab-case-feature-name>/
├── proposal.md      # 提案概述（Why/What/Impact）
├── specs/
│   └── <feature>.md # 详细需求规格（Gherkin 格式）
├── design.md        # 技术设计文档
└── tasks.md         # 任务清单（含 TDD 子任务）
```

**tasks.md 任务类型**:

| 类型 | 子任务结构 | 适用场景 |
|------|-----------|----------|
| TDD 任务 | N.M.1→N.M.5（写失败测试→验证失败→写最小实现→验证通过→重构） | 新功能/Bug修复/复杂逻辑 |
| 非 TDD 任务 | N.M.1→N.M.3（执行变更→验证无回归→检查完整性） | 配置修改/重命名/文档更新/依赖升级 |

**特殊任务组**:
- `N-1. PreCI 代码规范检查`: 所有实现任务完成后执行
- `N. Documentation Sync`: 最终文档同步（必需）

**完成后提示**:
```
OpenSpec documents generated in branch feature/<branch-name> at <worktree-path>.
Please review the files under openspec/changes/<name>/, then run /opsx:apply to start implementation.
```

---

### Phase 3: 实施 (Apply)

**触发**: `/opsx:apply`

#### 前置检查

1. 确认当前分支为 `feature/<name>`（非 master/main）
2. 确认当前路径是 worktree 路径
3. 确认 `openspec/changes/<name>/tasks.md` 存在
4. 读取配置（见下方"配置项"）
5. 读取 tasks.md，生成完整 TODO 列表
6. 检测中断恢复（检查是否有已标记 `[x]` 的任务）

#### Execution Mode 选择

前置检查通过后，AI 会根据任务规模推荐执行模式：

| 模式 | 推荐条件 | 特点 |
|------|----------|------|
| `agent` | 顶层任务 ≤ 5 个，逻辑连续 | 主代理直接执行，上下文连续 |
| `subagent` | 顶层任务 > 5 个，或多独立模块 | 每任务派独立子代理+两阶段审查，执行时间较长 |

**用户必须选择模式后才能继续执行**。

#### 任务执行流程

**TDD 任务**（5 步）:
1. **N.M.1** 写失败测试
2. **N.M.2** 验证测试失败（意外结果时调用 `systematic-debugging`）
3. **N.M.3** 写最小实现
4. **N.M.4** 验证测试通过（意外结果时调用 `systematic-debugging`）
5. **N.M.5** 重构

**非 TDD 任务**（3 步）:
1. **N.M.1** 执行变更
2. **N.M.2** 验证无回归
3. **N.M.3** 检查完整性

#### 代码审查

每个任务组完成后执行：
1. 调用 `superpowers:verification-before-completion` 运行全量测试
2. 调用 `superpowers:requesting-code-review` 执行审查

**审查结果处理**:
- 存在 Critical/Important 问题：输出审查结果，停止等待用户指令
- 仅有 Minor 或无问题：自动继续下一任务

**用户选项**（存在 Critical/Important 时）:
```
请选择操作：
a. 处理指定条目 — 输入 `处理 1,2` 修复指定编号后继续
b. 全部处理 — 修复所有 Critical 和 Important 后继续
c. 跳过 — 不修改代码，直接继续下一任务
d. 跳过并备注 — 输入 `跳过，备注：<原因>` 跳过并记录原因
```

---

## PreCI 代码规范检查

**执行时机**: 所有实现任务和代码审查完成后，Documentation Sync 之前

**配置 `skip_preci`**:
- `false`（默认）: 强制检查，任何失败必须用户确认后才能继续
- `true`: 跳过检查

**检查流程**:
1. **检测 preci 安装**: 优先 `~/PreCI/preci`，备选 `command -v preci`
2. **检测 PreCI Server 状态**: 未启动则尝试启动（最多等待 10 秒）
3. **执行扫描**（按顺序）:
   - `scan --diff`: 扫描未暂存变更
   - `scan --pre-commit`: 扫描已暂存变更
4. **自动修正**: 按告警类型自动修复（最多 `max_auto_fix_rounds` 次）
5. **处理剩余告警**: 无法自动修正时暂停，等待用户确认

**自动修正规则**:

| 告警类型 | 自动修正策略 |
|----------|-------------|
| `inner_ip_leak` | 添加 `// NOCC:inner_ip_leak(该IP已脱敏)` 注释 |
| `sensitive_info` | 脱敏处理或添加忽略注释 |
| `code_style` | 修正缩进、空格、换行 |
| `naming_convention` | 修正命名（谨慎处理） |

---

## 配置项

可在项目规则文件中声明以下配置覆盖默认值：

```yaml
execution_mode: agent          # agent: 主代理直接执行 / subagent: 每任务派独立子代理
review_mode: per_task          # per_task: 每个任务组后审查 / final: 全部完成后统一审查
review_action: confirm         # confirm: 审查后等待用户指令 / auto: 自动修复 Critical 问题
skip_preci: false              # true: 跳过 PreCI 检查
skip_worktree_check: false     # true: 跳过 worktree 检查
max_auto_fix_rounds: 3         # PreCI 自动修正最大重试次数（1-10）
tdd_strict: true               # false: 允许非 TDD 任务跳过验证
```

---

## 紧急回滚

**触发**: `/opsx:rollback` 或输入 "回滚"

**流程**:
1. 执行 `git diff --stat` 显示所有未提交变更
2. 询问用户确认回滚范围
3. 执行 `git checkout -- .` 回滚所有未暂存变更
4. 重新读取 tasks.md，将已回滚任务重置为 `[ ]`

---

## 文档同步 (Documentation Sync)

**执行时机**: 所有任务完成后

**同步内容**:

| 文档 | 更新时机 |
|------|----------|
| `tasks.md` | 任务完成时标记 `[x]`，发现新任务时追加 |
| `design.md` | 每次代码变更后记录技术决策和实现细节 |
| `proposal.md` | 变更范围或影响发生变化时更新 |
| `specs/*.md` | 需求发生变化时更新 |

**⚠️ 禁止行为**:
- 禁止将审查结果、审查意见写入 tasks.md 或任何 OpenSpec 文档
- 禁止在 `docs/` 根目录下直接创建文件（必须在 `docs/<change-name>/` 子目录下）

---

## HARD STOPS（禁止行为）

违反以下规则时 AI 必须立即停止并报错：

| ID | 阶段 | 规则 | 违规后果 |
|----|------|------|----------|
| P1.1 | 1 | 禁止创建任何文件或目录 | 立即停止 |
| P1.2 | 1 | 禁止跳过 `superpowers:brainstorming` 调用 | 立即停止 |
| P1.3 | 1 | 禁止在用户确认前进入 Phase 1.5 | 停止并追问 |
| P1.5.1 | 1.5 | 禁止跳过 Phase 1.5 环境检查 | 立即停止 |
| P2.1 | 2 | 禁止调用 writing-plans 技能 | 立即停止 |
| P2.2 | 2 | 禁止在 docs/plans/ 下创建文件 | 立即停止 |
| P2.3 | 2 | 禁止凭记忆生成 tasks.md | 立即停止 |
| P3.1 | 3 | 禁止跳过 execution_mode 询问 | 立即停止 |
| P3.2 | 3 | 禁止跳过任务执行步骤 | 立即停止 |
| P3.3 | 3 | 禁止跳过代码审查 | 立即停止 |
| P3.6 | 3 | 禁止在完成前跳过 `finishing-a-development-branch` | 立即停止 |

---

## 使用示例

### 示例 1: 新功能提案

```
用户: /opsx:propose

AI: [调用 brainstorming 技能进行设计讨论...]

用户: 确认

AI: [Phase 1.5 环境检查...]

AI: [Phase 2 生成 OpenSpec 文档...]

AI: OpenSpec documents generated in branch feature/user-auth at /path/to/worktree.
Please review the files under openspec/changes/user-auth/, then run /opsx:apply to start implementation.
```

### 示例 2: 实施提案

```
用户: /opsx:apply

AI: [前置检查通过]

AI: 根据本次任务规模（共 3 个顶层任务），推荐执行模式：
1. agent（推荐）— 主代理直接执行
2. subagent — 每任务派独立子代理

请选择执行模式（输入 1 或 2）：

用户: 1

AI: [开始执行任务 1.1, 1.2, 1.3 代码审查, 2.1...]

AI: [PreCI 代码规范检查...]

AI: [Documentation Sync...]

AI: [调用 finishing-a-development-branch 引导分支决策]
```

### 示例 3: 紧急回滚

```
用户: /opsx:rollback

AI: 以下文件将被回滚：
    M src/auth.js
    M src/user.js
    
    确认回滚？（yes/no）

用户: yes

AI: [执行回滚，重置 tasks.md 状态]
```

---

## 注意事项

1. **设计阶段不创建文件**: Phase 1 只进行讨论，所有文档在 Phase 2 生成
2. **必须用户确认**: Phase 1 设计完成后必须获得用户明确确认才能进入 Phase 2
3. **worktree 推荐**: 建议在 worktree 中生成文档和实施，保持主分支干净
4. **常规任务组强制审查**: 包含 TDD 任务或业务逻辑变更的任务组必须进行代码审查，不可跳过
5. **轻量任务组自动合并审查**: 满足条件的简单机械性变更（版本号升级、DDL 生成等）跳过独立审查，变更纳入后续常规任务组统一审查
6. **PreCI 强制检查**: 默认配置下 PreCI 检查失败必须用户确认后才能继续
7. **文档同步**: 代码变更后自动同步 OpenSpec 文档，无需手动提醒

---

## 相关文件

- `SKILL.md` - 技能主入口和路由定义
- `phases/phase1-propose.md` - Phase 1/1.5/2 详细规范
- `phases/phase3-execution.md` - Phase 3 详细规范
- `templates/tasks-template.md` - tasks.md 模板
- `scripts/preci_install.sh` - PreCI 安装脚本
