## ADDED Requirements

### Requirement: startReview method implementation and export

The `useLearningFlow` hook SHALL export a `startReview` method and an `isReviewMode` state, enabling the LearningSession to initiate review-specific learning flows.

#### Scenario: Quick review loads historical classroom

- **WHEN** `startReview` is called with `mode: 'quick-review'` and a `historyId`
- **THEN** the system loads the historical classroom data from `classroom_snapshots` (via ReviewLearningService)
- **AND** sets `currentClassroom` to the loaded classroom for iframe rendering
- **AND** sets `isReviewMode` to `true`

#### Scenario: Deep relearn generates new classroom for weak knowledge

- **WHEN** `startReview` is called with `mode: 'deep-relearn'` and a `knowledgeNodeId`
- **THEN** the system generates a new reinforcement classroom targeting the specified knowledge node
- **AND** the new classroom uses the student's current mastery level for difficulty calibration
- **AND** sets `isReviewMode` to `true`

#### Scenario: startReview is unavailable in return value (current bug)

- **WHEN** the `useLearningFlow` hook is invoked
- **THEN** the return object MUST include both `startReview` method and `isReviewMode` state

### Requirement: LearningSession routes review mode correctly

The LearningSession page SHALL call `startReview` (not `startFlow`) when `location.state.reviewMode` is present.

#### Scenario: Navigating with deep-relearn mode

- **WHEN** LearningSession receives `location.state = { reviewMode: 'deep-relearn', knowledgeNodeId: 'xxx', subject: 'english' }`
- **THEN** it calls `startReview({ mode: 'deep-relearn', knowledgeNodeId: 'xxx', subject: 'english' })`
- **AND** does NOT call `startFlow()`

#### Scenario: Navigating with quick-review mode

- **WHEN** LearningSession receives `location.state = { reviewMode: 'quick-review', historyId: '42', subject: 'math' }`
- **THEN** it calls `startReview({ mode: 'quick-review', historyId: '42', subject: 'math' })`

### Requirement: Review completion does not consume cache

When a review session (quick-review or deep-relearn) completes, the system SHALL NOT delete any entry from the regular lesson cache. Review sessions are independent of the normal cache flow.

#### Scenario: Quick review completion preserves cache

- **WHEN** a quick-review session completes via `handleClassroomComplete`
- **THEN** the `classroom_cache` table is NOT modified (no deletion)
- **AND** the completion is recorded in `daily_sessions` and `classroom_history` with `isReview: true`

#### Scenario: Deep relearn completion preserves cache

- **WHEN** a deep-relearn session completes
- **THEN** the regular cache is unaffected
- **AND** the generated review classroom is NOT stored in the regular cache
