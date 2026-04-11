## MODIFIED Requirements

### Requirement: Extended placement_tests table
The `placement_tests` table SHALL be extended with phase tracking fields while maintaining backward compatibility.

#### Scenario: New two-phase assessment record
- **WHEN** a two-phase assessment is stored
- **THEN** the `placement_tests` table contains two rows: one for Phase 1 (phase='phase1') and one for Phase 2 (phase='phase2', parent_test_id referencing Phase 1's id)
- **AND** each row has its own `questions` JSONB array with the question details and answers

#### Scenario: Backward compatibility with old records
- **WHEN** old assessment records (without phase field) are queried
- **THEN** the `phase` field defaults to 'single'
- **AND** all existing queries continue to work without modification

## ADDED Requirements

### Requirement: placement_questions table
The system SHALL have a `placement_questions` table storing both preset and AI-generated questions.

#### Scenario: Table structure
- **WHEN** the `placement_questions` table is created
- **THEN** it has columns: `id` (SERIAL PK), `subject` (VARCHAR 20), `grade_level` (VARCHAR 30), `knowledge_node_id` (VARCHAR 100), `source` (VARCHAR 10, 'preset' or 'ai'), `stem` (TEXT), `options` (JSONB), `correct_index` (INTEGER), `difficulty` (INTEGER), `created_at` (TIMESTAMPTZ DEFAULT NOW())
- **AND** an index exists on `(subject, grade_level, knowledge_node_id)`

#### Scenario: Inserting a preset question
- **WHEN** a preset question from the question bank JSON is loaded
- **THEN** it is stored with `source = 'preset'` and all fields populated from the JSON file

#### Scenario: Inserting an AI-generated question
- **WHEN** an AI-generated question passes validation
- **THEN** it is stored with `source = 'ai'` and the `knowledge_node_id` of the target node

### Requirement: Migration script
The system SHALL provide a SQL migration script that can be run against an existing database to add the new table and columns.

#### Scenario: Running migration on existing database
- **WHEN** the migration SQL is executed
- **THEN** the `placement_questions` table is created
- **AND** `placement_tests` table gains `phase` (VARCHAR DEFAULT 'single'), `phase1_result` (JSONB), and `parent_test_id` (INTEGER) columns
- **AND** existing data is NOT modified or deleted
- **AND** indexes are created for the new columns
