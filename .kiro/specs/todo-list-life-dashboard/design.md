# Design Document: To-Do List Life Dashboard

## Overview

The Life Dashboard is a single-page web application delivered as three static files: `index.html`, `css/style.css`, and `js/app.js`. It runs entirely in the browser with no build step, no server, and no external dependencies.

Four independent widgets share a single HTML page and a single JS module:

| Widget | Purpose |
|---|---|
| Greeting & Clock | Live time/date display with time-based greeting |
| Focus Timer | 25-minute Pomodoro-style countdown |
| Task List | Persistent to-do item management |
| Quick Links | Persistent shortcut chip panel |

All state that must survive a page reload is stored in `localStorage` under two fixed keys (`dashboard_todos`, `dashboard_links`). The application has no asynchronous I/O — every user interaction completes synchronously within the 100 ms budget.

---

## Architecture

### High-Level Structure

```
index.html          — semantic shell (no inline JS, no inline styles)
css/style.css       — CSS custom properties, layout, component styles
js/app.js           — single IIFE-free module in 'use strict' mode
```

`app.js` is organized into five named sections separated by banner comments:

```
1. Storage helpers        — storageGet / storageSet / generateId
2. Greeting & Clock       — updateClock, getGreeting, setInterval ticker
3. Focus Timer            — state machine + DOM bindings
4. To-Do List             — CRUD + Edit_Modal + render
5. Quick Links            — CRUD + validation + render
```

No global namespace pollution occurs because all variables are `let`/`const` at module scope and the file is consumed by a `<script>` tag at the bottom of `<body>` (DOM is ready before execution starts).

### Execution Model

```
DOMContentLoaded (implicit — script at bottom of body)
  │
  ├─ updateClock()              // first paint, then setInterval(1000)
  ├─ renderTimer()              // idle state
  ├─ renderTodos()              // from localStorage
  └─ renderLinks()              // from localStorage
```

All subsequent updates are event-driven (click, keydown, change) or timer-driven (setInterval).

### Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        index.html                        │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │ Greeting &   │  │  Focus Timer  │  │  Quick Links │ │
│  │    Clock     │  │               │  │   Manager    │ │
│  └──────┬───────┘  └───────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
│  ┌──────┴───────┐  ┌───────┴───────┐  ┌──────┴───────┐ │
│  │  setInterval │  │  setInterval  │  │  localStorage│ │
│  │  (1 second)  │  │  (1 second)   │  │  (links key) │ │
│  └──────────────┘  └───────────────┘  └──────────────┘ │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Task List + Edit Modal              │   │
│  │            localStorage (todos key)              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### 1. Storage Helpers

Shared utilities used by both Task List and Quick Links.

```js
storageGet(key: string, fallback: any = []): any
storageSet(key: string, value: any): void
generateId(): string   // timestamp + random suffix, collision-safe within session
```

`storageGet` wraps `JSON.parse(localStorage.getItem(key))` in a try/catch and returns `fallback` on any error (quota exceeded, malformed JSON, SecurityError). `storageSet` calls `JSON.stringify` + `localStorage.setItem`; callers that need failure feedback wrap it in their own try/catch.

### 2. Greeting & Clock

**DOM bindings:** `#clock`, `#greeting`, `#date-display`

```js
getGreeting(hour: number): string
  // hour 05–11 → morning string
  // hour 12–16 → afternoon string
  // hour 17–20 → evening string
  // hour 21–23 or 00–04 → night string

updateClock(): void
  // reads new Date(), updates all three DOM elements
  // called immediately on load, then every 1000ms via setInterval
```

`setInterval(updateClock, 1000)` drives both the clock and the greeting boundary update (Requirement 1.7). The date change at midnight is detected automatically because `updateClock` recomputes the full date string on every tick.

### 3. Focus Timer

**DOM bindings:** `#timer-display`, `#timer-label`, `#timer-start`, `#timer-stop`, `#timer-reset`

**State variables (module-level):**
```js
let timerSeconds: number   // remaining seconds, 0–1500
let timerInterval: number  // setInterval handle, null when idle/stopped
let timerRunning: boolean  // true only while countdown is active
```

**Public interface:**
```js
formatTime(seconds: number): string   // pure, MM:SS zero-padded
renderTimer(): void                   // updates #timer-display text
setTimerState(state: 'idle'|'running'|'stopped'|'done'): void
startTimer(): void
stopTimer(): void
resetTimer(): void
```

**Button state matrix:**

| Timer State | Start | Stop | Reset |
|---|---|---|---|
| idle | enabled | disabled | enabled |
| running | disabled | enabled | enabled |
| stopped | enabled | disabled | enabled |
| done (00:00) | disabled | disabled | enabled |

### 4. Task List + Edit Modal

**DOM bindings:** `#todo-input`, `#todo-add`, `#todo-list`, `#todo-empty`, `#edit-modal`, `#edit-input`, `#edit-save`, `#edit-cancel`

**State variables:**
```js
let todos: Task[]
let editingId: string | null
```

**Task data shape** (see Data Models).

**Public interface:**
```js
addTodo(): void
renderTodos(): void
saveTodos(): void
openEditModal(id: string, currentText: string): void
closeEditModal(): void
saveEdit(): void
escapeHTML(str: string): string   // XSS-safe rendering
```

**Validation rules for addTodo:**
1. Trim input value.
2. If empty string after trim → focus input, return.
3. If length > 500 → show validation error, return.
4. Otherwise → push new Task, saveTodos(), renderTodos(), clear input, focus input.

**Validation rules for saveEdit:**
1. Trim editInput value.
2. If empty after trim → do nothing (keep modal open).
3. Otherwise → mutate todo.text, saveTodos(), renderTodos(), closeEditModal().

### 5. Quick Links Manager

**DOM bindings:** `#link-name`, `#link-url`, `#link-add`, `#links-grid`, `#links-empty`

**State variables:**
```js
let links: QuickLink[]
```

**Public interface:**
```js
addLink(): void
renderLinks(): void
saveLinks(): void
getFaviconUrl(url: string): string | null
normalizeUrl(url: string): string   // prepend https:// if no scheme
validateUrl(url: string): boolean   // new URL(url) must not throw
isDuplicateUrl(url: string): boolean
```

**Validation rules for addLink:**
1. Trim name and url.
2. If name is empty → focus `#link-name`, return.
3. If url is empty → focus `#link-url`, return.
4. If name.length > 50 → show validation error on label field, return.
5. Normalize url: if not `/^https?:\/\//i`, prepend `https://`.
6. Validate with `new URL(normalizedUrl)` — if throws → highlight url field, return.
7. If hostname is empty → highlight url field, return.
8. If `isDuplicateUrl(normalizedUrl)` → highlight url field, return.
9. Push new QuickLink, saveLinks(), renderLinks(), clear inputs, focus `#link-name`.

---

## Data Models

### Task

```js
{
  id:   string,   // generateId() — unique within session, stable across reloads
  text: string,   // 1–500 chars, stored as-is (rendered via escapeHTML)
  done: boolean   // false = incomplete, true = complete
}
```

### QuickLink

```js
{
  id:   string,   // generateId()
  name: string,   // 1–50 chars, display label
  url:  string    // normalised, validated URL
}
```

### localStorage Schema

```
Key:   "dashboard_todos"
Value: JSON array of Task objects
       [ { "id": "lx3k7abc2", "text": "Buy milk", "done": false }, … ]

Key:   "dashboard_links"
Value: JSON array of QuickLink objects
       [ { "id": "lx3k7def9", "name": "GitHub", "url": "https://github.com" }, … ]
```

Both keys are defined in the `KEYS` constant object at the top of `app.js` to avoid magic strings.

---

## Key Algorithms

### formatTime

```js
function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}
```

Pure function. Input domain: integers 0–1500 (25 * 60). Output: always a 5-character string matching `/^\d{2}:\d{2}$/`.

### getGreeting

```js
function getGreeting(hour) {
  if (hour >= 5  && hour < 12) return '☀️  Good morning!';
  if (hour >= 12 && hour < 17) return '🌤️  Good afternoon!';
  if (hour >= 17 && hour < 21) return '🌆  Good evening!';
  return '🌙  Good night!';
}
```

Pure function. The catch-all branch covers hours 21–23 and 0–4, satisfying Requirement 1.6.

### updateClock

```js
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  clockEl.textContent    = `${h}:${m}:${s}`;
  greetingEl.textContent = getGreeting(now.getHours());
  dateEl.textContent     = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}
```

Called every 1000 ms. The date string recomputes on every call, so midnight crossings and greeting boundary crossings are handled automatically.

### URL Normalisation & Validation

```js
function normalizeUrl(url) {
  return /^https?:\/\//i.test(url) ? url : 'https://' + url;
}

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.length > 0;
  } catch {
    return false;
  }
}
```

These two helpers compose cleanly: `normalizeUrl` runs first, then `validateUrl` on the result.

### generateId

```js
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
```

Produces a base-36 timestamp prefix plus 5 random chars. Collision probability within a single session is negligible for the expected number of tasks/links (< 1000).

### escapeHTML

```js
function escapeHTML(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}
```

Applied to every user-supplied string before injecting into `innerHTML`. Prevents stored XSS.

---

## State Machines

### Focus Timer State Machine

```
         ┌─────────────────────────────────────────┐
         │              IDLE (25:00)               │
         │  Start=on  Stop=off  Reset=on           │
         └──────────────────┬──────────────────────┘
                            │ click Start
                            ▼
         ┌─────────────────────────────────────────┐
         │              RUNNING                    │
         │  Start=off  Stop=on  Reset=on           │◄──┐
         │  display class: 'running'               │   │
         └────────────┬──────────────┬─────────────┘   │ click Start
                      │              │                  │
               click Stop      reaches 0:00            │
                      │              │                  │
                      ▼              ▼                  │
         ┌─────────────────┐  ┌─────────────────────┐  │
         │    STOPPED      │  │       DONE           │  │
         │  Start=on       │  │  Start=off Stop=off  │  │
         │  Stop=off       │  │  Reset=on            │  │
         │  Reset=on       │  │  label: "🎉 ..."     │  │
         │  class:'stopped'│  └──────────┬───────────┘  │
         └────────┬────────┘             │               │
                  │             click Reset              │
                  │                      │               │
                  └──────────────────────┘               │
                         click Reset                     │
                               │                         │
                               ▼                         │
                         ┌─────────┐                     │
                         │  IDLE   │─────────────────────┘
                         └─────────┘
```

Transitions are driven by button clicks (Start, Stop, Reset) and by the `setInterval` callback that decrements `timerSeconds`. The `setTimerState(state)` function applies CSS classes and label text in one place, keeping visual state in sync with logical state.

### Edit Modal State Machine

```
         ┌───────────────────────────────────┐
         │            CLOSED                 │
         │  editingId = null                 │
         │  modal has class 'hidden'         │
         └─────────────────┬─────────────────┘
                           │ click Edit button on task
                           ▼
         ┌───────────────────────────────────┐
         │             OPEN                  │
         │  editingId = task.id              │
         │  editInput.value = task.text      │
         │  modal visible, input focused     │
         └────────┬──────────────────────────┘
                  │
       ┌──────────┼──────────────────────────────┐
       │          │                              │
  save valid   save empty/    click Cancel,   click overlay,
  text         whitespace    press Escape     press Escape
       │          │                              │
       ▼          │                              ▼
  update task     │                          ┌─────────┐
  saveTodos()     │                          │ CLOSED  │
  renderTodos()   │                          └─────────┘
  CLOSED ◄────────┘ (stays OPEN, no change)
```

---

## Error Handling

### localStorage Failures

`storageGet` catches all errors (JSON parse, SecurityError, quota) and returns the provided `fallback` value. This ensures the application always has a valid in-memory state even if storage is unavailable (Requirement 4.6, 6.4, 6.6).

For write failures (Requirement 6.5), `saveLinks` wraps `storageSet` in a try/catch:

```js
function saveLinks() {
  try {
    storageSet(KEYS.LINKS, links);
  } catch {
    // Revert the in-memory change and re-render to keep UI consistent
    showStorageError();
  }
}
```

This prevents the display from showing a link that was not persisted. `saveTodos` follows the same pattern.

### URL Validation Error Feedback

When URL validation fails in `addLink`, the url input border turns to `var(--danger)` for 1500 ms, then resets:

```js
linkUrlInput.style.borderColor = 'var(--danger)';
setTimeout(() => (linkUrlInput.style.borderColor = ''), 1500);
```

This is purely visual; no persistent error state is added to the DOM, keeping the implementation simple.

### XSS Prevention

All user-controlled strings are passed through `escapeHTML` before being inserted via `innerHTML`. Strings used in attribute values (e.g., `aria-label`) are also escaped.

### Malformed ID References

The `editingId` is always set from a valid `todo.id` in the in-memory array. `todos.find(t => t.id === editingId)` is guarded before mutating; if the task was deleted between modal open and save (impossible in practice because the modal blocks interaction, but defensive), the save is a no-op.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Clock time format

*For any* valid Date object (any date, any time of day), `updateClock` shall produce a clock string that matches the pattern `HH:MM:SS` where each component is zero-padded to exactly two digits and the values are arithmetically consistent with the input Date.

**Validates: Requirements 1.1**

---

### Property 2: Date string completeness

*For any* valid Date object, the date string produced by `updateClock` shall contain the full day name, the full month name, the numeric day, and the four-digit year corresponding to that Date.

**Validates: Requirements 1.2**

---

### Property 3: Greeting period mapping

*For any* integer hour in [0, 23], `getGreeting(hour)` shall return exactly one greeting string that is non-empty, and the returned greeting shall match the period defined by the requirements (morning for 5–11, afternoon for 12–16, evening for 17–20, night for 21–23 and 0–4). No hour value shall produce an empty result or an unhandled exception.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 4: Timer format correctness

*For any* integer `seconds` in [0, 1500], `formatTime(seconds)` shall return a string matching `/^\d{2}:\d{2}$/` where the minute component equals `Math.floor(seconds / 60)` zero-padded to two digits and the second component equals `seconds % 60` zero-padded to two digits.

**Validates: Requirements 2.3**

---

### Property 5: Timer reset idempotence

*For any* timer state (idle, running, or stopped) and *for any* remaining seconds value in [0, 1500], calling `resetTimer()` shall always result in `timerSeconds === TIMER_DEFAULT`, `timerRunning === false`, and the timer display showing `25:00`. Calling `resetTimer()` twice in succession shall produce the same result as calling it once.

**Validates: Requirements 2.5**

---

### Property 6: Valid task text addition

*For any* string `text` where `text.trim()` is non-empty and `text.trim().length <= 500`, calling `addTodo()` with that text shall increase `todos.length` by exactly 1, and the new task shall appear at the end of the array with `done === false` and text equal to `text.trim()`.

**Validates: Requirements 3.1**

---

### Property 7: Whitespace and empty task rejection

*For any* string `text` where `text.trim()` is empty (i.e., the string consists entirely of whitespace or is zero-length), calling `addTodo()` with that text shall leave `todos.length` unchanged.

**Validates: Requirements 3.2**

---

### Property 8: Task completion toggle is an involution

*For any* Task in the list, toggling its completion state twice shall return the task to its original `done` value. That is, for any boolean `b`, `toggle(toggle(b)) === b`.

**Validates: Requirements 3.4, 3.5**

---

### Property 9: Edit save acceptance and rejection

*For any* non-empty, non-whitespace string `text`, saving it in the Edit_Modal shall update the target task's text to `text.trim()` and close the modal. *For any* string where `text.trim()` is empty, saving shall leave the task's text unchanged and keep the modal open.

**Validates: Requirements 3.7, 3.8**

---

### Property 10: Task deletion removes the correct item

*For any* Task in the list, after deleting it by ID, that ID shall not appear in `todos`, and all other tasks shall remain present in their original order.

**Validates: Requirements 3.9**

---

### Property 11: Task persistence round-trip

*For any* array of Task objects written to `localStorage` under `KEYS.TODOS` via `saveTodos()`, a subsequent call to `storageGet(KEYS.TODOS)` shall return a deep-equal array.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

---

### Property 12: Valid link addition

*For any* label `name` of length 1–50 and any URL string that produces a non-empty hostname after normalisation, calling `addLink()` shall increase `links.length` by exactly 1 and the new link shall have `url` equal to the normalised URL.

**Validates: Requirements 5.1**

---

### Property 13: URL scheme normalisation

*For any* URL string that does not begin with `http://` or `https://` (case-insensitive), the normalised URL stored in the link shall begin with `https://` followed by the original input string.

**Validates: Requirements 5.3**

---

### Property 14: Duplicate URL rejection

*For any* URL already present in `links` (after normalisation), attempting to add a link with that same normalised URL shall leave `links.length` unchanged.

**Validates: Requirements 5.6**

---

### Property 15: Link removal correctness

*For any* QuickLink in the list, after removing it by ID, that ID shall not appear in `links`, and all other links shall remain present in their original order.

**Validates: Requirements 5.8**

---

### Property 16: Link persistence round-trip

*For any* array of QuickLink objects written to `localStorage` under `KEYS.LINKS` via `saveLinks()`, a subsequent call to `storageGet(KEYS.LINKS)` shall return a deep-equal array.

**Validates: Requirements 6.1, 6.2, 6.3**

---

## Testing Strategy

### Dual Approach

Unit/example tests cover specific interactions, edge cases, and state transitions. Property tests cover universal invariants across generated inputs. Both are needed: examples catch concrete bugs; properties verify general correctness.

### Property-Based Testing Library

Use **[fast-check](https://github.com/dubzzz/fast-check)** (JavaScript/TypeScript PBT library). Each property test runs with a minimum of **100 iterations** using `fc.assert(fc.property(...))`. Fast-check is the standard choice for Vanilla JS projects with no framework dependency.

Each test file is tagged with a comment identifying the property:

```js
// Feature: todo-list-life-dashboard, Property 4: Timer format correctness
fc.assert(
  fc.property(fc.integer({ min: 0, max: 1500 }), (seconds) => {
    const result = formatTime(seconds);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
    const [mm, ss] = result.split(':').map(Number);
    expect(mm).toBe(Math.floor(seconds / 60));
    expect(ss).toBe(seconds % 60);
  })
);
```

### Test Organisation

```
tests/
  unit/
    greeting.test.js      — Properties 1, 2, 3 (getGreeting, updateClock formatting)
    timer.test.js         — Properties 4, 5 + examples for state machine transitions
    todo.test.js          — Properties 6, 7, 8, 9, 10 + examples for modal, empty state
    storage.test.js       — Properties 11, 16 + edge cases for malformed/missing data
    links.test.js         — Properties 12, 13, 14, 15 + examples for validation, empty state
  integration/
    performance.test.js   — Requirement 7.6: timing addTodo, renderTodos, addLink, renderLinks
```

### Unit Test Focus Areas

- `getGreeting` boundary values: hours 0, 4, 5, 11, 12, 16, 17, 20, 21, 23
- `formatTime` boundary values: 0, 59, 60, 1499, 1500
- Timer state machine transitions (idle → running → stopped → idle → running → done → idle)
- Edit modal open/save/cancel/overlay-click/escape-key flows
- `escapeHTML` with `&`, `<`, `>`, `"`, `'` characters
- `storageGet` with `null`, invalid JSON, non-array stored value

### Property Test Focus Areas

| Property | Generator(s) |
|---|---|
| 1 Clock format | `fc.date()` |
| 2 Date completeness | `fc.date()` |
| 3 Greeting mapping | `fc.integer({ min: 0, max: 23 })` |
| 4 Timer format | `fc.integer({ min: 0, max: 1500 })` |
| 5 Reset idempotence | `fc.integer({ min: 0, max: 1500 })`, `fc.constantFrom('idle','running','stopped')` |
| 6 Valid task addition | `fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)` |
| 7 Whitespace rejection | `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'))` |
| 8 Toggle involution | `fc.boolean()` |
| 9 Edit save/reject | `fc.string()` for valid; `fc.stringOf(fc.constantFrom(' ', '\t'))` for invalid |
| 10 Task deletion | `fc.array(taskArbitrary), fc.nat()` (index) |
| 11 Task storage round-trip | `fc.array(taskArbitrary)` |
| 12 Valid link addition | `fc.string({ minLength: 1, maxLength: 50 })`, URL arbitrary |
| 13 URL normalisation | URLs without scheme prefix |
| 14 Duplicate URL rejection | existing link URL |
| 15 Link deletion | `fc.array(linkArbitrary), fc.nat()` |
| 16 Link storage round-trip | `fc.array(linkArbitrary)` |

### Integration / Performance Tests

- Time `addTodo()` + `renderTodos()` for a list of 50, 100, 200 tasks — must complete under 100 ms
- Time `addLink()` + `renderLinks()` for 20, 50 links — must complete under 100 ms
- Verify `localStorage` writes happen synchronously (no `setTimeout` wrapping around `storageSet`)

### What Is Not Property-Tested

- Visual CSS states (class names on elements) — covered by example tests
- `window.open` call for Quick Link activation — covered by spy-based unit test
- `setInterval` timing accuracy — covered by example test using fake timers (e.g., `jest.useFakeTimers`)
- File structure constraints (single HTML, CSS, JS files) — verified by manual review or a lint rule
