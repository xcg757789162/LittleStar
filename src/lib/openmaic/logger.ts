const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

/** 浏览器安全地读取环境变量（兼容 Vite import.meta.env / process.env / 纯浏览器） */
function getEnv(key: string): string | undefined {
  try {
    // Vite 注入的环境变量（import.meta.env.VITE_xxx）
    if (typeof import.meta !== 'undefined' && (import.meta as Record<string, unknown>).env) {
      const viteEnv = (import.meta as unknown as { env: Record<string, string> }).env
      const viteKey = `VITE_${key}`
      if (viteEnv[viteKey]) return viteEnv[viteKey]
    }
  } catch { /* 非 Vite 环境 */ }
  try {
    // Node.js / 打包工具注入
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] ?? undefined
    }
  } catch { /* 纯浏览器环境无 process */ }
  return undefined
}

function getMinLevel(): LogLevel {
  const env = (getEnv('LOG_LEVEL') ?? 'info').toLowerCase();
  return env in LOG_LEVELS ? (env as LogLevel) : 'info';
}

function isJsonFormat(): boolean {
  return getEnv('LOG_FORMAT') === 'json';
}

/** 可选：通过 LOG_TAG_FILTER 只输出匹配的标签（逗号分隔），为空则全输出 */
function isTagEnabled(tag: string): boolean {
  const filter = getEnv('LOG_TAG_FILTER')
  if (!filter) return true
  return filter.split(',').some((t) => t.trim() === tag || t.trim() === '*')
}

function formatLine(level: LogLevel, tag: string, args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const upperLevel = level.toUpperCase();
  const msg = args
    .map((a) =>
      a instanceof Error ? (a.stack ?? a.message) : typeof a === 'string' ? a : JSON.stringify(a),
    )
    .join(' ');

  if (isJsonFormat()) {
    return JSON.stringify({ timestamp, level: upperLevel, tag, message: msg });
  }
  return `[${timestamp}] [${upperLevel}] [${tag}] ${msg}`;
}

export interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

export function createLogger(tag: string): Logger {
  const emit = (level: LogLevel, args: unknown[]) => {
    if (LOG_LEVELS[level] < LOG_LEVELS[getMinLevel()]) return;
    if (!isTagEnabled(tag)) return;

    const line = formatLine(level, tag, args);

    // Console output
    const fn =
      level === 'debug'
        ? console.debug
        : level === 'warn'
          ? console.warn
          : level === 'error'
            ? console.error
            : console.log;
    fn(line);
  };

  return {
    debug: (...args: unknown[]) => emit('debug', args),
    info: (...args: unknown[]) => emit('info', args),
    warn: (...args: unknown[]) => emit('warn', args),
    error: (...args: unknown[]) => emit('error', args),
  };
}
