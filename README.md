# Open BJJ Round Timer

A free and open-source round timer for Brazilian Jiu-Jitsu training sessions.

## Features

- Configurable round length, rest length, total rounds, and optional warmup countdown
- Clear phase states: warmup, round, rest, and complete
- Audio signals for transitions between phases
- Ref Mode (IBJJF command audio)
- Keep-awake option while timer is active (on supported mobile browsers)
- Installable PWA with offline app-shell caching
- Keyboard controls:
  - `Space` start/pause
  - `R` reset
- Runs fully in the browser with no dependencies

## Run locally

Open `index.html` directly in your browser.

For live reload during development, you can use any static server. Example with Python:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Install as an app (PWA)

- Open the deployed HTTPS site in a supported browser.
- Use the in-app `Install app` button or browser install prompt.
- Once installed, the timer runs in standalone mode and works offline for core assets.

## Open Source Notes

- License: MIT
- Contributions are welcome. Keep PRs focused and include test steps in the description.

## Roadmap

- Presets for common rulesets (IBJJF, ADCC, MMA rounds)
- Optional countdown voice prompts
- Fullscreen coach mode
- Mobile-first layout refinements
