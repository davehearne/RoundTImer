# Contributing to Open BJJ Round Timer

Thanks for contributing. This project is intentionally simple, browser-first, and open source.

## Development setup

1. Clone the repository.
2. Run a local static server from the project root:

```bash
python3 -m http.server 8080
```

3. Open <http://localhost:8080>.

## Project principles

- Keep dependencies minimal.
- Prioritize reliability and readability over clever code.
- Preserve keyboard-first usage (`Space`, `R`, `F`).
- Keep UI readable at distance for gym use.

## Pull request guidelines

- Keep PRs focused on one improvement.
- Include a clear description of the behavior change and why.
- Add manual test steps in the PR description.
- Update docs (`README.md`) when user-facing behavior changes.

## Manual test checklist

- Timer starts, pauses, and resets correctly.
- Warmup, round, rest, and completion transitions behave correctly.
- Fullscreen mode enters/exits and controls remain usable.
- Light/dark mode toggles and persists across reloads.
- Optional countdown warning beeps can be enabled/disabled.

## Code style

- Use clear variable names and small functions.
- Add comments only when logic is non-obvious.
- Avoid introducing frameworks unless discussed first.
