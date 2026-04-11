## MODIFIED Requirements

### Requirement: Immediate post-assessment lesson pregeneration
The usePlacementTest hook SHALL trigger asynchronous pregeneration of 3 lessons immediately after the assessment result is persisted to the database.

#### Scenario: Successful pregeneration trigger after assessment
- **WHEN** the assessment completes and result is written to `placement_tests` table
- **THEN** the system immediately calls `GenerationScheduler.scheduleForChild(childId, subject, 3)`
- **AND** the pregeneration runs asynchronously in the background without blocking the result display
- **AND** the user sees the result page immediately while pregeneration proceeds

#### Scenario: Assessment DB write fails but pregeneration still triggers
- **WHEN** the assessment result fails to write to the database
- **THEN** the pregeneration is still triggered using the in-memory assessment result
- **AND** the result page is displayed with a subtle warning "评测结果将在下次连接时保存"

#### Scenario: Pregeneration failure does not affect assessment
- **WHEN** the pregeneration call fails (OpenMAIC Pipeline unavailable)
- **THEN** the assessment result page is NOT affected
- **AND** the Home page's existing `usePreGeneration` hook will retry when the user navigates home

### Requirement: Pregeneration uses assessment results for lesson planning
The pregeneration SHALL use the assessment's `PlacementResult` to plan contextually appropriate lessons.

#### Scenario: Lesson planning based on assessment mastery
- **WHEN** pregeneration is triggered with an assessment result showing mastery of "counting" but weakness in "addition"
- **THEN** the `LessonPlanner` creates a plan with: lesson 1 reviewing counting briefly + introducing addition basics, lesson 2 focusing on addition practice, lesson 3 mixing addition with new content
- **AND** each lesson's `requirement` reflects the child's assessed level

### Requirement: Pregeneration progress visible on Home page
The Home page SHALL display the pregeneration status for the newly assessed subject.

#### Scenario: Pregeneration in progress
- **WHEN** the user navigates to Home while pregeneration is running
- **THEN** the subject card shows a progress indicator "正在准备课程 (1/3)"
- **AND** completed lessons show a checkmark

#### Scenario: Pregeneration completed
- **WHEN** all 3 lessons are successfully generated and cached
- **THEN** the subject card shows "3堂课已就绪" with a ready indicator
- **AND** the child can immediately start the first lesson
