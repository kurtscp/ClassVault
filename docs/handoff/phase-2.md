# Phase 2 Hand-Off Note: Authentication & Enrollment

**Author:** Member 2 (Authentication & Enrollment)  
**Recipient:** Member 3 (Database, Dashboard & Comments)  
**Date:** November 16, 2026  
**Status:** Completed & Phase Gate Passed  

---

## Rules Block (A1)

```text
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
```

---

## 1. What Was Built

### Services (`src/services/`)
- `src/services/auth.ts`: Typed Supabase auth methods (`signUp`, `signIn`, `signOut`, `getProfile`, `getSession`, `onAuthStateChange`). Errors thrown as `AppError` mapped via `toUserMessage()`. `getProfile` queries `id, full_name, role` via `.single()`.
- `src/services/enrollment.ts`:
  - `enrollWithCode(joinCode)`: Invokes `supabase.rpc('enroll_with_code', { p_join_code })`. Returns enrolled `course_id`.
  - `getMyEnrollments(studentId)`: Queries `enrollments` table selecting `course_id`.
  - `unenrollFromCourse(courseId)`: Deletes enrollment row for the authenticated student (`student_id = auth.uid()`).

### Hooks & Types (`src/hooks/`, `src/types/`)
- `src/types/auth.ts`: `AuthStatus`, `AuthProfile`, `SignUpParams`, `SignInParams`, `AuthResult`, and `AuthContextValue`.
- `src/hooks/useAuth.tsx`: `<AuthProvider>` and `useAuth()` exposing `{ session, user, profile, role, status, signIn, signUp, signOut }`. On-mount session restore, DT-5 compliant `onAuthStateChange` subscription, and 3x 500 ms retry for profile trigger resolution.
- `src/hooks/useEnrollment.ts`: `useEnrollment(options?: { onCoursesRefetch?: () => void })` exposing `{ enroll, isEnrolling, unenroll, isUnenrolling, error }`. Automates post-action navigation and courses refetch triggers.

### Feature Components (`src/components/`)
- `src/components/auth/AuthHeader.tsx`: Unified brand lockup header (`LogoStacked` 120px for sign-in; `Mark` 48px for sign-up).
- `src/components/enrollment/EnrollButton.tsx`: Secondary "Join a course" button with `UserPlus` icon that navigates to `/enroll`. Conditionally rendered only when `role === 'student'`.

### Screens & Navigation Layouts (`app/`)
- `app/_layout.tsx`: Root layout with `<AuthProvider>`, splash screen delay until fonts and session/profile are ready, and `Stack.Protected` route guards.
- `app/(auth)/_layout.tsx`: Auth layout redirecting authenticated users to `/(app)/(tabs)/index`.
- `app/(auth)/sign-in.tsx`: Sign In screen with inline validation, password toggle, server error mapping, and ghost sign-up link.
- `app/(auth)/sign-up.tsx`: Sign Up screen with full name, email, password, role `Segmented` control, client validation, and ghost sign-in link.
- `app/(app)/_layout.tsx`: App layout redirecting unauthenticated users to `/(auth)/sign-in`.
- `app/(app)/(tabs)/_layout.tsx`: Bottom Tabs layout ("Courses" and "Profile") with `tailwind.config.js` token theme helper and Lucide icons.
- `app/(app)/(tabs)/index.tsx`: Minimal Courses placeholder screen displaying `"Signed in as <full name> (<role>)"` (owned by Member 3 to replace in P3.2).
- `app/(app)/(tabs)/profile.tsx`: Profile screen with avatar circle, metadata badge, inline sign-out confirmation, and app version caption.
- `app/(app)/enroll.tsx`: Student join code entry screen with input validation, error mapping, and instructor redirect.

---

## 2. How to Run and Test It

1. **Start Development Server:**
   ```bash
   cd ClassVault
   npx expo start -c
   ```
2. **Student Flow:**
   - Sign up a new account selecting "Student".
   - Verify `profiles` table in Supabase shows `role = 'student'`.
   - The app navigates to the Courses tab showing `"Signed in as <full name> (student)"`.
   - Tap "Profile" tab: verify full name, email, and "Student" badge.
   - Tap "Sign out", confirm inline: verify you are returned to Sign In and cannot navigate back.
3. **Instructor Flow:**
   - Sign up a new account selecting "Instructor".
   - Verify `profiles` table shows `role = 'instructor'`.
   - Attempt to navigate to `/enroll`: verify immediate redirect to Courses dashboard.
4. **Enrollment Flow:**
   - As a student, navigate to `/enroll`.
   - Enter an invalid 6-character code (e.g. `ZZZZZZ`): verify error `"No course found with this code. Check the code and try again."`.
   - Enter a valid course join code: verify successful enrollment and navigation to `/course/<course_id>`.

---

## 3. Public Interfaces for Member 3

### `useAuth()`
```tsx
import { useAuth } from '@/hooks/useAuth';

const { user, profile, role, status } = useAuth();
// role is 'instructor' | 'student' | null
// profile has { id, full_name, role }
```

### `useEnrollment()`
```tsx
import { useEnrollment } from '@/hooks/useEnrollment';

const { enroll, isEnrolling, unenroll, isUnenrolling, error } = useEnrollment({
  onCoursesRefetch: refetchCourses, // optional callback
});
```

### `EnrollButton`
```tsx
import { EnrollButton } from '@/components/enrollment';

// Mount directly inside the Courses dashboard; automatically hides if caller is an instructor
<EnrollButton />
```

### `getMyEnrollments`
```tsx
import { getMyEnrollments } from '@/services/enrollment';

const courseIds = await getMyEnrollments(studentId);
```

---

## 4. Known Issues & Deliberate Shortcuts

- `app/(app)/(tabs)/index.tsx` was implemented as a minimal placeholder screen to allow route verification; Member 3 will replace it in P3.2 with the complete Courses dashboard.
- `app/(app)/course/[id].tsx` is owned by Member 3; `useEnrollment` pushes `/course/${courseId}` which will resolve once Member 3 builds P3.4.

---

## 5. What the Next Phase Must NOT Change

- **DT-1 & DT-5:** Do not call Supabase directly in screens; all calls must route through `src/services/*`. Never perform Supabase queries inside `onAuthStateChange`.
- **SEC-2 & SEC-6:** Do not disable RLS or write `using (true)` write policies. Role-specific UI visibility must always be backed by RLS.
- **BR-1..BR-4:** Do not introduce hex codes, arbitrary spacing, or raw `Text` imports from `react-native`. Always use components from `src/components/ui`.
- **ST-5:** Strict TypeScript mode is locked; no `any`, `@ts-ignore`, or non-null `!` assertions.
- **PR-3:** Respect file ownership in `OWNERS.md`.
