#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# run-claude.sh — Claude Internal 启动脚本
# 交互模式：直接启动 TUI
# 非交互模式：使用 -p/--print 并可落盘输出/日志
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/common.sh"

show_help() {
  cat <<'EOF'
用法:
  ./scripts/agents/run-claude.sh
  ./scripts/agents/run-claude.sh --prompt "检查 src/router/index.tsx"
  ./scripts/agents/run-claude.sh --prompt-file /tmp/task.txt --output-file /tmp/out.txt --log-file /tmp/log.txt

选项:
  --prompt <text>                 非交互 prompt
  --prompt-file <file>            从文件读取非交互 prompt
  --agent <name>                  指定 Claude Internal agent（两种模式都可用）
  --system-prompt <text>          仅非交互模式：覆盖系统提示词
  --append-system-prompt <text>   仅非交互模式：在默认系统提示词后追加内容
  --permission-mode <mode>        仅非交互模式：权限模式（默认 bypassPermissions）
  --output-format <format>        仅非交互模式：text/json/stream-json（默认 text）
  --add-dir <dir>                 额外允许访问目录，可重复传入
  --resume <id>                   仅交互模式：恢复指定 session
  --continue                      仅交互模式：在当前目录继续最近一次会话
  --keep-session                  仅非交互模式：保留 session 持久化
  --output-file <file>            仅非交互模式：将 stdout 写入文件
  --log-file <file>               仅非交互模式：将 stdout/stderr + 命令摘要写入文件
  --dry-run                       仅打印实际命令，不执行
  -h, --help                      显示帮助
EOF
}

PROMPT=""
PROMPT_FILE=""
AGENT_NAME=""
SYSTEM_PROMPT=""
APPEND_SYSTEM_PROMPT=""
PERMISSION_MODE="bypassPermissions"
PERMISSION_MODE_SET=false
OUTPUT_FORMAT="text"
OUTPUT_FORMAT_SET=false
OUTPUT_FILE=""
LOG_FILE=""
RESUME_ID=""
CONTINUE_SESSION=false
KEEP_SESSION=false
DRY_RUN=false
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
    --agent)
      require_option_value "$1" "${2-}"
      AGENT_NAME="$2"
      shift 2
      ;;
    --system-prompt)
      require_option_value "$1" "${2-}"
      SYSTEM_PROMPT="$2"
      shift 2
      ;;
    --append-system-prompt)
      require_option_value "$1" "${2-}"
      APPEND_SYSTEM_PROMPT="$2"
      shift 2
      ;;
    --permission-mode)
      require_option_value "$1" "${2-}"
      PERMISSION_MODE="$2"
      PERMISSION_MODE_SET=true
      shift 2
      ;;
    --output-format)
      require_option_value "$1" "${2-}"
      OUTPUT_FORMAT="$2"
      OUTPUT_FORMAT_SET=true
      shift 2
      ;;
    --add-dir)
      require_option_value "$1" "${2-}"
      ADD_DIRS+=("$2")
      shift 2
      ;;
    --resume)
      require_option_value "$1" "${2-}"
      RESUME_ID="$2"
      shift 2
      ;;
    --continue)
      CONTINUE_SESSION=true
      shift
      ;;
    --keep-session)
      KEEP_SESSION=true
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

if [[ -z "$PROMPT" ]]; then
  [[ -z "$SYSTEM_PROMPT" ]] || die "--system-prompt 仅非交互模式可用"
  [[ -z "$APPEND_SYSTEM_PROMPT" ]] || die "--append-system-prompt 仅非交互模式可用"
  [[ "$PERMISSION_MODE_SET" == false ]] || die "--permission-mode 仅非交互模式可用"
  [[ "$OUTPUT_FORMAT_SET" == false ]] || die "--output-format 仅非交互模式可用"
  [[ "$KEEP_SESSION" == false ]] || die "--keep-session 仅非交互模式可用"
  [[ -z "$OUTPUT_FILE" ]] || die "--output-file 仅非交互模式可用"
  [[ -z "$LOG_FILE" ]] || die "--log-file 仅非交互模式可用"
else
  [[ -z "$RESUME_ID" ]] || die "--resume 仅交互模式可用"
  [[ "$CONTINUE_SESSION" == false ]] || die "--continue 仅交互模式可用"
fi

ensure_node_bin_on_path
CLAUDE_BIN="$(resolve_internal_bin claude)"
ensure_runtime_dirs

CMD=("$CLAUDE_BIN")

if [[ -z "$PROMPT" ]]; then
  CMD+=("--add-dir" "$PROJECT_ROOT")
  if [[ ${#ADD_DIRS[@]} -gt 0 ]]; then
    for dir in "${ADD_DIRS[@]}"; do
      CMD+=("--add-dir" "$dir")
    done
  fi
  [[ -n "$AGENT_NAME" ]] && CMD+=("--agent" "$AGENT_NAME")
  [[ -n "$RESUME_ID" ]] && CMD+=("--resume" "$RESUME_ID")
  [[ "$CONTINUE_SESSION" == true ]] && CMD+=("--continue")
else
  CMD+=("-p" "$PROMPT" "--output-format" "$OUTPUT_FORMAT" "--permission-mode" "$PERMISSION_MODE" "--add-dir" "$PROJECT_ROOT")
  if [[ ${#ADD_DIRS[@]} -gt 0 ]]; then
    for dir in "${ADD_DIRS[@]}"; do
      CMD+=("--add-dir" "$dir")
    done
  fi
  [[ -n "$AGENT_NAME" ]] && CMD+=("--agent" "$AGENT_NAME")
  [[ -n "$SYSTEM_PROMPT" ]] && CMD+=("--system-prompt" "$SYSTEM_PROMPT")
  [[ -n "$APPEND_SYSTEM_PROMPT" ]] && CMD+=("--append-system-prompt" "$APPEND_SYSTEM_PROMPT")
  [[ "$KEEP_SESSION" == false ]] && CMD+=("--no-session-persistence")
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
