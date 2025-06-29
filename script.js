// =====================================
// DOM ELEMENTS
// =====================================
const taskInput = document.getElementById('ta');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const setTimeBtn = document.getElementById('set-time-btn');
const customMinutesInput = document.getElementById('custom-minutes');
const sessionCountEl = document.getElementById('session-count');
const focusTimeEl = document.getElementById('total-focus-time');
const timeDisplay = document.getElementById('time-display');
const progressCircle = document.querySelector('.progress-ring-circle');
const pomodoroCard = document.querySelector('.pomodoro-card');
const backBtn = document.getElementById('back-btn');

// =====================================
// GLOBAL STATE
// =====================================
let timer;
let totalTime = 25 * 60;
let timeLeft = totalTime;
let isRunning = false;
let sessionsCompleted = 0;
let focusTimeMinutes = 0;

// =====================================
// PROGRESS RING SETUP
// =====================================
const radius = 90;
const circumference = 2 * Math.PI * radius;
progressCircle.style.strokeDasharray = circumference;
progressCircle.style.strokeDashoffset = circumference;

// =====================================
// DISPLAY + FUNCTIONALITY
// =====================================
function updateDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progress = (totalTime - timeLeft) / totalTime;
  progressCircle.style.strokeDashoffset = circumference - (progress * circumference);
}

function startTimer() {
  if (!isRunning) {
    isRunning = true;
    startBtn.innerHTML = '<span class="btn-icon">⏸</span><span>Running</span>';
    startBtn.disabled = true;

    timer = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        updateDisplay();
      } else {
        clearInterval(timer);
        isRunning = false;
        startBtn.innerHTML = '<span class="btn-icon">▶</span><span>Start</span>';
        startBtn.disabled = false;

        sessionsCompleted++;
        focusTimeMinutes += totalTime / 60;
        sessionCountEl.textContent = sessionsCompleted;
        focusTimeEl.textContent = Math.round(focusTimeMinutes);

        timeDisplay.innerHTML = `
          <div style="
            color: #ffffff;
            font-weight: 600;
            font-size: 16px;
            line-height: 1.3;
            text-align: center;
            text-shadow: 0 1px 4px rgba(0,0,0,0.3);
          ">
            ⏰ Time's up!<br>Take a break
          </div>
        `;

        progressCircle.style.strokeDashoffset = circumference;

        if (Notification.permission === 'granted') {
          new Notification('Pomodoro Complete!', {
            body: 'Time for a break! Great work on your focus session.',
            icon: '🍅'
          });
        }
      }
    }, 1000);
  }
}

function pauseTimer() {
  clearInterval(timer);
  isRunning = false;
  startBtn.innerHTML = '<span class="btn-icon">▶</span><span>Start</span>';
  startBtn.disabled = false;
}

function resetTimer() {
  pauseTimer();
  timeLeft = totalTime;
  updateDisplay();
  progressCircle.style.strokeDashoffset = circumference;
}

function setCustomTime() {
  const minutes = parseInt(customMinutesInput.value);
  if (!isNaN(minutes) && minutes > 0) {
    totalTime = minutes * 60;
    timeLeft = totalTime;
    updateDisplay();
    progressCircle.style.strokeDashoffset = circumference;
  }
}

// =====================================
// TASK MANAGEMENT
// =====================================
addTaskBtn.addEventListener('click', () => {
  const task = taskInput.value.trim();
  if (task !== '') {
    const li = document.createElement('li');
    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" />
      <span>${task}</span>
      <button class="delete-task" onclick="this.parentElement.remove()">×</button>
    `;
    taskList.appendChild(li);
    taskInput.value = '';
    startBtn.disabled = false;
  }
});

taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addTaskBtn.click();
  }
});

taskList.addEventListener('change', (e) => {
  if (e.target.classList.contains('task-checkbox')) {
    const taskItem = e.target.nextElementSibling;
    taskItem.style.textDecoration = e.target.checked ? 'line-through' : 'none';
    taskItem.style.color = e.target.checked ? '#888' : '';
    e.target.parentElement.classList.toggle('completed', e.target.checked);
  }
});

// =====================================
// KEYBOARD SHORTCUTS
// =====================================
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.target.matches('input')) {
    e.preventDefault();
    isRunning ? pauseTimer() : (!startBtn.disabled && startTimer());
  }

  if (e.code === 'KeyR' && e.ctrlKey) {
    e.preventDefault();
    resetTimer();
  }
});

// =====================================
// BACKGROUND PARTICLES
// =====================================
function createParticle() {
  const particle = document.createElement('div');
  particle.className = 'particle';
  particle.style.left = Math.random() * 100 + '%';
  particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
  document.querySelector('.background-particles').appendChild(particle);
  setTimeout(() => particle.remove(), 5000);
}
setInterval(createParticle, 300);

// =====================================
// BACK BUTTON LOGIC
// =====================================
backBtn.addEventListener("click", () => {
  window.location.href = "index.html"; // Change if your dashboard file is named differently
});

// =====================================
// INITIALIZATION
// =====================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🍅 Pomodoro Timer initialized successfully!');
  console.log('💡 Tip: Use Spacebar to start/pause, Ctrl+R to reset');
  updateDisplay();
  backBtn.style.display = 'inline-block';

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});

// =====================================
// EVENT LISTENERS
// =====================================
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
setTimeBtn.addEventListener('click', setCustomTime);
