# Repository Guidelines

## Project Structure & Module Organization
This is a Vite + React + TypeScript voice assistant app. `src/main.tsx` mounts `src/App.tsx`; most UI lives in `src/components/`, with mobile screens, voice controls, artifact previews, and admin panels split by component. Component CSS is under `src/components/styles/`. Shared logic belongs in `src/lib/`, including audio, Firebase, memory, personality, API helpers, and utility modules. Firebase entry points are in `src/firebase.ts` and `src/lib/firebase/`. Static assets live in `public/` and design/reference images in `ui/`. `admin/index.html` is a second build entry, and Firebase rules/config files sit at the repository root.

## Build, Test, and Development Commands
- `npm install` installs dependencies from `package-lock.json`.
- `npm run dev` starts Vite on `0.0.0.0:3000` for local and network testing.
- `npm run build` creates the production `dist/` bundle for both main and admin entries.
- `npm run preview` serves the built app locally.
- `npm run lint` runs `tsc --noEmit`; treat this as the required type-check gate.
- `npm run clean` removes `dist/`.

## Coding Style & Naming Conventions
Use TypeScript/TSX for new app code. Follow the existing style in nearby files: two-space indentation, React function components, and explicit types for props or shared data. Name components in `PascalCase`, hooks as `useSomething`, utilities in `camelCase`, and CSS files after the component or screen they style. Prefer small modules in `src/lib/` over growing `App.tsx`. The `@` alias resolves to the repo root.

## Testing Guidelines
No dedicated `npm test` script is currently wired. Before submitting changes, run `npm run lint` and `npm run build`. For new core logic, add Vitest tests next to the module as `*.test.ts` or `*.test.tsx` and run them with `npx vitest run`. Mock browser audio, Firebase, Gemini, and network APIs instead of calling live services in tests.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commit-style prefixes such as `feat:` and `fix:`. Keep messages imperative and specific, for example `fix: prevent duplicate live audio on camera open`. PRs should include a short summary, validation commands run, linked issue or task, screenshots for UI changes, and notes for any Firebase rules, env vars, or API behavior changes.

## Git & Shipping Workflows
This project can use the following gstack skills for git operations and deployment. Invoke them proactively when appropriate:
- `/ship` — prepare, review, bump version, and open a PR. Use when code is ready to push.
- `/land-and-deploy` — merge a PR, wait for CI/deploy, and verify production health via canary checks. Use after a PR is approved.
- `/review` — pre-landing PR review focusing on SQL safety, LLM trust boundaries, side effects, and structural issues.
- `/canary` — post-deploy monitoring for console errors and performance regressions.
- `/setup-deploy` — detect and record the deployment platform and health-check endpoints into `AGENTS.md`.
- `/benchmark` — track page load times, Core Web Vitals, and bundle size trends.
- `/qa` or `/qa-only` — run QA testing against the built or live site; `/qa` also fixes bugs.
- `/browse` — open a headless browser to test flows, take screenshots, and verify deployments.
- `/screenshot` — capture the app or a specific URL with native OS tools.
- `/careful` — enable safety guardrails around destructive commands (`rm -rf`, `git reset --hard`, etc.).
- `/freeze <path>` — restrict file edits to a directory to avoid accidental changes elsewhere.
- `/unfreeze` — remove the edit freeze.
- `/guard` — enable both `/careful` and `/freeze` for maximum safety.
- `/document-release` — sync README/CHANGELOG/AGENTS.md after a PR ships.

## Security & Configuration Tips
Keep real secrets out of committed files. Configure local keys in `.env.local` using the README variables such as `GEMINI_API_KEY`, `VITE_GEMINI_API_KEY`, `VITE_GOOGLE_API_KEY`, and `VITE_ZAPIER_MCP_EMBED_ID`. Do not print secrets in logs, and review Firebase rule changes together with any database or auth code changes.
