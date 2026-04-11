## ADDED Requirements

### Requirement: Preset question bank file format
The system SHALL store preset questions in JSON files at `src/data/question-bank/{subject}-{gradeLevel}.json`, each containing an array of questions indexed by knowledge node ID.

#### Scenario: Loading math questions for middle kindergarten
- **WHEN** the assessment engine loads `math-middle-kindergarten.json`
- **THEN** it receives an object with knowledge node IDs as keys, each mapping to an array of question objects
- **AND** each question has: `stem` (string), `options` (array of 4 `{text, emoji}` objects), `correctIndex` (0-3), `difficulty` (1-5)

#### Scenario: Missing question bank file
- **WHEN** a question bank file does not exist for a subject/grade combination
- **THEN** the engine logs a warning and generates all questions via AI
- **AND** the assessment is NOT blocked

### Requirement: Question bank coverage
Each question bank file SHALL contain at least 2 questions per knowledge node, with varying difficulty levels.

#### Scenario: Multiple questions per node
- **WHEN** the engine selects a question for knowledge node "10以内加法"
- **THEN** it finds at least 2 available questions with different difficulty levels
- **AND** Phase 1 selects the easier variant; Phase 2 fallback selects the harder variant

### Requirement: Initial question bank for 3 subjects
The system SHALL provide initial question banks for middle-kindergarten level covering math (数学), chinese (语文), and english (英语).

#### Scenario: Math question bank content
- **WHEN** the math question bank is loaded
- **THEN** it contains questions covering: counting (数数), basic addition (10以内加法), basic subtraction (10以内减法), shape recognition (图形认识), comparison (比较大小)
- **AND** each question uses age-appropriate language and emoji

#### Scenario: Chinese question bank content
- **WHEN** the Chinese question bank is loaded
- **THEN** it contains questions covering: character recognition (汉字认读), pinyin basics (拼音基础), vocabulary (词汇), simple reading (简单阅读)
- **AND** questions use picture-based or emoji-based options where possible

#### Scenario: English question bank content
- **WHEN** the English question bank is loaded
- **THEN** it contains questions covering: alphabet recognition (字母认识), basic words (基础单词), colors/numbers (颜色和数字), greetings (问候语)
- **AND** questions include English text with Chinese hints for younger children
