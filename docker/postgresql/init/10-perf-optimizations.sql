-- ============================================================
-- 10-perf-optimizations.sql — Performance optimizations
--
-- 1. Fix RLS integer::text cast that prevents index usage
-- 2. Add missing indexes for common query patterns
-- 3. Denormalize child_id on classroom_snapshots for simpler RLS
--
-- NOTE: Uses CASCADE on DROP FUNCTION to remove dependent policies,
-- then recreates all policies with INTEGER comparison.
-- ============================================================

-- ============================================================
-- 1. RLS: Change current_user_id() to return INTEGER
-- ============================================================

DROP FUNCTION IF EXISTS api.current_user_id() CASCADE;

CREATE OR REPLACE FUNCTION api.current_user_id() RETURNS INTEGER AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'user_id',
    ''
  )::INTEGER;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- Recreate all RLS policies with INTEGER comparison
-- ============================================================

-- users
CREATE POLICY users_select ON api.users FOR SELECT TO authenticated
  USING (id = api.current_user_id());
CREATE POLICY users_update ON api.users FOR UPDATE TO authenticated
  USING (id = api.current_user_id()) WITH CHECK (id = api.current_user_id());

-- children
CREATE POLICY children_select ON api.children FOR SELECT TO authenticated
  USING (user_id = api.current_user_id());
CREATE POLICY children_insert ON api.children FOR INSERT TO authenticated
  WITH CHECK (user_id = api.current_user_id());
CREATE POLICY children_update ON api.children FOR UPDATE TO authenticated
  USING (user_id = api.current_user_id()) WITH CHECK (user_id = api.current_user_id());
CREATE POLICY children_delete ON api.children FOR DELETE TO authenticated
  USING (user_id = api.current_user_id());

-- Macro for child-scoped tables
-- learning_records
CREATE POLICY learning_records_select ON api.learning_records FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY learning_records_insert ON api.learning_records FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY learning_records_update ON api.learning_records FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));

-- mastery_records
CREATE POLICY mastery_records_select ON api.mastery_records FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY mastery_records_insert ON api.mastery_records FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY mastery_records_update ON api.mastery_records FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));

-- daily_sessions
CREATE POLICY daily_sessions_select ON api.daily_sessions FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY daily_sessions_insert ON api.daily_sessions FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY daily_sessions_update ON api.daily_sessions FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));

-- placement_tests
CREATE POLICY placement_tests_select ON api.placement_tests FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY placement_tests_insert ON api.placement_tests FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY placement_tests_update ON api.placement_tests FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY placement_tests_delete ON api.placement_tests FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));

-- achievements
CREATE POLICY achievements_select ON api.achievements FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY achievements_insert ON api.achievements FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));

-- classroom_cache
CREATE POLICY classroom_cache_select ON api.classroom_cache FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY classroom_cache_insert ON api.classroom_cache FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY classroom_cache_update ON api.classroom_cache FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY classroom_cache_delete ON api.classroom_cache FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));

-- classroom_history
CREATE POLICY classroom_history_select ON api.classroom_history FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY classroom_history_insert ON api.classroom_history FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY classroom_history_update ON api.classroom_history FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY classroom_history_delete ON api.classroom_history FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));

-- classroom_snapshots (uses denormalized child_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'api' AND table_name = 'classroom_snapshots' AND column_name = 'child_id'
  ) THEN
    ALTER TABLE api.classroom_snapshots ADD COLUMN child_id INTEGER;
    UPDATE api.classroom_snapshots cs SET child_id = ch.child_id
      FROM api.classroom_history ch WHERE cs.history_id = ch.id;
    ALTER TABLE api.classroom_snapshots
      ADD CONSTRAINT fk_classroom_snapshots_child
      FOREIGN KEY (child_id) REFERENCES api.children(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_classroom_snapshots_child_id
      ON api.classroom_snapshots (child_id);
  END IF;
END $$;

CREATE POLICY classroom_snapshots_select ON api.classroom_snapshots FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY classroom_snapshots_insert ON api.classroom_snapshots FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY classroom_snapshots_update ON api.classroom_snapshots FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY classroom_snapshots_delete ON api.classroom_snapshots FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));

-- mastery_snapshots
CREATE POLICY mastery_snapshots_select ON api.mastery_snapshots FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY mastery_snapshots_insert ON api.mastery_snapshots FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY mastery_snapshots_update ON api.mastery_snapshots FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY mastery_snapshots_delete ON api.mastery_snapshots FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));

-- report_data
CREATE POLICY report_data_select ON api.report_data FOR SELECT TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY report_data_insert ON api.report_data FOR INSERT TO authenticated
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY report_data_update ON api.report_data FOR UPDATE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()))
  WITH CHECK (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));
CREATE POLICY report_data_delete ON api.report_data FOR DELETE TO authenticated
  USING (child_id IN (SELECT id FROM api.children WHERE user_id = api.current_user_id()));

-- Re-grant service account access
GRANT SELECT ON api.classroom_cache TO openmaic;
GRANT SELECT ON api.classroom_history TO openmaic;
GRANT SELECT ON api.generation_tasks TO openmaic;

-- ============================================================
-- 2. Missing indexes for common query patterns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_generation_tasks_pending
  ON api.generation_tasks (created_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_classroom_history_date
  ON api.classroom_history (child_id, date);

CREATE INDEX IF NOT EXISTS idx_classroom_history_classroom_id
  ON api.classroom_history (classroom_id);

CREATE INDEX IF NOT EXISTS idx_learning_records_question_id
  ON api.learning_records (question_id);
