-- ============================================================
-- 13-courses.sql — 热拔插课程体系（Hot-pluggable Courses）
-- 目标：把 math/chinese/english 降级为 courses 表的系统预置课程，
--       用户可通过苏格拉底式对话自行创建任意课程（生物/理财/三角函数…）
-- 幂等：全部 IF NOT EXISTS / ON CONFLICT，可重复执行
-- ============================================================

-- ============================================================
-- 1. courses 表 — 课程主体
-- ============================================================
CREATE TABLE IF NOT EXISTS api.courses (
  id SERIAL PRIMARY KEY,
  -- NULL = 系统预置公共课程；非 NULL = 某家长账号创建的私有课程
  user_id INTEGER REFERENCES api.users(id) ON DELETE CASCADE,
  -- slug：既是 URL 段，也是 knowledge_nodes.subject 的值（兼容老路径）
  -- 自定义课程的 slug 会被用作 knowledge_node_id 前缀（如 bio-cell、finance-budget）
  slug VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) NOT NULL DEFAULT '📘',
  color_hex VARCHAR(10) NOT NULL DEFAULT '#5BC0EB',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  -- draft：苏格拉底对话中；initializing：后台生成大纲和测评；ready：可学习；failed：生成失败
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  -- 苏格拉底对话收集的结构化需求（topic/goal/scope/depth/prior_knowledge/preferred_style 等）
  requirement_spec JSONB NOT NULL DEFAULT '{}',
  -- 对话历史（断线续聊）
  dialog_history JSONB NOT NULL DEFAULT '[]',
  -- 关联的初始化 generation_tasks 行 id
  init_task_id INTEGER,
  init_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- slug 全局唯一：curricula.subject 全局唯一（subject 即 course.slug），
  -- subject 直接取自 course.slug，故同 slug 跨用户会与现有数据在 curricula 主键上冲撞
  CONSTRAINT courses_slug_unique UNIQUE (slug),
  CONSTRAINT courses_status_check CHECK (status IN ('draft', 'initializing', 'ready', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_courses_user ON api.courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON api.courses(status);

-- ============================================================
-- 1b. 课程链 + 学科类型（幂等 ALTER，须在首条 INSERT 种子之前执行）
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'api' AND table_name = 'courses' AND column_name = 'discipline_type'
  ) THEN
    ALTER TABLE api.courses ADD COLUMN discipline_type VARCHAR(20) NOT NULL DEFAULT 'interest';
    ALTER TABLE api.courses ADD CONSTRAINT courses_discipline_type_check
      CHECK (discipline_type IN ('academic', 'interest'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'api' AND table_name = 'courses' AND column_name = 'parent_course_id'
  ) THEN
    ALTER TABLE api.courses ADD COLUMN parent_course_id INTEGER
      REFERENCES api.courses(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_courses_parent_course ON api.courses(parent_course_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'api' AND table_name = 'courses' AND column_name = 'stage_index'
  ) THEN
    ALTER TABLE api.courses ADD COLUMN stage_index INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION api.courses_updated_at_fn() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS courses_updated_at_trg ON api.courses;
CREATE TRIGGER courses_updated_at_trg
  BEFORE UPDATE ON api.courses
  FOR EACH ROW EXECUTE FUNCTION api.courses_updated_at_fn();

-- ============================================================
-- 2. 预置系统课程种子（math/chinese/english）
-- slug 保持与原 Subject 字面量一致，向后兼容
-- ============================================================
INSERT INTO api.courses (
  user_id, slug, name, emoji, color_hex, is_system, status, requirement_spec,
  discipline_type, parent_course_id, stage_index
)
VALUES
  (NULL, 'math',    '数学', '🔢', '#FF8C42', TRUE, 'ready', '{"builtin": true}', 'academic', NULL, 0),
  (NULL, 'chinese', '语文', '📖', '#2EC4B6', TRUE, 'ready', '{"builtin": true}', 'academic', NULL, 0),
  (NULL, 'english', '英语', '🌍', '#5BC0EB', TRUE, 'ready', '{"builtin": true}', 'academic', NULL, 0)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  color_hex = EXCLUDED.color_hex,
  is_system = TRUE,
  status = 'ready',
  discipline_type = EXCLUDED.discipline_type;

-- ============================================================
-- 3. 加宽 subject 列 —— 自定义课程 slug 可能超过 20 字符
-- ============================================================

-- 3.1 依赖 subject 列的视图需要先 DROP，加宽后再重建
DROP VIEW IF EXISTS api.classroom_history_list;

ALTER TABLE api.curricula          ALTER COLUMN subject TYPE VARCHAR(50);
ALTER TABLE api.knowledge_nodes    ALTER COLUMN subject TYPE VARCHAR(50);
ALTER TABLE api.placement_questions ALTER COLUMN subject TYPE VARCHAR(50);
-- placement_tests.subject、mastery_snapshots.subject、grade_unlocks.subject、classroom_history.subject 等也加宽
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'api'
      AND column_name = 'subject'
      AND data_type = 'character varying'
      AND character_maximum_length = 20
  LOOP
    EXECUTE format('ALTER TABLE api.%I ALTER COLUMN %I TYPE VARCHAR(50)', r.table_name, r.column_name);
  END LOOP;
END $$;

-- 3.2 重建 classroom_history_list 视图（与原定义保持一致）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'api' AND table_name = 'classroom_history') THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW api.classroom_history_list AS
      SELECT
        id, child_id, knowledge_node_id, knowledge_node_name, subject,
        classroom_id, classroom_title, date, completed_at, round, is_review,
        questions_completed, correct_count, accuracy
      FROM api.classroom_history ch
    $view$;
    GRANT SELECT ON api.classroom_history_list TO authenticated;
  END IF;
END $$;

-- ============================================================
-- 4. curricula 表增量：course_id 可选外键（自定义课程使用）
-- 预置课程 curricula 以 subject 唯一；course_id 回填见本文件后段
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'api' AND table_name = 'curricula' AND column_name = 'course_id'
  ) THEN
    ALTER TABLE api.curricula ADD COLUMN course_id INTEGER REFERENCES api.courses(id) ON DELETE CASCADE;
    CREATE INDEX idx_curricula_course ON api.curricula(course_id);
  END IF;
END $$;

-- 预置 curricula 回填 course_id（math/chinese/english）
UPDATE api.curricula c
SET course_id = co.id
FROM api.courses co
WHERE c.course_id IS NULL
  AND co.is_system = TRUE
  AND co.slug = c.subject;

-- ============================================================
-- 5. generation_tasks 增量：task_type 列（区分课堂预生成 vs 课程初始化）
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'api' AND table_name = 'generation_tasks' AND column_name = 'task_type'
  ) THEN
    ALTER TABLE api.generation_tasks ADD COLUMN task_type VARCHAR(40) NOT NULL DEFAULT 'classroom-prebuild';
    CREATE INDEX idx_generation_tasks_type ON api.generation_tasks(task_type);
  END IF;

  -- 课程初始化任务不关联 knowledge_node，需要允许 knowledge_node_id 为空
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'api' AND table_name = 'generation_tasks'
      AND column_name = 'knowledge_node_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE api.generation_tasks ALTER COLUMN knowledge_node_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'api' AND table_name = 'generation_tasks'
      AND column_name = 'requirement' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE api.generation_tasks ALTER COLUMN requirement DROP NOT NULL;
  END IF;

  -- 课程初始化任务关联 course_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'api' AND table_name = 'generation_tasks' AND column_name = 'course_id'
  ) THEN
    ALTER TABLE api.generation_tasks ADD COLUMN course_id INTEGER REFERENCES api.courses(id) ON DELETE CASCADE;
    CREATE INDEX idx_generation_tasks_course ON api.generation_tasks(course_id);
  END IF;
END $$;

-- ============================================================
-- 6. 权限（GRANT）
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON api.courses TO authenticated;
GRANT SELECT ON api.courses TO anon; -- 允许未登录看预置课程列表（用于宣传页等）
GRANT USAGE, SELECT ON SEQUENCE api.courses_id_seq TO authenticated;

-- curricula/curriculum_modules/curriculum_nodes 也需要 authenticated 可 INSERT（自定义课程初始化写入）
GRANT INSERT, UPDATE, DELETE ON api.curricula TO authenticated;
GRANT INSERT, UPDATE, DELETE ON api.curriculum_modules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON api.curriculum_nodes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON api.knowledge_nodes TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE api.curricula_id_seq TO authenticated;

-- ============================================================
-- 7. RLS 策略
-- 系统课程（user_id IS NULL）所有人可见；私有课程只有创建者可见
-- ============================================================
ALTER TABLE api.courses ENABLE ROW LEVEL SECURITY;

-- 注意：api.current_user_id() 返回 integer，user_id 也是 integer，直接比较即可
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'courses_select') THEN
    CREATE POLICY courses_select ON api.courses
      FOR SELECT TO authenticated
      USING (user_id IS NULL OR user_id = api.current_user_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'courses_select_anon') THEN
    CREATE POLICY courses_select_anon ON api.courses
      FOR SELECT TO anon
      USING (user_id IS NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'courses_insert') THEN
    CREATE POLICY courses_insert ON api.courses
      FOR INSERT TO authenticated
      WITH CHECK (user_id = api.current_user_id() AND is_system = FALSE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'courses_update') THEN
    CREATE POLICY courses_update ON api.courses
      FOR UPDATE TO authenticated
      USING (user_id = api.current_user_id() AND is_system = FALSE)
      WITH CHECK (user_id = api.current_user_id() AND is_system = FALSE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'courses_delete') THEN
    CREATE POLICY courses_delete ON api.courses
      FOR DELETE TO authenticated
      USING (user_id = api.current_user_id() AND is_system = FALSE);
  END IF;
END $$;
