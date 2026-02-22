# App Plan (Working Doc)

## 0. Current Snapshot

- **App name (working):** TBD
- **One-liner:** A web app where music lovers follow artists and get a
  nightly AI-curated set of relevant news, new releases, and nearby
  concerts.
- **Primary users:** Music lovers (initially: you).
- **Core problem:** There's no single, low-effort place to stay on top
  of updates (news, releases, tour dates) for many favorite
  artists---especially concerts near you.
- **Proposed solution:** Users save artists they care about; a nightly
  job searches the web + structured sources for relevant items,
  normalizes them into structured listings, stores them, and presents
  them as tabs + calendar-style views.
- **Success looks like:** You can open the app any day and immediately
  see what's new and what's upcoming without manually searching.

---

## 1. Goals and Non-Goals

### Goals

- Maintain followed artists.
- Nightly web discovery of news, releases, and nearby concerts.
- Structured database for feed, releases list, and calendar-style
  events.
- Clean UI.
- Test-first, atomic implementation.

### Non-Goals (v1)

- Social features.
- In-app playback.
- Real-time monitoring.

---

## 2. MVP Scope

### Must-have

- Google OAuth
- Location (city/region/country + 50km default radius)
- Nightly ingestion job
- Tabs: News / Releases / Events
- Events grouped by date
- Persistent artist filter

---

## 3. Architecture

- React Router (framework mode)
- Tailwind + shadcn/ui
- TanStack
- SQLite + Drizzle
- Fly.io hosting
- Hybrid ingestion (OpenAI + structured event provider)

---

## 4. AI Strategy

- Separate prompts per type (NEWS, RELEASE, EVENT fallback)
- 30-day backfill on first run
- Incremental since-last-run thereafter
- Strict JSON extraction contract
- Global MIN_CONFIDENCE setting
- Dedupe via hash(type + artistId + normalizedUrl)

---

## 5. Implementation Phases

### Phase 0 --- Setup

- Scaffold app
- Tailwind
- Vitest + Testing Library + MSW
- CI

### Phase 1 --- Data Layer

- Schema + migrations
- Repositories
- Dedupe tests

### Phase 2 --- Auth

- Google OAuth
- User persistence
- Protected routes

### Phase 3 --- APIs

- Follows
- Feed
- Upcoming

### Phase 4 --- UI

- Tabs
- Persistent filter
- Artists page
- Settings page

### Phase 5 --- Ingestion

- Orchestrator
- OpenAI extraction
- Event provider
- Time windows
- Caps

### Phase 6 --- Deploy

- Fly.io volume
- Nightly cron
- Observability

---

## 6. Cursor Rules (Summary)

- Atomic slices only.
- Tests first.
- No real network calls in tests.
- External services behind interfaces.
- Schema changes require migration + tests.
