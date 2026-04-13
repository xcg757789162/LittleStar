#!/usr/bin/env bash

# ============================================================
# OpenMAIC 三员工调度公共库
# 统一：目录、日志、二进制探测、模板渲染、命令执行捕获
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

AGENTS_RUNTIME_DIR="${AGENTS_RUNTIME_DIR:-$PROJECT_ROOT/.codebuddy/agents}"
AGENTS_LOG_DIR="${AGENTS_LOG_DIR:-$AGENTS_RUNTIME_DIR/logs}"
AGENTS_OUTPUT_DIR="${AGENTS_OUTPUT_DIR:-$AGENTS_RUNTIME_DIR/output}"
AGENTS_TMP_DIR="${AGENTS_TMP_DIR:-$AGENTS_RUNTIME_DIR/tmp}"
AGENTS_TEMPLATE_DIR="${AGENTS_TEMPLATE_DIR:-$SCRIPT_DIR/templates}"
AGENTS_NODE_BIN_DIR="${AGENTS_NODE_BIN_DIR:-$HOME/.nvm/versions/node/v20.20.2/bin}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()      { echo -e "${GREEN}[  OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[FAIL]${NC} $1"; }
log_section() { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}"; }

die() {
  log_error "$1"
  exit 1
}

require_option_value() {
  local option="${1:-}"
  local value="${2-}"

  if [[ -z "$value" || "$value" == --* ]]; then
    die "参数 $option 缺少值"
  fi
}

ensure_python3() {
  command -v python3 >/dev/null 2>&1 || die "未找到 python3：dispatch-task.sh 依赖 python3 渲染模板并写入 metadata"
}

ensure_runtime_dirs() {
  mkdir -p "$AGENTS_RUNTIME_DIR" "$AGENTS_LOG_DIR" "$AGENTS_OUTPUT_DIR" "$AGENTS_TMP_DIR"
}

ensure_node_bin_on_path() {
  if [[ -d "$AGENTS_NODE_BIN_DIR" ]]; then
    case ":$PATH:" in
      *":$AGENTS_NODE_BIN_DIR:"*) ;;
      *) export PATH="$AGENTS_NODE_BIN_DIR:$PATH" ;;
    esac
  fi

  if ! command -v node >/dev/null 2>&1 && [[ -s "$HOME/.nvm/nvm.sh" ]]; then
    export NVM_DIR="$HOME/.nvm"
    # shellcheck disable=SC1090
    source "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true
  fi
}

resolve_internal_bin() {
  local worker="$1"
  local env_var=""
  local fallback=""

  case "$worker" in
    claude)
      env_var="${CLAUDE_INTERNAL_BIN:-}"
      fallback="$AGENTS_NODE_BIN_DIR/claude-internal"
      ;;
    gemini)
      env_var="${GEMINI_INTERNAL_BIN:-}"
      fallback="$AGENTS_NODE_BIN_DIR/gemini-internal"
      ;;
    codex)
      env_var="${CODEX_INTERNAL_BIN:-}"
      fallback="$AGENTS_NODE_BIN_DIR/codex-internal"
      ;;
    *)
      die "未知 worker: $worker"
      ;;
  esac

  ensure_node_bin_on_path

  if [[ -n "$env_var" && -x "$env_var" ]]; then
    echo "$env_var"
    return 0
  fi

  if command -v "${worker}-internal" >/dev/null 2>&1; then
    command -v "${worker}-internal"
    return 0
  fi

  if [[ -x "$fallback" ]]; then
    echo "$fallback"
    return 0
  fi

  die "未找到 ${worker}-internal，可通过环境变量指定路径"
}

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g'
}

timestamp_id() {
  date +%Y%m%d-%H%M%S
}

join_newlines_from_csv() {
  local value="${1:-}"
  if [[ -z "$value" ]]; then
    return 0
  fi
  echo "$value" | tr ',' '\n' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' | sed '/^$/d'
}

bulletize() {
  local content="${1:-}"
  if [[ -z "$content" ]]; then
    echo "- （未提供）"
    return 0
  fi

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    echo "- $line"
  done <<< "$content"
}

render_template() {
  local template_path="$1"
  local output_path="$2"

  ensure_python3

  TEMPLATE_PATH="$template_path" OUTPUT_PATH="$output_path" python3 <<'PY'
import os
import pathlib
import re

src = pathlib.Path(os.environ['TEMPLATE_PATH']).read_text(encoding='utf-8')
pattern = re.compile(r'\{\{([A-Z0-9_]+)\}\}')
rendered = pattern.sub(lambda m: os.environ.get(m.group(1), ''), src)
pathlib.Path(os.environ['OUTPUT_PATH']).write_text(rendered, encoding='utf-8')
PY
}

write_metadata_json() {
  local output_path="$1"

  ensure_python3

  OUTPUT_PATH="$output_path" python3 <<'PY'
import json
import os
import pathlib

payload = {
    'run_id': os.environ.get('RUN_ID', ''),
    'worker': os.environ.get('WORKER', ''),
    'role': os.environ.get('ROLE', ''),
    'task': os.environ.get('TASK', ''),
    'project_root': os.environ.get('PROJECT_ROOT', ''),
    'paths': [p for p in os.environ.get('PATHS', '').split('\n') if p],
    'acceptance': os.environ.get('ACCEPTANCE', ''),
    'prompt_file': os.environ.get('PROMPT_FILE', ''),
    'response_file': os.environ.get('RESPONSE_FILE', ''),
    'log_file': os.environ.get('LOG_FILE', ''),
    'command_file': os.environ.get('COMMAND_FILE', ''),
}
pathlib.Path(os.environ['OUTPUT_PATH']).write_text(
    json.dumps(payload, ensure_ascii=False, indent=2) + '\n',
    encoding='utf-8',
)
PY
}

save_command_file() {
  local output_path="$1"
  shift
  printf '%q ' "$@" > "$output_path"
  printf '\n' >> "$output_path"
}

run_command_capture() {
  local output_file="$1"
  local log_file="$2"
  shift 2

  ensure_runtime_dirs

  local stdout_tmp="$AGENTS_TMP_DIR/stdout-$$-$(date +%s).txt"
  local stderr_tmp="$AGENTS_TMP_DIR/stderr-$$-$(date +%s).txt"
  local status=0

  set +e
  "$@" >"$stdout_tmp" 2>"$stderr_tmp"
  status=$?
  set -e

  if [[ -f "$stdout_tmp" ]]; then
    cat "$stdout_tmp"
  fi
  if [[ -s "$stderr_tmp" ]]; then
    cat "$stderr_tmp" >&2
  fi

  if [[ -n "$output_file" ]]; then
    cp "$stdout_tmp" "$output_file"
  fi

  if [[ -n "$log_file" ]]; then
    {
      echo "# command"
      printf '%q ' "$@"
      echo
      echo "# exit_code: $status"
      echo
      echo "## stdout"
      cat "$stdout_tmp"
      echo
      echo "## stderr"
      cat "$stderr_tmp"
    } > "$log_file"
  fi

  rm -f "$stdout_tmp" "$stderr_tmp"
  return "$status"
}

role_default_worker() {
  case "$1" in
    research|analyse|analyze|plan)
      echo "gemini"
      ;;
    implement|build|fix|execute)
      echo "codex"
      ;;
    review|accept|qa)
      echo "claude"
      ;;
    *)
      die "不支持的 role: $1（可用: research / implement / review）"
      ;;
  esac
}

role_guidance_text() {
  case "$1" in
    research|analyse|analyze|plan)
      cat <<'EOF'
只做调查、分析、归纳，不修改代码。优先阅读给定路径，输出尽量短，并给出关键证据路径。
EOF
      ;;
    implement|build|fix|execute)
      cat <<'EOF'
在允许的工作区内直接完成最小必要修改。避免越界，不要重写无关文件，最后给出变更文件和验证结果。
EOF
      ;;
    review|accept|qa)
      cat <<'EOF'
以评审/验收视角检查结果。默认不修改文件，重点指出风险、遗漏验证和可选改进项。
EOF
      ;;
    *)
      cat <<'EOF'
按任务要求执行，并保持最小上下文、最小改动、最短结论。
EOF
      ;;
  esac
}
