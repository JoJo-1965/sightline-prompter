# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sightline Prompter (a fork of Electron Teleprompter) is a desktop app that displays markdown/HTML as a translucent overlay, allowing users to read scripts while seeing through to presentations or video calls. Built with Electron.js using ES modules (`"type": "module"`). Includes a built-in CodeMirror 6 markdown editor that toggles with the preview.

## Commands

- **Start app:** `npm start` (runs `build:editor` automatically via `prestart`)
- **Build:** `npm run build` (uses `@electron/packager`, outputs to `dist/`)
- **Build editor bundle:** `npm run build:editor` (esbuild bundles CodeMirror into `src/client/editor-bundle.js`)
- **Lint:** `npm run lint` (ESLint with `--fix`, uses `eslint-config-reverentgeek`)
- **Install deps:** `pnpm install` (pnpm v10.30.2 is the configured package manager)
- **No test suite** — there are no tests configured

## Before preparing a release candidate

- Check the conversation's pending messages and outstanding requests before
  choosing a candidate version or starting a build. Reconcile them with the
  current work, companion plugin and roadmap.
- Finish queued fixes and their documentation, screenshots and relevant checks
  as one batch. Check for new messages again immediately before packaging.
- Keep planned roadmap work and physical acceptance checks distinct from the
  current implementation queue; a candidate does not require the entire roadmap.
- Do not mint another RC for each small change. If the queue changes during a
  build, finish processing it before presenting a candidate as ready for testing.
- Candidate preparation does not authorise installing over the live app,
  merging, tagging, publishing or deploying the website.

## Architecture

Main process (`src/main.js`) → preload (`src/client/teleprompter-preload.mjs`, a **pure** `contextBridge` IPC bridge with no DOM work) → renderer (`src/client/teleprompter.js`, where **all** DOM manipulation happens). Keep that split: logic added to the preload breaks the ESM/contextBridge ordering below.

`src/client/editor-bundle.js` is an esbuild IIFE (`window.EditorModule`) built from `src/client/editor.js`. It is **gitignored and regenerated** on `npm start`/`npm run build` — never edit or commit it.

**Data flow for opening a file:** Menu or recent file click → `openScriptFile()` → `readAndConvertMarkdown()` (reads file, converts via showdown, injects `<a name="N">` anchors before H2s, appends scroll padding) → sends HTML over IPC → renderer updates `#md` innerHTML.

**Editor mode:** `Cmd+E` enters edit mode → pauses file watcher → requests raw markdown via IPC → shows CodeMirror editor with opaque dark background. `Cmd+S` saves, `Cmd+Shift+S` saves as. Cancel/toggle returns to preview mode (prompts if dirty). On close with unsaved changes, native dialog offers Save/Don't Save/Cancel.

**File watching:** Main process uses `chokidar` to watch the opened script file and auto-reloads on external changes. Watcher is paused during edit mode to prevent conflicts.

**State persistence:** `app-state.json` at the app's userData folder (`Sightline Prompter`; settings from the old `Electron Teleprompter` folder are copied across once on first launch) stores window geometry, fontSize, opacity, mirrored, and recentFiles. On first launch (no state file), the window centers on screen.

**Startup:** Auto-loads the most recent file from `recentFiles` and restores fontSize, opacity, and mirrored settings via `did-finish-load` IPC messages. Always starts in preview mode.

**Preload considerations:** The preload is an ESM file (`.mjs`). `sandbox: false` is required in webPreferences for ESM preloads to work. `nodeIntegration: false` is set for security. The renderer script uses `type="module"` to guarantee it runs after the preload's `contextBridge` setup.

**CSP:** `style-src 'self' 'unsafe-inline'` is required because CodeMirror injects inline styles.

## Code Style

- ES modules throughout (`.js` and `.mjs` extensions)
- Tab indentation
- ESLint config splits: `node-esm` rules for main process, `browser` rules for `src/client/`
- `src/client/editor-bundle.js` is excluded from ESLint (generated file)
- Requires Node.js >= 22.16.0
- Use `??` (nullish coalescing) instead of `||` for settings where `0` or `false` are valid values (e.g., opacity)
