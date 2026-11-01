# ClassVault

> A role-based Learning Management System (LMS) for Instructors and Students, built with modern mobile-first technologies.

---

## 1. Project Overview & Tech Stack

**ClassVault** is a mobile and web application where:

- **Instructors** create courses (with auto-generated join codes), upload lecture materials (PDF, PPT, PPTX up to 80 MB), and grade student exercise submissions.
- **Students** enroll in courses via join codes, browse materials, submit exercises, comment on materials, and track their academic progress through analytics dashboards.

The project is built with the following locked tech stack:

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Expo](https://expo.dev) (latest stable SDK) + [Expo Router](https://docs.expo.dev/router/introduction) (file-based routing) |
| **Language** | TypeScript (strict mode) |
| **Styling** | [NativeWind v4](https://www.nativewind.dev) + [Tailwind CSS 3.4](https://tailwindcss.com) |
| **Backend** | [Supabase](https://supabase.com) (`@supabase/supabase-js` v2) — Postgres database, Row Level Security, and private Storage buckets |
| **Icons** | [lucide-react-native](https://lucide.dev) |
| **Fonts** | Plus Jakarta Sans (headings) and Inter (body text) |

---

## 2. Prerequisites & Step-by-Step Setup

Before you start, make sure you have the following installed on your machine:

- **[Node.js](https://nodejs.org)** — version 18 or 20 LTS recommended (download the LTS installer from the website)
- **[Git](https://git-scm.com/downloads)** — for cloning and version control
- **[Android Studio](https://developer.android.com/studio)** — for the Android Emulator (make sure to install the Android SDK during setup)
- **[Expo Go](https://expo.dev/go)** — install this app on your physical phone if you want to test on a real device
- A **code editor** like [VS Code](https://code.visualstudio.com/)

Once everything above is installed, follow these steps **exactly**:

---

### Step 1: Clone the Repository

Open your terminal (Command Prompt, PowerShell, or VS Code terminal) and run:

```bash
git clone https://github.com/kurtscp/ClassVault.git
```

Then move into the project folder:

```bash
cd ClassVault
```

---

### Step 2: Install Dependencies

Inside the `ClassVault` folder, install all project dependencies by running:

```bash
npm install
```

> **Note:** This may take a few minutes. Wait until it finishes completely before moving on. You should see a `node_modules/` folder appear in the project directory when it's done.

---

### Step 3: Configure Environment Variables

The app needs two secret keys to connect to our Supabase backend. These keys are **never** committed to GitHub — they live in a local `.env` file that is gitignored.

1. In the project root, you will see a file called `.env.example`. **Duplicate** this file and rename the copy to `.env`:

   **On Windows (PowerShell):**
   ```powershell
   Copy-Item .env.example .env
   ```

2. Open the newly created `.env` file in your code editor. It will look like this:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=
   EXPO_PUBLIC_SUPABASE_ANON_KEY=
   ```

3. **Ask Kurt (Team Lead) for the two values** and paste them in after the `=` signs. When filled in, it should look something like:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmn.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Save the file.**

> [!CAUTION]
> **NEVER commit `.env` to Git. NEVER share the keys in group chats, Discord, or screenshots.** The `.gitignore` already protects this file, but double-check by running `git status` — the `.env` file should **not** appear in the list. If it does, something is wrong. Ask Kurt immediately.

---

### Step 4: Boot the App

#### Option A: Run on the Android Emulator

1. Open **Android Studio**.
2. Go to **Device Manager** (the phone icon with the Android logo on the right sidebar).
3. Start (press the play ▶ button) on any emulator device (e.g., "Pixel 7 API 34"). Wait for the emulator to fully boot up and show the Android home screen.
4. Back in your terminal (inside the `ClassVault` folder), run:

   ```bash
   npx expo start -c
   ```

5. Once Metro is running and you see the QR code in the terminal, press **`a`** to open the app on your Android emulator.

#### Option B: Run on a Physical Device (Expo Go)

1. Make sure your phone and computer are on the **same Wi-Fi network**.
2. Run the development server:

   ```bash
   npx expo start -c
   ```

3. Open the **Expo Go** app on your phone and scan the QR code displayed in your terminal.

#### Option C: Run in the Web Browser

1. Run the development server:

   ```bash
   npx expo start -c
   ```

2. Press **`w`** in the terminal to open the app in your default web browser.

---

## 3. Command Cheat Sheet

Here are the commands you will use most often. Run all of these from inside the `ClassVault` project folder.

- **`npx expo start`** — Starts the Metro development server. This is the main command to run the app.
- **`npx expo start -c`** — Starts the development server **with a clean cache**. Use this if the app is acting weird or showing stale data.
- **`npx expo-doctor`** — Diagnoses dependency issues, peer-dependency mismatches, and configuration problems. Run this after installing any new package.
- **`npx tsc --noEmit`** — Runs the TypeScript type checker across the entire project in strict mode. **You must run this before pushing your code.** If it reports errors, fix them before committing.

**While the dev server is running:**
- Press **`w`** → opens the app in your **web browser**
- Press **`a`** → opens the app on your **Android emulator** (must be running)
- **Scan the QR code** with your phone's Expo Go app → opens the app on your **physical device**

---

## 4. Team Roles, Branching & Merging Order

ClassVault is built in **6 sequential phases**. Each phase depends on the one before it. **You do NOT start your phase until the previous phase has been merged into `main`.**


| Order | Phase | Member | Role | Branch Name |
| :---: | :---: | :--- | :--- | :--- |
| 1 | Phase 1 | **Kurt (M1)** | Foundation & Database | `main` (direct) |
| 2 | Phase 2 | **JM (M2)** | Auth & Enrollment | `feat/m2-auth-enrollment` |
| 3 | Phase 3 | **Ching (M3)** | Database, Dashboard & Comments | `feat/m3-dashboard-comments` |
| 4 | Phase 4 | **Chezter (M4)** | Storage, Files & Submissions | `feat/m4-files-submissions` |
| 5 | Phase 5 | **Ali (M5)** | UI Polish, Grading & Analytics | `feat/m5-polish-analytics` |
| 6 | Phase 6 | **Kurt (M1)** | QA & Deployment | `feat/m1-qa-deploy` |

> [!IMPORTANT]
> **Use the exact branch name listed above.** Do not rename it, do not create extra branches, and do not push directly to `main`. Only Kurt (Team Lead) merges into `main`.

---

## 5. The Handoff & PR Process

When you reach the end of your assigned phase, follow this exact workflow:

### Step 1: Auto-Generate Your Handoff Note (Prompt Z3)

You do **not** need to write the handoff note from scratch. Instead:
1. Copy the **Z3 prompt** from `ClassVault_Build_Prompts_2.md`.
2. Feed it into your AI coding assistant session.
3. The AI will inspect the changes you made and auto-generate `docs/handoff/phase-X.md` (where `X` is your phase number, e.g., `phase-2.md`).

### Step 2: Review and Verify Your Phase Deliverables

Before committing anything, you are responsible for cross-checking:
- **The Generated Handoff Note:** Read through `docs/handoff/phase-X.md` to ensure the summary, test instructions, and public interfaces are accurate.
- **The MVP Document (`ClassVault_MVP.md`):** Verify that all acceptance criteria and phase gate requirements for your phase have been met.
- **The Build Prompts:** Double-check that every required feature, screen, service, and hook was actually built and no prompt step was missed.

### Step 3: Commit and Push Your Branch

Save your work to Git and push your feature branch to GitHub:

```bash
git add -A
git commit -m "feat: complete phase X — brief description"
git push origin feat/your-branch-name
```

For example, if you are JM (M2):

```bash
git add -A
git commit -m "feat: complete phase 2 — auth service, sign-in/up screens, enrollment"
git push origin feat/m2-auth-enrollment
```

### Step 4: Open a Pull Request on GitHub

1. Go to [https://github.com/kurtscp/ClassVault](https://github.com/kurtscp/ClassVault).
2. You will see a yellow banner stating your branch was recently pushed. Click **"Compare & pull request"**.
3. Confirm that the PR target base branch is **`main`**.
4. In the PR description, summarize what was built and reference your `docs/handoff/phase-X.md` file.
5. Click **"Create pull request"**.

### Step 5: Wait for Review

**Kurt (Team Lead)** will review your PR and either:
- ✅ **Approve and merge** — your code is now officially merged into `main`.
- 🔄 **Request changes** — address the feedback, commit, and push again. The existing PR will update automatically.

### Step 6: Next Person Starts

Once Kurt merges your PR into `main`, notify the next person in line. They will run:

```bash
git checkout main
git pull
git checkout -b feat/your-branch-name
```

For example, after JM's Phase 2 is merged into `main`, Ching (M3) runs:

```bash
git checkout main
git pull
git checkout -b feat/m3-dashboard-comments
```

Ching will now have all merged work from Phase 1 and Phase 2, ready to start Phase 3.

---

## 6. AI Guardrails

> [!WARNING]
> **When using AI coding assistants (ChatGPT, Claude, Gemini, Copilot, etc.), you MUST follow these rules:**
>
> 1. **Paste the entire `AI_RULES.md` file** at the start of every new AI session. This file contains all the project rules, constraints, and brand guidelines that the AI must follow.
> 2. **After `AI_RULES.md`, paste your specific Phase prompts** from the build-prompts document Kurt shared.
> 3. **Never let the AI:**
>    - Change configuration files (`tailwind.config.js`, `babel.config.js`, `metro.config.js`, `package.json`, `app.json`)
>    - Install, remove, or upgrade packages on its own
>    - Edit files **outside your assigned phase** (check `OWNERS.md` for boundaries)
>    - Use hardcoded hex colors, `fontWeight` styles, `StyleSheet.create`, or import `Text` from `react-native`
>    - Disable Row Level Security or use the Supabase `service_role` key
> 4. If the AI suggests any of the above, **reject it and re-read `AI_RULES.md`**.

---

## Folder Structure

```
ClassVault/
├── app/                      # Expo Router screens and layouts
├── assets/
│   └── brand/                # Official ClassVault logos, icons, and brand assets
├── docs/
│   └── handoff/              # Phase handoff notes (one per phase)
├── src/
│   ├── components/
│   │   └── ui/               # Shared UI primitives (Text, Button, Card, Input, etc.)
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Core utilities (Supabase client, env, errors, formatters)
│   ├── services/             # Typed Supabase service layer (all DB calls go here)
│   └── types/                # TypeScript type definitions (database.ts, domain.ts)
├── supabase/
│   └── migrations/           # SQL migration files
├── .env.example              # Template for environment variables (safe to commit)
├── .env                      # YOUR local secrets (NEVER commit this)
├── AI_RULES.md               # Mandatory rules for AI coding assistants
├── OWNERS.md                 # Who owns which files — check before editing
├── tailwind.config.js        # Locked brand token theme — do not modify
└── README.md                 # You are here
```

---

## Need Help?

- **Setup issues?** → Ask **Kurt** in the group chat.
- **Git conflicts?** → Do NOT force-push. Ask Kurt.
- **Not sure if you can edit a file?** → Check `OWNERS.md`. If it's not yours, ask Kurt.
- **AI doing something weird?** → Re-paste `AI_RULES.md` and tell it to follow the rules.

Happy building! 🏗️
