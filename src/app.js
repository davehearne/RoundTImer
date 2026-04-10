const roundMinutesInput = document.getElementById("roundMinutes");
const roundSecondsPartInput = document.getElementById("roundSecondsPart");
const restSecondsInput = document.getElementById("restSeconds");
const totalRoundsInput = document.getElementById("totalRounds");
const warmupSecondsInput = document.getElementById("warmupSeconds");
const countdownBeepsEnabledInput = document.getElementById("countdownBeepsEnabled");
const lightModeEnabledInput = document.getElementById("lightModeEnabled");

const phaseLabel = document.getElementById("phaseLabel");
const timeLabel = document.getElementById("timeLabel");
const roundLabel = document.getElementById("roundLabel");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const timerCard = document.getElementById("timerCard");

let timerId = null;
let running = false;
let phase = "ready";
let currentRound = 1;
let secondsLeft = 300;

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

function beep(frequency = 660, duration = 140, type = "sine", gain = 0.08) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const amp = audioContext.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    amp.gain.value = gain;
    osc.connect(amp);
    amp.connect(audioContext.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      audioContext.close();
    }, duration);
  } catch {
    // Audio may be blocked until user interaction.
  }
}

function roundStartSignal() {
  beep(760, 130);
  setTimeout(() => beep(920, 130), 170);
}

function restStartSignal() {
  beep(460, 180, "triangle");
}

function finalSignal() {
  beep(840, 120);
  setTimeout(() => beep(840, 120), 150);
  setTimeout(() => beep(840, 200), 320);
}

function countdownWarningSignal() {
  beep(1100, 70, "square", 0.05);
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
    const totalRounds = Number(totalRoundsInput.value);
    if (currentRound >= totalRounds) {
      phase = "end";
      secondsLeft = 0;
      running = false;
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
  if (running) return;
  if (phase === "end") loadReadyState();
  if (phase === "ready") startFromReady();
  running = true;
  if (!timerId) timerId = setInterval(tick, 1000);
}

function pauseTimer() {
  running = false;
}

function resetTimer() {
  running = false;
  loadReadyState();
}

function updateFullscreenButtonText() {
  fullscreenBtn.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await timerCard.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
}

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);
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
lightModeEnabledInput.addEventListener("change", () => {
  applyTheme(lightModeEnabledInput.checked);
});

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

[roundMinutesInput, roundSecondsPartInput, restSecondsInput, totalRoundsInput, warmupSecondsInput, countdownBeepsEnabledInput].forEach((input) => {
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
const savedTheme = localStorage.getItem("bjj-timer-theme");
const useLightMode = savedTheme === "light";
lightModeEnabledInput.checked = useLightMode;
applyTheme(useLightMode);
