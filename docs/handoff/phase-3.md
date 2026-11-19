# Phase 3 Handoff — ClassVault

> **Stack rules (locked):** Expo SDK 58 + TypeScript strict + expo-router · NativeWind v4 +
> Tailwind 3.4 · Supabase only (no Firebase, no state libs) · lucide-react-native icons only ·
> No `any`, no `!`, no `@ts-ignore`. Read the full A1 rules doc before touching any file.

---

## 1. What was built

### Screens

| Route | File | Access |
|---|---|---|
| Courses dashboard | `app/(app)/(tabs)/index.tsx` | All authenticated users |
| Create course | `app/(app)/course/new.tsx` | Instructor only (redirects students) |
| Course detail | `app/(app)/course/[id].tsx` | Enrolled student or course instructor |
| Material detail + comments | `app/(app)/course/[id]/material/[materialId].tsx` | Enrolled student or course instructor |
| Join course | `app/(app)/enroll.tsx` | Student only |

### Services (`src/services/`)

| File | Exports |
|---|---|
| `auth.ts` | `signIn`, `signUp`, `signOut`, `getProfile`, `getSession`, `onAuthStateChange` |
| `courses.ts` | `listCourses`, `getCourse`, `createCourse`, `deleteCourse`, `listEnrolledStudents`, `removeStudent` |
| `enrollment.ts` | `enrollWithCode`, `getMyEnrollments`, `unenrollFromCourse` |
| `materials.ts` | `listMaterials`, `getMaterial`, `listMaterialsWithSubmissionStatus` |
| `comments.ts` | `listComments`, `addComment`, `deleteComment` |
| `submissions.ts` | `getStudentSubmission(materialId, studentId)` |

### Hooks (`src/hooks/`)

`useAuth` · `useCourses` · `useCourse` · `useMaterials` · `useMaterial` · `useComments` · `useEnrollment` · `useAsync`

### Components

| Component | File | Props |
|---|---|---|
| `MaterialRow` | `src/components/courses/MaterialRow.tsx` | `material`, `onPress?`, `showStatus?` |
| `CommentItem` | `src/components/comments/CommentItem.tsx` | `comment`, `isOwn`, `isInstructor`, `onDelete`, `isDeleting` |
| `CommentInput` | `src/components/comments/CommentInput.tsx` | `onSubmit`, `isSubmitting` |

### UI kit (`src/components/ui/`)

`Button` · `Input` · `Text` · `Card` · `Badge` · `Segmented` · `EmptyState` · `Skeleton` · `Screen` · `StatCard` · `Logo`

---

## 2. How to run and test

```bash
cd ClassVault
npx expo start          # then press W for web
```

`.env` must contain (no spaces around `=`):
```
EXPO_PUBLIC_SUPABASE_URL=https://orbuouiinkfjiedcgbmu.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

**Test accounts** — create via the sign-up screen, choose role:
- One **Instructor** account
- One **Student** account

**Minimal test data** — run once in Supabase SQL Editor:
```sql
-- Replace UUIDs with your instructor profile id and a real course id
insert into public.materials (course_id, uploader_id, title, type,
  file_path, file_name, mime_type, size_bytes)
values (
  '<course_id>', '<instructor_profile_id>',
  'Test Presentation', 'presentation',
  'test/placeholder.pdf', 'placeholder.pdf', 'application/pdf', 102400
);
```

**Test flow:**
1. Instructor: create a course → copy join code
2. Student: join course with code → see course card on dashboard
3. Student: tap course → tap material row → post comment → delete own comment
4. Instructor: open same material → delete student's comment → tap "Delete course" → confirm

---

## 3. Public interfaces for the next phase

### Open slots in existing screens

**`app/(app)/course/[id].tsx`** — `headerAction` slot
```
// Find this comment in the file:
// * headerAction slot — Member 4 inserts the Upload material button here.
// Add a Button that navigates to your upload screen.
```

**`app/(app)/course/[id]/material/[materialId].tsx`** — Open file slot
```
// Find this comment:
// * "Open file" slot — Member 4 wires this button
// Remove the `disabled` prop and add an onPress that:
//   1. Calls supabase.storage.from('lms-files').createSignedUrl(material.file_path, 3600)
//   2. Opens the URL with expo-web-browser
// Never log signed URLs (SEC-4).
```

### Key service signatures next phase will call

```ts
// Get a student's own submission for an exercise
getStudentSubmission(materialId: string, studentId: string): Promise<Submission | null>

// List materials with submission status (student view)
listMaterialsWithSubmissionStatus(courseId, type?, studentId?): Promise<MaterialWithStatus[]>

// Grade a submission — you must write this in services/submissions.ts
// UPDATE submissions SET grade=X WHERE id=Y
// RLS: submissions_update_grade_instructor
```

### Routes to build

| Route | Owner | Notes |
|---|---|---|
| `app/(app)/course/[id]/analytics.tsx` | Member 5 | "Course analytics" button already routes here |
| `app/(app)/course/[id]/submissions/[materialId].tsx` | Member 5 | "View submissions" button already routes here |
| `app/(app)/course/[id]/material/[materialId]/submit.tsx` | Member 4 | "Submit" button already routes here |

---

## 4. Known issues and deliberate shortcuts

- **`router.back()` warning on web** — dev-only warning when you hard-refresh a deep URL (no history stack). Not a bug; safe to ignore in development.
- **"Open file" button is disabled** — intentional slot. Member 4 must wire it.
- **`courses_select_enrolled_or_owner` RLS bug was fixed live** — the original migration had `e.course_id = e.id` (wrong). Fixed to `e.course_id = public.courses.id` in both Supabase and `supabase/migrations/0001_init.sql`.
- **`useFocusEffect` on courses dashboard** — refetches on every focus. Acceptable at this scale; not debounced.
- **Comment count badge** uses `comments.length` from already-loaded data — no extra query needed.

---

## 5. What the next phase must NOT change

- `src/types/database.ts` — single source of truth for all table types. Add new types; never rename or remove existing ones.
- `src/lib/errors.ts` — `toUserMessage()` mapping. Add new cases; never remove existing ones.
- `src/lib/format.ts` — `formatCommentTimestamp()` must stay 24-hour PHT. Never change to 12-hour.
- `tailwind.config.js` — brand tokens are locked. No new colors, no hex codes, no arbitrary values.
- `supabase/migrations/0001_init.sql` — do not re-run this file. Schema changes need a new numbered migration file.
- RLS policies — never disable RLS, never add `using (true)` on write policies (SEC-2).
- Both storage buckets (`lms-files`, `submission-files`) must stay **private** (SEC-5).
- `src/components/ui/` — do not restyle or modify existing UI components. Add new ones if needed.
