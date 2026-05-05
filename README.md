# voip — VEP (Virtual Employee Persona)

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

VEP is a real-time voice-to-voice AI assistant ("Beatrice") branded by **Eburon AI**.
It connects to Gemini Live, supports a sidebar chat history, branded document
artifact generation (contracts, invoices, CSVs, slides), an in-chat e-signature
pad, file-upload analysis with anti-hallucination guards, background-task
widgets, and Zapier MCP integration.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set keys in [.env.local](.env.local):
   - `GEMINI_API_KEY` / `VITE_GEMINI_API_KEY` — your Gemini API key
   - `VITE_SUPABASE_URL` — Supabase project URL for global DB/storage
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase browser publishable key
   - `VITE_SUPABASE_STORAGE_BUCKET` — storage bucket, defaults to `vep-global-storage`
   - `VITE_GOOGLE_API_KEY` — shared Google Cloud key (Maps, YouTube, Places, …)
   - `VITE_ZAPIER_MCP_EMBED_ID` — Zapier MCP embed-id
3. Run the app:
   `npm run dev`

## Data and Storage Architecture

- Firebase Auth stays the login source of truth.
- Firebase Realtime Database stays the user-profile/settings source of truth under `users/{firebaseUid}`.
- Supabase stores global app database mirrors such as chat/activity records and knowledge-file indexes.
- Supabase Storage stores uploaded files under `users/{firebaseUid}/...`.
- Google Drive remains a per-user personal storage integration through Google OAuth; those files are not treated as platform-global storage unless the user explicitly routes them into the app.

Run [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL editor before relying on global DB/storage writes. The browser app writes with the publishable key and stores Firebase UIDs in Supabase rows, so production deployments that need private per-user reads should add a server/Edge Function layer or Firebase JWT verification before adding read policies.

View the original AI Studio app: https://ai.studio/apps/ca79bb92-63d8-4532-a139-e0849a089682
