# Phase 3 Handoff — ClassVault

## What was built

### Authentication & enrollment (Phase 1–2)
- Sign-up / sign-in with role selection (instructor / student)
- Join-code enrollment via `enroll_with_code` RPC (SECURITY DEFINER)
- Courses dashboard with `useFocusEffect` refresh

### Course management
| Screen | File | Who can see it |
|---|---|---|
| Courses dashboard | `app/(app)/(tabs)/index.tsx` | All authenticated users |
| Create course | `app/(app)/course/new.tsx` | Instructors only (redirects students) |
| Course detail | `app/(app)/course/[id].tsx` | Enrolled students + course instructor |
| Material detail | `app/(app)/course/[id]/material/[materialId].tsx` | Enrolled students + course instructor |

### RLS policy fix applied in Supabase
`courses_select_enrolled_or_owner` had a bug: `e.course_id = e.id` (self-reference).
Fixed to `e.course_id = public.courses.id`. The fix is in `supabase/migrations/0001_init.sql`
and was applied live in the Supabase SQL editor.

### Components
| Component | File | Purpose |
|---|---|---|
| `MaterialRow` | `src/components/courses/MaterialRow.tsx` | Card row for materials list |
| `CommentItem` | `src/components/comments/CommentItem.tsx` | Single comment with delete confirm |
| `CommentInput` | `src/components/comments/CommentInput.tsx` | Sticky bottom comment bar |

### Services & hooks added
| File | Exports |
|---|---|
| `src/services/submissions.ts` | `getStudentSubmission(materialId, studentId)` |
| `src/hooks/useMaterial.ts` | `useMaterial(materialId)` |

---

## Open slots for other members

### Member 4 — File upload & open
1. **"Open file" button** in `app/(app)/course/[id]/material/[materialId].tsx`
   - Find the comment: `* "Open file" slot — Member 4 wires this button`
   - Add `onOpenFile` prop or inline handler that calls `supabase.storage.from('lms-files').createSignedUrl(material.file_path, 3600)` then opens with `expo-web-browser`
   - Remove `disabled` prop from the Button once wired

2. **Upload material button** in `app/(app)/course/[id].tsx`
   - Find the comment: `* headerAction slot — Member 4 inserts the Upload material button here`
   - Add a primary Button that navigates to the upload screen

3. **Submit screen** at `app/(app)/course/[id]/material/[materialId]/submit.tsx`
   - Use `expo-document-picker` to pick PDF/PPT/PPTX (max 80 MB)
   - Upload via `FileSystem.uploadAsync` to `submission-files/{courseId}/{studentId}/{filename}` (FH-2)
   - Insert row into `submissions` table
   - On success navigate back and trigger a refetch

### Member 5 — Analytics & submissions list
1. **Course analytics** at `app/(app)/course/[id]/analytics.tsx`
   - Instructor view: total students, materials count, view counts per material
   - Student view: own submission grades, materials viewed

2. **Submissions list** at `app/(app)/course/[id]/submissions/[materialId].tsx`
   - Instructor only: list all student submissions for an exercise
   - Each row: student name, submitted date, grade (if set), "Grade" button
   - Grade action: inline 0–100 input, calls `submissions` UPDATE (RLS: `submissions_update_grade_instructor`)

---

## Security summary

| Action | RLS policy |
|---|---|
| Read courses | `courses_select_enrolled_or_owner` |
| Create course | `courses_insert_instructor` |
| Delete course | `courses_delete_owner` |
| Read materials | `materials_select_enrolled_or_owner` |
| Upload material | `materials_insert_course_owner` |
| Read comments | `comments_select_enrolled` |
| Post comment | `comments_insert_enrolled` |
| Delete comment | `comments_delete_author_or_instructor` |
| Submit exercise | `submissions_insert_enrolled_student` |
| Read submission | `submissions_select_own_or_instructor` |
| Grade submission | `submissions_update_grade_instructor` |
| Remove student | `enrollments_delete_participant` |
| Leave course | `enrollments_delete_participant` |
| Read files | `lms_files_select_enrolled_or_owner` |
| Read submission files | `submission_files_select_enrolled_or_owner` |

All buckets are **private**. Files are served only via short-lived signed URLs (1 hour). Never make a bucket public (SEC-5).

---

## Running the project

```bash
cd ClassVault
npx expo start
# Web: press W
# Android: press A (requires emulator or device)
```

Requires `.env` with:
```
EXPO_PUBLIC_SUPABASE_URL=https://orbuouiinkfjiedcgbmu.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

## Known limitations / risks
- `Open file` button is disabled until Member 4 wires the signed URL + browser open
- Course analytics and submissions list screens show unmatched route until Member 5 builds them
- `npx tsc --noEmit` should be run after Member 4 adds `expo-document-picker` usage
