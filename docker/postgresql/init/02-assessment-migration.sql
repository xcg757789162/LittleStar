-- ============================================================
-- 02-assessment-migration.sql — 两阶段评测系统扩展
-- 新增 placement_questions 表 + 扩展 placement_tests 表
-- ============================================================

-- ============================================================
-- 1. 扩展 placement_tests 表 — 新增两阶段跟踪字段
-- ============================================================

-- phase: 'single'(旧记录/单阶段) | 'phase1' | 'phase2'
ALTER TABLE api.placement_tests
  ADD COLUMN IF NOT EXISTS phase VARCHAR(10) NOT NULL DEFAULT 'single';

-- phase1_result: 阶段一分析结果（仅 phase2 记录使用）
ALTER TABLE api.placement_tests
  ADD COLUMN IF NOT EXISTS phase1_result JSONB;

-- parent_test_id: phase2 记录关联 phase1 的 id
ALTER TABLE api.placement_tests
  ADD COLUMN IF NOT EXISTS parent_test_id INTEGER REFERENCES api.placement_tests(id);

-- 索引
CREATE INDEX IF NOT EXISTS idx_placement_tests_phase
  ON api.placement_tests(phase);

CREATE INDEX IF NOT EXISTS idx_placement_tests_parent
  ON api.placement_tests(parent_test_id);

-- ============================================================
-- 2. 新增 placement_questions 表 — 存储预设和 AI 生成的评测题目
-- ============================================================

CREATE TABLE IF NOT EXISTS api.placement_questions (
  id SERIAL PRIMARY KEY,
  subject VARCHAR(20) NOT NULL,
  knowledge_node_id VARCHAR(100) NOT NULL,
  source VARCHAR(10) NOT NULL DEFAULT 'preset',  -- 'preset' | 'ai'
  stem TEXT NOT NULL,                              -- 题干
  options JSONB NOT NULL DEFAULT '[]',             -- [{text, emoji?}]
  correct_index INTEGER NOT NULL,                  -- 正确选项索引 0-3
  difficulty INTEGER NOT NULL DEFAULT 1,           -- 难度 1-5
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT placement_questions_correct_range CHECK (correct_index >= 0 AND correct_index <= 3)
);

CREATE INDEX IF NOT EXISTS idx_placement_questions_node
  ON api.placement_questions(subject, knowledge_node_id);

CREATE INDEX IF NOT EXISTS idx_placement_questions_source
  ON api.placement_questions(source);
