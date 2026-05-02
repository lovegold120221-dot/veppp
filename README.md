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
   - `VITE_GOOGLE_API_KEY` — shared Google Cloud key (Maps, YouTube, Places, …)
   - `VITE_ZAPIER_MCP_EMBED_ID` — Zapier MCP embed-id
3. Run the app:
   `npm run dev`

View the original AI Studio app: https://ai.studio/apps/ca79bb92-63d8-4532-a139-e0849a089682
