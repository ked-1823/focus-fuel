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

// Application State (using memory instead of localStorage)
let appState = {
  habits: [],
  streak: 0,
  lastStreakDate: null,
  completedHabits: new Set()
};
let currentUser = null;

// Firebase Auth State Change Handler
if (typeof auth !== 'undefined') {
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      console.log('Logged in as:', user.uid);
      loadUserData(); // Load data after login
    } else {
      console.log('Not logged in. Redirecting to login...');
      window.location.href = 'login.html';
    }
  });
}

// Load user data from Firestore
function loadUserData() {
  if (typeof db === 'undefined' || !currentUser) {
    console.log('Firestore not available or user not logged in, using local state');
    initApp();
    return;
  }

  const userRef = db.collection('users').doc(currentUser.uid);
  userRef.get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      appState = {
        ...appState,
        ...data,
        completedHabits: new Set(data.completedHabits || [])
      };
      console.log('User data loaded from Firestore');
      initApp(); // Start app after loading user data
    } else {
      console.log('No user data found, starting fresh.');
      initApp(); // Start with default state
    }
  }).catch(err => {
    console.error('Error loading user data:', err);
    initApp(); // Even if error, start app
  });
}

// Save user data to Firestore
function saveUserData() {
  if (typeof db === 'undefined' || !currentUser) {
    console.log('Firestore not available or user not logged in, skipping save');
    return;
  }

  const userRef = db.collection('users').doc(currentUser.uid);
  userRef.set({
    habits: appState.habits,
    streak: appState.streak,
    lastStreakDate: appState.lastStreakDate,
    completedHabits: Array.from(appState.completedHabits)
  }).then(() => {
    console.log('User data saved to Firestore.');
  }).catch(err => {
    console.error('Error saving user data:', err);
  });
}

// Check and reset streak if broken
function checkStreakReset() {
  if (appState.lastStreakDate) {
    const lastDate = new Date(appState.lastStreakDate);
    const today = new Date();

    // Reset time to compare only dates, not time
    lastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = today - lastDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // If more than 1 day has passed, reset streak
    if (diffDays > 1) {
      console.log(`Streak broken! ${diffDays} days passed since last completion. Resetting streak from ${appState.streak} to 0.`);
      appState.streak = 0;
      showMessage('💔 Streak broken! Starting fresh today.', 'warning');
      saveUserData(); // Save after streak reset
      return true; // Streak was reset
    }
  }
  return false; // Streak not reset
}

// Initialize the application
function initApp() {
  // Check if streak should be reset first
  checkStreakReset();

  renderHabits();
  updateStats();
  updateEmptyState();
  updateDoneButtonState();

  // Add event listeners
  if (addHabitBtn) {
    addHabitBtn.addEventListener('click', addHabit);
  }

  if (habitInput) {
    habitInput.addEventListener('keypress', handleInputKeypress);
  }

  if (doneForTodayBtn) {
    doneForTodayBtn.addEventListener('click', handleDoneForToday);
  }

  if (backBtn) {
    backBtn.addEventListener('click', handleBack);
  }

  // Focus the input on load
  if (habitInput) {
    habitInput.focus();
  }
}

// Handle input keypress
function handleInputKeypress(e) {
  if (e.key === 'Enter') {
    e.preventDefault(); // Prevent form submission or other default behavior
    addHabit();
  }
}

// Add a new habit
function addHabit() {
  try {
    if (!habitInput) {
      console.error('Habit input element not found');
      return;
    }

    const habitText = habitInput.value.trim();

    if (!habitText) {
      showMessage('Please enter a habit', 'error');
      habitInput.focus();
      return;
    }

    if (habitText.length > 100) {
      showMessage('Habit name is too long (max 100 characters)', 'error');
      return;
    }

    // Check for duplicates
    if (appState.habits.some(habit => habit.text.toLowerCase() === habitText.toLowerCase())) {
      showMessage('This habit already exists', 'warning');
      habitInput.focus();
      return;
    }

    // Add the habit
    const habitId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newHabit = {
      id: habitId,
      text: habitText,
      createdAt: new Date().toISOString()
    };

    appState.habits.push(newHabit);

    // Clear input
    habitInput.value = '';

    // Update UI
    renderHabits();
    updateStats();
    updateEmptyState();
    updateDoneButtonState();

    // Focus back on input for next habit
    habitInput.focus();

    // Add success feedback
    showMessage(`"${habitText}" added successfully!`, 'success');

    // Add visual feedback
    if (addHabitBtn) {
      addHabitBtn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        addHabitBtn.style.transform = '';
      }, 150);
    }

    console.log('Habit added successfully:', newHabit);
    console.log('Current habits:', appState.habits);

    // Save to Firestore
    saveUserData();

  } catch (error) {
    console.error('Error adding habit:', error);
    showMessage('Failed to add habit. Please try again.', 'error');
  }
}

// Delete a habit
function deleteHabit(habitId) {
  try {
    const habitToDelete = appState.habits.find(habit => habit.id === habitId);

    appState.habits = appState.habits.filter(habit => habit.id !== habitId);
    appState.completedHabits.delete(habitId);

    renderHabits();
    updateStats();
    updateEmptyState();
    updateDoneButtonState();

    if (habitToDelete) {
      showMessage(`"${habitToDelete.text}" deleted`, 'warning');
    }

    // Save to Firestore
    saveUserData();

  } catch (error) {
    console.error('Error deleting habit:', error);
    showMessage('Failed to delete habit', 'error');
  }
}

// Toggle habit completion
function toggleHabit(habitId) {
  try {
    if (appState.completedHabits.has(habitId)) {
      appState.completedHabits.delete(habitId);
    } else {
      appState.completedHabits.add(habitId);
    }

    renderHabits();
    updateStats();
    updateDoneButtonState();

    // Save to Firestore
    saveUserData();

  } catch (error) {
    console.error('Error toggling habit:', error);
    showMessage('Failed to update habit status', 'error');
  }
}

// Render all habits
function renderHabits() {
  try {
    if (!habitList) {
      console.error('Habit list element not found');
      return;
    }

    habitList.innerHTML = '';

    appState.habits.forEach(habit => {
      const li = document.createElement('li');
      li.className = `habit-item ${appState.completedHabits.has(habit.id) ? 'completed' : ''}`;

      li.innerHTML = `
        <input 
          type="checkbox" 
          class="habit-checkbox" 
          ${appState.completedHabits.has(habit.id) ? 'checked' : ''}
          onchange="toggleHabit('${habit.id}')"
        />
        <span class="habit-text">${escapeHtml(habit.text)}</span>
        <button class="delete-btn" onclick="deleteHabit('${habit.id}')" title="Delete habit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      `;

      habitList.appendChild(li);
    });
  } catch (error) {
    console.error('Error rendering habits:', error);
  }
}

// Update statistics
function updateStats() {
  try {
    if (streakCount) {
      streakCount.textContent = appState.streak;
    }
    if (completedToday) {
      completedToday.textContent = appState.completedHabits.size;
    }
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// Update empty state visibility
function updateEmptyState() {
  try {
    if (!emptyState || !habitList) return;

    if (appState.habits.length === 0) {
      emptyState.classList.remove('hidden');
      habitList.classList.add('hidden');
    } else {
      emptyState.classList.add('hidden');
      habitList.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error updating empty state:', error);
  }
}

// Check if user can complete the day (prevent multiple completions on same day)
function canCompleteDay() {
  const today = new Date().toDateString();
  return appState.lastStreakDate !== today;
}

// Check if all habits are completed
function allHabitsCompleted() {
  return appState.habits.length > 0 && appState.completedHabits.size === appState.habits.length;
}

// Update the done button state
function updateDoneButtonState() {
  try {
    if (!doneForTodayBtn) return;

    const canComplete = canCompleteDay();
    const allCompleted = allHabitsCompleted();
    const hasHabits = appState.habits.length > 0;

    doneForTodayBtn.disabled = !canComplete || !allCompleted || !hasHabits;

    // Update button text based on state
    const btnText = doneForTodayBtn.querySelector('span:last-child');
    if (btnText) {
      if (!canComplete) {
        btnText.textContent = 'Already Completed Today';
      } else if (!hasHabits) {
        btnText.textContent = 'Add Habits First';
      } else if (!allCompleted) {
        btnText.textContent = `Complete ${appState.habits.length - appState.completedHabits.size} More`;
      } else {
        btnText.textContent = 'Complete Day';
      }
    }
  } catch (error) {
    console.error('Error updating done button state:', error);
  }
}

// Handle "Done for Today" button
function handleDoneForToday() {
  try {
    const today = new Date().toDateString();

    // Check if already completed today
    if (appState.lastStreakDate === today) {
      showMessage('You\'ve already marked today as completed!', 'warning');
      return;
    }

    // Check if no habits exist
    if (appState.habits.length === 0) {
      showMessage('Add some habits first before completing your day!', 'error');
      return;
    }

    // Check if all habits are completed
    if (!allHabitsCompleted()) {
      showMessage('Complete all your habits before finishing the day!', 'error');
      return;
    }

    // Check if streak should be reset before updating
    const wasStreakReset = checkStreakReset();

    // Update streak logic - improved to handle consecutive days properly
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();

    if (appState.lastStreakDate === yesterdayString) {
      // Consecutive day - increment streak
      appState.streak++;
      showMessage(`🎉 Great job! Day ${appState.streak} completed! Your habits are ready for tomorrow.`, 'success');
    } else if (appState.lastStreakDate === null || appState.streak === 0 || wasStreakReset) {
      // First day or streak was reset - start new streak
      appState.streak = 1;
      showMessage('🎉 Great start! Day 1 completed! Your habits are ready for tomorrow.', 'success');
    } else {
      // Gap in days - restart streak
      console.log('Gap detected in streak. Restarting from day 1.');
      appState.streak = 1;
      showMessage('🎉 Back on track! Day 1 completed! Your habits are ready for tomorrow.', 'success');
    }

    appState.lastStreakDate = today;

    // Clear only the completion status for next day, keep the habits
    appState.completedHabits.clear();

    // Update UI
    updateStats();
    renderHabits();
    updateDoneButtonState();

    // Add celebration effect
    celebrateSuccess();

    // Save to Firestore
    saveUserData();

  } catch (error) {
    console.error('Error completing day:', error);
    showMessage('Failed to complete day. Please try again.', 'error');
  }
}

// Show message to user
function showMessage(text, type) {
  try {
    let messageElement;

    switch (type) {
      case 'success':
        messageElement = appreciationMsg;
        break;
      case 'warning':
        messageElement = warningMsg;
        break;
      case 'error':
        messageElement = incompleteMsg;
        break;
      default:
        console.warn('Unknown message type:', type);
        return;
    }

    if (!messageElement) {
      console.error('Message element not found for type:', type);
      return;
    }

    // Update message content if it's a custom message
    const messageContent = messageElement.querySelector('.message-content span');
    if (messageContent) {
      messageContent.textContent = text;
    }

    messageElement.classList.remove('hidden');

    // Auto-hide after 4 seconds
    setTimeout(() => {
      if (messageElement) {
        messageElement.classList.add('hidden');
      }
    }, 4000);
  } catch (error) {
    console.error('Error showing message:', error);
  }
}

// Celebration effect
function celebrateSuccess() {
  try {
    const card = document.querySelector('.habit-card');
    if (card) {
      card.style.transform = 'scale(1.02)';
      card.style.boxShadow = `
        0 32px 64px rgba(107, 203, 119, 0.2),
        0 16px 32px rgba(107, 203, 119, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.1)
      `;

      setTimeout(() => {
        card.style.transform = '';
        card.style.boxShadow = '';
      }, 300);
    }
  } catch (error) {
    console.error('Error in celebration effect:', error);
  }
}

// Handle back button
function handleBack() {
  try {
    if (backBtn) {
      backBtn.style.transform = 'translateX(-2px)';
      setTimeout(() => {
        backBtn.style.transform = '';
        window.location.href = 'index.html';
      }, 150);
    }
  } catch (error) {
    console.error('Error handling back button:', error);
  }
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  try {
    // Ctrl/Cmd + Enter to complete day
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleDoneForToday();
    }

    // Escape to clear input
    if (e.key === 'Escape' && document.activeElement === habitInput) {
      if (habitInput) {
        habitInput.value = '';
        habitInput.blur();
      }
    }
  } catch (error) {
    console.error('Error in keyboard shortcuts:', error);
  }
});

// Auto-save functionality (simulate periodic saves)
setInterval(() => {
  try {
    console.log('Auto-saving app state...', {
      habitsCount: appState.habits.length,
      streak: appState.streak,
      completedToday: appState.completedHabits.size
    });
    // Save to Firestore periodically
    saveUserData();
  } catch (error) {
    console.error('Error in auto-save:', error);
  }
}, 30000); // Every 30 seconds

// Performance optimization: Debounced input validation
let inputValidationTimeout;
if (habitInput) {
  habitInput.addEventListener('input', () => {
    try {
      clearTimeout(inputValidationTimeout);
      inputValidationTimeout = setTimeout(() => {
        const value = habitInput.value.trim();

        if (value.length > 100) {
          habitInput.style.borderColor = 'rgba(255, 107, 107, 0.5)';
        } else if (appState.habits.some(habit => habit.text.toLowerCase() === value.toLowerCase())) {
          habitInput.style.borderColor = 'rgba(255, 211, 61, 0.5)';
        } else {
          habitInput.style.borderColor = '';
        }
      }, 300);
    } catch (error) {
      console.error('Error in input validation:', error);
    }
  });
}

// Advanced streak calculation
function calculateStreakBonus() {
  if (appState.streak >= 30) return '🏆 Master';
  if (appState.streak >= 21) return '🔥 Expert';
  if (appState.streak >= 14) return '⭐ Pro';
  if (appState.streak >= 7) return '💪 Strong';
  if (appState.streak >= 3) return '🌱 Growing';
  return '🚀 Starting';
}

// Error handling
window.addEventListener('error', (e) => {
  console.error('Application error:', e.error);
  showMessage('Something went wrong. Please try again.', 'error');
});

// Prevent unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  showMessage('Something went wrong. Please try again.', 'error');
});

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('Initializing Habit Tracker...');

    // If Firebase is not available, initialize without it
    if (typeof auth === 'undefined') {
      console.log('Firebase not available, starting in offline mode');
      initApp();
    }

    // Welcome message for first-time users
    if (appState.habits.length === 0 && appState.streak === 0) {
      setTimeout(() => {
        showMessage('Welcome to Habit Hero! Add your first habit to get started.', 'success');
      }, 1000);
    }
  } catch (error) {
    console.error('Error initializing app:', error);
    showMessage('Failed to initialize app. Please refresh the page.', 'error');
  }
});

// Daily streak check - runs when app starts and periodically
function performDailyCheck() {
  const wasReset = checkStreakReset();
  if (wasReset) {
    updateStats();
    updateDoneButtonState();
  }
}

// Check streak every hour to catch day changes
setInterval(performDailyCheck, 60 * 60 * 1000); // Every hour

// Export functions for potential module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addHabit,
    deleteHabit,
    toggleHabit,
    handleDoneForToday
  };
}