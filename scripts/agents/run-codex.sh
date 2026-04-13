#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# run-codex.sh — Codex Internal 启动脚本
# 交互模式：直接启动 TUI
# 非交互模式：使用 exec 子命令，并可落盘输出/日志
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/common.sh"

show_help() {
  cat <<'EOF'
用法:
  ./scripts/agents/run-codex.sh
  ./scripts/agents/run-codex.sh --prompt "修复 scripts/build-server.sh 的容错逻辑"
  ./scripts/agents/run-codex.sh --prompt-file /tmp/task.txt --sandbox workspace-write --full-auto

选项:
  --prompt <text>               非交互 prompt
  --prompt-file <file>          从文件读取非交互 prompt
  --model <name>                指定模型（两种模式都可用）
  --sandbox <mode>              沙箱模式：read-only/workspace-write/danger-full-access（默认 workspace-write）
  --approval <policy>           仅交互模式：untrusted/on-failure/on-request/never（默认 never）
  --add-dir <dir>               额外允许访问目录，可重复传入
  --full-auto                   启用 Codex full-auto；非交互时等价于 exec 的低摩擦自动执行
  --search                      启用联网搜索
  --output-file <file>          仅非交互模式：将 stdout 写入文件
  --log-file <file>             仅非交互模式：将 stdout/stderr + 命令摘要写入文件
  --dry-run                     仅打印实际命令，不执行
  -h, --help                    显示帮助

说明:
  - 当前 codex-internal 的非交互 exec 子命令不接受单独的 --approval；默认 approval=never。
  - 如需放宽非交互执行策略，请改用 --full-auto。
EOF
}

PROMPT=""
PROMPT_FILE=""
MODEL=""
SANDBOX_MODE="workspace-write"
APPROVAL_POLICY="never"
APPROVAL_SET=false
OUTPUT_FILE=""
LOG_FILE=""
DRY_RUN=false
FULL_AUTO=false
ENABLE_SEARCH=false
ADD_DIRS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prompt)
      require_option_value "$1" "${2-}"
      PROMPT="$2"
      shift 2
      ;;
    --prompt-file)
      require_option_value "$1" "${2-}"
      PROMPT_FILE="$2"
      shift 2
      ;;
    --model)
      require_option_value "$1" "${2-}"
      MODEL="$2"
      shift 2
      ;;
    --sandbox)
      require_option_value "$1" "${2-}"
      SANDBOX_MODE="$2"
      shift 2
      ;;
    --approval)
      require_option_value "$1" "${2-}"
      APPROVAL_POLICY="$2"
      APPROVAL_SET=true
      shift 2
      ;;
    --add-dir)
      require_option_value "$1" "${2-}"
      ADD_DIRS+=("$2")
      shift 2
      ;;
    --full-auto)
      FULL_AUTO=true
      shift
      ;;
    --search)
      ENABLE_SEARCH=true
      shift
      ;;
    --output-file)
      require_option_value "$1" "${2-}"
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --log-file)
      require_option_value "$1" "${2-}"
      LOG_FILE="$2"
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

if [[ -n "$PROMPT_FILE" ]]; then
  [[ -f "$PROMPT_FILE" ]] || die "prompt 文件不存在: $PROMPT_FILE"
  PROMPT="$(cat "$PROMPT_FILE")"
fi

if [[ "$FULL_AUTO" == true && "$SANDBOX_MODE" != "workspace-write" ]]; then
  die "--full-auto 需要 --sandbox workspace-write"
fi

ensure_node_bin_on_path
CODEX_BIN="$(resolve_internal_bin codex)"
ensure_runtime_dirs

if [[ -z "$PROMPT" ]]; then
  [[ -z "$OUTPUT_FILE" ]] || die "--output-file 仅非交互模式可用"
  [[ -z "$LOG_FILE" ]] || die "--log-file 仅非交互模式可用"

  CMD=("$CODEX_BIN" "--cd" "$PROJECT_ROOT")
  [[ -n "$MODEL" ]] && CMD+=("--model" "$MODEL")

  if [[ "$FULL_AUTO" == true ]]; then
    CMD+=("--full-auto")
  else
    CMD+=("--sandbox" "$SANDBOX_MODE" "--ask-for-approval" "$APPROVAL_POLICY")
  fi
else
  [[ "$APPROVAL_SET" == false ]] || die "--approval 当前仅交互模式支持；非交互 exec 默认 approval=never，可改用 --full-auto"

  CMD=("$CODEX_BIN" "exec" "--cd" "$PROJECT_ROOT")
  [[ -n "$MODEL" ]] && CMD+=("--model" "$MODEL")

  if [[ "$FULL_AUTO" == true ]]; then
    CMD+=("--full-auto")
  else
    CMD+=("--sandbox" "$SANDBOX_MODE")
  fi
fi

[[ "$ENABLE_SEARCH" == true ]] && CMD+=("--search")
if [[ ${#ADD_DIRS[@]} -gt 0 ]]; then
  for dir in "${ADD_DIRS[@]}"; do
    CMD+=("--add-dir" "$dir")
  done
fi

if [[ -n "$PROMPT" ]]; then
  CMD+=("$PROMPT")
fi

if [[ "$DRY_RUN" == true ]]; then
  printf '%q ' "${CMD[@]}"
  printf '\n'
  exit 0
fi

if [[ -z "$PROMPT" ]]; then
  exec "${CMD[@]}"
fi

run_command_capture "$OUTPUT_FILE" "$LOG_FILE" "${CMD[@]}"
