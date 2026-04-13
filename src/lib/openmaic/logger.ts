const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

function getEnv(key: string): string | undefined {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as Record<string, unknown>).env) {
      const viteEnv = (import.meta as unknown as { env: Record<string, string> }).env
      const viteKey = `VITE_${key}`
      if (viteEnv[viteKey]) return viteEnv[viteKey]
    }
  } catch { /* non-Vite env */ }
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] ?? undefined
    }
  } catch { /* pure browser */ }
  return undefined
}

function getMinLevel(): LogLevel {
  const env = (getEnv('LOG_LEVEL') ?? 'info').toLowerCase();
  return env in LOG_LEVELS ? (env as LogLevel) : 'info';
}

function isJsonFormat(): boolean {
  return getEnv('LOG_FORMAT') === 'json';
}

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

// ===== In-memory ring buffer for diagnostic panel =====

export interface LogEntry {
  timestamp: number
  level: LogLevel
  tag: string
  message: string
}

const LOG_BUFFER_SIZE = 200
const logBuffer: LogEntry[] = []
const logListeners: Set<() => void> = new Set()

function pushToBuffer(level: LogLevel, tag: string, args: unknown[]) {
  const msg = args
    .map((a) =>
      a instanceof Error ? (a.stack ?? a.message) : typeof a === 'string' ? a : JSON.stringify(a),
    )
    .join(' ')

  logBuffer.push({ timestamp: Date.now(), level, tag, message: msg })
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift()
  }
  for (const listener of logListeners) {
    listener()
  }
}

export function getLogBuffer(): readonly LogEntry[] {
  return logBuffer
}

export function subscribeLogBuffer(listener: () => void): () => void {
  logListeners.add(listener)
  return () => { logListeners.delete(listener) }
}

export function clearLogBuffer(): void {
  logBuffer.length = 0
  for (const listener of logListeners) {
    listener()
  }
}

// ===== Logger interface =====

export interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

export function createLogger(tag: string): Logger {
  const emit = (level: LogLevel, args: unknown[]) => {
    // Always push to buffer (for diagnostic panel) if level >= info
    if (LOG_LEVELS[level] >= LOG_LEVELS['info']) {
      pushToBuffer(level, tag, args)
    }

    if (LOG_LEVELS[level] < LOG_LEVELS[getMinLevel()]) return;
    if (!isTagEnabled(tag)) return;

    const line = formatLine(level, tag, args);

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
