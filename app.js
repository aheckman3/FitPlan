import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

import { getLogText, extractCountFromLogEntry as countFromLogEntry, shouldCountLogForGoal } from './goal-utils.mjs';

const panels = document.querySelectorAll('.panel');
const tabButtons = document.querySelectorAll('.tab-button');
const installButton = document.getElementById('installButton');
const plannerForm = document.getElementById('plannerForm');
const plannerList = document.querySelector('#plannerList ul');
const logForm = document.getElementById('logForm');
const logList = document.querySelector('#logList ul');
const goalForm = document.getElementById('goalForm');
const goalList = document.querySelector('#goalList ul');
const completedGoalList = document.querySelector('#completedGoalList ul');
const statPlanned = document.getElementById('statPlanned');
const statLogged = document.getElementById('statLogged');
const statGoals = document.getElementById('statGoals');
const statCompletedGoals = document.getElementById('statCompletedGoals');
const statProgress = document.getElementById('statProgress');
const logWorkoutSelect = document.getElementById('logWorkout');
const signOutButton = document.getElementById('signOutButton');
const clearAllDataButton = document.getElementById('clearAllDataButton');
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');

const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');

let deferredPrompt = null;
let workoutPlans = [];
let workoutLogs = [];
let goals = [];
let completedGoals = [];
let user = null;

const firebaseConfig = {
  apiKey: "AIzaSyA5jFjEoi3P1xeu1kygOT_LHnyTvkhQgdk",
  authDomain: "fitplan-e5ecd.firebaseapp.com",
  projectId: "fitplan-e5ecd",
  storageBucket: "fitplan-e5ecd.appspot.com",
  messagingSenderId: "386775776687",
  appId: "1:386775776687:web:9ddb87131df165da9a435a",
  measurementId: "G-0QBJ78LTCC"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function showPanel(panelId) {
  panels.forEach((panel) => panel.classList.toggle('hidden', panel.id !== panelId));
  tabButtons.forEach((button) => button.classList.toggle('active', button.dataset.panel === panelId));
}

function updateWorkoutOptions() {
  if (!logWorkoutSelect) return;

  logWorkoutSelect.innerHTML = '';

  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = 'Select workout';
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  logWorkoutSelect.appendChild(placeholderOption);

  workoutPlans.forEach((plan, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${plan.name} — ${plan.date}`;
    logWorkoutSelect.appendChild(option);
  });

  const unplanned = document.createElement('option');
  unplanned.value = 'unplanned';
  unplanned.textContent = 'Unplanned Workout';
  logWorkoutSelect.appendChild(unplanned);
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDescription(description = '') {
  const value = String(description ?? '').trim();

  if (!value) {
    return 'No description';
  }

  if (value.includes('<ul') || value.includes('<li')) {
    return value;
  }

  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

  if (!lines.length) {
    return 'No description';
  }

  const bulletList = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
  return `<ul class="desc-list">${bulletList}</ul>`;
}

function normalizeText(value = '') {
  return String(value ?? '')
    .toLowerCase()
    .trim();
}

function toWords(value = '') {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function extractCountFromLogEntry(log = {}) {
  return countFromLogEntry(log);
}

function getGoalProgressValue(goal = {}) {
  const goalTitle = normalizeText(goal.title);
  const goalType = goal.type || 'count';
  const workoutName = normalizeText(goal.workoutName);
  const targetValue = Number.parseInt(goal.targetCount ?? goal.target ?? goal.progress ?? '1', 10);
  const safeTarget = Number.isFinite(targetValue) && targetValue > 0 ? targetValue : 1;

  const totalCount = workoutLogs.reduce((sum, log) => {
    if (!log || !shouldCountLogForGoal(log, goal)) return sum;

    const combinedText = getLogText(log);
    const combinedTextNormalized = normalizeText(combinedText);

    const matchesTitle = goalTitle
      ? toWords(goalTitle).some((word) => combinedTextNormalized.includes(word))
      : false;

    const matchesWorkoutName = workoutName
      ? toWords(workoutName).some((word) => combinedTextNormalized.includes(word))
      : false;

    const matchesSpecificWorkout = workoutName ? matchesWorkoutName : matchesTitle;

    if (goalType === 'workout') {
      const isWorkoutMatch = workoutName
        ? matchesSpecificWorkout
        : matchesTitle || combinedTextNormalized.includes(goalTitle);

      if (!isWorkoutMatch) return sum;

      return sum + 1;
    }

    const isCountMatch = workoutName ? matchesSpecificWorkout : matchesTitle || combinedTextNormalized.includes(goalTitle);

    if (!isCountMatch) return sum;

    return sum + extractCountFromLogEntry(log);
  }, 0);

  return { totalCount, safeTarget, goalType };
}

function getGoalProgressPercent(goal = {}) {
  const { totalCount, safeTarget } = getGoalProgressValue(goal);
  return Math.min(100, Math.max(0, Math.round((totalCount / safeTarget) * 100)));
}

function showActionPopup(title = 'Saved', message = 'Your update was saved.', icon = '✓') {
  const popup = document.getElementById('actionPopup');
  const popupTitle = document.getElementById('actionPopupTitle');
  const popupMessage = document.getElementById('actionPopupMessage');
  const popupIcon = document.getElementById('actionPopupIcon');

  if (!popup || !popupTitle || !popupMessage || !popupIcon) return;

  popupTitle.textContent = title;
  popupMessage.textContent = message;
  popupIcon.textContent = icon;
  popup.classList.remove('hidden');
  popup.classList.add('show');

  clearTimeout(window.actionPopupTimer);
  window.actionPopupTimer = setTimeout(() => {
    popup.classList.remove('show');
    popup.classList.add('hidden');
  }, 2200);
}

function showGoalCompletionPopup(goalTitle = 'Your goal is complete.') {
  const popup = document.getElementById('goalCompletionPopup');
  const popupGoalName = document.getElementById('popupGoalName');

  if (!popup || !popupGoalName) return;

  popupGoalName.textContent = goalTitle;
  popup.classList.remove('hidden');
  popup.classList.add('show');

  clearTimeout(window.goalPopupTimer);
  window.goalPopupTimer = setTimeout(() => {
    popup.classList.remove('show');
    popup.classList.add('hidden');
  }, 2400);
}

function clearAllUserData() {
  if (!user) return;

  const firstConfirm = window.confirm('This will erase all workouts, goals, logs, and stats for this account. Continue?');
  if (!firstConfirm) return;

  const secondConfirm = window.confirm('This action cannot be undone. Are you absolutely sure you want to clear everything?');
  if (!secondConfirm) return;

  const thirdConfirm = window.confirm('Final confirmation: clear all plans, logs, goals, and completed goals from this account?');
  if (!thirdConfirm) return;

  workoutPlans = [];
  workoutLogs = [];
  goals = [];
  completedGoals = [];
  saveLocalData();
  renderList();
  updateWorkoutOptions();
  window.localStorage.removeItem(`fitplan_${user.uid}_plans`);
  window.localStorage.removeItem(`fitplan_${user.uid}_logs`);
  window.localStorage.removeItem(`fitplan_${user.uid}_goals`);
  window.localStorage.removeItem(`fitplan_${user.uid}_completed_goals`);
  alert('All data has been cleared.');
}

function renderList() {
  if (plannerList) {
    plannerList.innerHTML = '';
    workoutPlans.forEach((plan, index) => {
      const item = document.createElement('li');
      const recurringLabel = plan.recurring && plan.recurring !== 'none'
        ? ` • Recurs ${plan.recurring}${plan.recurringInterval > 1 ? ` every ${plan.recurringInterval}` : ''}`
        : '';

      item.innerHTML = `
        <strong>${escapeHtml(plan.name)}</strong><br>
        ${formatDescription(plan.description)}<br>
        <small>${escapeHtml(plan.date)} • ${escapeHtml(plan.duration)} min${recurringLabel}</small>
        <button class="delete-button" data-type="plan" data-index="${index}">Delete</button>
      `;
      plannerList.appendChild(item);
    });
  }

  if (logList) {
    logList.innerHTML = '';
    workoutLogs.forEach((log, index) => {
      const item = document.createElement('li');
      item.innerHTML = `
        <strong>${escapeHtml(log.workout)}</strong><br>
        ${escapeHtml(log.notes || 'No notes')}<br>
        <small>${escapeHtml(log.date)} • ${log.completed ? 'Completed' : 'Skipped'}</small>
        <button class="delete-button" data-type="log" data-index="${index}">Delete</button>
      `;
      logList.appendChild(item);
    });
  }

  if (goalList) {
    goalList.innerHTML = '';
    goals.forEach((goal, index) => {
      const item = document.createElement('li');
      const progressPercent = getGoalProgressPercent(goal);
      const { totalCount, safeTarget, goalType } = getGoalProgressValue(goal);
      const suffix = goalType === 'workout' ? 'workouts' : 'count';
      const isComplete = progressPercent >= 100;
      const hillProgress = Math.min(100, Math.max(0, progressPercent));
      const trackStartX = 8;
      const trackWidth = 200;
      const completedWidth = Math.max(0, Math.min(trackWidth, (hillProgress / 100) * trackWidth));
      const runnerX = trackStartX + completedWidth;
      const progressVisual = `
        <div class="goal-progress-visual" aria-label="Goal progression track">
          <svg viewBox="0 0 140 90" role="img">
            <rect x="${trackStartX}" y="44" width="${trackWidth}" height="28" rx="7" class="goal-track-base" />
            <rect x="${trackStartX}" y="44" width="${completedWidth}" height="28" rx="7" class="goal-track-progress" />
            ${isComplete ? '' : `
              <circle cx="${runnerX}" cy="56" r="8" class="goal-runner-body" />
              <circle cx="${runnerX}" cy="46" r="4.5" class="goal-runner-head" />
              <line x1="${runnerX}" y1="60" x2="${runnerX - 4}" y2="72" class="goal-runner-leg" />
              <line x1="${runnerX}" y1="60" x2="${runnerX + 4}" y2="72" class="goal-runner-leg" />
              <line x1="${runnerX}" y1="50" x2="${runnerX - 6}" y2="56" class="goal-runner-arm" />
              <line x1="${runnerX}" y1="50" x2="${runnerX + 6}" y2="56" class="goal-runner-arm" />
            `}
          </svg>
        </div>
      `;

      item.innerHTML = `
        <div class="goal-item-main">
          <div class="goal-item-copy">
            <strong>${escapeHtml(goal.title)}</strong><br>
            Target: ${escapeHtml(goal.date)}<br>
            ${goal.workoutName ? `Workout: ${escapeHtml(goal.workoutName)}<br>` : ''}
            <div class="goal-progress-row">
              <span class="goal-progress-text">Progress: ${progressPercent}% (${totalCount}/${safeTarget} ${suffix})</span>
              ${progressVisual}
            </div>
          </div>
          <div class="goal-item-actions">
            <button class="delete-button" data-type="goal" data-index="${index}">Delete</button>
            ${isComplete ? `<button class="complete-goal-button" data-type="goal" data-index="${index}">Move to Completed</button>` : ''}
          </div>
        </div>
      `;
      goalList.appendChild(item);
    });
  }

  if (completedGoalList) {
    completedGoalList.innerHTML = '';
    completedGoals.forEach((goal, index) => {
      const item = document.createElement('li');
      const progressPercent = getGoalProgressPercent(goal);
      const { totalCount, safeTarget, goalType } = getGoalProgressValue(goal);
      const suffix = goalType === 'workout' ? 'workouts' : 'count';

      item.innerHTML = `
        <strong>${escapeHtml(goal.title)}</strong><br>
        Target: ${escapeHtml(goal.date)}<br>
        ${goal.workoutName ? `Workout: ${escapeHtml(goal.workoutName)}<br>` : ''}
        Progress: ${progressPercent}% (${totalCount}/${safeTarget} ${suffix})
        <button class="delete-button" data-type="completed-goal" data-index="${index}">Delete</button>
      `;
      completedGoalList.appendChild(item);
    });
  }

  if (statPlanned) statPlanned.textContent = workoutPlans.length;
  if (statLogged) statLogged.textContent = workoutLogs.length;
  if (statGoals) statGoals.textContent = goals.length;
  if (statCompletedGoals) statCompletedGoals.textContent = completedGoals.length;

  const progressAverage = goals.length
    ? Math.round(
        goals.reduce((sum, goal) => sum + getGoalProgressPercent(goal), 0) / goals.length
      )
    : 0;

  if (statProgress) statProgress.textContent = `${progressAverage}%`;
}

function saveLocalData() {
  if (!user) return;
  window.localStorage.setItem(`fitplan_${user.uid}_plans`, JSON.stringify(workoutPlans));
  window.localStorage.setItem(`fitplan_${user.uid}_logs`, JSON.stringify(workoutLogs));
  window.localStorage.setItem(`fitplan_${user.uid}_goals`, JSON.stringify(goals));
  window.localStorage.setItem(`fitplan_${user.uid}_completed_goals`, JSON.stringify(completedGoals));
}

function loadLocalData() {
  if (!user) return;

  try {
    workoutPlans = JSON.parse(window.localStorage.getItem(`fitplan_${user.uid}_plans`) || '[]');
    workoutLogs = JSON.parse(window.localStorage.getItem(`fitplan_${user.uid}_logs`) || '[]');
    goals = JSON.parse(window.localStorage.getItem(`fitplan_${user.uid}_goals`) || '[]');
    completedGoals = JSON.parse(window.localStorage.getItem(`fitplan_${user.uid}_completed_goals`) || '[]');
  } catch (error) {
    console.error('Failed to load local data:', error);
    workoutPlans = [];
    workoutLogs = [];
    goals = [];
    completedGoals = [];
  }

  updateWorkoutOptions();
  renderList();
}

function toggleUnplannedFields() {
  const unplannedFields = document.getElementById('unplannedFields');
  if (!unplannedFields || !logWorkoutSelect) return;

  unplannedFields.classList.toggle('hidden', logWorkoutSelect.value !== 'unplanned');
}

function updateUIForAuth(currentUser) {
  user = currentUser;

  const navTabs = document.getElementById('navTabs');
  const loginTabButton = document.getElementById('loginTabButton');
  const loginPanel = document.getElementById('loginPanel');

  if (user) {
    if (navTabs) navTabs.classList.remove('hidden');
    if (loginTabButton) loginTabButton.classList.add('hidden');
    if (loginPanel) loginPanel.classList.add('hidden');
    if (signOutButton) signOutButton.classList.remove('hidden');
    showPanel('plannerPanel');
    loadLocalData();
  } else {
    if (navTabs) navTabs.classList.add('hidden');
    if (loginTabButton) loginTabButton.classList.remove('hidden');
    if (loginPanel) loginPanel.classList.remove('hidden');
    if (signOutButton) signOutButton.classList.add('hidden');
    showPanel('loginPanel');
  }
}

if (signupForm) {
  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, signupEmail.value, signupPassword.value);
      signupForm.reset();
    } catch (error) {
      alert(error.message);
    }
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
      loginForm.reset();
    } catch (error) {
      alert(error.message);
    }
  });
}

if (signOutButton) {
  signOutButton.addEventListener('click', async () => {
    await signOut(auth);
    workoutPlans = [];
    workoutLogs = [];
    goals = [];
    completedGoals = [];
    renderList();
  });
}

if (clearAllDataButton) {
  clearAllDataButton.addEventListener('click', clearAllUserData);
}

if (plannerForm) {
  plannerForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const workoutNameInput = document.getElementById('workoutName');
    const workoutDurationInput = document.getElementById('workoutDuration');
    const workoutDateInput = document.getElementById('workoutDate');
    const workoutDescriptionInput = document.getElementById('workoutDescription');
    const workoutRecurringInput = document.getElementById('workoutRecurring');
    const workoutRecurringIntervalInput = document.getElementById('workoutRecurringInterval');

    const rawDescription = workoutDescriptionInput ? workoutDescriptionInput.value : '';
    const bulletList = rawDescription
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join('');

    const recurringInterval = workoutRecurringIntervalInput ? Number.parseInt(workoutRecurringIntervalInput.value, 10) : 1;
    const safeInterval = Number.isFinite(recurringInterval) && recurringInterval > 0 ? recurringInterval : 1;

    const plan = {
      name: workoutNameInput ? workoutNameInput.value.trim() || 'Untitled Workout' : 'Untitled Workout',
      description: bulletList ? `<ul class="desc-list">${bulletList}</ul>` : 'No description',
      duration: workoutDurationInput ? workoutDurationInput.value : '',
      date: workoutDateInput ? workoutDateInput.value : '',
      recurring: workoutRecurringInput ? workoutRecurringInput.value : 'none',
      recurringInterval: safeInterval
    };

    workoutPlans.push(plan);
    updateWorkoutOptions();
    renderList();
    saveLocalData();
    plannerForm.reset();
    showActionPopup('Workout Planned', `Saved ${plan.name}.`, '🗓');
  });
}

if (logForm && logWorkoutSelect) {
  logForm.addEventListener('submit', (event) => {
    event.preventDefault();

    let workoutName = 'Unplanned Workout';
    let workoutDuration = 'Unknown';

    if (logWorkoutSelect.value === 'unplanned') {
      const unplannedNameInput = document.getElementById('unplannedName');
      const unplannedDurationInput = document.getElementById('unplannedDuration');

      workoutName = unplannedNameInput ? unplannedNameInput.value.trim() || 'Unplanned Workout' : 'Unplanned Workout';
      workoutDuration = unplannedDurationInput ? unplannedDurationInput.value.trim() || 'Unknown' : 'Unknown';
    } else {
      const selectedIndex = Number.parseInt(logWorkoutSelect.value, 10);
      const selectedPlan = workoutPlans[selectedIndex];

      if (!selectedPlan) {
        alert('Please choose a valid workout.');
        return;
      }

      workoutName = selectedPlan.name;
      workoutDuration = selectedPlan.duration;
    }

    const logCompletedInput = document.getElementById('logCompleted');
    const logNotesInput = document.getElementById('logNotes');

    const selectedPlan = logWorkoutSelect.value !== 'unplanned'
      ? workoutPlans[Number.parseInt(logWorkoutSelect.value, 10)]
      : null;

    const logEntry = {
      workout: workoutName,
      duration: workoutDuration,
      date: new Date().toLocaleDateString(),
      completed: logCompletedInput ? logCompletedInput.checked : false,
      notes: logNotesInput ? logNotesInput.value : '',
      description: selectedPlan ? selectedPlan.description : '',
      planDescription: selectedPlan ? selectedPlan.description : '',
      loggedAt: Date.now(),
      timestamp: Date.now(),
      count: extractCountFromLogEntry({
        workout: workoutName,
        notes: logNotesInput ? logNotesInput.value : '',
        description: selectedPlan ? selectedPlan.description : ''
      })
    };

    workoutLogs.push(logEntry);
    renderList();
    saveLocalData();
    logForm.reset();
    toggleUnplannedFields();
    showActionPopup('Workout Logged', `Logged ${logEntry.workout}.`, '✓');
  });
}

if (logWorkoutSelect) {
  logWorkoutSelect.addEventListener('change', toggleUnplannedFields);
}

toggleUnplannedFields();

if (goalForm) {
  goalForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const goalTitleInput = document.getElementById('goalTitle');
    const goalDateInput = document.getElementById('goalDate');
    const goalProgressInput = document.getElementById('goalProgress');
    const goalTypeInput = document.getElementById('goalType');
    const goalWorkoutNameInput = document.getElementById('goalWorkoutName');

    const targetCountValue = goalProgressInput ? goalProgressInput.value : '';
    const targetCount = Number.parseInt(targetCountValue, 10);

    goals.push({
      title: goalTitleInput ? goalTitleInput.value.trim() : '',
      date: goalDateInput ? goalDateInput.value : '',
      type: goalTypeInput ? goalTypeInput.value : 'count',
      workoutName: goalWorkoutNameInput ? goalWorkoutNameInput.value.trim() : '',
      targetCount: Number.isFinite(targetCount) && targetCount > 0 ? targetCount : 1,
      createdAt: Date.now()
    });

    renderList();
    saveLocalData();
    goalForm.reset();
  });
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  if (installButton) installButton.classList.remove('hidden');
});

if (installButton) {
  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      installButton.classList.add('hidden');
    }

    deferredPrompt = null;
  });
}

window.addEventListener('appinstalled', () => {
  if (installButton) installButton.classList.add('hidden');
});

document.addEventListener('click', (event) => {
  const completeButton = event.target.closest('.complete-goal-button');
  if (completeButton) {
    const index = Number(completeButton.dataset.index);
    const completedGoal = goals.splice(index, 1)[0];
    if (completedGoal) {
      completedGoal.completedAt = Date.now();
      completedGoals.push(completedGoal);
      saveLocalData();
      showGoalCompletionPopup(completedGoal.title);
      renderList();
    }
    return;
  }

  const button = event.target.closest('.delete-button');
  if (!button) return;

  const type = button.dataset.type;
  const index = Number(button.dataset.index);

  if (type === 'plan') {
    workoutPlans.splice(index, 1);
  } else if (type === 'log') {
    workoutLogs.splice(index, 1);
  } else if (type === 'goal') {
    goals.splice(index, 1);
  } else if (type === 'completed-goal') {
    completedGoals.splice(index, 1);
  }

  saveLocalData();
  renderList();
});

tabButtons.forEach((button) => {
  button.addEventListener('click', () => showPanel(button.dataset.panel));
});

onAuthStateChanged(auth, updateUIForAuth);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((error) => console.error('SW registration failed:', error));
  });
}