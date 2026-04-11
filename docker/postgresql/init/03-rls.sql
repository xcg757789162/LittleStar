-- ============================================================
-- 03-rls.sql — Row Level Security 策略
-- ============================================================

-- 辅助函数：从 JWT claim 中提取 user_id
CREATE OR REPLACE FUNCTION api.current_user_id() RETURNS TEXT AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::json->>'user_id',
    ''
  );
$$ LANGUAGE sql STABLE;

-- ============================================================
-- users 表 RLS — 直接隔离
-- ============================================================
ALTER TABLE api.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select ON api.users
  FOR SELECT TO authenticated
  USING (id::text = api.current_user_id());

CREATE POLICY users_update ON api.users
  FOR UPDATE TO authenticated
  USING (id::text = api.current_user_id())
  WITH CHECK (id::text = api.current_user_id());

-- users 表不允许通过 PostgREST 直接 INSERT/DELETE（由 Auth Service 管理）

-- ============================================================
-- children 表 RLS — 通过 user_id 隔离
-- ============================================================
ALTER TABLE api.children ENABLE ROW LEVEL SECURITY;

CREATE POLICY children_select ON api.children
  FOR SELECT TO authenticated
  USING (user_id::text = api.current_user_id());

CREATE POLICY children_insert ON api.children
  FOR INSERT TO authenticated
  WITH CHECK (user_id::text = api.current_user_id());

CREATE POLICY children_update ON api.children
  FOR UPDATE TO authenticated
  USING (user_id::text = api.current_user_id())
  WITH CHECK (user_id::text = api.current_user_id());

CREATE POLICY children_delete ON api.children
  FOR DELETE TO authenticated
  USING (user_id::text = api.current_user_id());

-- ============================================================
-- 子表 RLS 宏 — 通过 child_id → children.user_id 间接隔离
-- ============================================================

-- learning_records
ALTER TABLE api.learning_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY learning_records_select ON api.learning_records
  FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY learning_records_insert ON api.learning_records
  FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY learning_records_update ON api.learning_records
  FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY learning_records_delete ON api.learning_records
  FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

-- mastery_records
ALTER TABLE api.mastery_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY mastery_records_select ON api.mastery_records
  FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY mastery_records_insert ON api.mastery_records
  FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY mastery_records_update ON api.mastery_records
  FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY mastery_records_delete ON api.mastery_records
  FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

-- achievements
ALTER TABLE api.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY achievements_select ON api.achievements
  FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY achievements_insert ON api.achievements
  FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY achievements_update ON api.achievements
  FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY achievements_delete ON api.achievements
  FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

-- daily_sessions
ALTER TABLE api.daily_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_sessions_select ON api.daily_sessions
  FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY daily_sessions_insert ON api.daily_sessions
  FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY daily_sessions_update ON api.daily_sessions
  FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY daily_sessions_delete ON api.daily_sessions
  FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

-- grade_unlocks
ALTER TABLE api.grade_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY grade_unlocks_select ON api.grade_unlocks
  FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY grade_unlocks_insert ON api.grade_unlocks
  FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY grade_unlocks_update ON api.grade_unlocks
  FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY grade_unlocks_delete ON api.grade_unlocks
  FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

-- placement_tests
ALTER TABLE api.placement_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY placement_tests_select ON api.placement_tests
  FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY placement_tests_insert ON api.placement_tests
  FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY placement_tests_update ON api.placement_tests
  FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY placement_tests_delete ON api.placement_tests
  FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

-- report_data
ALTER TABLE api.report_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_data_select ON api.report_data
  FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY report_data_insert ON api.report_data
  FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY report_data_update ON api.report_data
  FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY report_data_delete ON api.report_data
  FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

-- mastery_snapshots
ALTER TABLE api.mastery_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY mastery_snapshots_select ON api.mastery_snapshots
  FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY mastery_snapshots_insert ON api.mastery_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY mastery_snapshots_update ON api.mastery_snapshots
  FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY mastery_snapshots_delete ON api.mastery_snapshots
  FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

-- classroom_history
ALTER TABLE api.classroom_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY classroom_history_select ON api.classroom_history
  FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY classroom_history_insert ON api.classroom_history
  FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY classroom_history_update ON api.classroom_history
  FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY classroom_history_delete ON api.classroom_history
  FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

-- classroom_snapshots (通过 history_id → classroom_history.child_id 间接隔离)
ALTER TABLE api.classroom_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY classroom_snapshots_select ON api.classroom_snapshots
  FOR SELECT TO authenticated
  USING (history_id IN (
    SELECT ch.id FROM api.classroom_history ch
    WHERE ch.child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id())
  ));

CREATE POLICY classroom_snapshots_insert ON api.classroom_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (history_id IN (
    SELECT ch.id FROM api.classroom_history ch
    WHERE ch.child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id())
  ));

CREATE POLICY classroom_snapshots_update ON api.classroom_snapshots
  FOR UPDATE TO authenticated
  USING (history_id IN (
    SELECT ch.id FROM api.classroom_history ch
    WHERE ch.child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id())
  ))
  WITH CHECK (history_id IN (
    SELECT ch.id FROM api.classroom_history ch
    WHERE ch.child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id())
  ));

CREATE POLICY classroom_snapshots_delete ON api.classroom_snapshots
  FOR DELETE TO authenticated
  USING (history_id IN (
    SELECT ch.id FROM api.classroom_history ch
    WHERE ch.child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id())
  ));

-- classroom_cache
ALTER TABLE api.classroom_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY classroom_cache_select ON api.classroom_cache
  FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY classroom_cache_insert ON api.classroom_cache
  FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY classroom_cache_update ON api.classroom_cache
  FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY classroom_cache_delete ON api.classroom_cache
  FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

-- generation_tasks
ALTER TABLE api.generation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY generation_tasks_select ON api.generation_tasks
  FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY generation_tasks_insert ON api.generation_tasks
  FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY generation_tasks_update ON api.generation_tasks
  FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

CREATE POLICY generation_tasks_delete ON api.generation_tasks
  FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id::text = api.current_user_id()));

-- ============================================================
-- 公共表不启用 RLS — anon 角色通过 GRANT 控制访问
-- knowledge_nodes, questions, question_templates,
-- parent_activities, tpr_instructions,
-- curricula, curriculum_modules, curriculum_nodes,
-- media_files 保持开放
-- ============================================================
