# ClassVault: Product Specification

> **Version:** 2.0 (Expanded)  
> **Platform:** Android (primary, `.apk`) and Web (secondary, deployed link)  
> **Stack:** React Native (Expo) + Supabase (PostgreSQL, Auth, Storage)  
> **Cost:** 100% free tier  
> **Team:** 5 members, sequential workflow (see Section 11)  
> **Companion file:** `ClassVault_Build_Prompts.md` (step-by-step AI building prompts and guardrails)

![ClassVault logo](brand/classvault-lockup-horizontal.svg)

---

## 1. Product Overview

**ClassVault** is a mobile-first Learning Management System (LMS) where instructors publish class materials and students open them in seconds. Instructors create courses with auto-generated join codes, upload presentations and exercises, review student submissions, assign grades, and track engagement through analytics dashboards. Students enroll via join codes, browse and open materials, submit work for exercises, view their grades, and discuss materials through comments.

| Item | Definition |
|---|---|
| **Tagline** | *Every class file, in one vault.* |
| **Problem** | Course files are scattered across chat threads, email, and personal drives. Students lose them and instructors re-send them. Submissions arrive via email with no tracking. |
| **Solution** | A role-based app: instructors upload once into a course, students enroll with a code and access everything in one place, including submitting exercises and checking grades. |
| **Primary users** | Instructors (upload, manage, grade) and Students (enroll, browse, submit, view grades) |
| **Core promise** | Enroll with a code, pick a course, open the file. Three taps or fewer. |
| **Scope boundary** | Files, enrollment, commenting, grading, and analytics. No messaging, no video, no payments. |

### 1.1 Goals

1. Deliver a working, demo-ready LMS that a professor can install and grade on a real device.
2. Enforce role-based access end to end (UI **and** database rules), not just by hiding buttons.
3. Look like a polished SaaS product: one brand, one type system, zero visual drift between screens.
4. Stay inside free tiers (Supabase free, Expo free, EAS free build quota, Vercel/Netlify free).
5. Provide a complete instructor workflow: create a course, share the join code, upload materials, receive submissions, assign grades, and monitor engagement.
6. Provide a complete student workflow: enroll via code, browse materials, submit exercises, check grades, and comment on materials.

### 1.2 Non-Goals (explicitly out of scope)

- Push notifications or real-time messaging
- Quizzes, timed assessments, or rubric-based grading
- In-app document rendering (files open in the device's native viewer or browser)
- Admin panel, folders, file versioning, or full-text search
- App Store / Play Store publishing (the `.apk` is distributed directly)
- Dark mode

### 1.3 Success Criteria (definition of "done")

| # | Criterion | How it is checked |
|---|---|---|
| 1 | A new user can sign up, choose a role, and land on the course list | Manual test on emulator |
| 2 | An instructor can create a course and see its auto-generated 6-character join code | Manual test; code visible on course detail |
| 3 | A student can enroll in a course using the join code and then see the course in their list | Manual test; enrollment row appears in database |
| 4 | An instructor can upload a single `.pdf`, `.ppt`, or `.pptx` (up to 80 MB) into their course | Manual test; file appears in the Supabase bucket |
| 5 | An instructor can batch-upload multiple files at once (each validated against the 80 MB cap) | Manual test on emulator |
| 6 | A student can open an uploaded file from the course screen | Manual test; file opens with correct content (not 0 bytes) |
| 7 | A student **cannot** upload, create a course, or grade, **even by calling the API directly** | RLS verification (Build Prompts, P6.3) |
| 8 | Users can leave comments on a material and see all comments; timestamps display in 24-hour PHT | Manual test on material detail screen |
| 9 | A student can submit a file for an exercise; the instructor can view it and assign a numeric grade | Manual test end to end |
| 10 | Instructor analytics show enrolled count, view counts, and average grades | Manual test with sample data |
| 11 | Student analytics show personal average, submission counts, and view ratio | Manual test with sample data |
| 12 | Deleting a material removes the storage object first, then the database row (no orphans) | Verify in Supabase Storage dashboard after deletion |
| 13 | A student can leave a course and an instructor can remove a student or delete a course | Manual test; verify enrollment/course rows removed |
| 14 | Every screen has loading, empty, and error states | Visual walkthrough |
| 15 | Zero brand violations (colors, fonts, logo usage) | Brand audit (Build Prompts, P5.1) |
| 16 | A signed `.apk` installs and runs against the live Supabase project | Install on a physical Android phone |
| 17 | The web build loads from a public URL and logs in successfully | Open in a desktop browser and an iPhone |

---

## 2. Users and Roles

| Capability | Student | Instructor |
|---|:---:|:---:|
| Sign up / sign in / sign out | Yes | Yes |
| Enroll in a course via join code | Yes | No |
| Leave (unenroll from) a course | Yes | No |
| View enrolled courses / own courses | Yes | Yes |
| View the join code for a course | No | Yes (own courses) |
| View materials in an enrolled/owned course | Yes | Yes |
| Open / download a file | Yes | Yes |
| Create a course (auto-generates join code) | No | Yes |
| Upload a file (single or batch, up to 80 MB each) | No | Yes (own courses) |
| Delete a file (safe two-step) | No | Yes (own courses) |
| Delete a course (cascades all data) | No | Yes (own courses) |
| Remove a student from a course | No | Yes (own courses) |
| Comment on a material | Yes | Yes |
| Delete a comment | Own only | Own + any in own course |
| Submit a file for an exercise | Yes | No |
| View all submissions for an exercise | No | Yes (own courses) |
| Assign a numeric grade to a submission | No | Yes (own courses) |
| View analytics (instructor dashboard) | No | Yes (own courses) |
| View analytics (student dashboard) | Yes | No |

> **Known limitation:** the role is chosen at sign-up so the demo works without an admin. In a production release, instructor accounts would be invited or approved by an admin. This is documented in the final README.

---

## 3. Feature Scope (MoSCoW)

| ID | Feature | Notes |
|---|---|---|
| F1 | **Role-based authentication** | Email + password via Supabase Auth; role stored in `profiles` |
| F2 | **Course enrollment with join codes** | System generates a unique 6-character alphanumeric code per course; students enroll by entering the code |
| F3 | **Course dashboard** | Instructors see their own courses; students see enrolled courses; each card shows code, title, instructor name, material count |
| F4 | **Course detail with materials** | Segmented control: **Presentations** / **Exercises**; join code displayed for instructors |
| F5 | **Create course** (instructor) | Course code + title + optional description; join code auto-generated |
| F6 | **Single file upload** (instructor) | Native file picker; `.ppt`, `.pptx`, `.pdf` only; **80 MB** limit; uses `FormData` with local URIs or `FileSystem.uploadAsync` (no Base64/ArrayBuffer in RAM) |
| F7 | **Batch file upload** (instructor) | Select multiple files at once from the native document picker; each validated against the 80 MB cap individually |
| F8 | **Open file** (all enrolled/owner roles) | Short-lived signed URL opened in the native viewer/browser; opening is logged for analytics |
| F9 | **Safe two-step material deletion** (instructor) | Removes storage object FIRST, waits for success, THEN deletes the database row; prevents orphan files on Supabase free tier |
| F10 | **Commenting system** | Users leave comments on a material; displayed in chronological order on the material detail screen; authors and course owners can delete |
| F11 | **Student exercise submissions** | Students upload a file in response to an Exercise material; one submission per student per exercise |
| F12 | **Grading system** | Instructor views all submissions for an exercise and assigns a numeric grade (0–100) per submission |
| F13 | **Analytics: Instructor dashboard** | Enrolled student count, download/view counts per material, average exercise grades across the class |
| F14 | **Analytics: Student dashboard** | Personal average grade for the course, submitted vs. pending exercise count, viewed vs. total materials ratio |
| F15 | **Leave course** (student) | Student unenrolls from a course; the course disappears from their dashboard and they lose access to its materials, comments, and submissions |
| F16 | **Remove student** (instructor) | Instructor removes a student from their course; the student's enrollment is deleted and they lose access |
| F17 | **Delete course** (instructor) | Instructor deletes their own course; all materials, storage files, enrollments, comments, submissions, and analytics data are cascaded/removed |
| F18 | **State handling** | Loading skeletons, empty states, readable error messages |
| F19 | **Sign out** | Clears session and returns to sign-in |

---

## 4. User Stories and Acceptance Criteria

### Authentication (Member 2)

**US-1. Sign up.** *As a new user, I choose a role and create an account so I can use ClassVault.*
- Fields: full name, email, password (min 8 chars), role selector (Student / Instructor)
- On success the user lands on the Courses screen with the correct role applied
- Invalid email or short password shows an inline message that states how to fix it

**US-2. Sign in / out.** *As a returning user, I sign in and stay signed in until I sign out.*
- Session persists across app restarts
- Wrong credentials show: "Email or password is incorrect. Check both and try again."
- Sign out returns to the sign-in screen and clears cached data

### Enrollment (Member 2)

**US-3. Enroll in a course.** *As a student, I enter a 6-character join code to enroll in a course.*
- A clearly labeled "Enroll" button on the Courses screen opens the enrollment flow
- Student enters the code (case-insensitive); system looks up the course
- Valid code: enrollment is created, student is navigated to the course detail, and the course now appears in their dashboard
- Invalid code: "No course found with this code. Check the code and try again."
- Already enrolled: no error; navigates to the course (idempotent)

**US-4. View join code.** *As an instructor, I see the join code on my course so I can share it.*
- The join code is prominently displayed on the course detail header (e.g., in a Badge or copyable field)
- Students never see the join code; they see the course only after enrollment

**US-5. Leave a course.** *As a student, I leave a course I no longer need.*
- On the course detail screen, a secondary or ghost Button "Leave course" is visible to enrolled students only
- Inline confirmation: "Leave \<course title\>? You will lose access to all materials and your submissions."
- On confirm: the enrollment row is deleted; the student is navigated back to the Courses dashboard; the course no longer appears
- RLS enforces that a student can only delete their own enrollment
- Submissions and comments left by the student remain in the database (the instructor retains the records)

### Courses (Member 3)

**US-6. Browse courses.** *As any user, I see my relevant courses at a glance.*
- Instructor: sees courses they created (with join code on each card)
- Student: sees courses they are enrolled in
- Each card shows course code, title, instructor name, material count, and (for instructors) enrolled student count
- Empty state (student): "No courses yet. Ask your instructor for the join code." with an "Enroll" action
- Empty state (instructor): "No courses yet." with a primary **Create course** button

**US-7. Create course.** *As an instructor, I create a course and receive a join code.*
- Fields: code (required, e.g., `IT101`), title (required), description (optional)
- On creation, the system generates a unique 6-character alphanumeric join code automatically
- The join code is shown on the success screen / course detail
- Student accounts never see the **Create course** button

**US-8. Delete course.** *As an instructor, I delete a course I own.*
- On the course detail screen, a danger ghost Button "Delete course" is visible to the owning instructor only
- Inline confirmation: "Delete \<course title\>? This will permanently remove all materials, files, enrollments, submissions, and comments. This cannot be undone."
- On confirm: all storage files for the course are deleted from both `lms-files` and `submission-files` buckets (safe two-step for each), then the course row is deleted (cascades to enrollments, materials, comments, submissions, material_views)
- Instructor is navigated back to the Courses dashboard; the course no longer appears
- RLS enforces that only the course owner can delete

**US-9. Remove a student.** *As an instructor, I remove a student from my course.*
- On the course detail screen, the enrolled student count links to a student list (or an inline section shows enrolled students)
- Each student row shows the student's name and a danger ghost icon button (UserMinus) "Remove student"
- Inline confirmation: "Remove \<student name\> from \<course title\>?"
- On confirm: the enrollment row is deleted; the student loses access immediately
- The student's past submissions and comments remain (the instructor retains the records)
- RLS enforces that only the course instructor can delete another user's enrollment

**US-10. Browse materials.** *As any enrolled user or course owner, I open a course and see its materials grouped by type.*
- Segmented control: **Presentations** | **Exercises**
- Each row shows title, file type icon, size, upload date (newest first), and (for exercises) submission status / grade
- Students see their own submission status per exercise: "Not submitted", "Submitted", or "Graded: 85"

### Files (Member 4)

**US-11. Upload (single).** *As an instructor, I upload a presentation or exercise to my course.*
- Flow: **Upload material** → choose type → pick file → enter title → **Upload**
- Accepts `.pdf`, `.ppt`, `.pptx` only; rejects anything else with: "ClassVault accepts PDF, PPT, and PPTX files. Choose a different file."
- Rejects files over 80 MB with: "This file is larger than 80 MB. Compress it or split it, then try again."
- Upload uses `FormData` with local URIs or `FileSystem.uploadAsync`; **never** reads the entire file into RAM as Base64 or ArrayBuffer (OOM prevention)
- Shows upload progress state; on success returns to the course list with the new row visible
- The stored file must match the original size (no 0-byte uploads)

**US-12. Upload (batch).** *As an instructor, I upload multiple files at once.*
- "Choose files" opens the document picker with multi-select enabled
- Each file is individually validated (type + 80 MB cap); invalid files are listed with reasons and excluded
- Valid files are uploaded sequentially (not in parallel, to stay within free-tier rate limits)
- Progress shows "Uploading 2 of 5…"; on completion shows a summary (succeeded/failed count)

**US-13. Open.** *As any enrolled user, I tap a material to open it.*
- App requests a signed URL (valid 1 hour) and hands it to the OS
- Opening is logged in `material_views` for analytics
- If the link cannot be created: "We couldn't open this file. Check your connection and try again."

**US-14. Delete (safe two-step).** *As an instructor, I delete a material from my course.*
- Inline confirmation: "Delete \<title\>? Students will lose access."
- On confirm: **Step 1** — remove the file from the Supabase Storage bucket; **Step 2** — wait for a success response; **Step 3** — delete the database row
- If Step 1 fails, the row is NOT deleted and the user sees a friendly error
- If Step 2 (row deletion) fails after the file is removed, log the orphan path and show a friendly error
- RLS enforces that only the course owner can delete

### Comments (Member 3)

**US-15. Leave a comment.** *As an enrolled user or course owner, I leave a comment on a material.*
- A text input on the material detail screen lets the user type and submit a comment (1–500 characters)
- Comments appear in chronological order with the author's name, role badge, and timestamp in **24-hour military time displayed in Philippine Time (PHT, UTC+8)** — e.g., "14:35 PHT" or "Oct 30, 2026 · 22:15 PHT"
- The author or the course instructor can delete a comment (inline confirm)

### Submissions and Grading (Members 4 and 5)

**US-16. Submit exercise.** *As an enrolled student, I upload a submission file for an exercise.*
- On the material detail screen for an Exercise, a "Submit" button opens the submission upload flow
- Same file types and 80 MB limit as regular uploads; same OOM-safe upload method
- One submission per student per exercise; re-submitting replaces the previous submission
- Submission status shows on the exercise row: "Submitted" or "Not submitted"

**US-17. View submissions.** *As an instructor, I see all student submissions for an exercise.*
- From the material detail screen (Exercise type), a "View submissions" button shows a list of all submissions
- Each row: student name, file name, size, date, and grade (if assigned)
- Instructor can open a submission file (signed URL, same as regular open)

**US-18. Grade a submission.** *As an instructor, I assign a numeric grade to a student's submission.*
- On the submissions list, each row has a grade input (0–100, numeric)
- Instructor enters or updates the grade and confirms; grade is saved immediately
- Grade is visible to the student on their exercise row and in their analytics

### Analytics (Member 5)

**US-19. Instructor analytics.** *As an instructor, I see engagement data for my course.*
- Accessible from the course detail screen (e.g., a "Course analytics" button or section)
- Metrics:
  - **Enrolled students:** total count
  - **Material engagement:** for each material, total view/download count and unique viewer count
  - **Exercise performance:** for each exercise, number of submissions, average grade, highest grade, lowest grade

**US-20. Student analytics.** *As a student, I see my progress for the course.*
- Accessible from the course detail screen
- Metrics:
  - **Average grade:** across all graded exercises in the course (or "No grades yet")
  - **Submissions:** count of submitted vs. total exercises (e.g., "3 of 5 submitted")
  - **Materials viewed:** count of viewed vs. total materials (e.g., "12 of 18 viewed")

### Polish and release (Members 5 and 1)

**US-21. Consistent brand.** Every screen uses only the ClassVault tokens (Section 9). No raw hex values, no unlisted fonts.

**US-22. Resilient.** Network failure, expired session, and denied permissions each produce a specific, actionable message, never a raw error string.

---

## 5. Screen Inventory and Navigation

| # | Screen | Route (expo-router) | Who | Owner |
|---|---|---|---|---|
| 1 | Splash / session check | `app/index.tsx` | All | M1 / M2 |
| 2 | Sign in | `app/(auth)/sign-in.tsx` | Signed out | M2 |
| 3 | Sign up | `app/(auth)/sign-up.tsx` | Signed out | M2 |
| 4 | Courses (dashboard) | `app/(app)/(tabs)/index.tsx` | All | M3 |
| 5 | Enroll in course | `app/(app)/enroll.tsx` | Student | M2 |
| 6 | Course detail | `app/(app)/course/[id].tsx` | Enrolled / Owner | M3 |
| 7 | Create course | `app/(app)/course/new.tsx` | Instructor | M3 |
| 8 | Upload material | `app/(app)/course/[id]/upload.tsx` | Instructor | M4 |
| 9 | Material detail | `app/(app)/course/[id]/material/[materialId].tsx` | Enrolled / Owner | M3 |
| 10 | Submit exercise | `app/(app)/course/[id]/material/[materialId]/submit.tsx` | Student (enrolled) | M4 |
| 11 | Submissions list | `app/(app)/course/[id]/submissions/[materialId].tsx` | Instructor (owner) | M5 |
| 12 | Course analytics | `app/(app)/course/[id]/analytics.tsx` | Enrolled / Owner | M5 |
| 13 | Profile | `app/(app)/(tabs)/profile.tsx` | All | M2 |

```
Signed out                      Signed in
-----------                     ---------
[Sign in] <-> [Sign up]         Tabs:  [Courses]  [Profile]
                                          |
                                          +---> Enroll (student, join code)
                                          +---> Create course (instructor)
                                          +---> Course detail
                                                   |
                                                   +---> Upload material (instructor, single/batch)
                                                   +---> Course analytics (role-aware)
                                                   +---> Material detail (comments)
                                                            |
                                                            +---> Submit exercise (student)
                                                            +---> View submissions (instructor)
                                                                     +---> Grade (inline)
```

### 5.1 Layout guidance (mobile-first)

- Portrait phone, single column, 16 px side padding, 4-pt spacing grid
- On web, content is centered in a column with a **maximum width of 720 px**
- Bottom tab bar with two tabs (Courses, Profile); the active tab uses the brand emerald
- Primary action buttons are full width on phones

---

## 6. Core User Flows

**Flow A: Instructor creates a course and shares the code**
1. Sign in → Courses → **Create course**
2. Enter course code (e.g., `IT101`) and title → **Create course**
3. System generates a unique 6-character join code (e.g., `A3X9K2`)
4. Join code is displayed on the course detail; instructor shares it with students (verbally, on a slide, etc.)

**Flow B: Student enrolls and opens a file**
1. Sign in → Courses → **Enroll**
2. Enter the 6-character join code → **Join course**
3. Course appears in the dashboard → tap the course
4. Pick **Presentations** or **Exercises** → tap a row
5. File opens in the device viewer or browser

**Flow C: Instructor uploads files (single or batch)**
1. Sign in → Courses → tap a course
2. Tap **Upload material** → choose **Presentation** or **Exercise**
3. Pick one or more files (batch) → confirm titles → **Upload**
4. See the new rows at the top of the correct tab

**Flow D: Student submits an exercise**
1. Sign in → Courses → tap a course → **Exercises** tab
2. Tap an exercise → on the material detail screen, tap **Submit**
3. Pick a file → confirm → **Upload submission**
4. Status changes to "Submitted" on the exercise row

**Flow E: Instructor grades submissions**
1. Sign in → Courses → tap a course → **Exercises** tab
2. Tap an exercise → **View submissions**
3. See all student submissions → open a submission file to review
4. Enter a grade (0–100) for each student → grade is saved

**Flow F: Commenting**
1. Any enrolled user taps a material → material detail screen
2. Type a comment in the input → **Post**
3. Comment appears in the chronological list with the timestamp in 24-hour military time (PHT)

**Flow G: Student leaves a course**
1. Sign in → Courses → tap a course
2. Tap **Leave course** → inline confirm "Leave \<title\>? You will lose access…"
3. Confirm → enrollment deleted → course disappears from dashboard

**Flow H: Instructor removes a student**
1. Sign in → Courses → tap a course
2. Tap the enrolled student count (or student list section)
3. Tap the remove icon next to a student → inline confirm
4. Confirm → enrollment deleted → student loses access

**Flow I: Instructor deletes a course**
1. Sign in → Courses → tap a course
2. Tap **Delete course** → inline confirm "Delete \<title\>? This cannot be undone."
3. Confirm → all storage files deleted (safe two-step) → course row deleted (cascades) → instructor returns to dashboard

**Flow J: Session recovery**
App opens → session found → straight to Courses. No session → Sign in.

---

## 7. Data Model

### 7.1 Tables

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | One row per user; holds the role | `id` (= `auth.users.id`), `full_name`, `role` (`instructor` or `student`) |
| `courses` | A subject taught by one instructor | `id`, `code`, `title`, `description`, `instructor_id`, `join_code` (unique, 6-char, auto-generated) |
| `enrollments` | Links students to courses | `id`, `course_id`, `student_id`, `enrolled_at`; unique on `(course_id, student_id)` |
| `materials` | A file record belonging to a course | `id`, `course_id`, `uploader_id`, `title`, `type` (`presentation` or `exercise`), `file_path`, `file_name`, `mime_type`, `size_bytes`, `created_at` |
| `comments` | User comments on a material | `id`, `material_id`, `user_id`, `content` (1–500 chars), `created_at` |
| `submissions` | Student file submissions for exercises | `id`, `material_id`, `student_id`, `file_path`, `file_name`, `mime_type`, `size_bytes`, `grade` (nullable, 0–100), `graded_by` (nullable), `graded_at` (nullable), `created_at`; unique on `(material_id, student_id)` |
| `material_views` | Tracks when a user opens/views a material | `id`, `material_id`, `user_id`, `viewed_at` |

A database trigger creates the `profiles` row automatically at sign-up, reading `full_name` and `role` from the sign-up metadata.

A database function `generate_join_code()` produces a unique 6-character alphanumeric string (uppercase letters and digits), retrying until it finds one not already in `courses.join_code`. This function is called as the default for `courses.join_code`.

A database function `enroll_with_code(p_join_code text)` handles enrollment: it validates the caller is a student, looks up the course by join code, inserts an enrollment record (or no-ops if already enrolled), and returns the `course_id`. This function is `SECURITY DEFINER` so it bypasses RLS for the lookup, while the enrollment record is always scoped to the calling user.

### 7.2 Storage

| Setting | Value |
|---|---|
| Materials bucket | `lms-files` |
| Submissions bucket | `submission-files` |
| Visibility | **Private** (signed URLs only) for both |
| Materials path pattern | `{course_id}/{uuid}-{sanitized_file_name}` |
| Submissions path pattern | `{course_id}/{material_id}/{student_id}-{uuid}-{sanitized_file_name}` |
| Size limit (both buckets) | **80 MB** (83,886,080 bytes) |
| Allowed types | PDF, PPT, PPTX |

> **Critical (OOM prevention):** On React Native, uploads to either bucket MUST use `FormData` with local file URIs or Expo's `FileSystem.uploadAsync`. Never read the entire file into RAM as Base64 or ArrayBuffer. At 80 MB, reading into memory will cause Out-of-Memory crashes on most devices.

### 7.3 Access rules (Row Level Security)

| Resource | Read | Create | Update | Delete |
|---|---|---|---|---|
| `profiles` | Any signed-in user | Trigger only | Not allowed | Not allowed |
| `courses` | Owner instructor or enrolled students | Instructor, as themselves | Owner instructor | Owner instructor |
| `enrollments` | Enrolled student or course instructor | Via `enroll_with_code()` function only | Not allowed | Enrolled student or course instructor |
| `materials` | Owner instructor or enrolled students | Owner instructor of that course | Not allowed | Owner instructor |
| `comments` | Owner instructor or enrolled students (of the material's course) | Enrolled user or course owner, as themselves | Not allowed | Comment author or course instructor |
| `submissions` | Submitting student or course instructor | Enrolled students (for exercises only), as themselves | Course instructor (grade fields only) | Not allowed |
| `material_views` | Own views or course instructor's materials | Any enrolled user or course owner, as themselves | Not allowed | Not allowed |
| Storage `lms-files` | Course owner or enrolled students | Owner instructor, inside their course folder | Not allowed | Owner instructor |
| Storage `submission-files` | Course owner or enrolled students | Enrolled students, inside the correct course/material folder | Not allowed | Submitting student or course instructor |

> The full SQL for all of the above is the single source of truth in `ClassVault_Build_Prompts.md` (Appendix C).

---

## 8. Technical Architecture

### 8.1 Stack (locked)

| Layer | Choice |
|---|---|
| Framework | React Native with **Expo** (latest stable SDK), TypeScript (strict) |
| Navigation | `expo-router` (file-based) |
| Styling | **NativeWind v4** + Tailwind CSS 3.4 (tokens defined once in `tailwind.config.js`) |
| Icons | `lucide-react-native` |
| Backend | Supabase: PostgreSQL, Auth, Storage |
| Client | `@supabase/supabase-js` v2 with AsyncStorage session persistence |
| Files | `expo-document-picker`, `expo-file-system` (`uploadAsync` for OOM-safe uploads) |
| Fonts | `@expo-google-fonts/plus-jakarta-sans`, `@expo-google-fonts/inter` |
| Build | `eas-cli` (Android `.apk`), `expo export` (web) |

### 8.2 Dependency list

**Initialize:** `npx create-expo-app@latest classvault`

| Group | Packages | Install with |
|---|---|---|
| UI and styling | `nativewind`, `tailwindcss@^3.4.17`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-svg`, `lucide-react-native` | `npx expo install` (Expo-pinned) |
| Fonts | `expo-font`, `@expo-google-fonts/plus-jakarta-sans`, `@expo-google-fonts/inter` | `npx expo install` |
| Backend | `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill` | `npx expo install` |
| Files | `expo-document-picker`, `expo-file-system`, `expo-linking` | `npx expo install` |
| Web export | `react-native-web`, `react-dom`, `@expo/metro-runtime` | `npx expo install` |
| Deployment (global) | `eas-cli` | `npm i -g eas-cli` |

> **Rule:** use `npx expo install` for anything that touches native code so versions match the Expo SDK. Do **not** adopt NativeWind v5 (preview) for this project.

### 8.3 Project structure

```
classvault/
├─ app/                      # expo-router screens only (thin)
│  ├─ _layout.tsx            # fonts, providers, auth gate
│  ├─ (auth)/                # sign-in, sign-up
│  └─ (app)/                 # tabs, course screens, enrollment, analytics
├─ src/
│  ├─ components/ui/         # Button, Input, Text, Card, Badge, Logo, Segmented, EmptyState, etc.
│  ├─ components/            # feature components (CourseCard, MaterialRow, CommentItem, SubmissionRow, AnalyticsCard)
│  ├─ services/              # ALL Supabase calls (auth, courses, materials, storage, comments, submissions, analytics, enrollment)
│  ├─ hooks/                 # useAuth, useCourses, useMaterials, useComments, useSubmissions, useAnalytics, useEnrollment
│  ├─ lib/                   # supabase.ts, env.ts, format.ts, errors.ts
│  └─ types/                 # database.ts, domain types
├─ assets/brand/             # logo SVG/PNG, icon, splash
├─ global.css
├─ tailwind.config.js        # the ONLY place brand tokens live
├─ eas.json
└─ .env                      # gitignored; EXPO_PUBLIC_* only
```

**Rule:** screens never call Supabase directly. They call a hook, the hook calls a service.

---

## 9. Brand and Design System (strict)

### 9.1 Brand essence

ClassVault looks calm, trustworthy, and organized: white space, one confident emerald, and clear type. Think modern SaaS: clean surfaces, generous spacing, no decoration without a job.

### 9.2 Logo

**Concept:** A large, geometric letter **V** with crisp flat tops and one softened point at the bottom. It is split into two emerald tones (`#059669` on the left, `#047857` on the right) to create a folded, dimensional look without gradients. Rising out of the V's opening are three flat, symmetrically fanned sheets of paper that are cut off cleanly at the inner edges, making the V read as a slot. The front sheet features a folded corner and two short lines, while the side sheets are plain emerald tints with no outlines. The accompanying wordmark uses Plus Jakarta Sans Bold with tightened spacing, converted to outlines.

| Asset | File | Use |
|---|---|---|
| Mark (color) | `brand/classvault-mark.svg` | In-app headers, empty states, light backgrounds |
| Mark (reversed) | `brand/classvault-mark-reversed.svg` | On emerald backgrounds |
| Horizontal lockup | `brand/classvault-lockup-horizontal.svg` (+ `.png`) | Sign-in screen, README, web header |
| Horizontal lockup (reversed) | `brand/classvault-lockup-horizontal-reversed.svg` | On emerald backgrounds |
| Stacked lockup | `brand/classvault-lockup-stacked.svg` (+ `.png`) | Splash, sign-up, presentations |
| Stacked lockup (reversed) | `brand/classvault-lockup-stacked-reversed.svg` | On emerald backgrounds |
| App icon | `brand/icon.png` (1024), `classvault-app-icon.svg` | `app.json` `icon` |
| Android adaptive icon | `brand/adaptive-icon.png` | `app.json` adaptive foreground (background `#059669`) |
| Splash | `brand/splash-icon.png` | Expo splash screen on white |
| Favicon | `brand/favicon.png` | Web build |

The wordmark is converted to outlines (Plus Jakarta Sans Bold), so the lockups render identically everywhere without the font installed.

**Logo rules**
- Clear space on every side: at least the width of one V stroke (about 12% of the mark's width)
- Minimum size: mark 24 px; horizontal lockup 112 px wide
- Use the color lockup on white or emerald-50; use the reversed lockup on emerald-600, emerald-700, or emerald-900
- Never recolor, outline, rotate, stretch, add shadows or gradients, rearrange the mark and wordmark, or place on busy imagery
- The wordmark is always written **ClassVault** (one word, capital C and V), including in prose

### 9.3 Color tokens

Emerald is the brand. White is the canvas. Nothing else.

| Token | Hex | Use |
|---|---|---|
| `brand` (emerald-600) | `#059669` | Logo, large fills, icons, active tab, focus ring |
| `action` (emerald-700) | `#047857` | **Buttons and text links on white** (passes AA contrast with white text) |
| `action-pressed` (emerald-800) | `#065F46` | Pressed state |
| `ink` (emerald-900) | `#064E3B` | Wordmark, strong headings |
| `emerald-500` | `#10B981` | Success accents, progress |
| `emerald-300` | `#6EE7B7` | Decorative accents only |
| `emerald-200` | `#A7F3D0` | Selected backgrounds, dividers on emerald |
| `emerald-100` | `#D1FAE5` | Badges, chip backgrounds |
| `emerald-50` | `#ECFDF5` | Subtle tinted surfaces, selected rows |
| `white` | `#FFFFFF` | Primary background and card surface |
| `canvas` | `#F6F9F7` | App background behind cards |
| `fg` | `#022C22` | Primary body text |
| `fg-secondary` | `#4B5F57` | Secondary text |
| `fg-muted` | `#5F746C` | Captions, placeholders (still meets AA on white) |
| `line` | `#DCE7E1` | Card and input borders |
| `danger` | `#DC2626` | Errors and destructive actions only |
| `warning` | `#B45309` | Warnings only |

**Color rules**
- `#059669` on white is **3.8:1**: use it for icons, large shapes, and 24 px+ text only. Small text and button fills use `action` (`#047857`).
- No other hues. No gradients. No pure black text. No hex codes in components; use token class names only.
- Differentiate **Presentation** vs **Exercise** by **icon and label**, never by introducing a new color.

### 9.4 Typography

Exactly two families, both loaded through `expo-font`.

| Role | Family | Weights (Expo font names) |
|---|---|---|
| Display, headings, buttons, wordmark | **Plus Jakarta Sans** | `PlusJakartaSans_600SemiBold`, `_700Bold`, `_800ExtraBold` |
| Body, inputs, captions, tables | **Inter** | `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold` |

| Style | Size / line height | Font |
|---|---|---|
| Display | 32 / 40 | Plus Jakarta Sans 800 |
| H1 | 28 / 36 | Plus Jakarta Sans 700 |
| H2 | 22 / 30 | Plus Jakarta Sans 700 |
| Title | 18 / 26 | Plus Jakarta Sans 600 |
| Body | 16 / 24 | Inter 400 |
| Body strong | 16 / 24 | Inter 600 |
| Small | 14 / 20 | Inter 400 / 500 |
| Caption | 12 / 16 | Inter 500 |
| Button | 16 / 24 | Plus Jakarta Sans 600 |

Sentence case everywhere. No all-caps labels. No system default font may appear in the UI.

### 9.5 Shape, spacing, and elevation

| Token | Value |
|---|---|
| Spacing grid | 4 pt (use 4, 8, 12, 16, 20, 24, 32, 48) |
| Screen padding | 16 |
| Radius: inputs and buttons | 12 |
| Radius: cards | 16 |
| Radius: chips and badges | full |
| Elevation | One subtle card shadow only (`shadow-card`); otherwise use a 1 px `line` border |
| Touch target | Minimum 44 × 44 |
| Icons | `lucide-react-native`, stroke 1.75, sizes 20 or 24 |
| Focus ring (web) | 2 px `brand` ring with 2 px offset |

### 9.6 Components (v2 library)

`Button` (primary, secondary, ghost, danger), `Input`, `Text` (typed variants), `Card`, `Badge`, `Logo`, `Segmented`, `EmptyState`, `Skeleton`, `Toast`, `Screen`, `StatCard` (for analytics metrics). All screens must be built from these; one-off styled `View`s for repeated patterns are not allowed.

### 9.7 Voice and microcopy

- Plain, calm, specific. Active voice. Sentence case.
- Buttons state the outcome: **Upload material**, **Create course**, **Sign in**, **Join course**, **Submit**, **Post comment**, **Leave course**, **Delete course**, **Remove student**
- Keep one name per action throughout the flow (button "Upload", toast "Uploaded")
- Comment timestamps are always displayed in **24-hour military time in Philippine Time (PHT, UTC+8)** — e.g., "14:35 PHT" or "Oct 30, 2026 · 22:15 PHT". Never use 12-hour AM/PM format and never use relative timestamps for comments.
- Errors say what happened and how to fix it. They never apologize and never show raw system text.
- Empty states are invitations to act, not decoration.

---

## 10. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Security** | Only the public (anon/publishable) key in the app; `service_role` never in code, env, or Git. RLS enabled on every table. Private buckets with signed URLs. `.env` gitignored. Enrollment enforced at the database level. |
| **Performance** | Course list visible in under 2 s on a normal connection; lists fetch only needed columns; uploads stream from disk (no RAM buffering of large files) |
| **Accessibility** | AA contrast, 44 px touch targets, labels on inputs, accessible names on icon buttons |
| **Reliability** | No unhandled promise rejections; every async call handles `{ data, error }`; deletion always removes storage before the row |
| **Compatibility** | Android emulator (Android Studio) and one physical Android phone; web on Chrome and iOS Safari |
| **Free tier** | No paid services; stay under Supabase free storage and the EAS free build quota; safe deletion prevents orphan file accumulation |

---

## 11. Team Task Segmentation (5 members)

| Member | Role | Owns | Hands off |
|---|---|---|---|
| **1** | Foundation, QA and Deployment (Team Leader) | Supabase project, SQL (all tables including enrollment, comments, submissions, views, analytics functions), Expo init, dependencies, brand tokens and UI primitives (including `StatCard`), repo; later error states, QA, EAS build, web deploy | A working empty app with brand system, complete database schema (7 tables, 2 buckets, all RLS), pushed to GitHub |
| **2** | Auth, Enrollment and Security Lead | Sign in/up UI, Supabase Auth, session and role context, route guard, enrollment service and UI (join code input screen), profile/sign-out | A signed-in session with a known role; working enrollment flow |
| **3** | Database, Dashboard and Comments Lead | Course list (enrollment-scoped), create course (with join code display), course detail with materials, material detail screen with commenting system, service/hook layer for data and comments | Live screens fed by real queries; working comment thread on material detail |
| **4** | Storage, File Handling and Submissions Lead | Single upload flow (80 MB, OOM-safe), batch upload, file validation, safe two-step delete, signed-URL open (with view logging), student submission upload | Working upload (single + batch), open, delete, and submit |
| **5** | UI/UX Polish, Grading and Analytics Lead | Brand compliance sweep, tab/stack navigation polish, icons, spacing, responsive web layout, app icon and splash, grading UI (submissions list + grade input), analytics dashboards (instructor + student) | A visually consistent app with working grading and analytics |

> **Note:** Member 1 ships the brand tokens, the UI primitives (including `StatCard` for analytics), and the complete database schema in Phase 1. This keeps all members inside the brand from the first screen and ensures the data model is ready for everyone.

### 11.1 Sequential workflow

| Phase | Owner | Outcome | Gate to start next phase |
|---|---|---|---|
| 1. Foundation | M1 | Supabase ready (7 tables, 2 buckets, all RLS, enrollment + join code functions), app initialized, brand system, repo pushed | `npx expo start` runs; all tables, buckets, and functions exist; tokens render |
| 2. Auth + Enrollment | M2 | Working sign-up, sign-in, session, role, enrollment with join code | Instructor and student test accounts exist; student can enroll via code |
| 3. Database, lists and comments | M3 | Courses (enrollment-scoped) and materials screens on live data; material detail with comments | Instructor creates a course and sees it listed; student sees only enrolled courses; comments work on material detail |
| 4. File handling + submissions | M4 | Single and batch upload (80 MB, OOM-safe), safe delete, open with view tracking, student submission upload | A PDF uploads and opens; batch upload works; deletion removes storage then row; submission uploads correctly |
| 5. UI/UX polish, grading + analytics | M5 | Brand audit passes; navigation smooth; grading UI works; analytics dashboards render for both roles | Zero brand violations; instructor can grade; analytics show real data |
| 6. QA and handoff | M1 | Error states, RLS verified, APK and web link | Success criteria (Section 1.3) all met |

**Git rules:** `main` is protected by convention. Each member works on `feat/<member>-<topic>`, opens a pull request, and the leader merges. Members only edit files they own; shared files (`tailwind.config.js`, `package.json`, `src/components/ui/*`, `src/lib/*`, `supabase/*`) change only through the leader.

---

## 12. Deployment Outputs

| Output | Command / method | Delivered via |
|---|---|---|
| **Android `.apk`** (primary) | `eas build -p android --profile preview` | Google Drive or GitHub Releases |
| **Web build** (secondary) | `npx expo export --platform web` → `dist/` | Vercel or Netlify static hosting |
| **Source** | GitHub repository with README | Link in the submission |
| **Demo accounts** | One instructor, one student, documented in README; student pre-enrolled in a demo course | Included in the README |

The `.apk` build needs the Supabase URL and key available at build time through `eas.json` build-profile `env`, otherwise the installed app cannot connect. The step-by-step prompts cover this.

---

## 13. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Out-of-Memory crash** on large file upload (80 MB) | App crashes, upload lost | Use `FormData` with local URIs or `FileSystem.uploadAsync`; NEVER read files into RAM as Base64 or ArrayBuffer (P4.1) |
| Uploaded files arrive as **0 bytes** (a common React Native pitfall) | Files unopenable | Verify size after upload; use the documented `expo-file-system` method (P4.1) |
| **Orphan files** in Storage after failed deletion | Free tier quota exhausted | Safe two-step deletion: remove storage object first, then row; log orphans if row deletion fails |
| Join code collisions | Duplicate code prevents enrollment | `generate_join_code()` function retries until unique; `UNIQUE` constraint on `courses.join_code` as a safety net |
| Some phones report PPTX as `application/octet-stream` | Upload rejected by bucket | Set `contentType` from the file extension, not the picker's guess |
| Dependency version conflicts | Hours lost | `npx expo install` only; no upgrades; ask before adding packages |
| AI-generated code drifts from the brand | Inconsistent look | Brand Lock block in every UI prompt; audit in P5.1 |
| AI invents APIs or skips security | Broken or unsafe app | Guardrails block: verify against docs, never disable RLS, report what was not verified |
| Env vars missing in the APK | App cannot connect | Put `EXPO_PUBLIC_*` values in `eas.json` profile `env`; test the APK on a real phone |
| Email confirmation blocks sign-up during demo | Cannot log in | Turn off "Confirm email" in Supabase Auth settings |
| EAS free build queue is slow | Missed deadline | Start the first build early (end of Phase 3), not on the last day |
| Enrollment-scoped RLS adds query complexity | Slower list queries | Index `enrollments` on `(student_id, course_id)` and `(course_id)`; test with 50+ enrollments |
| Batch upload fails midway | Partial upload state | Upload files sequentially; show per-file status; allow retrying failed files |

---

## 14. Glossary

| Term | Meaning |
|---|---|
| **RLS** | Row Level Security: database rules that decide which rows a user may read or write |
| **Signed URL** | A temporary link to a private file that expires after a set time |
| **Join code** | A unique 6-character alphanumeric code generated per course for student enrollment |
| **Anon / publishable key** | Public Supabase key, safe in the app only because RLS is enabled |
| **EAS** | Expo Application Services, used to build the `.apk` |
| **Brand Lock** | The fixed set of colors, fonts, and rules pasted into every UI-related AI prompt |
| **OOM** | Out of Memory: a crash caused by loading too much data into RAM (e.g., reading an 80 MB file as Base64) |
| **Safe two-step deletion** | Delete the storage object first, confirm success, then delete the database row; prevents orphan files |
