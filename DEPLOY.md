# AT Development Tracker — Deployment Guide

## What's In This Package

```
at-tracker/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx                  ← Router: / = tracker, /feedback = clinic form
│   ├── ATDevelopmentTracker.jsx   ← Main app (login, baseline, LOs, diary, gates)
│   ├── ClinicFeedback.jsx         ← Participant feedback form + review dashboard
│   └── sheetsApi.js               ← Google Sheets API helper
├── index.html
├── package.json
├── vite.config.js
├── vercel.json                    ← SPA routing for Vercel
└── .gitignore
```

## Routes

| URL | What it shows |
|-----|---------------|
| `your-app.vercel.app/` | Main tracker (login required) |
| `your-app.vercel.app/feedback` | Clinic feedback form (no login — share via QR) |

---

## Step 1: Set Up Google Sheet (your database)

1. Upload `AT_Development_Tracker_DataSource.xlsx` to Google Drive
2. Right-click → **Open with → Google Sheets**
3. Share with Chris, Gates, and Mike (Editor access)

## Step 2: Deploy Google Apps Script (your API)

1. With the Sheet open → **Extensions → Apps Script**
2. Delete existing code, paste contents of `AT_AppsScript.js`
3. Click **Save**
4. Click **Run → testSetup** to verify (authorize when prompted)
5. Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy** and **copy the Web App URL**

The URL looks like:
```
https://script.google.com/macros/s/AKfycbw.../exec
```

## Step 3: Configure the App

Option A — Environment variable (recommended):
Create a `.env.local` file in the project root:
```
VITE_SHEETS_API_URL=https://script.google.com/macros/s/YOUR_ID/exec
```

Option B — Direct edit:
Open `src/sheetsApi.js` and replace `YOUR_APPS_SCRIPT_URL_HERE` with your URL.

## Step 4: Push to GitHub

```bash
cd at-tracker
git init
git add .
git commit -m "AT Development Tracker v1"
git remote add origin https://github.com/YOUR_USERNAME/at-tracker.git
git push -u origin main
```

## Step 5: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New → Project**
3. Import your `at-tracker` repository
4. If using env variable, add it:
   - **Settings → Environment Variables**
   - Key: `VITE_SHEETS_API_URL`
   - Value: your Apps Script URL
5. Click **Deploy**
6. Done — your app is live at `your-project.vercel.app`

## Step 6: Share with Mentors

**Main tracker:**
```
https://your-project.vercel.app
```
Mentors log in with their PIN and see only the tabs you've rolled out.

**Clinic feedback form (for participants):**
```
https://your-project.vercel.app/feedback
```
No login required. Share this URL or generate a QR code for clinic participants.

---

## Rollout Control

To change which tabs mentors see, edit `src/ATDevelopmentTracker.jsx` and find:

```javascript
const MENTOR_VISIBLE_TABS = ["baseline", "diary"];
```

Change to any combination:
```javascript
const MENTOR_VISIBLE_TABS = ["baseline"];                        // baseline only
const MENTOR_VISIBLE_TABS = ["baseline", "diary"];               // + diary
const MENTOR_VISIBLE_TABS = ["baseline", "los"];                 // + learning objectives
const MENTOR_VISIBLE_TABS = ["baseline", "los", "diary"];        // + both
const MENTOR_VISIBLE_TABS = ["baseline", "los", "diary", "gates"]; // full access
```

Commit and push — Vercel auto-deploys.

## User PINs

Default PINs (change before deploying):

| User | PIN | Role |
|------|-----|------|
| Mark | 1234 | Candidate (sees all tabs) |
| Chris | 2345 | Mentor |
| Gates | 3456 | Mentor |
| Mike | 4567 | Mentor |

To change PINs, edit the `USERS` object in `src/ATDevelopmentTracker.jsx`.

---

## Architecture

```
┌─────────────────────────┐
│  Vercel (free)          │  ← Hosts the React app
│  your-app.vercel.app    │
│                         │
│  /           → Tracker  │  ← Login required
│  /feedback   → Feedback │  ← No login (QR code)
└──────────┬──────────────┘
           │ API calls
           ▼
┌─────────────────────────┐
│  Google Apps Script      │  ← Read/write API
│  (Web App deployment)   │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Google Sheet            │  ← Data lives here
│  (shared with team)     │  ← Mentors can also edit directly
│                         │
│  Tab: LearningObjectives│
│  Tab: DiaryEntries      │
│  Tab: GateStatus        │
│  Tab: Reference         │
└─────────────────────────┘
```

## Troubleshooting

**App loads but data doesn't save** — Check that `VITE_SHEETS_API_URL` is set correctly. Open browser console for errors.

**CORS errors** — Redeploy the Apps Script as a new deployment (Deploy → New deployment, not Manage deployments).

**Login doesn't work** — PINs are in the `USERS` object in `ATDevelopmentTracker.jsx`. They're plain text — this is a lightweight access control, not enterprise security.

**Feedback form shows at / instead of /feedback** — Make sure `vercel.json` has the SPA rewrite rule.
