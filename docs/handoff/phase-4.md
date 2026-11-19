# Phase 4 Handoff — ClassVault

> **Stack rules (locked):** Expo SDK 58 + TypeScript strict + expo-router · NativeWind v4 +
> Tailwind 3.4 · Supabase only (no Firebase, no state libs) · lucide-react-native icons only ·
> No `any`, no `!`, no `@ts-ignore`. Read the full A1 rules doc before touching any file.

---

## 1. What was built

### Screens & Components

| Route / Component | File | Access |
|---|---|---|
| Upload material | `app/(app)/course/[id]/upload.tsx` | Course instructor only |
| Submit exercise | `app/(app)/course/[id]/material/[materialId]/submit.tsx` | Enrolled students only |
| Upload button | `src/components/courses/UploadButton.tsx` | Course instructor only |
| Material row delete | `src/components/courses/MaterialRow.tsx` | Safe two-step delete button (instructor only) |

### Services (`src/services/`)

| File | Exports |
|---|---|
| `storage.ts` | `uploadMaterial`, `uploadMaterialBatch`, `getSignedUrl`, `deleteMaterial` |
| `submissions.ts` | `submitExercise`, `getStudentSubmission`, `getMySubmission`, `listSubmissionsForExercise`, `gradeSubmission`, `getSubmissionSignedUrl` |
| `views.ts` | `logMaterialView` |

### Lib (`src/lib/`)

| File | Exports |
|---|---|
| `files.ts` | `ALLOWED_EXTENSIONS`, `MAX_FILE_BYTES`, `getExtension`, `sanitizeFileName`, `contentTypeFromName`, `validatePickedFile`, `validatePickedFiles` |

### Hooks (`src/hooks/`)

`useOpenMaterial` · `useMySubmission` · `useSubmissions`

---

## 2. How to run and test

```bash
cd ClassVault
npx expo start          # press W for web or A for Android
```

**Test accounts:**
- One **Instructor** account (owns a course)
- One **Student** account (enrolled via join code)

**Test flow:**
1. **Material Upload (Instructor):**
   - Open owned course → tap "Upload material"
   - Single upload: pick PDF/PPT/PPTX (<= 80 MB) → enter title → tap "Upload"
   - Batch upload: tap "Choose multiple files" → pick multiple files → verify card validation → tap "Upload N files"
2. **Open File & View Tracking (Student/Instructor):**
   - Tap material card or "Open file" button on material detail screen
   - Opens via short-lived signed URL (1 hour) in system browser/viewer
   - Confirmed in Supabase `material_views` table
3. **Safe Two-Step Delete (Instructor):**
   - On course screen, tap trash icon on material card → tap "Delete" on confirm card
   - Verifies file is removed from `lms-files` bucket first, then deleted from `materials` table
4. **Exercise Submission (Student):**
   - Open an exercise material → tap "Submit" (or "Resubmit" if already submitted)
   - Pick PDF/PPT/PPTX (<= 80 MB) → tap "Submit" / "Resubmit"
   - On resubmission, old file is safely deleted from `submission-files` bucket and grade resets to null

---

## 3. Public interfaces for Phase 5 (Member 5)

### Routes for Member 5 to build

| Route | Purpose | Linked From |
|---|---|---|
| `app/(app)/course/[id]/submissions/[materialId].tsx` | Grading screen (submissions list + grade input) | Material detail "View submissions" button |
| `app/(app)/course/[id]/analytics.tsx` | Course analytics dashboard | Course detail header action |

### Submissions service & hook for grading

```ts
// src/hooks/useSubmissions.ts
const { submissions, isLoading, error, refetch, grade, isGrading } = useSubmissions(materialId);

// src/services/submissions.ts
gradeSubmission(submissionId: string, grade: number): Promise<Submission>;
listSubmissionsForExercise(materialId: string): Promise<SubmissionWithStudent[]>;
getSubmissionSignedUrl(filePath: string): Promise<string>;
```

---

## 4. Known issues and deliberate shortcuts

- **No upload progress percentage callback:** Supabase JS v2 does not expose byte-level upload progress callbacks; progress updates file indices sequentially (`Uploading 2 of 5…`).
- **OOM Prevention (FH-2):** Native uploads stream directly via `FileSystem.uploadAsync` with `BINARY_CONTENT`. Web uses File/Blob streams.
- **Storage path structure:** Submissions path is `{courseId}/{studentId}/{materialId}-{uuid}-{sanitizedFileName}` ensuring compliance with RLS policy `(storage.foldername(name))[2] = auth.uid()`.

---

## 5. What the next phase must NOT change

- Private storage buckets: `lms-files` and `submission-files` must remain private (SEC-5).
- Safe two-step deletion order: delete storage object first, wait for success, then modify/delete DB row (FH-3).
- 80 MB upload cap and allowed MIME types (`.pdf`, `.ppt`, `.pptx`).
- No `any`, `@ts-ignore`, or non-null assertions without justification (ST-5).
- Brand tokens and colors locked in `tailwind.config.js`.
