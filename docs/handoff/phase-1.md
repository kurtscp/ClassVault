# Phase 1 Hand-Off Note: Foundation

**Author:** Member 1 (Team Leader)  
**Recipient:** Member 2 (Authentication & Enrollment)  
**Date:** November 1, 2026  
**Status:** Completed & Gate Passed  

---

## 1. What Exists Now

Phase 1 established the complete architecture, brand system, database schema, Supabase client, and shared UI primitives.

### Foundation Files
- **Environment & Client:**
  - `src/lib/env.ts`: Validates `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
  - `src/lib/supabase.ts`: Initialized client with `AsyncStorage` persistence, auto-token refresh, and native `AppState` listener.
  - `src/lib/errors.ts`: Central error mapper (`toUserMessage(error)`) and `isAppError`.
  - `src/lib/format.ts`: `formatBytes`, `formatDate`, and `formatCommentTimestamp` (strictly 24-hour military time in Philippine Time `Asia/Manila`, PHT).
- **TypeScript Types:**
  - `src/types/database.ts`: Complete table interfaces, enums (`UserRole`, `MaterialType`), `CourseListItem`, and `MaterialWithStatus`.
  - `src/types/domain.ts`: Typed `AppError` class for service and hook layers.
- **Database Schema:**
  - `supabase/migrations/0001_init.sql`: 7 tables (`profiles`, `courses`, `enrollments`, `materials`, `comments`, `submissions`, `material_views`), 2 private 80 MB storage buckets (`lms-files`, `submission-files`), helper functions (`generate_join_code`, `enroll_with_code`, `is_enrolled`, `is_instructor`), and enrollment-scoped RLS policies.
- **Brand Assets & Fonts:**
  - `assets/brand/*`: Verbatim ClassVault SVG marks, lockups, and app icons.
  - `app/_layout.tsx`: Root layout preloading Plus Jakarta Sans and Inter font families.
- **Shared UI Primitives (`src/components/ui/`):**
  - Complete building blocks exported via `src/components/ui/index.ts`.
- **Scratch Screen:**
  - `app/index.tsx`: Interactive gallery showcasing all 11 UI components.

---

## 2. Environment & How to Run

1. **Environment:** Create `.env` from `.env.example`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```
2. **Execute Schema:** Run `supabase/migrations/0001_init.sql` once in your Supabase SQL Editor.
3. **Start Expo:**
   ```bash
   npm install
   npx expo start -c
   ```
   Press `w` to view the UI component gallery in the browser, or `a` for Android.

---

## 3. Shared UI Primitives Usage Guide

All screens built in subsequent phases must compose exclusively from these primitives.

### 1. `Text`
```tsx
import { Text } from '@/components/ui';

<Text variant="title" tone="brand">ClassVault</Text>
<Text variant="body" tone="secondary">Welcome to your courses.</Text>
```

### 2. `Button`
```tsx
import { Button } from '@/components/ui';

<Button
  label="Sign in"
  variant="primary"
  onPress={handleSignIn}
  loading={isSubmitting}
/>
```

### 3. `Input`
```tsx
import { Input } from '@/components/ui';

<Input
  label="Email address"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  autoCapitalize="none"
  error={emailError}
/>
```

### 4. `Card`
```tsx
import { Card, Text } from '@/components/ui';

<Card onPress={() => router.push(`/course/${course.id}`)}>
  <Text variant="bodyStrong">{course.title}</Text>
  <Text variant="caption" tone="muted">{course.join_code}</Text>
</Card>
```

### 5. `Badge`
```tsx
import { Badge } from '@/components/ui';

<Badge label="Instructor" />
```

### 6. `Segmented`
```tsx
import { Segmented } from '@/components/ui';

<Segmented
  options={['Student', 'Instructor']}
  selectedIndex={roleIndex}
  onChange={setRoleIndex}
/>
```

### 7. `EmptyState`
```tsx
import { EmptyState } from '@/components/ui';
import { BookOpen } from 'lucide-react-native';

<EmptyState
  icon={BookOpen}
  title="No enrolled courses"
  message="Join a course using a code provided by your instructor."
  action={{ label: "Enroll now", onPress: openEnrollModal }}
/>
```

### 8. `Skeleton`
```tsx
import { Skeleton } from '@/components/ui';

<Skeleton width="100%" height={48} borderRadius={12} />
```

### 9. `Screen`
```tsx
import { Screen, Text } from '@/components/ui';

<Screen scroll safe>
  <Text variant="h1">Dashboard</Text>
</Screen>
```

### 10. `Logo` (`Mark`, `LogoHorizontal`, `LogoStacked`)
```tsx
import { LogoHorizontal, Mark } from '@/components/ui';

<LogoHorizontal width={180} variant="color" />
<Mark width={32} />
```

### 11. `StatCard`
```tsx
import { StatCard } from '@/components/ui';
import { Users } from 'lucide-react-native';

<StatCard
  label="Enrolled Students"
  value="34"
  icon={Users}
  trend="+4 this week"
/>
```

---

## 4. Database Schema Summary

| Table / Object | Primary Purpose | RLS Scope |
| :--- | :--- | :--- |
| `profiles` | User full name, role (`instructor`, `student`) | Read: all authenticated. Write: self. |
| `courses` | Title, description, `join_code` (auto 6-char) | Read: instructor or enrolled student. Insert/Update/Delete: instructor owner. |
| `enrollments` | Links student to course | Read: self or course instructor. Insert: student via `enroll_with_code`. Delete: self or course instructor. |
| `materials` | Files & exercises | Read: course instructor or enrolled student. Insert/Delete: course instructor. |
| `comments` | Threaded discussion on materials | Read: course instructor or enrolled student. Insert: author (enrolled/instructor). Delete: author or instructor. |
| `submissions` | Student exercise uploads and grades | Read: submitting student or instructor. Insert/Update: student (own). Grade update: course instructor. |
| `material_views` | Unique view tracking | Insert: student viewing material. Read: course instructor. |
| `lms-files` bucket | 80 MB storage for course materials | Read: enrolled students & instructor. Insert/Delete: instructor. |
| `submission-files` bucket | 80 MB storage for submissions | Path: `<course_id>/<student_id>/<file>`. Read/Delete: submitting student & instructor. |

**Database Functions:**
- `public.enroll_with_code(course_code text)`: Security definer function allowing students to safely enroll with a valid join code.
- `public.is_enrolled(check_course_id uuid)`: RLS helper verifying enrollment.
- `public.is_instructor()`: RLS helper verifying profile role.

---

## 5. Known Issues & Deliberate Shortcuts

- **`app/index.tsx`:** Currently acts as the scratch component gallery to verify design tokens. In Phase 2, Member 2 will implement `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx`, and route redirection based on session state.
- **Web Dark Mode Flag:** Fixed by adding `darkMode: "class"` to `tailwind.config.js`.

---

## 6. What Phase 2 Must NOT Change

- **Shared UI Primitives:** Do NOT edit files in `src/components/ui/*`.
- **Config & Tokens:** Do NOT alter `tailwind.config.js`, `babel.config.js`, `metro.config.js`, `package.json`, or `supabase/migrations/0001_init.sql`. Request any needed adjustments through Member 1.
- **Styling Rules:** Never use hardcoded hex colors, arbitrary Tailwind values, or `fontWeight` styles.
- **Component Text:** Never import `Text` from `react-native`; always use `<Text>` from `@/components/ui`.
- **Secrets:** Never commit `.env` or reference the Supabase `service_role` key.

