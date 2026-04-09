## ADDED Requirements

### Requirement: PostgreSQL 数据库 Schema
系统 SHALL 提供完整的 PostgreSQL 数据库 Schema，包含 14 张表（+1 张拆分表）的 DDL、索引、约束和注释。

#### Scenario: 用户表
- **WHEN** 创建数据库
- **THEN** 系统 MUST 创建 `users` 表，包含字段：`id SERIAL PRIMARY KEY`、`username VARCHAR(50) UNIQUE NOT NULL`、`password_hash VARCHAR(255) NOT NULL`、`nickname VARCHAR(100) NOT NULL`、`created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`、`last_login_at TIMESTAMPTZ`

#### Scenario: 孩子表
- **WHEN** 创建数据库
- **THEN** 系统 MUST 创建 `children` 表，包含字段：`id SERIAL PRIMARY KEY`、`user_id INTEGER NOT NULL REFERENCES users(id)`、`name VARCHAR(50) NOT NULL`、`avatar VARCHAR(255) NOT NULL`、`age INTEGER NOT NULL`、`grade_level VARCHAR(30) NOT NULL`、`created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`、`settings JSONB NOT NULL DEFAULT '{}'`
- **AND** `(user_id, name)` 组合 MUST 有唯一约束

#### Scenario: 知识点表（公共只读）
- **WHEN** 创建数据库
- **THEN** 系统 MUST 创建 `knowledge_nodes` 表，主键为 `id VARCHAR(100) PRIMARY KEY`（预设 ID），包含 `subject`、`grade_level`、`name`、`description`、`prerequisites JSONB`、`next_nodes JSONB`、`difficulty INTEGER`、`content_type VARCHAR(20)`、`order_index INTEGER`
- **AND** 该表 MUST 有 `(subject, grade_level)` 复合索引

#### Scenario: 题目表（公共只读）
- **WHEN** 创建数据库
- **THEN** 系统 MUST 创建 `questions` 表，主键为 `id VARCHAR(100) PRIMARY KEY`（预设 ID），包含 `knowledge_node_id`、`type`、`content JSONB`、`answer JSONB`、`difficulty INTEGER`、`is_ai_generated BOOLEAN`、`template_id VARCHAR(100)`
- **AND** 该表 MUST 有 `(knowledge_node_id, type)` 复合索引

#### Scenario: 学习记录表
- **WHEN** 创建数据库
- **THEN** 系统 MUST 创建 `learning_records` 表，自增主键，包含 `child_id REFERENCES children(id)`、`knowledge_node_id`、`question_id`、`answer JSONB`、`is_correct BOOLEAN`、`time_spent INTEGER`、`attempt_count INTEGER`、`timestamp TIMESTAMPTZ`、`pronunciation_score NUMERIC`、`pronunciation_stars INTEGER`
- **AND** 该表 MUST 有 `(child_id, knowledge_node_id)` 复合索引和 `timestamp` 索引

#### Scenario: 课堂历史拆表
- **WHEN** 创建数据库
- **THEN** 系统 MUST 创建 `classroom_history` 表（不含 classroomData）和 `classroom_snapshots` 表（存储 classroomData JSONB）
- **AND** `classroom_snapshots.history_id` MUST 有唯一约束并外键引用 `classroom_history(id) ON DELETE CASCADE`

### Requirement: RLS 行级安全策略
系统 SHALL 在所有用户数据表上启用 RLS，确保用户只能访问自己的数据。

#### Scenario: 用户数据隔离
- **WHEN** 已认证用户通过 PostgREST 查询数据
- **THEN** RLS 策略 MUST 确保用户只能看到自己的 `users` 记录、自己的 `children` 记录、以及自己孩子关联的所有子表记录
- **AND** `knowledge_nodes`、`questions`、`question_templates` 表 MUST 对 `anon` 角色开放只读权限

#### Scenario: 数据写入隔离
- **WHEN** 已认证用户通过 PostgREST 插入/更新/删除数据
- **THEN** RLS 策略 MUST 确保用户只能操作自己的数据
- **AND** 公共表 MUST 禁止非管理员角色写入

### Requirement: 种子数据初始化
系统 SHALL 在数据库首次启动时自动加载种子数据。

#### Scenario: 初始化种子数据
- **WHEN** PostgreSQL 容器首次启动
- **THEN** 系统 MUST 通过 `/docker-entrypoint-initdb.d/` 目录下的 SQL 脚本自动创建表结构并插入知识点、题目、出题模板等种子数据
- **AND** 种子数据内容 MUST 与当前 `src/data/seed/` 中的 TypeScript 数据一致
