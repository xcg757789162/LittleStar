-- ============================================================
-- 02-roles.sql — PostgreSQL 角色和权限配置
-- ============================================================

-- 创建角色（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    -- 密码将在 Docker Compose 启动时通过 ALTER ROLE 或环境变量覆盖
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'CHANGE_ME_VIA_ENV';
  END IF;
END
$$;

-- authenticator 可以切换到 anon 和 authenticated
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;

-- 授予 schema 使用权限
GRANT USAGE ON SCHEMA api TO anon;
GRANT USAGE ON SCHEMA api TO authenticated;

-- ============================================================
-- anon 角色权限：只读公共表
-- ============================================================
GRANT SELECT ON api.knowledge_nodes TO anon;
GRANT SELECT ON api.questions TO anon;
GRANT SELECT ON api.question_templates TO anon;

-- ============================================================
-- authenticated 角色权限
-- ============================================================
-- users: 只允许 SELECT/UPDATE（INSERT/DELETE 由 Auth Service 管理，不经过 PostgREST）
GRANT SELECT, UPDATE ON api.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.children TO authenticated;
GRANT SELECT ON api.knowledge_nodes TO authenticated;
GRANT SELECT ON api.questions TO authenticated;
GRANT SELECT ON api.question_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.learning_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.mastery_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.daily_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.grade_unlocks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.placement_tests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.report_data TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.mastery_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.classroom_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.classroom_snapshots TO authenticated;

-- 视图权限（课堂历史是私有数据，不对 anon 开放）
GRANT SELECT ON api.classroom_history_list TO authenticated;

-- SERIAL 序列的 USAGE 权限（authenticated 需要插入自增主键行）
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA api TO authenticated;
