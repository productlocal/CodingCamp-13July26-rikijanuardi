# Implementation Plan: To-Do List Life Dashboard

## Overview

The implementation refines and extends the existing three-file client-side application (`index.html`, `css/style.css`, `js/app.js`). Each task targets a specific requirement gap, validation rule, or correctness property identified in the design. A test suite is set up under `tests/` using Jest + fast-check so that every property and unit test can run with `npx jest --testPathPattern tests/`.

---

## Tasks

- [x] 1. Set up the test infrastructure
  - Install Jest and fast-check as `devDependencies` in a new `package.json`
  - Create `jest.config.js` pointing at `tests/**/*.test.js` with `testEnvironment: 'jsdom'`
  - Create stub test files: `tests/unit/greeting.test.js`, `tests/unit/timer.test.js`, `tests/unit/todo.test.js`, `tests/unit/storage.test.js`, `tests/unit/links.test.js`, `tests/integration/performance.test.js`
  - Export all pure functions (`getGreeting`, `formatTime`, `storageGet`, `storageSet`, `generateId`, `escapeHTML`) from `js/app.js` via a conditional `module.exports` guard so they are importable in tests without breaking the browser runtime
  - _Requirements: 7.1, 7.5_

- [x] 2. Greeting & Clock — fix boundary logic and add validation
  - [x] 2.1 Correct `getGreeting` hour boundary ranges in `js/app.js`
    - Adjust upper bound for afternoon: hours 12–16 inclusive (change `< 17` to `<= 16`), evening: 17–20 inclusive, night: 21–23 and 0–4
    - Confirm `updateClock` recomputes the full date string (day name, month name, day number, year) every tick so midnight and greeting boundary crossings are handled automatically
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 2.2 Write property test for clock time format (Property 1)
    - **Property 1: Clock time format**
    - Use `fc.date()` to generate dates; call `updateClock` with a mocked `Date`; assert the `#clock` text matches `/^\d{2}:\d{2}:\d{2}$/` and components are arithmetically consistent
    - **Validates: Requirements 1.1**

  - [ ]* 2.3 Write property test for date string completeness (Property 2)
    - **Property 2: Date string completeness**
    - Use `fc.date()` to generate dates; assert the date string contains the full day name, full month name, numeric day, and four-digit year
    - **Validates: Requirements 1.2**

  - [ ]* 2.4 Write property test for greeting period mapping (Property 3)
    - **Property 3: Greeting period mapping**
    - Use `fc.integer({ min: 0, max: 23 })`; assert `getGreeting(hour)` returns a non-empty string matching the correct period for every integer hour; assert no hour throws
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**

  - [ ]* 2.5 Write unit tests for greeting boundary values
    - Test exact boundary hours: 0, 4, 5, 11, 12, 16, 17, 20, 21, 23
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

- [~] 3. Focus Timer — button enable/disable state and visual styles
  - [-] 3.1 Implement correct button state matrix in `js/app.js`
    - On `startTimer`: disable `#timer-start`, enable `#timer-stop`
    - On `stopTimer`: enable `#timer-start`, disable `#timer-stop`
    - On `resetTimer`: enable `#timer-start`, disable `#timer-stop`
    - When countdown reaches 0: disable both `#timer-start` and `#timer-stop` (done state)
    - On `startTimer` guard: return early if `timerSeconds === 0` so Start stays disabled after Done
    - Ensure `setTimerState('running')` adds CSS class `running` and `setTimerState('stopped')` adds CSS class `stopped`; other states remove both classes
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ]* 3.2 Write property test for timer format correctness (Property 4)
    - **Property 4: Timer format correctness**
    - Use `fc.integer({ min: 0, max: 1500 })`; assert `formatTime(seconds)` matches `/^\d{2}:\d{2}$/`; assert MM equals `Math.floor(seconds/60)` and SS equals `seconds%60`
    - **Validates: Requirements 2.3**

  - [ ]* 3.3 Write property test for timer reset idempotence (Property 5)
    - **Property 5: Timer reset idempotence**
    - Use `fc.integer({ min: 0, max: 1500 })` and `fc.constantFrom('idle','running','stopped')` to set up state; call `resetTimer()` twice; assert `timerSeconds === 1500` and `timerRunning === false` and display shows `25:00` both times
    - **Validates: Requirements 2.5**

  - [ ]* 3.4 Write unit tests for timer state machine transitions
    - Test idle → running → stopped → idle → running → done → idle using fake timers
    - Test that `formatTime` boundary values (0, 59, 60, 1499, 1500) render correctly
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.6_

- [~] 4. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [~] 5. To-Do List — validation, 500-char limit, and modal correctness
  - [ ] 5.1 Implement 500-character validation in `addTodo` in `js/app.js`
    - After trim, if `text.length > 500` display a validation error on `#todo-input` (set `borderColor` to `var(--danger)` for 1500 ms) and return without adding
    - Ensure `maxlength="120"` in the HTML is updated to `maxlength="500"` or the check is enforced purely in JS
    - _Requirements: 3.3_

  - [~] 5.2 Implement label character limit validation for `#todo-input` in `index.html`
    - Update the `maxlength` attribute on `#todo-input` from `120` to `500` so HTML5 validation matches the JS rule
    - _Requirements: 3.3, 7.1_

  - [ ]* 5.3 Write property test for valid task text addition (Property 6)
    - **Property 6: Valid task text addition**
    - Use `fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)`; call `addTodo()` with each generated string; assert `todos.length` increased by 1, new task is at end, `done === false`, text equals `text.trim()`
    - **Validates: Requirements 3.1**

  - [ ]* 5.4 Write property test for whitespace and empty task rejection (Property 7)
    - **Property 7: Whitespace and empty task rejection**
    - Use `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'))`; assert `todos.length` unchanged after `addTodo()` call
    - **Validates: Requirements 3.2**

  - [ ]* 5.5 Write property test for task completion toggle involution (Property 8)
    - **Property 8: Task completion toggle is an involution**
    - Use `fc.boolean()` as initial `done` value; toggle twice; assert final value equals initial value
    - **Validates: Requirements 3.4, 3.5**

  - [ ]* 5.6 Write property test for edit save acceptance and rejection (Property 9)
    - **Property 9: Edit save acceptance and rejection**
    - For valid strings: `fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)`; assert task text updated and modal closed
    - For empty/whitespace: `fc.stringOf(fc.constantFrom(' ', '\t'))`; assert task text unchanged and modal open
    - **Validates: Requirements 3.7, 3.8**

  - [ ]* 5.7 Write property test for task deletion correctness (Property 10)
    - **Property 10: Task deletion removes the correct item**
    - Use `fc.array(taskArbitrary)` and `fc.nat()` as index; delete by ID; assert deleted ID absent from `todos` and all others remain in order
    - **Validates: Requirements 3.9**

  - [ ]* 5.8 Write unit tests for to-do edge cases
    - Empty-state message visible when `todos.length === 0`, hidden otherwise
    - `escapeHTML` with `&`, `<`, `>`, `"`, `'`
    - Edit modal: open, save, cancel, overlay-click, Escape key
    - _Requirements: 3.2, 3.6, 3.7, 3.8, 3.10_

- [~] 6. Storage — persistence round-trips and error handling
  - [~] 6.1 Implement write-failure handling in `saveTodos` and `saveLinks` in `js/app.js`
    - Wrap `storageSet` calls in try/catch in both `saveTodos` and `saveLinks`
    - On catch: revert the in-memory change (remove the just-added or restore the just-removed item) and call a `showStorageError()` helper that displays a temporary error banner visible in the DOM
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.5_

  - [ ]* 6.2 Write property test for task persistence round-trip (Property 11)
    - **Property 11: Task persistence round-trip**
    - Use `fc.array(taskArbitrary)`; call `saveTodos()` then `storageGet(KEYS.TODOS)`; assert deep equality
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

  - [ ]* 6.3 Write unit tests for storage edge cases
    - `storageGet` with `null`, invalid JSON string, non-array value — each should return the fallback
    - `storageGet` / `storageSet` when `localStorage` throws a `SecurityError` — should not propagate
    - _Requirements: 4.6, 6.4, 6.6_

- [~] 7. Quick Links — full validation and duplicate detection
  - [~] 7.1 Implement missing validation rules in `addLink` in `js/app.js`
    - Add label length > 50 check: show validation error on `#link-name` and return
    - Add duplicate URL check: after normalisation, if `isDuplicateUrl(normalizedUrl)` show validation error on `#link-url` and return
    - Extract `normalizeUrl` and `validateUrl` as named functions (already present inline; ensure `validateUrl` checks `hostname.length > 0`)
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 7.2 Write property test for valid link addition (Property 12)
    - **Property 12: Valid link addition**
    - Use `fc.string({ minLength: 1, maxLength: 50 })` for name and a URL arbitrary with valid hostnames; assert `links.length` increased by 1 and stored URL equals normalised URL
    - **Validates: Requirements 5.1**

  - [ ]* 7.3 Write property test for URL scheme normalisation (Property 13)
    - **Property 13: URL scheme normalisation**
    - Use strings without `http://` or `https://` prefix; assert normalised URL starts with `https://` followed by original input
    - **Validates: Requirements 5.3**

  - [ ]* 7.4 Write property test for duplicate URL rejection (Property 14)
    - **Property 14: Duplicate URL rejection**
    - Seed `links` with an existing URL; attempt `addLink()` with the same normalised URL; assert `links.length` unchanged
    - **Validates: Requirements 5.6**

  - [ ]* 7.5 Write property test for link removal correctness (Property 15)
    - **Property 15: Link removal correctness**
    - Use `fc.array(linkArbitrary)` and `fc.nat()` as index; remove by ID; assert removed ID absent and all others remain in order
    - **Validates: Requirements 5.8**

  - [ ]* 7.6 Write property test for link persistence round-trip (Property 16)
    - **Property 16: Link persistence round-trip**
    - Use `fc.array(linkArbitrary)`; call `saveLinks()` then `storageGet(KEYS.LINKS)`; assert deep equality
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ]* 7.7 Write unit tests for quick links edge cases
    - Empty-state message visible when `links.length === 0`
    - `window.open` called with correct URL and `_blank` target on chip click
    - Validation error border shown/reset on invalid URL
    - _Requirements: 5.2, 5.4, 5.7, 5.9_

- [~] 8. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [~] 9. HTML and CSS — fix input constraints and complete accessibility
  - [~] 9.1 Update `index.html` input constraints and ARIA attributes
    - Change `#todo-input` `maxlength` to `500`
    - Add `aria-label` to `#timer-start`, `#timer-stop`, `#timer-reset` buttons
    - Ensure all interactive elements have accessible labels (verify existing `aria-label` attributes on checkboxes, edit/delete buttons, remove buttons are present)
    - _Requirements: 7.1, 7.3_

  - [~] 9.2 Add error and storage-error UI elements to `index.html` and `css/style.css`
    - Add a `#storage-error` banner element (initially hidden via `.hidden` class) inside `<body>` for write-failure notifications
    - Add `.validation-error` CSS rule that sets `border-color: var(--danger)` and a short `box-shadow` to indicate invalid fields
    - _Requirements: 3.3, 5.4, 5.5, 5.6, 6.5_

- [~] 10. Integration — wire new validation paths and run performance checks
  - [~] 10.1 Wire `showStorageError` to the `#storage-error` banner
    - Implement `showStorageError()` in `js/app.js` to remove `.hidden` from `#storage-error`, set a message, and hide it again after 4000 ms
    - Confirm `saveTodos` and `saveLinks` call `showStorageError` on write failure
    - _Requirements: 6.5_

  - [~] 10.2 Write integration / performance tests
    - Time `addTodo()` + `renderTodos()` with 50, 100, and 200 pre-seeded tasks — each run must complete under 100 ms
    - Time `addLink()` + `renderLinks()` with 20 and 50 pre-seeded links — must complete under 100 ms
    - Verify `localStorage` writes are synchronous (no `setTimeout` wrapping `storageSet`)
    - _Requirements: 7.6_

- [~] 11. Final checkpoint — Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery
- Each task references specific requirements for traceability
- The existing `app.js` already implements most of the core logic; tasks focus on the gaps identified in the design (missing validations, button state wiring, storage error handling)
- Property tests validate universal correctness properties across generated inputs; unit tests cover concrete edge cases and state machine flows
- Run tests with: `npx jest --testPathPattern tests/ --runInBand`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "5.1", "5.2", "6.1", "7.1", "9.1", "9.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.2", "3.3", "3.4", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "6.2", "6.3", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "10.1"] },
    { "id": 3, "tasks": ["10.2"] }
  ]
}
```
