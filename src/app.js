const roundMinutesInput = document.getElementById("roundMinutes");
const roundSecondsPartInput = document.getElementById("roundSecondsPart");
const restSecondsInput = document.getElementById("restSeconds");
const totalRoundsInput = document.getElementById("totalRounds");
const warmupSecondsInput = document.getElementById("warmupSeconds");
const countdownBeepsEnabledInput = document.getElementById("countdownBeepsEnabled");
const refModeEnabledInput = document.getElementById("refModeEnabled");
const keepAwakeEnabledInput = document.getElementById("keepAwakeEnabled");
const lightModeEnabledInput = document.getElementById("lightModeEnabled");

const phaseLabel = document.getElementById("phaseLabel");
const timeLabel = document.getElementById("timeLabel");
const roundLabel = document.getElementById("roundLabel");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const timerCard = document.getElementById("timerCard");
const audioEnableBanner = document.getElementById("audioEnableBanner");
const installAppBtn = document.getElementById("installAppBtn");
const settingsCard = document.getElementById("settingsCard");
const toggleSettingsBtn = document.getElementById("toggleSettingsBtn");

let timerId = null;
let running = false;
let phase = "ready";
let currentRound = 1;
let secondsLeft = 300;
const combateAudio = new Audio("./assets/sound-files/combate.mp3");
const parroAudio = new Audio("./assets/sound-files/parro.mp3");
let sharedAudioContext = null;
let audioUnlocked = false;
let settingsCollapsed = false;
let fallbackFullscreenActive = false;
let wakeLockSentinel = null;
let deferredInstallPrompt = null;

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function clampSettings() {
  const roundMinutes = Math.max(0, Number(roundMinutesInput.value) || 0);
  const roundSecondsPart = Math.min(59, Math.max(0, Number(roundSecondsPartInput.value) || 0));
  const totalRoundSeconds = roundMinutes * 60 + roundSecondsPart;
  if (totalRoundSeconds < 10) {
    roundMinutesInput.value = 0;
    roundSecondsPartInput.value = 10;
  } else {
    roundMinutesInput.value = roundMinutes;
    roundSecondsPartInput.value = roundSecondsPart;
  }
  restSecondsInput.value = Math.max(0, Number(restSecondsInput.value) || 60);
  totalRoundsInput.value = Math.max(1, Number(totalRoundsInput.value) || 6);
  warmupSecondsInput.value = Math.max(0, Number(warmupSecondsInput.value) || 10);
}

function getRoundDurationSeconds() {
  return Number(roundMinutesInput.value) * 60 + Number(roundSecondsPartInput.value);
}

function getAudioContext() {
  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    sharedAudioContext = new AudioContextClass();
  }
  return sharedAudioContext;
}

function unlockAudioContext() {
  const audioContext = getAudioContext();
  if (!audioContext) return;
  if (audioContext.state === "running") {
    audioUnlocked = true;
    updateAudioBanner();
    return;
  }
  if (audioContext.state === "suspended") {
    audioContext.resume()
      .then(() => {
        audioUnlocked = audioContext.state === "running";
        updateAudioBanner();
      })
      .catch(() => {
        // Resume can fail outside a user gesture.
      });
  }
}

function registerAudioUnlockHandlers() {
  const unlockOnce = () => {
    unlockAudioContext();
    if (audioUnlocked) {
      document.removeEventListener("pointerdown", unlockOnce);
      document.removeEventListener("keydown", unlockOnce);
      document.removeEventListener("touchstart", unlockOnce);
    }
  };
  document.addEventListener("pointerdown", unlockOnce, { passive: true });
  document.addEventListener("keydown", unlockOnce);
  document.addEventListener("touchstart", unlockOnce, { passive: true });
}

function updateAudioBanner() {
  audioEnableBanner.classList.toggle("hidden", audioUnlocked);
}

function updateSettingsVisibility() {
  settingsCard.classList.toggle("collapsed", settingsCollapsed);
  toggleSettingsBtn.textContent = settingsCollapsed ? "Show Settings" : "Hide Settings";
}

function updateInstallButton() {
  const canShowInstall = deferredInstallPrompt !== null;
  installAppBtn.classList.toggle("hidden", !canShowInstall);
}

function supportsWakeLock() {
  return typeof navigator !== "undefined" && "wakeLock" in navigator && typeof navigator.wakeLock.request === "function";
}

async function requestWakeLock() {
  if (!supportsWakeLock()) return;
  if (wakeLockSentinel) return;
  if (!keepAwakeEnabledInput.checked || !running || document.visibilityState !== "visible") return;
  try {
    wakeLockSentinel = await navigator.wakeLock.request("screen");
    wakeLockSentinel.addEventListener("release", () => {
      wakeLockSentinel = null;
      if (running && keepAwakeEnabledInput.checked && document.visibilityState === "visible") {
        requestWakeLock().catch(() => {
          // Re-acquire may fail based on device power policy.
        });
      }
    });
  } catch {
    // Wake lock may fail due to browser/device power policy.
  }
}

async function releaseWakeLock() {
  if (!wakeLockSentinel) return;
  try {
    await wakeLockSentinel.release();
  } catch {
    // Ignore failures if lock is already released.
  } finally {
    wakeLockSentinel = null;
  }
}

function syncWakeLock() {
  if (running && keepAwakeEnabledInput.checked) {
    requestWakeLock().catch(() => {
      // Some browsers require repeated user gestures.
    });
  } else {
    releaseWakeLock().catch(() => {
      // Lock cleanup is best effort.
    });
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker registration is optional in unsupported contexts.
    });
  });
}

function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallButton();
  });

  installAppBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    try {
      await deferredInstallPrompt.userChoice;
    } catch {
      // Ignore install prompt failures.
    }
    deferredInstallPrompt = null;
    updateInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    updateInstallButton();
  });
}

function beep(frequency = 660, duration = 140, type = "sine", gain = 0.08) {
  const audioContext = getAudioContext();
  if (!audioContext || audioContext.state !== "running") return;

  const osc = audioContext.createOscillator();
  const amp = audioContext.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  amp.gain.value = gain;
  osc.connect(amp);
  amp.connect(audioContext.destination);
  const now = audioContext.currentTime;
  osc.start(now);
  osc.stop(now + duration / 1000);
}

function roundStartSignal() {
  if (refModeEnabledInput.checked) {
    playAudio(combateAudio);
    return;
  }
  beep(760, 130);
  setTimeout(() => beep(920, 130), 170);
}

function restStartSignal() {
  if (refModeEnabledInput.checked) {
    return;
  }
  beep(460, 180, "triangle");
}

function finalSignal() {
  if (refModeEnabledInput.checked) {
    playAudio(parroAudio);
    return;
  }
  beep(840, 120);
  setTimeout(() => beep(840, 120), 150);
  setTimeout(() => beep(840, 200), 320);
}

function countdownWarningSignal() {
  beep(1100, 70, "square", 0.05);
}

function playAudio(audio) {
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Audio playback may require user interaction in some browsers.
  });
}

function setPhaseClass(phaseName) {
  document.body.classList.remove("round", "rest", "end");
  if (phaseName === "round" || phaseName === "rest" || phaseName === "end") {
    document.body.classList.add(phaseName);
  }
}

function applyTheme(isLightMode) {
  const theme = isLightMode ? "light" : "dark";
  document.body.dataset.theme = theme;
  localStorage.setItem("bjj-timer-theme", theme);
}

function updateStartButtonLabel() {
  if (running) {
    startBtn.textContent = "Start";
    return;
  }
  const isResumablePhase = phase === "warmup" || phase === "round" || phase === "rest";
  startBtn.textContent = isResumablePhase ? "Resume" : "Start";
}

function updateUI() {
  timeLabel.textContent = formatTime(secondsLeft);
  roundLabel.textContent = `Round ${currentRound} / ${Number(totalRoundsInput.value)}`;

  if (phase === "warmup") {
    phaseLabel.textContent = "Warmup";
    setPhaseClass("");
  } else if (phase === "round") {
    phaseLabel.textContent = "Round";
    setPhaseClass("round");
  } else if (phase === "rest") {
    phaseLabel.textContent = "Rest";
    setPhaseClass("rest");
  } else if (phase === "end") {
    phaseLabel.textContent = "Session Complete";
    setPhaseClass("end");
  } else {
    phaseLabel.textContent = "Ready";
    setPhaseClass("");
  }
  updateStartButtonLabel();
}

function loadReadyState() {
  clampSettings();
  currentRound = 1;
  secondsLeft = getRoundDurationSeconds();
  phase = "ready";
  updateUI();
}

function startFromReady() {
  const warmup = Number(warmupSecondsInput.value);
  if (warmup > 0) {
    phase = "warmup";
    secondsLeft = warmup;
  } else {
    phase = "round";
    secondsLeft = getRoundDurationSeconds();
    roundStartSignal();
  }
  running = true;
  updateUI();
}

function tick() {
  if (!running) return;
  secondsLeft -= 1;

  if (secondsLeft > 0) {
    if (
      countdownBeepsEnabledInput.checked &&
      (phase === "warmup" || phase === "round" || phase === "rest") &&
      secondsLeft <= 5
    ) {
      countdownWarningSignal();
    }
    updateUI();
    return;
  }

  if (phase === "warmup") {
    phase = "round";
    secondsLeft = getRoundDurationSeconds();
    roundStartSignal();
    updateUI();
    return;
  }

  if (phase === "round") {
    if (refModeEnabledInput.checked) {
      playAudio(parroAudio);
    }
    const totalRounds = Number(totalRoundsInput.value);
    if (currentRound >= totalRounds) {
      phase = "end";
      secondsLeft = 0;
      running = false;
      syncWakeLock();
      finalSignal();
      updateUI();
      return;
    }

    const rest = Number(restSecondsInput.value);
    if (rest > 0) {
      phase = "rest";
      secondsLeft = rest;
      restStartSignal();
    } else {
      currentRound += 1;
      phase = "round";
      secondsLeft = getRoundDurationSeconds();
      roundStartSignal();
    }
    updateUI();
    return;
  }

  if (phase === "rest") {
    currentRound += 1;
    phase = "round";
    secondsLeft = getRoundDurationSeconds();
    roundStartSignal();
    updateUI();
  }
}

function startTimer() {
  unlockAudioContext();
  if (running) return;
  if (phase === "end") loadReadyState();
  const startedFromReady = phase === "ready";
  if (startedFromReady) startFromReady();
  const isResumablePhase = phase === "warmup" || phase === "round" || phase === "rest";
  if (!startedFromReady && refModeEnabledInput.checked && isResumablePhase) {
    playAudio(combateAudio);
  }
  running = true;
  if (!timerId) timerId = setInterval(tick, 1000);
  syncWakeLock();
  updateUI();
}

function pauseTimer() {
  unlockAudioContext();
  if (running && refModeEnabledInput.checked) {
    playAudio(parroAudio);
  }
  running = false;
  syncWakeLock();
}

function resetTimer() {
  unlockAudioContext();
  if ((running || phase !== "ready") && refModeEnabledInput.checked) {
    playAudio(parroAudio);
  }
  running = false;
  syncWakeLock();
  loadReadyState();
}

function updateFullscreenButtonText() {
  const isFullscreen = document.fullscreenElement || fallbackFullscreenActive;
  fullscreenBtn.textContent = isFullscreen ? "Exit Fullscreen" : "Fullscreen";
}

function setFallbackFullscreen(enabled) {
  fallbackFullscreenActive = enabled;
  timerCard.classList.toggle("mobileFullscreen", enabled);
  document.body.classList.toggle("mobileFullscreen", enabled);
}

async function toggleFullscreen() {
  const canUseNativeFullscreen =
    typeof timerCard.requestFullscreen === "function" && typeof document.exitFullscreen === "function";

  if (canUseNativeFullscreen) {
    if (!document.fullscreenElement) {
      await timerCard.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
    return;
  }

  setFallbackFullscreen(!fallbackFullscreenActive);
  updateFullscreenButtonText();
}

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);
audioEnableBanner.addEventListener("click", () => {
  unlockAudioContext();
});
toggleSettingsBtn.addEventListener("click", () => {
  settingsCollapsed = !settingsCollapsed;
  localStorage.setItem("bjj-timer-settings-collapsed", settingsCollapsed ? "true" : "false");
  updateSettingsVisibility();
});
fullscreenBtn.addEventListener("click", async () => {
  try {
    await toggleFullscreen();
  } catch {
    // Fullscreen can fail in unsupported browsers/contexts.
  } finally {
    updateFullscreenButtonText();
  }
});
document.addEventListener("fullscreenchange", updateFullscreenButtonText);
document.addEventListener("visibilitychange", () => {
  syncWakeLock();
});
lightModeEnabledInput.addEventListener("change", () => {
  applyTheme(lightModeEnabledInput.checked);
});
keepAwakeEnabledInput.addEventListener("change", syncWakeLock);

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    if (running) pauseTimer();
    else startTimer();
  }
  if (event.key.toLowerCase() === "r") {
    resetTimer();
  }
  if (event.key.toLowerCase() === "f") {
    event.preventDefault();
    toggleFullscreen().catch(() => {
      // Fullscreen can fail in unsupported browsers/contexts.
    });
  }
});

[roundMinutesInput, roundSecondsPartInput, restSecondsInput, totalRoundsInput, warmupSecondsInput, countdownBeepsEnabledInput, refModeEnabledInput].forEach((input) => {
  input.addEventListener("change", () => {
    if (!running && (phase === "ready" || phase === "end")) {
      loadReadyState();
    } else {
      clampSettings();
    }
  });
});

loadReadyState();
updateFullscreenButtonText();
registerAudioUnlockHandlers();
updateAudioBanner();
registerServiceWorker();
setupInstallPrompt();
updateInstallButton();
settingsCollapsed = localStorage.getItem("bjj-timer-settings-collapsed") === "true";
updateSettingsVisibility();
const savedTheme = localStorage.getItem("bjj-timer-theme");
const useLightMode = savedTheme === "light";
lightModeEnabledInput.checked = useLightMode;
applyTheme(useLightMode);
