// Game Configurations
const DIFFICULTY_POINTS = { easy: 10, medium: 20, hard: 50 };
const POINTS_PER_LEVEL = 100;

// State
let tasks = JSON.parse(localStorage.getItem('levelup_tasks')) || [];
let points = parseInt(localStorage.getItem('levelup_points')) || 0;
let level = parseInt(localStorage.getItem('levelup_level')) || 1;
let streak = parseInt(localStorage.getItem('levelup_streak')) || 0;
let lastInteraction = localStorage.getItem('levelup_lastInteraction');
let currentFilter = 'pending';
let editingTaskId = null;

// DOM Elements
const els = {
    form: document.getElementById('task-form'),
    taskId: document.getElementById('task-id'),
    title: document.getElementById('task-title'),
    diff: document.getElementById('task-difficulty'),
    deadline: document.getElementById('task-deadline'),
    desc: document.getElementById('task-desc'),
    submitBtn: document.getElementById('submit-btn'),
    cancelBtn: document.getElementById('cancel-btn'),
    taskList: document.getElementById('task-list'),
    
    // Stats
    levelText: document.getElementById('current-level'),
    pointsText: document.getElementById('current-points'),
    nextLevelText: document.getElementById('next-level-points'),
    progressBar: document.getElementById('level-progress'),
    streakCount: document.getElementById('streak-count'),
    completedCount: document.getElementById('completed-count'),
    totalCount: document.getElementById('total-count'),
    
    // Tabs
    tabs: document.querySelectorAll('.tab-btn'),
    
    // Theme
    themeToggle: document.getElementById('theme-toggle'),
    
    // Toast
    toast: document.getElementById('toast')
};

// --- Core Functions ---

function init() {
    checkStreakOnLoad();
    initTheme();
    renderStats();
    renderTasks();
    setupEventListeners();
    lucide.createIcons();
}

function saveState() {
    localStorage.setItem('levelup_tasks', JSON.stringify(tasks));
    localStorage.setItem('levelup_points', points.toString());
    localStorage.setItem('levelup_level', level.toString());
    localStorage.setItem('levelup_streak', streak.toString());
    if (lastInteraction) localStorage.setItem('levelup_lastInteraction', lastInteraction);
}

function checkStreakOnLoad() {
    if (!lastInteraction) return;
    const todayStr = new Date().toDateString();
    const lastDate = new Date(lastInteraction);
    const todayDate = new Date(todayStr);
    lastDate.setHours(0,0,0,0);
    
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
    
    // If more than 1 day has passed, streak is broken
    if (diffDays > 1) {
        streak = 0;
        saveState();
    }
}

function updateStreakOnComplete() {
    const todayStr = new Date().toDateString();
    if (lastInteraction !== todayStr) {
        if (!lastInteraction) {
            streak = 1;
        } else {
            const lastDate = new Date(lastInteraction);
            const todayDate = new Date(todayStr);
            lastDate.setHours(0,0,0,0);
            
            const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                streak++;
            } else if (diffDays > 1) {
                streak = 1;
            }
        }
        lastInteraction = todayStr;
        saveState();
    }
}

function addPoints(difficulty) {
    const earned = DIFFICULTY_POINTS[difficulty] || 10;
    points += earned;
    checkLevelUp();
    saveState();
    renderStats();
}

function checkLevelUp() {
    const requiredPoints = level * POINTS_PER_LEVEL;
    if (points >= requiredPoints) {
        points -= requiredPoints;
        level += 1;
        showToast(`🎉 Level Up! You reached Level ${level}`);
    }
}

// --- Rendering ---

function renderStats() {
    els.levelText.textContent = level;
    els.pointsText.textContent = points;
    
    const requiredPoints = level * POINTS_PER_LEVEL;
    els.nextLevelText.textContent = requiredPoints;
    
    const progressPercent = Math.min(100, Math.max(0, (points / requiredPoints) * 100));
    els.progressBar.style.width = `${progressPercent}%`;
    
    els.streakCount.textContent = streak;
    
    const completedTasks = tasks.filter(t => t.completed).length;
    els.completedCount.textContent = completedTasks;
    els.totalCount.textContent = tasks.length;
}

function isUrgent(deadlineStr) {
    if (!deadlineStr) return false;
    const dl = new Date(deadlineStr).getTime();
    const now = new Date().getTime();
    // Urgent if within 24 hours (or overdue)
    return (dl - now) <= (24 * 60 * 60 * 1000);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderTasks() {
    els.taskList.innerHTML = '';
    
    let filteredTasks = tasks.filter(t => {
        if (currentFilter === 'pending') return !t.completed;
        return t.completed;
    });

    // Sort: pending by deadline then creation. Completed by completion time.
    if (currentFilter === 'pending') {
        filteredTasks.sort((a, b) => {
            if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            return b.createdAt - a.createdAt;
        });
    } else {
        filteredTasks.sort((a, b) => b.completedAt - a.completedAt); // newest completed first
    }

    if (filteredTasks.length === 0) {
        const msg = currentFilter === 'pending' ? 'No pending tasks! Time to chill or add more.' : 'No completed tasks yet. Let\'s get to work!';
        els.taskList.innerHTML = `
            <div class="empty-state">
                <i data-lucide="inbox"></i>
                <p>${msg}</p>
            </div>
        `;
        // Re-init generic icons for empty state
        lucide.createIcons();
        return;
    }

    filteredTasks.forEach(task => {
        const urgent = isUrgent(task.deadline);
        const card = document.createElement('div');
        card.className = `task-card diff-${task.difficulty} ${task.completed ? 'completed' : ''} ${urgent ? 'urgent' : ''}`;
        card.id = `task-${task.id}`;
        
        let metaHtml = `<div class="task-meta">`;
        if (task.deadline) {
            metaHtml += `<span class="task-date ${urgent ? 'urgent' : ''}"><i data-lucide="clock"></i> ${formatDate(task.deadline)}</span>`;
        }
        metaHtml += `</div>`;

        card.innerHTML = `
            <div class="task-checkbox-container">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskComplete('${task.id}', this)">
            </div>
            <div class="task-content">
                <div class="task-header">
                    <span class="task-title">${escapeHTML(task.title)}</span>
                    <span class="task-pts"><i data-lucide="zap"></i> ${DIFFICULTY_POINTS[task.difficulty]}</span>
                </div>
                ${task.desc ? `<div class="task-desc">${escapeHTML(task.desc)}</div>` : ''}
                ${metaHtml}
            </div>
            <div class="task-actions">
                <button class="action-btn" onclick="editTask('${task.id}')" title="Edit"><i data-lucide="edit-2"></i></button>
                <button class="action-btn delete" onclick="deleteTask('${task.id}')" title="Delete"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        els.taskList.appendChild(card);
    });
    
    // Re-init icons for dynamic content
    lucide.createIcons();
}

// --- Actions ---

function handleFormSubmit(e) {
    e.preventDefault();
    const title = els.title.value.trim();
    if (!title) return;

    if (editingTaskId) {
        // Update
        const idx = tasks.findIndex(t => t.id === editingTaskId);
        if (idx !== -1) {
            tasks[idx].title = title;
            tasks[idx].difficulty = els.diff.value;
            tasks[idx].deadline = els.deadline.value;
            tasks[idx].desc = els.desc.value;
        }
        showToast('Task updated successfully!');
        resetForm();
    } else {
        // Create
        const newTask = {
            id: Date.now().toString(),
            title,
            difficulty: els.diff.value,
            deadline: els.deadline.value,
            desc: els.desc.value,
            completed: false,
            createdAt: Date.now()
        };
        tasks.push(newTask);
        showToast('Task added! Let\'s go!');
    }
    
    saveState();
    renderStats();
    renderTasks();
    els.form.reset();
}

window.toggleTaskComplete = function(id, checkboxObj) {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    
    const task = tasks[idx];
    task.completed = checkboxObj.checked;
    
    if (task.completed) {
        task.completedAt = Date.now();
        // Add points and update streak
        addPoints(task.difficulty);
        updateStreakOnComplete();
        const card = document.getElementById(`task-${id}`);
        if(card) card.classList.add('just-completed');
    }
    
    saveState();
    renderStats();
    
    // Wait for animation before re-rendering list
    setTimeout(() => {
        renderTasks();
    }, 400); 
}

window.deleteTask = function(id) {
    const card = document.getElementById(`task-${id}`);
    if (card) {
        card.classList.add('removing');
        setTimeout(() => {
            tasks = tasks.filter(t => t.id !== id);
            saveState();
            renderStats();
            renderTasks();
        }, 300); // match animation duration
    } else {
        tasks = tasks.filter(t => t.id !== id);
        saveState();
        renderStats();
        renderTasks();
    }
}

window.editTask = function(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    editingTaskId = id;
    els.title.value = task.title;
    els.diff.value = task.difficulty;
    els.deadline.value = task.deadline || '';
    els.desc.value = task.desc || '';
    
    els.submitBtn.textContent = 'Update Task';
    els.cancelBtn.style.display = 'block';
    
    els.form.scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
    editingTaskId = null;
    els.form.reset();
    els.submitBtn.textContent = 'Add Task';
    els.cancelBtn.style.display = 'none';
}

function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    // It will auto hide based on CSS animation but we need to reset the clone to replay
    els.toast.style.animation = 'none';
    els.toast.offsetHeight; /* trigger reflow */
    els.toast.style.animation = null; 
}

// --- Utils ---

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// --- Event Listeners ---

function setupEventListeners() {
    els.form.addEventListener('submit', handleFormSubmit);
    
    els.cancelBtn.addEventListener('click', () => {
        resetForm();
    });
    
    els.tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            els.tabs.forEach(t => t.classList.remove('active'));
            const target = e.target;
            target.classList.add('active');
            currentFilter = target.getAttribute('data-filter');
            renderTasks();
        });
    });
    
    els.themeToggle.addEventListener('click', toggleTheme);
}

function initTheme() {
    const stored = localStorage.getItem('levelup_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (stored === 'dark' || (!stored && prefersDark)) {
        document.body.classList.add('dark-mode');
        document.getElementById('moon-icon').style.display = 'none';
        document.getElementById('sun-icon').style.display = 'block';
    }
}

function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('levelup_theme', isDark ? 'dark' : 'light');
    
    document.getElementById('moon-icon').style.display = isDark ? 'none' : 'block';
    document.getElementById('sun-icon').style.display = isDark ? 'block' : 'none';
}

// Run
init();
