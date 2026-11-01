# ClassVault: Build Prompts and AI Guardrails

> **Companion to:** `ClassVault_MVP.md`  
> **Version:** 2.0 (Expanded — enrollment, comments, grading, analytics, batch upload, safe delete)  
> **Covers:** dependency configuration → foundation → authentication + enrollment → data + comments → files + submissions → polish + grading + analytics → QA → deployment  
> **Works with any AI coding assistant** (Claude, ChatGPT, Gemini, Copilot, Cursor, etc.). Prompts are tool-agnostic.

![ClassVault](brand/classvault-lockup-horizontal.svg)

---

## 0. How to Use This File

1. **Every AI session starts with Part A.** Paste the **Rules Block (A1)** first. For anything that touches UI, also paste the **Brand Lock Block (A2)**. Save both in the repo as `AI_RULES.md` (P1.6) so tools that read project files pick them up automatically.
2. **One prompt = one task = one session.** Do not chain prompts. Finish a prompt, run its **Verify** checklist yourself, commit, then move on.
3. **Prompts are copy-paste blocks.** Text in `<ANGLE_BRACKETS>` is a value you fill in before sending.
4. **The AI must end every task with the Report (A3).** If the report says something was "NOT verified", you verify it before committing.
5. **Respect ownership.** Each prompt lists *Owned files*. If the AI wants to touch anything else, it must stop and ask (Rule PR-3).
6. **Never skip a phase gate.** Gates are in `ClassVault_MVP.md`, Section 11.1.

### Prompt map

| Phase | Owner | Prompts |
|---|---|---|
| 1. Foundation | Member 1 | P1.0 manual setup, P1.1 init and dependencies, P1.2 styling and brand tokens, P1.3 database (expanded: 7 tables, 2 buckets, enrollment functions), P1.4 Supabase client, P1.5 UI primitives (including StatCard), P1.6 repo and hand-off |
| 2. Auth + Enrollment | Member 2 | P2.1 auth service and session, P2.2 route guard, P2.3 sign-in/up screens, P2.4 enrollment service and screen, P2.5 profile and sign-out |
| 3. Database, lists and comments | Member 3 | P3.1 data layer, P3.2 courses screen, P3.3 create course, P3.4 course detail, P3.5 material detail and commenting |
| 4. File handling + submissions | Member 4 | P4.1 file utilities and upload service (80 MB, OOM-safe), P4.2 upload screen (single + batch), P4.3 open file (with view tracking), P4.4 safe two-step delete, P4.5 student submission upload |
| 5. UI/UX polish, grading + analytics | Member 5 | P5.1 brand audit, P5.2 navigation and layout, P5.3 brand assets, P5.4 accessibility, P5.5 grading UI (submissions list + grade input), P5.6 analytics dashboards |
| 6. QA and handoff | Member 1 | P6.1 error handling, P6.2 QA run, P6.3 RLS verification, P6.4 Android APK, P6.5 web deploy, P6.6 release |
| Any time | Anyone | Z1 debug, Z2 code review, Z3 hand-off note |

Appendices: **A** Tailwind tokens · **B** config files · **C** SQL (source of truth, expanded) · **D** EAS and deploy config · **E** QA matrix (expanded) · **F** troubleshooting (expanded).

---

# PART A: GUARDRAILS

## A1. Rules Block (paste at the start of every AI session)

````text
You are a senior React Native engineer on ClassVault, a role-based Learning
Management System. Instructors create courses (auto-generated join codes), upload
PPT/PPTX/PDF files (up to 80 MB, single or batch), and grade student exercise
submissions. Students enroll via join codes, browse materials, submit exercises,
comment on materials, and check analytics. Follow these rules exactly. If a rule
conflicts with the task prompt, STOP and ask me which wins. Cite rule IDs (e.g.
SEC-2) when you refuse or deviate.

SCOPE
SC-1  Build only what the current prompt asks. No extra features, screens,
      settings, animations, or "nice to haves".
SC-2  Scope includes: enrollment with join codes, leaving a course (student),
      removing a student (instructor), deleting a course (instructor), single
      and batch file upload (80 MB cap), safe two-step deletion, commenting on
      materials (timestamps in 24-hour PHT), student exercise submissions,
      instructor grading (0-100), and analytics dashboards (instructor and
      student views). Outside scope: chat, video, payments, notifications,
      quizzes, dark mode, search, in-app document rendering.
SC-3  No placeholder or dummy data in app code. Use live Supabase data.
      Temporary scratch code must be deleted before you finish.

STACK (locked)
ST-1  Expo (latest stable SDK) + TypeScript with strict mode + expo-router.
ST-2  Styling: NativeWind v4 + Tailwind CSS 3.4 ONLY. Do not use NativeWind v5
      or the preview channel. No StyleSheet.create for colors, no inline style
      objects for colors/fonts/spacing, no styled-components, no UI kits
      (React Native Paper, NativeBase, Tamagui, Gluestack, Material UI).
ST-3  Backend: Supabase only (@supabase/supabase-js v2). No Firebase or any
      other backend. No state libraries (Redux, Zustand, MobX, React Query).
      Use React state, context, and small custom hooks.
ST-4  Icons: lucide-react-native only. Function components and hooks only.
ST-5  TypeScript: no `any`, no `@ts-ignore`, no non-null `!` assertions unless
      you explain why in a comment.

DEPENDENCIES
DP-1  Install Expo-native packages with `npx expo install <pkg>` so versions
      match the SDK. Never hand-edit versions in package.json.
DP-2  Do not add, remove, or upgrade any package that is not named in the
      prompt. If you think one is needed, STOP and ask with the reason.
DP-3  Never use --force or --legacy-peer-deps without telling me exactly why.
DP-4  After any install, run `npx expo-doctor` and report its result.

SECURITY
SEC-1 Only the public Supabase URL and anon/publishable key may exist in the
      app. NEVER use, request, print, or commit the service_role key.
SEC-2 Never disable RLS, never write a policy with `using (true)` for write
      operations, never bypass RLS "for testing".
SEC-3 Secrets live in `.env` (gitignored). Commit only `.env.example`.
      Variables exposed to the app must start with EXPO_PUBLIC_.
SEC-4 Never log tokens, sessions, passwords, or signed URLs.
SEC-5 Files are served only via short-lived signed URLs (1 hour) from the
      private buckets (`lms-files`, `submission-files`). Never make a bucket public.
SEC-6 UI hiding is not security. Any role restriction in the UI must also be
      enforced by RLS. State which RLS rule backs each restricted action.
SEC-7 Enrollment is enforced at the database level. Students can only read
      courses, materials, and files for courses they are enrolled in, enforced
      by RLS policies that check the enrollments table.

DATA
DT-1  Screens never call Supabase directly. Flow: screen -> hook -> service.
      All Supabase calls live in `src/services/*`.
DT-2  Every service function returns typed data or throws a typed AppError.
      Always handle the `{ data, error }` pair. Never ignore `error`.
DT-3  Select only the columns you need. No `select('*')` in screens' queries.
DT-4  Types for tables live in `src/types/database.ts` and match the SQL
      in Appendix C exactly.
DT-5  Do not call other Supabase methods inside an `onAuthStateChange`
      callback; set state there and react in a separate effect (deadlock risk).

FILE HANDLING
FH-1  Max file size: 80 MB (83,886,080 bytes) for both materials and submissions.
FH-2  CRITICAL OOM PREVENTION: On React Native, use `FormData` with local file
      URIs or Expo's `FileSystem.uploadAsync` for all uploads. NEVER read files
      into RAM as Base64 or ArrayBuffer. At 80 MB this WILL cause Out-of-Memory
      crashes on most devices.
FH-3  Safe two-step deletion: remove the file from the Supabase Storage bucket
      FIRST, wait for a success response, and ONLY THEN delete the database row.
      If storage deletion fails, do NOT delete the row. This prevents orphan
      files that max out the Supabase free tier.
FH-4  Batch upload: validate each file individually (type + size). Upload
      sequentially (not in parallel) to stay within free-tier rate limits.
      Show per-file progress. Allow retrying failed files.

BRAND (details in the Brand Lock Block)
BR-1  Use only the ClassVault tokens from tailwind.config.js. No hex codes,
      no arbitrary values like `bg-[#123456]` or `p-[13px]`.
BR-2  Only two font families: Plus Jakarta Sans and Inter. No system fonts,
      no `fontWeight` styles (weights are separate font families).
BR-3  All text goes through the shared <Text> component. Never import Text
      from react-native in a screen.
BR-4  Build screens from the shared UI components in src/components/ui.
      Do not restyle repeated patterns ad hoc.

UX
UX-1  Every async view has three states: loading, empty, error. Error states
      offer a retry action.
UX-2  Error text states what happened and how to fix it. Never show raw
      `error.message`, stack traces, or codes. Route through toUserMessage().
UX-3  Copy is plain, sentence case, active voice. One name per action.
UX-4  Touch targets >= 44x44. Inputs have visible labels. Icon-only buttons
      have accessibilityLabel.

CODE
CD-1  Keep files focused: components < 200 lines, functions < 50 lines.
CD-2  No dead code, no commented-out code, no console.log in committed code.
CD-3  Comments explain WHY, not WHAT.
CD-4  File names: components PascalCase.tsx, everything else camelCase.ts.
      Routes follow expo-router conventions.
CD-5  Handle web and Android: anything platform-specific is isolated and
      commented (e.g. Platform.OS === 'web').

TRUTH
TR-1  Do not invent APIs, props, flags, or config keys. If you are not sure
      how a library works in the INSTALLED version, say so, and check the
      official docs for that version before writing code.
TR-2  Never claim something works unless you ran it. Separate "Verified" from
      "NOT verified" in your report. If you cannot run something (emulator,
      device, dashboard), say so and give me the exact steps to check.
TR-3  If a requirement is ambiguous, ask ONE concise question before coding.
      If it is clear, do not ask; state your assumption and proceed.

PROCESS
PR-1  Plan first (max 8 bullets), then implement, then verify.
PR-2  Make the smallest change that satisfies the prompt. No refactors of
      unrelated code. No renaming or moving files you do not own.
PR-3  Edit only the "Owned files" listed in the prompt. If you need to change
      anything else (shared UI, config, package.json), STOP and tell me.
PR-4  Stop at the prompt's checkpoint. Do not continue to the next task.
PR-5  Finish with the Report format (A3). A reply without it is incomplete.
````

## A2. Brand Lock Block (paste for any UI, styling, asset, or screen prompt)

````text
BRAND LOCK: ClassVault. These are fixed. Do not substitute, "improve", or add.

IDENTITY
- Name is written "ClassVault" (one word, capital C and V).
- Logo: a large, geometric letter V with crisp flat tops and one softened point
  at the bottom. It is split into two emerald tones (#059669 on the left,
  #047857 on the right) to create a folded, dimensional look without gradients.
  Rising out of the V's opening are three flat, symmetrically fanned sheets of
  paper that are cut off cleanly at the inner edges, making the V read as a
  slot. The front sheet features a folded corner and two short lines, while the
  side sheets are plain emerald tints with no outlines. The accompanying
  wordmark uses Plus Jakarta Sans Bold with tightened spacing, converted to
  outlines. Use ONLY the files in assets/brand/. Never redraw, recolor,
  stretch, rotate, outline, add shadows, or rearrange. When porting SVG into
  code, copy path data VERBATIM.
- Color lockup on white/emerald-50. Reversed lockup on emerald-600/700/900.
- Minimum size: mark 24px, horizontal lockup 112px wide. Clear space around the
  logo = width of one V stroke.

COLOR (Tailwind class names; emerald is the brand, white is the canvas)
  bg-brand / text-brand        #059669  logo, icons, active tab, large shapes
  bg-action                    #047857  buttons and links (white text on it)
  bg-action-pressed            #065F46  pressed state
  text-ink / bg-ink            #064E3B  wordmark, strong headings
  emerald-50/100/200/300/500   #ECFDF5 #D1FAE5 #A7F3D0 #6EE7B7 #10B981
  bg-white                     #FFFFFF  surfaces and cards
  bg-canvas                    #F6F9F7  screen background
  text-fg / text-fg-secondary / text-fg-muted   #022C22 #4B5F57 #5F746C
  border-line                  #DCE7E1
  text-danger #DC2626 and text-warning #B45309: errors/warnings ONLY.
- #059669 on white is only 3.8:1: icons, shapes, and 24px+ text only.
  Small text and button fills use action (#047857).
- NO other hues. NO gradients. NO pure black. NO hex in components.
- Presentation vs Exercise is shown by icon + label, never by a new color.

TYPE (exactly two families, loaded via expo-font)
  font-display-xl PlusJakartaSans_800ExtraBold   Display
  font-display    PlusJakartaSans_700Bold         H1, H2
  font-heading    PlusJakartaSans_600SemiBold     Title, buttons
  font-body       Inter_400Regular                body
  font-body-medium   Inter_500Medium              small/caption emphasis
  font-body-semibold Inter_600SemiBold            body strong
  Scale (size/line): display 32/40, h1 28/36, h2 22/30, title 18/26,
  body 16/24, small 14/20, caption 12/16. Sentence case. No all-caps labels.

SHAPE AND SPACE
- 4pt grid (use Tailwind spacing scale; no arbitrary values). Screen padding 16.
- rounded-control (12) for inputs/buttons, rounded-card (16) for cards,
  rounded-full for chips. One shadow only: shadow-card. Otherwise 1px border-line.
- Icons: lucide-react-native, strokeWidth 1.75, size 20 or 24, color token only.
- Web: content column uses max-w-column (720px), centered.

COMPONENTS: Button (primary/secondary/ghost/danger), Input, Text, Card, Badge,
Logo, Segmented, EmptyState, Skeleton, Toast, Screen, StatCard. Compose screens
from these.

VOICE: plain, calm, specific, active voice, sentence case. Buttons state the
outcome ("Upload material", "Join course", "Post comment"). Errors say what
happened + how to fix it; no apologies. Empty states invite an action.

If a design need is not covered here, STOP and ask. Do not invent a style.
````

## A3. Required Report Format (the AI ends every task with this)

````text
## Report
- Plan followed: <yes / deviations>
- Changed files: <list, with created/edited/deleted>
- Commands run: <command -> short result>
- Verified (how): <what you actually ran or checked>
- NOT verified: <what you could not run; give me exact steps to check>
- Rules touched or deviated from: <rule IDs and why, or "none">
- Open questions / risks: <or "none">
````

## A4. Stop Conditions (the AI must stop and ask)

The AI must stop and ask before continuing if any of these happen:

- It needs a package that is not in the prompt (DP-2)
- It needs to edit a file it does not own (PR-3)
- A command fails twice with the same error (do not loop; use Z1)
- The documented API of the installed library differs from what it expected (TR-1)
- A design need is not covered by the Brand Lock
- Any step would require the `service_role` key, disabling RLS, or making a bucket public
- An upload approach would read the entire file into RAM (FH-2)

## A5. Ownership Map

| Area | Owner | Others may edit? |
|---|---|---|
| `package.json`, `tailwind.config.js`, `babel.config.js`, `metro.config.js`, `app.json`, `eas.json`, `src/components/ui/*`, `src/lib/*`, `supabase/*` | **Member 1** | No, request a change through the leader |
| `src/services/auth.ts`, `src/services/enrollment.ts`, `src/hooks/useAuth.tsx`, `src/hooks/useEnrollment.ts`, `app/(auth)/*`, enrollment screen, profile screen | Member 2 | No |
| `src/services/courses.ts`, `src/services/materials.ts`, `src/services/comments.ts`, course hooks, comment hooks, courses/course detail/material detail screens | Member 3 | No |
| `src/services/storage.ts`, `src/services/submissions.ts`, `src/lib/files.ts`\*, upload screen, submission screen | Member 4 | No |
| Styling fixes, navigation layout, assets wiring, `src/services/analytics.ts`, `src/hooks/useAnalytics.ts`, grading screens, analytics screens | Member 5 | Edits styling only in others' screens; owns grading/analytics logic |

\* `src/lib/files.ts` is created by Member 4 as an explicit exception to the `src/lib/*` rule.

---

# PART B: PHASE PROMPTS

# PHASE 1: Foundation (Member 1, Team Leader)

## P1.0 Manual setup checklist (no AI, do this first)

**Install and sign up**
- [ ] Node.js LTS, Git, VS Code, Android Studio with one working emulator (AVD). Confirm the emulator boots.
- [ ] Accounts: GitHub, Supabase, Expo (expo.dev), and Vercel *or* Netlify

**Supabase dashboard**
- [ ] New project. Region: the closest one to the team (e.g., Southeast Asia/Singapore). Save the database password in a password manager.
- [ ] **Authentication → Providers → Email:** turn **off** "Confirm email" (avoids blocked demo sign-ups).
- [ ] **Project Settings → API:** copy the **Project URL** and the **anon / publishable** key. **Do not** copy or share the `service_role` key.

**Local**
- [ ] `npm i -g eas-cli`
- [ ] Create a GitHub repository `classvault` (empty, no template)

**Checkpoint:** You have the URL, the anon key, a booting emulator, and an empty GitHub repo.

---

## P1.1 Initialize the project and core dependencies

Paste: **A1**

````text
TASK: Initialize the ClassVault Expo project and install core dependencies.

OWNED FILES: everything in the new project (this is the initial commit).

STEPS
1. Create the app: `npx create-expo-app@latest classvault` (TypeScript + expo-router
   template). Enter the folder.
2. Remove the template's demo content (example screens, sample components, demo
   assets, any "app-example" folder). Leave a minimal `app/_layout.tsx` and
   `app/index.tsx` that render nothing but a plain placeholder <View/>.
   (This one placeholder is allowed; Phase 2 replaces it.)
3. Install packages, grouped, ALL with `npx expo install`:
   - UI: react-native-reanimated react-native-safe-area-context react-native-svg lucide-react-native
   - Fonts: expo-font @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/inter
   - Backend: @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
   - Files: expo-document-picker expo-file-system expo-linking
   - Web: react-native-web react-dom @expo/metro-runtime
   Do NOT install nativewind/tailwind yet (next prompt).
4. Enable TypeScript strict mode in tsconfig.json; add path alias "@/*" -> "src/*"
   only if the template does not already provide an equivalent.
5. Create folders (empty folders need a .gitkeep): src/components/ui,
   src/components, src/services, src/hooks, src/lib, src/types, assets/brand,
   supabase/migrations, docs.
6. Create `.env.example` with:
   EXPO_PUBLIC_SUPABASE_URL=
   EXPO_PUBLIC_SUPABASE_ANON_KEY=
   Ensure `.env` is in .gitignore.
7. In app.json set: name "ClassVault", slug "classvault", scheme "classvault",
   userInterfaceStyle "light", android.package "com.classvault.app".
   In "web": bundler "metro" and output "single" (single-page app, avoids
   server-rendering issues with browser storage).

CONSTRAINTS: A1 rules DP-1..DP-4 apply strictly. Do not install anything else.

VERIFY (you run these)
- `npx expo-doctor` reports no errors
- `npx tsc --noEmit` passes
- `npx expo start`, press `a`: the emulator opens the app (blank placeholder is fine)

CHECKPOINT: stop after verification. Then send the A3 Report.
````

---

## P1.2 Styling, brand tokens, and fonts

Paste: **A1 + A2**

````text
TASK: Set up NativeWind v4 + Tailwind with the ClassVault tokens, and load fonts.

OWNED FILES: package.json, tailwind.config.js, babel.config.js, metro.config.js,
global.css, nativewind-env.d.ts, app/_layout.tsx, app.json (web section only).

STEPS
1. Install: `npx expo install nativewind` and `npm install -D tailwindcss@^3.4.17`.
   (react-native-reanimated and react-native-safe-area-context are already
   installed.) NativeWind v4 only; never use the `@preview` channel.
2. Create the files EXACTLY as written in this document's Appendix A
   (tailwind.config.js) and Appendix B (babel.config.js, metro.config.js,
   global.css, nativewind-env.d.ts). Do not "improve" the tokens.
3. In app/_layout.tsx:
   - import "../global.css"
   - load fonts with useFonts: PlusJakartaSans_600SemiBold, _700Bold, _800ExtraBold
     and Inter_400Regular, _500Medium, _600SemiBold
   - keep the splash screen visible until fonts are loaded (expo-splash-screen
     is part of the Expo template; use its documented API for the installed SDK)
   - render the router <Slot/> or <Stack/> once ready
4. Temporarily create a scratch screen at app/index.tsx that shows: every color
   token as a labeled swatch, and every type style (display, h1, h2, title, body,
   small, caption) using the font-* and text-* classes. Use plain react-native
   <Text> here ONLY because the shared <Text> does not exist yet.
5. Clear the cache: `npx expo start -c`.

CONSTRAINTS: theme.colors in tailwind.config.js REPLACES defaults (so unlisted
colors fail loudly). Do not add colors, fonts, or sizes.

VERIFY (you check on the emulator and in the browser with `w`)
- Swatches match the hex values in the Brand Lock
- Headings render in Plus Jakarta Sans, body in Inter (compare letterforms; not the system font)
- No red "unknown utility" errors in Metro
- Run `npx expo-doctor` and `npx tsc --noEmit`

CHECKPOINT: Stop. The scratch screen stays for now (P1.5 replaces it). Send A3 Report.
````

---

## P1.3 Database: tables, RLS, buckets, functions, types

Paste: **A1**

````text
TASK: Put the complete database schema in the repo and create matching TypeScript types.

OWNED FILES: supabase/migrations/0001_init.sql, src/types/database.ts

CONTEXT: The SQL in Appendix C of the build-prompts document is the SINGLE SOURCE
OF TRUTH. It creates:
- Enums: user_role, material_type
- Tables: profiles, courses (with join_code), enrollments, materials, comments,
  submissions (with grade fields), material_views
- Functions: handle_new_user (trigger), is_instructor(), generate_join_code(),
  enroll_with_code(text), is_enrolled(uuid)
- RLS policies on all 7 tables (enrollment-scoped for students)
- Two private storage buckets: lms-files (80 MB), submission-files (80 MB)
- Storage policies for both buckets (enrollment-scoped)
- Indexes for performance

I will paste it here: <PASTE_APPENDIX_C_SQL>

STEPS
1. Save the SQL verbatim as supabase/migrations/0001_init.sql.
2. Review it and list (do NOT change) anything that looks wrong or risky
   (syntax, missing RLS, policies that allow writes too broadly). If you find an
   issue, explain it and ask me before editing the SQL.
3. Write src/types/database.ts: hand-written TypeScript types matching the
   schema exactly:
   - UserRole, MaterialType
   - Profile, Course (with join_code), Enrollment, Material, Comment,
     Submission (with optional grade, graded_by, graded_at), MaterialView
   - CourseListItem = Course & {
       instructor: { full_name: string } | null;
       materials: { count: number }[];
       enrollments: { count: number }[];
     }
   - MaterialWithStatus = Material & { submission_status?: 'not_submitted' | 'submitted' | 'graded'; grade?: number }
4. Add src/types/domain.ts with AppError (class with `code` and `userMessage`).

DO NOT run SQL yourself. I will run it in the Supabase SQL Editor.

VERIFY (I do this in the Supabase dashboard)
- SQL Editor: paste and run 0001_init.sql, no errors
- Table Editor: profiles, courses, enrollments, materials, comments, submissions,
  material_views exist and all show "RLS enabled"
- Storage: buckets `lms-files` and `submission-files` exist and are Private
- Authentication -> Policies: policies are listed for all seven tables and for storage.objects
- Test: insert a course manually, verify a join_code was auto-generated (6 chars, unique)
- `npx tsc --noEmit` passes

CHECKPOINT: stop. Send A3 Report.
````

---

## P1.4 Supabase client, env validation, error mapping

Paste: **A1**

````text
TASK: Create the Supabase client, env validation, and the central error mapper.

OWNED FILES: src/lib/env.ts, src/lib/supabase.ts, src/lib/errors.ts, src/lib/format.ts, .env (local only, never committed)

STEPS
1. src/lib/env.ts: read EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.
   If either is missing, throw an Error with this message: "Supabase settings are
   missing. Copy .env.example to .env and fill in both values, then restart with
   `npx expo start -c`." Export typed constants.
2. src/lib/supabase.ts:
   - first line: import "react-native-url-polyfill/auto"
   - createClient with auth options: storage = AsyncStorage, autoRefreshToken true,
     persistSession true, detectSessionInUrl false
   - register an AppState listener that calls supabase.auth.startAutoRefresh()
     when the app is active and stopAutoRefresh() otherwise (native only)
3. src/lib/errors.ts: export toUserMessage(error: unknown): string. Map known cases
   to friendly, actionable messages:
   - invalid login credentials -> "Email or password is incorrect. Check both and try again."
   - email already registered -> "An account with this email already exists. Sign in instead."
   - network failure ("Network request failed", "Failed to fetch") -> "We can't reach ClassVault. Check your connection and try again."
   - permission denied / RLS (Postgres code 42501) -> "Your account can't do this. Sign in with an instructor account."
   - "No course found with this code" -> pass through as-is (it is already user-friendly, from enroll_with_code)
   - "Only students can enroll" -> "Only student accounts can enroll in courses."
   - storage "exceeded the maximum allowed size" -> "This file is larger than 80 MB. Compress it or split it, then try again."
   - anything else -> "Something went wrong. Try again in a moment."
   Never return the raw message. Also export isAppError().
4. src/lib/format.ts: formatBytes(n) (e.g., "2.4 MB"), formatDate(iso) (e.g.,
   "Oct 30, 2026"), and formatCommentTimestamp(iso) which formats timestamps in
   **24-hour military time displayed in Philippine Time (PHT, UTC+8)**.
   Examples: "14:35 PHT" (if today) or "Oct 30, 2026 · 22:15 PHT" (if a
   different day). ALWAYS use the Asia/Manila timezone for conversion. Never
   use 12-hour AM/PM format. Never use relative timestamps (e.g., "2 hours ago")
   for comments.
5. Create .env locally with the real values from P1.0.

CONSTRAINTS: SEC-1, SEC-3, UX-2. No service_role key anywhere.

VERIFY
- Temporarily (scratch, delete after) call `supabase.from('courses').select('id').limit(1)` from the scratch screen: expect `data: []` and `error: null`. DELETE the scratch code afterward.
- Remove a value from .env: the app shows the friendly env error, not a crash with a cryptic stack.
- `npx tsc --noEmit` passes

CHECKPOINT: stop. Send A3 Report.
````

---

## P1.5 Brand UI primitives

Paste: **A1 + A2**

````text
TASK: Build the shared ClassVault UI components. These are the ONLY building
blocks the rest of the team will use.

OWNED FILES: src/components/ui/*, assets/brand/* (copy only), app/index.tsx (scratch screen)

INPUT: The logo files are in assets/brand/ (I copied them from the brand folder):
classvault-mark.svg, classvault-mark-reversed.svg, classvault-lockup-horizontal.svg,
classvault-lockup-horizontal-reversed.svg, classvault-lockup-stacked.svg,
classvault-lockup-stacked-reversed.svg, icon.png, adaptive-icon.png, splash-icon.png, favicon.png.

BUILD (each in its own file, typed props, all styling via NativeWind token classes)
1. Text: `variant` = display | h1 | h2 | title | body | bodyStrong | small | caption;
   `tone` = default | secondary | muted | brand | danger | inverse. Maps variants to the
   font-* and text-* classes from the Brand Lock. Default variant body, tone default.
2. Button: variants primary (bg-action, white text, pressed bg-action-pressed),
   secondary (white bg, border-line, text-action), ghost (no bg, text-action),
   danger (bg-danger, white text). Props: label, onPress, loading, disabled, icon?,
   fullWidth. Min height 48, rounded-control, font-heading 16/24. Loading shows a
   spinner and blocks presses. accessibilityRole="button".
3. Input: label above field, helper text, error text (text-danger), rounded-control,
   border-line, focus border-brand (2px ring on web). Supports secureTextEntry with a
   show/hide icon button (accessibilityLabel). Min height 48.
4. Card: bg-white, rounded-card, border border-line, shadow-card, p-4. Optional onPress.
5. Badge: rounded-full, bg-emerald-100, text-action, caption style. Optional leading icon.
6. Segmented: 2 to 3 options; selected = bg-white + text-ink + shadow-card on a
   bg-emerald-50 track; accessibilityRole="tablist"/tab and selected state.
7. EmptyState: icon (in a bg-emerald-50 circle, brand color), title, message, optional
   action Button.
8. Skeleton: rounded blocks in bg-emerald-100 with a gentle opacity pulse (reduce
   motion if the OS asks).
9. Screen: SafeArea wrapper, bg-canvas, p-4 padding, optional scroll; on web wraps
   content in a centered column using the existing `max-w-column` token (720px).
10. Logo: react-native-svg components Mark, LogoHorizontal, LogoStacked, each with
    variant "color" | "reversed" and a `width` prop (height auto from aspect ratio).
    Port the SVG elements from the files in assets/brand/ VERBATIM (copy path data;
    do not redraw). Make clipPath ids unique per instance (use React.useId).
11. StatCard: a Card variant for analytics metrics. Props: label (caption muted),
    value (h2 or title ink), icon? (lucide icon in emerald-50 circle), trend? (optional
    small text showing change). Used by the analytics dashboards in Phase 5.
12. Replace the scratch screen in app/index.tsx with a "component gallery" that
    renders every component and variant (this gallery is a dev reference; it will be
    replaced in Phase 2).

CONSTRAINTS: BR-1..BR-4, UX-4. No new packages. No gradients. No colors outside the tokens.

VERIFY
- Gallery looks right on emulator and in the browser (`w`)
- Logo renders crisply at 24, 48, and 120 px; reversed version looks right on a bg-brand block
- StatCard renders with a sample label/value
- Tab through Inputs/Buttons on web: visible focus state
- Search the code: zero hex codes and zero `fontWeight` in src/components/ui
- `npx tsc --noEmit` passes

CHECKPOINT: stop. Send A3 Report.
````

---

## P1.6 Repo, AI rules file, and hand-off

Paste: **A1**

````text
TASK: Prepare the repository for the team and push it.

OWNED FILES: README.md, AI_RULES.md, OWNERS.md, .gitignore, docs/handoff/phase-1.md

STEPS
1. AI_RULES.md: contents = the Rules Block (A1) followed by the Brand Lock Block (A2),
   verbatim: <PASTE_A1_AND_A2>
2. README.md: project overview (mention enrollment, commenting, grading, analytics),
   tech stack, prerequisites, setup steps (clone, `npm install`, copy `.env.example`
   to `.env`, `npx expo start`), scripts, folder structure, branching rules
   (`main` + `feat/<member>-<topic>`; PRs reviewed by the leader), and a
   "Rules for AI assistants" section pointing to AI_RULES.md.
3. OWNERS.md: the ownership map from A5 as a table.
4. docs/handoff/phase-1.md: what exists now, how to run it, env needed, the component
   list with one usage example for each (including StatCard), database schema overview
   (7 tables, 2 buckets, enrollment functions), and known issues.
5. Verify .gitignore covers: node_modules, .env, .expo, dist, android/ios build folders,
   *.apk, .DS_Store.
6. Run: git init, first commit "chore: initialize ClassVault foundation", connect the
   GitHub remote, push main. Do not force-push.

CONSTRAINTS: SEC-3. Confirm with `git ls-files` that .env is NOT tracked.

VERIFY
- Fresh clone into another folder: `npm install` then `npx expo start` works with a copied .env
- GitHub shows README, AI_RULES.md, and no secrets

CHECKPOINT: Phase 1 gate (see MVP, 11.1). Tell Member 2 to start. Send A3 Report.
````

---

# PHASE 2: Authentication and Enrollment (Member 2)

## P2.1 Auth service, context, and session

Paste: **A1**

````text
TASK: Implement Supabase authentication, session state, and the role context.

OWNED FILES: src/services/auth.ts, src/hooks/useAuth.tsx, src/types/auth.ts

CONTEXT: profiles.role is set by a database trigger from sign-up metadata
(full_name, role). Read the schema in supabase/migrations/0001_init.sql.

BUILD
1. src/services/auth.ts (typed, errors thrown as AppError via toUserMessage):
   - signUp({ email, password, fullName, role }): supabase.auth.signUp with
     options.data = { full_name, role }
   - signIn({ email, password }), signOut()
   - getProfile(userId): select id, full_name, role from profiles where id = userId (single)
2. src/hooks/useAuth.tsx: <AuthProvider> + useAuth() exposing
   { session, user, profile, role, status, signIn, signUp, signOut } where
   status = "loading" | "signedOut" | "signedIn".
   - Load the existing session on mount (getSession)
   - Subscribe to onAuthStateChange: ONLY set the session state in the callback
     (rule DT-5, no Supabase calls inside it)
   - In a separate effect keyed on user.id, fetch the profile; if the profile is
     not there yet right after sign-up, retry up to 3 times with 500 ms delay
   - On sign-out clear session and profile
3. Export the provider for the root layout. Do NOT edit app/_layout.tsx
   (the leader owns it): tell me the exact one-line change needed.

CONSTRAINTS: DT-1, DT-2, DT-5, SEC-4. No new packages.

VERIFY (describe how I test; you cannot run the dashboard)
- Sign up a new user in the app; confirm in Supabase Table Editor that a profiles row
  exists with the right role
- Kill and reopen the app: session persists
- Sign out: status becomes "signedOut"
- `npx tsc --noEmit` passes

CHECKPOINT: stop. Send A3 Report (include the root-layout change for the leader).
````

## P2.2 Route guard

Paste: **A1**

````text
TASK: Protect routes based on auth status.

OWNED FILES: app/_layout.tsx (guard logic only, coordinate with the leader), app/(auth)/_layout.tsx, app/(app)/_layout.tsx

BUILD
1. Root layout wraps the app in <AuthProvider>.
2. While status === "loading", keep the splash screen visible (no flicker of the sign-in screen).
3. Signed-out users can only reach (auth) routes; signed-in users can only reach (app)
   routes. Use the documented route-protection mechanism of the INSTALLED expo-router
   version (e.g., Stack.Protected guards) if it exists; otherwise use a redirect in the
   layouts. State which approach you used and why (TR-1: check the docs for the
   installed version).
4. (app) layout: a bottom Tabs layout with two tabs, "Courses" (index) and "Profile",
   using lucide icons (BookOpen, User). Create app/(app)/(tabs)/index.tsx as a minimal
   screen that shows "Signed in as <full name> (<role>)" using <Text>. Member 3 will
   replace this screen.
   Tab bar styling: active color = brand, inactive = fg-muted, bg-white, top border
   border-line, labels in font-body-medium 12.

CONSTRAINTS: BR-1..BR-4. Tokens only (for the tab bar, use a small theme helper that
reads the token hex from tailwind.config.js, not a hard-coded hex).

VERIFY
- Cold start signed out -> sign-in screen
- Cold start signed in -> Courses tab
- Deep link / manual navigation to an (app) route while signed out redirects to sign-in
- Browser back button after sign-out does not reveal app screens

CHECKPOINT: stop. Send A3 Report.
````

## P2.3 Sign-in and sign-up screens

Paste: **A1 + A2**

````text
TASK: Build the Sign in and Sign up screens.

OWNED FILES: app/(auth)/sign-in.tsx, app/(auth)/sign-up.tsx, src/components/auth/*

BUILD
Sign in
- Stacked lockup (LogoStacked, 120 px wide) at the top, then H1 "Welcome back" and
  body-secondary "Sign in to open your class files."
- Inputs: Email, Password (show/hide). Primary full-width Button "Sign in".
- Footer: "New to ClassVault?" + ghost link "Create an account".
Sign up
- Mark + H1 "Create your account" and body-secondary "Choose your role to get started."
- Inputs: Full name, Email, Password (helper: "At least 8 characters"), then a Segmented
  control "I am a" with Student | Instructor (default Student).
- Primary full-width Button "Create account". Footer link "Already have an account? Sign in".
Behavior
- Client validation: full name >= 2 chars, valid email, password >= 8 chars. Show errors
  inline under each field; show server errors (via toUserMessage) in a danger-toned
  message above the button.
- Disable the button and show loading while submitting; prevent double-submit.
- Keyboard: KeyboardAvoidingView/ScrollView so the focused field is visible; correct
  keyboardType, autoCapitalize="none", autoComplete, and returnKeyType (next/done);
  Enter submits.
- On success the auth guard navigates automatically; do not navigate manually.

CONSTRAINTS: Use only src/components/ui components. No new colors or fonts.

VERIFY
- Both screens on emulator and web; layouts are centered in a 720px column on web
- Empty/invalid submissions show specific messages; wrong password shows the mapped message
- Instructor sign-up produces role "instructor" in Table Editor
- Search: no hex codes, no react-native Text imports

CHECKPOINT: stop. Send A3 Report.
````

## P2.4 Enrollment service and screen

Paste: **A1 + A2**

````text
TASK: Build the enrollment system — service, hook, and join-code entry screen.

OWNED FILES: src/services/enrollment.ts, src/hooks/useEnrollment.ts,
app/(app)/enroll.tsx, src/components/enrollment/*

CONTEXT: The database has an `enroll_with_code(p_join_code text)` RPC function
(SECURITY DEFINER) that validates the caller is a student, looks up the course by
join_code, inserts an enrollment row (or no-ops if already enrolled), and returns
the course_id. The function raises an exception with a user-friendly message if the
code is invalid or the caller is not a student.

BUILD
1. src/services/enrollment.ts:
   - enrollWithCode(joinCode: string): calls supabase.rpc('enroll_with_code',
     { p_join_code: joinCode.toUpperCase().trim() }). Returns the course_id (uuid).
     Throws via toUserMessage on failure.
   - getMyEnrollments(studentId): select course_id from enrollments where
     student_id = studentId (used by the courses hook to filter).
   - unenrollFromCourse(courseId): delete from enrollments where course_id and
     student_id = auth.uid(). Throws via toUserMessage on failure.
2. src/hooks/useEnrollment.ts: useEnrollment() returns { enroll(code), isEnrolling,
   unenroll(courseId), isUnenrolling, error }. On enroll success, navigates to
   the course detail and triggers a courses refetch. On unenroll success,
   navigates to the Courses dashboard and triggers a courses refetch.
3. app/(app)/enroll.tsx (student only):
   - Header: back button + title "Join a course".
   - A single Input "Join code" with maxLength 6, autoCapitalize "characters",
     placeholder "e.g. A3X9K2", and a helper "Ask your instructor for the 6-character code."
   - Primary full-width Button "Join course" (disabled until 6 chars entered).
   - On success: navigate to /course/<returned_course_id>.
   - Error messages: "No course found with this code. Check the code and try again."
     or "Only student accounts can enroll in courses." (both from the RPC function,
     mapped through toUserMessage).
   - If an instructor reaches this route, redirect to Courses (they create courses,
     they don't enroll).
4. On the Courses dashboard (Member 3 will build the full screen), document the need
   for a "Join course" FAB or button for students. Provide the component:
   src/components/enrollment/EnrollButton.tsx — a secondary Button "Join a course"
   (icon UserPlus) that routes to /enroll. Visible only when role === 'student'.

CONSTRAINTS: SEC-7 (enrollment at DB level). The RPC function handles all validation;
the client does not query courses directly to look up join codes.

VERIFY (describe how I test)
- Sign in as a student, navigate to Enroll, enter a valid join code -> course appears
  in the dashboard
- Enter a bad code -> exact error message shown
- Sign in as an instructor -> Enroll route redirects to Courses
- Supabase Table Editor: enrollments row exists with correct student_id and course_id
- Re-entering the same code does not create a duplicate enrollment
- Student unenrolls: course disappears from their dashboard; enrollment row is deleted
- `npx tsc --noEmit` passes

CHECKPOINT: stop. Send A3 Report.
````

## P2.5 Profile and sign-out

Paste: **A1 + A2**

````text
TASK: Build the Profile tab.

OWNED FILES: app/(app)/(tabs)/profile.tsx

BUILD: A Card showing avatar circle (bg-emerald-100, initials in text-action,
font-heading), full name (title), email (small, secondary), and a Badge with the role
("Instructor" or "Student"). Below, a secondary Button "Sign out" with a confirmation
step (a small inline confirm row, not a native Alert) -> calls signOut().
Add a small text-fg-muted caption with the app version from expo-constants /
app config (use whichever is already installed; do NOT add packages).

VERIFY: sign out returns to sign-in; no cached course data is shown afterward.

CHECKPOINT: Phase 2 gate. Write docs/handoff/phase-2.md using template Z3. Send A3 Report.
````

---

# PHASE 3: Database, Dashboard and Comments (Member 3)

## P3.1 Data layer (types, services, hooks)

Paste: **A1**

````text
TASK: Build the data layer for courses, materials, and comments.

OWNED FILES: src/services/courses.ts, src/services/materials.ts, src/services/comments.ts,
src/hooks/useCourses.ts, src/hooks/useCourse.ts, src/hooks/useMaterials.ts,
src/hooks/useComments.ts, src/hooks/useAsync.ts

BUILD
1. useAsync<T>(fn, deps): returns { data, error (string | null, already user-friendly),
   status: "loading" | "success" | "error", refetch, isRefreshing }. Cancel/ignore stale
   responses when deps change or the component unmounts.
2. services/courses.ts
   - listCourses(): select id, code, title, description, join_code,
     instructor:profiles!instructor_id(full_name),
     materials(count), enrollments(count), instructor_id
     ordered by created_at desc.
     NOTE: RLS automatically scopes this — instructors see their own courses,
     students see enrolled courses. No client-side filtering needed.
   - getCourse(id): same shape, single row; throw a friendly "Course not found"
     AppError if missing
   - createCourse({ code, title, description }): inserts with instructor_id =
     current user id (get it from supabase.auth.getUser() inside the service);
     returns the new course (including the auto-generated join_code)
   - deleteCourse(courseId): SAFE MULTI-STEP DELETION for the entire course:
     Step 1: List all files in `lms-files/{courseId}/` and `submission-files/{courseId}/`.
     Step 2: Delete all listed storage objects from both buckets.
     Step 3: Delete the course row (ON DELETE CASCADE handles enrollments, materials,
     comments, submissions, material_views).
     If storage deletion fails for any file, log the path and continue (best-effort
     cleanup; cascade will remove the DB rows regardless). Throw a friendly error
     only if the course row deletion itself fails.
   - listEnrolledStudents(courseId): select id, full_name from profiles joined
     with enrollments where course_id = courseId. Used by the instructor to see
     and manage enrolled students.
   - removeStudent(courseId, studentId): delete from enrollments where
     course_id = courseId and student_id = studentId. RLS allows only the
     course instructor.
3. services/materials.ts
   - listMaterials(courseId, type?): select id, course_id, title, type, file_name,
     size_bytes, created_at, ordered by created_at desc.
   - getMaterial(materialId): single row with course info (for detail screen).
   - listMaterialsWithSubmissionStatus(courseId, type, studentId): for students,
     left-join submissions to show status per exercise. Returns MaterialWithStatus[].
4. services/comments.ts
   - listComments(materialId): select id, material_id, content, created_at,
     user:profiles!user_id(id, full_name, role) ordered by created_at asc.
   - addComment(materialId, content): insert with user_id = auth.uid().
   - deleteComment(commentId): delete; RLS allows author or course instructor.
5. Hooks wrap the services with useAsync. All errors are passed through toUserMessage.

CONSTRAINTS: DT-1..DT-4. Check the Supabase JS docs for the embedded-count syntax
(`materials(count)`) in the installed version (TR-1) and report what you confirmed.

VERIFY
- Insert one course by hand in the Table Editor (as a test only); listCourses returns it
  with the instructor name, materials count 0, and enrollment count 0. Delete the test row afterward.
- `npx tsc --noEmit` passes

CHECKPOINT: stop. Send A3 Report.
````

## P3.2 Courses screen (dashboard)

Paste: **A1 + A2**

````text
TASK: Replace the Courses tab with the real dashboard.

OWNED FILES: app/(app)/(tabs)/index.tsx, src/components/courses/CourseCard.tsx

BUILD
- Screen title "Courses" (H1).
- If role is instructor: a primary Button "Create course" (icon Plus) in the header
  area that routes to /course/new. Students never see it.
- If role is student: place the EnrollButton component (from Member 2,
  src/components/enrollment/EnrollButton.tsx) in the header area. Instructors never see it.
- FlatList of CourseCard: course code in a Badge, title (title style), instructor name
  (small secondary). For instructors: show join code prominently (e.g., "Code: A3X9K2"
  in a copyable Badge) and enrolled student count. For students: show
  "N materials" (caption muted) with a FileText icon. Whole card pressable -> /course/<id>.
- Pull-to-refresh (RefreshControl using brand color).
- Loading: 3 Skeleton cards. Error: EmptyState with the friendly message + "Try again".
- Empty: students -> title "No courses yet", message "Ask your instructor for the
  join code." with a "Join a course" action (routes to /enroll);
  instructors -> title "No courses yet", message "Create your first course to start
  sharing materials." with a "Create course" action.

CONSTRAINTS: Screens call hooks only (DT-1). Components from src/components/ui only.
RLS handles enrollment scoping automatically (SEC-7).

VERIFY: all four states (loading, empty, error [turn off network], list) on emulator and web;
student account has no create button and sees the enroll button; instructor sees no enroll
button and sees join codes on cards.

CHECKPOINT: stop. Send A3 Report.
````

## P3.3 Create course

Paste: **A1 + A2**

````text
TASK: Build the Create course screen (instructors only).

OWNED FILES: app/(app)/course/new.tsx

BUILD
- Header: back button + title "Create course".
- Fields: Course code (required, trimmed, uppercased, 2-12 letters/numbers, e.g. IT101),
  Title (required, 3-80 chars), Description (optional, multiline, max 280, with counter).
- Primary Button "Create course". On success: navigate to the new course detail screen.
  Show a Toast "Course created" (or navigate only if Toast is not yet available).
  Display the auto-generated join code prominently so the instructor can share it.
- If a non-instructor reaches this route, redirect to Courses. (This is UX only; RLS is
  the real protection. State which policy enforces it: SEC-6.)
- Duplicate code for the same instructor -> friendly message "You already have a course
  with this code. Use a different code."
- The join code is generated by the database (the client does NOT generate it). After the
  insert returns, the join_code field is available on the returned course object.

VERIFY: instructor creates a course and sees the join code; student cannot reach the screen;
inserting as a student via the app is impossible and via API is rejected (checked in P6.3).

CHECKPOINT: stop. Send A3 Report.
````

## P3.4 Course detail with materials

Paste: **A1 + A2**

````text
TASK: Build the Course detail screen with materials grouped by type.

OWNED FILES: app/(app)/course/[id].tsx, src/components/courses/MaterialRow.tsx

BUILD
- Header: back button, course code Badge, title (H2), instructor name (small secondary),
  optional description (body secondary).
- For instructors (course owner): display the join code in a prominent, copyable area
  (e.g., a Card with "Share this code with students" and the code in a large Badge).
  Show enrolled student count.
- Segmented control: Presentations | Exercises (state in the screen). Fetch via
  useMaterials(courseId, type).
- For students viewing Exercises: use listMaterialsWithSubmissionStatus to show submission
  status per exercise row.
- MaterialRow (Card-based): icon in a bg-emerald-50 square (Presentation icon for
  presentations, ClipboardList for exercises; color brand), title, caption muted line
  "<formatBytes(size)> · <formatDate(created_at)>", a chevron. For exercises (student view):
  a status Badge showing "Not submitted" (muted), "Submitted" (emerald-100), or
  "Graded: <score>" (emerald-100 with score). Pressable -> /course/<id>/material/<materialId>.
  Props: material, onPress?, showStatus?.
- States: loading (3 Skeleton rows), error (EmptyState + retry), empty per tab:
  "No presentations yet" / "No exercises yet". Instructors who own the course see an
  extra line "Use Upload material to add one." (Member 4 adds the button.)
- Leave a clearly named `headerAction` slot (a React node prop/area in the header) and
  pass an `onPress` through MaterialRow for Member 4. Do NOT build upload or open
  logic and do NOT add stub/fake buttons.
- Pull-to-refresh.
- A secondary Button or link "Course analytics" at the bottom of the header section
  that routes to /course/<id>/analytics (Member 5 builds the screen).
- For instructors (course owner): a danger ghost Button "Delete course" (icon Trash2)
  at the bottom of the screen. Tapping opens an inline confirm Card: "Delete
  <course title>? This will permanently remove all materials, files, enrollments,
  submissions, and comments. This cannot be undone." with Danger button "Delete course"
  and ghost "Cancel". On confirm, call deleteCourse(courseId) from courses service.
  On success, navigate to the Courses dashboard and refetch. State which RLS policy
  enforces this (SEC-6).
- For instructors (course owner): an inline section or pressable link showing
  "N enrolled students" that expands to a list of enrolled students (via
  listEnrolledStudents). Each row: student name (body), a danger ghost icon button
  (UserMinus, accessibilityLabel "Remove student"). Tapping opens inline confirm:
  "Remove <student name> from <course title>?" with danger "Remove" and ghost "Cancel".
  On confirm, call removeStudent(courseId, studentId). On success, refetch the student
  list and the enrolled count. RLS enforces that only the course instructor can delete
  another user's enrollment.
- For students (enrolled): a secondary ghost Button "Leave course" (icon LogOut) in the
  header or bottom area. Tapping opens inline confirm: "Leave <course title>? You will
  lose access to all materials and your submissions." with danger "Leave course" and
  ghost "Cancel". On confirm, call unenrollFromCourse(courseId) from the enrollment
  service. On success, navigate to the Courses dashboard and refetch.

VERIFY: add a material row by hand in Table Editor (test only) and confirm it lists under
the right tab with correct size and date; for a student, verify submission status shows
"Not submitted" for exercises; verify "Leave course" is visible to students; verify
"Delete course" and enrolled student list with remove buttons are visible to the instructor;
remove test data afterward.

CHECKPOINT: stop. Send A3 Report.
````

## P3.5 Material detail and commenting

Paste: **A1 + A2**

````text
TASK: Build the Material detail screen with the commenting system.

OWNED FILES: app/(app)/course/[id]/material/[materialId].tsx,
src/components/comments/CommentItem.tsx, src/components/comments/CommentInput.tsx

BUILD
1. Material detail screen:
   - Header: back button, material title (H2), Badge with type (Presentation/Exercise).
   - Info section: file name, size (formatBytes), upload date (formatDate), uploader name.
   - Action buttons area (role-aware):
     * "Open file" Button (all roles) — calls the open hook (Member 4 wires this).
     * For exercises + instructor: "View submissions" Button -> routes to
       /course/<id>/submissions/<materialId> (Member 5 builds this screen).
     * For exercises + student: "Submit" Button -> routes to
       /course/<id>/material/<materialId>/submit (Member 4 builds this screen).
       If already submitted, show "Resubmit" instead, with current submission info
       (file name, date, grade if graded).
   - Leave a clearly named slot/prop for the "Open file" action so Member 4 can wire it.

2. Comments section (below the material info):
   - H2 "Comments" with a count badge.
   - FlatList of CommentItem: avatar circle (initials, bg-emerald-100), author name
     (small, with a role Badge: "Instructor" or "Student"), timestamp formatted with
     formatCommentTimestamp (24-hour military time in PHT, e.g., "14:35 PHT" or
     "Oct 30, 2026 · 22:15 PHT"), comment content (body).
   - Delete: a small Trash2 icon button visible only on the user's own comments OR if the
     current user is the course instructor. Inline confirm: "Delete this comment?" with
     danger "Delete" and ghost "Cancel". RLS enforces this (state the policy names).
   - CommentInput: a sticky bottom bar with an Input (placeholder "Write a comment...",
     max 500 chars) and a send Button (icon Send). Submitting clears the input and
     prepends the new comment to the list. Disable while sending.
   - States: loading (Skeleton lines), empty ("No comments yet. Start the conversation."),
     error (friendly message + retry).

CONSTRAINTS: DT-1, BR-1..BR-4, UX-1..UX-4. Comments use the services/hooks from P3.1.

VERIFY
- Add a comment as a student -> appears immediately with name, role badge, 24-hour PHT timestamp
- Add a comment as instructor -> same
- Comment timestamp shows military time in PHT (e.g., "14:35 PHT"), never 12-hour AM/PM
- Delete own comment -> removed
- Instructor deletes a student's comment -> removed
- Student cannot delete another student's comment (icon not visible; RLS also blocks)
- Empty state shows when no comments exist
- `npx tsc --noEmit` passes

CHECKPOINT: Phase 3 gate. Write docs/handoff/phase-3.md (template Z3). Send A3 Report.
````

---

# PHASE 4: File Handling and Submissions (Member 4)

## P4.1 File utilities and upload service (80 MB, OOM-safe)

Paste: **A1**

````text
TASK: Build the validated upload pipeline (no UI yet).

OWNED FILES: src/lib/files.ts, src/services/storage.ts

CONTEXT: Bucket `lms-files` is PRIVATE. Allowed: .pdf, .ppt, .pptx. Max 80 MB
(83,886,080 bytes). Storage path: `<course_id>/<uuid>-<sanitized_file_name>`. Storage RLS
allows inserts only into the instructor's own course folder.

CRITICAL OOM PREVENTION (rule FH-2): At 80 MB, reading the entire file into memory as
Base64 or ArrayBuffer WILL crash React Native on most devices. You MUST use one of these
two approaches for native uploads:

  APPROACH A (recommended): Use Expo's `FileSystem.uploadAsync()` to stream the file
  directly from disk to the Supabase Storage REST API endpoint. This never loads the
  file into RAM. The endpoint is:
    POST {SUPABASE_URL}/storage/v1/object/{bucket_name}/{path}
  with headers: Authorization (Bearer + session access_token), Content-Type, x-upsert.
  Check the Supabase Storage REST API docs and the expo-file-system docs for the
  installed versions (TR-1). Use FileSystemUploadType.BINARY_CONTENT.

  APPROACH B (fallback): Build a FormData with the local file URI (NOT the file contents):
    const formData = new FormData();
    formData.append('', { uri: localUri, name: fileName, type: contentType } as any);
  Then pass this FormData to supabase.storage.from(bucket).upload(path, formData, opts).
  React Native's networking layer streams this from disk. Verify this works with the
  installed supabase-js version.

  ON WEB: The document picker returns a standard File object. Pass it directly to
  supabase.storage.from(bucket).upload(). The browser handles streaming efficiently.

  Choose Approach A or B for native and document which you chose and why. Isolate the
  platform paths and comment the reasoning (CD-5).

BUILD
1. src/lib/files.ts
   - ALLOWED_EXTENSIONS, MAX_FILE_BYTES (83_886_080)
   - getExtension(name), sanitizeFileName(name) (lowercase, spaces -> hyphens, strip
     anything except a-z 0-9 . _ -)
   - contentTypeFromName(name): pdf -> application/pdf, ppt -> application/vnd.ms-powerpoint,
     pptx -> application/vnd.openxmlformats-officedocument.presentationml.presentation.
     Always derive contentType from the extension, NOT from the picker (Android often
     reports application/octet-stream).
   - validatePickedFile({ name, size }): returns null or a friendly message:
     wrong type -> "ClassVault accepts PDF, PPT, and PPTX files. Choose a different file."
     too big -> "This file is larger than 80 MB. Compress it or split it, then try again."
     empty (0 bytes) -> "This file is empty. Choose a different file."
   - validatePickedFiles(files[]): validates each file individually; returns
     { valid: File[], errors: { name, message }[] } for batch upload reporting.
2. src/services/storage.ts
   - uploadMaterial({ courseId, type, title, file }): validate -> upload to the bucket
     using the OOM-safe method (Approach A or B above, NOT by reading bytes into RAM) ->
     insert a materials row (course_id, uploader_id, title, type, file_path, file_name,
     mime_type, size_bytes) -> return it.
     If the DB insert fails, REMOVE the uploaded object (cleanup) and throw a friendly error.
   - uploadMaterialBatch({ courseId, type, files[] }): iterates through valid files
     sequentially (FH-4), calling uploadMaterial for each. Returns
     { succeeded: Material[], failed: { name, message }[] }. Does NOT stop on individual
     failures; continues with remaining files.
   - After each upload, confirm the stored object's size equals the picked file's size
     (use the storage list/metadata API; check docs for the installed supabase-js). If it
     does not match, delete it and throw: "The upload didn't finish correctly. Try again."
   - getSignedUrl(filePath, bucket = 'lms-files'): createSignedUrl with 3600 seconds.
   - deleteMaterial(materialId, filePath): SAFE TWO-STEP DELETION (FH-3):
     Step 1: Remove the file from the storage bucket. Wait for success.
     Step 2: Delete the materials row from the database.
     If Step 1 fails -> throw a friendly error, do NOT touch the database row.
     If Step 2 fails after Step 1 succeeded -> log the orphan path (console.warn is
     acceptable here as a diagnostic, not SEC-4 sensitive), throw a friendly error.
     Return success only if both steps complete.
   - Do not fake progress percentages; supabase-js upload has no progress callback.
     For batch uploads, track which file number is currently uploading.

CONSTRAINTS: SEC-4 (never log URLs), SEC-5, DT-2, FH-1, FH-2, FH-3, FH-4.
No new packages (expo-file-system and expo-document-picker are already installed).

VERIFY
- Write nothing temporary into screens. Test in P4.2.
- `npx tsc --noEmit` passes; report which exact upload method you used (A or B),
  the platform split, and where you confirmed the API in the docs.

CHECKPOINT: stop. Send A3 Report.
````

## P4.2 Upload screen (single and batch)

Paste: **A1 + A2**

````text
TASK: Build the Upload material screen with single AND batch upload, and connect it
to Course detail.

OWNED FILES: app/(app)/course/[id]/upload.tsx, src/components/courses/UploadButton.tsx,
and the `headerAction` slot usage inside app/(app)/course/[id].tsx (this one small
edit to Member 3's file is approved).

BUILD
- UploadButton (instructors who OWN the course only; check profile.role and
  course.instructor_id): primary Button "Upload material" (icon Upload) placed in the
  `headerAction` slot -> routes to /course/<id>/upload.
- Upload screen:
  1. Segmented: Presentation | Exercise (default = the tab the user came from).
  2. A dashed-border (border-line) drop area Card with a FileUp icon and TWO buttons:
     * "Choose file" -> single file pick
     * "Choose multiple files" -> batch file pick (expo-document-picker with
       multiple: true; check docs for the installed SDK version, TR-1)
  3. Selected file(s) display:
     * Single: a Card showing name, size, and a "Remove" ghost button.
     * Batch: a list of Cards, each with name, size, validation status (checkmark or
       error icon + message), and a "Remove" ghost button. Invalid files are flagged
       but not auto-removed (the user decides).
  4. Input "Title" — for single upload: prefilled from the file name without extension
     (editable, required, 3-80). For batch upload: each file's title is auto-generated
     from its file name (editable in-line on each card).
  5. Primary Button "Upload" (single) or "Upload N files" (batch). Disabled until at
     least one valid file + title. While uploading:
     * Single: button loading, inputs disabled, text "Uploading, keep this screen open."
     * Batch: progress text "Uploading 2 of 5…", per-file status updates (spinner ->
       checkmark or error icon). Inputs disabled.
  6. Success:
     * Single: go back to Course detail, switch to the matching tab, refetch; show
       Toast "Uploaded" (Toast component arrives in P6.1; until then navigate back only).
     * Batch: show summary Card "4 of 5 uploaded successfully" with a list of any
       failures. "Done" button returns to Course detail.
  7. Validation/errors use the exact messages from src/lib/files.ts and toUserMessage.
     Each file is validated individually (80 MB cap, allowed types).
- Non-owners reaching this route are redirected to the course (UX only; RLS enforces).
- Web: the picker returns File objects; use the web path from storage.ts.

VERIFY (physical rules of evidence; do not skip)
- Upload a real .pdf and a real .pptx on the emulator (single upload)
- In the Supabase Storage dashboard, download the uploaded file and OPEN it: size and content
  match the original (not 0 bytes)
- Upload a .docx -> rejected with the exact message; upload a > 80 MB file -> rejected
- Batch: select 3 files (1 valid PDF, 1 valid PPTX, 1 invalid .docx) -> invalid file is
  flagged, valid files upload successfully, summary shows "2 of 3 uploaded"
- Repeat the PDF upload once on the web build
- Monitor memory usage during upload on the emulator (Android Profiler or equivalent):
  RAM should NOT spike by 80 MB during upload (proves OOM-safe method is working)

CHECKPOINT: stop. Send A3 Report.
````

## P4.3 Open a file (with view tracking)

Paste: **A1 + A2**

````text
TASK: Let users open a material, and log the view for analytics.

OWNED FILES: src/hooks/useOpenMaterial.ts, src/services/views.ts, and wiring `onPress`
into MaterialRow usage in app/(app)/course/[id].tsx AND into the "Open file" slot in
app/(app)/course/[id]/material/[materialId].tsx (approved small edits)

BUILD
1. src/services/views.ts:
   - logMaterialView(materialId): insert into material_views (material_id, user_id =
     auth.uid()). Fire-and-forget: do NOT block the open flow if this fails. Catch
     errors silently (this is analytics, not critical path).
2. useOpenMaterial(): returns { open(material), openingId }. open() does:
   a) Call logMaterialView(material.id) — fire and forget, do not await
   b) Call getSignedUrl(material.file_path)
   c) Hand the URL to the OS: native -> Linking.openURL(url); web -> window.open(url,
      "_blank", "noopener")
   Track openingId so the tapped row shows a small spinner and ignores repeat taps.
- On failure show the friendly message via toast/inline: "We couldn't open this file.
  Check your connection and try again."
- Never log or display the signed URL. Do not store signed URLs in state beyond the call.

NOTE FOR README: on Android, PDFs open in the browser/viewer; PPT/PPTX are downloaded and
then opened with an installed app (Google Slides, PowerPoint, WPS). This is expected.

VERIFY
- Student account opens a PDF and a PPTX from the course screen and from the material detail
- Using a copied signed URL after 1 hour fails (expiry), and the bucket URL without a token fails
- Rapid double-tap opens once
- Check Supabase Table Editor: material_views row was created with the correct material_id and user_id

CHECKPOINT: stop. Send A3 Report.
````

## P4.4 Safe two-step delete

Paste: **A1 + A2**

````text
TASK: Instructor can delete a material from their own course using safe two-step deletion.

OWNED FILES: MaterialRow action wiring (approved edit to Member 3's component),
deleteMaterial is already in src/services/storage.ts from P4.1.

BUILD: A trailing icon button (Trash2, accessibilityLabel "Delete material") on MaterialRow,
visible only to the owning instructor. Tapping opens an inline confirm Card: "Delete
<title>? Students will lose access." with Danger button "Delete" and ghost "Cancel".

On confirm, call deleteMaterial(materialId, filePath) from storage.ts which performs:
  1. Remove the file from the `lms-files` storage bucket FIRST
  2. Wait for a success response
  3. THEN delete the materials row from the database

If the storage removal fails -> show a friendly error; the database row is untouched.
If the database row deletion fails after storage succeeded -> show a friendly error that
mentions the file was removed but the record could not be cleaned up.

List refetches on success. RLS backs this (state the policy names).

CRITICAL RATIONALE (FH-3): On the Supabase free tier, orphan files (files in storage with
no matching database row) accumulate and cannot be easily found or cleaned up. By deleting
storage FIRST, the worst case is a missing file with a dangling row (which can be cleaned up
with a simple query), rather than an invisible orphan file consuming storage quota.

VERIFY: owner can delete; verify in Supabase Storage that the file is gone AND the
materials row is gone; another instructor and a student cannot delete (P6.3).

CHECKPOINT: stop. Send A3 Report.
````

## P4.5 Student submission upload

Paste: **A1 + A2**

````text
TASK: Build the student exercise submission upload screen.

OWNED FILES: app/(app)/course/[id]/material/[materialId]/submit.tsx,
src/services/submissions.ts, src/hooks/useSubmissions.ts

CONTEXT: Students upload a file in response to an Exercise material. One submission per
student per exercise. The submissions table has a UNIQUE constraint on (material_id, student_id).
Re-submitting should UPSERT: delete the old submission's storage file (safe two-step),
then upload the new one.

Submissions go in the `submission-files` bucket with path:
  {course_id}/{material_id}/{student_id}-{uuid}-{sanitized_file_name}

BUILD
1. src/services/submissions.ts:
   - submitExercise({ courseId, materialId, file }): validate file (same rules: type +
     80 MB cap) -> check if a previous submission exists for this student + material ->
     if yes, delete the old storage file first (safe two-step) -> upload new file to
     `submission-files` bucket using the OOM-safe method (FH-2) -> upsert the
     submissions row (material_id, student_id, file_path, file_name, mime_type,
     size_bytes; grade/graded_by/graded_at reset to null on resubmission).
   - getMySubmission(materialId, studentId): select single row from submissions.
   - listSubmissionsForExercise(materialId): select all submissions for the exercise,
     joined with profiles (student name); used by the instructor on the submissions screen.
   - gradeSubmission(submissionId, grade): update the grade, graded_by, graded_at fields.
     RLS allows only the course instructor. (Member 5 wires the UI for this.)
   - getSubmissionSignedUrl(filePath): createSignedUrl from `submission-files` bucket.
2. src/hooks/useSubmissions.ts: useSubmissions(materialId) for the instructor list,
   useMySubmission(materialId) for the student's own submission.
3. app/(app)/course/[id]/material/[materialId]/submit.tsx (student only):
   - Header: back button + title "Submit exercise".
   - Shows the exercise title and description.
   - If already submitted: show current submission info (file name, date, grade if
     graded) with a warning: "Submitting again will replace your current submission.
     Your grade will be reset."
   - File picker (single file only): same validation as material upload (PDF/PPT/PPTX,
     80 MB, OOM-safe upload method).
   - Primary Button "Submit" (or "Resubmit" if replacing). While uploading: loading
     state, "Uploading your submission…"
   - On success: navigate back to material detail, refetch submission status.
   - Non-students and non-enrolled users are redirected. RLS is the real protection.

CONSTRAINTS: FH-1, FH-2, FH-3, SEC-5, SEC-7.

VERIFY
- Student submits a PDF for an exercise -> submission row appears in Table Editor, file
  appears in `submission-files` bucket with correct size
- Student resubmits -> old file removed from bucket, new file uploaded, grade reset to null
- Instructor cannot reach the submit screen (redirect)
- Non-enrolled student cannot submit (RLS rejects)
- `npx tsc --noEmit` passes

CHECKPOINT: Phase 4 gate. Write docs/handoff/phase-4.md (template Z3). Send A3 Report.
````

---

# PHASE 5: UI/UX Polish, Grading and Analytics (Member 5)

## P5.1 Brand compliance audit (report first, then fix)

Paste: **A1 + A2**

````text
TASK: Audit the entire codebase against the Brand Lock. First produce a violations
report WITHOUT changing code. Then, after I approve, fix them.

OWNED FILES (for the fix step): styling-only edits in app/** and src/components/** (no logic changes)

AUDIT CHECKLIST (search the whole repo; list file:line for each finding)
1. Hex or rgb() color values anywhere except tailwind.config.js and the logo SVG components
2. Arbitrary Tailwind values: `-[` in className strings
3. Imports of Text from react-native in app/** or feature components
4. Any fontFamily/fontWeight not from the token set; any system font
5. Colors outside the palette: emerald-400/600/700/800/900 raw classes, gray-*, slate-*, blue-*, red-* etc.
6. Gradients, extra shadows, shadow props, elevation props other than shadow-card
7. Repeated one-off patterns that should be a ui component (cards, badges, buttons)
8. All-caps labels, Title Case buttons, inconsistent verbs (Upload vs Add vs Submit)
9. Logo misuse: wrong variant on background, below minimum size, recolored, stretched
10. Contrast: any text-brand used for small text (should be text-action)
11. Touch targets under 44x44; icon buttons without accessibilityLabel
12. Presentation vs Exercise distinguished by color instead of icon + label

OUTPUT: a table: # | Rule | File:line | Violation | Proposed fix. End with a count per category.
Do not change code until I reply "approved".

AFTER APPROVAL: fix every item, run `npx tsc --noEmit`, re-run the audit, and show 0 remaining.
If a fix needs a change to a ui component or tailwind.config.js, STOP and give the exact
change for the leader (PR-3).
````

## P5.2 Navigation and layout polish

Paste: **A1 + A2**

````text
TASK: Make navigation and layout feel like a polished SaaS app. Styling and layout only.

OWNED FILES: app/**/_layout.tsx (options only), screen-level layout classNames

DO
- Consistent headers: same height, back affordance, title style (title font), bg-white with a
  bottom border-line; no default platform header colors left over.
- Tab bar: confirm tokens (active brand, inactive fg-muted), 56 px height, safe-area aware.
- Stack transitions: use the platform defaults; no custom animations.
- Spacing audit: 16 px screen padding, 12 px between list items, 24 px between sections.
- Keyboard handling on all forms (including comment input, grade input, submission upload);
  scrolling content never hidden behind the tab bar.
- Web: centered column (max-w-column), readable on a 1440 px laptop and a 390 px phone,
  no horizontal scroll, sensible hover states on pressables (web only), visible focus rings.
- Course detail: sticky/segmented control stays reachable while scrolling.
- Material detail: comment input stays visible at the bottom (sticky).
- Analytics screens: StatCards in a responsive grid (1 column on phone, 2 on web).

DON'T: change business logic, add features, add colors, or add animation libraries.

VERIFY: walk the full flow (sign up -> enroll -> course -> open file -> comment -> submit ->
view grades -> analytics) on the emulator and in the browser at two widths; screenshot each
screen for the README.

CHECKPOINT: stop. Send A3 Report.
````

## P5.3 Wire brand assets (icon, splash, favicon)

Paste: **A1 + A2**

````text
TASK: Apply the ClassVault app icon, adaptive icon, splash, and favicon.

OWNED FILES: app.json (icon/splash/android/web sections; coordinate with the leader),
assets/brand/*

BUILD in app.json (follow the docs for the INSTALLED SDK; the splash config format differs by SDK, TR-1):
- icon: ./assets/brand/icon.png
- android.adaptiveIcon: foregroundImage ./assets/brand/adaptive-icon.png, backgroundColor #059669
- splash: image ./assets/brand/splash-icon.png, resizeMode contain, backgroundColor #FFFFFF
- web.favicon: ./assets/brand/favicon.png
- Do NOT replace or edit the image files; they are final.

VERIFY: rebuild/run; the launcher icon shows the white V with documents on emerald and is
not clipped on a round Android launcher; the splash shows the colored mark on white.

CHECKPOINT: stop. Send A3 Report.
````

## P5.4 Accessibility pass

Paste: **A1 + A2**

````text
TASK: Accessibility pass. No visual redesign.

CHECK AND FIX (report each)
- Every Button/Pressable has accessibilityRole; icon-only controls have accessibilityLabel
- Inputs: label association, error text announced (accessibilityLiveRegion on Android)
- Touch targets >= 44x44 (hitSlop where the visual is smaller)
- Text scales with OS font size to 130% without clipping the primary flows
- Color is never the only signal (selected states have weight/shape/icon change, errors have text)
- Segmented and tab controls expose selected state
- Reduce-motion: Skeleton pulse is disabled when the OS requests it
- Comment delete, material delete, and grade actions have clear accessibility labels
- Analytics StatCards are readable by screen readers (label + value announced together)

DON'T add packages. Use token classes only.
VERIFY: test with TalkBack on the emulator for sign-in, course list, material detail with
comments, and analytics.

CHECKPOINT: stop. Send A3 Report.
````

## P5.5 Grading UI (submissions list and grade input)

Paste: **A1 + A2**

````text
TASK: Build the grading interface — submissions list and inline grade input.

OWNED FILES: app/(app)/course/[id]/submissions/[materialId].tsx,
src/components/grading/SubmissionRow.tsx, src/hooks/useGrading.ts

CONTEXT: Member 4 built src/services/submissions.ts with:
- listSubmissionsForExercise(materialId): returns submissions joined with student profiles
- gradeSubmission(submissionId, grade): updates grade, graded_by, graded_at (RLS: instructor only)
- getSubmissionSignedUrl(filePath): signed URL from submission-files bucket

BUILD
1. src/hooks/useGrading.ts: useGrading(materialId) wraps listSubmissionsForExercise with
   useAsync. Also exposes a grade(submissionId, score) function that calls
   gradeSubmission and refetches the list.
2. app/(app)/course/[id]/submissions/[materialId].tsx (instructor only):
   - Header: back button, title "Submissions", subtitle showing exercise title.
   - Summary section (StatCards):
     * "Submissions" — count of submissions vs total enrolled students
     * "Average grade" — average of graded submissions (or "—" if none graded)
     * "Graded" — count of graded vs total submissions
   - FlatList of SubmissionRow.
3. SubmissionRow (Card-based):
   - Student name (title), file name (caption muted), submission date (formatDate),
     file size (formatBytes).
   - "Open" ghost Button (icon ExternalLink) -> getSubmissionSignedUrl -> Linking.openURL.
   - Grade section: an Input (type numeric, min 0, max 100, placeholder "0-100") showing
     the current grade (or empty). Next to it, a primary "Save" Button. When the
     instructor enters/changes a grade and taps Save:
     * Validate: must be a number 0-100. Invalid -> inline error "Enter a number from 0 to 100."
     * Call grade(submissionId, score). Show loading on the button.
     * On success: update the row in-place (no full refetch needed, but refetch the
       summary stats). Show a Toast "Grade saved" or update inline.
     * If the submission has already been graded, show the current grade pre-filled and
       allow the instructor to update it.
   - If the submission has a grade: show it with a checkmark icon and the graded date.
- States: loading (Skeleton rows), empty ("No submissions yet."),
  error (friendly message + retry).
- Non-instructors and non-owners are redirected. RLS is the real protection.

CONSTRAINTS: BR-1..BR-4, UX-1..UX-4. StatCard component from src/components/ui.

VERIFY
- Instructor opens an exercise's submissions list; sees all student submissions
- Instructor opens a submission file (signed URL works)
- Instructor enters a grade (e.g., 85) and saves -> grade appears on the row
- Instructor updates a grade (e.g., 85 -> 90) -> new grade shown
- Invalid grade (e.g., "abc" or 150) -> inline error
- Student cannot access this screen (redirect; RLS also blocks)
- Grade is visible to the student on their material detail screen and analytics
- `npx tsc --noEmit` passes

CHECKPOINT: stop. Send A3 Report.
````

## P5.6 Analytics dashboards

Paste: **A1 + A2**

````text
TASK: Build the analytics dashboard screen (role-aware: instructor and student views).

OWNED FILES: app/(app)/course/[id]/analytics.tsx, src/services/analytics.ts,
src/hooks/useAnalytics.ts, src/components/analytics/*

BUILD
1. src/services/analytics.ts:
   - getInstructorAnalytics(courseId): returns:
     * enrolledCount: count from enrollments where course_id
     * materialStats: for each material in the course: { id, title, type, viewCount
       (count from material_views), uniqueViewers (count distinct user_id from
       material_views) }
     * exerciseStats: for each exercise: { id, title, submissionCount, gradedCount,
       averageGrade, highestGrade, lowestGrade } (from submissions)
   - getStudentAnalytics(courseId, studentId): returns:
     * averageGrade: average of all grades for this student in this course's exercises
       (only graded submissions; null if none)
     * submittedCount: count of submissions for this student in this course's exercises
     * totalExercises: count of exercises in this course
     * viewedCount: count of distinct materials this student has viewed in this course
       (from material_views)
     * totalMaterials: count of all materials in this course
2. src/hooks/useAnalytics.ts: useInstructorAnalytics(courseId), useStudentAnalytics(courseId)
   — wrappers using useAsync. Determine which to use based on role.
3. app/(app)/course/[id]/analytics.tsx (role-aware):

   INSTRUCTOR VIEW:
   - Header: back button, title "Course analytics", course title subtitle.
   - Top row: StatCards for:
     * "Enrolled students" (icon Users, value = enrolledCount)
     * "Total materials" (icon FileText, value = materialStats.length)
     * "Average grade" (icon Award, value = overall average across all exercises, or "—")
   - Section "Material engagement" (H2): a list/table showing each material with its
     title, type badge, view count, and unique viewer count. Sort by view count desc.
   - Section "Exercise performance" (H2): a list/table showing each exercise with its
     title, submission count (N of enrolled), average grade, highest, lowest. Exercises
     with 0 submissions show "No submissions yet."

   STUDENT VIEW:
   - Header: back button, title "My progress", course title subtitle.
   - Top row: StatCards for:
     * "Average grade" (icon Award, value = averageGrade or "—")
     * "Exercises submitted" (icon CheckSquare, value = "3 of 5" format)
     * "Materials viewed" (icon Eye, value = "12 of 18" format)
   - Below: a brief encouraging message based on progress:
     * All exercises submitted + all materials viewed -> "You're all caught up!"
     * Some pending -> "You have N exercises to submit and M materials to review."

   Both views use StatCard for the top metrics. Use a responsive grid layout:
   1 column on phone, 2-3 columns on web.

CONSTRAINTS: DT-1, BR-1..BR-4. All queries go through the service layer.
The analytics service uses aggregate queries (count, avg) directly; this is acceptable
since these are read-only analytics views.

VERIFY
- Instructor analytics: create a course with 2 exercises and 3 presentations; have 2
  students enroll, view some materials, submit exercises, grade one. Verify:
  * Enrolled count = 2
  * View counts match material_views rows
  * Average grades are calculated correctly
- Student analytics: verify average grade, submission ratio, and view ratio are correct
- Empty course analytics: shows "0 enrolled", "—" for averages, "No submissions yet"
- Web layout: StatCards wrap into a grid at wider viewports
- `npx tsc --noEmit` passes

CHECKPOINT: Phase 5 gate. Write docs/handoff/phase-5.md (template Z3). Send A3 Report.
````

---

# PHASE 6: QA and Handoff (Member 1, Team Leader)

## P6.1 Error handling, toasts, and edge cases

Paste: **A1 + A2**

````text
TASK: Finish error handling across the app.

OWNED FILES: src/components/ui/Toast.tsx, src/lib/errors.ts, a root ErrorBoundary,
small edits in screens to call the toast (leader may edit any file this phase)

BUILD
1. Toast component + provider (token styled: bg-ink, white text, rounded-control, shadow-card;
   success/error leading icon; auto-dismiss 4 s; accessibilityLiveRegion). Messages:
   "Uploaded", "Course created", "Enrolled", "Comment posted", "Comment deleted",
   "Grade saved", "Signed out", "Material deleted". Errors use toUserMessage.
2. Root error boundary: friendly full-screen EmptyState "Something went wrong" + "Restart app"
   action; never show stack traces.
3. Expired session: when a request fails with an auth error, sign the user out and show the
   sign-in screen with the message "Your session expired. Sign in again."
4. Verify all error paths show the exact approved messages:
   - "File too large" (80 MB), "wrong file type", "empty file", "offline",
     "permission denied", "No course found with this code", "Only student accounts
     can enroll", safe delete failures (storage failed vs row failed).
5. Sweep for any place that shows raw `error.message`.

VERIFY: trigger each error on purpose (airplane mode, > 80 MB file, .docx, student calling an
instructor action through the API, bad join code, deleting while offline).

CHECKPOINT: stop. Send A3 Report.
````

## P6.2 Full QA run

Paste: **A1**

````text
TASK: Execute the QA matrix and fix defects. Fix-only mode: no new features.

INPUT: The QA matrix from Appendix E: <PASTE_APPENDIX_E>

PROCESS
1. I will tell you the result of each test (pass/fail + what I saw). You do NOT claim a test
   passed unless I told you.
2. For each failure: log it (ID, steps, expected, actual), find the root cause (cite evidence,
   not guesses), make the smallest fix, and tell me the exact retest steps.
3. Keep a running defects table in docs/qa-log.md.

CONSTRAINTS: PR-2 (minimal change), TR-2 (verified vs NOT verified).
CHECKPOINT: stop when all must-pass tests pass. Send A3 Report.
````

## P6.3 RLS verification script

Paste: **A1**

````text
TASK: Prove the role restrictions are enforced by the database, not just the UI.

OWNED FILES: scripts/rls-check.mjs, docs/rls-results.md

BUILD scripts/rls-check.mjs (plain Node 18+ ESM using the already-installed
@supabase/supabase-js; reads SUPABASE_URL, SUPABASE_ANON_KEY, INSTRUCTOR_EMAIL,
INSTRUCTOR_PASSWORD, STUDENT_EMAIL, STUDENT_PASSWORD from process.env; no secrets in the file;
no new packages). It signs in as each account with the ANON key and asserts:

ENROLLMENT AND ACCESS CONTROL:
1. Student (not enrolled) SELECT from courses -> returns 0 rows for courses they haven't enrolled in
2. Student (not enrolled) SELECT from materials -> returns 0 rows for non-enrolled courses
3. Student enrolls via RPC enroll_with_code -> succeeds with a valid code
4. Student (now enrolled) SELECT from courses -> returns the enrolled course
5. Student (enrolled) SELECT from materials -> returns materials for the enrolled course

WRITE RESTRICTIONS:
6. Student INSERT into courses -> rejected (permission denied)
7. Student INSERT into materials -> rejected
8. Student upload to storage `lms-files/<any course id>/test.pdf` -> rejected
9. Student DELETE of a material or course -> affects 0 rows
10. Instructor A cannot insert a material into Instructor B's course, nor upload into B's folder
    (create a second instructor account for this)
11. Instructor can insert into their own course and upload/delete in their own folder

COMMENTING:
12. Enrolled student can INSERT into comments for a material in their enrolled course
13. Non-enrolled student cannot INSERT into comments for a non-enrolled course's material
14. Student can DELETE their own comment
15. Student cannot DELETE another student's comment
16. Instructor can DELETE any comment in their own course

SUBMISSIONS AND GRADING:
17. Enrolled student can INSERT into submissions for an exercise in their enrolled course
18. Non-enrolled student cannot INSERT into submissions
19. Student can SELECT their own submission
20. Student cannot SELECT another student's submission
21. Instructor can SELECT all submissions for their course's exercises
22. Instructor can UPDATE grade on a submission in their course
23. Student cannot UPDATE grade on any submission

STORAGE AND URLS:
24. Anonymous (not signed in) cannot select from courses, materials, or list either bucket
25. Direct bucket URL without a signed token returns an error
26. A signed URL works, and the file content is the exact expected size
27. Enrolled student can read from `submission-files` for their enrolled course
28. Non-enrolled student cannot read from `submission-files`

Print a PASS/FAIL table. Clean up any rows or objects the script created.
Write the output to docs/rls-results.md.

CONSTRAINTS: SEC-1 (anon key only, never service_role), SEC-2.
VERIFY: all checks PASS. Any FAIL is a release blocker: fix the SQL policy, rerun.

CHECKPOINT: stop. Send A3 Report.
````

## P6.4 Android APK with EAS

Paste: **A1**

````text
TASK: Produce an installable Android .apk with EAS Build.

OWNED FILES: eas.json, app.json (android section), docs/release.md

STEPS (explain each command; I will run them)
1. `eas login`, then `eas build:configure` (Android). Make eas.json match Appendix D,
   with a `preview` profile that builds an APK (distribution internal, android.buildType apk).
2. Put EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY into the `preview` profile's
   `env` block. REASON: .env is gitignored and is not uploaded to the build server; without
   these the APK cannot reach Supabase. (The anon key is public by design and safe only
   because RLS is on.) Never put the service_role key here.
3. Confirm android.package is "com.classvault.app" (or the team's agreed value) and the
   version in app.json is "1.0.0".
4. Run `eas build -p android --profile preview`. Wait for the build, download the .apk.
5. Install on a physical Android phone (enable "install unknown apps" for the browser/Drive).
   Run the full demo flow ON THE PHONE: sign up, enroll, open a file, comment, submit an
   exercise, view analytics.

CONSTRAINTS: Check the current EAS docs for the installed eas-cli (TR-1) and report any
difference from Appendix D. Do not add paid services.

VERIFY (on the phone): sign in works (proves env vars are in the build), enrollment works,
upload works, a student can open a file, commenting works, submission works, analytics
render, launcher icon and splash are correct.

CHECKPOINT: stop. Document the exact build command, build URL, and the date in docs/release.md.
Send A3 Report.
````

## P6.5 Web build and deployment

Paste: **A1**

````text
TASK: Build and deploy the web version (secondary output).

OWNED FILES: vercel.json or public/_redirects (one of them), docs/release.md (web section)

STEPS
1. Export: `npx expo export --platform web` (output folder `dist`). Do NOT use the old
   `expo export:web` command. Check the Expo docs for the installed SDK (TR-1).
2. Preview locally: `npx serve dist` (via npx; do not add as a dependency). Test sign-in,
   enrollment, upload, comment, open, submit, grade, and analytics in the browser.
3. Single-page-app fallback so refreshing /course/<id> does not 404:
   - Vercel: vercel.json with buildCommand "npx expo export --platform web",
     outputDirectory "dist", and a rewrite of every path to /index.html
   - Netlify: create public/_redirects with `/*  /index.html  200`
   Choose the host the team picked: <VERCEL_OR_NETLIFY>.
4. Environment variables: add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
   in the host's dashboard BEFORE the build (they are baked into the bundle at build time).
5. In Supabase -> Authentication -> URL Configuration: add the deployed site URL to the
   allowed Site/Redirect URLs.
6. Deploy and test the public link on a desktop browser and on an iPhone (Safari).

VERIFY: refresh on a deep link works; mixed content or CORS errors are absent in the browser
console; file open works in Safari (pop-up allowed); enrollment, comments, grading, and
analytics all function correctly on web.

CHECKPOINT: stop. Record the public URL in docs/release.md. Send A3 Report.
````

## P6.6 Release checklist and final handoff

Paste: **A1**

````text
TASK: Finalize the submission package.

OWNED FILES: README.md, docs/release.md, CHANGELOG.md

DO
1. README final: product summary with the logo lockup, screenshots (from P5.2), feature list
   (enrollment, upload single + batch, commenting, submissions, grading, analytics),
   tech stack, setup, scripts, demo accounts (an instructor and a student with the passwords
   I provide; student pre-enrolled in a demo course with sample materials, comments,
   submissions, and grades), deployment links (APK + web), known limitations (role chosen at
   sign-up; PPT/PPTX open via an external app on Android; analytics are basic aggregates;
   no real-time comment updates), and a "Rules for AI assistants" pointer to AI_RULES.md.
2. CHANGELOG.md: v2.0.0 with the shipped feature list (enrollment, batch upload, 80 MB cap,
   safe deletion, commenting, submissions, grading, analytics dashboards).
3. Tag `v2.0.0`, create a GitHub Release, attach the .apk.
4. Final security check: `git log -p` contains no keys other than the public anon key; the
   service_role key is nowhere; .env is not tracked (list the commands you ran).
5. Walk the success criteria in MVP Section 1.3 and mark each Pass/Fail with evidence.

CHECKPOINT: Phase 6 gate = done. Send A3 Report.
````

---

# ANY TIME PROMPTS

## Z1. Debugging prompt

````text
DEBUG TASK (paste A1 first).

SYMPTOM: <what you see, exact error text>
EXPECTED: <what should happen>
WHERE: <screen / command / platform: Android emulator, physical phone, web>
WHAT CHANGED LAST: <last commit or change>
ALREADY TRIED: <list>

RULES FOR THIS SESSION
- First list 3 most likely causes ranked by evidence from the error and the code, and the
  quickest check that confirms or kills each one. Do not change code yet.
- Then apply the smallest fix for the confirmed cause. No refactors, no new packages.
- If the same fix fails twice, STOP and tell me what you now believe and what information
  you need.
- End with the A3 Report and the exact steps for me to retest.
````

## Z2. Code review prompt (use before merging any pull request)

````text
REVIEW TASK (paste A1 + A2 first). Review the diff below as a strict reviewer. Do not
rewrite the code. Output a table: Severity (Blocker/Major/Minor) | Rule ID | File:line |
Problem | Suggested fix.

CHECK: scope creep (SC), stack/dependency violations (ST, DP), security (SEC: keys, RLS,
signed URLs, logging, enrollment bypass), data layer (DT: screens calling Supabase directly,
ignored errors, select *), brand (BR: hex codes, arbitrary values, fonts, Text imports), UX
states and messages (UX), code quality (CD), invented APIs (TR), file handling (FH: OOM-safe
uploads, safe deletion order, batch validation), and edits outside the author's owned files (PR-3).
End with: "Approve" or "Request changes" plus a list of what must change.

DIFF: <PASTE_DIFF>
````

## Z3. Hand-off note template (each member writes this at the end of their phase)

````text
Write docs/handoff/phase-<N>.md for the next team member (paste A1 first).
Include: 1) What was built (screens, services, hooks, with file paths) 2) How to run and test it
(accounts needed, exact steps) 3) Public interfaces the next person will use (function
signatures, props, slots) 4) Known issues and deliberate shortcuts 5) What the next phase must NOT
change. Keep it under one page. Only describe what actually exists; do not promise features.
````

---

# APPENDICES

## Appendix A: `tailwind.config.js` (brand tokens, single source of truth)

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    // Overriding (not extending) so any color outside the brand fails loudly.
    colors: {
      transparent: "transparent",
      white: "#FFFFFF",
      brand: "#059669",
      action: { DEFAULT: "#047857", pressed: "#065F46" },
      ink: "#064E3B",
      emerald: {
        50: "#ECFDF5",
        100: "#D1FAE5",
        200: "#A7F3D0",
        300: "#6EE7B7",
        500: "#10B981",
      },
      canvas: "#F6F9F7",
      fg: { DEFAULT: "#022C22", secondary: "#4B5F57", muted: "#5F746C" },
      line: "#DCE7E1",
      danger: "#DC2626",
      warning: "#B45309",
    },
    // Overriding so no other sizes exist. Each loaded font weight is its own family.
    fontSize: {
      display: ["32px", { lineHeight: "40px" }],
      h1: ["28px", { lineHeight: "36px" }],
      h2: ["22px", { lineHeight: "30px" }],
      title: ["18px", { lineHeight: "26px" }],
      body: ["16px", { lineHeight: "24px" }],
      small: ["14px", { lineHeight: "20px" }],
      caption: ["12px", { lineHeight: "16px" }],
    },
    fontFamily: {
      "display-xl": ["PlusJakartaSans_800ExtraBold"],
      display: ["PlusJakartaSans_700Bold"],
      heading: ["PlusJakartaSans_600SemiBold"],
      body: ["Inter_400Regular"],
      "body-medium": ["Inter_500Medium"],
      "body-semibold": ["Inter_600SemiBold"],
    },
    extend: {
      borderRadius: { control: "12px", card: "16px" },
      boxShadow: {
        card: "0 1px 2px rgba(2,44,34,0.06), 0 4px 12px rgba(2,44,34,0.06)",
      },
      maxWidth: { column: "720px" },
    },
  },
  plugins: [],
};
```

> Class names that follow: `bg-brand`, `bg-action`, `bg-action-pressed`, `text-ink`, `bg-canvas`, `text-fg`, `text-fg-secondary`, `text-fg-muted`, `border-line`, `font-display`, `font-heading`, `font-body`, `rounded-control`, `rounded-card`, `shadow-card`, `max-w-column`.

## Appendix B: Config files

**`babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

**`metro.config.js`**

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

**`global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**`nativewind-env.d.ts`**

```ts
/// <reference types="nativewind/types" />
```

**`app.json` essentials** (merge into the generated file; splash format varies by SDK, so follow the docs for the installed version)

```json
{
  "expo": {
    "name": "ClassVault",
    "slug": "classvault",
    "scheme": "classvault",
    "version": "1.0.0",
    "userInterfaceStyle": "light",
    "icon": "./assets/brand/icon.png",
    "android": {
      "package": "com.classvault.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/brand/adaptive-icon.png",
        "backgroundColor": "#059669"
      }
    },
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/brand/favicon.png"
    }
  }
}
```

**`.env.example`**

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## Appendix C: SQL (`supabase/migrations/0001_init.sql`), single source of truth

```sql
-- ClassVault 0001_init.sql (v2.0 — expanded)
-- Run once in the Supabase SQL Editor.
-- Tables: profiles, courses, enrollments, materials, comments, submissions, material_views
-- Buckets: lms-files (80 MB), submission-files (80 MB)

-- ============================================================
-- 1. ENUMS
-- ============================================================
create type public.user_role as enum ('instructor', 'student');
create type public.material_type as enum ('presentation', 'exercise');

-- ============================================================
-- 2. TABLES
-- ============================================================

-- 2a. Profiles
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  role        public.user_role not null default 'student',
  created_at  timestamptz not null default now()
);

-- 2b. Join-code generator (used as default for courses.join_code)
create or replace function public.generate_join_code()
returns text
language plpgsql
as $$
declare
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I to avoid confusion
  code   text := '';
  i      int;
  done   bool := false;
begin
  while not done loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    done := not exists (select 1 from public.courses where join_code = code);
  end loop;
  return code;
end;
$$;

-- 2c. Courses
create table public.courses (
  id             uuid primary key default gen_random_uuid(),
  code           text not null check (char_length(code) between 2 and 12),
  title          text not null check (char_length(title) between 3 and 80),
  description    text check (char_length(description) <= 280),
  instructor_id  uuid not null references public.profiles (id) on delete cascade,
  join_code      text not null unique default public.generate_join_code(),
  created_at     timestamptz not null default now(),
  unique (instructor_id, code)
);

-- 2d. Enrollments
create table public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (course_id, student_id)
);

-- 2e. Materials
create table public.materials (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses (id) on delete cascade,
  uploader_id  uuid not null references public.profiles (id),
  title        text not null check (char_length(title) between 3 and 80),
  type         public.material_type not null,
  file_path    text not null,
  file_name    text not null,
  mime_type    text not null,
  size_bytes   bigint not null check (size_bytes > 0 and size_bytes <= 83886080),
  created_at   timestamptz not null default now()
);

-- 2f. Comments
create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  material_id  uuid not null references public.materials (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  content      text not null check (char_length(content) between 1 and 500),
  created_at   timestamptz not null default now()
);

-- 2g. Submissions (student exercise submissions with optional grade)
create table public.submissions (
  id           uuid primary key default gen_random_uuid(),
  material_id  uuid not null references public.materials (id) on delete cascade,
  student_id   uuid not null references public.profiles (id) on delete cascade,
  file_path    text not null,
  file_name    text not null,
  mime_type    text not null,
  size_bytes   bigint not null check (size_bytes > 0 and size_bytes <= 83886080),
  grade        numeric(5,2) check (grade >= 0 and grade <= 100),
  graded_by    uuid references public.profiles (id),
  graded_at    timestamptz,
  created_at   timestamptz not null default now(),
  unique (material_id, student_id)
);

-- 2h. Material views (analytics tracking)
create table public.material_views (
  id           uuid primary key default gen_random_uuid(),
  material_id  uuid not null references public.materials (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  viewed_at    timestamptz not null default now()
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
create index courses_instructor_idx on public.courses (instructor_id);
create index enrollments_student_idx on public.enrollments (student_id, course_id);
create index enrollments_course_idx on public.enrollments (course_id);
create index materials_course_idx on public.materials (course_id, type, created_at desc);
create index comments_material_idx on public.comments (material_id, created_at asc);
create index submissions_material_idx on public.submissions (material_id);
create index submissions_student_idx on public.submissions (student_id, material_id);
create index material_views_material_idx on public.material_views (material_id);
create index material_views_user_idx on public.material_views (user_id, material_id);

-- ============================================================
-- 4. FUNCTIONS AND TRIGGERS
-- ============================================================

-- 4a. Auto-create a profile at sign-up (reads full_name and role from sign-up metadata)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'student')::public.user_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4b. Helper: is the current user an instructor?
create or replace function public.is_instructor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'instructor'
  );
$$;

-- 4c. Helper: is the current user enrolled in this course (or the instructor)?
create or replace function public.is_enrolled(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.courses c
    where c.id = p_course_id and c.instructor_id = (select auth.uid())
  )
  or exists (
    select 1 from public.enrollments e
    where e.course_id = p_course_id and e.student_id = (select auth.uid())
  );
$$;

-- 4d. Enrollment RPC: enroll a student using a join code
create or replace function public.enroll_with_code(p_join_code text)
returns uuid  -- returns the course_id
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_id uuid;
  v_user_id   uuid;
  v_role      public.user_role;
begin
  v_user_id := (select auth.uid());

  -- Verify caller is a student
  select role into v_role from public.profiles where id = v_user_id;
  if v_role is null or v_role != 'student' then
    raise exception 'Only students can enroll in courses.';
  end if;

  -- Look up the course by join code (case-insensitive)
  select id into v_course_id
  from public.courses
  where join_code = upper(trim(p_join_code));

  if v_course_id is null then
    raise exception 'No course found with this code. Check the code and try again.';
  end if;

  -- Insert enrollment (idempotent: ignore if already enrolled)
  insert into public.enrollments (course_id, student_id)
  values (v_course_id, v_user_id)
  on conflict (course_id, student_id) do nothing;

  return v_course_id;
end;
$$;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.courses        enable row level security;
alter table public.enrollments    enable row level security;
alter table public.materials      enable row level security;
alter table public.comments       enable row level security;
alter table public.submissions    enable row level security;
alter table public.material_views enable row level security;

-- ----- PROFILES -----
-- Readable by signed-in users; no client-side writes (trigger only)
create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated using (true);

-- ----- COURSES -----
-- Instructors see their own courses; students see enrolled courses
create policy "courses_select_enrolled_or_owner"
  on public.courses for select to authenticated
  using (
    instructor_id = (select auth.uid())
    or exists (
      select 1 from public.enrollments e
      where e.course_id = id and e.student_id = (select auth.uid())
    )
  );

create policy "courses_insert_instructor"
  on public.courses for insert to authenticated
  with check (instructor_id = (select auth.uid()) and public.is_instructor());

create policy "courses_update_owner"
  on public.courses for update to authenticated
  using (instructor_id = (select auth.uid()))
  with check (instructor_id = (select auth.uid()));

create policy "courses_delete_owner"
  on public.courses for delete to authenticated
  using (instructor_id = (select auth.uid()));

-- ----- ENROLLMENTS -----
-- No INSERT policy: enrollment happens via enroll_with_code() SECURITY DEFINER function
-- SELECT: the enrolled student or the course instructor
create policy "enrollments_select_participant"
  on public.enrollments for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.courses c
      where c.id = course_id and c.instructor_id = (select auth.uid())
    )
  );

-- DELETE: student can unenroll, or instructor can remove a student
create policy "enrollments_delete_participant"
  on public.enrollments for delete to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.courses c
      where c.id = course_id and c.instructor_id = (select auth.uid())
    )
  );

-- ----- MATERIALS -----
-- Readable by course owner or enrolled students
create policy "materials_select_enrolled_or_owner"
  on public.materials for select to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_id
      and (
        c.instructor_id = (select auth.uid())
        or exists (
          select 1 from public.enrollments e
          where e.course_id = c.id and e.student_id = (select auth.uid())
        )
      )
    )
  );

create policy "materials_insert_course_owner"
  on public.materials for insert to authenticated
  with check (
    uploader_id = (select auth.uid())
    and public.is_instructor()
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.instructor_id = (select auth.uid())
    )
  );

create policy "materials_delete_course_owner"
  on public.materials for delete to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_id and c.instructor_id = (select auth.uid())
    )
  );

-- ----- COMMENTS -----
-- Readable by enrolled users or course owner
create policy "comments_select_enrolled"
  on public.comments for select to authenticated
  using (
    exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id
      and (
        c.instructor_id = (select auth.uid())
        or exists (
          select 1 from public.enrollments e
          where e.course_id = c.id and e.student_id = (select auth.uid())
        )
      )
    )
  );

-- Insert: enrolled user or course owner, as themselves
create policy "comments_insert_enrolled"
  on public.comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id
      and (
        c.instructor_id = (select auth.uid())
        or exists (
          select 1 from public.enrollments e
          where e.course_id = c.id and e.student_id = (select auth.uid())
        )
      )
    )
  );

-- Delete: comment author or course instructor
create policy "comments_delete_author_or_instructor"
  on public.comments for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id and c.instructor_id = (select auth.uid())
    )
  );

-- ----- SUBMISSIONS -----
-- Insert: enrolled students, for exercises only, as themselves
create policy "submissions_insert_enrolled_student"
  on public.submissions for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id
      and m.type = 'exercise'
      and exists (
        select 1 from public.enrollments e
        where e.course_id = c.id and e.student_id = (select auth.uid())
      )
    )
  );

-- Select: own submissions or course instructor
create policy "submissions_select_own_or_instructor"
  on public.submissions for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id and c.instructor_id = (select auth.uid())
    )
  );

-- Update: course instructor only (for grading)
create policy "submissions_update_grade_instructor"
  on public.submissions for update to authenticated
  using (
    exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id and c.instructor_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id and c.instructor_id = (select auth.uid())
    )
  );

-- Delete: student can delete their own submission (for resubmission cleanup)
create policy "submissions_delete_own"
  on public.submissions for delete to authenticated
  using (student_id = (select auth.uid()));

-- ----- MATERIAL VIEWS -----
-- Insert: enrolled user or course owner, as themselves
create policy "material_views_insert_enrolled"
  on public.material_views for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id
      and (
        c.instructor_id = (select auth.uid())
        or exists (
          select 1 from public.enrollments e
          where e.course_id = c.id and e.student_id = (select auth.uid())
        )
      )
    )
  );

-- Select: own views or course instructor (for analytics)
create policy "material_views_select_own_or_instructor"
  on public.material_views for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id and c.instructor_id = (select auth.uid())
    )
  );

-- ============================================================
-- 6. STORAGE: private buckets, 80 MB, PDF / PPT / PPTX only
-- ============================================================

-- 6a. Materials bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lms-files', 'lms-files', false, 83886080,
  array[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do nothing;

-- 6b. Submissions bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submission-files', 'submission-files', false, 83886080,
  array[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do nothing;

-- ----- LMS-FILES STORAGE POLICIES -----
-- Read: course owner or enrolled students
create policy "lms_files_select_enrolled_or_owner"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lms-files'
    and (
      exists (
        select 1 from public.courses c
        where c.id::text = (storage.foldername(name))[1]
          and c.instructor_id = (select auth.uid())
      )
      or exists (
        select 1 from public.courses c
        join public.enrollments e on e.course_id = c.id
        where c.id::text = (storage.foldername(name))[1]
          and e.student_id = (select auth.uid())
      )
    )
  );

-- Insert: course owner only
create policy "lms_files_insert_course_owner"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lms-files'
    and exists (
      select 1 from public.courses c
      where c.id::text = (storage.foldername(name))[1]
        and c.instructor_id = (select auth.uid())
    )
  );

-- Delete: course owner only
create policy "lms_files_delete_course_owner"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'lms-files'
    and exists (
      select 1 from public.courses c
      where c.id::text = (storage.foldername(name))[1]
        and c.instructor_id = (select auth.uid())
    )
  );

-- ----- SUBMISSION-FILES STORAGE POLICIES -----
-- Read: course owner or enrolled students
create policy "submission_files_select_enrolled_or_owner"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'submission-files'
    and (
      exists (
        select 1 from public.courses c
        where c.id::text = (storage.foldername(name))[1]
          and c.instructor_id = (select auth.uid())
      )
      or exists (
        select 1 from public.courses c
        join public.enrollments e on e.course_id = c.id
        where c.id::text = (storage.foldername(name))[1]
          and e.student_id = (select auth.uid())
      )
    )
  );

-- Insert: enrolled students only
create policy "submission_files_insert_enrolled_student"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submission-files'
    and exists (
      select 1 from public.courses c
      join public.enrollments e on e.course_id = c.id
      where c.id::text = (storage.foldername(name))[1]
        and e.student_id = (select auth.uid())
    )
  );

-- Delete: submitting student or course instructor
create policy "submission_files_delete_own_or_instructor"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'submission-files'
    and (
      exists (
        select 1 from public.courses c
        where c.id::text = (storage.foldername(name))[1]
          and c.instructor_id = (select auth.uid())
      )
      or exists (
        select 1 from public.courses c
        join public.enrollments e on e.course_id = c.id
        where c.id::text = (storage.foldername(name))[1]
          and e.student_id = (select auth.uid())
      )
    )
  );
```

> **Security note:** the sign-up role comes from client metadata so the demo works without an admin. That is acceptable and is listed as a known limitation. Do not "fix" it by widening policies.

> **Join code note:** the `generate_join_code()` function uses a 30-character alphabet (excluding 0/O/1/I to avoid visual confusion), producing 30^6 ≈ 729 million possible codes. Collisions are retried automatically. The `UNIQUE` constraint on `courses.join_code` is a safety net.

## Appendix D: EAS and deployment config

**`eas.json`** (generated by `eas build:configure`; ensure the `preview` profile matches)

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "<YOUR_SUPABASE_URL>",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "<YOUR_ANON_OR_PUBLISHABLE_KEY>"
      }
    }
  }
}
```

**Commands**

| Goal | Command |
|---|---|
| Android APK | `eas build -p android --profile preview` |
| Web export | `npx expo export --platform web` |
| Preview web locally | `npx serve dist` |
| Clear Metro cache | `npx expo start -c` |
| Dependency health | `npx expo-doctor` |

**`vercel.json`** (if using Vercel)

```json
{
  "buildCommand": "npx expo export --platform web",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**`public/_redirects`** (if using Netlify)

```
/*  /index.html  200
```

## Appendix E: QA matrix

Mark each **Pass / Fail** with a note. Tests marked **MUST** block the release.

| ID | Area | Test | Platform | Must |
|---|---|---|---|:---:|
| A1 | Auth | Sign up as student; profile row has role `student` | Emulator | MUST |
| A2 | Auth | Sign up as instructor; role `instructor` | Emulator | MUST |
| A3 | Auth | Wrong password shows the mapped message | Emulator | MUST |
| A4 | Auth | Session persists after app restart | Emulator | MUST |
| A5 | Auth | Sign out returns to sign-in; back button does not reveal the app | Emulator + Web | MUST |
| E1 | Enrollment | Student enrolls with valid join code; course appears in dashboard | Emulator | MUST |
| E2 | Enrollment | Invalid join code shows "No course found with this code…" | Emulator | MUST |
| E3 | Enrollment | Instructor cannot access enroll screen (redirect) | Emulator | MUST |
| E4 | Enrollment | Re-entering the same code does not duplicate the enrollment | Emulator | MUST |
| E5 | Enrollment | Non-enrolled student cannot see another instructor's course | Emulator | MUST |
| E6 | Enrollment | Join code is visible to instructor on course detail | Emulator | MUST |
| C1 | Courses | Instructor creates a course; appears at the top with auto-generated join code | Emulator | MUST |
| C2 | Courses | Student sees no "Create course" button; sees "Join a course" button | Emulator | MUST |
| C3 | Courses | Empty, loading, and error states render correctly for both roles | Emulator | MUST |
| C4 | Courses | Duplicate course code shows friendly message | Emulator | |
| F1 | Files | Upload a PDF (single); downloaded copy from Supabase opens and size matches | Emulator | MUST |
| F2 | Files | Upload a PPTX (single); same checks | Emulator | MUST |
| F3 | Files | `.docx` rejected with exact message | Emulator | MUST |
| F4 | Files | File over 80 MB rejected with exact message | Emulator | MUST |
| F5 | Files | Student cannot see Upload button | Emulator | MUST |
| F6 | Files | Instructor B cannot upload into Instructor A's course | Script (P6.3) | MUST |
| F7 | Files | Student opens a PDF and a PPTX | Phone | MUST |
| F8 | Files | Signed link stops working after expiry | Manual / script | |
| F9 | Files | Batch upload: 3 files (2 valid, 1 invalid); 2 succeed, 1 flagged; summary correct | Emulator | MUST |
| F10 | Files | RAM does not spike by 80 MB during upload (OOM-safe) | Android Profiler | MUST |
| F11 | Files | Delete a material: storage object removed FIRST, then DB row | Emulator + Supabase | MUST |
| F12 | Files | Opening a material creates a material_views row | Supabase Table Editor | MUST |
| CM1 | Comments | Add a comment on a material; appears with name, role badge, timestamp | Emulator | MUST |
| CM2 | Comments | Delete own comment; removed | Emulator | MUST |
| CM3 | Comments | Instructor deletes a student's comment; removed | Emulator | MUST |
| CM4 | Comments | Student cannot delete another student's comment | Emulator | MUST |
| CM5 | Comments | Non-enrolled student cannot add a comment (RLS) | Script (P6.3) | MUST |
| S1 | Submissions | Student submits a PDF for an exercise; submission row and file in bucket | Emulator | MUST |
| S2 | Submissions | Student resubmits; old file removed, new file uploaded, grade reset | Emulator | MUST |
| S3 | Submissions | Non-enrolled student cannot submit (RLS) | Script (P6.3) | MUST |
| S4 | Submissions | Instructor cannot access submit screen (redirect) | Emulator | MUST |
| G1 | Grading | Instructor sees all submissions for an exercise | Emulator | MUST |
| G2 | Grading | Instructor opens a submission file (signed URL) | Emulator | MUST |
| G3 | Grading | Instructor enters a grade (0-100); saved and visible to student | Emulator | MUST |
| G4 | Grading | Invalid grade (>100, negative, text) shows inline error | Emulator | MUST |
| G5 | Grading | Student cannot grade (RLS) | Script (P6.3) | MUST |
| AN1 | Analytics | Instructor analytics: enrolled count matches enrollments | Emulator | MUST |
| AN2 | Analytics | Instructor analytics: view counts match material_views rows | Emulator | MUST |
| AN3 | Analytics | Instructor analytics: average grades calculated correctly | Emulator | MUST |
| AN4 | Analytics | Student analytics: average grade, submission ratio, view ratio correct | Emulator | MUST |
| AN5 | Analytics | Empty course analytics: shows zeros and dashes, no crash | Emulator | MUST |
| B1 | Brand | Brand audit (P5.1) re-run shows 0 violations | Code | MUST |
| B2 | Brand | Only Plus Jakarta Sans and Inter appear | Emulator + Web | MUST |
| B3 | Brand | Launcher icon and splash are correct | Phone | MUST |
| W1 | Web | Full flow works in desktop Chrome (including enrollment, comments, grading, analytics) | Web | MUST |
| W2 | Web | Deep link refresh does not 404 | Web | MUST |
| W3 | Web | Opens and signs in on iPhone Safari | iPhone | |
| R1 | Resilience | Airplane mode shows the offline message, no crash | Emulator | MUST |
| R2 | Resilience | Expired session returns to sign-in with message | Emulator | |
| D1 | Release | APK installs on a physical Android phone and runs full flow | Phone | MUST |
| D2 | Release | RLS script passes all checks | Script | MUST |
| D3 | Release | No secrets in Git history (except the public anon key) | Repo | MUST |
| LC1 | Leave course | Student leaves a course; course disappears from dashboard; enrollment row deleted | Emulator | MUST |
| LC2 | Leave course | After leaving, student cannot see the course's materials (RLS) | Emulator + Script (P6.3) | MUST |
| RS1 | Remove student | Instructor removes a student; student loses access; enrollment row deleted | Emulator | MUST |
| RS2 | Remove student | Removed student cannot see the course's materials (RLS) | Script (P6.3) | MUST |
| RS3 | Remove student | Student cannot remove another student (RLS) | Script (P6.3) | MUST |
| DC1 | Delete course | Instructor deletes a course; all storage files removed; course row cascaded | Emulator + Supabase | MUST |
| DC2 | Delete course | After deletion, course does not appear in any student's dashboard | Emulator | MUST |
| DC3 | Delete course | Student cannot delete a course (RLS) | Script (P6.3) | MUST |
| DC4 | Delete course | Instructor B cannot delete Instructor A's course (RLS) | Script (P6.3) | MUST |
| TS1 | Timestamps | Comment timestamps display in 24-hour military time with PHT label | Emulator + Web | MUST |

## Appendix F: Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Tailwind classes have no effect | Metro cache or missing `import "../global.css"` | `npx expo start -c`; confirm `global.css` is imported in `app/_layout.tsx` and `metro.config.js` uses `withNativeWind` |
| "Unknown utility class" error | Using a color or size outside the tokens | Use a token from Appendix A; do not add colors |
| Fonts look like the system font | Font not loaded or wrong family name | Check `useFonts` names match `fontFamily` tokens exactly; do not use `fontWeight` |
| Env values are `undefined` | `.env` missing, wrong prefix, or no restart | Names must start with `EXPO_PUBLIC_`; restart with `-c` |
| APK opens but cannot sign in | Env values missing from the build | Add them to `eas.json` `preview.env`, rebuild |
| Uploaded file is 0 bytes | Blob/FormData from a `file://` URI without proper streaming | Use `FileSystem.uploadAsync` (Approach A) or FormData with URI (Approach B) per P4.1; verify size after upload |
| **App crashes (OOM) during upload** | **File read into RAM as Base64 or ArrayBuffer** | **NEVER read files into memory. Use `FileSystem.uploadAsync` or `FormData` with local URIs (FH-2). This is critical at 80 MB.** |
| Upload rejected: "mime type not supported" | Picker reported `application/octet-stream` | Set `contentType` from the file extension |
| `new row violates row-level security policy` | Wrong role, not enrolled, wrong folder, or not the course owner | Check `profiles.role`, enrollment status, the course `instructor_id`, and that the path starts with the course id |
| Login works then app loops or freezes | Supabase call inside `onAuthStateChange` | Set state in the callback only; fetch the profile in a separate effect (DT-5) |
| Web blank page or `window is not defined` | Static rendering with browser storage | Ensure `web.output` is `"single"` in `app.json` |
| Web deep link 404 on refresh | No SPA fallback | Add `vercel.json` rewrites or `public/_redirects` (Appendix D) |
| Reanimated / NativeWind build error after install | Version mismatch | Run `npx expo install --fix` and `npx expo-doctor`; report the output instead of forcing installs (DP-3) |
| Emulator cannot reach the internet | AVD network issue | Cold boot the AVD; check host connection; restart `adb` |
| Join code not generated on course creation | `generate_join_code()` function missing or not set as DEFAULT | Re-run Appendix C SQL; verify the function exists and `courses.join_code` has the correct default |
| Enrollment RPC fails with "function not found" | `enroll_with_code` not created | Re-run Appendix C SQL; verify with `select proname from pg_proc where proname = 'enroll_with_code'` |
| Student can see all courses (not enrollment-scoped) | Old RLS policy `courses_select_authenticated using (true)` still exists | Drop the old policy and create `courses_select_enrolled_or_owner` from Appendix C |
| Orphan files in storage after deletion | Row deleted before storage file, or storage delete skipped | Ensure `deleteMaterial` follows safe two-step: storage FIRST, then row (FH-3) |
| Submission replaces but old file remains | Old submission's storage file not deleted before new upload | Ensure resubmission flow deletes old storage file with safe two-step before uploading new file |
| Grade not visible to student | Submissions SELECT RLS too restrictive | Verify `submissions_select_own_or_instructor` policy allows students to read their own rows |
| Analytics show wrong counts | Aggregate queries not scoped to the correct course | Verify all analytics queries filter by course_id through the materials -> courses join |
| Student can still see a course after leaving | Enrollment row not deleted or RLS cache stale | Verify `unenrollFromCourse` deletes the enrollment row; refetch the courses list after unenroll |
| Delete course leaves orphan files in storage | Storage files not cleaned up before cascade | Ensure `deleteCourse` lists and deletes all objects in both buckets before deleting the course row |
| Instructor cannot see enrolled students list | Missing `listEnrolledStudents` query or RLS too restrictive | Verify the `enrollments_select_participant` policy allows the course instructor to read enrollments |
| Comment timestamps show AM/PM or relative time | `formatCommentTimestamp` not used or implemented incorrectly | Ensure all CommentItem components call `formatCommentTimestamp` (24-hour PHT); never use `formatRelativeTime` for comments |
