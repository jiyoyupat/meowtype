# meowtype

A simple typing test web app to sharpen your fingers.
Comes with a Bongo Cat 🐱 that types along with you.

## Features

- Random word mode (English & Indonesian)
- Animated Bongo Cat + on-screen keymap (draggable)
- Results summary: WPM, accuracy, and chart
- Minimal UI, built with React + Vite + Tailwind

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Recharts (for result charts)

## Run locally

```bash
pnpm install
pnpm dev
```

Production build:

```bash
pnpm build
pnpm preview
```

## Project structure

```
src/
  components/   # App, TypingTest, BongoCat, KeyMap, ResultsView, Draggable
  contexts/     # SettingsContext
  data/         # word lists (english, indonesian)
  lib/          # word utilities
  styles/       # index.css (Tailwind)
```

Just a fun little project. 🐾

## License

Source code is licensed under the [MIT License](LICENSE).

### Credits

- **Word lists** (`src/data/english*.json`, `indonesian.json`) — sourced from [Monkeytype](https://github.com/monkeytypegame/monkeytype) (GPL-3.0).
- **Bongo Cat artwork** — © original creators ([DitzyFlama](https://twitter.com/DitzyFlama) / [StrayRogue](https://twitter.com/StrayRogue)), included here for non-commercial, fan-project use.
