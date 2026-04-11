-- ============================================================
-- 08-avatar-to-text.sql — 将 children.avatar 改为 TEXT
-- 支持存储 base64 data URL（自定义上传头像）
-- ============================================================

-- 将 avatar 列从 VARCHAR(255) 改为 TEXT
-- TEXT 类型在 PostgreSQL 中无长度限制，可以存储 base64 编码的图片
-- 128x128 JPEG (quality 0.85) 的 data URL 约 20-30KB
ALTER TABLE api.children ALTER COLUMN avatar TYPE TEXT;
