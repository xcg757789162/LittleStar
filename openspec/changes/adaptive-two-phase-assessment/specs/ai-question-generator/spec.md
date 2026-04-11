## ADDED Requirements

### Requirement: AI question generation for Phase 2 verification
The system SHALL generate 4-choice questions by calling an LLM, given a knowledge node's name, description, and the child's age group.

#### Scenario: Successful AI question generation
- **WHEN** the assessment engine requests a verification question for knowledge node "10以内加法" with child age 5
- **THEN** the AI generator returns a JSON object containing: `stem` (≤20 chars), `options` (4 items, each with `text` + `emoji`), `correctIndex` (0-3), and `explanation`
- **AND** the response is parsed and validated against the expected schema

#### Scenario: LLM API unavailable (degraded mode)
- **WHEN** the AI generator call fails due to network error or missing API key
- **THEN** the system falls back to selecting a preset question from the question bank for the same knowledge node
- **AND** the user is NOT shown any error message; the assessment continues seamlessly

#### Scenario: LLM returns malformed JSON
- **WHEN** the LLM response cannot be parsed as valid JSON matching the expected schema
- **THEN** the system retries once with a more explicit prompt
- **AND** if the retry also fails, falls back to a preset question

### Requirement: Question generation prompt structure
The system SHALL use a structured prompt that includes knowledge node context, age-appropriate language level, and strict JSON output schema.

#### Scenario: Prompt for math question (middle kindergarten)
- **WHEN** generating a question for node "10以内加法", grade "middle-kindergarten"
- **THEN** the prompt instructs the LLM to: use language suitable for 4-5 year olds, include emoji in options, keep the stem under 20 Chinese characters, provide exactly 4 options with one correct answer and three plausible distractors

### Requirement: Question caching
The system SHALL cache AI-generated questions in the `placement_questions` table with `source = 'ai'` for potential reuse.

#### Scenario: Caching a newly generated question
- **WHEN** an AI-generated question is successfully validated
- **THEN** it is inserted into `placement_questions` with the knowledge_node_id, subject, grade_level, and source='ai'
- **AND** subsequent assessments for the same node MAY reuse this cached question
