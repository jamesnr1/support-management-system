# Support Management System – AI Handover

This document captures the structure, expectations, and recurring gotchas in this codebase so any AI agent (or human) can onboard quickly without repeating past mistakes.

---

## 1. System Overview
- **Frontend**: React app (`frontend/src/`), state managed with `@tanstack/react-query`, styling via custom CSS variables in `App.css`.
- **Backend**: FastAPI service (`backend/server.py`) backed by Supabase utilities in `backend/database.py`. Roster data is persisted to `backend/roster_data.json`.
- **Primary domains**:
  - Roster (current live week).
  - Planner (future template weeks `planner_next`, `planner_after`).
  - Profiles (worker management UI).
  - Shifts (worker-centric view + Telegram messaging).
  - Tracking (hours tracking CSV import/export).

---

## 2. Roster & Planner Data Flow
1. `RosteringSystem` loads `roster` + selected planner (`planner_next` or `planner_after`).
2. Participants render via `ParticipantSchedule`, editing invokes `handleRosterUpdate` to merge changes into the active dataset.
3. Planner dropdown toggles the backend endpoint and triggers a refetch.
4. “Copy” button (Planner tab) deep-copies the current roster into the selected planner week.
5. Automatic transition (`performWeekTransition`) promotes planner → roster at Monday 3:00 AM (14-day cadence).
6. CSV exports call `GET /roster/{activeTab}` directly to ensure data freshness.

**Where to edit future rosters**: use the Planner tab with the dropdown (`Next`, `After`). Data is saved back to `backend/roster_data.json` under `planner_next` or `planner_after`.

---

## 3. Styling & UX Standards
- Theme variables live in `frontend/src/App.css`. Always use `var(--*)` colors (no hardcoded hex).
- Card components follow the same pattern: 12px radius, shaded header bar (`var(--hover-bg)`), 12px body padding, `box-shadow: 0 2px 4px var(--shadow)`.
- Buttons use pill radius (25px) and the `var(--accent)` color. Disable state lowers opacity only.
- Calendar/participant/worker cards list items as flat text (no nested boxes) with 14px font.
- Availability: “Unavailable” label on its own line; dates follow on the next line.
- Planner dropdown labels are `Next`, `After` with dates maintained inside parentheses.

**Consistency checks before merging**
- Headers align (font-size 18px, terracotta color) across cards.
- Badges only appear on worker cards (outlined style).
- No stray `App_old.css`, `WorkerCard.jsx.original`, etc. (already removed).

---

## 4. Backend Expectations
- `backend/server.py` is the single source of truth. Avoid copying fixtures into new files unless the user requests.
- `ROSTER_DATA` must retain `roster`, `planner_next`, and `planner_after`. When updating, call `save_roster_data()` to persist.
- Keep logs, PID files, and backups out of version control (`backend/server.log`, `*.pid`, etc.). They are now removed—add to `.gitignore` if they reappear.

---

## 5. Working Guidelines
1. **File edits**: Repo policy allows one file change per request unless the user explicitly permits more.
2. **No new files** unless the user asks (this document was requested explicitly).
3. **Ask before assumptions**: The user is particular about layout, data integrity, and naming (e.g., prefer worker preferred names).
4. **After big refactors**, re-run `npm/yarn build` and backend startup to confirm nothing broke.
5. **Archive policy**: Non-essential docs/data belong in `archive/docs/` or `archive/data/`. Root stays clean.
6. **Performance**: Avoid repeated API calls inside components. Fetch once via React Query, memoize where possible.

---

## 6. Frequent Pitfalls
- Forgetting to merge participant data before POST. Always merge into the full dataset (`handleRosterUpdate`).
- Planner copy and week pattern toggles must save to the correct planner endpoint or edits vanish.
- Removing badges or altering card layout without matching the agreed “shaded header + flat body” style.
- Hardcoding dates/times instead of using helpers (`formatDateRange`, `formatTimeRange`).
- Leaving stale build logs, PID files, or backups—these bloated the repo previously.

---

## 7. Quick Runbook
| Task | Commands/Notes |
| --- | --- |
| Install frontend | `cd frontend && npm install` |
| Start frontend | `npm start` |
| Build frontend | `npm run build` |
| Backend setup | Create venv, install `pip install -r backend/requirements.txt` |
| Start backend | `uvicorn backend.server:app --reload --port 8001` |
| Run targeted tests | `python backend_test.py` or `npm test` (if configured) |

---

## 8. Contact & Escalation Notes
- If roster data corrupts, restore from `backend/roster_data.json` backups (now archived) or ask which snapshot to use.
- For Google Calendar integration, credentials live in `backend/calendar_credentials.json`; avoid checking new secrets into git.
- Telegram messaging relies on workers with `telegram` fields set; UI filters accordingly.

---

This file should stay up to date. When workflows change, append new sections here so future contributors—and AI agents—don’t repeat the cleanup cycle.

