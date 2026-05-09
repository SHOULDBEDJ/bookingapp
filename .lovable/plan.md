## Shiva Shakti Shamiyana — Build Plan

A booking management PWA with 6 modules, blue gradient design system, and Lovable Cloud backend.

### 1. Foundation
- Enable **Lovable Cloud** (database + storage + auth)
- Blue gradient design system in `src/styles.css` (primary blue, gradient tokens, brand shadow)
- PWA manifest + icons (installable, no service worker — avoids preview issues)
- App shell: side navbar with hamburger, blue gradient header
- 2s animated save overlay component (reusable)

### 2. Auth
- Single login screen with logo, `mykfamily / mykfamily`
- HTML autocomplete attrs so Google offers to save credentials
- Session stored client-side (sessionStorage) + Cloud auth using a fixed shared account
- Login gate around all app routes

### 3. Database (Lovable Cloud)
Tables: `customers`, `bookings`, `booking_photos`, `audio_notes`, `expense_types`, `expenses`, `expense_photos`, `albums`, `album_media`. Storage buckets: `bills`, `expense-photos`, `audio`, `gallery`. Single shared account → permissive RLS for that user.

### 4. Modules
1. **Dashboard** — 4 KPI cards + month calendar with badges, click-date modal listing bookings
2. **Booking** — table/grid toggle, eye/edit/delete, new booking form (auto date/time, customer search by phone/date, multi photo upload from camera or gallery, audio recording with Web Speech transcription), fullscreen photo viewer with download + share
3. **Customer History** — table/grid toggle, search, full detail view, edit/delete
4. **Expense** — table/grid toggle, manage expense types (CRUD), new expense (type, optional booking link, amount, multi audio notes, multi photos), eye/edit/delete
5. **Gallery** — albums CRUD, add media via camera or file picker, upload progress (n of m + %), carousel viewer for images & videos
6. **Settings** — backup (JSON export, optional media), restore (JSON import), delete bookings / expenses / all (optional media)

### 5. Cross-cutting
- All date/time fields prefilled with `now()` and editable
- Confirmation dialogs for every delete
- 2s loading overlay on: save booking, save expense, save expense type
- Mobile-first responsive, touch-friendly tap targets
- Web Speech API for voice-to-text (graceful fallback message on unsupported browsers)

### Technical notes
- TanStack Start routes under `src/routes/_authed/` (dashboard, booking, customers, expense, gallery, settings) + public `/login`
- Server functions for all DB writes via `requireSupabaseAuth`; reads via browser client where possible
- Manifest at `public/manifest.webmanifest` + icons in `public/`; linked from `__root.tsx` head
- Zustand or React context for nav state; TanStack Query for data
- Web Speech API wrapped in a `useSpeechRecognition` hook
- File uploads: parallel with per-file progress via Supabase storage `upload` (track via state map)

### Delivery approach
This is a large scope. I'll build it in this order so you can test as it grows:
1. Foundation + design system + login + nav shell + Cloud schema
2. Booking module (core flow)
3. Customer History
4. Expense + expense types
5. Gallery
6. Dashboard calendar + KPIs (depends on data above)
7. Settings (backup/restore/delete)
8. PWA manifest + final polish

After approval I'll start with steps 1–2 in this turn and continue in follow-ups.
