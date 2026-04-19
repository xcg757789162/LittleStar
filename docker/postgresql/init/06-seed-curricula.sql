-- ============================================================
-- 06-seed-curricula.sql — 预置课程大纲主表（按 subject 唯一，与热拔插 courses 对齐）
-- 幂等：ON CONFLICT(subject)
-- ============================================================

INSERT INTO api.curricula (id, subject, version, reference, is_active) VALUES
  (1, 'math', '2022-v1', '《义务教育数学课程标准（2022年版）》核心导向摘要（种子）', TRUE),
  (2, 'chinese', '2022-v1', '《义务教育语文课程标准（2022年版）》核心导向摘要（种子）', TRUE),
  (3, 'english', '2022-v1', '《义务教育英语课程标准（2022年版）》核心导向摘要（种子）', TRUE)
ON CONFLICT (subject) DO UPDATE SET
  version = EXCLUDED.version,
  reference = EXCLUDED.reference,
  is_active = EXCLUDED.is_active;
