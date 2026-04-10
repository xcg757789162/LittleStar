## ADDED Requirements

### Requirement: Minimum cache watermark threshold

The system SHALL maintain a minimum cache watermark of 3 classroom lessons per child. When the number of cached lessons falls below this threshold, the system MUST automatically trigger background pre-generation to replenish the cache.

#### Scenario: Cache below threshold triggers pre-generation

- **WHEN** a classroom lesson is completed and deleted from cache, reducing cache count to below 3
- **THEN** the system automatically triggers a new pre-generation cycle within 2 seconds

#### Scenario: Pre-generation fills cache to sufficient level

- **WHEN** pre-generation is triggered due to low cache
- **THEN** the system plans lessons for 2 days (approximately 6-10 lessons) and generates classrooms until cache count reaches at least 3

#### Scenario: Cache already at or above threshold

- **WHEN** the cache already contains 3 or more lessons
- **THEN** the system SHALL NOT trigger additional pre-generation

### Requirement: Pre-generation skips only when cache is sufficient

The `runPreGeneration()` function SHALL only skip generation when `existingSize >= MIN_CACHE_SIZE (3)`, not when `existingSize > 0` as in the current implementation.

#### Scenario: One lesson remaining in cache

- **WHEN** the cache contains 1 lesson and pre-generation is triggered
- **THEN** the system proceeds with lesson planning and generation (does NOT skip)

#### Scenario: Three or more lessons in cache

- **WHEN** the cache contains 3 or more lessons and pre-generation is triggered
- **THEN** the system skips generation and sets status to 'completed'

### Requirement: Lesson planning generates sufficient volume

The `usePreGeneration` hook SHALL plan lessons with `days: 2` (instead of `days: 1`) to ensure enough classrooms are generated to fill the cache above the minimum threshold.

#### Scenario: Planning generates multi-day lessons

- **WHEN** pre-generation triggers lesson planning
- **THEN** the LessonPlanner is called with `days: 2`, producing approximately 6-10 lessons across all completed subjects
