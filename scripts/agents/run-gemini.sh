#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# run-gemini.sh — Gemini Internal 启动脚本
# 交互模式：直接启动 TUI
# 非交互模式：使用 -p/--prompt 并可落盘输出/日志
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/common.sh"

show_help() {
  cat <<'EOF'
用法:
  ./scripts/agents/run-gemini.sh
  ./scripts/agents/run-gemini.sh --prompt "请总结 src/server/index.ts 的职责"
  ./scripts/agents/run-gemini.sh --prompt-file /tmp/task.txt --output-file /tmp/out.txt --log-file /tmp/log.txt

选项:
  --prompt <text>               非交互 prompt
  --prompt-file <file>          从文件读取非交互 prompt
  --model <name>                指定模型（两种模式都可用）
  --approval-mode <mode>        仅非交互模式：default/auto_edit/yolo/plan（默认 default）
  --output-format <format>      仅非交互模式：text/json/stream-json（默认 text）
  --include-dir <dir>           额外包含目录，可重复传入
  --resume <id>                 恢复指定 session（两种模式都可用）
  --output-file <file>          仅非交互模式：将 stdout 写入文件
  --log-file <file>             仅非交互模式：将 stdout/stderr + 命令摘要写入文件
  --dry-run                     仅打印实际命令，不执行
  -h, --help                    显示帮助
EOF
}

PROMPT=""
PROMPT_FILE=""
MODEL=""
APPROVAL_MODE="default"
APPROVAL_MODE_SET=false
OUTPUT_FORMAT="text"
OUTPUT_FORMAT_SET=false
RESUME_ID=""
OUTPUT_FILE=""
LOG_FILE=""
DRY_RUN=false
INCLUDE_DIRS=()

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
    --approval-mode)
      require_option_value "$1" "${2-}"
      APPROVAL_MODE="$2"
      APPROVAL_MODE_SET=true
      shift 2
      ;;
    --output-format)
      require_option_value "$1" "${2-}"
      OUTPUT_FORMAT="$2"
      OUTPUT_FORMAT_SET=true
      shift 2
      ;;
    --include-dir)
      require_option_value "$1" "${2-}"
      INCLUDE_DIRS+=("$2")
      shift 2
      ;;
    --resume)
      require_option_value "$1" "${2-}"
      RESUME_ID="$2"
      shift 2
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

if [[ -z "$PROMPT" ]]; then
  [[ "$APPROVAL_MODE_SET" == false ]] || die "--approval-mode 仅非交互模式可用"
  [[ "$OUTPUT_FORMAT_SET" == false ]] || die "--output-format 仅非交互模式可用"
  [[ -z "$OUTPUT_FILE" ]] || die "--output-file 仅非交互模式可用"
  [[ -z "$LOG_FILE" ]] || die "--log-file 仅非交互模式可用"
fi

ensure_node_bin_on_path
GEMINI_BIN="$(resolve_internal_bin gemini)"
ensure_runtime_dirs

CMD=("$GEMINI_BIN")

if [[ -z "$PROMPT" ]]; then
  [[ -n "$MODEL" ]] && CMD+=("--model" "$MODEL")
  [[ -n "$RESUME_ID" ]] && CMD+=("--resume" "$RESUME_ID")
else
  CMD+=("--prompt" "$PROMPT" "--output-format" "$OUTPUT_FORMAT" "--approval-mode" "$APPROVAL_MODE")
  [[ -n "$MODEL" ]] && CMD+=("--model" "$MODEL")
  [[ -n "$RESUME_ID" ]] && CMD+=("--resume" "$RESUME_ID")
fi

CMD+=("--include-directories" "$PROJECT_ROOT")
if [[ ${#INCLUDE_DIRS[@]} -gt 0 ]]; then
  for dir in "${INCLUDE_DIRS[@]}"; do
    CMD+=("--include-directories" "$dir")
  done
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
