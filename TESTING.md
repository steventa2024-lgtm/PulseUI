# Testing PulseUI by hand

A checklist for trying PulseUI on your own machine. Automated checks
(`bun run check`, `bun run test:e2e`) cover the same pipeline with the mock
provider; this file is for the things a person should look at.

## 1. Set up (about 5 minutes)

Requirements: **Bun** (or Node.js 22.13+), **git**, and internet access for
`npm install` inside generated projects. macOS and Linux are tested; on Windows
use WSL.

```bash
git clone https://github.com/steventa2024-lgtm/PulseUI.git
cd PulseUI
git checkout claude/gracious-ramanujan-niw7vp
bun install
cp .env.example .env.local
```

Pick **one** way to give Pulse a model, in `.env.local`:

| Option                  | What to set                                                            |
| ----------------------- | ---------------------------------------------------------------------- |
| Google Gemini (easiest) | `GEMINI_API_KEY=...` (free key at https://aistudio.google.com/apikey)  |
| Ollama (local, free)    | `ollama pull qwen2.5-coder:7b`, then `LOCAL_AI_MODEL=qwen2.5-coder:7b` |
| OpenRouter              | `OPENROUTER_API_KEY=...` and `OPENROUTER_MODEL=...`                    |
| No model (UI tour only) | `AI_PROVIDER=mock`: canned edits, real install/build/preview           |

Then:

```bash
bun run dev        # open http://localhost:3000
```

Data lives in `~/.pulseui`. To start completely fresh later, stop the server
and delete that folder.

> Templates don't need a model. Creating a project from a template copies a
> working app, installs its dependencies and boots it. Only chatting with
> Pulse uses the model.

## 2. Templates (15)

Open **Templates** in the sidebar, then click a card → **Use template**. The
first one takes about 30–60 s while `npm install` runs; watch the activity
feed. When the preview shows the app, test the items below **inside the
preview**. Most templates save to `localStorage`, so **reload the preview** to
confirm data persists.

| Template              | What to try                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Analytics Dashboard   | Switch the date range buttons; the traffic chart updates                                                            |
| AI Chat Interface     | Click a suggestion chip, send a message (a demo reply, no real AI), **New chat**, delete a chat, reload             |
| E-commerce Store      | Add items, change quantities in the cart, **Checkout** → fill details → order confirmation; cart survives reload    |
| Real Estate Site      | Filter by city, max price, beds; heart a listing, reload, it stays saved; send the contact form                     |
| Twitch Dashboard      | **Go live** / **End stream**, send chat messages, watch the viewer chart                                            |
| SaaS Dashboard        | Collapse the sidebar, switch nav items, filter customers                                                            |
| Portfolio             | Scroll sections, links, responsive layout on a narrow window                                                        |
| Admin Dashboard       | Search/filter users, change a role, **Invite user**, reload                                                         |
| Landing Page          | Monthly/yearly pricing toggle, CTA scrolls to the signup form, submit it                                            |
| Kanban Task Board     | Add a card, edit it (priority, description), **drag it between columns**, delete one, reload                        |
| Small Business CRM    | Add a contact, change its pipeline stage, filter by stage, KPIs update, delete, reload                              |
| Restaurant & Ordering | Category tabs, diet filters (vegan, etc.), add to cart, pickup vs delivery, place order                             |
| Appointment Booking   | Pick a service → staff → day (Sun/Mon closed) → time (taken slots disabled) → confirm; cancel it in "Your bookings" |
| Fitness Tracker       | Log a workout, change the weekly goal, check the chart, streak and history update, reload                           |
| Budget Tracker        | Add an expense/income, switch months, edit a category budget, donut updates, **Export CSV** downloads a file        |

Also check, for any template:

- **Code** tab shows the real files; edit text in `src/App.tsx`, save, and the preview updates.
- **History** tab lists the "Initial project from the … template" checkpoint.
- Ask Pulse for a change (needs a model), e.g. _"Add a dark/light theme toggle in the header"_.

## 3. Building from a prompt

1. Home page → type _"A habit tracker with daily check-ins and a weekly streak chart"_ → send.
2. Watch the activity feed: plan, file writes, `install`, `typecheck`, `build`, preview. Nothing should claim success if a step failed. A failed build shows the real error and Pulse tries to repair it, up to 3 times.
3. Send a follow-up, e.g. _"Make the header sticky and add a settings page"_. It should edit only the relevant files.
4. **Plan mode** (toggle in the composer) answers with a plan and changes no files.
5. **Stop** during a run cancels it.

## 4. The rest of the app

- **History**: open a version and look at its diff, then **Restore** it. The files and preview roll back, and a new checkpoint is made, so nothing is lost.
- **Deploy** tab → **Publish** → **Open site** serves the production build (local static hosting).
- **Import from GitHub** (composer): paste the URL of a small public React/Vite repo. It is cloned, detected, installed and previewed.
- **Projects / Search**: the new projects appear and can be renamed or deleted.
- **Chat with AI** (top right) is general Q&A with your model and has no project access.
- **Settings → Profile**: set your name (the avatar initial changes) and desktop editor. **Open in Cursor / VS Code** then opens the project folder.
- **Connections**: shows which credentials are configured. Nothing is faked.
- **Upgrade to Pro** shows plan info only; there is no billing.
- **Mobile**: narrow the window to phone width. The sidebar collapses and the builder switches to tabs.
- **Restart** the server (`Ctrl+C`, `bun run dev`). Projects, chat history and versions are still there.

## 5. Known limits worth knowing before you test

- Agent quality depends on the model. The pipeline was verified end to end with the mock provider; small local models (< 7B) often produce weak edits.
- Previews run on ports 4100–4999 on `localhost`. If PulseUI runs on another machine, those ports must be reachable (see `PREVIEW_PUBLIC_HOST`).
- Deploy is local static hosting only (no Vercel/Netlify yet).
- No login or multi-user.

## Reporting a problem

Useful details are:

- what you clicked
- the activity-feed error, if any
- the preview **Logs** panel
- the terminal output from `bun run dev`
