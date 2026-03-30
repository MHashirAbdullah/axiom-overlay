# Axiom Overlay

Real-time meeting and interview assistant — an Electron desktop app that sits invisibly over your screen during calls, transcribes your audio live, and streams context-aware AI suggestions powered by your own meeting notes, CV, and past session history.

> Part of the [Axiom](https://github.com/axiom-transcriber) suite. Works alongside the web dashboard and Chrome extension.

---

## What it does

- **Invisible during screen sharing** — uses macOS `setContentProtection` so the overlay is never visible to Zoom, Google Meet, or any screen recorder
- **Real-time transcription** — mic audio is chunked every 4 seconds and sent to Groq Whisper (~$0.02/hr)
- **Live AI suggestions** — each transcript chunk triggers a pgvector RAG search against your context docs and past round transcripts, then streams a Groq LLM response directly into the suggestions pane
- **Multi-round context** — Round 3 of an interview automatically knows what happened in Rounds 1 and 2
- **Stays on top** — floats above all windows including fullscreen apps, hidden from Mission Control and Cmd+Tab

---

## Requirements

- macOS (primary; Windows lacks `setContentProtection`)
- Node.js 18+
- A running [meeting-scribe-web](https://github.com/axiom-transcriber/axiom-transcriber) instance (local or deployed)
- A [Groq API key](https://console.groq.com) (free tier is enough)

---

## Setup

```bash
git clone https://github.com/axiom-transcriber/axiom-overlay
cd axiom-overlay
npm install
cp .env.example .env
```

Fill in `.env`:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321        # or your prod Supabase URL
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:3000           # or your prod API URL
VITE_GROQ_API_KEY=gsk_your_key
```

---

## Running

```bash
# Start the Next.js backend first (in meeting-scribe-web/)
npm run dev

# Then in this directory
npm run dev
```

Electron launches alongside the Vite dev server. DevTools open detached.

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+Shift+Space` | Toggle show / hide overlay |
| `Cmd+↑ ↓ ← →` | Move overlay position (20px steps) |

---

## Usage flow

1. **Sign in** with your Axiom account (same credentials as the web dashboard)
2. **Select a workspace** — pick from your active meetings list, or paste an `axm_xxxxxxxx` token manually
3. **Review context** — Pre-Session screen shows loaded docs (CV, JD, notes) and past round summaries
4. **Start Live Session** — overlay goes live; transcript builds on the left, AI suggestions stream on the right
5. **End** — full transcript is saved back to the server; summary and embeddings are generated automatically for future rounds

---

## Building a distributable

```bash
npm run dist
# Outputs: dist-electron/Axiom Overlay.dmg
```

---

## Project structure

```
axiom-overlay/
├── electron/
│   ├── main.ts          # Window creation, shortcuts, IPC handlers
│   └── preload.ts       # contextBridge — safe renderer ↔ main bridge
├── src/
│   ├── App.tsx          # Auth gate + view router
│   ├── styles.css       # Dark glass UI
│   ├── views/
│   │   ├── Login.tsx         # Supabase email/password auth
│   │   ├── MeetingSelect.tsx # Workspace picker + manual token entry
│   │   ├── PreSession.tsx    # Context preview before going live
│   │   └── LiveSession.tsx   # Audio capture → Groq Whisper → SSE suggestions
│   └── lib/
│       ├── supabase.ts  # Supabase client (auth)
│       └── api.ts       # All Axiom API calls
├── .env.example
├── vite.config.ts
├── tsconfig.json
└── tsconfig.electron.json
```

---

## Cost

~$0.02–$0.03 per hour of live session (Groq Whisper). LLM suggestions fall within Groq's free tier for most users.

---

## Related repos

- [axiom-transcriber](https://github.com/axiom-transcriber/axiom-transcriber) — Next.js web app, API, Chrome extension, bot
