## ADDED Requirements

### Requirement: Lesson list display after subject selection
When user selects a subject and clicks "开始学习", the system SHALL display a list of all cached lessons for that subject instead of immediately entering the classroom. Each lesson card SHALL show the lesson title and a thumbnail image.

#### Scenario: Cached lessons available
- **WHEN** user selects a subject and clicks "开始学习" and there are 3 cached lessons
- **THEN** system displays 3 lesson cards in cached order, each showing title and thumbnail

#### Scenario: No cached lessons
- **WHEN** user selects a subject and clicks "开始学习" and no lessons are cached
- **THEN** system displays a "课程准备中" (lessons preparing) message with a friendly illustration and a back button

### Requirement: Sequential unlock mechanism
Lessons SHALL be unlocked sequentially — only the first uncompleted lesson in the list is available for learning. All subsequent lessons SHALL display a locked state.

#### Scenario: First visit with 3 lessons
- **WHEN** user enters lesson picker with 3 cached lessons and none completed
- **THEN** lesson 1 is displayed as "unlocked/available", lessons 2 and 3 are displayed as "locked" with a lock icon overlay

#### Scenario: After completing first lesson
- **WHEN** user completes lesson 1 and re-enters the lesson picker
- **THEN** lesson 1 is no longer in the list (cache deleted), lesson 2 is "unlocked/available", lesson 3 is "locked"

#### Scenario: Tapping a locked lesson
- **WHEN** user taps on a locked lesson card
- **THEN** the system SHALL NOT navigate to the classroom; a gentle bounce animation or tooltip indicates the lesson is locked

### Requirement: Lesson card thumbnail extraction
Each lesson card SHALL display a thumbnail image extracted from the classroom data. The system SHALL use the first non-empty `imageUrl` found in the classroom's scenes and slides. If no image is available, a subject-specific emoji fallback SHALL be displayed.

#### Scenario: Classroom has image slides
- **WHEN** a cached classroom contains a slide with `imageUrl` set
- **THEN** the lesson card displays that image as the thumbnail

#### Scenario: Classroom has no images
- **WHEN** a cached classroom has no slides with `imageUrl`
- **THEN** the lesson card displays the subject emoji (🔢 for math, 📖 for chinese, 🔤 for english) as fallback

### Requirement: Enter classroom from lesson card
When user taps an unlocked lesson card, the system SHALL load the full classroom data from cache and transition to the classroom iframe view.

#### Scenario: Tap unlocked lesson
- **WHEN** user taps the first (unlocked) lesson card
- **THEN** system loads the classroom data from ClassroomCache and renders the ClassroomIframe

#### Scenario: Loading state during classroom load
- **WHEN** user taps an unlocked lesson and classroom data is being loaded from cache
- **THEN** system shows a loading indicator on the tapped card

### Requirement: Return to lesson list from classroom
After completing a lesson, the system SHALL follow the existing completion flow (celebration → summary). When user navigates back to start a new lesson, the lesson list SHALL refresh showing remaining lessons.

#### Scenario: Complete lesson and start next
- **WHEN** user completes a lesson and clicks "继续学习" or re-enters "开始学习"
- **THEN** the lesson list refreshes, showing only remaining cached lessons with the next one unlocked

### Requirement: Sunny Playground visual style
The lesson picker view SHALL follow the project's Sunny Playground design system with warm colors, rounded corners (28px card radius), Framer Motion animations, and child-friendly visual hierarchy.

#### Scenario: Visual consistency
- **WHEN** the lesson picker is displayed
- **THEN** it uses the same background gradient, font families (Baloo 2 / Nunito), and color tokens as other pages in the app
