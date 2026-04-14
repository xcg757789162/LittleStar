-- ============================================================
-- 10-system-logs.sql — 持久化系统日志表（增量迁移）
-- 用于记录后台生成任务的关键事件（失败、重试、超时等）
-- 幂等：使用 IF NOT EXISTS，可重复执行
-- ============================================================

-- 表
CREATE TABLE IF NOT EXISTS api.system_logs (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES api.children(id) ON DELETE CASCADE,
  level VARCHAR(10) NOT NULL DEFAULT 'info',
  tag VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  task_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_system_logs_child ON api.system_logs(child_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON api.system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_child_created ON api.system_logs(child_id, created_at DESC);

-- 快速查询最近 pending 任务的 idx
CREATE INDEX IF NOT EXISTS idx_generation_tasks_pending
  ON api.generation_tasks(created_at)
  WHERE status = 'pending';

-- 序列权限
GRANT USAGE, SELECT ON SEQUENCE api.system_logs_id_seq TO authenticated;

-- 表权限
GRANT SELECT, INSERT, DELETE ON api.system_logs TO authenticated;

-- RLS
ALTER TABLE api.system_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_logs' AND policyname = 'system_logs_select'
  ) THEN
    CREATE POLICY system_logs_select ON api.system_logs
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_logs' AND policyname = 'system_logs_insert'
  ) THEN
    CREATE POLICY system_logs_insert ON api.system_logs
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_logs' AND policyname = 'system_logs_delete'
  ) THEN
    CREATE POLICY system_logs_delete ON api.system_logs
      FOR DELETE TO authenticated USING (true);
  END IF;
END $$;
