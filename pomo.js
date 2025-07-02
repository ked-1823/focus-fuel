// ✅ Complete working Pomodoro timer with all functionality
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

function getLocalDate() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().split("T")[0];
}

let timer, duration = 25 * 60, timeLeft = duration;
let user = null, isRunning = false, sessionStartTime = null;
let currentDate = getLocalDate();

// DOM refs
const timeDisplay = document.getElementById("time-display");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");
const setTimeBtn = document.getElementById("set-time-btn");
const customMinutes = document.getElementById("custom-minutes");
const sessionCountEl = document.getElementById("session-count");
const totalFocusTimeEl = document.getElementById("total-focus-time");
const taskInput = document.getElementById("ta");
const addTaskBtn = document.getElementById("add-task-btn");
const taskList = document.getElementById("task-list");

function updateDisplay() {
  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");
  timeDisplay.textContent = `${minutes}:${seconds}`;
}

function showMessage(message) {
  const messageBox = document.getElementById("message-box");
  if (messageBox) {
    messageBox.textContent = message;
    messageBox.style.display = "block";
    setTimeout(() => {
      messageBox.style.display = "none";
    }, 5000);
  } else {
    console.log(message);
  }
}

function startTimer() {
  if (timer) return; // Already running
  isRunning = true;
  sessionStartTime = new Date();
  saveCurrentSessionState();

  timer = setInterval(() => {
    timeLeft--;
    updateDisplay();
    if (timeLeft % 30 === 0) saveCurrentSessionState(); // Save every 30 seconds
    if (timeLeft <= 0) {
      clearInterval(timer);
      timer = null;
      isRunning = false;
      completeSession();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timer);
  timer = null;
  isRunning = false;
  saveCurrentSessionState();
}

function resetTimer() {
  pauseTimer();
  timeLeft = duration;
  updateDisplay();
  sessionStartTime = null;
  clearCurrentSessionState();
}

function setCustomTime() {
  const minutes = parseInt(customMinutes.value);
  if (minutes >= 1 && minutes <= 120) {
    pauseTimer(); // Stop current timer if running
    duration = minutes * 60;
    timeLeft = duration;
    updateDisplay();
    startBtn.disabled = false;
    clearCurrentSessionState();
    showMessage(`⏰ Timer set to ${minutes} minutes`);
  } else {
    alert("Please enter a time between 1 and 120 minutes");
  }
}

async function saveCurrentSessionState() {
  if (!user) return;
  try {
    const userRef = doc(db, "users", user.uid);
    const sessionState = {
      timeLeft,
      duration,
      isRunning,
      sessionStartTime: sessionStartTime?.toISOString() || null,
      lastUpdated: new Date().toISOString(),
      sessionDate: getLocalDate()
    };
    await setDoc(userRef, { currentSession: sessionState }, { merge: true });
  } catch (error) {
    console.error("Error saving session state:", error);
  }
}

async function loadCurrentSessionState() {
  if (!user) return;
  try {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const sessionState = data.currentSession;
      if (sessionState) {
        // Check if session is from today
        const sessionDate = sessionState.sessionDate || getLocalDate();
        const today = getLocalDate();

        if (sessionDate !== today) {
          console.log("Clearing old session from previous day");
          await clearCurrentSessionState();
          timeLeft = duration;
          updateDisplay();
          return;
        }

        timeLeft = sessionState.timeLeft || duration;
        duration = sessionState.duration || duration;

        if (sessionState.isRunning && sessionState.lastUpdated) {
          const lastUpdated = new Date(sessionState.lastUpdated);
          const now = new Date();
          const elapsedSeconds = Math.floor((now - lastUpdated) / 1000);
          timeLeft = Math.max(0, timeLeft - elapsedSeconds);

          if (timeLeft === 0) {
            completeSession();
          } else {
            isRunning = true;
            sessionStartTime = sessionState.sessionStartTime
              ? new Date(sessionState.sessionStartTime)
              : new Date();
            startTimer();
          }
        }
        updateDisplay();
      }
    }
  } catch (error) {
    console.error("Error loading session state:", error);
  }
}

async function clearCurrentSessionState() {
  if (!user) return;
  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { currentSession: null }, { merge: true });
  } catch (error) {
    console.error("Error clearing session state:", error);
  }
}

async function completeSession() {
  if (!user) return;
  const today = getLocalDate();
  const userRef = doc(db, "users", user.uid);
  try {
    const docSnap = await getDoc(userRef);
    let sessions = {};
    if (docSnap.exists()) {
      sessions = docSnap.data().sessions || {};
    }
    const todayData = sessions[today] || { count: 0, minutes: 0 };
    todayData.count += 1;
    todayData.minutes += duration / 60;

    await setDoc(userRef, {
      sessions: { ...sessions, [today]: todayData },
      currentSession: null
    }, { merge: true });

    renderStats(todayData);
    showMessage(`🎉 Session completed! You focused for ${duration / 60} minutes.`);
    await clearCurrentTask();
  } catch (error) {
    console.error("Error saving completed session:", error);
  }
}

function renderStats(todayData) {
  sessionCountEl.textContent = todayData.count;
  totalFocusTimeEl.textContent = Math.round(todayData.minutes);
}

async function clearCurrentTask() {
  if (!user) return;
  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { currentTask: "" }, { merge: true });
    taskInput.value = "";
    taskList.innerHTML = "";
  } catch (error) {
    console.error("Error clearing task:", error);
  }
}

async function loadCurrentTask() {
  if (!user) return;
  try {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const task = data.currentTask || "";
      taskInput.value = task;
      taskList.innerHTML = task ? `<li class="task-item">${task}</li>` : "";
    }
  } catch (error) {
    console.error("Error loading current task:", error);
  }
}

async function loadTodayStats() {
  if (!user) return;
  const today = getLocalDate();
  const userRef = doc(db, "users", user.uid);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const sessions = docSnap.data().sessions || {};
      const todayData = sessions[today] || { count: 0, minutes: 0 };
      renderStats(todayData);
    }
  } catch (error) {
    console.error("Error loading today's stats:", error);
  }
}

async function checkForNewDay() {
  const newDate = getLocalDate();
  if (newDate !== currentDate) {
    console.log("New day detected:", currentDate, "->", newDate);
    currentDate = newDate;

    // Reset timer to default
    pauseTimer();
    duration = 25 * 60;
    timeLeft = duration;
    updateDisplay();

    await clearCurrentSessionState();
    await clearCurrentTask();
    await loadTodayStats();
    showMessage("🔄 It's a new day! Stats and tasks refreshed.");
  }
}

async function addTask() {
  const task = taskInput.value.trim();
  if (!task || !user) return alert("Please enter a task!");
  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { currentTask: task }, { merge: true });
    taskList.innerHTML = `<li class="task-item">${task}</li>`;
    taskInput.value = "";
  } catch (error) {
    console.error("Error saving task:", error);
  }
}

// Event bindings
addTaskBtn.addEventListener("click", addTask);
taskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addTask();
});

// Timer control buttons
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);
setTimeBtn.addEventListener("click", setCustomTime);

// Authentication
onAuthStateChanged(auth, (u) => {
  if (!u) {
    window.location.href = "login.html";
  } else {
    user = u;
    checkForNewDay();
    loadTodayStats();
    loadCurrentTask();
    loadCurrentSessionState();
    startBtn.disabled = false;
  }
});

// Page lifecycle events
window.addEventListener("beforeunload", () => {
  if (isRunning) saveCurrentSessionState();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checkForNewDay();
  if (isRunning) saveCurrentSessionState();
});

// Periodic checks
setInterval(() => {
  checkForNewDay().catch(console.error);
}, 60 * 1000);

// Initialize display
updateDisplay();