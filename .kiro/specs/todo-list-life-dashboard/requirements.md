# Requirements Document

## Introduction

The **To-Do List Life Dashboard** is a standalone, client-side web application built with HTML, CSS, and Vanilla JavaScript. It provides users with a personal productivity hub that combines a live greeting and clock, a 25-minute focus (Pomodoro-style) timer, a persistent to-do task list, and a set of customizable quick-link shortcuts. All data is stored in the browser's Local Storage with no backend required.

---

## Glossary

- **Dashboard**: The single-page web application that hosts all four feature sections.
- **Greeting_Widget**: The section of the Dashboard that displays the current time, date, and a time-based greeting.
- **Timer**: The countdown component that manages 25-minute focus sessions.
- **Task_List**: The component responsible for managing, persisting, and rendering to-do tasks.
- **Task**: A single to-do item containing a text description and a completion state.
- **Link_Manager**: The component responsible for managing, persisting, and rendering quick-link shortcuts.
- **Quick_Link**: A saved shortcut consisting of a label and a URL that opens in a new browser tab.
- **Local_Storage**: The browser's `localStorage` API used for all client-side data persistence.
- **Edit_Modal**: The overlay dialog used to edit an existing Task's text.

---

## Requirements

### Requirement 1: Live Greeting and Clock Display

**User Story:** As a user, I want to see the current time, date, and a contextual greeting when I open the Dashboard, so that I immediately know the time and feel welcomed.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in 24-hour HH:MM:SS format sourced from the user's local system clock, updated every second.
2. THE Greeting_Widget SHALL display the current day name, month name, day number, and year (e.g., "Sunday, January 1, 2025"), and SHALL update the date display at midnight without requiring a page reload.
3. WHEN the current hour is between 05 and 11 (inclusive), THE Greeting_Widget SHALL display a morning greeting.
4. WHEN the current hour is between 12 and 16 (inclusive), THE Greeting_Widget SHALL display an afternoon greeting.
5. WHEN the current hour is between 17 and 20 (inclusive), THE Greeting_Widget SHALL display an evening greeting.
6. WHEN the current hour is between 21 and 23 (inclusive) OR between 00 and 04 (inclusive), THE Greeting_Widget SHALL display a night greeting.
7. WHEN the current hour crosses a greeting period boundary, THE Greeting_Widget SHALL automatically update the greeting text without requiring a page reload.

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with Start, Stop, and Reset controls, so that I can time focused work sessions.

#### Acceptance Criteria

1. THE Timer SHALL initialise with a countdown value of 25:00, with the Start control enabled, the Stop control disabled, and the Reset control enabled.
2. WHEN the user activates the Start control, THE Timer SHALL begin counting down by exactly 1000 milliseconds on each elapsed second, and SHALL disable the Start control and enable the Stop control.
3. WHILE the Timer is counting down, THE Timer SHALL display the remaining time in MM:SS format where MM is zero-padded to two digits in the range 00–25 and SS is zero-padded to two digits in the range 00–59.
4. WHEN the user activates the Stop control, THE Timer SHALL pause the countdown, retain the remaining time, disable the Stop control, and re-enable the Start control.
5. WHEN the user activates the Reset control, THE Timer SHALL stop any active countdown, restore the display to 25:00, enable the Start control, and disable the Stop control.
6. WHEN the countdown reaches 00:00, THE Timer SHALL stop automatically, display a non-empty session-complete message visible on screen, disable the Stop control, and disable the Start control.
7. IF the Timer display shows 00:00, THEN the Start control SHALL remain disabled so that the timer cannot be restarted without a Reset.
8. WHILE the Timer is counting down, THE Timer SHALL apply a distinct visual style to the display that differs from the idle and paused states.
9. WHILE the Timer is paused, THE Timer SHALL apply a distinct visual style to the display that differs from the running and idle states.

---

### Requirement 3: To-Do Task Management

**User Story:** As a user, I want to add, edit, complete, and delete tasks in a list, so that I can track the things I need to do.

#### Acceptance Criteria

1. WHEN the user submits a non-empty, non-whitespace-only task text of 500 characters or fewer, THE Task_List SHALL add a new Task at the end of the list with the submitted text and a default completion state of incomplete.
2. IF the user submits an empty or whitespace-only task text, THEN THE Task_List SHALL not add a Task and SHALL retain focus on the input field.
3. IF the user submits a task text exceeding 500 characters, THEN THE Task_List SHALL not add a Task and SHALL display a validation error on the input field.
4. WHEN the user activates the complete control for a Task that is incomplete, THE Task_List SHALL change that Task's completion state to complete.
5. WHEN the user activates the complete control for a Task that is complete, THE Task_List SHALL change that Task's completion state to incomplete.
6. WHEN the user activates the edit control for a Task, THE Task_List SHALL open the Edit_Modal pre-populated with the current text of that Task.
7. WHEN the user saves a non-empty, non-whitespace-only text in the Edit_Modal, THE Task_List SHALL update the corresponding Task's text to the saved value and SHALL close the Edit_Modal.
8. IF the user saves an empty or whitespace-only text in the Edit_Modal, THEN THE Task_List SHALL not update the Task and SHALL keep the Edit_Modal open.
9. WHEN the user activates the delete control for a Task, THE Task_List SHALL permanently remove that Task from the list.
10. WHILE the Task_List contains zero Tasks, THE Task_List SHALL display an empty-state message in place of the task list.

---

### Requirement 4: Local Storage Persistence for Tasks

**User Story:** As a user, I want my tasks to be saved automatically so that they are still present when I close and reopen the browser.

#### Acceptance Criteria

1. WHEN a Task is added, THE Task_List SHALL write the updated task collection to Local_Storage using a fixed, documented storage key.
2. WHEN a Task's completion state is toggled, THE Task_List SHALL write the updated task collection to Local_Storage.
3. WHEN a Task's text is edited, THE Task_List SHALL write the updated task collection to Local_Storage.
4. WHEN a Task is deleted, THE Task_List SHALL write the updated task collection to Local_Storage.
5. WHEN the Dashboard loads, THE Task_List SHALL read the task collection from Local_Storage and render all saved Tasks in their stored order.
6. IF Local_Storage is unavailable or the stored data is malformed, THEN THE Task_List SHALL initialise with an empty task collection and SHALL not throw an unhandled error.

---

### Requirement 5: Quick Link Management

**User Story:** As a user, I want to add and remove shortcut buttons for my favourite websites, so that I can open them quickly from the Dashboard.

#### Acceptance Criteria

1. WHEN the user submits a label between 1 and 50 characters and a valid URL, THE Link_Manager SHALL add a new Quick_Link to the display and persist it to storage so that it survives a page reload.
2. IF the user submits an empty label or an empty URL, THEN THE Link_Manager SHALL not add a Quick_Link and SHALL focus the first empty field.
3. IF the user submits a URL that does not begin with `http://` or `https://`, THEN THE Link_Manager SHALL prepend `https://` to the URL before saving the Quick_Link.
4. IF the user submits a string whose hostname is empty after scheme normalisation, THEN THE Link_Manager SHALL reject the input and display a validation error on the URL field.
5. IF the user submits a label exceeding 50 characters, THEN THE Link_Manager SHALL not add a Quick_Link and SHALL display a validation error on the label field.
6. IF the user submits a URL that is already saved as an existing Quick_Link, THEN THE Link_Manager SHALL not add a duplicate Quick_Link and SHALL display a validation error on the URL field.
7. WHEN the user activates a Quick_Link chip, THE Link_Manager SHALL open the corresponding URL in a new browser tab.
8. WHEN the user activates the remove control on a Quick_Link chip, THE Link_Manager SHALL remove that Quick_Link from the display and delete it from persistent storage.
9. WHILE the Link_Manager contains zero Quick_Links, THE Link_Manager SHALL display an empty-state message.

---

### Requirement 6: Local Storage Persistence for Quick Links

**User Story:** As a user, I want my quick links to be saved automatically so that they are still present when I close and reopen the browser.

#### Acceptance Criteria

1. WHEN a Quick_Link is added, THE Link_Manager SHALL write the updated link collection to Local_Storage within 500 milliseconds.
2. WHEN a Quick_Link is removed, THE Link_Manager SHALL write the updated link collection to Local_Storage within 500 milliseconds.
3. WHEN the Dashboard loads, THE Link_Manager SHALL read the link collection from Local_Storage and render all saved Quick_Links within 1000 milliseconds.
4. IF Local_Storage is unavailable when the Dashboard loads, THEN THE Link_Manager SHALL initialise with an empty link collection and SHALL not throw an unhandled error.
5. IF a write to Local_Storage fails after an add or remove operation, THEN THE Link_Manager SHALL display an error message and SHALL not update the display with the failed change.
6. IF the data retrieved from Local_Storage is malformed or cannot be parsed, THEN THE Link_Manager SHALL initialise with an empty link collection and SHALL not throw an unhandled error.

---

### Requirement 7: Technical Constraints

**User Story:** As a developer, I want the application to follow strict technology and file-structure constraints, so that the codebase remains simple, maintainable, and dependency-free.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using only HTML, CSS, and Vanilla JavaScript, with no external frameworks or libraries.
2. THE Dashboard SHALL require no backend server and SHALL operate entirely in the browser.
3. THE Dashboard SHALL function correctly in current stable releases of Chrome, Firefox, Edge, and Safari.
4. THE Dashboard SHALL use exactly one CSS file located at `css/style.css`.
5. THE Dashboard SHALL use exactly one JavaScript file located at `js/app.js`.
6. WHEN a user interaction results in dynamic content being added or modified, THE Dashboard SHALL complete the visual update within 100ms on a modern desktop browser.
