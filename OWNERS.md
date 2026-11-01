# Ownership Map

| Area | Owner | Others may edit? |
|---|---|---|
| `package.json`, `tailwind.config.js`, `babel.config.js`, `metro.config.js`, `app.json`, `eas.json`, `src/components/ui/*`, `src/lib/*`, `supabase/*` | **Member 1** | No, request a change through the leader |
| `src/services/auth.ts`, `src/services/enrollment.ts`, `src/hooks/useAuth.tsx`, `src/hooks/useEnrollment.ts`, `app/(auth)/*`, enrollment screen, profile screen | **Member 2** | No |
| `src/services/courses.ts`, `src/services/materials.ts`, `src/services/comments.ts`, course hooks, comment hooks, courses/course detail/material detail screens | **Member 3** | No |
| `src/services/storage.ts`, `src/services/submissions.ts`, `src/lib/files.ts`*, upload screen, submission screen | **Member 4** | No |
| Styling fixes, navigation layout, assets wiring, `src/services/analytics.ts`, `src/hooks/useAnalytics.ts`, grading screens, analytics screens | **Member 5** | Edits styling only in others' screens; owns grading/analytics logic |

\* `src/lib/files.ts` is created by Member 4 as an explicit exception to the `src/lib/*` rule.

