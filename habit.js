// Firebase Configuration (replace with your actual Firebase config)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDoWm21fIjIMM7jSI9ijA2YjvBNKsZacl8",
  authDomain: "focusfuel-c4eec.firebaseapp.com",
  projectId: "focusfuel-c4eec",
  storageBucket: "focusfuel-c4eec.appspot.com",
  messagingSenderId: "325140276155",
  appId: "1:325140276155:web:9f542aece9ac6e41685a9e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const habitInput = document.getElementById('habit-input');
const addHabitBtn = document.getElementById('add-habit');
const habitList = document.getElementById('habit-list');
const streakCount = document.getElementById('streak-count');
const completedToday = document.getElementById('completed-today');
const appreciationMsg = document.getElementById('appreciation-msg');
const warningMsg = document.getElementById('warning-msg');
const incompleteMsg = document.getElementById('incomplete-msg');
const doneForTodayBtn = document.getElementById('done-today');
const emptyState = document.getElementById('empty-state');
const backBtn = document.getElementById('back-btn');
const streakTitleEl = document.getElementById('streak-title'); // Optional

let appState = {
  habits: [],
  streak: 0,
  lastStreakDate: null,
  completedHabits: new Set()
};
let currentUser = null;

// Load data from Firestore
async function loadUserData() {
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();

      // ✅ Fixed: Convert lastStreakDate to .toDateString() format
      appState.habits = data.habits || [];
      appState.streak = typeof data.streak === "number" ? data.streak : 0;
      appState.lastStreakDate = data.lastStreakDate
        ? new Date(data.lastStreakDate).toDateString()
        : null;
      appState.completedHabits = new Set(data.completedHabits || []);
    } else {
      // First-time user — don't reset, just init
      console.log("No existing data. Initializing new user...");
    }
  } catch (err) {
    console.error('Error loading data:', err);
  }

  initApp();
}



async function saveUserData() {
  try {
    const userRef = doc(db, "users", currentUser.uid);
    await setDoc(userRef, {
      habits: appState.habits || [],
      streak: typeof appState.streak === "number" ? appState.streak : 0,
      lastStreakDate: appState.lastStreakDate ? new Date(appState.lastStreakDate).toISOString() : null,

      completedHabits: Array.from(appState.completedHabits || [])
    });
  } catch (err) {
    console.error('Error saving data:', err);
  }
}


onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    loadUserData();
  } else {
    window.location.href = 'login.html';
  }
});

function initApp() {
  checkStreakReset();
  renderHabits();
  updateStats();
  updateEmptyState();
  updateDoneButtonState();
  habitInput?.addEventListener('keypress', e => e.key === 'Enter' && addHabit());
  addHabitBtn?.addEventListener('click', addHabit);
  doneForTodayBtn?.addEventListener('click', handleDoneForToday);
  backBtn?.addEventListener('click', () => window.location.href = 'index.html');
}

function checkStreakReset() {
  const today = new Date();
  const last = appState.lastStreakDate ? new Date(appState.lastStreakDate) : null;
  if (last) {
    last.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = (today - last) / (1000 * 60 * 60 * 24);
    if (diff > 1) {
      appState.streak = 0;
      showMessage('Streak reset due to inactivity.', 'warning');
      saveUserData();
    }
  }
}

function renderHabits() {
  habitList.innerHTML = '';
  appState.habits.forEach(habit => {
    const li = document.createElement('li');
    li.className = `habit-item ${appState.completedHabits.has(habit.id) ? 'completed' : ''}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = appState.completedHabits.has(habit.id);
    checkbox.addEventListener('change', () => toggleHabit(habit.id));

    const span = document.createElement('span');
    span.textContent = habit.text;

    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.addEventListener('click', () => deleteHabit(habit.id));

    li.append(checkbox, span, delBtn);
    habitList.appendChild(li);
  });
}

function addHabit() {
  const text = habitInput.value.trim();
  if (!text) return showMessage('Enter a habit name.', 'error');
  if (text.length > 100) return showMessage('Habit too long.', 'error');
  if (appState.habits.some(h => h.text.toLowerCase() === text.toLowerCase())) {
    return showMessage('Habit already exists.', 'warning');
  }

  const newHabit = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    text,
    createdAt: new Date().toISOString()
  };
  appState.habits.push(newHabit);
  habitInput.value = '';
  renderHabits();
  updateStats();
  updateEmptyState();
  updateDoneButtonState();
  saveUserData();
  showMessage('Habit added!', 'success');
}

function deleteHabit(id) {
  appState.habits = appState.habits.filter(h => h.id !== id);
  appState.completedHabits.delete(id);
  renderHabits();
  updateStats();
  updateEmptyState();
  updateDoneButtonState();
  saveUserData();
  showMessage('Habit deleted.', 'warning');
}

function toggleHabit(id) {
  if (appState.completedHabits.has(id)) {
    appState.completedHabits.delete(id);
  } else {
    appState.completedHabits.add(id);
  }
  renderHabits();
  updateStats();
  updateDoneButtonState();
  saveUserData();
}

function handleDoneForToday() {
  const todayStr = new Date().toDateString();
  if (appState.lastStreakDate === todayStr) {
    return showMessage('Already completed today.', 'warning');
  }
  if (appState.habits.length === 0) return showMessage('Add habits first.', 'error');
  if (appState.completedHabits.size !== appState.habits.length) return showMessage('Complete all habits.', 'error');

  const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
  appState.streak = appState.lastStreakDate === yesterdayStr ? appState.streak + 1 : 1;
  appState.lastStreakDate = todayStr;
  appState.completedHabits.clear();
  updateStats();
  renderHabits();
  updateDoneButtonState();
  saveUserData();
  showMessage(`Day ${appState.streak} complete!`, 'success');
}

function updateStats() {
  streakCount.textContent = appState.streak;
  completedToday.textContent = appState.completedHabits.size;
  if (streakTitleEl) streakTitleEl.textContent = calculateStreakBonus();
}

function updateEmptyState() {
  if (!appState.habits.length) {
    emptyState.classList.remove('hidden');
    habitList.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    habitList.classList.remove('hidden');
  }
}

function updateDoneButtonState() {
  const canFinish = appState.habits.length > 0 && appState.completedHabits.size === appState.habits.length && appState.lastStreakDate !== new Date().toDateString();
  doneForTodayBtn.disabled = !canFinish;
}

function showMessage(text, type) {
  const msgMap = {
    success: appreciationMsg,
    warning: warningMsg,
    error: incompleteMsg
  };
  const el = msgMap[type];
  if (!el) return;
  const span = el.querySelector('.message-content span');
  if (span) span.textContent = text;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

function calculateStreakBonus() {
  if (appState.streak >= 30) return '🏆 Master';
  if (appState.streak >= 21) return '🔥 Expert';
  if (appState.streak >= 14) return '⭐ Pro';
  if (appState.streak >= 7) return '💪 Strong';
  if (appState.streak >= 3) return '🌱 Growing';
  return '🚀 Starting';
}
