## MODIFIED Requirements

### Requirement: Two-phase adaptive assessment engine
The PlacementTestEngine SHALL support a two-phase assessment flow: Phase 1 (discovery) using preset questions, and Phase 2 (verification) using AI-generated or preset fallback questions.

#### Scenario: Phase 1 discovery test plan generation
- **WHEN** `generatePhase1Plan(modules)` is called with curriculum modules
- **THEN** it returns 5-8 preset multiple-choice questions covering each module with at least one question
- **AND** questions are ordered from easier modules to harder modules
- **AND** each question has: `stem`, `options` (4 choices with text+emoji), `correctIndex`, `knowledgeNodeId`, `difficulty`

#### Scenario: Phase 1 completion and analysis
- **WHEN** all Phase 1 questions are answered
- **THEN** the engine produces a `Phase1Analysis` containing: `weakModules` (modules where all questions were answered incorrectly), `uncertainNodes` (boundary knowledge nodes between mastered and unmastered areas), `overallPhase1Score`
- **AND** this analysis determines which knowledge nodes Phase 2 should target

#### Scenario: Phase 2 verification plan generation
- **WHEN** `generatePhase2Plan(phase1Analysis, modules)` is called
- **THEN** it returns 3-5 verification questions targeting the uncertain/weak areas identified in Phase 1
- **AND** questions are either AI-generated (preferred) or from preset bank (fallback)

#### Scenario: Phase 2 answer submission
- **WHEN** a Phase 2 answer is submitted
- **THEN** the engine updates the combined assessment result considering both Phase 1 and Phase 2 answers
- **AND** the final `PlacementResult` reflects the verified mastery levels

#### Scenario: All Phase 1 answers correct (skip Phase 2)
- **WHEN** all Phase 1 questions are answered correctly
- **THEN** Phase 2 is skipped
- **AND** the engine directly produces the final result with high mastery scores

### Requirement: Backward compatibility with single-phase results
The engine SHALL produce `PlacementResult` objects compatible with the existing format (`masteredNodes`, `startingNodes`, `overallScore`).

#### Scenario: Result format compatibility
- **WHEN** a two-phase assessment completes
- **THEN** the result contains the same `PlacementResult` fields as the old single-phase assessment
- **AND** existing code that reads `PlacementResult` continues to work without changes

## ADDED Requirements

### Requirement: Multiple-choice answer evaluation
The engine SHALL evaluate answers by comparing the selected option index against the correct answer index.

#### Scenario: Correct answer selected
- **WHEN** a child selects option index 2 and the correct answer is index 2
- **THEN** `isCorrect` is `true`
- **AND** positive feedback is displayed

#### Scenario: Incorrect answer selected
- **WHEN** a child selects option index 0 and the correct answer is index 2
- **THEN** `isCorrect` is `false`
- **AND** the correct answer is briefly highlighted before moving to the next question

#### Scenario: Question timeout (30 seconds)
- **WHEN** no option is selected within 30 seconds
- **THEN** the question is marked as `isCorrect = false` with `timedOut = true`
- **AND** the engine moves to the next question
