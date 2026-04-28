# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

- **`artifacts/scribe`** — *Scribe — Writer*. An Expo (React Native) Android-first writing app inspired by Writer Lite + Pure Writer. Distraction-free Markdown editor with:
  - Multiple notes organized in folders (in-app vault, persisted via AsyncStorage)
  - Customizable shortcut bar above the keyboard (insert / wrap / paired chars; smart-Enter escapes a closing pair; auto-pair / skip-over close char)
  - Right-edge swipe opens a Files & Pinned side panel (file tree, long-press for actions)
  - Long-press a file to: open in editor, open in a draggable resizable floating window, pin to top half / bottom half of the side panel, or delete
  - Left-edge swipe (or menu button) opens a drawer with theme picker, stats, theme editor, shortcut editor, and floating-window controls
  - 5 built-in themes (Paper, Midnight, Sepia, Typewriter, Focus) plus a full theme editor — colors, font family, font size, line height, letter spacing, paragraph spacing, padding, max width
  - Zen mode (eye icon) hides chrome for full focus
  - Local-only: no backend, no network calls; all state is on-device

  Routes: `/` (editor), `/themes`, `/theme-edit`, `/shortcuts`, `/about`.
  Key contexts: `ThemeContext`, `NotesContext`, `ShortcutsContext`, `PanelsContext`.

- **`artifacts/api-server`** — Express API server (currently unused by Scribe).
- **`artifacts/mockup-sandbox`** — Vite component preview server.
