-- ============================================================
-- 09-generation-tasks.sql — 预生成任务队列表（增量迁移）
-- 幂等：使用 IF NOT EXISTS，可重复执行
-- ============================================================

-- 表
CREATE TABLE IF NOT EXISTS api.generation_tasks (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES api.children(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  knowledge_node_id VARCHAR(100) NOT NULL,
  date VARCHAR(10) NOT NULL,
  requirement TEXT NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'zh-CN',
  settings JSONB NOT NULL DEFAULT '{}',
  progress INTEGER NOT NULL DEFAULT 0,
  current_step VARCHAR(30),
  checkpoint JSONB,
  result_cache_key VARCHAR(220),
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  scheduled_after TIMESTAMPTZ
);

-- 增量迁移：为已有表添加 scheduled_after 列（限流延迟重试）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'api' AND table_name = 'generation_tasks' AND column_name = 'scheduled_after'
  ) THEN
    ALTER TABLE api.generation_tasks ADD COLUMN scheduled_after TIMESTAMPTZ;
  END IF;
END $$;

-- 索引（IF NOT EXISTS 防止重复创建）
CREATE INDEX IF NOT EXISTS idx_generation_tasks_child ON api.generation_tasks(child_id);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_status ON api.generation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_child_status ON api.generation_tasks(child_id, status);

-- 权限
GRANT SELECT, INSERT, UPDATE, DELETE ON api.generation_tasks TO authenticated;

-- RLS
ALTER TABLE api.generation_tasks ENABLE ROW LEVEL SECURITY;

-- RLS 策略（使用 DO $$ 块避免重复创建报错）
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'generation_tasks' AND policyname = 'generation_tasks_select'
  ) THEN
    CREATE POLICY generation_tasks_select ON api.generation_tasks
      FOR SELECT TO authenticated USING (true);
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'generation_tasks' AND policyname = 'generation_tasks_insert'
  ) THEN
    CREATE POLICY generation_tasks_insert ON api.generation_tasks
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'generation_tasks' AND policyname = 'generation_tasks_update'
  ) THEN
    CREATE POLICY generation_tasks_update ON api.generation_tasks
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'generation_tasks' AND policyname = 'generation_tasks_delete'
  ) THEN
    CREATE POLICY generation_tasks_delete ON api.generation_tasks
      FOR DELETE TO authenticated USING (true);
  END IF;
END $$;
