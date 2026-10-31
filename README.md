# ClassVault

ClassVault is a role-based Learning Management System (LMS) built with React Native (Expo) and Supabase. It provides a secure, streamlined platform where instructors organize coursework and grade student submissions, while students enroll in courses, browse lecture materials, submit exercises, engage in discussion, and track their academic progress.

---

## Features Overview

- **Enrollment with Join Codes:** Instructors create courses that automatically generate unique 6-character alphanumeric join codes. Students enroll instantly using these codes and can leave courses at any time.
- **Course Material & File Handling:** Instructors upload presentation and exercise files (PDF, PPT, PPTX) up to 80 MB per file, with single and batch upload workflows. Files are protected in private buckets and served via short-lived signed URLs. Safe two-step deletion ensures zero orphaned files in storage.
- **Student Exercise Submissions:** Students submit exercise files directly against assigned exercises. Submissions are strictly isolated per student.
- **Grading Workflow:** Instructors review student submissions and record numerical grades (0–100) with timestamped records.
- **Commenting on Materials:** Real-time, threaded commenting on course materials for academic discussion. All timestamps are displayed in **24-hour military time in Philippine Time (PHT, UTC+8)**.
- **Analytics Dashboards:** Role-specific analytics providing instructors with submission and engagement metrics, and students with course progress tracking.

---

## Tech Stack

- **Framework:** [Expo](https://expo.dev) (SDK 52+) with [Expo Router](https://docs.expo.dev/router/introduction) (file-based routing) and TypeScript strict mode.
- **Styling:** [NativeWind v4](https://www.nativewind.dev) + [Tailwind CSS 3.4](https://tailwindcss.com) locked to ClassVault tokens (zero arbitrary hex or ad-hoc weights).
- **Backend:** [Supabase](https://supabase.com) (`@supabase/supabase-js` v2) with Postgres, Row Level Security (RLS) on all tables, and private Storage buckets (`lms-files`, `submission-files`).
- **Icons:** [lucide-react-native](https://lucide.dev).
- **Typography:** Plus Jakarta Sans (Display and Headings) and Inter (Body and UI text).

---

## Prerequisites

- [Node.js](https://nodejs.org) (v18 or v20 LTS recommended)
- [npm](https://www.npmjs.com) (or compatible package manager)
- [Expo Go](https://expo.dev/go) on a physical mobile device, or Android Studio emulator / iOS simulator / modern web browser
- A [Supabase](https://supabase.com) project with `supabase/migrations/0001_init.sql` executed in the SQL Editor

---

## Setup & Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kurtscp/ClassVault.git
   cd ClassVault
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy the example environment file and provide your public Supabase credentials:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```
   *(Note: `.env` is gitignored and must never be committed).*

4. **Start the development server:**
   ```bash
   npx expo start -c
   ```
   - Press `w` to open in your web browser.
   - Press `a` to open in a connected Android device or emulator.
   - Scan the terminal QR code using Expo Go on your mobile device.

---

## Available Scripts

- `npx expo start`: Starts the Metro development server.
- `npx expo start -c`: Starts the development server with a clean cache.
- `npx expo-doctor`: Diagnoses dependencies, peer-dependency mismatches, and configuration issues.
- `npx tsc --noEmit`: Typechecks the entire project in strict mode.

---

## Folder Structure

```
classvault/
├── app/                  # Expo Router file-based screens and layouts
├── assets/
│   └── brand/            # Official ClassVault brand assets (SVGs, marks, icons)
├── docs/
│   └── handoff/          # Sequential phase hand-off notes for team members
├── src/
│   ├── components/
│   │   └── ui/           # Shared ClassVault design primitives (Text, Button, Card, etc.)
│   ├── lib/              # Core utilities (env, supabase client, errors, formatters)
│   ├── services/         # Typed Supabase service layer
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript definitions (database.ts, domain.ts)
├── supabase/
│   └── migrations/       # SQL migration files (0001_init.sql)
├── tailwind.config.js    # Locked ClassVault token theme
├── AI_RULES.md           # Verbatim rules for AI coding assistants
├── OWNERS.md             # Codebase ownership and editing permissions
└── README.md
```

---

## Branching & Collaboration Rules

To avoid cross-member conflicts and regressions:
1. `main` is protected by convention. No direct commits to `main`.
2. Each team member develops on a feature branch named:
   ```
   feat/<member>-<topic>
   ```
   *Examples:* `feat/m2-auth-service`, `feat/m3-course-dashboard`, `feat/m4-file-upload`.
3. Open a Pull Request targeting `main`. All PRs must be reviewed and merged by the Team Leader (**Member 1**).
4. Strictly observe the [OWNERS.md](file:///c:/Users/Kurt%20Cruz/Documents/CODES/VSCODE/PROJECTS/CLASSVAULT/classvault/OWNERS.md) boundary. Members only edit files they own; changes to shared files (`tailwind.config.js`, `package.json`, `src/components/ui/*`, `src/lib/*`, `supabase/*`) are requested through the leader.

---

## Rules for AI Assistants

All AI coding assistants contributing to this repository **must** read and adhere strictly to [AI_RULES.md](file:///c:/Users/Kurt%20Cruz/Documents/CODES/VSCODE/PROJECTS/CLASSVAULT/classvault/AI_RULES.md).

Key guidelines from `AI_RULES.md`:
- **Scope (SC-1 to SC-3):** Build only what the active prompt requests. Live Supabase data only; zero placeholder data.
- **Stack & Styling (ST-1 to ST-5, BR-1 to BR-4):** NativeWind v4 + Tailwind CSS 3.4 tokens only. Zero hardcoded hex values, zero arbitrary classes, and zero `fontWeight` styles. All text must use the shared `<Text>` component.
- **Security (SEC-1 to SEC-7):** RLS must back all restricted actions. Never log tokens or commit secrets. Files served only via signed URLs.
- **File Handling (FH-1 to FH-4):** 80 MB file cap. Must use `FormData` or `FileSystem.uploadAsync` to prevent memory crashes (FH-2). Safe two-step deletion (storage first, then database row).
