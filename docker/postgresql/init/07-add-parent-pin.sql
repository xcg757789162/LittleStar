-- ============================================================
-- 07-add-parent-pin.sql — 给 users 表添加 parent_pin 字段
-- 用于已有数据库的迁移（新部署通过 01-schema.sql 已包含）
-- ============================================================

-- 安全地添加列（如果不存在则添加）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'api'
      AND table_name = 'users'
      AND column_name = 'parent_pin'
  ) THEN
    ALTER TABLE api.users ADD COLUMN parent_pin VARCHAR(4);
    RAISE NOTICE 'Added parent_pin column to api.users';
  ELSE
    RAISE NOTICE 'parent_pin column already exists in api.users';
  END IF;
END
$$;
