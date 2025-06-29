// Focus Fuel JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const focusBackBtn = document.getElementById("focus-back-btn");
  const dailyMantra = document.getElementById("daily-mantra");
  const dailyTip = document.getElementById("daily-tip");
  const refreshBtn = document.getElementById("refresh-mantra");

  // Enhanced mantras and tips arrays
  const mantras = [
    "Breathe in clarity, breathe out stress.",
    "Small steps every day create big change.",
    "Your focus determines your reality.",
    "Energy flows where attention goes.",
    "Discipline is a form of self-respect.",
    "Progress over perfection, always.",
    "Calm mind brings inner strength.",
    "Present moment is your power point.",
    "Consistency beats intensity every time.",
    "Your potential is limitless.",
    "Embrace the journey, trust the process.",
    "Mindful actions create meaningful results.",
    "Quiet the noise, amplify your purpose.",
    "Growth happens outside your comfort zone.",
    "Focus on what you can control."
  ];

  const tips = [
    "💡 Tip: Practice 2 minutes of stillness before you start work.",
    "💡 Tip: Use the Pomodoro technique to manage deep work.",
    "💡 Tip: Exhale longer than you inhale — it calms your nerves.",
    "💡 Tip: Journaling clears mental clutter — try it before bed.",
    "💡 Tip: Morning sun boosts dopamine — open your window!",
    "💡 Tip: Take a 5-minute walk every hour to reset your mind.",
    "💡 Tip: Practice the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.",
    "💡 Tip: Set your phone to grayscale to reduce dopamine hits.",
    "💡 Tip: Use the 2-minute rule: if it takes less than 2 minutes, do it now.",
    "💡 Tip: Create a shutdown ritual to separate work from personal time.",
    "💡 Tip: Practice gratitude — write down 3 things you're thankful for daily.",
    "💡 Tip: Use background sounds or white noise to improve concentration.",
    "💡 Tip: Batch similar tasks together to minimize context switching.",
    "💡 Tip: Keep a water bottle nearby — dehydration affects focus.",
    "💡 Tip: Take deep belly breaths to activate your parasympathetic nervous system."
  ];

  // Animation helper function
  function animateTextChange(element, newText, callback) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(10px)';

    setTimeout(() => {
      if (callback) callback();
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    }, 200);
  }

  // Enhanced refresh functionality with animations
  function refreshContent() {
    const randomMantra = mantras[Math.floor(Math.random() * mantras.length)];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];

    // Animate button
    refreshBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      refreshBtn.style.transform = 'scale(1)';
    }, 150);

    // Animate mantra change
    animateTextChange(dailyMantra, null, () => {
      dailyMantra.textContent = `"${randomMantra}"`;
    });

    // Animate tip change with slight delay
    setTimeout(() => {
      animateTextChange(dailyTip, null, () => {
        dailyTip.textContent = randomTip;
      });
    }, 100);

    // Add visual feedback
    const mantraCard = document.querySelector('.mantra-card');
    mantraCard.style.boxShadow = '0 8px 32px rgba(120, 119, 198, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
    setTimeout(() => {
      mantraCard.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
    }, 500);
  }

  // Enhanced back button functionality
  function goBack() {
    const card = document.querySelector('.focus-card');
    card.style.transform = 'translateY(-20px) scale(0.95)';
    card.style.opacity = '0';

    setTimeout(() => {
      // ✅ This will go to homepage — index.html — in the root folder
      window.location.href = 'index.html';
    }, 300);
  }




  // Add CSS transitions for smooth animations
  function addSmoothTransitions() {
    dailyMantra.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    dailyTip.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

    const card = document.querySelector('.focus-card');
    card.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  }

  // Keyboard shortcuts
  function handleKeyboardShortcuts(event) {
    // Space or Enter to refresh
    if (event.code === 'Space' || event.code === 'Enter') {
      if (event.target === document.body) {
        event.preventDefault();
        refreshContent();
      }
    }

    // Escape to go back
    if (event.code === 'Escape') {
      goBack();
    }
  }

  // Auto-refresh functionality (optional)
  function startAutoRefresh() {
    // Uncomment the line below to enable auto-refresh every 30 seconds
    // setInterval(refreshContent, 30000);
  }

  // Initialize the app
  function init() {
    // Add smooth transitions
    addSmoothTransitions();

    // Event listeners
    refreshBtn.addEventListener("click", refreshContent);
    focusBackBtn.addEventListener("click", goBack);
    document.addEventListener("keydown", handleKeyboardShortcuts);

    // Initialize auto-refresh if needed
    startAutoRefresh();

    // Add touch/swipe support for mobile
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', (e) => {
      if (!touchStartX || !touchStartY) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const diffX = touchStartX - touchEndX;
      const diffY = touchStartY - touchEndY;

      // Swipe right to go back
      if (Math.abs(diffX) > Math.abs(diffY) && diffX < -50) {
        goBack();
      }

      // Swipe up to refresh
      if (Math.abs(diffY) > Math.abs(diffX) && diffY > 50) {
        refreshContent();
      }

      touchStartX = 0;
      touchStartY = 0;
    });
  }

  // Start the application
  init();

  // Add a welcome animation
  setTimeout(() => {
    const elements = document.querySelectorAll('.mantra-card, .tip-card, .refresh-btn');
    elements.forEach((el, index) => {
      setTimeout(() => {
        el.style.transform = 'translateY(0)';
        el.style.opacity = '1';
      }, index * 100);
    });
  }, 500);
});