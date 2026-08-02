# Apex Vision

Interactive museum web app for the **Apex Vision** FLL robotics project: a digital catalog of archaeological artifacts with **3D model viewing**, AI-powered artifact analysis, and an assistant chatbot.

## Features

- **3D artifact models** — interactive viewers built with `three.js` / `react-three-fiber` (OBJ + 3D scanning support).
- **AI assistant "Archaeologist"** — chat with a Gemini-powered bot that helps attribute artifacts, explains historical context, material and technique.
- **AI artifact classification** — image-based analysis via Gemini in the dashboard editor.
- **Artifact gallery** — public artifacts stored in Supabase.
- **Auth** — staff/museum code protected routes.
- **Uploads** — artifact image upload through Supabase storage.

## Tech Stack

React · TypeScript · Vite · three.js / react-three-fiber · Supabase (auth, DB, storage) · Gemini API · Tailwind

## Setup

```bash
npm install
npm run dev
```

Create `.env` from `.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=
VITE_MUSEUM_STAFF_CODE=MUSEUM-2026
```

## Notes

- Gemini API key is read from `VITE_GEMINI_API_KEY` (never commit a real key — see `.env.example`).
- 3D scanning results directory and local storage are expected at the FLL workstation paths defined in `vite.config.ts`.
