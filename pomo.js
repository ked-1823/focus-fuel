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

// ✅ Firebase Config
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

// Wait until DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  let timer;
  let duration = 25 * 60;
  let timeLeft = duration;
  let user = null;
  let isRunning = false;
  let sessionStartTime = null;

  // DOM Elements
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

  function startTimer() {
    if (timer) return;
    isRunning = true;
    sessionStartTime = new Date();

    // Save current session state
    saveCurrentSessionState();

    timer = setInterval(() => {
      timeLeft--;
      updateDisplay();

      // Save state every 30 seconds while running
      if (timeLeft % 30 === 0) {
        saveCurrentSessionState();
      }

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
    isRunning = false;
    sessionStartTime = null;
    clearCurrentSessionState();
  }

  function setCustomTime() {
    const minutes = parseInt(customMinutes.value);
    if (minutes >= 1 && minutes <= 120) {
      duration = minutes * 60;
      timeLeft = duration;
      updateDisplay();
      startBtn.disabled = false;
      // Clear any existing session state when setting new time
      clearCurrentSessionState();
    }
  }

  // Save current session state to Firestore
  async function saveCurrentSessionState() {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const sessionState = {
        timeLeft: timeLeft,
        duration: duration,
        isRunning: isRunning,
        sessionStartTime: sessionStartTime?.toISOString() || null,
        lastUpdated: new Date().toISOString()
      };

      await setDoc(userRef, { currentSession: sessionState }, { merge: true });
    } catch (error) {
      console.error("Error saving session state:", error);
    }
  }

  // Load current session state from Firestore
  async function loadCurrentSessionState() {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const sessionState = data.currentSession;

        if (sessionState) {
          timeLeft = sessionState.timeLeft || duration;
          duration = sessionState.duration || duration;

          // Check if session was running and calculate elapsed time
          if (sessionState.isRunning && sessionState.lastUpdated) {
            const lastUpdated = new Date(sessionState.lastUpdated);
            const now = new Date();
            const elapsedSeconds = Math.floor((now - lastUpdated) / 1000);

            // Adjust timeLeft based on elapsed time
            timeLeft = Math.max(0, timeLeft - elapsedSeconds);

            // If time ran out while away, complete the session
            if (timeLeft === 0) {
              completeSession();
            } else {
              // Resume the timer
              isRunning = true;
              sessionStartTime = sessionState.sessionStartTime ? new Date(sessionState.sessionStartTime) : new Date();
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

  // Clear current session state
  async function clearCurrentSessionState() {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { currentSession: null }, { merge: true });
    } catch (error) {
      console.error("Error clearing session state:", error);
    }
  }

  // Complete a session and save to daily stats
  // Complete a session and save to daily stats
  async function completeSession() {
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
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

      // ✅ Show message and clear the task
      showMessage(`🎉 Session completed! You focused for ${duration / 60} minutes.`);
      await clearCurrentTask();  // ✅ This line clears task after session is done

    } catch (error) {
      console.error("Error saving completed session:", error);
    }
  }


  function renderStats(todayData) {
    sessionCountEl.textContent = todayData.count;
    totalFocusTimeEl.textContent = Math.round(todayData.minutes);
  }

  async function loadTodayStats() {
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
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

  async function loadCurrentTask() {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const task = data.currentTask || "";
        taskInput.value = task;
        if (task) {
          taskList.innerHTML = `<li class="task-item">${task}</li>`;
        }
      }
    } catch (error) {
      console.error("Error loading current task:", error);
    }
  }

  // Fixed task adding functionality
  async function addTask() {
    const task = taskInput.value.trim();
    if (!task || !user) {
      alert("Please enter a task!");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { currentTask: task }, { merge: true });

      taskList.innerHTML = `<li class="task-item">${task}</li>`;
      taskInput.value = "";

      console.log("Task saved successfully:", task);
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task. Please try again.");
    }
  }
  async function clearCurrentTask() {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { currentTask: "" }, { merge: true });

      taskInput.value = "";
      taskList.innerHTML = "";
      console.log("Task cleared successfully.");
    } catch (error) {
      console.error("Error clearing task:", error);
    }
  }

  // Event Listeners
  addTaskBtn.addEventListener("click", addTask);

  // Allow Enter key to add task
  taskInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addTask();
    }
  });

  onAuthStateChanged(auth, (u) => {
    if (!u) {
      window.location.href = "login.html";
    } else {
      user = u;
      loadTodayStats();
      loadCurrentTask();
      loadCurrentSessionState(); // Load session state after user is authenticated
      startBtn.disabled = false;
    }
  });

  // Initial Setup
  updateDisplay();
  startBtn.addEventListener("click", startTimer);
  pauseBtn.addEventListener("click", pauseTimer);
  resetBtn.addEventListener("click", resetTimer);
  setTimeBtn.addEventListener("click", setCustomTime);

  // Save session state when user leaves the page
  window.addEventListener("beforeunload", () => {
    if (isRunning) {
      saveCurrentSessionState();
    }
  });

  // Handle visibility change (when user switches tabs)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && isRunning) {
      saveCurrentSessionState();
    }
  });
});
function showMessage(message) {
  const messageBox = document.getElementById("message-box");
  messageBox.textContent = message;
  messageBox.style.display = "block";

  // Hide message after 5 seconds (optional)
  setTimeout(() => {
    messageBox.style.display = "none";
  }, 5000);
}

