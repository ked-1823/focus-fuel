// Firebase configuration

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";


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

function debugLog(message) {
  console.log(message);
}

// Firestore Helpers
async function saveChallengeToFirestore(userId, challengeData) {
  try {
    await setDoc(doc(db, "challenges", userId), challengeData);
    debugLog("Challenge saved to Firestore");
  } catch (e) {
    console.error("Error saving to Firestore:", e);
  }
}

async function loadChallengeFromFirestore(userId) {
  try {
    const docRef = doc(db, "challenges", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      debugLog("Challenge loaded from Firestore");
      return docSnap.data();
    } else {
      debugLog("No Firestore challenge found for this user");
      return null;
    }
  } catch (e) {
    console.error("Error loading from Firestore:", e);
    return null;
  }
}

class ChallengeTracker {
  constructor(userId) {
    this.userId = userId;
    this.currentChallenge = null;

    this.setupSection = document.getElementById('setup-section');
    this.progressSection = document.getElementById('progress-section');
    this.nameInput = document.getElementById('challenge-name');
    this.durationSelect = document.getElementById('challenge-duration');
    this.startBtn = document.getElementById('start-btn');
    this.challengeTitle = document.getElementById('challenge-title');
    this.progressGrid = document.getElementById('progress-grid');
    this.undoBtn = document.getElementById('undo-btn');
    this.resetBtn = document.getElementById('reset-btn');
    this.backToSetupBtn = document.getElementById('new-challenge');
    this.toastContainer = document.getElementById('toast-container');

    this.currentStreakEl = document.getElementById('current-streak');
    this.totalCompletedEl = document.getElementById('total-completed');
    this.completionRateEl = document.getElementById('completion-rate');
    this.progressFillEl = document.getElementById('progress-fill');

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadExistingChallenge();
  }

  setupEventListeners() {
    this.nameInput.addEventListener('input', () => {
      this.startBtn.disabled = this.nameInput.value.trim().length < 3;
    });
    this.startBtn.addEventListener('click', () => this.startChallenge());
    this.undoBtn.addEventListener('click', () => this.undoLastAction());
    this.resetBtn.addEventListener('click', () => this.resetChallenge());
    this.backToSetupBtn.addEventListener('click', () => this.showSetupSection());
  }

async loadExistingChallenge() {
  const data = await loadChallengeFromFirestore(this.userId);
  console.log("Fetched challenge data:", data);

  if (data) {
    const startDate = new Date(data.startDate);
    const today = new Date();

    // Normalize both to midnight
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const daysPassed = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

    const missedDayExists = data.progress
      .slice(0, daysPassed)
      .some((completed) => !completed);

    if (missedDayExists) {
      // Strict delete from Firestore if user missed any previous day
      await deleteDoc(doc(db, "challenges", this.userId));
      this.currentChallenge = null;
      this.showToast('You missed a day. Challenge has been deleted. Start again!', 'info');
      this.showSetupSection();
    } else {
      this.currentChallenge = data;
      this.showProgressSection();  // ← Show the challenge UI
    }
  }
}





  saveChallenge() {
    if (this.currentChallenge) {
      saveChallengeToFirestore(this.userId, this.currentChallenge);
    }
  }

  startChallenge() {
    const name = this.nameInput.value.trim();
    const duration = parseInt(this.durationSelect.value);
    if (name.length < 3) return;

    this.currentChallenge = {
      name,
      duration,
      startDate: new Date().toISOString(),
      progress: Array(duration).fill(false),
      lastCheckedIndex: -1,
      lastUpdated: new Date().toISOString(),
      userId: this.userId
    };

    this.saveChallenge();
    this.showProgressSection();
    this.showToast(`${name} challenge started!`, 'success');
  }

  showSetupSection() {
    if (!this.preventAutoReset) {
      this.currentChallenge = null;
    }

    this.setupSection.style.display = 'block';
    this.progressSection.style.display = 'none';
    this.backToSetupBtn.style.display = 'none';
    this.nameInput.value = '';
    this.durationSelect.value = '21';
    this.startBtn.disabled = true;
  }


  showProgressSection() {
    this.setupSection.style.display = 'none';
    this.progressSection.style.display = 'block';
    this.backToSetupBtn.style.display = 'inline-flex';
    this.challengeTitle.textContent = this.currentChallenge.name;
    this.buildProgressGrid();
    this.updateStats();
    this.updateProgressBar();
  }

  buildProgressGrid() {
    this.progressGrid.innerHTML = '';

    const startDate = new Date(this.currentChallenge.startDate);
    const today = new Date();

    // Normalize both to midnight
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const daysPassed = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

    this.currentChallenge.progress.forEach((isCompleted, index) => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'challenge-checkbox';
      checkbox.checked = isCompleted;

      // Only allow editing for today or earlier
      checkbox.disabled = index > daysPassed;

      // Optional: highlight today's checkbox
      if (index === daysPassed) {
        checkbox.classList.add('active-today');
      }

      checkbox.addEventListener('change', () => this.toggleDay(index, checkbox.checked));
      this.progressGrid.appendChild(checkbox);
    });

    this.undoBtn.style.display = this.currentChallenge.lastCheckedIndex >= 0 ? 'inline-flex' : 'none';
  }


  toggleDay(dayIndex, isCompleted) {
    this.currentChallenge.progress[dayIndex] = isCompleted;
    this.currentChallenge.lastCheckedIndex = isCompleted ? dayIndex : -1;
    this.currentChallenge.lastUpdated = new Date().toISOString();
    this.saveChallenge();
    this.updateStats();
    this.updateProgressBar();
    this.undoBtn.style.display = this.currentChallenge.lastCheckedIndex >= 0 ? 'inline-flex' : 'none';
    this.showToast(`Day ${dayIndex + 1} ${isCompleted ? 'completed' : 'unmarked'}`, isCompleted ? 'success' : 'info');
  }

  undoLastAction() {
    const lastIndex = this.currentChallenge.lastCheckedIndex;
    if (lastIndex >= 0) this.toggleDay(lastIndex, false);
  }

  updateStats() {
    const completed = this.currentChallenge.progress.filter(Boolean).length;
    const total = this.currentChallenge.progress.length;
    const currentStreak = this.calculateCurrentStreak();
    const completionRate = Math.round((completed / total) * 100);

    this.currentStreakEl.textContent = currentStreak;
    this.totalCompletedEl.textContent = completed;
    this.completionRateEl.textContent = `${completionRate}%`;
  }

  calculateCurrentStreak() {
    let streak = 0;
    for (let i = this.currentChallenge.progress.length - 1; i >= 0; i--) {
      if (this.currentChallenge.progress[i]) streak++;
      else break;
    }
    return streak;
  }

  updateProgressBar() {
    const completed = this.currentChallenge.progress.filter(Boolean).length;
    const total = this.currentChallenge.progress.length;
    const percentage = (completed / total) * 100;
    this.progressFillEl.style.width = `${percentage}%`;
  }

  resetChallenge() {
    if (!confirm('Are you sure you want to reset your challenge?')) return;
    this.preventAutoReset = false;
    this.currentChallenge = null;
    this.showSetupSection();
    this.showToast('Challenge reset successfully', 'success');
  }


  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }
}

// Wait for Firebase Auth to load user before initializing ChallengeTracker
onAuthStateChanged(auth, (user) => {
  if (user) {
    debugLog('User signed in: ' + user.uid);
    try {
      window.challengeTracker = new ChallengeTracker(user.uid);
    } catch (e) {
      console.error('App init failed:', e);
    }
  } else {
    alert("Please sign in first!");
    // Optionally redirect to login page here
  }
});
