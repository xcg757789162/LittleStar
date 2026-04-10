## ADDED Requirements

### Requirement: Statistics refresh on page visibility change

The ParentDashboard SHALL refresh all statistics (daily learning duration, questions completed, accuracy, cached lesson count, subject masteries) when the page becomes visible after being hidden.

#### Scenario: User completes a lesson then returns to ParentDashboard

- **WHEN** the user navigates from LearningSession back to ParentDashboard (page becomes visible)
- **THEN** the ParentDashboard automatically reloads daily statistics from the `daily_sessions` table
- **AND** the displayed values for "今日学习", "完成题数", and "正确率" reflect the latest data

#### Scenario: User switches browser tabs and returns

- **WHEN** the user switches away from the ParentDashboard tab and then returns
- **THEN** statistics are refreshed if more than 5 seconds have passed since the last refresh

### Requirement: Cache count refresh on classroom-completed event

The ParentDashboard and Home page SHALL refresh their displayed cached lesson count when a `classroom-completed` CustomEvent is dispatched.

#### Scenario: Classroom completed while on Home page

- **WHEN** a `classroom-completed` event is dispatched after lesson completion
- **THEN** the Home page refreshes its `cachedCount` state within 3 seconds

#### Scenario: ParentDashboard receives completion event

- **WHEN** the ParentDashboard component is mounted and a `classroom-completed` event fires
- **THEN** the `cachedCount` display updates to reflect the current cache size

### Requirement: Statistics show non-zero values after learning

After a user completes at least one classroom lesson, the statistics on the ParentDashboard SHALL display non-zero values for the current day.

#### Scenario: First lesson of the day completed

- **WHEN** a user completes their first classroom lesson of the day
- **AND** navigates to the ParentDashboard
- **THEN** "今日学习" shows a value > 0 分
- **AND** "完成题数" shows a value > 0 题
- **AND** "正确率" shows a percentage > 0%
