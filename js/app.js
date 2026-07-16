/* ============================================================
   Life Dashboard — app.js
   All features: Greeting/Clock, Focus Timer, To-Do, Quick Links
   ============================================================ */

'use strict';

// ── Storage keys ──────────────────────────────────────────────
const KEYS = {
  TODOS: 'dashboard_todos',
  LINKS: 'dashboard_links',
};

// ── Helpers ───────────────────────────────────────────────────
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function storageGet(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ══════════════════════════════════════════════════════════════
// 1. GREETING & CLOCK
// ══════════════════════════════════════════════════════════════
const clockEl      = $('#clock');
const greetingEl   = $('#greeting');
const dateEl       = $('#date-display');

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function getGreeting(hour) {
  if (hour >= 5  && hour <= 11) return '☀️  Good morning!';
  if (hour >= 12 && hour <= 16) return '🌤️  Good afternoon!';
  if (hour >= 17 && hour <= 20) return '🌆  Good evening!';
  return '🌙  Good night!';  // covers 21–23 and 0–4
}

function updateClock() {
  const now  = new Date();
  const h    = String(now.getHours()).padStart(2, '0');
  const m    = String(now.getMinutes()).padStart(2, '0');
  const s    = String(now.getSeconds()).padStart(2, '0');
  clockEl.textContent    = `${h}:${m}:${s}`;
  greetingEl.textContent = getGreeting(now.getHours());
  dateEl.textContent     = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

updateClock();
setInterval(updateClock, 1000);


// ══════════════════════════════════════════════════════════════
// 2. FOCUS TIMER
// ══════════════════════════════════════════════════════════════
const TIMER_DEFAULT = 25 * 60; // seconds

const timerDisplay = $('#timer-display');
const timerLabel   = $('#timer-label');
const btnStart     = $('#timer-start');
const btnStop      = $('#timer-stop');
const btnReset     = $('#timer-reset');

let timerSeconds   = TIMER_DEFAULT;
let timerInterval  = null;
let timerRunning   = false;

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderTimer() {
  timerDisplay.textContent = formatTime(timerSeconds);
}

function setTimerState(state) {
  // state: 'idle' | 'running' | 'stopped' | 'done'
  timerDisplay.classList.remove('running', 'stopped');
  if (state === 'running') {
    timerDisplay.classList.add('running');
    timerLabel.textContent = 'Stay focused! 🎯';
  } else if (state === 'stopped') {
    timerDisplay.classList.add('stopped');
    timerLabel.textContent = 'Paused. Resume when ready.';
  } else if (state === 'done') {
    timerLabel.textContent = '🎉 Session complete! Great work!';
  } else {
    timerLabel.textContent = 'Ready to focus?';
  }
}

function startTimer() {
  if (timerRunning || timerSeconds === 0) return;
  timerRunning  = true;
  setTimerState('running');

  timerInterval = setInterval(() => {
    timerSeconds--;
    renderTimer();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      setTimerState('done');
    }
  }, 1000);
}

function stopTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  setTimerState('stopped');
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning  = false;
  timerSeconds  = TIMER_DEFAULT;
  renderTimer();
  setTimerState('idle');
}

btnStart.addEventListener('click', startTimer);
btnStop.addEventListener('click', stopTimer);
btnReset.addEventListener('click', resetTimer);


// ══════════════════════════════════════════════════════════════
// 3. TO-DO LIST
// ══════════════════════════════════════════════════════════════
let todos = storageGet(KEYS.TODOS, []);

const todoInput  = $('#todo-input');
const todoListEl = $('#todo-list');
const todoEmpty  = $('#todo-empty');
const todoAddBtn = $('#todo-add');

// Edit modal
const editModal  = $('#edit-modal');
const editInput  = $('#edit-input');
const editSave   = $('#edit-save');
const editCancel = $('#edit-cancel');
let   editingId  = null;

function saveTodos() {
  storageSet(KEYS.TODOS, todos);
}

function renderTodos() {
  todoListEl.innerHTML = '';

  if (todos.length === 0) {
    todoEmpty.classList.remove('hidden');
    return;
  }

  todoEmpty.classList.add('hidden');

  todos.forEach((todo) => {
    const li = document.createElement('li');
    li.className = `todo-item${todo.done ? ' done' : ''}`;
    li.dataset.id = todo.id;

    li.innerHTML = `
      <input
        type="checkbox"
        class="todo-checkbox"
        aria-label="Mark task done"
        ${todo.done ? 'checked' : ''}
      />
      <span class="todo-text">${escapeHTML(todo.text)}</span>
      <div class="todo-actions">
        <button class="btn btn-edit" title="Edit task" aria-label="Edit task">✏️</button>
        <button class="btn btn-danger" title="Delete task" aria-label="Delete task">🗑️</button>
      </div>
    `;

    // Checkbox toggle
    li.querySelector('.todo-checkbox').addEventListener('change', () => {
      todo.done = !todo.done;
      saveTodos();
      renderTodos();
    });

    // Edit button
    li.querySelector('.btn-edit').addEventListener('click', () => {
      openEditModal(todo.id, todo.text);
    });

    // Delete button
    li.querySelector('.btn-danger').addEventListener('click', () => {
      todos = todos.filter((t) => t.id !== todo.id);
      saveTodos();
      renderTodos();
    });

    todoListEl.appendChild(li);
  });
}

function addTodo() {
  const text = todoInput.value.trim();
  if (!text) {
    todoInput.focus();
    return;
  }
  todos.push({ id: generateId(), text, done: false });
  saveTodos();
  renderTodos();
  todoInput.value = '';
  todoInput.focus();
}

function openEditModal(id, currentText) {
  editingId = id;
  editInput.value = currentText;
  editModal.classList.remove('hidden');
  editInput.focus();
  editInput.select();
}

function closeEditModal() {
  editModal.classList.add('hidden');
  editingId = null;
}

function saveEdit() {
  const text = editInput.value.trim();
  if (!text) return;
  const todo = todos.find((t) => t.id === editingId);
  if (todo) {
    todo.text = text;
    saveTodos();
    renderTodos();
  }
  closeEditModal();
}

todoAddBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTodo(); });

editSave.addEventListener('click', saveEdit);
editCancel.addEventListener('click', closeEditModal);
editInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter')  saveEdit();
  if (e.key === 'Escape') closeEditModal();
});
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

renderTodos();


// ══════════════════════════════════════════════════════════════
// 4. QUICK LINKS
// ══════════════════════════════════════════════════════════════
let links = storageGet(KEYS.LINKS, [
  { id: generateId(), name: 'Google',   url: 'https://www.google.com' },
  { id: generateId(), name: 'GitHub',   url: 'https://github.com'     },
  { id: generateId(), name: 'YouTube',  url: 'https://youtube.com'    },
]);

const linkNameInput = $('#link-name');
const linkUrlInput  = $('#link-url');
const linkAddBtn    = $('#link-add');
const linksGrid     = $('#links-grid');
const linksEmpty    = $('#links-empty');

function saveLinks() {
  storageSet(KEYS.LINKS, links);
}

function getFaviconUrl(url) {
  try {
    const { origin } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;
  } catch {
    return null;
  }
}

function renderLinks() {
  linksGrid.innerHTML = '';

  if (links.length === 0) {
    linksEmpty.classList.remove('hidden');
    return;
  }

  linksEmpty.classList.add('hidden');

  links.forEach((link) => {
    const chip = document.createElement('div');
    chip.className = 'link-chip';

    const faviconUrl = getFaviconUrl(link.url);
    const faviconImg = faviconUrl
      ? `<img src="${faviconUrl}" class="link-favicon" alt="" aria-hidden="true" />`
      : '';

    chip.innerHTML = `
      ${faviconImg}
      <span class="link-label">${escapeHTML(link.name)}</span>
      <button class="link-remove" title="Remove link" aria-label="Remove ${escapeHTML(link.name)}">✕</button>
    `;

    // Open link on chip click (not remove button)
    chip.addEventListener('click', (e) => {
      if (e.target.classList.contains('link-remove')) return;
      window.open(link.url, '_blank', 'noopener,noreferrer');
    });

    chip.querySelector('.link-remove').addEventListener('click', () => {
      links = links.filter((l) => l.id !== link.id);
      saveLinks();
      renderLinks();
    });

    linksGrid.appendChild(chip);
  });
}

function addLink() {
  const name = linkNameInput.value.trim();
  const url  = linkUrlInput.value.trim();

  if (!name || !url) {
    if (!name) linkNameInput.focus();
    else linkUrlInput.focus();
    return;
  }

  // Basic URL validation — prepend https:// if missing scheme
  let normalizedUrl = url;
  if (!/^https?:\/\//i.test(url)) {
    normalizedUrl = 'https://' + url;
  }

  try {
    new URL(normalizedUrl); // throws if invalid
  } catch {
    linkUrlInput.style.borderColor = 'var(--danger)';
    setTimeout(() => (linkUrlInput.style.borderColor = ''), 1500);
    return;
  }

  links.push({ id: generateId(), name, url: normalizedUrl });
  saveLinks();
  renderLinks();
  linkNameInput.value = '';
  linkUrlInput.value  = '';
  linkNameInput.focus();
}

linkAddBtn.addEventListener('click', addLink);
linkUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addLink(); });
linkNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') linkUrlInput.focus(); });

renderLinks();


// ══════════════════════════════════════════════════════════════
// UTILITY
// ══════════════════════════════════════════════════════════════
function escapeHTML(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

// ── Test exports (Node/Jest only — no-op in browser) ─────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getGreeting, formatTime, storageGet, storageSet, generateId, escapeHTML };
}
