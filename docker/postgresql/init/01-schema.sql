-- ============================================================
-- 01-schema.sql — LittleStar PostgreSQL Schema
-- 所有表放在 api schema 下，PostgREST 暴露 api schema
-- ============================================================

CREATE SCHEMA IF NOT EXISTS api;

-- ============================================================
-- 1. users — 用户表
-- ============================================================
CREATE TABLE api.users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  parent_pin VARCHAR(4)
);

-- ============================================================
-- 2. children — 孩子表
-- ============================================================
CREATE TABLE api.children (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES api.users(id),
  name VARCHAR(50) NOT NULL,
  avatar VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL,
  grade_level VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settings JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT children_user_name_unique UNIQUE (user_id, name)
);

CREATE INDEX idx_children_name ON api.children(name);
CREATE INDEX idx_children_grade_level ON api.children(grade_level);

-- ============================================================
-- 3. knowledge_nodes — 知识点表（公共只读）
-- ============================================================
CREATE TABLE api.knowledge_nodes (
  id VARCHAR(100) PRIMARY KEY,
  subject VARCHAR(20) NOT NULL,
  grade_level VARCHAR(30) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  prerequisites JSONB NOT NULL DEFAULT '[]',
  next_nodes JSONB NOT NULL DEFAULT '[]',
  difficulty INTEGER NOT NULL DEFAULT 1,
  content_type VARCHAR(20) NOT NULL DEFAULT 'flashcard',
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_knowledge_nodes_subject_grade ON api.knowledge_nodes(subject, grade_level);
CREATE INDEX idx_knowledge_nodes_difficulty ON api.knowledge_nodes(difficulty);
CREATE INDEX idx_knowledge_nodes_order ON api.knowledge_nodes(order_index);

-- ============================================================
-- 4. questions — 题目表（公共只读）
-- ============================================================
CREATE TABLE api.questions (
  id VARCHAR(100) PRIMARY KEY,
  knowledge_node_id VARCHAR(100) NOT NULL REFERENCES api.knowledge_nodes(id),
  type VARCHAR(30) NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  answer JSONB,
  difficulty INTEGER NOT NULL DEFAULT 1,
  is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  template_id VARCHAR(100)
);

CREATE INDEX idx_questions_knowledge_node ON api.questions(knowledge_node_id);
CREATE INDEX idx_questions_type ON api.questions(type);
CREATE INDEX idx_questions_node_type ON api.questions(knowledge_node_id, type);
CREATE INDEX idx_questions_difficulty ON api.questions(difficulty);
CREATE INDEX idx_questions_ai_generated ON api.questions(is_ai_generated);

-- ============================================================
-- 5. question_templates — AI 出题模板表（公共只读）
-- ============================================================
CREATE TABLE api.question_templates (
  id SERIAL PRIMARY KEY,
  subject VARCHAR(20) NOT NULL,
  grade_level VARCHAR(30) NOT NULL,
  knowledge_node_id VARCHAR(100) NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  constraints JSONB NOT NULL DEFAULT '{}',
  validation_rules JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_question_templates_subject ON api.question_templates(subject);
CREATE INDEX idx_question_templates_node ON api.question_templates(knowledge_node_id);
CREATE INDEX idx_question_templates_subject_grade ON api.question_templates(subject, grade_level);

-- ============================================================
-- 6. learning_records — 学习记录表
-- ============================================================
CREATE TABLE api.learning_records (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES api.children(id),
  knowledge_node_id VARCHAR(100) NOT NULL,
  question_id VARCHAR(100) NOT NULL,
  answer JSONB,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  time_spent INTEGER NOT NULL DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pronunciation_score NUMERIC(5,2),
  pronunciation_stars INTEGER
);

CREATE INDEX idx_learning_records_child ON api.learning_records(child_id);
CREATE INDEX idx_learning_records_node ON api.learning_records(knowledge_node_id);
CREATE INDEX idx_learning_records_child_node ON api.learning_records(child_id, knowledge_node_id);
CREATE INDEX idx_learning_records_timestamp ON api.learning_records(timestamp);

-- ============================================================
-- 7. mastery_records — 掌握率记录表
-- ============================================================
CREATE TABLE api.mastery_records (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES api.children(id),
  knowledge_node_id VARCHAR(100) NOT NULL,
  mastery_level NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_practiced TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_review_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consecutive_correct INTEGER NOT NULL DEFAULT 0,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT mastery_records_child_node_unique UNIQUE (child_id, knowledge_node_id)
);

CREATE INDEX idx_mastery_records_child ON api.mastery_records(child_id);
CREATE INDEX idx_mastery_records_node ON api.mastery_records(knowledge_node_id);
CREATE INDEX idx_mastery_records_child_node ON api.mastery_records(child_id, knowledge_node_id);
CREATE INDEX idx_mastery_records_review ON api.mastery_records(next_review_date);

-- ============================================================
-- 8. achievements — 成就表
-- ============================================================
CREATE TABLE api.achievements (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES api.children(id),
  type VARCHAR(30) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_achievements_child ON api.achievements(child_id);
CREATE INDEX idx_achievements_type ON api.achievements(type);
CREATE INDEX idx_achievements_child_type ON api.achievements(child_id, type);
CREATE INDEX idx_achievements_earned ON api.achievements(earned_at);

-- ============================================================
-- 9. daily_sessions — 每日学习会话表
-- ============================================================
CREATE TABLE api.daily_sessions (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES api.children(id),
  date VARCHAR(10) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  questions_completed INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  subjects JSONB NOT NULL DEFAULT '[]',
  streak INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_daily_sessions_child ON api.daily_sessions(child_id);
CREATE INDEX idx_daily_sessions_date ON api.daily_sessions(date);
CREATE INDEX idx_daily_sessions_child_date ON api.daily_sessions(child_id, date);

-- ============================================================
-- 10. grade_unlocks — 年级解锁记录表
-- ============================================================
CREATE TABLE api.grade_unlocks (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES api.children(id),
  subject VARCHAR(20) NOT NULL,
  grade_level VARCHAR(30) NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mastery_at_unlock NUMERIC(5,2) NOT NULL DEFAULT 0,
  placement_test_id INTEGER
);

CREATE INDEX idx_grade_unlocks_child ON api.grade_unlocks(child_id);
CREATE INDEX idx_grade_unlocks_child_subject ON api.grade_unlocks(child_id, subject);
CREATE INDEX idx_grade_unlocks_grade ON api.grade_unlocks(grade_level);
CREATE INDEX idx_grade_unlocks_unlocked ON api.grade_unlocks(unlocked_at);

-- ============================================================
-- 11. placement_tests — 入学测评记录表
-- ============================================================
CREATE TABLE api.placement_tests (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES api.children(id),
  subject VARCHAR(20) NOT NULL,
  grade_level VARCHAR(30) NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  result JSONB,
  phase VARCHAR(10) NOT NULL DEFAULT 'single',  -- 'single' | 'phase1' | 'phase2'
  phase1_result JSONB,                           -- 阶段一分析结果（仅 phase2 使用）
  parent_test_id INTEGER REFERENCES api.placement_tests(id)  -- phase2 关联 phase1 的 id
);

CREATE INDEX idx_placement_tests_child ON api.placement_tests(child_id);
CREATE INDEX idx_placement_tests_child_subject_grade ON api.placement_tests(child_id, subject, grade_level);
CREATE INDEX idx_placement_tests_started ON api.placement_tests(started_at);
CREATE INDEX idx_placement_tests_phase ON api.placement_tests(phase);
CREATE INDEX idx_placement_tests_parent ON api.placement_tests(parent_test_id);

-- ============================================================
-- 12. report_data — 学习报告数据表
-- ============================================================
CREATE TABLE api.report_data (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES api.children(id),
  type VARCHAR(20) NOT NULL,
  grade_level VARCHAR(30) NOT NULL,
  subject VARCHAR(20),
  period_start VARCHAR(10) NOT NULL,
  period_end VARCHAR(10) NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_report_data_child ON api.report_data(child_id);
CREATE INDEX idx_report_data_type ON api.report_data(type);
CREATE INDEX idx_report_data_child_type ON api.report_data(child_id, type);
CREATE INDEX idx_report_data_child_grade ON api.report_data(child_id, grade_level);
CREATE INDEX idx_report_data_period ON api.report_data(period_start);

-- ============================================================
-- 13. mastery_snapshots — 掌握度每日快照表
-- ============================================================
CREATE TABLE api.mastery_snapshots (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES api.children(id),
  date VARCHAR(10) NOT NULL,
  subject VARCHAR(20) NOT NULL,
  grade_level VARCHAR(30) NOT NULL,
  nodes_mastery JSONB NOT NULL DEFAULT '{}',
  average_mastery NUMERIC(5,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_mastery_snapshots_child ON api.mastery_snapshots(child_id);
CREATE INDEX idx_mastery_snapshots_child_date_subject ON api.mastery_snapshots(child_id, date, subject);
CREATE INDEX idx_mastery_snapshots_child_subject_grade ON api.mastery_snapshots(child_id, subject, grade_level);
CREATE INDEX idx_mastery_snapshots_date ON api.mastery_snapshots(date);

-- ============================================================
-- 14. classroom_history — 课堂历史表（不含大 JSON）
-- ============================================================
CREATE TABLE api.classroom_history (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES api.children(id),
  knowledge_node_id VARCHAR(100) NOT NULL,
  knowledge_node_name VARCHAR(200) NOT NULL DEFAULT '',
  subject VARCHAR(20) NOT NULL,
  classroom_id VARCHAR(100) NOT NULL,
  classroom_title VARCHAR(200) NOT NULL DEFAULT '',
  date VARCHAR(10) NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  round INTEGER NOT NULL DEFAULT 1,
  is_review BOOLEAN NOT NULL DEFAULT FALSE,
  questions_completed INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC(5,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_classroom_history_child ON api.classroom_history(child_id);
CREATE INDEX idx_classroom_history_child_node ON api.classroom_history(child_id, knowledge_node_id);

-- ============================================================
-- 15. classroom_snapshots — 课堂快照表（存储大 JSON）
-- ============================================================
CREATE TABLE api.classroom_snapshots (
  id SERIAL PRIMARY KEY,
  history_id INTEGER NOT NULL UNIQUE REFERENCES api.classroom_history(id) ON DELETE CASCADE,
  classroom_data JSONB NOT NULL
);

-- ============================================================
-- 16. classroom_cache — 课堂缓存表（AI 生成的课堂持久化缓存）
-- ============================================================
CREATE TABLE api.classroom_cache (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES api.children(id) ON DELETE CASCADE,
  knowledge_node_id VARCHAR(100) NOT NULL,
  date VARCHAR(10) NOT NULL,
  cache_key VARCHAR(220) NOT NULL,
  classroom_data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT classroom_cache_child_key_unique UNIQUE (child_id, cache_key)
);

CREATE INDEX idx_classroom_cache_child ON api.classroom_cache(child_id);
CREATE INDEX idx_classroom_cache_key ON api.classroom_cache(cache_key);
CREATE INDEX idx_classroom_cache_child_date ON api.classroom_cache(child_id, date);
CREATE INDEX idx_classroom_cache_expires ON api.classroom_cache(expires_at);

-- ============================================================
-- 17. parent_activities — 亲子互动活动表（公共只读）
-- ============================================================
CREATE TABLE api.parent_activities (
  id VARCHAR(100) PRIMARY KEY,
  related_node_ids JSONB NOT NULL DEFAULT '[]',
  task_description TEXT NOT NULL,
  parent_guide TEXT NOT NULL,
  guidance_card TEXT NOT NULL,
  offline_extension TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 5,
  subject VARCHAR(20) NOT NULL DEFAULT 'english',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_parent_activities_type ON api.parent_activities(type);
CREATE INDEX idx_parent_activities_subject ON api.parent_activities(subject);

-- ============================================================
-- 18. tpr_instructions — TPR 全身反应指令表（公共只读）
-- ============================================================
CREATE TABLE api.tpr_instructions (
  id VARCHAR(100) PRIMARY KEY,
  command TEXT NOT NULL,
  translation TEXT NOT NULL,
  action TEXT NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 1,
  category VARCHAR(20) NOT NULL,
  animation_type VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_tpr_instructions_category ON api.tpr_instructions(category);
CREATE INDEX idx_tpr_instructions_difficulty ON api.tpr_instructions(difficulty);

-- ============================================================
-- 19. curricula — 课程大纲主表（公共只读）
-- ============================================================
CREATE TABLE api.curricula (
  id SERIAL PRIMARY KEY,
  grade_level VARCHAR(30) NOT NULL,
  subject VARCHAR(20) NOT NULL,
  version VARCHAR(20) NOT NULL,
  reference TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT curricula_grade_subject_unique UNIQUE (grade_level, subject)
);

-- ============================================================
-- 20. curriculum_modules — 大纲模块/章节表（公共只读）
-- ============================================================
CREATE TABLE api.curriculum_modules (
  id VARCHAR(100) PRIMARY KEY,
  curriculum_id INTEGER NOT NULL REFERENCES api.curricula(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_curriculum_modules_curriculum ON api.curriculum_modules(curriculum_id);
CREATE INDEX idx_curriculum_modules_order ON api.curriculum_modules(order_index);

-- ============================================================
-- 21. curriculum_nodes — 大纲知识点表（含 AI 出题模板，公共只读）
-- ============================================================
CREATE TABLE api.curriculum_nodes (
  id VARCHAR(100) PRIMARY KEY,
  module_id VARCHAR(100) NOT NULL REFERENCES api.curriculum_modules(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  difficulty INTEGER NOT NULL DEFAULT 1,
  content_types JSONB NOT NULL DEFAULT '[]',
  prerequisites JSONB NOT NULL DEFAULT '[]',
  template_prompts JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_curriculum_nodes_module ON api.curriculum_nodes(module_id);
CREATE INDEX idx_curriculum_nodes_difficulty ON api.curriculum_nodes(difficulty);

-- ============================================================
-- 22. media_files — 媒体文件索引表（公共只读）
-- ============================================================
CREATE TABLE api.media_files (
  id SERIAL PRIMARY KEY,
  original_url TEXT NOT NULL,
  local_path TEXT,
  file_type VARCHAR(20) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  source VARCHAR(50) NOT NULL DEFAULT 'openmaic',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  downloaded_at TIMESTAMPTZ,
  CONSTRAINT media_files_url_unique UNIQUE (original_url)
);

CREATE INDEX idx_media_files_status ON api.media_files(status);
CREATE INDEX idx_media_files_source ON api.media_files(source);

-- ============================================================
-- 23. placement_questions — 评测题目表（预设+AI生成）
-- ============================================================
CREATE TABLE api.placement_questions (
  id SERIAL PRIMARY KEY,
  subject VARCHAR(20) NOT NULL,
  grade_level VARCHAR(30) NOT NULL,
  knowledge_node_id VARCHAR(100) NOT NULL,
  source VARCHAR(10) NOT NULL DEFAULT 'preset',  -- 'preset' | 'ai'
  stem TEXT NOT NULL,                              -- 题干
  options JSONB NOT NULL DEFAULT '[]',             -- [{text, emoji?}]
  correct_index INTEGER NOT NULL,                  -- 正确选项索引 0-3
  difficulty INTEGER NOT NULL DEFAULT 1,           -- 难度 1-5
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT placement_questions_correct_range CHECK (correct_index >= 0 AND correct_index <= 3)
);

CREATE INDEX idx_placement_questions_node ON api.placement_questions(subject, grade_level, knowledge_node_id);
CREATE INDEX idx_placement_questions_source ON api.placement_questions(source);

-- ============================================================
-- 视图：classroom_history_list（列表查询，不含 classroomData）
-- security_invoker=true 确保 RLS 使用调用者权限（PostgreSQL 15+）
-- ============================================================
CREATE VIEW api.classroom_history_list
  WITH (security_invoker = true) AS
SELECT ch.*
FROM api.classroom_history ch;
