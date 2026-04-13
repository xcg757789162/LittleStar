#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# dispatch-task.sh — OpenMAIC 三员工统一派工入口
# 自动完成：角色选人、模板渲染、prompt/响应/日志落盘
# 运行态产物默认写入 .codebuddy/agents/
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/common.sh"

show_help() {
  cat <<'EOF'
用法:
  ./scripts/agents/dispatch-task.sh --role research --task "定位课堂启动链路"
  ./scripts/agents/dispatch-task.sh --role implement --task "为 dispatch 脚本补 README" --path scripts/agents --acceptance "README 包含用法示例"
  ./scripts/agents/dispatch-task.sh --worker claude --role review --task "评审 scripts/agents 目录改动"

核心参数:
  --role <name>                  任务角色：research / implement / review
  --task <text>                  任务描述（必填）
  --worker <name>                auto / claude / gemini / codex（默认 auto）
  --title <text>                 运行标题，用于生成更可读的 run id
  --path <path>                  相关路径，可重复传入
  --paths <csv>                  相关路径（逗号分隔）
  --context-file <file>          额外上下文文件路径，可重复传入
  --acceptance <text>            验收标准
  --model <name>                 模型名（传给 gemini/codex；claude 当前忽略）

辅助参数:
  --run-id <id>                  自定义 run id（若已存在会直接报错，避免覆盖旧结果）
  --dry-run                      只生成 prompt 和命令，不真正调用员工
  -h, --help                     显示帮助

默认路由:
  research  -> gemini-internal（只读/plan）
  implement -> codex-internal（workspace-write）
  review    -> claude-internal（plan）

依赖:
  - 需要已安装对应 internal CLI
  - 需要 python3（用于模板渲染和 metadata 输出）

固定输出目录:
  .codebuddy/agents/output/<run-id>/prompt.txt
  .codebuddy/agents/output/<run-id>/response.txt
  .codebuddy/agents/output/<run-id>/metadata.json
  .codebuddy/agents/output/<run-id>/command.sh
  .codebuddy/agents/logs/<run-id>.log
EOF
}

ROLE=""
TASK=""
WORKER="auto"
TITLE=""
ACCEPTANCE=""
MODEL=""
RUN_ID_OVERRIDE=""
DRY_RUN=false
PATH_LIST=()
CONTEXT_FILES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --role)
      require_option_value "$1" "${2-}"
      ROLE="$2"
      shift 2
      ;;
    --task)
      require_option_value "$1" "${2-}"
      TASK="$2"
      shift 2
      ;;
    --worker)
      require_option_value "$1" "${2-}"
      WORKER="$2"
      shift 2
      ;;
    --title)
      require_option_value "$1" "${2-}"
      TITLE="$2"
      shift 2
      ;;
    --path)
      require_option_value "$1" "${2-}"
      PATH_LIST+=("$2")
      shift 2
      ;;
    --paths)
      require_option_value "$1" "${2-}"
      while IFS= read -r line; do
        [[ -n "$line" ]] && PATH_LIST+=("$line")
      done < <(join_newlines_from_csv "$2")
      shift 2
      ;;
    --context-file)
      require_option_value "$1" "${2-}"
      CONTEXT_FILES+=("$2")
      shift 2
      ;;
    --acceptance)
      require_option_value "$1" "${2-}"
      ACCEPTANCE="$2"
      shift 2
      ;;
    --model)
      require_option_value "$1" "${2-}"
      MODEL="$2"
      shift 2
      ;;
    --run-id)
      require_option_value "$1" "${2-}"
      RUN_ID_OVERRIDE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      die "未知参数: $1"
      ;;
  esac
done

[[ -n "$ROLE" ]] || die "必须提供 --role"
[[ -n "$TASK" ]] || die "必须提供 --task"

case "$ROLE" in
  research|analyse|analyze|plan|implement|build|fix|execute|review|accept|qa)
    ;;
  *)
    die "不支持的 role: $ROLE（可用: research / implement / review）"
    ;;
esac

case "$WORKER" in
  auto|claude|gemini|codex)
    ;;
  *)
    die "不支持的 worker: $WORKER（可用: auto / claude / gemini / codex）"
    ;;
esac

if [[ "$WORKER" == "auto" ]]; then
  WORKER="$(role_default_worker "$ROLE")"
fi

if [[ ${#PATH_LIST[@]} -eq 0 ]]; then
  PATH_LIST+=("$PROJECT_ROOT")
fi

if [[ ${#CONTEXT_FILES[@]} -gt 0 ]]; then
  for file in "${CONTEXT_FILES[@]}"; do
    [[ -f "$file" ]] || die "context 文件不存在: $file"
  done
fi

ensure_runtime_dirs

TITLE_SLUG="$(slugify "${TITLE:-$TASK}")"
ROLE_SLUG="$(slugify "$ROLE")"
WORKER_SLUG="$(slugify "$WORKER")"
RUN_ID="${RUN_ID_OVERRIDE:-$(timestamp_id)-$WORKER_SLUG-$ROLE_SLUG-${TITLE_SLUG:-task}}"
RUN_DIR="$AGENTS_OUTPUT_DIR/$RUN_ID"
[[ ! -e "$RUN_DIR" ]] || die "run-id 已存在，请更换 --run-id：$RUN_ID"
mkdir -p "$RUN_DIR"

PROMPT_FILE="$RUN_DIR/prompt.txt"
RESPONSE_FILE="$RUN_DIR/response.txt"
COMMAND_FILE="$RUN_DIR/command.sh"
METADATA_FILE="$RUN_DIR/metadata.json"
LOG_FILE="$AGENTS_LOG_DIR/$RUN_ID.log"

PATHS="$(printf '%s\n' "${PATH_LIST[@]}")"
CONTEXT_FILES_TEXT=""
if [[ ${#CONTEXT_FILES[@]} -gt 0 ]]; then
  CONTEXT_FILES_TEXT="$(printf '%s\n' "${CONTEXT_FILES[@]}")"
fi

ROLE_GUIDANCE="$(role_guidance_text "$ROLE")"
WORKER_LABEL="${WORKER}-internal"
PATHS_BLOCK="$(bulletize "$PATHS")"
CONTEXT_FILES_BLOCK="$(bulletize "$CONTEXT_FILES_TEXT")"
ROLE_GUIDANCE_BLOCK="$(bulletize "$ROLE_GUIDANCE")"
TASK_BLOCK="$TASK"
ACCEPTANCE_BLOCK="$(bulletize "${ACCEPTANCE:-完成任务目标，并给出关键文件与验证信息。}")"

export PROJECT_ROOT WORKER ROLE TASK PATHS ACCEPTANCE RUN_ID PROMPT_FILE RESPONSE_FILE LOG_FILE COMMAND_FILE
export WORKER_LABEL PATHS_BLOCK CONTEXT_FILES_BLOCK ROLE_GUIDANCE_BLOCK TASK_BLOCK ACCEPTANCE_BLOCK

render_template "$AGENTS_TEMPLATE_DIR/dispatch-task.md" "$PROMPT_FILE"
write_metadata_json "$METADATA_FILE"

case "$WORKER" in
  claude)
    CMD=("$SCRIPT_DIR/run-claude.sh" "--prompt-file" "$PROMPT_FILE" "--permission-mode" "plan" "--output-file" "$RESPONSE_FILE" "--log-file" "$LOG_FILE")
    ;;
  gemini)
    CMD=("$SCRIPT_DIR/run-gemini.sh" "--prompt-file" "$PROMPT_FILE" "--approval-mode" "plan" "--output-file" "$RESPONSE_FILE" "--log-file" "$LOG_FILE")
    ;;
  codex)
    if [[ "$ROLE" == "implement" || "$ROLE" == "build" || "$ROLE" == "fix" || "$ROLE" == "execute" ]]; then
      CMD=("$SCRIPT_DIR/run-codex.sh" "--prompt-file" "$PROMPT_FILE" "--sandbox" "workspace-write" "--output-file" "$RESPONSE_FILE" "--log-file" "$LOG_FILE")
    else
      CMD=("$SCRIPT_DIR/run-codex.sh" "--prompt-file" "$PROMPT_FILE" "--sandbox" "read-only" "--output-file" "$RESPONSE_FILE" "--log-file" "$LOG_FILE")
    fi
    ;;
  *)
    die "不支持的 worker: $WORKER"
    ;;
esac

if [[ -n "$MODEL" && ( "$WORKER" == "gemini" || "$WORKER" == "codex" ) ]]; then
  CMD+=("--model" "$MODEL")
fi

save_command_file "$COMMAND_FILE" "${CMD[@]}"

log_section "三员工派工"
log_info "worker: $WORKER"
log_info "role: $ROLE"
log_info "run_id: $RUN_ID"
log_info "prompt: $PROMPT_FILE"
log_info "response: $RESPONSE_FILE"
log_info "log: $LOG_FILE"

if [[ "$DRY_RUN" == true ]]; then
  log_warn "dry-run 模式：仅生成 prompt / metadata / command，不执行员工"
  printf '%q ' "${CMD[@]}"
  printf '\n'
  exit 0
fi

"${CMD[@]}"

log_ok "派工完成：$RUN_ID"
log_info "如需查看结果，可打开: $RESPONSE_FILE"
