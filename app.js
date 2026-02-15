// ===== DOMAIN CONFIGURATION =====
const DOMAINS = [
  { id: 'aiml', name: 'AI / ML', icon: '🤖', color: '#f472b6' },
  { id: 'cscore', name: 'CS Core', icon: '💻', color: '#60a5fa' },
  { id: 'fullstack', name: 'Full Stack', icon: '🌐', color: '#34d399' },
  { id: 'dsa', name: 'DSA', icon: '🧮', color: '#fbbf24' },
  { id: 'aptitude', name: 'Aptitude', icon: '🧠', color: '#a78bfa' },
  { id: 'colgsem', name: 'College Sem', icon: '🎓', color: '#fb923c' },
  { id: 'coding', name: 'Coding / Projects', icon: '⚡', color: '#2dd4bf' },
  { id: 'upsc', name: 'UPSC', icon: '📚', color: '#f87171' },
  { id: 'creative', name: 'Creative + Portfolio', icon: '🎨', color: '#e879f9' },
  { id: 'freelance', name: 'Freelance (StudentTribe)', icon: '💼', color: '#38bdf8' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ===== STATE =====
let state = {
  currentView: 'overview',
  currentWeek: 0,
  selectedDay: null,
  tasks: [],
  notes: [],
  activeNote: null,
  startDate: null,
};

// ===== INIT =====
function init() {
  loadState();

  // USER REQUEST: Fixed 6-week sprint from Feb 16, 2026 to Mar 29, 2026
  const TARGET_START = '2026-02-16'; // Monday
  if (state.startDate !== TARGET_START) {
    state.startDate = TARGET_START;
    // Reset current week to 0 if we changed the start date
    state.currentWeek = 0;
    saveState();
  }

  // Generate 6-week schedule (Version 2 - Fix timezone mismatch)
  if (state.scheduleVersion !== 2) {
    generateSchedule(TARGET_START);
    state.scheduleVersion = 2;
    saveState();
  }

  if (state.notes.length === 0) {
    state.notes.push({
      id: generateId(),
      title: '📌 Sprint Plan: Feb 16 - Mar 29',
      content: '<h2>🚀 6-Week Sprint Plan</h2><p><strong>Goal:</strong> Master 10 domains by March 29th.</p><ul><li><strong>Week 1 (Feb 16):</strong> Foundation & Assessment</li><li><strong>Week 2 (Feb 23):</strong> Core Concepts</li><li><strong>Week 3 (Mar 2):</strong> Deep Dive</li><li><strong>Week 4 (Mar 9):</strong> Projects & Practice</li><li><strong>Week 5 (Mar 16):</strong> Review & Polish</li><li><strong>Week 6 (Mar 23):</strong> Final Sprint</li></ul>',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    saveState();
  }
  renderDomainNav();
  populateDomainSelect();
  switchView(state.currentView);
  setupKeyboardShortcuts();
}

function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function saveState() {
  localStorage.setItem('neuraplan_state', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('neuraplan_state');
  if (saved) {
    const parsed = JSON.parse(saved);
    state = { ...state, ...parsed };
  }
}

// ===== NAVIGATION =====
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

function switchView(view) {
  state.currentView = view;
  saveState();
  // Update nav
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navItem) navItem.classList.add('active');
  // Update tabs
  document.querySelectorAll('.view-tab').forEach(el => el.classList.remove('active'));
  const tab = document.querySelector(`.view-tab[data-view="${view}"]`);
  if (tab) tab.classList.add('active');
  // Update breadcrumb
  const names = { overview: 'Overview', calendar: 'Calendar', domains: 'Domains', timeline: 'Timeline', notes: 'Notes' };
  document.getElementById('breadcrumb').innerHTML = `NeuraPlan <span class="separator">/</span> <span>${names[view] || view}</span>`;
  renderView(view);
}

function renderView(view) {
  const area = document.getElementById('contentArea');
  switch (view) {
    case 'overview': renderOverview(area); break;
    case 'calendar': renderCalendar(area); break;
    case 'domains': renderDomains(area); break;
    case 'timeline': renderTimeline(area); break;
    case 'notes': renderNotes(area); break;
    default: area.innerHTML = '';
  }
}

// ===== DOMAIN NAV =====
function renderDomainNav() {
  const container = document.getElementById('domainNavItems');
  container.innerHTML = DOMAINS.map(d => {
    const count = state.tasks.filter(t => t.domain === d.id).length;
    return `<div class="nav-item" onclick="filterByDomain('${d.id}')">
      <span class="domain-dot" style="background:${d.color}"></span>
      ${d.name}
      ${count ? `<span class="badge">${count}</span>` : ''}
    </div>`;
  }).join('');
}

function filterByDomain(domainId) {
  switchView('domains');
  // Scroll to domain card
  setTimeout(() => {
    const card = document.querySelector(`.domain-card[data-domain="${domainId}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}

function populateDomainSelect() {
  const sel = document.getElementById('taskDomainInput');
  sel.innerHTML = DOMAINS.map(d => `<option value="${d.id}">${d.icon} ${d.name}</option>`).join('');
}

// ===== DATE HELPERS =====
function getWeekDates(weekOffset) {
  // Use T00:00:00 to ensure Local Time parsing
  const start = new Date(state.startDate + 'T00:00:00');
  start.setDate(start.getDate() + weekOffset * 7);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(date) {
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function dateKey(date) {
  // Return YYYY-MM-DD in Local Time to avoid timezone shifts
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isToday(date) {
  const t = new Date();
  return date.getFullYear() === t.getFullYear() && date.getMonth() === t.getMonth() && date.getDate() === t.getDate();
}

function getTasksForDate(dateStr) {
  return state.tasks.filter(t => t.date === dateStr);
}

function getDomain(id) {
  return DOMAINS.find(d => d.id === id) || DOMAINS[0];
}

// ===== OVERVIEW =====
function renderOverview(area) {
  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.done).length;
  const pending = total - done;
  const todayStr = dateKey(new Date());
  const todayTasks = getTasksForDate(todayStr);
  const todayDone = todayTasks.filter(t => t.done).length;

  let domainBreakdown = DOMAINS.map(d => {
    const dTasks = state.tasks.filter(t => t.domain === d.id);
    const dDone = dTasks.filter(t => t.done).length;
    const pct = dTasks.length ? Math.round((dDone / dTasks.length) * 100) : 0;
    return { ...d, total: dTasks.length, done: dDone, pct };
  });

  area.innerHTML = `
    <div class="animate-in">
      <h1 style="font-size:28px;font-weight:800;margin-bottom:4px;letter-spacing:-0.5px">Good ${getGreeting()}, Srihari 👋</h1>
      <p style="color:var(--text-tertiary);font-size:14px;margin-bottom:24px">Week ${state.currentWeek + 1} of 6 · ${formatDate(new Date())}</p>
    </div>
    <div class="overview-grid animate-in stagger-1">
      <div class="stat-card">
        <div class="stat-label">Total Tasks</div>
        <div class="stat-value">${total}</div>
        <div class="stat-change">Across 6 weeks</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Completed</div>
        <div class="stat-value" style="color:var(--status-done)">${done}</div>
        <div class="stat-change">${total ? Math.round((done / total) * 100) : 0}% completion</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pending</div>
        <div class="stat-value" style="color:var(--status-progress)">${pending}</div>
        <div class="stat-change">${pending} tasks remaining</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Today</div>
        <div class="stat-value">${todayDone}/${todayTasks.length}</div>
        <div class="stat-change">${todayTasks.length ? Math.round((todayDone / todayTasks.length) * 100) : 0}% today</div>
      </div>
    </div>
    <h2 style="font-size:18px;font-weight:700;margin:24px 0 12px;display:flex;align-items:center;gap:8px">🎯 Domain Progress</h2>
    <div class="domain-view animate-in stagger-2">
      ${domainBreakdown.map(d => `
        <div class="domain-card" data-domain="${d.id}" style="cursor:pointer" onclick="filterByDomain('${d.id}')">
          <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${d.color};border-radius:14px 14px 0 0"></div>
          <div class="domain-card-header">
            <div class="domain-icon" style="background:${d.color}20;color:${d.color}">${d.icon}</div>
            <div>
              <div class="domain-card-title">${d.name}</div>
              <div class="domain-card-count">${d.total} tasks · ${d.done} done</div>
            </div>
          </div>
          <div class="domain-progress">
            <div class="progress-bar"><div class="progress-fill" style="width:${d.pct}%;background:${d.color}"></div></div>
            <div class="progress-text"><span>${d.pct}%</span><span>${d.done}/${d.total}</span></div>
          </div>
        </div>
      `).join('')}
    </div>
    ${todayTasks.length ? `
    <h2 style="font-size:18px;font-weight:700;margin:24px 0 12px;display:flex;align-items:center;gap:8px">📋 Today's Tasks</h2>
    <div class="animate-in stagger-3">
      ${todayTasks.map(t => renderTaskItem(t)).join('')}
    </div>` : ''}
  `;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

// ===== CALENDAR =====
function renderCalendar(area) {
  const weekDates = getWeekDates(state.currentWeek);

  // Calculate date ranges for pills
  const getWeekRange = (offset) => {
    const s = new Date(state.startDate);
    s.setDate(s.getDate() + offset * 7);
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    return `${MONTHS[s.getMonth()]} ${s.getDate()}-${e.getDate()}`;
  };

  area.innerHTML = `
    <div class="week-navigator animate-in">
      <button class="week-nav-btn" onclick="changeWeek(-1)" ${state.currentWeek <= 0 ? 'disabled style="opacity:0.3;pointer-events:none"' : ''}>◀</button>
      <div class="week-indicator">
        ${[0, 1, 2, 3, 4, 5].map(i => `
          <div class="week-pill ${state.currentWeek === i ? 'active' : ''}" onclick="goToWeek(${i})" title="${getWeekRange(i)}">
            W${i + 1} <span style="font-size:9px;opacity:0.7;margin-left:2px">${getWeekRange(i)}</span>
          </div>`).join('')}
      </div>
      <button class="week-nav-btn" onclick="changeWeek(1)" ${state.currentWeek >= 5 ? 'disabled style="opacity:0.3;pointer-events:none"' : ''}>▶</button>
    </div>
    <div class="calendar-grid animate-in stagger-1">
      ${DAYS.map(d => `<div class="calendar-day-header">${d}</div>`).join('')}
      ${weekDates.map(date => {
    const dk = dateKey(date);
    const tasks = getTasksForDate(dk);
    const today = isToday(date);
    return `<div class="calendar-day ${today ? 'today' : ''}" onclick="openDayDetail('${dk}')" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="dropTask(event,'${dk}');this.classList.remove('drag-over')">
          <div class="day-number">
            <span>${date.getDate()} <span class="date-label">${MONTHS[date.getMonth()]}</span></span>
            ${today ? '<span class="today-badge">TODAY</span>' : ''}
          </div>
          <div class="day-tasks">
            ${tasks.slice(0, 4).map(t => {
      const d = getDomain(t.domain);
      return `<div class="day-task-chip ${t.done ? 'done' : ''}" style="background:${d.color}20;color:${d.color}" draggable="true" ondragstart="dragTask(event,'${t.id}')" title="${t.title}">
                <span style="font-size:8px">${t.done ? '✓' : '○'}</span> ${t.title}
              </div>`;
    }).join('')}
            ${tasks.length > 4 ? `<div class="day-more">+${tasks.length - 4} more</div>` : ''}
          </div>
        </div>`;
  }).join('')}
    </div>
  `;
}

function changeWeek(dir) {
  state.currentWeek = Math.max(0, Math.min(5, state.currentWeek + dir));
  saveState();
  renderCalendar(document.getElementById('contentArea'));
}

function goToWeek(w) {
  state.currentWeek = w;
  saveState();
  renderCalendar(document.getElementById('contentArea'));
}

// ===== DRAG & DROP =====
let draggedTaskId = null;
function dragTask(e, taskId) {
  draggedTaskId = taskId;
  e.dataTransfer.effectAllowed = 'move';
}
function dropTask(e, newDate) {
  e.preventDefault();
  if (!draggedTaskId) return;
  const task = state.tasks.find(t => t.id === draggedTaskId);
  if (task) {
    task.date = newDate;
    saveState();
    renderCalendar(document.getElementById('contentArea'));
    showToast('Task moved!', 'success');
  }
  draggedTaskId = null;
}

// ===== DAY DETAIL =====
function openDayDetail(dateStr) {
  state.selectedDay = dateStr;
  const panel = document.getElementById('dayDetailPanel');
  const d = new Date(dateStr + 'T00:00:00');
  document.getElementById('dayDetailTitle').textContent = formatDate(d);
  document.getElementById('dayDetailDate').textContent = `Week ${state.currentWeek + 1}`;
  renderDayDetailBody(dateStr);
  panel.classList.add('open');
}

function closeDayDetail() {
  document.getElementById('dayDetailPanel').classList.remove('open');
  state.selectedDay = null;
}

function renderDayDetailBody(dateStr) {
  const body = document.getElementById('dayDetailBody');
  const tasks = getTasksForDate(dateStr);

  if (tasks.length === 0) {
    body.innerHTML = `<div class="empty-state"><div class="icon">📭</div><h3>No tasks yet</h3><p>Click the button below to add tasks for this day</p></div>
      <div class="add-task-inline" onclick="openAddTaskModalForDate('${dateStr}')"><span>＋</span> Add task for this day</div>`;
    return;
  }

  // Group by domain
  const grouped = {};
  tasks.forEach(t => {
    if (!grouped[t.domain]) grouped[t.domain] = [];
    grouped[t.domain].push(t);
  });

  body.innerHTML = Object.entries(grouped).map(([domainId, domTasks]) => {
    const d = getDomain(domainId);
    return `<div class="domain-task-group">
      <div class="domain-task-group-header"><div class="dot" style="background:${d.color}"></div>${d.icon} ${d.name}</div>
      ${domTasks.map(t => renderTaskItem(t)).join('')}
    </div>`;
  }).join('') + `<div class="add-task-inline" onclick="openAddTaskModalForDate('${dateStr}')"><span>＋</span> Add task</div>`;
}

// ===== TASK RENDERING =====
function renderTaskItem(t) {
  const d = getDomain(t.domain);
  const prColors = { high: 'var(--priority-high)', medium: 'var(--priority-medium)', low: 'var(--priority-low)' };
  return `<div class="task-item" draggable="true" ondragstart="dragTask(event,'${t.id}')">
    <div class="task-checkbox ${t.done ? 'checked' : ''}" onclick="toggleTask('${t.id}',event)" style="border-color:${d.color}"></div>
    <div class="task-info">
      <div class="task-title ${t.done ? 'done' : ''}">${t.title}</div>
      <div class="task-meta">
        <span class="task-priority-badge" style="background:${prColors[t.priority]}22;color:${prColors[t.priority]}">${t.priority}</span>
        <span style="color:${d.color}">${d.icon} ${d.name}</span>
        ${t.timeSlot ? `<span>🕐 ${t.timeSlot}</span>` : ''}
      </div>
    </div>
    <div class="task-actions">
      <button class="task-action-btn" onclick="editTask('${t.id}')" title="Edit">✏️</button>
      <button class="task-action-btn delete" onclick="deleteTask('${t.id}')" title="Delete">🗑️</button>
    </div>
  </div>`;
}

// ===== TASK ACTIONS =====
function toggleTask(id, e) {
  e && e.stopPropagation();
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    saveState();
    renderView(state.currentView);
    renderDomainNav();
    if (state.selectedDay) renderDayDetailBody(state.selectedDay);
    showToast(task.done ? '✅ Task completed!' : 'Task reopened', task.done ? 'success' : 'info');
  }
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  renderView(state.currentView);
  renderDomainNav();
  if (state.selectedDay) renderDayDetailBody(state.selectedDay);
  showToast('Task deleted', 'info');
}

function editTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  document.getElementById('taskTitleInput').value = task.title;
  document.getElementById('taskDescInput').value = task.description || '';
  document.getElementById('taskDomainInput').value = task.domain;
  document.getElementById('taskPriorityInput').value = task.priority;
  document.getElementById('taskDateInput').value = task.date;
  document.getElementById('taskTimeInput').value = task.timeSlot || '';
  openAddTaskModal();
  // Replace add button with update
  const footer = document.querySelector('#addTaskModal .modal-footer');
  footer.innerHTML = `<button class="btn btn-ghost" onclick="closeAddTaskModal()">Cancel</button>
    <button class="btn btn-primary" onclick="updateTask('${id}')">Update Task</button>`;
}

function updateTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.title = document.getElementById('taskTitleInput').value.trim();
  task.description = document.getElementById('taskDescInput').value.trim();
  task.domain = document.getElementById('taskDomainInput').value;
  task.priority = document.getElementById('taskPriorityInput').value;
  task.date = document.getElementById('taskDateInput').value;
  task.timeSlot = document.getElementById('taskTimeInput').value;
  saveState();
  closeAddTaskModal();
  renderView(state.currentView);
  renderDomainNav();
  if (state.selectedDay) renderDayDetailBody(state.selectedDay);
  showToast('Task updated!', 'success');
}

// ===== ADD TASK MODAL =====
function openAddTaskModal() {
  document.getElementById('addTaskModal').classList.add('open');
  document.getElementById('taskTitleInput').focus();
  if (!document.getElementById('taskDateInput').value) {
    document.getElementById('taskDateInput').value = dateKey(new Date());
  }
  // Reset footer
  const footer = document.querySelector('#addTaskModal .modal-footer');
  footer.innerHTML = `<button class="btn btn-ghost" onclick="closeAddTaskModal()">Cancel</button>
    <button class="btn btn-primary" onclick="addTask()">Add Task</button>`;
}

function openAddTaskModalForDate(dateStr) {
  document.getElementById('taskDateInput').value = dateStr;
  openAddTaskModal();
}

function closeAddTaskModal() {
  document.getElementById('addTaskModal').classList.remove('open');
  document.getElementById('taskTitleInput').value = '';
  document.getElementById('taskDescInput').value = '';
  document.getElementById('taskTimeInput').value = '';
}

function addTask() {
  const title = document.getElementById('taskTitleInput').value.trim();
  if (!title) { showToast('Please enter a task title', 'error'); return; }
  const task = {
    id: generateId(),
    title,
    description: document.getElementById('taskDescInput').value.trim(),
    domain: document.getElementById('taskDomainInput').value,
    priority: document.getElementById('taskPriorityInput').value,
    date: document.getElementById('taskDateInput').value,
    timeSlot: document.getElementById('taskTimeInput').value,
    done: false,
    createdAt: new Date().toISOString(),
  };
  state.tasks.push(task);
  saveState();
  closeAddTaskModal();
  renderView(state.currentView);
  renderDomainNav();
  if (state.selectedDay) renderDayDetailBody(state.selectedDay);
  showToast('✨ Task added!', 'success');
}

// ===== DOMAINS VIEW =====
function renderDomains(area) {
  area.innerHTML = `<h1 style="font-size:24px;font-weight:800;margin-bottom:20px;letter-spacing:-0.5px" class="animate-in">🎯 Domain Dashboard</h1>
    <div class="domain-view animate-in stagger-1">
      ${DOMAINS.map(d => {
    const tasks = state.tasks.filter(t => t.domain === d.id);
    const done = tasks.filter(t => t.done).length;
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    return `<div class="domain-card" data-domain="${d.id}">
          <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${d.color};border-radius:14px 14px 0 0"></div>
          <div class="domain-card-header">
            <div class="domain-icon" style="background:${d.color}20;color:${d.color}">${d.icon}</div>
            <div><div class="domain-card-title">${d.name}</div><div class="domain-card-count">${tasks.length} tasks</div></div>
          </div>
          <div class="domain-progress">
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${d.color}"></div></div>
            <div class="progress-text"><span>${pct}% complete</span><span>${done}/${tasks.length}</span></div>
          </div>
          <div class="domain-tasks-list">
            ${tasks.length === 0 ? '<div style="font-size:12px;color:var(--text-muted);padding:8px 0">No tasks yet</div>' :
        tasks.slice(0, 5).map(t => renderTaskItem(t)).join('')}
            ${tasks.length > 5 ? `<div style="font-size:11px;color:var(--text-tertiary);padding:4px 0">+${tasks.length - 5} more tasks</div>` : ''}
          </div>
        </div>`;
  }).join('')}
    </div>`;
}

// ===== TIMELINE VIEW =====
function renderTimeline(area) {
  const sorted = [...state.tasks].sort((a, b) => a.date.localeCompare(b.date) || (a.timeSlot || '').localeCompare(b.timeSlot || ''));
  area.innerHTML = `<div class="timeline-view animate-in">
    <div class="timeline-header">⏳ Task Timeline</div>
    ${sorted.length === 0 ? '<div class="empty-state"><div class="icon">📭</div><h3>No tasks yet</h3><p>Add tasks to see them here in chronological order</p></div>' :
      `<div class="timeline-line">
      ${sorted.map(t => {
        const d = getDomain(t.domain);
        const date = new Date(t.date + 'T00:00:00');
        return `<div class="timeline-item">
          <div class="timeline-date">${formatDate(date)} ${t.timeSlot ? '· ' + t.timeSlot : ''}</div>
          <div class="timeline-task-title" style="${t.done ? 'text-decoration:line-through;opacity:0.5' : ''}">${t.title}</div>
          <span class="timeline-domain-tag" style="background:${d.color}20;color:${d.color}">${d.icon} ${d.name}</span>
        </div>`;
      }).join('')}
    </div>`}
  </div>`;
}

// ===== NOTES VIEW =====
function renderNotes(area) {
  if (state.activeNote) {
    const note = state.notes.find(n => n.id === state.activeNote);
    if (note) { renderNoteEditor(area, note); return; }
  }
  area.innerHTML = `<div class="notes-view animate-in">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h1 style="font-size:24px;font-weight:800;letter-spacing:-0.5px">📝 Notes</h1>
      <button class="btn btn-primary" onclick="createNewNote()">＋ New Note</button>
    </div>
    <div class="notes-list">
      ${state.notes.map(n => `<div class="note-list-item" onclick="openNote('${n.id}')">
        <span class="note-list-icon">📄</span>
        <div class="note-list-info">
          <div class="note-list-title">${n.title || 'Untitled'}</div>
          <div class="note-list-preview">${stripHtml(n.content).substring(0, 80) || 'Empty note'}</div>
        </div>
        <span class="note-list-date">${new Date(n.updatedAt).toLocaleDateString()}</span>
      </div>`).join('')}
    </div>
  </div>`;
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || '';
}

function createNewNote() {
  const note = { id: generateId(), title: '', content: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  state.notes.unshift(note);
  state.activeNote = note.id;
  saveState();
  renderNotes(document.getElementById('contentArea'));
}

function openNote(id) {
  state.activeNote = id;
  saveState();
  renderNotes(document.getElementById('contentArea'));
}

function renderNoteEditor(area, note) {
  area.innerHTML = `<div class="notes-view animate-in">
    <div style="margin-bottom:12px"><button class="btn btn-ghost" onclick="backToNotesList()" style="font-size:12px">← Back to Notes</button>
      <button class="btn btn-ghost" onclick="deleteNote('${note.id}')" style="font-size:12px;margin-left:8px;color:var(--status-overdue)">🗑️ Delete</button>
    </div>
    <div class="notes-header">
      <input class="notes-title-input" value="${note.title}" placeholder="Untitled" oninput="updateNoteTitle('${note.id}', this.value)">
    </div>
    <div class="notes-toolbar">
      <button class="toolbar-btn" onclick="execCmd('bold')" title="Bold"><b>B</b></button>
      <button class="toolbar-btn" onclick="execCmd('italic')" title="Italic"><i>I</i></button>
      <button class="toolbar-btn" onclick="execCmd('underline')" title="Underline"><u>U</u></button>
      <button class="toolbar-btn" onclick="execCmd('strikeThrough')" title="Strikethrough"><s>S</s></button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn" onclick="execCmd('formatBlock','<h1>')" title="Heading 1">H1</button>
      <button class="toolbar-btn" onclick="execCmd('formatBlock','<h2>')" title="Heading 2">H2</button>
      <button class="toolbar-btn" onclick="execCmd('formatBlock','<h3>')" title="Heading 3">H3</button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn" onclick="execCmd('insertUnorderedList')" title="Bullet List">•</button>
      <button class="toolbar-btn" onclick="execCmd('insertOrderedList')" title="Numbered List">1.</button>
      <button class="toolbar-btn" onclick="execCmd('formatBlock','<blockquote>')" title="Quote">❝</button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn" onclick="insertCheckbox()" title="Checkbox">☐</button>
      <button class="toolbar-btn" onclick="execCmd('createLink', prompt('Enter URL:'))" title="Link">🔗</button>
    </div>
    <div class="note-editor" contenteditable="true" data-placeholder="Start writing your notes here... Use the toolbar above for formatting." id="noteEditor" oninput="updateNoteContent('${note.id}')">${note.content}</div>
  </div>`;
}

function backToNotesList() {
  state.activeNote = null;
  saveState();
  renderNotes(document.getElementById('contentArea'));
}

function deleteNote(id) {
  state.notes = state.notes.filter(n => n.id !== id);
  state.activeNote = null;
  saveState();
  renderNotes(document.getElementById('contentArea'));
  showToast('Note deleted', 'info');
}

function updateNoteTitle(id, val) {
  const note = state.notes.find(n => n.id === id);
  if (note) { note.title = val; note.updatedAt = new Date().toISOString(); saveState(); }
}

function updateNoteContent(id) {
  const note = state.notes.find(n => n.id === id);
  const editor = document.getElementById('noteEditor');
  if (note && editor) { note.content = editor.innerHTML; note.updatedAt = new Date().toISOString(); saveState(); }
}

function execCmd(cmd, val) {
  document.execCommand(cmd, false, val || null);
  document.getElementById('noteEditor')?.focus();
}

function insertCheckbox() {
  document.execCommand('insertHTML', false, '<div><input type="checkbox"> </div>');
}

// ===== SEARCH =====
function openSearch(e) {
  document.getElementById('searchOverlay').classList.add('open');
  setTimeout(() => document.getElementById('searchInput').focus(), 100);
}

function closeSearch(e) {
  if (e && e.target !== document.getElementById('searchOverlay')) return;
  document.getElementById('searchOverlay').classList.remove('open');
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '<div class="search-empty">Type to search across all your tasks and notes</div>';
}

function performSearch(q) {
  const results = document.getElementById('searchResults');
  if (!q.trim()) {
    results.innerHTML = '<div class="search-empty">Type to search across all your tasks and notes</div>';
    return;
  }
  const ql = q.toLowerCase();
  const matchedTasks = state.tasks.filter(t => t.title.toLowerCase().includes(ql) || (t.description || '').toLowerCase().includes(ql));
  const matchedNotes = state.notes.filter(n => (n.title || '').toLowerCase().includes(ql) || stripHtml(n.content).toLowerCase().includes(ql));

  if (matchedTasks.length === 0 && matchedNotes.length === 0) {
    results.innerHTML = '<div class="search-empty">No results found</div>';
    return;
  }

  results.innerHTML = matchedTasks.map(t => {
    const d = getDomain(t.domain);
    return `<div class="search-result-item" onclick="goToTask('${t.id}')">
      <span class="search-result-icon" style="color:${d.color}">${d.icon}</span>
      <span class="search-result-text">${t.title}</span>
      <span class="search-result-hint">${t.date}</span>
    </div>`;
  }).join('') + matchedNotes.map(n =>
    `<div class="search-result-item" onclick="goToNote('${n.id}')">
      <span class="search-result-icon">📄</span>
      <span class="search-result-text">${n.title || 'Untitled'}</span>
      <span class="search-result-hint">Note</span>
    </div>`
  ).join('');
}

function goToTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    document.getElementById('searchOverlay').classList.remove('open');
    state.currentView = 'calendar';
    // Find which week
    const start = new Date(state.startDate);
    const taskDate = new Date(task.date);
    const diff = Math.floor((taskDate - start) / (7 * 86400000));
    state.currentWeek = Math.max(0, Math.min(5, diff));
    saveState();
    switchView('calendar');
    setTimeout(() => openDayDetail(task.date), 300);
  }
}

function goToNote(id) {
  document.getElementById('searchOverlay').classList.remove('open');
  state.activeNote = id;
  saveState();
  switchView('notes');
}

// ===== KEYBOARD SHORTCUTS =====
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') {
      document.getElementById('searchOverlay').classList.remove('open');
      closeAddTaskModal();
      closeDayDetail();
    }
  });
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', init);

// ===== SCHEDULE GENERATOR =====
function generateSchedule(startDateStr) {
  state.tasks = []; // Clear existing tasks

  // Use 6 weeks = 42 days
  const start = new Date(startDateStr + 'T00:00:00');

  for (let i = 0; i < 42; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const dayIndex = current.getDay(); // 0=Sun, 1=Mon ...
    const dateStr = dateKey(current); // Uses new local dateKey
    const dayName = DAYS[dayIndex];

    let dayTasks = [];

    // Schedule Patterns
    if (dayName === 'Mon') {
      dayTasks.push(
        { t: 'College', d: 'colgsem', time: '09:00-13:00' },
        { t: 'Discrete Mathematics', d: 'colgsem', time: '14:00-17:00' },
        { t: 'Discrete Mathematics', d: 'colgsem', time: '17:00-19:00' },
        { t: 'AI / ML', d: 'aiml', time: '19:00-20:00' },
        { t: 'CS Core', d: 'cscore', time: '20:00-21:00' },
        { t: 'Full Stack', d: 'fullstack', time: '22:00-23:00' },
        { t: 'DSA', d: 'dsa', time: '23:00-00:00' }
      );
    } else if (dayName === 'Tue' || dayName === 'Thu') {
      dayTasks.push(
        { t: 'College', d: 'colgsem', time: '09:00-17:00' }
      );
      if (dayName === 'Tue') dayTasks.push({ t: 'Computer Network', d: 'colgsem', time: '17:00-19:00' });
      if (dayName === 'Thu') dayTasks.push({ t: 'Cloud Computing', d: 'colgsem', time: '17:00-19:00' });

      dayTasks.push(
        { t: 'AI / ML', d: 'aiml', time: '19:00-20:00' },
        { t: 'CS Core', d: 'cscore', time: '20:00-21:00' },
        { t: 'Full Stack', d: 'fullstack', time: '22:00-23:00' },
        { t: 'DSA', d: 'dsa', time: '23:00-00:00' }
      );
    } else if (dayName === 'Wed' || dayName === 'Fri') {
      dayTasks.push(
        { t: 'College', d: 'colgsem', time: '09:00-19:00' },
        { t: 'AI / ML', d: 'aiml', time: '19:00-20:00' },
        { t: 'CS Core', d: 'cscore', time: '20:00-21:00' },
        { t: 'Full Stack', d: 'fullstack', time: '22:00-23:00' },
        { t: 'DSA', d: 'dsa', time: '23:00-00:00' }
      );
    } else { // Sat, Sun
      dayTasks.push(
        { t: 'Coding / Minor Project', d: 'coding', time: '09:00-11:00' }
      );
      if (dayName === 'Sat') dayTasks.push({ t: 'VLSI', d: 'colgsem', time: '11:00-13:00' });
      else dayTasks.push({ t: 'SWE', d: 'colgsem', time: '11:00-13:00' }); // Sun

      dayTasks.push(
        { t: 'Creative + Portfolio', d: 'creative', time: '14:00-18:00' },
        { t: 'AI / ML', d: 'aiml', time: '19:00-20:00' },
        { t: 'CS Core', d: 'cscore', time: '20:00-21:00' },
        { t: 'Full Stack', d: 'fullstack', time: '22:00-23:00' },
        { t: 'DSA', d: 'dsa', time: '23:00-00:00' }
      );
    }

    // Add main day tasks
    dayTasks.forEach(item => {
      addTaskInternal(item.t, item.d, dateStr, item.time);
    });

    // Add Night Routine (00:00 - 08:00) assigned to the NEXT day morning
    // 12-1 Aptitude, 1-4 UPSC, 4-8 Freelancing
    const nextDate = new Date(current);
    nextDate.setDate(current.getDate() + 1);
    const nextDateStr = dateKey(nextDate);

    // Check if within bounds? We can add them even if slightly outside the 6 weeks visually (it's the next morning)
    const nightTasks = [
      { t: 'Aptitude', d: 'aptitude', time: '00:00-01:00' },
      { t: 'UPSC', d: 'upsc', time: '01:00-04:00' },
      { t: 'Freelancing', d: 'freelance', time: '04:00-08:00' }
    ];

    nightTasks.forEach(item => {
      addTaskInternal(item.t, item.d, nextDateStr, item.time);
    });
  }

  // Also add night routine for the starting Monday morning (Feb 16) 
  // currently we are adding night routine to NEXT day. So Feb 16 morning is empty.
  // The user prompt lists "Mon ... 12-1". Usually implies Mon night/Tue morning.
  // So standard logic holds. Feb 16 will start at 9am.

  showToast('Scale up! 6-week schedule generated', 'success');
}

function addTaskInternal(title, domain, date, timeSlot) {
  state.tasks.push({
    id: generateId(),
    title,
    domain,
    priority: 'medium',
    date,
    timeSlot,
    done: false,
    createdAt: new Date().toISOString()
  });
}
